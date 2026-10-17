const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),server=createServer(f.db,f.options);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/dashboard/resume/');const rail=page.locator('.coral-rail');await rail.waitFor();
  const out=path.resolve('artifacts/rail-glass-hover');fs.mkdirSync(out,{recursive:true});
  for(const compact of [false,true]){
   if(compact)await page.locator('[data-coral-collapse=rail]').click();
   const link=rail.locator('[data-coral-group=publish]'),style=()=>link.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,color:s.color,shadow:s.boxShadow};});await page.mouse.move(100,100);await page.waitForTimeout(500);const normal=await style();
   await link.hover();await page.waitForTimeout(500);assert.deepEqual(await style(),normal,'hover adds no opaque color or white icon override');
   const glass=await link.evaluate(e=>{const nav=e.parentElement,s=getComputedStyle(nav,'::before');return {background:s.backgroundImage,shadow:s.boxShadow,top:parseFloat(s.top),expected:e.getBoundingClientRect().top-nav.getBoundingClientRect().top,transition:s.transitionDuration};});assert.match(glass.background,/linear-gradient/);assert.notEqual(glass.shadow,'none');assert(Math.abs(glass.top-glass.expected)<2,'glass indicator follows the hovered item');assert.notEqual(glass.transition,'0s');assert.equal(await rail.locator('[aria-current=page]').getAttribute('data-coral-group'),'resume');
   await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,compact?'rail-collapsed-desktop.png':'rail-hover-desktop.png')});
   await page.mouse.move(100,100);await page.keyboard.press('Tab');await link.focus();await page.waitForTimeout(500);assert.deepEqual(await style(),normal,'keyboard focus retains the glass treatment');assert.notEqual(await link.evaluate(e=>getComputedStyle(e).outlineStyle),'none');
  }
  await page.setViewportSize({width:390,height:844});assert.equal(await rail.isVisible(),false);assert.deepEqual(errors,[]);console.log('PASS rail hover/focus use only the animated glass indicator in expanded/collapsed states; active route, keyboard outline and mobile visibility preserved.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));f.store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
