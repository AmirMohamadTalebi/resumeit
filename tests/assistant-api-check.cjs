const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),llm=require('../src/ai/assistant-llm.cjs'),route=require('../src/dashboard/assistant.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),{db,target,store}=f;
 try{
  const origin='http://127.0.0.1',call=async(path,body,method=body?'POST':'GET')=>{let out;const req={method,headers:{origin,'content-type':'application/json'},resume(){},async *iterator(){if(body)yield Buffer.from(JSON.stringify(body));}};
   try{await route(db,req,path,origin,{id:target},(status,data)=>{out={status,data};});}catch(e){out={status:e.status||500,data:{error:e.message}};}return out;};
  const content={profile:{name:'امیرمحمد طالبی',title:'دانشجوری کامپیوتر',bio:'Code Lover',avatar:'data:image/png;base64,AAAA'},skills:[{name:'Figma'}],experience:[],education:[],projects:[{title:'ResumeIt'}],contacts:[{type:'phone',value:'09120000000',public:true}],socials:[]};
  // A new account: the free level, a welcome credit in the Fandogh wallet (once), and local Fandogh for free.
  let s=await call('/api/dashboard/assistant');assert.equal(s.status,200);assert.equal(s.data.plan,'free');assert.equal(s.data.level,0);assert.equal(s.data.plans.length,3);assert.equal(s.data.ai,false);
  assert.equal(s.data.wallet.toman,5000);assert.equal(s.data.wallet.ledger[0].kind,'welcome');assert.equal((await call('/api/dashboard/assistant')).data.wallet.toman,5000,'the welcome credit comes once');
  assert.deepEqual(s.data.plans.map(p=>[p.id,p.name,p.credit,p.price]),[['arash','آرش',30000,210000],['rostam','رستم',60000,360000],['kourosh','کوروش',100000,510000]]);
  assert.equal(s.data.billing.markup,50);assert.equal(s.data.wallet.tokenToman,0.03,'a Luna token costs 0.03 toman at 300,000 a dollar');assert.equal(s.data.wallet.tokens,166666);
  assert.equal(s.data.engine,'local');assert.equal(s.data.models[0].id,'local');assert.equal(s.data.models[0].cost,0);
  // Models are grouped by maker, each with its own price; the strongest need «کوروش».
  assert.deepEqual([...new Set(s.data.models.map(m=>m.groupLabel))],['فندق','OpenAI','Anthropic','Google','Moonshot','DeepSeek']);
  assert.deepEqual(s.data.models.find(m=>m.id==='luna').million,[30000,150000]);assert.deepEqual(s.data.models.find(m=>m.id==='gpt-6-astra').million,[3000000,15000000]);
  for(const id of ['claude-fable','claude-opus','gpt-6-astra','gpt-6-sol'])assert.equal(s.data.models.find(m=>m.id===id).tier,3,id+' is in the best plan');
  assert(s.data.models.find(m=>m.id==='claude-opus').locked&&!s.data.models.find(m=>m.id==='luna').locked);
  for(let i=0;i<4;i++){const r=await call('/api/dashboard/assistant/ask',{question:'من فول استک دولوپر هستم',content});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.reply.source,'local');assert.equal(r.data.reply.model.cost,0);assert.equal(r.data.usage.wallet.toman,5000);}
  // A model above the plan answers locally, charges nothing and names the plan that opens it.
  const r1=await call('/api/dashboard/assistant/ask',{question:'یک برنامهٔ شش ماهه برای مهاجرت کاری بنویس',content,model:'claude-opus'});assert.equal(r1.status,200);assert.equal(r1.data.usage.wallet.toman,5000);assert.equal(r1.data.reply.model.id,'local');assert.match(r1.data.reply.text,/کوروش/);assert(r1.data.reply.actions.some(a=>a.route==='assistant'));
  // A model in the plan that is not connected also answers locally for free.
  const r2=await call('/api/dashboard/assistant/ask',{question:'یک برنامهٔ شش ماهه برای مهاجرت کاری بنویس',content,model:'claude-haiku'});assert.equal(r2.data.usage.wallet.toman,5000);assert.match(r2.data.reply.text,/در دسترس نیست/);
  // The price of an answer: every used token counts 1.5 times at the model's own rate. 11,667 Luna tokens read are
  // 17,500 charged, about 525 toman; the same on GPT-6 Astra about 52,500; written tokens cost the output rate.
  {const catalog=require('../src/ai/catalog.cjs'),settings=require('../src/owner/assistant-settings.cjs').defaults(),m=id=>catalog.models(settings).find(x=>x.id===id);
   assert.equal(catalog.charge(m('luna'),11667,0,settings),5251);assert.equal(catalog.charge(m('gpt-6-astra'),11667,0,settings),525015);assert.equal(catalog.charge(m('luna'),0,1000,settings),2250);
   assert.equal(catalog.charge(m('luna'),1000,0,{...settings,billing:{...settings.billing,markup:0}}),300,'no margin: 1,000 Luna tokens are 30 toman');}
  // The wallet on the store: charges, top-ups from the main wallet (It), and a repeated request id does nothing.
  // A hold takes the typical price under the wallet lock: parallel holds can never spend the same credit twice.
  const holds=await Promise.all(Array.from({length:6},()=>db.holdFandogh(target,20000,{model:'luna',label:'GPT-6 Luna'})));
  assert.equal(holds.filter(Boolean).length,2,'50,000 rial covers two holds of 20,000, never more');assert.equal((await db.fandoghWallet(target)).balance,10000);
  for(const id of holds.filter(Boolean))assert.equal(typeof await db.settleFandogh(target,id,0),'number','no answer returns the hold');
  assert.equal((await db.fandoghWallet(target)).balance,50000);assert.equal((await db.fandoghWallet(target)).daily.length,0,'a returned hold leaves no usage row');
  const held=await db.holdFandogh(target,20000,{model:'luna',label:'GPT-6 Luna',input:8000,output:2000});
  const [row]=await store.execute('SELECT input_tokens,output_tokens FROM fandogh_ledger WHERE id=?',[held]);assert.equal(Number(row.input_tokens)+Number(row.output_tokens),10000,'an unsettled hold reports a typical message, not zero tokens');
  assert.equal(await db.settleFandogh(target,held,5251,{input:11667,output:0}),50000-5251,'the real price replaces the hold');
  await store.execute('INSERT OR IGNORE INTO wallets(user_id,balance_units) VALUES(?,?)',[target,0]);await store.execute('UPDATE wallets SET balance_units=? WHERE user_id=?',[20000,target]);
  await assert.rejects(()=>db.topUpFandogh(target,11,'a'.repeat(32)),/کافی نیست/);
  const rid=randomUUID().replace(/-/g,'');const up=await call('/api/dashboard/assistant/topup',{its:10,requestId:rid});assert.equal(up.status,200,JSON.stringify(up.data));
  assert.equal(up.data.usage.wallet.toman,Math.round(50000-5251+200000)/10,'10 It is 20,000 toman');assert.equal(up.data.usage.wallet.ledger[0].kind,'topup');assert(!up.data.usage.wallet.ledger.some(x=>x.kind==='usage'),'answers are not listed one by one');assert.equal(up.data.usage.wallet.daily.length,1);assert.equal(up.data.usage.wallet.daily[0].tokens,-17501,'the day shows the charged tokens');assert.equal(up.data.usage.wallet.daily[0].toman,-525.1);assert.equal(up.data.usage.wallet.daily[0].count,1);
  assert.equal((await call('/api/dashboard/assistant/topup',{its:10,requestId:rid})).data.repeated,true);
  const [main]=await store.execute('SELECT balance_units FROM wallets WHERE user_id=?',[target]);assert.equal(Number(main.balance_units),0,'the main wallet paid once');
  const [mtx]=await store.execute("SELECT label,delta_units FROM wallet_transactions WHERE user_id=? AND reference=?",[target,'fandogh:'+rid]);assert.equal(mtx.label,'شارژ کیف پول فندق');assert.equal(Number(mtx.delta_units),-20000);
  assert.equal((await call('/api/dashboard/assistant/topup',{its:0,requestId:randomUUID().replace(/-/g,'')})).status,400);
  // The local brain understood the statement and the typo.
  const local=require('../dist/dashboard/js/advisor-brain.js').reply('من فول استک دولوپر هستم',content);assert.equal(local.intent,'statement');assert(local.actions.some(a=>a.kind==='title'&&a.value==='توسعه‌دهندهٔ فول‌استک'));
  // Buying a Fandogh plan: «آرش» opens the fast models and adds its starter credit; another month stacks.
  await store.execute('INSERT OR IGNORE INTO wallets(user_id,balance_units) VALUES(?,?)',[target,10000000]);await store.execute('UPDATE wallets SET balance_units=10000000 WHERE user_id=?',[target]);
  assert.equal(await db.purchaseWithWallet(target,'assistant:arash',randomUUID(),210000),true);
  const before=(await call('/api/dashboard/assistant')).data.wallet.toman;
  s=await call('/api/dashboard/assistant');assert.equal(s.data.plan,'arash');assert.equal(s.data.level,1);assert.equal(s.data.wallet.toman,before,'reading twice adds nothing');
  const [starter]=await store.execute("SELECT delta FROM fandogh_ledger WHERE user_id=? AND kind='starter'",[target]);assert.equal(Number(starter.delta),300000,'30,000 toman starter credit');
  assert(!s.data.models.find(m=>m.id==='gemini-flash').locked&&s.data.models.find(m=>m.id==='claude-sonnet').locked);
  const first=s.data.until;assert.equal(await db.purchaseWithWallet(target,'assistant:arash',randomUUID(),210000),true);
  assert.equal((await call('/api/dashboard/assistant')).data.until>first,true,'periods stack');
  const [tx]=await store.execute("SELECT label FROM wallet_transactions WHERE user_id=? AND product_ref='assistant:arash'",[target]);assert.equal(tx.label,'اشتراک فندق «آرش» یک‌ماهه');
  // «کوروش» opens everything; the better plan wins when someone holds two.
  // The starter credit fails right after the purchase is saved: a retry of the same request gives it, once.
  const retryId=randomUUID(),creditFandogh=db.creditFandogh;db.creditFandogh=async()=>{throw new Error('database hiccup');};
  await assert.rejects(()=>db.purchaseWithWallet(target,'assistant:kourosh',retryId,510000));db.creditFandogh=creditFandogh;
  assert.equal(await db.purchaseWithWallet(target,'assistant:kourosh',retryId,510000),false,'the purchase itself is not repeated');
  await db.purchaseWithWallet(target,'assistant:kourosh',retryId,510000);
  assert.equal((await store.execute('SELECT id FROM fandogh_ledger WHERE ref=?',['starter:'+retryId])).length,1,'the starter credit arrives once');
  s=await call('/api/dashboard/assistant');assert.equal(s.data.plan,'kourosh');assert.equal(s.data.level,3);assert(s.data.models.every(m=>!m.locked));
  await assert.rejects(()=>db.purchaseWithWallet(target,'assistant:m9',randomUUID(),20000));
  await assert.rejects(()=>db.purchaseWithWallet(target,'assistant:m1',randomUUID(),20000),'the old monthly plans are no longer sold');
  // Older monthly purchases still count, as «آرش».
  await store.execute("DELETE FROM account_access WHERE user_id=? AND ref LIKE 'assistant:%'",[target]);
  await store.execute("INSERT INTO account_access(user_id,ref,price_units,expires_at,created_at) VALUES(?,?,?,?,?)",[target,'assistant:m3',54000,Date.now()+86400000,Date.now()]);
  assert.equal((await call('/api/dashboard/assistant')).data.plan,'arash');
  await store.execute("DELETE FROM account_access WHERE user_id=? AND ref LIKE 'assistant:%'",[target]);
  // Any subscription includes the assistant.
  await store.execute("INSERT INTO account_access(user_id,ref,price_units,expires_at,created_at) VALUES(?,?,?,?,?)",[target,'subscription:q',288000,Date.now()+86400000,Date.now()]);
  s=await call('/api/dashboard/assistant');assert.equal(s.data.plan,'subscription');assert.equal(s.data.level,3,'a subscription opens every model');
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
  // One person cannot flood the assistant: past 20 questions a minute the answer is 429 until the minute passes.
  const statuses=[];for(let i=0;i<24;i++)statuses.push((await call('/api/dashboard/assistant/ask',{question:'سلام',content})).status);
  assert(statuses.includes(429),'a flood is slowed down');assert(statuses.slice(0,statuses.indexOf(429)).every(x=>x===200));
  console.log('PASS assistant API: free local Fandogh, welcome credit, token pricing with the 50% margin, wallet charges and It top-ups, models grouped with their own prices, plan locks, the three Fandogh plans with starter credit and legacy purchases, a model that is not connected falling back without charge, plan purchases that stack, subscription with every model, validation, private prompt, tagged model actions and local fallback.');
 }finally{store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
