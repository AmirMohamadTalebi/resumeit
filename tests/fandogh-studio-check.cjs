// Fandogh's full page: the empty state with suggestions, asking from the composer with Enter, the answer with its
// model badge, «/» commands and «@» sections, the model picker with per-message costs, conversations that survive a
// reload, Ctrl+K for a new one, the inspector's section switches, and the phone layout with drawers.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const {db,owner,target}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true}),{sql}=store;
 sql.exec('CREATE TABLE IF NOT EXISTS account_access(user_id TEXT,ref TEXT,price_units INTEGER,expires_at INTEGER,created_at INTEGER,PRIMARY KEY(user_id,ref));');
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const {chromium}=require('playwright'),browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true}),out=path.resolve('artifacts/fandogh-studio');fs.mkdirSync(out,{recursive:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'ri_session',value:'b'.repeat(64),url:base}]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/dashboard/fandogh/');await page.locator('[data-fs]').waitFor();await page.waitForFunction(()=>window.RI?.Fandogh?.status);
  assert.equal(await page.locator('.fs-empty').count(),1);assert.equal(await page.locator('.fs-suggest button').count(),6);
  assert.match(await page.locator('[data-fs-model]').innerText(),/فندق محلی[\s\S]*رایگان/);
  await page.screenshot({path:path.join(out,'empty.png')});
  // «/» opens the commands, «@» the resume sections.
  const input=page.locator('[data-fs-input]');
  await input.fill('/');assert(await page.locator('[data-fs-palette]').isVisible());assert(await page.locator('[data-fs-pal]').count()>=9);
  await input.fill('/غل');assert.equal(await page.locator('[data-fs-pal]').count(),1);await input.fill('');
  await input.fill('درباره @مهار');assert.match(await page.locator('[data-fs-pal]').first().innerText(),/@مهارت‌ها/);await input.press('Enter');
  assert.equal(await input.inputValue(),'درباره @مهارت‌ها ');await input.fill('');
  // The model picker lists every model with its cost; Luna is one message, Opus ten.
  await page.locator('[data-fs-model]').click();const picker=page.locator('[data-fs-models]');await picker.waitFor();
  assert.match(await picker.locator('[data-fs-pick=luna] em').innerText(),/در دسترس نیست|^۱ پیام$/);assert(await picker.locator('[data-fs-pick=claude-opus]').count());assert.equal(await picker.locator('.fs-modelgroup').count(),6,'grouped by maker');assert(await picker.locator('[data-fs-pick=claude-fable].is-locked').count());assert.match(await picker.locator('[data-fs-pick=claude-fable] em').innerText(),/کوروش/);
  await page.screenshot({path:path.join(out,'models.png')});await page.locator('.fs-title').click();assert(await picker.isHidden());
  // Ask with Enter: the question and a local answer with its badge; the allowance is untouched.
  await input.fill('امتیاز رزومه‌ام چند است؟');await input.press('Enter');
  await page.locator('.fs-msg--bot').first().waitFor();assert.equal(await page.locator('.fs-msg--me').count(),1);
  assert.match(await page.locator('.fs-msg--bot .fs-badge').first().innerText(),/فندق محلی/);
  assert.match(await page.locator('[data-fs-quota]').innerText(),/۵٬?۰۰۰ تومان[\s\S]*توکن/,'the pill shows the Fandogh wallet');
  assert.equal(await page.locator('.fs-chat').count(),1);assert.match(await page.locator('.fs-chat.is-on').innerText(),/امتیاز رزومه/);
  // Suggested next questions sit above the input box, not under the answer.
  assert.equal(await page.locator('.fs-msg--bot .fs-follow').count(),0);assert(await page.locator('.fs-composer [data-fs-chips] [data-fs-suggest]').count()>=1,'suggestions above the input');
  await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'answer.png')});
  // Inspector: switching a section off is reflected; conversations survive a reload; Ctrl+K starts a new one.
  await page.locator('[data-fs-only=projects]').uncheck();assert.equal(await page.evaluate(()=>RI.Fandogh.content(new Set(['skills'])).projects.length),0);
  await page.waitForTimeout(300);await page.reload();await page.locator('.fs-msg--bot').first().waitFor();assert.equal(await page.locator('.fs-chat').count(),1);
  await page.keyboard.press('Control+k');await page.locator('.fs-empty').waitFor();
  await input.fill('غلط‌های رزومه‌ام را بگیر');await page.locator('[data-fs-send]').click();await page.locator('.fs-msg--bot').first().waitFor();
  assert.equal(await page.locator('.fs-chat').count(),2);
  await page.locator('.fs-chat__open').nth(1).click();assert.match(await page.locator('.fs-msg--me').first().innerText(),/امتیاز/);
  // Wide screens: both side panes fold away and the conversation takes the width; the choice survives a reload,
  // Ctrl+B and Ctrl+Shift+B bring them back.
  const width=()=>page.locator('.fs-main').evaluate(e=>e.getBoundingClientRect().width),before=await width();
  await page.locator('[data-fs-hide=rail]').click();assert(await page.locator('[data-fs-rail]').isHidden());
  await page.locator('[data-fs-hide=inspector]').click();assert(await page.locator('[data-fs-inspector]').isHidden());
  assert(await width()>before+400,'the conversation takes the freed width');assert.equal(await page.locator('.fs-bar [data-fs-open=rail]').getAttribute('aria-pressed'),'false');
  await page.waitForTimeout(600);await page.screenshot({path:path.join(out,'folded.png')});
  await page.reload();await page.locator('[data-fs]').waitFor();assert(await page.locator('[data-fs-rail]').isHidden(),'folds are remembered');
  await page.keyboard.press('Control+b');assert(await page.locator('[data-fs-rail]').isVisible());
  await page.keyboard.press('Control+Shift+B');assert(await page.locator('[data-fs-inspector]').isVisible());
  await page.locator('.fs-bar [data-fs-open=rail]').click();assert(await page.locator('[data-fs-rail]').isHidden());await page.locator('.fs-bar [data-fs-open=rail]').click();assert(await page.locator('[data-fs-rail]').isVisible());
  // Fandogh's menu entry shows her full body.
  assert(await page.locator('.dn-item--fandogh[aria-current=page] .dn-fandogh__body').isVisible());
  await page.locator('.dn-item--fandogh').screenshot({path:path.join(out,'menu-item.png')});
  // Phone: one column, the rail opens as a drawer, no sideways scroll.
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll on phones');
  await page.locator('.fs-bar [data-fs-open=rail]').click();await page.waitForTimeout(600);assert(await page.locator('.fs').evaluate(el=>el.classList.contains('is-rail')));
  await page.screenshot({path:path.join(out,'phone-rail.png')});await page.locator('[data-fs-scrim]').click({position:{x:20,y:400}});
  assert(!(await page.locator('.fs').evaluate(el=>el.classList.contains('is-rail'))));
  await page.screenshot({path:path.join(out,'phone.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS Fandogh studio: empty state, «/» and «@» palette, model costs, Enter to ask with a free local answer, inspector sections, conversations kept across reloads, Ctrl+K, phone drawers.');
 }finally{await browser.close();await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
