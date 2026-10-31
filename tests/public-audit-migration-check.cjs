const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs');
const {chromium}=require('playwright');
(async()=>{
 const db=testStore(),server=createServer(db);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port,out=path.resolve('artifacts/main-audit-migration');fs.mkdirSync(out,{recursive:true});let browser;
 try{
  const catalog=await(await fetch(base+'/api/catalog')).json();
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});await page.goto(base+'/');
   await page.waitForFunction(()=>!document.querySelector('[data-months="3"]').disabled);
   for(const plan of catalog.plans){await page.locator(`[data-months="${plan.months}"]`).click();assert.match(await page.locator('#plan-total').innerText(),new RegExp(plan.price.toLocaleString('fa-IR')));}
   assert.match(await page.locator('#catalog-status').innerText(),new RegExp(catalog.rate.toLocaleString('fa-IR')));
   assert.equal(await page.locator('.ln-price--featured a[href="/dashboard/billing/"]').getAttribute('href'),'/dashboard/billing/');
   // Filters narrow the template cards; the preview thumbnails pick what the large frame shows.
   const cards=page.locator('[data-category]'),total=await cards.count();
   for(const filter of ['creative','developer','student']){
    await page.locator(`[data-filter="${filter}"]`).click();const shown=await page.locator('[data-category]:visible').evaluateAll(n=>n.map(e=>e.dataset.category));
    assert(shown.length>0&&shown.length<total&&shown.every(c=>c.split(' ').includes(filter)),filter);
   }
   for(const [theme,name]of [['terminal','ترمینال'],['journal','دفترچه']]){
    await page.locator(`[data-gallery="${theme}"]`).evaluate(b=>b.click());assert.equal(await page.locator(`[data-gallery="${theme}"]`).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#gallery-title').innerText(),name);assert.equal(await page.locator('#gallery-address').innerText(),'niloofar.ResumeIt.ir');
   }
   await page.locator('[data-filter="all"]').click();assert.equal(await page.locator('[data-category]:visible').count(),total);
   await page.locator('#how').scrollIntoViewIfNeeded();
   for(let i=0;i<4;i++){await page.locator(`button[data-step="${i}"]`).press('Enter');assert.equal(await page.locator(`button[data-step="${i}"]`).getAttribute('aria-controls'),'guide-preview');if(width<760){const box=await page.locator('#step-title').boundingBox();assert(box.y>=0&&box.y+box.height<900,"step title in view "+JSON.stringify(box)+" step "+i);}}
   assert(await page.locator('.guide-start').isVisible());assert.equal(await page.locator('#guide-preview').getAttribute('aria-pressed'),null);
   if(width===390)await page.screenshot({path:path.join(out,'guide-main-mobile.png')});
   await page.locator('#next-step').click();assert.equal(await page.locator('button[data-step="0"]').getAttribute('aria-pressed'),'true');
   assert(!(await page.locator('.guide-start').isVisible()));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.equal(await page.locator('.phone a').last().getAttribute('href'),'/demo/?theme=journal#contact');
   assert.equal(await page.locator('.closing-actions .btn').getAttribute('href'),'/register/');
   await page.goto(base+'/about/');await page.locator('[data-public-nav] a[aria-current="page"]').waitFor({state:'attached'});
   if(width<760){const menu=page.locator('.mobile-menu');await menu.click();assert.equal(await menu.getAttribute('aria-label'),'بستن منو');await menu.press('Escape');assert.equal(await menu.getAttribute('aria-label'),'باز کردن منو');assert(await menu.evaluate(node=>node===document.activeElement));assert.equal(await menu.getAttribute('aria-controls'),'public-navigation');}
   for(const route of ['about','terms','privacy','contact']){await page.goto(base+'/'+route+'/');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('[data-site-version]').getAttribute('href'),'/changes/');}
   await page.goto(base+'/terms/#wallet');assert(!(await page.locator('#wallet').innerText()).includes('۲٬۰۰۰'));assert.match(await page.locator('#wallet').innerText(),/نرخ جاری/);
   await page.goto(base+'/demo/?theme=journal#contact');assert.equal(await page.locator('#contact a').count(),0);assert.match(await page.locator('#contact').innerText(),/ارسال نمی‌شود/);
   for(const id of ['glacier','terminal','journal']){await page.goto(base+'/resume'+id+'/');assert.equal(await page.locator('.sample-navigation a').count(),2);assert.equal(await page.locator('.sample-navigation a').last().getAttribute('href'),'/register/');}
  }
  await page.goto(base+'/changes/');await page.locator('.release-title').first().waitFor();await page.locator('.release-title').nth(1).press('Enter');assert.equal(await page.locator('.release-summary').first().innerText(),require('../src/releases.json')[0].summary,'latest release opens first');assert((await page.locator('article').count())===8,'Releases load in batches');await page.locator('[data-more]').click();assert((await page.locator('article').count())===16,'older releases load on request');
  for(const mode of ['network','http','malformed','invalid','stopped']){
   await page.route('**/api/catalog',route=>mode==='network'?route.abort():route.fulfill({status:mode==='http'?503:200,contentType:'application/json',body:mode==='malformed'?'{':JSON.stringify(mode==='stopped'?{...catalog,plans:catalog.plans.map(p=>({...p,paused:true})),templateFrom:null,fontFrom:null}:{...catalog,rate:0})}));
   await page.goto(base+'/');
   if(mode==='stopped'){await page.waitForFunction(()=>document.querySelector('#catalog-status').textContent.includes('نرخ جاری'));assert.equal(await page.locator('#plan-price').textContent(),'فعلاً متوقف');assert.equal(await page.locator('[data-months]:disabled').count(),3);assert.equal(await page.locator('.shop-prices b').first().textContent(),'فعلاً متوقف');}
   else{await page.locator('#catalog-retry').waitFor({state:'visible'});assert.equal(await page.locator('#plan-price').textContent(),'—');assert.equal(await page.locator('[data-months]:disabled').count(),3);await page.locator('#catalog-retry').click();await page.waitForFunction(()=>!document.querySelector('#catalog-retry').disabled);assert.equal(await page.locator('#plan-price').textContent(),'—');}
   if(mode==='network'){await page.setViewportSize({width:390,height:900});await page.locator('.catalog-message').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'catalog-error-main-mobile.png')});}
   await page.unroute('**/api/catalog');if(mode!=='stopped'){await page.locator('#catalog-retry').click();await page.waitForFunction(()=>!document.querySelector('[data-months="3"]').disabled);}
  }
  await page.goto(base+'/');await page.waitForFunction(()=>!document.querySelector('[data-months="3"]').disabled);await page.locator('#pricing').scrollIntoViewIfNeeded();await page.locator('.ln-price--featured').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#plan-total').checkVisibility({contentVisibilityAuto:true}));await page.screenshot({path:path.join(out,'pricing-main-mobile.png')});
  assert.deepEqual(errors,[]);console.log('PASS: main migration at 3 widths; shared menu/session shell, current-page links, catalog failures/retry/paused products, It rate, gallery, guide, fictional contact, generated samples and real release history.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
