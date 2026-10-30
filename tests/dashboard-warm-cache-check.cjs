const assert=require('node:assert/strict');
const {createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs'),{digest}=require('../src/auth/auth.cjs'),{assetRevision:version}=require('../src/http/static.cjs'),{chromium}=require('playwright');
(async()=>{
 const db=testStore(),id=await db.provisionAccount('09120000661',null);await db.createSession(digest('e'.repeat(64)),id,Date.now()+600000);
 const store=require('./workspace-test-store.cjs')(db,[id]);db.wallet=async()=>({balance:0,rate:2000,transactions:[]});
 let release,hold=true;const gate=new Promise(r=>release=r),original=db.loadDashboard;
 db.loadDashboard=async owner=>{if(hold)await gate;return original(owner);};
 const server=createServer(db);let assetRequests=0;server.on('request',req=>{if(/^\/dashboard\/(js|css)\//.test(req.url))assetRequests++;});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
  const context=await browser.newContext();await context.addCookies([{name:'ri_session',value:'e'.repeat(64),url:base}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>document.addEventListener('ri:dashboard-ready',()=>window.readyAt=performance.now()));
  await page.goto(base+'/dashboard/wallet/',{waitUntil:'domcontentloaded'});await page.locator('#sidebar .dn-brand').waitFor();assert.equal(await page.locator('#topPreview').isDisabled(),true);
  assert((await page.locator('#view').textContent()).includes('در حال دریافت'));assert.equal(await page.locator('body').getAttribute('aria-busy'),null);
  release();hold=false;await page.waitForFunction(()=>window.readyAt);await page.waitForLoadState('networkidle');const cold=assetRequests;assert(cold<=5,'Shared modules must be bundled on cold load');
  const times=[];
  for(const path of ['links/','wallet/','links/']){const before=assetRequests;await page.goto(base+'/dashboard/'+path,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.readyAt);await page.waitForLoadState('networkidle');times.push({path,ready:Math.round(await page.evaluate(()=>readyAt)),assetRequests:assetRequests-before});}
  assert(times[0].assetRequests<=2,JSON.stringify(times));assert.equal(times[1].assetRequests,0);assert.equal(times[2].assetRequests,0);
  const headers={Cookie:'ri_session='+'e'.repeat(64)},asset='/dashboard/js/app.js?v='+version;
  const response=await fetch(base+asset,{headers});assert(response.headers.get('cache-control').includes('immutable'));
  assert.equal((await fetch(base+asset,{redirect:'manual',headers:{'If-None-Match':response.headers.get('etag')}})).status,303);
  assert(!(await fetch(base+'/dashboard/js/app.js?v=old',{headers})).headers.get('cache-control').includes('immutable'));
  assert.equal((await fetch(base+'/dashboard/?v='+version,{headers})).headers.get('cache-control'),'no-store');assert.deepEqual(errors,[]);
  assert.equal((await(await fetch(base+'/api/dashboard/document',{headers})).json()).ownerId,id);
  const mismatch=await page.evaluate(async owner=>{const before=JSON.stringify(RI.C());window.resumeitDocument=Promise.resolve({ownerId:'other-account',content:{}});try{await RI.loadDashboard(owner);return {rejected:false};}catch{return {rejected:true,unchanged:before===JSON.stringify(RI.C())};}},id);
  assert.deepEqual(mismatch,{rejected:true,unchanged:true});
  console.log('PASS: visible usable shell before document, versioned asset cache with auth retained, private HTML/data and warm navigation',JSON.stringify({coldAssetRequests:cold,times}));
 }finally{await browser.close();await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
