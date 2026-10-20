const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')();f.db.billing=async()=>({plan:{id:'y',end:Date.now()+86400000},purchases:[],payments:[]});
 const doc=await f.db.loadDashboard(f.owner);await f.db.mutateDashboard(f.owner,doc.revision,d=>{d.content.theme.resume='vista';});
 const server=createServer(f.db,f.options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const errors=[];
  async function open(){const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));return {context,page};}

  const first=await open();let releaseTemplate,requested;const gate=new Promise(resolve=>releaseTemplate=resolve),request=new Promise(resolve=>requested=resolve);
  await first.context.route('**/dashboard/template-data/vista.json*',async route=>{requested();await gate;await route.continue();});
  await first.page.goto(base+'/dashboard/resume/?step=profile',{waitUntil:'domcontentloaded'});await request;
  await first.page.locator('#p_name').waitFor({state:'visible'});await first.page.locator('#rpv [data-resume-template-loading]').waitFor();assert.equal(await first.page.locator('#view').evaluate(node=>node.inert),false);
  await first.page.evaluate(()=>{window.originalProfileNode=document.querySelector('#p_name');});await first.page.locator('#p_name').fill('نام پیش از دریافت قالب');
  assert.equal(await first.page.evaluate(()=>RI.C().profile.name),'نام پیش از دریافت قالب');const selectedTab=first.page.locator('#resume-section-tabs [aria-selected=true]');const focusedTabId=await selectedTab.getAttribute('id');await selectedTab.focus();releaseTemplate();await first.page.locator('#rpv iframe').waitFor();
  assert.equal(await first.page.locator('#p_name').inputValue(),'نام پیش از دریافت قالب');assert.equal(await first.page.evaluate(()=>document.querySelector('#p_name')===originalProfileNode),true,'template completion must not replace the profile form');assert.equal(await first.page.evaluate(()=>document.activeElement.id),focusedTabId,'late template completion restores the previously focused section tab');assert.equal(await first.page.locator('#rpv [data-resume-template-loading]').count(),0);await first.context.close();

  const retry=await open();let calls=0,releaseRetry;const retryGate=new Promise(resolve=>releaseRetry=resolve);
  await retry.context.route('**/dashboard/template-data/vista.json*',async route=>{calls++;if(calls===1)await route.fulfill({status:503,contentType:'application/json',body:'{}'});else{await retryGate;await route.continue();}});
  await retry.page.goto(base+'/dashboard/resume/?step=profile');await retry.page.locator('[data-resume-template-retry]').waitFor();assert.equal(await retry.page.locator('#p_name').isEditable(),true);
  await retry.page.locator('#p_name').fill('نام هنگام خطای قالب');await retry.page.evaluate(()=>{window.originalProfileNode=document.querySelector('#p_name');});
  await retry.page.locator('[data-resume-template-retry]').evaluate(button=>{button.click();button.click();});await retry.page.locator('#rpv [data-resume-template-loading]').waitFor();await retry.page.locator('#p_name').focus();releaseRetry();await retry.page.locator('#rpv iframe').waitFor();
  assert.equal(calls,2,'repeated retry activation starts only one replacement request');assert.equal(await retry.page.locator('#rpv iframe').count(),1,'retry creates only one active preview');assert.equal(await retry.page.locator('#p_name').inputValue(),'نام هنگام خطای قالب');assert.equal(await retry.page.evaluate(()=>document.querySelector('#p_name')===originalProfileNode),true);assert.equal(await retry.page.locator('#p_name').evaluate(node=>node===document.activeElement),true);assert.equal(await retry.page.locator('[data-resume-template-retry]').count(),0);await retry.context.close();

  for(const fail of [false,true]){
   const away=await open();let release,requested;const gate=new Promise(resolve=>release=resolve),request=new Promise(resolve=>requested=resolve);
   await away.context.route('**/dashboard/template-data/vista.json*',async route=>{requested();await gate;if(fail)await route.fulfill({status:503,contentType:'application/json',body:'{}'});else await route.continue();});
   await away.page.goto(base+'/dashboard/resume/?step=profile');await request;await away.page.locator('#p_name').waitFor();
   await away.page.evaluate(()=>{window.departingTemplate=RI.loadTemplates(['vista']).catch(()=>{});RI.go('themes');});await away.page.waitForFunction(()=>document.body.dataset.page==='themes');release();await away.page.evaluate(()=>departingTemplate);
   assert.equal(await away.page.evaluate(()=>document.body.dataset.page),'themes');assert.equal(await away.page.locator('#p_name').count(),0);assert.equal(await away.page.locator('[data-resume-template-retry]').count(),0);assert.equal(await away.page.locator('#view').evaluate(node=>node.inert),false);
   await away.page.evaluate(()=>{window.routeSpinners=[];window.routeObserver=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1&&(node.id==='routeLoading'||node.querySelector('#routeLoading')))routeSpinners.push(node.id);})));routeObserver.observe(document.body,{subtree:true,childList:true});RI.go('home');});await away.page.locator('#homeStats').waitFor();await away.page.evaluate(()=>RI.go('themes'));await away.page.waitForFunction(()=>document.body.dataset.page==='themes');assert.deepEqual(await away.page.evaluate(()=>routeSpinners),[],'cached fast navigation must never insert a route spinner');await away.context.close();
  }
  const invalid=await open();let releaseInvalid;const invalidGate=new Promise(resolve=>releaseInvalid=resolve);await invalid.context.route('**/dashboard/template-data/vista.json*',async route=>{await invalidGate;await route.continue();});
  await invalid.page.goto(base+'/dashboard/resume/?step=template-does-not-exist');await invalid.page.locator('#rpv [data-resume-template-loading]').waitFor();await invalid.page.locator('[data-template-pending-panel]').waitFor();releaseInvalid();await invalid.page.locator('#rpv iframe').waitFor();
  assert.equal(await invalid.page.locator('#resume-section-tabs [aria-selected=true]').getAttribute('data-step'),'profile');assert.equal(await invalid.page.locator('#resume-section-tabs [data-step=template-does-not-exist]').count(),0);
  await invalid.page.evaluate(()=>RI.go('themes'));await invalid.page.waitForFunction(()=>document.body.dataset.page==='themes');await invalid.page.evaluate(()=>RI.go('resume',{step:'template-does-not-exist'}));await invalid.page.locator('#p_name').waitFor();assert.equal(await invalid.page.locator('#resume-section-tabs [aria-selected=true]').getAttribute('data-step'),'profile','warm unknown step uses the same safe fallback');assert.equal(await invalid.page.locator('#resume-section-tabs [data-step=template-does-not-exist]').count(),0);await invalid.context.close();
  assert.deepEqual(errors,[]);console.log('PASS independent section loading: editable stable profile, local retry, ignored late completion, cached fast pages, and consistent cold/warm invalid-step fallback.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));f.store.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
