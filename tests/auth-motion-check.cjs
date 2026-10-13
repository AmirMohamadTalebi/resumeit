const assert=require('node:assert/strict');
const {createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs'),{chromium}=require('playwright');
(async()=>{
 const server=createServer(testStore());await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});await page.goto(base+'/login/');await page.locator('#mobile').fill('09120000001');await page.locator('#pass').fill('Password123!');
   assert.equal(await page.locator('.auth-assembly').getAttribute('data-progress'),'3');assert.equal(await page.locator('.auth-piece').count(),8);
   const elapsed=await page.evaluate(async()=>{const t=performance.now();const result=await RIA.run(document.querySelector('#card'),async()=>17,'بررسی ورود',document.querySelector('#sb'),true);if(result!==17)throw new Error('Result lost');return performance.now()-t;});
   assert(elapsed<500,'No artificial login timer or awaited animation: '+elapsed);
   let release,requests=0;const gate=new Promise(r=>release=r);await page.route('**/api/auth/login',async route=>{requests++;await gate;await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'رمز نادرست است'})});});
   await page.locator('#sb').click();await page.locator('#card[aria-busy=true]').waitFor();assert.equal(await page.locator('.auth-transit').count(),0);assert(await page.locator('#auth-root').isVisible());
   await page.locator('#f').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(requests,1);
   release();await page.locator('.formerr').waitFor();assert(await page.locator('#sb').isEnabled());assert.equal(await page.locator('#card').getAttribute('aria-busy'),null);await page.unroute('**/api/auth/login');
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/login/');assert.equal(await page.locator('.auth-transit').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS: retained form R, immediate operation completion, no fullscreen/animation wait, pending duplicate guard, error recovery, mobile and reduced motion.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
