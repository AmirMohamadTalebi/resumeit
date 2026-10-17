const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),{db,target,store}=f;
 try{
  const input={subject:'بررسی ارسال مجدد',body:'این تیکت برای آزمون تلاش دوباره ساخته شده است.',category:'other',priority:'normal',requestId:randomUUID()};
  const first=await db.createTicket(target,input);
  for(let i=0;i<4;i++)await db.createTicket(target,{...input,requestId:randomUUID()});
  assert.deepEqual(await db.createTicket(target,input),first,'retry of a successful ticket survives the hourly limit');
  await assert.rejects(()=>db.createTicket(target,{...input,requestId:randomUUID()}),e=>e.status===429);
  const replyId=randomUUID();await db.replyTicket(target,first.id,'پاسخ آزمایشی',replyId,false,[]);
  await db.ticketStatus(target,first.id,'closed',false);
  assert.deepEqual(await db.replyTicket(target,first.id,'پاسخ آزمایشی',replyId,false,[]),first,'retry of a successful reply survives closing the ticket');
  await assert.rejects(()=>db.replyTicket(target,first.id,'پاسخ جدید',randomUUID(),false,[]),e=>e.status===409);
  await db.ticketStatus(target,first.id,'open',false);
  for(let i=0;i<8;i++)await db.replyTicket(target,first.id,'پاسخ آزمایشی '+i,randomUUID(),false,[]);
  assert.deepEqual(await db.replyTicket(target,first.id,'پاسخ آزمایشی',replyId,false,[]),first,'retry survives the message rate limit');
  await assert.rejects(()=>db.replyTicket(target,first.id,'پاسخ بیش از حد',randomUUID(),false,[]),e=>e.status===429);
  const [count]=await store.execute('SELECT COUNT(*) total FROM support_messages WHERE ticket_id=?',[first.id]);assert.equal(Number(count.total),10);
  await assert.rejects(()=>db.replyTicket(f.owner,first.id,'دسترسی نامعتبر',replyId,false,[]),e=>e.status===404);
  console.log('PASS ticket/reply retries remain idempotent after rate limits or closing; new writes and ownership stay restricted.');
 }finally{store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
