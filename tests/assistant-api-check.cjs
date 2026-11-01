const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),llm=require('../src/ai/assistant-llm.cjs'),route=require('../src/dashboard/assistant.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),{db,target,store}=f;
 try{
  const origin='http://127.0.0.1',call=async(path,body,method=body?'POST':'GET')=>{let out;const req={method,headers:{origin,'content-type':'application/json'},resume(){},async *iterator(){if(body)yield Buffer.from(JSON.stringify(body));}};
   try{await route(db,req,path,origin,{id:target},(status,data)=>{out={status,data};});}catch(e){out={status:e.status||500,data:{error:e.message}};}return out;};
  const content={profile:{name:'امیرمحمد طالبی',title:'دانشجوری کامپیوتر',bio:'Code Lover',avatar:'data:image/png;base64,AAAA'},skills:[{name:'Figma'}],experience:[],education:[],projects:[{title:'ResumeIt'}],contacts:[{type:'phone',value:'09120000000',public:true}],socials:[]};
  // Free accounts: 3 messages in any 5 hours and 15 a week. Local Fandogh is free and never touches either.
  let s=await call('/api/dashboard/assistant');assert.equal(s.status,200);assert.equal(s.data.plan,'free');assert.equal(s.data.level,0);assert.deepEqual([s.data.window.limit,s.data.week.limit],[3,15]);assert.equal(s.data.plans.length,3);assert.equal(s.data.ai,false);
  assert.deepEqual(s.data.plans.map(p=>[p.id,p.name,p.window,p.week,p.price]),[['arash','آرش',15,50,210000],['rostam','رستم',25,80,360000],['kourosh','کوروش',40,120,510000]]);
  assert.equal(s.data.engine,'local');assert.equal(s.data.models[0].id,'local');assert.equal(s.data.models[0].cost,0);assert.equal(s.data.models.find(m=>m.id==='luna').cost,1);
  // Only GPT-6 Luna costs one message; the rest start at two. Models are grouped by maker and the strongest need «کوروش».
  assert(s.data.models.filter(m=>!['local','luna'].includes(m.id)).every(m=>m.cost>=2));
  assert.deepEqual([...new Set(s.data.models.map(m=>m.groupLabel))],['فندق','OpenAI','Anthropic','Google','Moonshot','DeepSeek']);
  for(const id of ['claude-fable','claude-opus','gpt-6-astra','gpt-6-sol'])assert.equal(s.data.models.find(m=>m.id===id).tier,3,id+' is in the best plan');
  assert(s.data.models.find(m=>m.id==='claude-opus').locked&&!s.data.models.find(m=>m.id==='luna').locked);
  assert.equal(s.data.remaining,3);
  for(let i=0;i<7;i++){const r=await call('/api/dashboard/assistant/ask',{question:'من فول استک دولوپر هستم',content});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.reply.source,'local');assert.equal(r.data.reply.model.cost,0);assert.equal(r.data.usage.remaining,3);}
  // A model above the plan answers locally, charges nothing and names the plan that opens it.
  const r1=await call('/api/dashboard/assistant/ask',{question:'یک برنامهٔ شش ماهه برای مهاجرت کاری بنویس',content,model:'claude-opus'});assert.equal(r1.status,200);assert.equal(r1.data.usage.remaining,3);assert.equal(r1.data.reply.model.id,'local');assert.match(r1.data.reply.text,/کوروش/);assert(r1.data.reply.actions.some(a=>a.route==='assistant'));
  // A model in the plan that is not connected also answers locally for free.
  const r2=await call('/api/dashboard/assistant/ask',{question:'یک برنامهٔ شش ماهه برای مهاجرت کاری بنویس',content,model:'claude-haiku'});assert.equal(r2.data.usage.remaining,3);assert.match(r2.data.reply.text,/در دسترس نیست/);
  // The two rolling windows, straight on the store: the fourth message in 5 hours waits, and so does the 16th in a week.
  {const t0=Date.UTC(2026,9,1,8),free={window:3,week:15};
   for(let i=0;i<3;i++)assert.ok(await db.useAssistant(target,free,t0+i*60000,1));
   const full=await db.useAssistant(target,free,t0+5*60000,1).catch(e=>e);assert.equal(full.code,'ASSISTANT_LIMIT');assert.equal(full.scope,'window');assert.equal(full.resetAt,t0+5*3600000,'room again when the first message is 5 hours old');
   const heavy=await db.useAssistant(target,{window:10,week:15},t0+6*60000,8).catch(e=>e);assert.equal(heavy.scope,'window','a heavy model needs its whole cost free');
   let at=t0;for(let k=1;k<=4;k++){at=t0+k*(5*3600000+600000);for(let i=0;i<3;i++)await db.useAssistant(target,free,at+i*1000,1);}
   const week=await db.useAssistant(target,free,at+5*3600000+60000,1).catch(e=>e);assert.equal(week.code,'ASSISTANT_LIMIT');assert.equal(week.scope,'week','15 a week');
   const usage=await db.assistantUsage(target,at+5000);assert.equal(usage.week.used,15);assert.equal(usage.window.used,3);
   assert.ok(await db.useAssistant(target,free,t0+7*24*3600000+1000,1),'a week later the first messages have aged out');
   const id=await db.useAssistant(target,{window:99,week:99},t0+7*24*3600000+2000,2);await db.refundAssistant(target,id);assert.equal((await db.assistantUsage(target,t0+7*24*3600000+3000)).week.used,15,'only the oldest message aged out, and the refund removes exactly the new one');
   await store.execute('DELETE FROM assistant_events WHERE user_id=?',[target]);}
  // The local brain understood the statement and the typo.
  const local=require('../dist/dashboard/js/advisor-brain.js').reply('من فول استک دولوپر هستم',content);assert.equal(local.intent,'statement');assert(local.actions.some(a=>a.kind==='title'&&a.value==='توسعه‌دهندهٔ فول‌استک'));
  // Buying a Fandogh plan: «آرش» opens the fast models and lifts the allowance; another month stacks.
  await store.execute('INSERT OR IGNORE INTO wallets(user_id,balance_units) VALUES(?,?)',[target,10000000]);await store.execute('UPDATE wallets SET balance_units=10000000 WHERE user_id=?',[target]);
  assert.equal(await db.purchaseWithWallet(target,'assistant:arash',randomUUID(),210000),true);
  s=await call('/api/dashboard/assistant');assert.equal(s.data.plan,'arash');assert.equal(s.data.level,1);assert.deepEqual([s.data.window.limit,s.data.week.limit],[15,50]);assert.equal(s.data.remaining,15);
  assert(!s.data.models.find(m=>m.id==='gemini-flash').locked&&s.data.models.find(m=>m.id==='claude-sonnet').locked);
  const first=s.data.until;assert.equal(await db.purchaseWithWallet(target,'assistant:arash',randomUUID(),210000),true);
  assert.equal((await call('/api/dashboard/assistant')).data.until>first,true,'periods stack');
  const [tx]=await store.execute("SELECT label FROM wallet_transactions WHERE user_id=? AND product_ref='assistant:arash'",[target]);assert.equal(tx.label,'اشتراک فندق «آرش» یک‌ماهه');
  // «کوروش» opens everything; the better plan wins when someone holds two.
  assert.equal(await db.purchaseWithWallet(target,'assistant:kourosh',randomUUID(),510000),true);
  s=await call('/api/dashboard/assistant');assert.equal(s.data.plan,'kourosh');assert.equal(s.data.level,3);assert.deepEqual([s.data.window.limit,s.data.week.limit],[40,120]);assert(s.data.models.every(m=>!m.locked));
  await assert.rejects(()=>db.purchaseWithWallet(target,'assistant:m9',randomUUID(),20000));
  await assert.rejects(()=>db.purchaseWithWallet(target,'assistant:m1',randomUUID(),20000),'the old monthly plans are no longer sold');
  // Older monthly purchases still count, as «آرش».
  await store.execute("DELETE FROM account_access WHERE user_id=? AND ref LIKE 'assistant:%'",[target]);
  await store.execute("INSERT INTO account_access(user_id,ref,price_units,expires_at,created_at) VALUES(?,?,?,?,?)",[target,'assistant:m3',54000,Date.now()+86400000,Date.now()]);
  assert.equal((await call('/api/dashboard/assistant')).data.plan,'arash');
  await store.execute("DELETE FROM account_access WHERE user_id=? AND ref LIKE 'assistant:%'",[target]);
  // Any subscription includes the assistant.
  await store.execute("INSERT INTO account_access(user_id,ref,price_units,expires_at,created_at) VALUES(?,?,?,?,?)",[target,'subscription:q',288000,Date.now()+86400000,Date.now()]);
  s=await call('/api/dashboard/assistant');assert.equal(s.data.plan,'subscription');assert.equal(s.data.level,3,'a subscription opens every model');assert.deepEqual([s.data.window.limit,s.data.week.limit],[10,40]);
  // Validation and privacy: no contact values or image data reach the model.
  assert.equal((await call('/api/dashboard/assistant/ask',{question:'',content})).status,400);
  assert.equal((await call('/api/dashboard/assistant/ask',{question:'سلام'})).status,400);
  const trimmed=llm.trim(content);assert(!JSON.stringify(trimmed).includes('09120000000'));assert(!JSON.stringify(trimmed).includes('base64'));assert.equal(trimmed.contacts[0].filled,true);
  // Model replies: tagged blocks become checked resume edits; failures fall back to the local brain.
  const parsed=llm.parse('عنوانت غلط دارد.<<TITLE>>دانشجوی کامپیوتر<</TITLE>>\n<<BIO>>دانشجوی کامپیوتر و علاقه‌مند به طراحی.<</BIO>><<SKILLS>>Figma|پروتوتایپ<</SKILLS>>');
  assert.deepEqual(parsed.edits.map(a=>a.op),['set','set','add_skill','add_skill']);assert(!parsed.text.includes('<<'));
  const env={ASSISTANT_AI_URL:'https://ai.example.test/v1',ASSISTANT_AI_KEY:'test-key-123'};let seen;
  const answer=await llm.answer({question:'سلام',content,goal:'',history:[],analysis:{}},env,async(url,init)=>{seen={url,body:JSON.parse(init.body),auth:init.headers.Authorization};return {ok:true,json:async()=>({choices:[{message:{content:'سلام! <<SKILLS>>React<</SKILLS>>'}}]})};});
  assert.equal(seen.url,'https://ai.example.test/v1/chat/completions');assert.equal(seen.auth,'Bearer test-key-123');assert(!JSON.stringify(seen.body).includes('09120000000'));assert.equal(answer.edits[0].name,'React');
  assert.equal(await llm.answer({question:'سلام',content},env,async()=>({ok:false})),null);
  assert.equal(await llm.answer({question:'سلام',content},{ASSISTANT_AI_URL:'http://insecure.test',ASSISTANT_AI_KEY:'test-key-123'}),null,'only https endpoints');
  console.log('PASS assistant API: free local Fandogh, 5-hour and weekly windows with refunds, models grouped with Luna as the unit, plan locks, the three Fandogh plans and legacy purchases, a model that is not connected falling back without charge, plan purchases that stack, subscription with every model, validation, private prompt, tagged model actions and local fallback.');
 }finally{store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
