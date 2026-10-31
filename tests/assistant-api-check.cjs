const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),llm=require('../src/ai/assistant-llm.cjs'),route=require('../src/dashboard/assistant.cjs');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),{db,target,store}=f;
 try{
  const origin='http://127.0.0.1',call=async(path,body,method=body?'POST':'GET')=>{let out;const req={method,headers:{origin,'content-type':'application/json'},resume(){},async *iterator(){if(body)yield Buffer.from(JSON.stringify(body));}};
   try{await route(db,req,path,origin,{id:target},(status,data)=>{out={status,data};});}catch(e){out={status:e.status||500,data:{error:e.message}};}return out;};
  const content={profile:{name:'امیرمحمد طالبی',title:'دانشجوری کامپیوتر',bio:'Code Lover',avatar:'data:image/png;base64,AAAA'},skills:[{name:'Figma'}],experience:[],education:[],projects:[{title:'ResumeIt'}],contacts:[{type:'phone',value:'09120000000',public:true}],socials:[]};
  // Free allowance: five questions a day, then a clear refusal with the plans to buy.
  let s=await call('/api/dashboard/assistant');assert.equal(s.status,200);assert.equal(s.data.plan,'free');assert.equal(s.data.limit,5);assert.equal(s.data.plans.length,3);assert.equal(s.data.ai,false);
  for(let i=0;i<5;i++){const r=await call('/api/dashboard/assistant/ask',{question:'من فول استک دولوپر هستم',content});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.reply.source,'local');assert.equal(r.data.usage.remaining,4-i);}
  const r1=await call('/api/dashboard/assistant/ask',{question:'سلام',content});assert.equal(r1.data.code,'ASSISTANT_LIMIT');assert.equal(r1.status,429);assert.equal(r1.data.usage.plans.length,3);
  // The local brain understood the statement and the typo.
  const local=require('../dist/dashboard/js/advisor-brain.js').reply('من فول استک دولوپر هستم',content);assert.equal(local.intent,'statement');assert(local.actions.some(a=>a.kind==='title'&&a.value==='توسعه‌دهندهٔ فول‌استک'));
  // Buying the assistant alone: priced by the month, stacks, and lifts the allowance.
  await store.execute('INSERT OR IGNORE INTO wallets(user_id,balance_units) VALUES(?,?)',[target,200000]);await store.execute('UPDATE wallets SET balance_units=200000 WHERE user_id=?',[target]);
  assert.equal(await db.purchaseWithWallet(target,'assistant:m1',randomUUID(),20000),true);
  s=await call('/api/dashboard/assistant');assert.equal(s.data.plan,'assistant');assert.equal(s.data.limit,200);assert.equal(s.data.remaining,195);
  const first=s.data.until;assert.equal(await db.purchaseWithWallet(target,'assistant:m3',randomUUID(),54000),true);
  assert.equal((await call('/api/dashboard/assistant')).data.until>first,true,'periods stack');
  const [tx]=await store.execute("SELECT label FROM wallet_transactions WHERE user_id=? AND product_ref='assistant:m3'",[target]);assert.equal(tx.label,'دستیار هوشمند سه‌ماهه');
  await assert.rejects(()=>db.purchaseWithWallet(target,'assistant:m9',randomUUID(),20000));
  // Any subscription includes the assistant.
  await store.execute("INSERT INTO account_access(user_id,ref,price_units,expires_at,created_at) VALUES(?,?,?,?,?)",[target,'subscription:q',288000,Date.now()+86400000,Date.now()]);
  assert.equal((await call('/api/dashboard/assistant')).data.plan,'subscription');
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
  console.log('PASS assistant API: daily free allowance with limit refusal and plans, monthly assistant purchase that stacks, subscription inclusion, validation, private prompt, tagged model actions and local fallback.');
 }finally{store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
