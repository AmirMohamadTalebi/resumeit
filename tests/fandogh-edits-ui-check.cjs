// Fandogh's edit card in the dashboard: in «ask» mode the before/after card waits for a yes, applies the picked edits
// and undoes them exactly; in «auto» mode the edits land at once with undo; the mode is remembered.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const {db,owner,target}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true});
 store.sql.exec('CREATE TABLE IF NOT EXISTS account_access(user_id TEXT,ref TEXT,price_units INTEGER,expires_at INTEGER,created_at INTEGER,PRIMARY KEY(user_id,ref));');
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,out=path.resolve('artifacts/fandogh-edits');fs.mkdirSync(out,{recursive:true});
 const {chromium}=require('playwright'),browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),owner);
  const page=await context.newPage(),errors=[],sent=[];page.on('pageerror',e=>errors.push(e.message));
  // The model is replaced at the dashboard's request: one title edit and one new skill, as the server would send them.
  await page.route('**/api/dashboard/assistant/ask',async route=>{const body=JSON.parse(route.request().postData());sent.push(body);const old=body.content.profile.title;
   await route.fulfill({contentType:'application/json',body:JSON.stringify({reply:{text:'این دو تغییر را پیشنهاد می‌کنم.',actions:[],follow:[],source:'ai',edits:[{op:'set',field:'title',value:'طراح محصول',label:'عنوان',before:old,after:'طراح محصول'},{op:'add_skill',value:'Figma Pro',level:4,label:'مهارت تازه',before:'',after:'Figma Pro'}]},usage:{plan:'free',remaining:5,limit:10,plans:[]}})});});
  await page.goto(base+'/dashboard/resume/');await page.waitForFunction(()=>window.RI?.petOpen&&document.querySelector('.pet'));
  const title=()=>page.evaluate(()=>RI.C().profile.title),skills=()=>page.evaluate(()=>RI.C().skills.map(s=>s.name)),before=await title();
  await page.evaluate(()=>RI.petOpen('chat'));await page.locator('[data-pet-mode=ask]').waitFor();
  assert.equal(await page.locator('[data-pet-mode=ask]').getAttribute('aria-pressed'),'true','asking first is the default');
  await page.locator('#pet-input').fill('عنوانم را بهتر کن');await page.locator('.pet__send').click();
  const card=page.locator('.pet-edits').last();await card.waitFor();assert.equal(await card.getAttribute('data-state'),'pending');
  assert.equal(sent[0].mode,'ask');assert.equal(sent[0].page,'resume');assert(Array.isArray(sent[0].content.sections));
  assert.equal(await title(),before,'nothing changes before a yes');
  await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,'pending.png')});
  await card.locator('[data-edit-pick="1"]').uncheck();await card.locator('[data-edits-act=apply]').click();
  assert.equal(await card.getAttribute('data-state'),'applied');assert.equal(await title(),'طراح محصول');assert(!(await skills()).includes('Figma Pro'),'unticked edits are skipped');
  await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,'applied.png')});
  await card.locator('[data-edits-act=undo]').click();assert.equal(await card.getAttribute('data-state'),'undone');assert.equal(await title(),before,'undo restores the resume');
  // Auto mode: remembered, applied at once, still undoable.
  await page.locator('[data-pet-mode=auto]').click();assert.equal(await page.evaluate(id=>localStorage.getItem('ri-pet-edits-'+id),owner),'auto');
  await page.locator('#pet-input').fill('خودت درستش کن');await page.locator('.pet__send').click();
  const auto=page.locator('.pet-edits').nth(1);await auto.waitFor();assert.equal(sent[1].mode,'auto');assert.equal(await auto.getAttribute('data-state'),'applied');
  assert.equal(await title(),'طراح محصول');assert((await skills()).includes('Figma Pro'));
  await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,'auto.png')});
  await auto.locator('[data-edits-act=undo]').click();assert.equal(await title(),before);assert(!(await skills()).includes('Figma Pro'));
  assert.deepEqual(errors,[]);
  console.log('PASS Fandogh edit card: asks first by default, applies picked edits, undoes exactly, auto mode remembered and undoable.');
 }finally{await browser.close();await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
