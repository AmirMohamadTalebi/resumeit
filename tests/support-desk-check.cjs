const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
(async()=>{
 const f=await require('./advisor-release-fixture.cjs')(),{db,owner,target,store}=f,agent=randomUUID();store.sql.exec('ALTER TABLE users ADD COLUMN created_at INTEGER');
 try{
  await store.execute('INSERT INTO users(id,phone) VALUES(?,?)',[agent,'09120000555']);await store.execute("INSERT INTO profiles(user_id,name,role,bio) VALUES(?,'پشتیبان آزمایشی','','')",[agent]);await store.execute('INSERT INTO support_accounts(user_id) VALUES(?)',[agent]);
  const ticket=await db.createTicket(target,{subject:'پرداخت شارژ نشد',body:'مبلغ از حساب کم شد ولی کیف پول شارژ نشد.',category:'payment',priority:'high',requestId:randomUUID()});
  const sale=await db.createTicket(target,{subject:'خرید اشتراک سالانه',body:'برای خرید اشتراک سالانه تخفیف دارید؟',category:'sales',priority:'normal',requestId:randomUUID()});
  let list=await db.tickets(null,{});
  assert.equal(list.rows.find(t=>t.id===ticket.id).department,'finance','payment topic lands in finance');
  assert.equal(list.rows.find(t=>t.id===sale.id).department,'sales','sales topic lands in sales');
  assert.deepEqual(list.summary.departments,{finance:1,sales:1});
  assert.equal((await db.tickets(null,{department:'sales'})).total,1);

  // Transfer: recorded as an internal note the customer never sees; repeating the request does nothing new.
  const move=randomUUID();
  await db.transferTicket(agent,sale.id,'finance',{note:'سؤال دربارهٔ پرداخت اقساطی است',requestId:move});
  assert.deepEqual(await db.transferTicket(agent,sale.id,'finance',{note:'سؤال دربارهٔ پرداخت اقساطی است',requestId:move}),{ok:true,repeated:true});
  await assert.rejects(()=>db.transferTicket(agent,sale.id,'finance',{requestId:randomUUID()}),e=>e.status===409);
  await assert.rejects(()=>db.transferTicket(agent,sale.id,'nowhere',{requestId:randomUUID()}));
  await assert.rejects(()=>db.transferTicket(target,sale.id,'sales',{requestId:randomUUID()}),e=>e.status===403,'customers cannot transfer');
  const staffView=await db.ticket(null,sale.id),customerView=await db.ticket(target,sale.id);
  assert.equal(staffView.department,'finance');assert(staffView.messages.some(m=>m.internal&&m.body.includes('بخش مالی')&&m.author==='پشتیبان آزمایشی'));
  assert(!customerView.messages.some(m=>m.internal||m.body.includes('اقساطی')),'internal notes stay hidden from the customer');

  // Internal note and escalation; only an admin closes the escalation; admins are notified.
  await db.ticketNote(agent,ticket.id,'کد رهگیری را در درگاه بررسی کردم.',randomUUID());
  await assert.rejects(()=>db.escalateTicket(agent,ticket.id,{note:'کم',requestId:randomUUID()}),'escalation needs a reason');
  await db.escalateTicket(agent,ticket.id,{note:'نیاز به بررسی تراکنش در پنل بانک',requestId:randomUUID()});
  await assert.rejects(()=>db.escalateTicket(agent,ticket.id,{note:'دوباره ارجاع می‌دهم',requestId:randomUUID()}),e=>e.status===409);
  assert.equal((await db.tickets(null,{escalated:true})).total,1);assert.equal((await db.tickets(null,{})).summary.escalated,1);
  const [alert]=await store.execute("SELECT url FROM user_notifications WHERE user_id=? AND title='ارجاع تیکت به مدیر'",[owner]);assert.equal(alert.url,'/staff/?ticket='+ticket.id);
  assert.equal((await db.ticket(target,ticket.id)).escalation_note,undefined,'customer does not see the escalation');
  await assert.rejects(()=>db.escalateTicket(agent,ticket.id,{resolve:true,requestId:randomUUID()}),e=>e.status===403);
  await db.escalateTicket(owner,ticket.id,{resolve:true,note:'تراکنش تأیید شد',requestId:randomUUID()});
  assert.equal((await db.tickets(null,{escalated:true})).total,0);

  // Credit: limited for agents, linked to the ticket, audited, idempotent, and visible in the customer's wallet.
  const credit=randomUUID();
  await assert.rejects(()=>db.supportCredit(agent,target,{toman:3000,reason:'جبران پرداخت',requestId:randomUUID()}),'whole It only');
  await assert.rejects(()=>db.supportCredit(agent,target,{toman:400000,reason:'جبران پرداخت',requestId:randomUUID()}),e=>e.status===403,'above the per-credit cap');
  await assert.rejects(()=>db.supportCredit(agent,target,{toman:20000,reason:'کم',requestId:randomUUID()}),'reason required');
  await assert.rejects(()=>db.supportCredit(agent,agent,{toman:20000,reason:'شارژ حساب خودم',requestId:randomUUID()}),e=>e.status===409);
  await assert.rejects(()=>db.supportCredit(agent,owner,{toman:20000,reason:'تیکت مال کس دیگری است',ticketId:ticket.id,requestId:randomUUID()}),e=>e.status===409);
  const done=await db.supportCredit(agent,target,{toman:20000,reason:'جبران پرداخت ناموفق',ticketId:ticket.id,requestId:credit});
  assert.equal(done.balance,10);
  assert.deepEqual(await db.supportCredit(agent,target,{toman:20000,reason:'جبران پرداخت ناموفق',ticketId:ticket.id,requestId:credit}),{ok:true,repeated:true,balance:10});
  assert.equal((await db.wallet(target)).balance,10);
  const [audit]=await store.execute("SELECT actor_id,reason FROM admin_audit WHERE action='support-credit'");assert.deepEqual({...audit},{actor_id:agent,reason:'جبران پرداخت ناموفق'});
  assert((await db.ticket(null,ticket.id)).messages.some(m=>m.internal&&m.body.includes('شارژ کیف پول')));
  // Five credits sent at once: the 24-hour cap (1,000,000 toman, 20,000 already used) lets exactly four through.
  const burst=await Promise.allSettled(Array.from({length:5},(_,i)=>db.supportCredit(agent,target,{toman:200000,reason:'جبران پرداخت '+i,requestId:randomUUID()})));
  assert.equal(burst.filter(r=>r.status==='fulfilled').length,4,'parallel credits cannot pass the daily cap together');assert(burst.filter(r=>r.status==='rejected').every(r=>r.reason.status===403));
  await assert.rejects(()=>db.supportCredit(agent,target,{toman:200000,reason:'جبران بیش از سقف',requestId:randomUUID()}),e=>e.status===403,'daily cap per agent');
  await db.supportCredit(owner,target,{toman:400000,reason:'شارژ مدیر بالاتر از سقف پشتیبان',requestId:randomUUID()});

  // Profile: what the agent sees about the customer.
  const profile=await db.supportProfile(agent,target);
  assert.equal(profile.user.id,target);assert(profile.wallet.balance>=10);assert(Array.isArray(profile.payments));assert.equal(profile.tickets.length,2);assert.equal(profile.creditLimits.each,200000);
  await assert.rejects(()=>db.supportProfile(target,owner),e=>e.status===403,'customers cannot read profiles');
  console.log('PASS support desk: departments from topics, transfer with hidden notes, admin escalation and follow-up, internal notes, capped and audited wallet credit, customer profile.');
 }finally{store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
