const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')();
 f.db.billing=async()=>({plan:{id:'y',end:Date.now()+86400000},purchases:[],payments:[]});
 const server=createServer(f.db,f.options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
  async function context(){const result=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});await result.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await result.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);return result;}
  const errors=[];
  const holdBootFrames=()=>{const original=requestAnimationFrame;window.heldBootFrames=[];window.requestAnimationFrame=callback=>String(callback).includes('navigationEpoch===0')?(heldBootFrames.push(callback),-1):original(callback);};
  const ctx=await context();await ctx.addInitScript(holdBootFrames);
  const page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));let statsCalls=0;await page.route('**/api/dashboard/stats',async route=>{statsCalls++;await route.continue();});
  await page.goto(base+'/dashboard/');await page.locator('#homeStats').waitFor();await page.waitForFunction(()=>heldBootFrames.length===1);assert.equal(statsCalls,0);
  await page.evaluate(()=>RI.go('themes'));await page.waitForFunction(()=>document.body.dataset.page==='themes');
  await page.evaluate(()=>RI.go('home'));await page.locator('#homeStats').waitFor();await page.waitForFunction(()=>!RI.statsLoading&&RI.statsRows!==null);assert.equal(statsCalls,1,'returning home starts stats even when boot callback was cancelled');
  await page.evaluate(()=>heldBootFrames.forEach(callback=>callback()));await page.waitForTimeout(30);assert.equal(statsCalls,1,'cancelled boot callback does not duplicate stats');
  await ctx.close();

  for(const fail of [false,true])for(const releaseDuringRequest of [false,true]){
   const refreshContext=await context();await refreshContext.addInitScript(holdBootFrames);const p=await refreshContext.newPage();p.on('pageerror',error=>errors.push(error.message));let calls=0,releaseResponse;
   const responseGate=new Promise(resolve=>releaseResponse=resolve);
   await p.route('**/api/dashboard/stats',async route=>{calls++;await responseGate;await route.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{error:'synthetic stats failure'}:{rows:[]})});});
   await p.goto(base+'/dashboard/stats/');await p.waitForFunction(()=>heldBootFrames.length===1);assert.equal(calls,0);
   await p.locator('[data-refresh]').click();await p.waitForFunction(()=>RI.statsLoading);
   if(releaseDuringRequest)await p.evaluate(()=>heldBootFrames.forEach(callback=>callback()));
   releaseResponse();await p.waitForFunction(()=>!RI.statsLoading);assert.equal(await p.evaluate(()=>RI.statsError),fail);
   if(!releaseDuringRequest)await p.evaluate(()=>heldBootFrames.forEach(callback=>callback()));
   await p.waitForTimeout(30);assert.equal(calls,1,'deferred boot must not duplicate a manual refresh: '+JSON.stringify({fail,releaseDuringRequest}));await refreshContext.close();
  }

  const guardContext=await context(),guardPage=await guardContext.newPage();guardPage.on('pageerror',error=>errors.push(error.message));
  await guardPage.goto(base+'/dashboard/resume/?step=profile');await guardPage.locator('#p_name').fill('تغییر ذخیره‌نشدهٔ آزمایش');await guardPage.waitForFunction(()=>RI.state.ui.dirty);
  await guardPage.evaluate(()=>RI.go('themes'));const stay=guardPage.getByRole('button',{name:'ماندن در صفحه',exact:true});await stay.waitFor();
  await guardPage.evaluate(()=>RI.go('stats'));assert.equal(await stay.count(),1,'concurrent destinations share one leave confirmation');await stay.click();
  await guardPage.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.equal(await guardPage.evaluate(()=>document.body.dataset.page),'resume');assert.equal(await guardPage.locator('#p_name').inputValue(),'تغییر ذخیره‌نشدهٔ آزمایش');assert.equal(await guardPage.evaluate(()=>RI.state.ui.dirty),true);assert.equal(await guardPage.locator('#routeLoading').count(),0);assert.equal(await guardPage.locator('#view').evaluate(node=>node.inert),false);await guardContext.close();

  // A newer ordinary navigation must finish before the old template does.
  for(const fail of [false,true]){
   const navigationContext=await context(),p=await navigationContext.newPage();p.on('pageerror',error=>errors.push(error.message));let releaseTemplate,templateRequested;
   const gate=new Promise(resolve=>releaseTemplate=resolve),requested=new Promise(resolve=>templateRequested=resolve);
   await navigationContext.route('**/dashboard/template-data/vista.json*',async route=>{templateRequested();await gate;if(fail)await route.fulfill({status:503,contentType:'application/json',body:'{}'});else await route.continue();});
   await p.goto(base+'/dashboard/');await p.locator('#homeStats').waitFor();await p.evaluate(()=>{const original=RI.loadTemplates;RI.loadTemplates=(...args)=>{const pending=original(...args);window.heldTemplatePromise=pending.catch(()=>{});return pending;};RI.C().theme.resume='vista';RI.go('resume');});await requested;
   await p.evaluate(()=>RI.go('themes'));await p.waitForFunction(()=>document.body.dataset.page==='themes',null,{timeout:5000});
   assert.equal(await p.locator('#routeLoading').count(),0);assert.equal(await p.locator('#view').evaluate(node=>node.inert),false);
   releaseTemplate();await p.evaluate(()=>heldTemplatePromise);assert.equal(await p.evaluate(()=>document.body.dataset.page),'themes');assert.equal(await p.locator('#resume-section-tabs').count(),0);assert.equal(await p.locator('[data-initial-retry]').count(),0);
   if(fail)assert.equal(await p.getByText('قالب بارگذاری نشد؛ اتصال اینترنت را بررسی کن و دوباره بزن',{exact:true}).count(),0,'stale template failure must not surface on the new route');
   await navigationContext.close();
  }

  const statsContext=await context(),statsPage=await statsContext.newPage();statsPage.on('pageerror',error=>errors.push(error.message));await statsPage.goto(base+'/dashboard/stats/');await statsPage.waitForFunction(()=>!RI.statsLoading&&RI.statsRows!==null);
  const held=[];await statsPage.route('**/api/dashboard/stats*',route=>new Promise(resolve=>held.push({route,resolve})));
  async function waitRequests(count){for(let i=0;i<500&&held.length<count;i++)await statsPage.waitForTimeout(10);assert.equal(held.length,count,'expected held stats request');}
  async function respond(index,total){const item=held[index];await item.route.fulfill({contentType:'application/json',body:JSON.stringify({rows:[{day:Math.floor((Date.now()+12600000)/86400000),event:'resume',total}]})});item.resolve();}
  await statsPage.evaluate(()=>{window.oldStats=RI.loadStats();});await waitRequests(1);
  await statsPage.locator('[data-refresh]').click();await waitRequests(2);await respond(1,222);await statsPage.waitForFunction(()=>RI.statsRows?.[0]?.total===222);await respond(0,111);await statsPage.evaluate(()=>oldStats);assert.equal(await statsPage.evaluate(()=>RI.statsRows[0].total),222,'older automatic response cannot overwrite a newer manual refresh');
  for(const field of ['ownerId','workspaceSlot']){
   const index=held.length;await statsPage.evaluate(()=>{window.oldStats=RI.loadStats();});await waitRequests(index+1);
   await statsPage.evaluate(field=>{window.previousContextValue=RI[field];RI[field]=field==='ownerId'?'different-owner':2;RI.statsRows=[{total:333}];},field);
   await respond(index,444);await statsPage.evaluate(()=>oldStats);assert.equal(await statsPage.evaluate(()=>RI.statsRows[0].total),333,'old stats response rejected after '+field+' changes');
   await statsPage.evaluate(field=>{RI[field]=previousContextValue;},field);
  }
  await statsContext.close();assert.deepEqual(errors,[]);
  console.log('PASS loading races: cancelled boot stats, latest ordinary navigation, stale template success/failure, newest stats response and owner/workspace guards.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));f.store.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
