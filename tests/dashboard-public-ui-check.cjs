const assert=require('node:assert/strict'),fs=require('node:fs');
const {createServer}=require('../src/http/server.cjs'),{testStore}=require('./auth-test-store.cjs'),{digest}=require('../src/auth/auth.cjs'),model=require('../src/dashboard/model.cjs'),{chromium}=require('playwright');
(async()=>{delete process.env.PUBLIC_ORIGIN;const db=testStore(),id=await db.provisionAccount('09120000805',null);await db.setAccountNames(id,'امیر','طالبی');await db.markPhoneVerified(id);await db.createSession(digest('a'.repeat(64)),id,Date.now()+600000);const c=model.initial().content;c.slug='amir';c.profile.name='امیر طالبی';c.profile.title='توسعه‌دهنده';c.profile.bio='رزومه و لینک‌های من';c.contacts[0].value='hello@example.com';c.contacts[0].public=true;c.skills=[{id:'skill1',name:'JavaScript',level:4}];c.links.items=[{id:'github',type:'link',title:'گیت‌هاب',url:'https://github.com/VY1-pick',icon:'github',active:true,featured:false}];await db.mutateDashboard(id,0,d=>{d.content=model.content(c);d.slug=c.slug;});
const store=require('./workspace-test-store.cjs')(db,[id]),server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
try{browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const context=await browser.newContext({reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['', 'resume/', 'links/', 'themes/', 'publish/', 'stats/', 'settings/', 'billing/']) {
   let release;const gate=new Promise(r=>release=r);
   await page.route('**/api/dashboard/document*',async r=>{await gate;await r.continue();});
   await page.goto(base+'/dashboard/'+route,{waitUntil:'domcontentloaded'});
   // Staged loading: the shell is usable at once and the page shows its own non-blocking section loader.
   await page.locator('#sidebar .brand').waitFor({state:'visible'});await page.locator('#view .section-loading').first().waitFor();assert.equal(await page.locator('body').getAttribute('aria-busy'),null);assert.equal(await page.locator('.ri-page-loading:visible').count(),0,'no full-page loading bar over the shell');
   release();await page.locator('#page-title').waitFor();await page.locator('.ri-page-loading').waitFor({state:'detached'});assert.equal(await page.locator('body').getAttribute('aria-busy'),null);
   await page.unroute('**/api/dashboard/document*');
 }
 await page.route('**/api/dashboard/document*',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'آزمون خطای اتصال'})}));
 await page.goto(base+'/dashboard/');await page.getByRole('button',{name:'تلاش دوباره',exact:true}).waitFor();assert.equal(await page.locator('.ri-page-loading').count(),0);await page.unroute('**/api/dashboard/document*');
 await page.goto(base+'/dashboard/publish/');for(const kind of ['links','resume']){await page.locator('#topPublish').click();await page.locator('[data-publish-kind='+kind+']').click();await page.waitForFunction(kind=>document.querySelector('[data-publish-kind='+kind+']')?.textContent==='منتشر شد',kind);await page.getByRole('dialog').getByRole('button',{name:'بستن',exact:true}).last().click();}
 fs.mkdirSync('artifacts/public-dashboard',{recursive:true});
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});for(const route of ['','links']){await page.goto(base+'/u/amir/'+route);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('h1').innerText(),'امیر طالبی');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('.pv-nav a').last().getAttribute('href'),'/u/amir/link');if(route==='links')assert.equal(await page.locator('.lv-btn').getAttribute('href'),'/u/amir/out/github');else assert.equal(await page.locator('.pv-contacts a').getAttribute('href'),'mailto:hello@example.com');await page.screenshot({path:'artifacts/public-dashboard/'+(route||'resume')+'-'+width+'.png',fullPage:true});}}
 const clean=await browser.newPage();await clean.goto(base+'/u/amir/links');assert.equal(await clean.locator('h1').innerText(),'امیر طالبی');await clean.close();
 await page.goto(base+'/dashboard/stats/');await page.locator('#sbody').waitFor();assert(!(await page.locator('#view').innerText()).includes('ساختگی'));await page.locator('[data-r="90"]').click();assert(!(await page.locator('.chart').getAttribute('innerHTML')||'').includes('NaN'));
 const spec={sections:['skills'],bodySections:['skills'],requiredSections:[],fields:[{key:'headline',label:'عنوان اختصاصی',type:'text',max:80,required:true,public:true}],settings:[{key:'compact',label:'فشرده',type:'checkbox',default:false}]};
 const catalog=require('../src/dashboard/render.cjs').RI.RESUME_TEMPLATES;catalog.find(t=>t.id==='glacier').editor=spec;
 await page.goto(base+'/dashboard/resume/');await page.locator('#rs-cards').waitFor();
 await page.evaluate(spec=>{const RI=window.RI;RI.RESUME_TEMPLATES.find(t=>t.id==='glacier').editor=spec;RI.go('resume');},spec);
 await page.locator('#rs-sec-skills').waitFor();assert.equal(await page.locator('#rs-sec-education').count(),0,'sections the template does not use are not offered');
 await page.locator('#rs-nav [data-goto="template"]').click();await page.locator('[data-template-key="headline"]').fill('اطلاعات ویژه');await page.locator('[data-template-key="compact"]').check();
 assert.equal(await page.evaluate(()=>window.RI.C().resumeTemplates.glacier.settings.compact),true);
 assert.equal(await page.evaluate(()=>window.RI.save()),true);
 await page.evaluate(()=>{const RI=window.RI;RI.C().theme.resume='campus';RI.go('resume');});
 await page.locator('#rs-cards').waitFor();assert.equal(await page.locator('#rs-sec-template').count(),0);
 await page.evaluate(()=>{const RI=window.RI;RI.C().theme.resume='glacier';RI.go('resume');});await page.locator('#rs-nav [data-goto="template"]').click();assert.equal(await page.locator('[data-template-key="headline"]').inputValue(),'اطلاعات ویژه');
 delete catalog.find(t=>t.id==='glacier').editor;
 await page.goto(base+'/login/');await page.locator('.social').waitFor();assert.equal(await page.locator('.social button').count(),2);assert.equal(await page.locator('.social button:disabled').count(),2);
 assert.deepEqual(errors,[]);console.log('PASS: actual dashboard publish controls, public resume/links without login, working navigation/contact/link URLs, desktop/mobile screenshots, server stats and visible unconfigured OAuth providers.');
}finally{await browser?.close();await new Promise(r=>server.close(r));store.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
