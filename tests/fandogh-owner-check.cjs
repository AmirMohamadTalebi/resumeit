// Fandogh's owner panel end to end: owner-only settings, sealed and masked provider keys, allowances, pausing,
// a mocked model behind the dashboard assistant (identity questions never reach it, identity claims in its
// replies are replaced), usage numbers, plan prices, and the panel itself at desktop and phone widths.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto'),{createServer}=require('../src/http/server.cjs');
(async()=>{
 const {db,owner,target}=await require('./admin-fixture.cjs')(),store=require('./workspace-test-store.cjs')(db,[owner,target],{workspaces:true}),{execute,sql}=store;
 sql.exec('CREATE TABLE IF NOT EXISTS account_access(user_id TEXT,ref TEXT,price_units INTEGER,expires_at INTEGER,created_at INTEGER,PRIMARY KEY(user_id,ref));');
 // The model is mocked where the server would reach it; everything else is the real local server.
 const real=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,init)=>{
  if(!String(url).startsWith('https://api.openai.com/'))return real(url,init);
  const body=JSON.parse(init.body);calls.push(body);
  if(init.headers.Authorization!=='Bearer sk-test-fandogh-1234')return {ok:false,status:401,json:async()=>({error:{message:'Incorrect API key provided: sk-test-wrong'}})};
  // Asked to fix the title, the model answers with an edit list (one valid, one aimed at a field it may not touch).
  if(body.messages.at(-1).content.includes('عنوانم'))return {ok:true,status:200,json:async()=>({choices:[{message:{content:'عنوانت را درست کردم. <<EDITS>>[{"op":"set","field":"title","value":"طراح ارشد رابط کاربری"},{"op":"set","field":"slug","value":"x"}]<</EDITS>>'}}],usage:{prompt_tokens:150,completion_tokens:40}})};
  return {ok:true,status:200,json:async()=>({choices:[{message:{content:'سلام! من ChatGPT هستم. معرفی‌ات را کوتاه‌تر کن.'}}],usage:{prompt_tokens:120,completion_tokens:30}})};
 };
 const server=createServer(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const send=async(route,body,token='a')=>{const r=await real(base+route,{method:body?'POST':'GET',headers:{Cookie:'ri_session='+token.repeat(64),Origin:base,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
 const content={profile:{name:'روژان مهر',title:'طراح رابط کاربری',bio:'',avatar:''},skills:[{name:'Figma'}],experience:[],education:[],projects:[],contacts:[],socials:[]};
 const ask=(question,history=[])=>send('/api/dashboard/assistant/ask',{question,content,history},'b');
 try{
  // Owner only: an ordinary admin cannot read or change Fandogh's settings.
  await db.saveAccountRole(owner,target,{role:'admin',reason:'ادمین عادی برای آزمون فندق',requestId:randomUUID()});
  assert.equal((await send('/api/admin/assistant',null,'b')).status,403);
  let view=(await send('/api/admin/assistant')).body;
  assert.equal(view.settings.enabled,true);assert.equal(view.providers.length,9);assert(view.providers.some(p=>p.id==='anthropic')&&view.providers.some(p=>p.id==='custom'&&p.needsUrl));
  assert.equal(view.keys.openai.set,false);assert.equal(view.live,false);
  // Switching the model on without a key is refused; with a key it saves, and the key never comes back.
  const settings=s=>({...view.settings,...s,ai:{...view.settings.ai,...(s.ai||{})}});
  const save=(s,keys)=>send('/api/admin/assistant',{settings:s,keys,reason:'آزمون تنظیمات فندق',requestId:randomUUID()});
  assert.equal((await save(settings({ai:{enabled:true,provider:'openai'}}))).status,400);
  assert.equal((await save(settings({ai:{enabled:true,provider:'openai'},providers:{openai:{model:'gpt-4o-mini',url:''}}}),{openai:'sk-test-fandogh-1234'})).status,200);
  view=(await send('/api/admin/assistant')).body;
  assert.equal(view.keys.openai.set,true);assert.equal(view.keys.openai.hint,'…1234');assert.equal(view.live,true);assert(!JSON.stringify(view).includes('sk-test-fandogh'),'keys are masked');
  const [row]=await execute('SELECT secrets FROM assistant_settings WHERE id=1');assert(row.secrets.startsWith('v1.')&&!row.secrets.includes('sk-test'),'keys are sealed at rest');
  const [audit]=await execute("SELECT details FROM admin_audit WHERE action='owner-assistant' ORDER BY created_at DESC LIMIT 1");assert(!audit.details.includes('sk-test')&&audit.details.includes('"openai":"set"'));
  // Connection test: the stored key works, a wrong one is reported without echoing it.
  let test=(await send('/api/admin/assistant/test',{provider:'openai'})).body;assert.equal(test.ok,true);assert(test.reply.includes('فندق')&&!/ChatGPT/.test(test.reply),'test reply keeps Fandogh\'s identity');
  test=(await send('/api/admin/assistant/test',{provider:'openai',key:'sk-test-wrong-key'})).body;assert.equal(test.ok,false);assert(test.error.includes('کلید پذیرفته نشد')&&!test.error.includes('sk-test-wrong'));
  // The dashboard assistant: identity questions stay local, resume questions go to the model with the guard.
  calls.length=0;
  let r=(await ask('تو کلادی؟')).body.reply;assert.equal(r.source,'local');assert.equal(r.topic,'model');assert.equal(calls.length,0,'identity questions never reach the model');
  r=(await ask('سلام چطوری خوبی')).body.reply;assert.equal(r.source,'local');assert(r.topics.includes('howareyou')&&r.text.startsWith('سلام'));assert.equal(calls.length,0,'small talk stays local by default');
  r=(await ask('معرفی‌ام را چطور بنویسم؟')).body.reply;assert.equal(r.source,'ai');assert.equal(calls.length,1);assert(r.text.includes('من فندقم')&&!r.text.includes('ChatGPT'),'identity claims are replaced');
  assert(calls[0].messages[0].content.includes('اسم تو فقط «فندق» است'),'the identity rules go with every request');
  let stats=(await send('/api/admin/assistant')).body.stats;assert.equal(stats.today.aiCalls,1);assert.equal(stats.today.tokens,150);assert.equal(stats.today.messages,3);assert.equal(stats.top[0].id,target);
  // Resume edits come back checked against the resume that was sent; the mode reaches the model's instructions.
  const edit=(await send('/api/dashboard/assistant/ask',{question:'عنوانم را درست کن',content,history:[],mode:'auto'},'b')).body.reply;
  assert.deepEqual(edit.edits.map(e=>[e.op,e.field,e.after]),[['set','title','طراح ارشد رابط کاربری']]);assert(calls.at(-1).messages[0].content.includes('حالت ویرایش: خودکار'));
  // Daily cap on model calls: past it, answers come from the local brain.
  assert.equal((await save(settings({ai:{enabled:true,provider:'openai',dailyCalls:1},providers:{openai:{model:'gpt-4o-mini',url:''}}}))).status,200);
  r=(await ask('یک معرفی برایم بنویس')).body.reply;assert.equal(r.source,'local');assert.equal(calls.length,2);
  // Allowances come from the panel; a paused Fandogh says so instead of answering.
  view=(await send('/api/admin/assistant')).body;
  assert.equal((await save(settings({freeDaily:4,paidDaily:50}))).status,200);
  assert.equal((await send('/api/dashboard/assistant',null,'b')).body.limit,4);
  assert.equal((await ask('امتیاز رزومه‌ام چنده؟')).status,429,'the fifth question today is over the new allowance');
  assert.equal((await save(settings({enabled:false}))).status,200);
  const paused=await ask('سلام');assert.equal(paused.status,503);assert.equal(paused.body.code,'ASSISTANT_PAUSED');
  assert.equal((await save(settings({enabled:true,freeDaily:20}))).status,200);
  // Validation: the paid allowance cannot be below the free one; a custom service needs an https address.
  assert.equal((await save(settings({freeDaily:30,paidDaily:10}))).status,400);
  assert.equal((await save(settings({providers:{custom:{model:'x',url:'http://insecure.example'}}}))).status,400);
  console.log('PASS Fandogh owner panel: owner-only, sealed and masked keys, connection test, local identity answers, guarded model replies, usage and daily cap, allowances, pause and validation.');

  // The panel in a browser.
  const {chromium}=require('playwright'),browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true}),out=path.resolve('artifacts/fandogh-owner');fs.mkdirSync(out,{recursive:true});
  try{
   const context=await browser.newContext({reducedMotion:'reduce'});await context.addCookies([{name:'ri_session',value:'a'.repeat(64),url:base}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.goto(base+'/admin/assistant/');await page.locator('[data-fx-root]').waitFor();
    assert.equal(await page.locator('.fx-provider').count(),9);assert.equal(await page.locator('.fx-provider.is-active').getAttribute('data-provider'),'openai');
    assert(await page.locator('.fx-provider.is-active [data-key]').isVisible());assert(!(await page.locator('.fx-provider[data-provider=anthropic] [data-key]').isVisible()));
    assert.equal(await page.locator('#admin-nav a[aria-current=page]').count(),1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll at '+width);
    await page.screenshot({path:path.join(out,'panel-'+width+'.png'),fullPage:true});
   }
   await page.setViewportSize({width:1440,height:900});
   await page.locator('.fx-provider[data-provider=anthropic]').click();assert.equal(await page.locator('.fx-provider.is-active').getAttribute('data-provider'),'anthropic');
   await page.locator('.fx-provider[data-provider=openai]').click();
   await page.locator('.fx-provider.is-active [data-test]').click();await page.locator('.fx-provider.is-active [data-test-result][data-kind=ok]').waitFor();
   await page.locator('[data-fx-free]').fill('7');await page.locator('[data-fx-save]').click();await page.locator('[data-fx-status][data-kind=error]').waitFor();
   await page.locator('[data-fx-reason]').fill('سهمیهٔ رایگان تازه');await page.locator('[data-fx-save]').click();await page.locator('[data-fx-status][data-kind=ok]').waitFor();
   assert.equal(await page.locator('[data-fx-free]').inputValue(),'7');
   await page.locator('[data-fx-reason]').fill('قیمت تازهٔ دستیار');await page.locator('[data-plan="assistant:m1"] [data-plan-price]').fill('12');await page.locator('[data-plan="assistant:m1"] [data-plan-save]').click();await page.locator('[data-fx-status][data-kind=ok]').waitFor();
   assert.equal(await page.locator('[data-plan="assistant:m1"] [data-plan-price]').inputValue(),'12');
   assert.equal((await db.commerceSettings()).prices['assistant:m1'],24000);
   await page.screenshot({path:path.join(out,'panel-saved.png')});
   assert.deepEqual(errors,[]);
   console.log('PASS Fandogh owner panel UI: provider cards, connection test, saving with a reason, plan price, desktop and phone without sideways scroll.');
  }finally{await browser.close();}
 }finally{globalThis.fetch=real;await new Promise(r=>server.close(r));store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
