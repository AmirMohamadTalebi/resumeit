const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),server=createServer(f.db,f.options);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/dashboard/resume/?step=profile');await page.locator('#p_name').waitFor();
  const toggle=page.locator('[data-detach-preview]');await toggle.waitFor();
  await page.waitForFunction(()=>!!document.querySelector('#rpv .device__vp'));
  await page.evaluate(()=>window.originalPreviewNode=document.querySelector('#rpv'));
  const open=async()=>{const pending=page.waitForEvent('popup');await toggle.click();const popup=await pending;await popup.locator('#rpv').waitFor();return popup;};
  let popup=await open();assert.equal(await page.locator('#rpv').count(),0);assert.equal(await popup.locator('script').count(),0);assert.equal(await popup.evaluate(()=>document.querySelector('#rpv')===opener.originalPreviewNode),true);
  await page.locator('#p_name').fill('نام پنجره آزمایش');
  await popup.waitForFunction(()=>{const vp=document.querySelector('.device__vp');return (vp?.querySelector('iframe')?.contentDocument?.body?.innerText||vp?.innerText||'').includes('نام پنجره آزمایش');});
  await toggle.click();await page.locator('#rpv').waitFor();assert(popup.isClosed());assert.equal(await page.locator('#p_name').inputValue(),'نام پنجره آزمایش');
  popup=await open();await popup.close();await page.locator('#rpv').waitFor();assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>{window.originalOpen=window.open;window.open=()=>null;});await toggle.click();assert.equal(await page.locator('#rpv').count(),1);assert.equal(await toggle.getAttribute('aria-pressed'),'false');await page.evaluate(()=>window.open=originalOpen);
  popup=await open();await page.evaluate(async()=>{await RI.save();RI.go('home');});await page.locator('#homeStats').waitFor();assert(popup.isClosed());
  const saved=await f.db.loadDashboard(f.owner);await f.db.mutateDashboard(f.owner,saved.revision,d=>{d.content.theme.resume='vista';});
  const out=path.resolve('artifacts/section-loading');fs.mkdirSync(out,{recursive:true});
  for(const mode of ['success','retry','close','away']){
   const pendingContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
   await pendingContext.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await pendingContext.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);
   let release,requests=0,settle;const gate=new Promise(resolve=>release=resolve),done=new Promise(resolve=>settle=resolve);
   await pendingContext.route('**/dashboard/template-data/vista.json*',async route=>{requests++;if(mode==='retry'&&requests===1){await route.fulfill({status:503,contentType:'application/json',body:'{}'});return;}await gate;await route.continue();settle();});
   const pendingPage=await pendingContext.newPage();pendingPage.on('pageerror',error=>errors.push(error.message));
   await pendingPage.goto(base+'/dashboard/resume/?step=profile');await pendingPage.locator('#p_name').waitFor();await pendingPage.evaluate(()=>window.originalProfileNode=document.querySelector('#p_name'));
   await pendingPage.locator('#p_name').fill('نام هنگام انتظار '+mode);
   if(mode==='retry')await pendingPage.locator('[data-resume-template-retry]').waitFor();
   else await pendingPage.locator('#rpv [data-resume-template-loading]').waitFor();
   if(mode==='success')await pendingPage.screenshot({path:path.join(out,'initial-loading.png')});
   const event=pendingPage.waitForEvent('popup');await pendingPage.locator('[data-detach-preview]').click();const detached=await event;await detached.locator('#rpv').waitFor();
   if(mode==='retry'){await detached.locator('[data-resume-template-retry]').click();await detached.locator('[data-resume-template-loading]').waitFor();}
   if(mode==='close')await detached.close();
   if(mode==='away'){await pendingPage.evaluate(async()=>{await RI.save();RI.go('home');});await pendingPage.locator('#homeStats').waitFor();assert(detached.isClosed());}
   release();await done;
   if(mode==='away'){assert.equal(await pendingPage.locator('#rpv').count(),0);}
   else{
    const target=mode==='close'?pendingPage:detached;await target.locator('#rpv iframe').waitFor();
    assert.equal(await pendingPage.evaluate(()=>document.querySelector('#p_name')===originalProfileNode),true);assert.equal(await pendingPage.locator('#p_name').inputValue(),'نام هنگام انتظار '+mode);
    if(mode==='success'){await detached.screenshot({path:path.join(out,'detached-preview.png')});await pendingPage.screenshot({path:path.join(out,'editor-detached.png')});}
   }
   assert.equal(requests,mode==='retry'?2:1,'one template request per attempt: '+mode);await pendingContext.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS detached live preview update, toggle/close restore, blocked popup and route cleanup.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));f.store.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
