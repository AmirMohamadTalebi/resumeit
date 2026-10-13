const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const {createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs'),{digest}=require('../src/auth/auth.cjs');
(async()=>{delete process.env.PUBLIC_ORIGIN;const db=testStore(),id=await db.provisionAccount('09120000888',null);await db.createSession(digest('c'.repeat(64)),id,Date.now()+600000);db.wallet=async()=>({balance:0,rate:2000,transactions:[]});
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  const cookie='ri_session='+'c'.repeat(64);const resource=base+'/dashboard/js/template-vista.js';let r=await fetch(resource,{headers:{Cookie:cookie}});assert.equal(r.status,200);const etag=r.headers.get('etag');assert(etag);await r.arrayBuffer();r=await fetch(resource,{headers:{Cookie:cookie,'If-None-Match':etag}});assert.equal(r.status,304);r=await fetch(resource,{headers:{'If-None-Match':etag},redirect:'manual'});assert.equal(r.status,303,'auth checked before cache');r=await fetch(resource,{headers:{Cookie:cookie,'If-None-Match':'"outdated"'}});assert.equal(r.status,200);await r.arrayBuffer();
  for(const asset of ['/dashboard/css/pages.css','/dashboard/js/app.js','/dashboard/']){const response=await fetch(base+asset,{headers:{Cookie:cookie,'Accept-Encoding':'gzip'}});assert.equal(response.headers.get('content-encoding'),'gzip');assert.equal(response.headers.get('vary'),'Accept-Encoding');assert((await response.text()).length>1024);}
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const times={};
  for(const baseline of [false]){
   const context=await browser.newContext({viewport:{width:1440,height:960}});await context.addCookies([{name:'ri_session',value:'c'.repeat(64),url:base}]);const page=await context.newPage(),requested=[],errors=[];page.on('request',r=>requested.push(new URL(r.url()).pathname));page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{await new Promise(r=>setTimeout(r,100));await route.continue();});
   const start=Date.now();await page.goto(base+'/dashboard/wallet/');await page.getByText('موجودی قابل استفاده').waitFor();times.after=Date.now()-start;
   if(!baseline){assert(!requested.some(p=>/template-(vista|satiar)\.js$/.test(p)));assert(!requested.includes('/api/dashboard/stats'));await page.goto(base+'/dashboard/themes/');await page.locator('[data-id="vista"]').waitFor();assert.equal(await page.locator('.tcard').count(),6);await page.locator('[data-gallery-page="1"]').click();assert.equal(await page.locator('.tcard').count(),4);assert.equal(await page.locator('[data-id="vista"]').count(),0);await page.locator('[data-gallery-page="0"]').click();assert.equal(await page.locator('.tcard').count(),6);assert(await page.evaluate(()=>!RI.IMPORTED_TEMPLATES.vista&&!RI.IMPORTED_TEMPLATES.satiar));await page.locator('[data-id="vista"] [data-try]').click();await page.getByRole('dialog').waitFor();assert(await page.evaluate(()=>!!RI.IMPORTED_TEMPLATES.vista&&!RI.IMPORTED_TEMPLATES.satiar));await page.getByRole('dialog').getByRole('button',{name:'بستن',exact:true}).first().click();
    let releaseStats;const statsGate=new Promise(r=>{releaseStats=r;});
    await page.route('**/api/dashboard/stats',async route=>{await statsGate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({rows:[{day:Math.floor((Date.now()+12600000)/86400000),event:'resume',total:17}]})});});
    await page.goto(base+'/dashboard/');await page.locator('#page-title').waitFor();assert(await page.locator('.ri-page-loading').count()===0);assert((await page.locator('#homeStats').innerText()).includes('در حال دریافت آمار'));releaseStats();await page.waitForFunction(()=>!RI.statsLoading);assert((await page.locator('#homeStats').innerText()).includes('۱۷'));
    await page.unroute('**/api/dashboard/stats');
    await db.mutateDashboard(id,0,d=>{d.content.theme.resume='vista';});db.billing=async()=>({purchases:[{ref:'rt:vista'}]});
    const startRequests=requested.length;await page.goto(base+'/dashboard/wallet/');await page.getByText('موجودی قابل استفاده').waitFor();assert(!requested.slice(startRequests).some(p=>/template-(vista|satiar)\.js$/.test(p)));await page.locator('#topPreview').click();await page.getByRole('dialog').waitFor();assert(requested.slice(startRequests).includes('/dashboard/js/template-vista.js'));assert(!requested.slice(startRequests).includes('/dashboard/js/template-satiar.js'));
}
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: lazy templates and on-demand preview, nonblocking slow stats, conditional static cache and auth before 304. Controlled 100ms request latency wallet timings:',times);
 }finally{await browser?.close();await new Promise(r=>server.close(r));db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
