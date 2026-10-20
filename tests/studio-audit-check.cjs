const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{testStore}=require('./auth-test-store.cjs'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const db=testStore(),id=await db.provisionAccount('09120000618',null);require('./workspace-test-store.cjs')(db,[id],{workspaces:true});await db.createSession(require('../src/auth/auth.cjs').digest('e'.repeat(64)),id,Date.now()+600000);
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});const out=path.join(__dirname,'../artifacts/council-audit-2026-10-20');fs.mkdirSync(out,{recursive:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'e'.repeat(64),url:base}]);const page=await context.newPage();
 await page.goto(base+'/dashboard/studio/?workspace=3');await page.locator('#page-title').waitFor();
 await page.evaluate(()=>{const c=RI.C();RI.state.account.firstName='آزمایش';RI.state.account.lastName='محلی';RI.state.account.mobileVerified=true;c.slug='studio-audit';c.profile.name='نام آزمایش';c.links.items=[{id:'one',type:'link',active:true,title:'پیوند آزمایش',url:'https://example.test',icon:'link'}];RI.rerender();});
 assert.equal(await page.evaluate(()=>RI.readiness().linksOk),true);assert.equal(await page.evaluate(()=>RI.canWorkspace(RI.workspaceSlot)),false);
 if(process.env.AUDIT_BEFORE){await page.screenshot({path:path.join(out,'15-studio-locked-complete-before.png')});console.log('BASELINE: content complete while workspace locked; UI ready claim captured.');return;}
 assert.match(await page.locator('.studio-overview').innerText(),/دسترسی انتشار/);assert.equal(await page.locator('#view .completion-strip').count(),0);assert.equal(await page.getByRole('link',{name:'مرور آمادگی',exact:true}).count(),0);
 await page.screenshot({path:path.join(out,'15-studio-locked-after-mobile.png')});
 await page.evaluate(()=>{RI.state.billing.plan={id:'y',end:Date.now()+86400000};RI.rerender();});assert.equal(await page.evaluate(()=>RI.canWorkspace(3)),true);assert.match(await page.locator('.studio-overview').innerText(),/آماده/);
 await page.screenshot({path:path.join(out,'15-studio-ready-after-mobile.png')});
 await page.goto(base+'/dashboard/studio/?workspace=1');await page.locator('#page-title').waitFor();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:width===1440?960:844});
  const borders=await page.locator('.studio-overview dl>div').evaluateAll(rows=>rows.map(e=>getComputedStyle(e).borderInlineStartWidth));assert.deepEqual(borders,['0px','1px','1px']);
  if(width<961){const sizes=await page.locator('.topbar__bell,#topPreview,#undoBtn,#topPublish').evaluateAll(rows=>rows.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));assert(sizes.every(s=>s.w===36&&s.h===36),JSON.stringify(sizes));}
 }
 await page.setViewportSize({width:390,height:844});
 const links=page.locator('.studio-ready a');const names=await links.evaluateAll(rows=>rows.map(e=>e.getAttribute('aria-label')||e.textContent));assert.equal(new Set(names).size,names.length);assert(names.every(n=>n.includes('تکمیل')&&(n.includes('رزومه')||n.includes('لینک'))));
 assert.equal(await page.locator('#view .completion-strip').count(),0);
 await page.screenshot({path:path.join(out,'15-studio-after-mobile.png')});await page.setViewportSize({width:1440,height:960});await page.screenshot({path:path.join(out,'15-studio-after-desktop.png')});
 assert.equal(await page.locator('#view').getByText('نام صفحهٔ معتبر و آزاد',{exact:true}).count(),0);
 await page.goto(base+'/');await page.evaluate(()=>document.fonts.ready);
 for(const width of [1920,390]){await page.setViewportSize({width,height:width===1920?1080:844});await page.evaluate(()=>window.scrollTo({top:document.querySelector('.intro').offsetTop-100,behavior:'instant'}));assert.equal(await page.locator('.intro h2').evaluate(e=>getComputedStyle(e).letterSpacing),'normal');await page.screenshot({path:path.join(out,'public-heading-spacing-after-'+width+'.png')});}
 console.log('PASS audit15: incomplete/ready/locked states, unique task-and-kind link names, no duplicate list or self-link.');
 }finally{await browser.close();await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
