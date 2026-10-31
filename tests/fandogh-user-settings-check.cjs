// A person's own Fandogh settings: name, tone, length and their own model key. The key is sealed and masked, a
// connection test never echoes it, questions through their own key are free (no allowance used) and carry the
// persona, and the panel's settings tab saves and renames the assistant.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const {db,owner,target}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true}),{execute,sql}=store;
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
  assert.equal(view.settings.name,'فندق');assert.equal(view.key.set,false);assert(view.providers.some(p=>p.id==='openai'));
  const settings=s=>({...view.settings,...s,own:{...view.settings.own,...(s.own||{})}});
  assert.equal((await send('/api/dashboard/assistant/me',{settings:settings({own:{enabled:true}})})).status,400,'own model needs a key');
  assert.equal((await send('/api/dashboard/assistant/me',{settings:settings({name:'یک اسم خیلی خیلی طولانی برای گربه'})})).status,400);
  view=(await send('/api/dashboard/assistant/me',{settings:settings({name:'پشمک',tone:'formal',length:'detailed',own:{enabled:true,provider:'openai',model:'gpt-4o-mini'}}),key:'sk-mine-abcd1234'})).body;
  assert.equal(view.key.hint,'…1234');assert(!JSON.stringify(view).includes('sk-mine'),'the key never comes back');
  const [row]=await execute('SELECT secret FROM assistant_user_settings WHERE user_id=?',[target]);assert(row.secret.startsWith('v1.')&&!row.secret.includes('sk-mine'),'sealed at rest');
  let test=(await send('/api/dashboard/assistant/me/test',{own:{provider:'openai'}})).body;assert.equal(test.ok,true);
  test=(await send('/api/dashboard/assistant/me/test',{own:{provider:'openai'},key:'sk-wrong-key-999'})).body;assert.equal(test.ok,false);assert(!test.error.includes('sk-wrong-key-999'));
  // Questions through the person's own key: free, and the persona goes with them.
  const before=await db.assistantUsed(target);calls.length=0;
  const r=(await send('/api/dashboard/assistant/ask',{question:'معرفی‌ام را چطور بنویسم؟',content,history:[]})).body;
  assert.equal(r.reply.source,'ai');assert.equal(await db.assistantUsed(target),before,'no allowance used');assert.equal(r.usage.own,true);assert.equal(r.usage.name,'پشمک');
  assert(calls[0].messages[0].content.includes('«پشمک»')&&calls[0].messages[0].content.includes('رسمی'),'persona reaches the model');
  // Forgetting the key returns to the shared allowance.
  view=(await send('/api/dashboard/assistant/me',{settings:settings({name:'پشمک',own:{enabled:false}}),key:null})).body;assert.equal(view.key.set,false);
  await send('/api/dashboard/assistant/ask',{question:'سلام',content,history:[]});assert.equal(await db.assistantUsed(target),before+1);
  console.log('PASS Fandogh user settings API: validation, sealed masked key, safe connection test, free own-key questions with persona, forget key.');

  const {chromium}=require('playwright'),browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true}),out=path.resolve('artifacts/fandogh-user-settings');fs.mkdirSync(out,{recursive:true});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);await context.addInitScript(id=>sessionStorage.setItem('ri-panel-choice',id),owner);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/dashboard/resume/');await page.waitForFunction(()=>window.RI?.petOpen&&document.querySelector('.pet'));
   await page.evaluate(()=>RI.petOpen('settings'));const form=page.locator('[data-pet-set]');await form.waitFor();
   await form.locator('input[name=name]').fill('نارگیل');await form.locator('input[name=own]').check();await form.locator('input[name=key]').fill('sk-mine-abcd1234');
   await form.locator('[data-set-test]').click();await page.locator('[data-set-test-status][data-kind=ok]').waitFor();
   await form.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.pet__title b')?.textContent.startsWith('نارگیل')||document.querySelector('[data-set-status][data-kind=error]'));assert.equal(await page.locator('[data-set-status][data-kind=error]').count(),0,await page.locator('[data-set-status]').textContent().catch(()=>''));
   assert.match(await page.locator('[data-pet-usage]').innerText(),/کلید خودت/);
   await page.waitForTimeout(600);await page.screenshot({path:path.join(out,'settings.png')});
   assert.deepEqual(errors,[]);
   console.log('PASS Fandogh settings tab: rename, own key with connection test, usage line follows.');
  }finally{await browser.close();}
 }finally{globalThis.fetch=real;await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
