const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{testStore}=require('./auth-test-store.cjs'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const db=testStore(),id=await db.provisionAccount('09120000614',null);
 require('./workspace-test-store.cjs')(db,[id],{workspaces:true});
 await db.createSession(require('../src/auth/auth.cjs').digest('d'.repeat(64)),id,Date.now()+600000);
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 const out=path.join(__dirname,'../artifacts/council-audit-2026-10-20');fs.mkdirSync(out,{recursive:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'d'.repeat(64),url:base}]);const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/dashboard/');await page.locator('#page-title').waitFor();
 assert.equal(await page.locator('.stage').getAttribute('inert'),'');
 await page.evaluate(()=>{RI.C().links.items.push({id:'test-link',type:'link',active:true,title:'لینک آزمایش',url:'https://example.test',icon:'link'});RI.rerender();});
 const hiddenLink=page.locator('.stage a').first();assert(await hiddenLink.count());await hiddenLink.evaluate(e=>e.focus());assert.equal(await hiddenLink.evaluate(e=>e===document.activeElement),false);
 assert.equal(await page.getByText('آمادهٔ انتشار',{exact:true}).count(),0);
 await page.screenshot({path:path.join(out,'14-home-after-desktop.png')});
 await page.setViewportSize({width:390,height:844});
 for(const selector of ['#menuBtn','[data-all-pages]']){
  await page.locator(selector).click();await page.locator('#drawerClose').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await page.locator(selector).evaluate(e=>e===document.activeElement),true);
 }
 await page.screenshot({path:path.join(out,'14-home-after-mobile.png')});
 await page.goto(base+'/dashboard/?workspace=3');await page.locator('#page-title').waitFor();assert.equal(await page.evaluate(()=>RI.workspaceSlot),3);
 assert.equal(await page.locator('#view [data-go=resume]').count(),0);assert.equal(await page.locator('#view [data-preview=resume]').count(),0);assert.equal(await page.locator('#bottomNav [data-route=resume]').count(),0);
 assert.match(await page.locator('#view').innerText(),/فقط لینک/);assert.equal(await page.locator('.pstat').count(),1);
 await page.screenshot({path:path.join(out,'14-home-links-after-mobile.png')});
 assert.deepEqual(await page.locator('.guide__n').allTextContents(),['۱','۲']);assert((await page.locator('.steps__w').allTextContents()).every(text=>!text.includes('٪')));
 await page.evaluate(()=>{const c=RI.C();RI.state.account.firstName='آزمایش';RI.state.account.lastName='محلی';RI.state.account.mobileVerified=true;c.slug='audit-links';c.links.items=[{id:'one',type:'link',active:true,title:'لینک',url:'https://example.test',icon:'link'}];c.profile.name='';c.links.header.sync=false;c.links.header.name='';RI.rerender();});
 assert.equal(await page.locator('.hero__cta [data-go]').getAttribute('data-tab'),'header');await page.locator('.hero__cta [data-go]').click();await page.waitForURL('**/dashboard/links/?tab=header');assert.equal(await page.locator('[data-tab=header][aria-selected=true]').count(),1);
 assert.deepEqual(errors,[]);console.log('PASS audit14: inert populated stage, both drawer openers restored, honest progress, actual links-only workspace UI.');
 }finally{await browser.close();await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
