// A person's own Fandogh settings: name, tone, length and their own model key. The key is sealed and masked, a
// connection test never echoes it, questions through their own key are free (no allowance used) and carry the
// persona, local Fandogh stays the free default, and the «تنظیمات فندق» page saves, renames and picks the model.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const {db,owner,target}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true}),{execute,sql}=store;
 sql.exec('CREATE TABLE IF NOT EXISTS wallets(user_id TEXT PRIMARY KEY,balance_units INTEGER NOT NULL DEFAULT 0);');
 sql.exec('CREATE TABLE IF NOT EXISTS account_access(user_id TEXT,ref TEXT,price_units INTEGER,expires_at INTEGER,created_at INTEGER,PRIMARY KEY(user_id,ref));');
 const real=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,init)=>{
  if(!String(url).startsWith('https://api.openai.com/'))return real(url,init);
  const body=JSON.parse(init.body);calls.push(body);
  if(init.headers.Authorization!=='Bearer sk-mine-abcd1234')return {ok:false,status:401,json:async()=>({error:{message:'Incorrect API key provided: sk-wrong-key-999'}})};
  return {ok:true,status:200,json:async()=>({choices:[{message:{content:'سلام! معرفی‌ات را کوتاه‌تر کن.'}}],usage:{prompt_tokens:80,completion_tokens:20}})};
 };
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const send=async(route,body,token='b')=>{const r=await real(base+route,{method:body?'POST':'GET',headers:{Cookie:'ri_session='+token.repeat(64),Origin:base,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
 const content={profile:{name:'روژان',title:'طراح',bio:'',avatar:''},skills:[],experience:[],education:[],projects:[],contacts:[],socials:[]};
 try{
  let view=(await send('/api/dashboard/assistant/me')).body;
  assert.equal(view.settings.name,'فندق');assert.equal(view.settings.engine,'local');assert.equal(view.key.set,false);assert.equal(view.models[0].id,'local');assert(!view.models.some(m=>m.id==='own'));assert(view.providers.some(p=>p.id==='openai'));
  const settings=s=>({...view.settings,...s,own:{...view.settings.own,...(s.own||{})}});
  assert.equal((await send('/api/dashboard/assistant/me',{settings:settings({own:{enabled:true}})})).status,400,'own model needs a key');
  assert.equal((await send('/api/dashboard/assistant/me',{settings:settings({name:'یک اسم خیلی خیلی طولانی برای گربه'})})).status,400);
  // A browser autofilling the hidden service address (a username, say) must not block saving for a non-custom service.
  assert.equal((await send('/api/dashboard/assistant/me',{settings:settings({own:{provider:'openai',url:'amir@example'}})})).status,200);assert.equal((await send('/api/dashboard/assistant/me',{settings:settings({own:{provider:'custom',url:'amir@example'}})})).status,400);
  view=(await send('/api/dashboard/assistant/me',{settings:settings({name:'پشمک',tone:'formal',length:'detailed',engine:'own',own:{enabled:true,provider:'openai',model:'gpt-4o-mini'}}),key:'sk-mine-abcd1234'})).body;
  assert.equal(view.key.hint,'…1234');assert(!JSON.stringify(view).includes('sk-mine'),'the key never comes back');assert.equal(view.models[1].id,'own');assert.equal(view.models[1].cost,0);
  const [row]=await execute('SELECT secret FROM assistant_user_settings WHERE user_id=?',[target]);assert(row.secret.startsWith('v1.')&&!row.secret.includes('sk-mine'),'sealed at rest');
  let test=(await send('/api/dashboard/assistant/me/test',{own:{provider:'openai'}})).body;assert.equal(test.ok,true);
  test=(await send('/api/dashboard/assistant/me/test',{own:{provider:'openai'},key:'sk-wrong-key-999'})).body;assert.equal(test.ok,false);assert(!test.error.includes('sk-wrong-key-999'));
  // Questions through the person's own key: free, and the persona goes with them.
  await send('/api/dashboard/assistant');const before=(await db.fandoghWallet(target)).balance;calls.length=0;
  const r=(await send('/api/dashboard/assistant/ask',{question:'معرفی‌ام را چطور بنویسم؟',content,history:[]})).body;
  assert.equal(r.reply.source,'ai');assert.equal((await db.fandoghWallet(target)).balance,before,'the wallet is untouched');assert.equal(r.usage.own,true);assert.equal(r.usage.name,'پشمک');
  assert(calls[0].messages[0].content.includes('«پشمک»')&&calls[0].messages[0].content.includes('رسمی'),'persona reaches the model');
  // Forgetting the key returns to the shared allowance.
  // Forgetting the key goes back to local Fandogh, which is free too.
  view=(await send('/api/dashboard/assistant/me',{settings:settings({name:'پشمک',engine:'local',own:{enabled:false}}),key:null})).body;assert.equal(view.key.set,false);
  const back=(await send('/api/dashboard/assistant/ask',{question:'معرفی‌ام را چطور بنویسم؟',content,history:[]})).body;assert.equal(back.reply.source,'local');assert.equal((await db.fandoghWallet(target)).balance,before);
  // Suggestions above the input can be switched off, and the status says so.
  assert.equal((await send('/api/dashboard/assistant')).body.suggest,true);
  view=(await send('/api/dashboard/assistant/me',{settings:settings({name:'پشمک',engine:'local',suggest:false,own:{enabled:false}})})).body;assert.equal(view.settings.suggest,false);assert.equal((await send('/api/dashboard/assistant')).body.suggest,false);
  assert.equal((await send('/api/dashboard/assistant/me',{settings:settings({suggest:'no'})})).status,400);
  view=(await send('/api/dashboard/assistant/me',{settings:settings({name:'پشمک',engine:'local',suggest:true,own:{enabled:false}})})).body;
  console.log('PASS Fandogh user settings API: validation, sealed masked key, safe connection test, free own-key questions with persona, forget key back to free local Fandogh.');

  const {chromium}=require('playwright'),browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true}),out=path.resolve('artifacts/fandogh-user-settings');fs.mkdirSync(out,{recursive:true});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),owner);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/dashboard/assistant/');const form=page.locator('[data-fset]');await form.waitFor();
   assert.equal(await page.locator('#page-title').innerText(),'تنظیمات فندق');assert(await page.locator('.dn-item[aria-current=page]').count()>=1);
   assert.equal(await form.locator('input[name=engine]:checked').inputValue(),'local');assert.match(await form.locator('.fset-model:has(input[value=local]) .fset-cost').innerText(),/رایگان/);
   assert.match(await form.locator('.fset-model:has(input[value=claude-opus]) .fset-cost').innerText(),/تومان/);assert.match(await form.locator('.fset-model:has(input[value=luna])').innerText(),/۳۰ تومان برای هر ۱۰۰۰ توکن/);assert.match(await form.locator('.fset-model:has(input[value=claude-opus])').innerText(),/کوروش/,'a locked model names its plan');assert(await form.locator('input[value=claude-opus]').isDisabled());
   assert.deepEqual(await form.locator('.fset-group h3').allInnerTexts(),['فندق','OpenAI','Anthropic','Google','Moonshot','DeepSeek']);assert.equal(await form.locator('.fset-plan').count(),3);assert.deepEqual(await form.locator('.fset-plan h3').evaluateAll(n=>n.map(x=>x.firstChild.textContent)),['آرش','رستم','کوروش']);assert.match(await form.locator('.fset-balance').innerText(),/۵٬?۰۰۰ تومان/);assert.equal(await form.locator('.fset-topup').count(),5);
   // Top-up with It from the main wallet: confirm, and the Fandogh wallet grows by 10 It = 20,000 toman.
   await execute('INSERT OR IGNORE INTO wallets(user_id,balance_units) VALUES(?,?)',[owner,0]);await execute('UPDATE wallets SET balance_units=? WHERE user_id=?',[100000,owner]);
   // Settings live in tabs: one panel at a time, the address keeps the tab.
   assert.equal(await page.locator('[data-fset-tab]').count(),5);assert(await page.locator('[data-fset-panel=model]').isVisible());assert(!await page.locator('[data-fset-panel=wallet]').isVisible());assert.equal(await page.locator('.fset-group:visible').count(),1,'one maker at a time');
   await page.locator('[data-fset-maker=Anthropic]').click();assert(await page.locator('.fset-model:has(input[value=claude-opus])').isVisible());
   await page.locator('[data-fset-tab=wallet]').click();assert.match(page.url(),/tab=wallet/);assert(!await page.locator('[data-fset-save]').isVisible(),'wallet has nothing to save');
   page.once('dialog',d=>d.accept());await form.locator('[data-set-topup="10"]').click();
   await page.waitForFunction(()=>/۲۵٬?۰۰۰ تومان/.test(document.querySelector('.fset-balance')?.innerText||''));assert.equal(await page.locator('.fset-ledger__row.is-topup').count(),1);
   await page.locator('.fset-rates summary').click();assert(await page.locator('.fset-rates tbody tr').count()>=10);
   await page.locator('[data-fset-tab=persona]').click();await form.locator('input[name=name]').fill('نارگیل');await page.locator('[data-fset-tab=key]').click();await form.locator('.fset-switch:has(input[name=own])').click();assert(await form.locator('input[name=own]').isChecked());await form.locator('input[name=key]').fill('sk-mine-abcd1234');
   await form.locator('[data-set-test]').click();await page.locator('[data-set-test-status][data-kind=ok]').waitFor();
   await form.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('[data-fset] input[name=name]')?.value==='نارگیل'&&document.querySelector('[data-fset] input[name=engine][value=own]')||document.querySelector('[data-set-status][data-kind=error]'));assert.equal(await page.locator('[data-set-status][data-kind=error]').count(),0,await page.locator('[data-set-status]').textContent().catch(()=>''));
   assert.equal(await page.locator('[data-fset] input[name=engine]:checked').inputValue(),'own','saving a key makes it the default');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.waitForTimeout(600);await page.screenshot({path:path.join(out,'settings.png'),fullPage:true});
   // The quick panel no longer holds settings; its header links here and to the full page.
   await page.evaluate(()=>RI.petOpen());await page.locator('[data-pet-settings]').waitFor();assert.equal(await page.locator('[data-pet-tab=settings]').count(),0);
   assert.match(await page.locator('[data-pet-usage]').innerText(),/کلید خودت/);
   assert.deepEqual(errors,[]);
   console.log('PASS Fandogh settings page: free local default, model costs, rename, own key with connection test becomes the default, quick panel links here.');
  }finally{await browser.close();}
 }finally{globalThis.fetch=real;await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
