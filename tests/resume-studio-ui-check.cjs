const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),content=require('../src/dashboard/model.cjs').initial().content;content.theme.resume='glacier';await f.db.setAccountNames(f.owner,'','');await f.db.mutateDashboard(f.owner,0,d=>{d.content=content;});
 const server=createServer(f.db,f.options);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,out=path.resolve('artifacts/resume-studio');fs.mkdirSync(out,{recursive:true});let browser;
 try{
  browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),f.owner);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let publications=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/dashboard/publish'))publications++;});
  await page.goto(base+'/dashboard/resume/');await page.locator('#p_name').waitFor();
  // One page: every section is a card, reachable from the section bar.
  assert(await page.locator('.rs-card').count()>=8);assert(await page.locator('.rs-nav [data-goto]').count()>=8);assert.equal(await page.locator('[data-publish]').isDisabled(),true);

  // Inputs are valid by default: clearing or odd values never raise blocking errors.
  await page.locator('#p_name').fill('');await page.locator('#p_title').fill('');await page.locator('#p_bio').click();
  assert.equal(await page.locator('#rs-sec-profile').evaluate(card=>[...card.querySelectorAll('.field__error,[role=alert]')].filter(e=>!e.hidden&&e.textContent.trim()).length),0,'no visible field errors');
  await page.locator('#p_name').fill('رها کیانی');await page.locator('#p_title').fill('طراح محصول');
  assert.deepEqual(await page.evaluate(()=>[RI.C().profile.name,RI.C().profile.title]),['رها کیانی','طراح محصول']);

  // Projects are created inline: a draft turns into a real item on the first keystroke.
  await page.locator('[data-goto="projects"]').click();const before=await page.evaluate(()=>RI.C().projects.length);
  await page.locator('[data-add-item="projects"]').click();assert.equal(await page.evaluate(()=>RI.C().projects.length),before,'an untouched draft is not saved');
  await page.keyboard.type('طراحی یک کتابخانه');const pid=await page.evaluate(()=>RI.C().projects.at(-1).id);
  await page.locator('#i-'+pid+'-desc').fill('طراحی مسیر جست‌وجو و امانت کتاب برای دانشجویان.');await page.locator('#i-'+pid+'-url').fill('not a link');await page.locator('#i-'+pid+'-url').blur();
  assert.deepEqual(await page.evaluate(id=>{const x=RI.C().projects.find(p=>p.id===id);return [x.title,x.url];},pid),['طراحی یک کتابخانه','not a link']);
  await page.locator('[data-item="'+pid+'"] [data-del-item]').click();assert.equal(await page.evaluate(()=>RI.C().projects.length),before);await page.locator('#rs-sec-projects [data-undo]').click();assert.equal(await page.evaluate(()=>RI.C().projects.length),before+1,'deleted item comes back with undo');
  await page.screenshot({path:path.join(out,'studio-desktop.png'),fullPage:true});

  // A public email that is not a real address is stored and never blocks publishing.
  const email=page.locator('.rs-contact [data-c]').first();await email.fill('bad-email');await email.blur();await page.locator('[data-cpub]').first().check();
  assert.equal(await page.evaluate(()=>RI.C().contacts[0].value),'bad-email');assert.equal(await page.evaluate(()=>RI.save()),true);
  assert.doesNotMatch(await page.locator('.rs-ready').textContent(),/معتبر نیست/);

  // Account names: a failed save keeps what was typed.
  await page.locator('.rs-ready').evaluate(d=>{d.open=true;});await page.locator('[data-names]').first().click();await page.locator('#rs-firstName').fill('رها');await page.locator('#rs-lastName').fill('کیانی');
  await page.route('**/api/auth/account/names',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'خطای آزمایشی؛ دوباره تلاش کن'})}));
  await page.locator('.modal').getByRole('button',{name:'ذخیرهٔ نام حساب'}).click();await page.locator('[data-name-error]').filter({hasText:/./}).waitFor({timeout:18000});
  assert.match(await page.locator('[data-name-error]').textContent(),/خطای آزمایشی/);assert.equal(await page.locator('#rs-firstName').inputValue(),'رها','failed save keeps entered names');
  await page.unroute('**/api/auth/account/names');await page.locator('.modal').getByRole('button',{name:'ذخیرهٔ نام حساب'}).click();await page.waitForFunction(()=>RI.state.account.firstName==='رها');
  await page.locator('.rs-ready').evaluate(d=>{d.open=true;});await page.locator('[data-ready-slug]').first().click();await page.locator('#ready-slug').fill('raha-studio');await page.locator('.modal').getByRole('button',{name:'بررسی و انتخاب'}).click();await page.waitForFunction(()=>RI.C().slug==='raha-studio');

  // Publishing only happens on an explicit click.
  await page.waitForFunction(()=>!document.querySelector('[data-publish]').disabled);assert.equal(publications,0,'never publishes automatically');
  await page.locator('[data-publish]').click();await page.waitForFunction(()=>RI.state.pub.resume.status==='published');assert.equal(publications,1);

  // Section layout: hide and reorder without losing content.
  await page.locator('[data-goto="settings"]').click();const firstKey=await page.locator('#rs-layout .rs-layout__row').first().getAttribute('data-id');
  await page.locator('#rs-layout [data-id="'+firstKey+'"] [data-lmove="1"]').click();assert.notEqual(await page.locator('#rs-layout .rs-layout__row').first().getAttribute('data-id'),firstKey);
  await page.locator('#rs-layout [data-svis="languages"]').uncheck();assert.equal(await page.evaluate(()=>RI.C().sections.find(s=>s.key==='languages').visible),false);assert(await page.evaluate(()=>RI.C().languages.length>=0));

  for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.goto(base+'/dashboard/resume/');await page.locator('#p_name').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'fits '+width);await page.locator('[data-goto="skills"]').click();await page.locator('#rs-add-skills').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,'studio-'+width+'.png')});}

  // Imported templates get their own content card with section groups.
  f.db.billing=async()=>({plan:{id:'y',end:Date.now()+86400000},purchases:[],payments:[]});await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(async()=>{RI.C().theme.resume='vista';RI.touch('theme');if(!await RI.save())throw Error('Fixture template save failed');});
  await page.goto(base+'/dashboard/resume/?step=template');await page.locator('#rs-sec-template [data-template-host] [data-tfield]').first().waitFor({timeout:20000});
  assert((await page.locator('#rs-sec-template [data-tgroup-pick]').count())>2);
  await page.locator('#rs-sec-template [data-tgroup-pick]').first().click();await page.locator('#rs-sec-template [data-tfield]').first().waitFor();
  assert.deepEqual(errors,[]);console.log('PASS resume studio: lenient inputs, inline drafts/undo, private-safe contacts, names retry, slug, explicit publish, section layout, Vista template card and 390/320 fit.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));f.store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
