const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createServer}=require('../src/http/server.cjs'),{RI}=require('../src/dashboard/render.cjs'),media=require('../src/dashboard/media.cjs');
const jpeg=n=>'data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255,224]),crypto.randomBytes(n)]).toString('base64');
(async()=>{
  process.env.RESUMEIT_QUIET_ERRORS='1';
  const f=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(f.db,[f.owner,f.target],{workspaces:true}),sql=store.sql;
  const server=createServer(f.db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const cookie=key=>({Cookie:'ri_session='+key.repeat(64)});
  const get=async(path,key='a')=>{const r=await fetch(base+path,{headers:cookie(key)});return {status:r.status,type:r.headers.get('content-type'),body:Buffer.from(await r.arrayBuffer())};};
  const json=async(path,key='a')=>JSON.parse((await get(path,key)).body);
  const save=async(content,key='a')=>{const doc=await json('/api/dashboard/document',key);const r=await fetch(base+'/api/dashboard/save',{method:'POST',headers:{...cookie(key),Origin:base,'Content-Type':'application/json'},body:JSON.stringify({revision:doc.revision,content:typeof content==='function'?content(doc.content):content,preferences:doc.preferences,compact:true})});return {status:r.status,body:await r.json()};};
  const rows=user=>sql.prepare('SELECT hash,orphaned_at FROM dashboard_media WHERE user_id=? ORDER BY hash').all(user);
  const draft=(user,table='dashboard_documents')=>sql.prepare('SELECT draft,published,pub,revision FROM '+table+' WHERE user_id=?').get(user);
  try{
    // A new upload is stored once in dashboard_media; the document keeps only its address.
    const avatar=jpeg(3000),hash=media.digest(avatar),address='/api/dashboard/media/'+hash;
    const start=structuredClone(RI.seed('full'));start.slug='media-owner';start.projects=[];start.profile.cover=null;start.profile.avatar=avatar;
    assert.equal((await save(start)).status,200);
    assert.equal(JSON.parse(draft(f.owner).draft).profile.avatar,address);assert(!draft(f.owner).draft.includes('data:image/'));
    assert.deepEqual(rows(f.owner).map(r=>r.hash),[hash]);
    const served=await get(address);assert.equal(served.status,200);assert.equal(served.type,'image/jpeg');assert.equal(served.body.toString('base64'),avatar.split(',')[1]);

    // Saving what the editor received back (with or without the old workspace suffix) adds nothing.
    assert.equal((await save(c=>c)).status,200);
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:address+'?workspace=2'}}))).status,200);
    assert.equal(JSON.parse(draft(f.owner).draft).profile.avatar,address,'stored without the suffix');
    // An older tab that still holds the image inline saves it again without a second copy.
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar}}))).status,200);assert.equal(rows(f.owner).length,1);

    // Addresses must name an image this account stores: unknown or another account's hash is refused.
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:'/api/dashboard/media/'+'1'.repeat(32)}}))).status,409);
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:address}}),'b')).status,409,'another account cannot use this image');
    assert.equal((await get(address,'b')).status,404,'nor read it');

    // Removed images are marked, can come back within the grace period, and are swept after it.
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:null}}))).status,200);
    assert(rows(f.owner)[0].orphaned_at>0,'unused image is marked');
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:address}}))).status,200,'an undo brings it back');
    assert.equal(rows(f.owner)[0].orphaned_at,null);
    assert.equal(await f.db.sweepDashboardMedia(Date.now()+48*3600000),0,'an image in use is never swept');
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:null}}))).status,200);
    assert.equal(await f.db.sweepDashboardMedia(Date.now()+3600000),0,'kept during the grace period');
    assert.equal(await f.db.sweepDashboardMedia(Date.now()+25*3600000),1);assert.equal(rows(f.owner).length,0);
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:address}}))).status,409,'a swept image is gone');

    // The size cap applies to new uploads only, not to images the account already stores.
    const large=jpeg(500*1024);
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:large}}))).status,413,'a new oversized upload is refused');
    await f.db.mutateDashboard(f.owner,(await json('/api/dashboard/document')).revision,d=>{d.content.profile.avatar=large;});
    assert.equal((await save(c=>({...c,profile:{...c.profile,avatar:large}}))).status,200,'an already stored image is accepted inline');

    // Published pages serve their stored images as public files; draft-only images stay private.
    const photo=jpeg(2000),draftOnly=jpeg(2100);
    await f.db.mutateDashboard(f.owner,(await json('/api/dashboard/document')).revision,d=>{d.content.profile.avatar=photo;d.published={resume:structuredClone(d.content)};d.pub.resume={status:'published',version:1,at:Date.now(),snap:null};});
    await f.db.mutateDashboard(f.owner,(await json('/api/dashboard/document')).revision,d=>{d.content.profile.cover=draftOnly;},{draftOnly:true});
    const stored=draft(f.owner);assert(!(stored.draft+stored.published+stored.pub).includes('data:image/'));
    const page=(await get('/u/media-owner/')).body.toString(),file='/u/media-owner/media/'+media.digest(photo)+'.jpg';
    assert(page.includes(file),'public HTML links the image file');assert(!page.includes('/api/dashboard/media/'),'no private addresses in public HTML');
    const pub=await get(file);assert.equal(pub.status,200);assert.equal(pub.body.toString('base64'),photo.split(',')[1]);
    assert.equal((await get('/u/media-owner/media/'+media.digest(draftOnly)+'.jpg')).status,404,'draft-only image is not public');

    // Startup migration: rows written before this change are moved once; the revision is kept.
    const legacy=structuredClone(RI.seed('full'));legacy.slug='media-legacy';legacy.projects=[];legacy.profile.cover=null;legacy.profile.avatar=jpeg(1500);
    const snap=JSON.stringify(RI.publicationData('resume',legacy));
    sql.prepare('INSERT INTO dashboard_documents(user_id,slug,draft,preferences,pub,published,revision) VALUES(?,?,?,?,?,?,?)').run(f.target,'media-legacy',JSON.stringify(legacy),'{}',JSON.stringify({resume:{status:'published',version:1,at:1,snap},links:{status:'draft',version:0,at:null,snap:null}}),JSON.stringify({resume:legacy}),7);
    const first=await f.db.externalizeStoredImages();assert.equal(first.rows,1);assert.equal(first.failed,0);
    const moved=draft(f.target);assert(!(moved.draft+moved.published+moved.pub).includes('data:image/'),'draft, published copy and snapshot are all moved');
    assert.equal(moved.revision,7,'open editors keep their revision');assert.equal(rows(f.target).length,1);
    assert.equal(JSON.parse(JSON.parse(moved.pub).resume.snap).profile.avatar,'/api/dashboard/media/'+media.digest(legacy.profile.avatar));
    assert.equal((await f.db.externalizeStoredImages()).rows,0,'repeat runs find nothing');
    assert.equal((await get('/api/dashboard/media/'+media.digest(legacy.profile.avatar),'b')).status,200);

    // Deleting an account (deleteAccount ends with DELETE FROM users) removes its images through the foreign key.
    sql.prepare('DELETE FROM users WHERE id=?').run(f.target);assert.equal(rows(f.target).length,0);
    console.log('PASS: images stored once in dashboard_media, small documents, account-scoped addresses, orphan grace and sweep, size cap for new uploads only, public files for published images only, repeatable migration and cascade on account deletion.');
  }finally{await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
