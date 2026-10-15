const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs'),{digest}=require('../src/auth/auth.cjs'),model=require('../src/dashboard/model.cjs'),{RI}=require('../src/dashboard/render.cjs');
(async()=>{
 delete process.env.PUBLIC_ORIGIN;const db=testStore(),id=await db.provisionAccount('09120000950',null);await db.setAccountNames(id,'آزمایش','قالب');await db.markPhoneVerified(id);await db.createSession(digest('a'.repeat(64)),id,Date.now()+600000);
 const c=model.initial().content;c.slug='design-test';c.theme.resume='vista';c.profile.name='آزمایش قالب';c.profile.title='طراح و توسعه‌دهنده';c.profile.bio='متن معرفی برای بررسی هماهنگی رزومه و قالب.';c.contacts[0].value='hello@example.com';c.contacts[0].public=true;
 for(const template of ['vista','satiar'])c.resumeTemplates[template]={fields:{},settings:{reviewed:true},collections:{}};
 await db.mutateDashboard(id,0,d=>{d.content=model.content(c,{purchases:[{ref:'rt:vista'}]});d.slug=c.slug;d.published.resume=structuredClone(d.content);d.pub.resume={status:'published',version:1,at:Date.now(),snap:JSON.stringify(c)};});
 db.billing=async()=>({plan:{id:'q',end:Date.now()+600000},purchases:[],payments:[]});
 const store=require('./workspace-test-store.cjs')(db,[id]),server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);
  const page=await context.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))failed.push(r.status()+' '+r.url());});
  fs.mkdirSync('artifacts/imported-templates',{recursive:true});
  for(const template of ['vista','satiar']){
   await db.mutateDashboard(id,(await db.loadDashboard(id)).revision,d=>{d.content.theme.resume=template;d.published.resume=structuredClone(d.content);d.pub.resume.snap=JSON.stringify(d.content);});
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'/u/design-test/');await page.evaluate(()=>document.fonts.ready);
    assert((await page.locator('body').innerText()).includes('آزمایش قالب'));
    await page.screenshot({path:'artifacts/imported-templates/'+template+'-'+width+'.png',fullPage:false});
    const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));console.log(template,width,dimensions);assert(dimensions.scroll<=width+1,'horizontal overflow '+template+' '+width);assert(dimensions.height>1000,'content must scroll');
    if(template==='satiar')assert(dimensions.height>7000,'all seven sections must remain reachable');
    const imgs=await page.locator('img').evaluateAll(images=>images.filter(i=>i.getBoundingClientRect().top<innerHeight&&i.src&&i.complete&&!i.naturalWidth).map(i=>i.src));assert.deepEqual(imgs,[],'broken visible images');
    if(width===390){
     const toggle=page.locator('.mobile-menu-toggle,.mobile-nav-toggle,.menu-button,.menu-toggle').first();
     if(await toggle.count() && await toggle.isVisible()){await toggle.click();await page.locator('.ri-menu-open').waitFor();assert.equal(await toggle.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
    }
   }
   await page.setViewportSize({width:1440,height:1000});
   for(const name of Object.keys(RI.IMPORTED_TEMPLATES[template].pages)){await page.goto(base+'/u/design-test/?page='+name);assert.equal(await page.locator('.ri-imported').getAttribute('data-template-page'),name);}
   await page.goto(base+'/dashboard/resume/');await page.locator('[data-step="template"]').click();await page.locator('#template-page').waitFor();
   const groups=await page.locator('#template-section option').evaluateAll(options=>options.map(x=>({value:x.value,text:x.textContent})));assert(groups.length>1);
   const group=RI.IMPORTED_TEMPLATES[template].collections.find(x=>x.group.startsWith('home:')).group;await page.locator('#template-section').selectOption(group);
   const collection=RI.IMPORTED_TEMPLATES[template].collections.find(x=>x.group===group);
   await page.locator('#template-collection').selectOption(collection.key);
   const field=page.locator('#template-controls input[data-ttype="text"],#template-controls textarea[data-ttype="textarea"]').first();
   const fieldKey=await field.getAttribute('data-tfield');await field.fill('متن شخصی‌سازی‌شده');
   assert.equal(await page.locator('[data-tfield="reviewed"]').isChecked(),false);
   assert((await page.locator('#template-controls > .field').count())<=8,'bounded fields');
   await page.locator('[data-tadd]').click();assert.equal(await page.locator('#template-row option').count(),2);
   await page.locator('[data-tmove="-1"]').click();assert.equal(await page.locator('#template-row').inputValue(),'0');
   await page.locator('[data-tremove]').click();assert.equal(await page.locator('#template-row option').count(),1);
   await page.locator('[data-tcategory="media"]').click();assert.equal(await page.locator('#template-controls [data-ttype="text"]').count(),0);
   await page.locator('[data-tcategory="all"]').click();
   await page.locator('[data-tfield="reviewed"]').check();await page.locator('#saveBtn').click();await page.locator('#saveState[data-state="saved"]').waitFor();
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'artifacts/imported-templates/editor-'+template+'.png',fullPage:false});
   for(const width of [320,390]){await page.setViewportSize({width,height:850});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'editor overflow');await page.screenshot({path:'artifacts/imported-templates/editor-'+template+'-'+width+'.png'});}
   await page.setViewportSize({width:1440,height:1000});
   const frame=page.frameLocator('.device__vp iframe');assert((await frame.locator('body').innerText()).includes('متن شخصی‌سازی‌شده'));
   await page.reload();await page.locator('[data-step="template"]').click();await page.locator('#template-section').selectOption(group);await page.locator('#template-collection').selectOption(collection.key);assert.equal(await page.locator('#template-controls [data-tfield="'+fieldKey+'"]').first().inputValue(),'متن شخصی‌سازی‌شده');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS: all pages load, responsive designs, local assets, isolated live preview, per-section editing, repeated-item add/remove, review reset and saved reload.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
