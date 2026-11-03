const assert=require('node:assert/strict'),http=require('node:http'),{DatabaseSync}=require('node:sqlite');
const {digest,authHandler}=require('../src/auth/auth.cjs'),model=require('../src/dashboard/model.cjs'),remote=require('../src/dashboard/remote-image.cjs');
const png='data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(24,1)]).toString('base64');
// Minimal SQLite adapter with the same execute/transaction shape as the MySQL pool wrapper.
function sqlite(schema){
  const sql=new DatabaseSync(':memory:');sql.exec(schema);
  const execute=async(query,args=[])=>{const stmt=sql.prepare(query.replace(/ FOR UPDATE/g,'').replace(/INSERT IGNORE/g,'INSERT OR IGNORE'));const values=args.map(v=>typeof v==='boolean'?Number(v):v);if(/^\s*SELECT/i.test(query))return stmt.all(...values);return {affectedRows:stmt.run(...values).changes};};
  const transaction=async action=>{sql.exec('BEGIN');try{const result=await action({execute:async(q,a)=>[await execute(q,a)]});sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}};
  return {sql,execute,transaction};
}
(async()=>{
  // Remote image copy: only public HTTPS hosts on port 443, real image bytes, and a dead old link never blocks saving.
  for(const address of ['127.0.0.1','10.1.2.3','192.168.1.1','169.254.169.254','172.20.0.1','100.64.0.1','::1','fe80::1','fd00::1','::ffff:127.0.0.1','0.0.0.0'])assert.equal(remote.publicAddress(address),false,address);
  for(const address of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])assert.equal(remote.publicAddress(address),true,address);
  for(const [url,code] of [['https://127.0.0.1/a.png','BLOCKED_ADDRESS'],['https://[::1]/a.png','BLOCKED_ADDRESS'],['https://localhost/a.png','BLOCKED_ADDRESS'],['http://example.com/a.png','BLOCKED_ADDRESS'],['https://example.com:8443/a.png','BLOCKED_ADDRESS'],['https://user:pw@example.com/a.png','BLOCKED_ADDRESS']])await assert.rejects(remote.download(url),e=>e.code===code,url);
  assert.equal(remote.sniff(Buffer.from(png.split(',')[1],'base64')),'png');assert.equal(remote.sniff(Buffer.from('<svg onload=alert(1)>')),null,'SVG and HTML are never accepted');
  const fake=async url=>{if(url.includes('dead'))throw Object.assign(new Error('gone'),{code:'HTTP_404'});return png;};
  const map=await remote.localize(['https://cdn.example/a.png','https://old.example/dead.png'],['https://old.example/dead.png'],new Map(),fake);
  assert.equal(map.get('https://cdn.example/a.png'),png);assert.equal(map.get('https://old.example/dead.png'),'https://old.example/dead.png','an old address that fails is kept, not blocking');
  await assert.rejects(remote.localize(['https://new.example/dead.png'],[],new Map(),fake),e=>e.status===422&&/new\.example/.test(e.message));
  await assert.rejects(remote.localize(Array.from({length:11},(_,i)=>'https://cdn.example/'+i+'.png'),[],new Map(),fake),e=>e.status===400);

  // Validation reports external images and swaps only image values, never link targets with the same text.
  const c=model.initial().content;c.profile.avatar='https://cdn.example/a.png';c.links.items=[{id:'l1',type:'link',title:'تصویر',url:'https://cdn.example/a.png',icon:'link',active:true,featured:false,image:null}];
  assert.deepEqual(model.externalImages(c),['https://cdn.example/a.png']);
  assert.throws(()=>model.content(c,{},model.initial().content,{localized:new Map()}),e=>e.code==='EXTERNAL_IMAGES'&&e.urls[0]==='https://cdn.example/a.png'&&e.existing.length===0);
  const saved=model.content(c,{},model.initial().content,{localized:new Map([['https://cdn.example/a.png',png]])});
  assert.equal(saved.profile.avatar,png);assert.equal(saved.links.items[0].url,'https://cdn.example/a.png');
  assert.equal(model.content(c,{},model.initial().content).profile.avatar,'https://cdn.example/a.png','callers without the option keep the old behaviour');

  // Stored content is localized in place, including the escaped copy inside publication snapshots; the bytes go to dashboard_media.
  const store=sqlite('CREATE TABLE dashboard_documents(user_id TEXT PRIMARY KEY,draft TEXT,published TEXT,pub TEXT,revision INTEGER);CREATE TABLE dashboard_workspaces(user_id TEXT,slot INTEGER,draft TEXT,published TEXT,pub TEXT,revision INTEGER);CREATE TABLE dashboard_media(user_id TEXT,hash TEXT,mime TEXT,size INTEGER,data BLOB,created_at INTEGER,orphaned_at INTEGER,PRIMARY KEY(user_id,hash));');
  const stored=model.initial().content;stored.profile.avatar='https://cdn.example/old.png';
  await store.execute('INSERT INTO dashboard_documents VALUES(?,?,?,?,?)',['u1',JSON.stringify(stored),JSON.stringify({resume:stored}),JSON.stringify({resume:{status:'published',snap:JSON.stringify({avatar:stored.profile.avatar})}}),7]);
  const images=require('../src/database/external-images.cjs')(store);
  assert.deepEqual(await images.localizeStoredImages(async()=>png),{rows:1,images:1,failed:0});
  const [row]=await store.execute('SELECT * FROM dashboard_documents');
  const address='/api/dashboard/media/'+require('../src/dashboard/media.cjs').digest(png),[file]=await store.execute('SELECT mime,data FROM dashboard_media WHERE user_id=?',['u1']);
  assert.equal(JSON.parse(row.draft).profile.avatar,address);assert.equal(JSON.parse(row.published).resume.profile.avatar,address);assert.equal(JSON.parse(JSON.parse(row.pub).resume.snap).avatar,address);
  assert.equal(file.mime,'image/png');assert.equal(Buffer.from(file.data).toString('base64'),png.split(',')[1]);assert.equal(row.revision,7,'open editors keep their revision');
  assert.deepEqual(await images.localizeStoredImages(async()=>{throw Error('no second download');}),{rows:0,images:0,failed:0});

  // Sessions: device list, single revoke, sign out everywhere else, throttled last-seen.
  const db=sqlite("CREATE TABLE notification_channels(user_id TEXT,email_verified INTEGER);CREATE TABLE users(id TEXT PRIMARY KEY,phone TEXT,phone_verified INTEGER,password_hash TEXT);CREATE TABLE profiles(user_id TEXT,first_name TEXT,last_name TEXT);CREATE TABLE admin_controls(user_id TEXT PRIMARY KEY,suspended INTEGER);CREATE TABLE admin_accounts(user_id TEXT);CREATE TABLE owner_accounts(user_id TEXT);CREATE TABLE support_accounts(user_id TEXT);CREATE TABLE social_identities(user_id TEXT,provider TEXT);CREATE TABLE login_attempts(attempt_key TEXT PRIMARY KEY,count INTEGER,expires_at INTEGER);CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT,expires_at INTEGER,created_at INTEGER,last_seen INTEGER,user_agent TEXT);INSERT INTO users VALUES('u1','09120000001',1,NULL),('u2','09120000002',1,NULL);INSERT INTO profiles VALUES('u1','آوا','مهر'),('u2','نیما','راد');");
  const sessions=require('../src/database/sessions.cjs')(db);
  const agents={a:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',b:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',c:'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'};
  for(const key of 'abc')assert.equal(await sessions.createSession(digest(key.repeat(64)),'u1',Date.now()+600000,undefined,undefined,agents[key]),true);
  assert(await sessions.createSession(digest('d'.repeat(64)),'u2',Date.now()+600000));
  const auth=authHandler({...sessions,setAccountNames:async()=>{}}),server=http.createServer(async(req,res)=>{if(!await auth.handle(req,res,new URL(req.url,'http://x').pathname)){res.writeHead(404);res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const call=async(path,body,key='a',origin=base)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Cookie:'ri_session='+key.repeat(64),...(body?{Origin:origin,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
  try{
    let list=await call('/api/auth/sessions');assert.equal(list.status,200);assert.equal(list.body.sessions.length,3,'only this account');
    const current=list.body.sessions.find(s=>s.current);assert.equal(current.device.browser,'Chrome');assert.equal(current.device.os,'Windows');assert(!JSON.stringify(list.body).includes(digest('a'.repeat(64))),'token hashes never leave the server');
    const phone=list.body.sessions.find(s=>s.device.os==='iOS');assert.equal(phone.device.mobile,true);
    assert.equal((await call('/api/auth/sessions/revoke',{id:current.id})).status,400,'current device uses logout');
    assert.equal((await call('/api/auth/sessions/revoke',{id:phone.id},'a','https://evil.example')).status,403);
    assert.equal((await call('/api/auth/sessions/revoke',{id:(await call('/api/auth/sessions',null,'d')).body.sessions[0].id})).status,404,'another account\'s session cannot be closed');
    list=await call('/api/auth/sessions/revoke',{id:phone.id});assert.equal(list.status,200);assert.equal(list.body.sessions.length,2);
    assert.equal((await call('/api/auth/sessions',null,'b')).status,401,'revoked session is signed out');
    const others=await call('/api/auth/sessions/revoke-others',{});assert.equal(others.body.closed,1);assert.equal(others.body.sessions.length,1);
    assert.equal((await call('/api/auth/sessions',null,'c')).status,401);assert.equal((await call('/api/auth/sessions',null,'d')).status,200,'other accounts untouched');
    const hash=digest('a'.repeat(64));await db.execute('UPDATE sessions SET last_seen=1 WHERE token_hash=?',[hash]);await sessions.touchSession(hash,1000);assert.equal((await db.execute('SELECT last_seen FROM sessions WHERE token_hash=?',[hash]))[0].last_seen,1,'within five minutes no write');
    await sessions.touchSession(hash,10*60000);assert.equal((await db.execute('SELECT last_seen FROM sessions WHERE token_hash=?',[hash]))[0].last_seen,600000);
  }finally{await new Promise(r=>server.close(r));}

  // Full save over HTTP: the editor sends an external address, the stored draft holds the copied file.
  {
    const old=process.env.PUBLIC_ORIGIN,{testStore}=require('./auth-test-store.cjs'),store=testStore(),fetched=[];
    const app=require('../src/http/server.cjs').createServer(store,{remoteImages:{localize:(urls,existing,map)=>remote.localize(urls,existing,map,async url=>{fetched.push(url);if(url.includes('missing'))throw Error('404');return png;})}});
    await new Promise(r=>app.listen(0,'127.0.0.1',r));const site='http://127.0.0.1:'+app.address().port;process.env.PUBLIC_ORIGIN=site;
    const id=await store.provisionAccount('09120000901',null);await store.createSession(digest('e'.repeat(64)),id,Date.now()+60000);
    const save=body=>fetch(site+'/api/dashboard/save',{method:'POST',headers:{Cookie:'ri_session='+'e'.repeat(64),Origin:site,'Content-Type':'application/json'},body:JSON.stringify(body)});
    try{
      const draft=model.initial().content;draft.profile.avatar='https://cdn.example/me.png';
      let r=await save({revision:0,content:draft});assert.equal(r.status,200);
      const doc=await store.loadDashboard(id);assert.equal(doc.content.profile.avatar,png);assert.deepEqual(fetched,['https://cdn.example/me.png']);
      draft.profile.avatar='https://cdn.example/missing.png';r=await save({revision:doc.revision,content:draft});assert.equal(r.status,422);assert.match((await r.json()).error,/cdn\.example/);
      assert.equal((await store.loadDashboard(id)).content.profile.avatar,png,'a failed copy stores nothing');
    }finally{await new Promise(r=>app.close(r));if(old===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=old;}
  }
  console.log('PASS: SSRF-safe external image copy (public HTTPS only, sniffed type, bounded), save/publish localization, in-place migration with snapshots, device list, single and sign-out-everywhere-else revocation, throttled last activity.');
})().catch(error=>{console.error(error);process.exitCode=1;});
