const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const {createServer}=require('../src/http/server.cjs');
(async()=>{
 const fixture=await require('./admin-fixture.cjs')(),server=createServer(fixture.db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
  const context=await browser.newContext({reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('artifacts/coral-release',{recursive:true});
  await page.addInitScript(()=>sessionStorage.setItem('ri-panel-choice','fixture-placeholder'));
  for(const [label,width,height]of[['desktop',1440,1000],['mobile',390,844],['small',320,740]]){
   await page.setViewportSize({width,height});
   await page.goto(base+'/');await page.locator('.public-account__trigger').waitFor();await page.evaluate(()=>document.fonts.ready);
   assert.deepEqual(await page.locator('[data-public-nav] a').allTextContents(),['قالب‌ها','تعرفه‌ها','درباره ما','پشتیبانی']);await page.locator('.public-account__trigger').click();
   const trigger=await page.locator('.public-account__trigger').boundingBox(),button=await page.locator('[data-session-link]').boundingBox();assert(trigger.x<button.x,'avatar stays left of dashboard');
   const labelSize=await page.locator('.public-account__label').first().boundingBox();assert(labelSize.width<200,'underline follows text width');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'public overflow '+width);await page.screenshot({path:'artifacts/coral-release/account-'+label+'.png'});await page.keyboard.press('Escape');assert.equal(await page.locator('.public-account__menu').isVisible(),false);
   await page.goto(base+'/dashboard/resume/');await page.locator('#p_name').waitFor();await page.evaluate(()=>document.fonts.ready);const choice=page.getByRole('dialog');if(await choice.count())await choice.getByRole('button',{name:'پنل کاربری',exact:true}).click();
   await page.waitForFunction(()=>Boolean(RI.polishView));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'dashboard overflow '+width);
   if(width>1100){const before=(await page.locator('.main').boundingBox()).width;await page.locator('[data-coral-collapse=rail]').click();await page.locator('[data-coral-collapse=context]').click();await page.waitForTimeout(100);assert((await page.locator('.main').boundingBox()).width>before+100);const splitter=page.locator('.coral-divider');await splitter.focus();await page.keyboard.press('Home');assert.equal(await splitter.getAttribute('aria-valuenow'),'300');await page.keyboard.press('End');assert(Number(await splitter.getAttribute('aria-valuenow'))<=800);await page.getByRole('button',{name:'دسکتاپ',exact:true}).first().click();assert(await page.locator('.device--desktop').count());}
   await page.screenshot({path:'artifacts/coral-release/dashboard-'+label+'.png',fullPage:true});
   await page.goto(base+'/admin/');await page.locator('#content .kpi').first().waitFor();assert(await page.locator('.admin-topnav #admin-menu').count());assert.equal(await page.locator('#admin-nav .menu-title').count(),5);
   if(width>760){assert((await page.locator('.admin-side').boundingBox()).width>200);await page.screenshot({path:'artifacts/coral-release/admin-open-'+label+'.png',fullPage:true});await page.locator('#admin-menu').click();assert(await page.locator('.admin-compact').count());assert((await page.locator('.admin-side').boundingBox()).width<90);}else{await page.locator('#admin-menu').click();assert.equal(await page.locator('#admin-side').getAttribute('data-open'),'true');await page.keyboard.press('Escape');}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'admin overflow '+width);await page.screenshot({path:'artifacts/coral-release/admin-'+label+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('PASS production coral shell, session-only public navigation, full-width quick links/text underline, resize and devices, 5 admin groups, glass hamburger collapse, desktop/390/320 screenshots.');
 }finally{await browser.close();await new Promise(r=>server.close(r));fixture.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
