const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createServer}=require('../src/http/server.cjs'),{RI}=require('../src/dashboard/render.cjs'),model=require('../src/dashboard/model.cjs'),{chromium}=require('playwright');
const jpeg=n=>'data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255,224]),crypto.randomBytes(n)]).toString('base64');
(async()=>{
  process.env.RESUMEIT_QUIET_ERRORS='1';
  const f=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(f.db,[f.owner,f.target],{workspaces:true});
  const c=structuredClone(RI.seed('full'));c.slug='ava';c.profile.avatar=jpeg(120000);c.profile.cover=jpeg(150000);
  c.projects=Array.from({length:8},(_,i)=>({id:'p'+i,title:'پروژه '+i,desc:'توضیح',url:'',image:jpeg(90000)}));
  await f.db.mutateDashboard(f.owner,0,d=>{d.content=c;d.slug='ava';d.published={resume:structuredClone(c)};d.pub.resume={status:'published',version:1,at:Date.now(),snap:null};});
  const vista=structuredClone(RI.seed('full'));vista.slug='nima';vista.theme.resume='vista';await f.db.mutateDashboard(f.target,0,d=>{d.content=vista;});
  let queries=[];const prepare=store.sql.prepare.bind(store.sql);store.sql.prepare=sql=>{queries.push(sql);return prepare(sql);};
  const server=createServer(f.db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const get=async(path,headers={},key='a')=>{queries=[];const r=await fetch(base+path,{headers:{Cookie:'ri_session='+key.repeat(64),...headers}});return {status:r.status,headers:r.headers,body:Buffer.from(await r.arrayBuffer()),queries:[...queries]};};
  let browser;
  try{
    // Image bytes live in dashboard_media: the stored document keeps only addresses and stays small.
    const row=store.sql.prepare('SELECT draft,published,pub FROM dashboard_documents WHERE user_id=?').get(f.owner),stored=row.draft+row.published+row.pub;
    assert(!stored.includes('data:image/'),'no inline images in the stored document');assert(stored.length<40*1024,'stored document stays small: '+stored.length);
    assert.equal(store.sql.prepare('SELECT COUNT(*) n FROM dashboard_media WHERE user_id=?').get(f.owner).n,10);
    // Dashboard images: each one is a single keyed read, never a document read; URLs are immutable and revalidation needs no read.
    const doc=await get('/api/dashboard/document');const urls=[...new Set([...doc.body.toString().matchAll(/\/api\/dashboard\/media\/[a-f0-9]{32}/g)].map(m=>m[0]))];
    assert.equal(urls.length,10);
    let documentReads=0;for(const url of urls){const r=await get(url);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/jpeg');documentReads+=r.queries.filter(q=>/FROM dashboard_documents/.test(q)).length;}
    assert.equal(documentReads,0,'images are read from dashboard_media, not from the document');
    const cached=await get(urls[0]);assert.equal(cached.headers.get('cache-control'),'private, max-age=31536000, immutable');
    const revalidated=await get(urls[0],{'If-None-Match':cached.headers.get('etag')});assert.equal(revalidated.status,304);assert(!revalidated.queries.some(q=>/dashboard_documents/.test(q)));
    assert.equal((await get('/api/dashboard/media/'+'0'.repeat(32))).status,404);
    assert.equal((await get(urls[0],{},'b')).status,404,'another account cannot read these images');

    // Public page: small HTML, images as cacheable files; each is one keyed image read, the page is never re-read.
    const page=await get('/u/ava/');const html=page.body.toString();
    assert.equal((html.match(/data:image\/(png|jpeg|webp)/g)||[]).length,0,'no inline base64 images');assert(page.body.length<100*1024,'public HTML stays small: '+page.body.length);
    const files=[...new Set([...html.matchAll(/\/u\/ava\/media\/[a-f0-9]{32}\.jpg/g)].map(m=>m[0]))];assert.equal(files.length,10);
    for(const file of files){const r=await get(file);assert.equal(r.status,200);assert.deepEqual(r.queries.map(q=>q.includes('FROM dashboard_media WHERE user_id=? AND hash=?')),[true]);assert.equal(r.headers.get('cache-control'),'public, max-age=31536000, immutable');const again=await get(file);assert.equal(again.queries.length,0,'served from memory the second time');}
    assert.equal((await get('/u/ava/media/'+'0'.repeat(32)+'.jpg')).status,404);

    // Static dashboard code reuses the session verified by the page itself.
    await get('/dashboard/');const script=await get('/dashboard/js/workspace.js');assert.equal(script.status,200);assert.equal(script.queries.length,0);
    assert.equal((await fetch(base+'/dashboard/js/workspace.js',{redirect:'manual'})).status,303,'still guarded without a session');

    // Validation reads only the image signature, yet still rejects a mislabelled file.
    const fake=structuredClone(c);fake.profile.avatar='data:image/png;base64,'+Buffer.from('GIF89a-not-a-png-file-at-all').toString('base64');
    assert.throws(()=>model.content(fake,{},c),/PNG|تصویر/);

    // Imported-template preview: typing swaps the frame body instead of rebuilding the iframe.
    browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
    const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'b'.repeat(64),url:base}]);
    const tab=await context.newPage(),errors=[];tab.on('pageerror',e=>errors.push(e.message));let navigations=0;tab.on('framenavigated',frame=>{if(frame!==tab.mainFrame())navigations++;});
    await tab.goto(base+'/dashboard/resume/');await tab.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.querySelector('.ri-imported'),{timeout:60000});await tab.waitForTimeout(800);
    const before=navigations,field=tab.locator('#p_name');await field.click();await field.pressSequentially(' تست',{delay:50});
    await tab.waitForFunction(()=>document.querySelector('iframe').contentDocument.body.textContent.includes('تست'),{timeout:10000});
    assert.equal(navigations-before,0,'no iframe reloads while typing');
    assert.equal(await tab.evaluate(()=>document.querySelector('iframe').contentDocument.body.querySelectorAll('link[rel=stylesheet]').length),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: images read from dashboard_media without document reads, immutable/304 dashboard images, small public HTML with cached image files, session-free static code, signature-only validation and in-place template preview.');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
