const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createServer}=require('../src/http/server.cjs');
const {createPayments}=require('../src/payments/service.cjs');
const waitPaid=async(db,id,status='paid')=>{for(let i=0;i<100;i++){const o=await db.payment(id);if(o.status===status)return o;await new Promise(r=>setTimeout(r,5));}assert.fail('Payment did not reach '+status);};
(async()=>{
  const f=await require('./payments-fixture.cjs')(),server=createServer(f.db,f.options);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const request=(path,body,cookie='a',origin=base)=>fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{...(cookie?{Cookie:'ri_session='+cookie.repeat(64)}:{}),...(body?{Origin:origin,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const start=async(amount=100000,id=randomUUID())=>{const r=await request('/api/payments/sep/start',{amount,requestId:id});assert.equal(r.status,200);return r.json();};
  const callback=async(id,ref,extra={},post=false)=>{const key=new URL(f.bank.tokens.get(id).url).searchParams.get('key'),fields={ResNum:id,RefNum:ref,TerminalId:'2015',State:'OK',Status:'2',Amount:'1000000',...extra};const query=new URLSearchParams({key,...(post?{}:fields)});return fetch(base+'/api/payments/sep/callback?'+query,{method:post?'POST':'GET',redirect:'manual',headers:post?{'Content-Type':'application/x-www-form-urlencoded'}:{},body:post?new URLSearchParams(fields):undefined});};
  try{
    assert.equal((await request('/api/payments/options',null,null)).status,401);
    assert.equal((await request('/api/payments/sep/callback',null,null)).status,200);
    assert.equal((await request('/api/payments/sep/start',{amount:100000,requestId:randomUUID()},'a','https://evil.example')).status,403);
    for(const amount of [0,-2000,45000,100000.5,'100000',100002000])assert.equal((await request('/api/payments/sep/start',{amount,requestId:randomUUID()})).status,400);
    assert.equal((await request('/api/payments/sep/start',{amount:100000,requestId:randomUUID()},'b')).status,403,'phone proof required');
    const requestId=randomUUID(),order=await start(100000,requestId),retry=await start(100000,requestId);assert.equal(order.id,retry.id);assert.equal(f.bank.tokenCalls,1);
    assert.equal((await request('/api/payments/sep/start',{amount:102000,requestId})).status,409);
    const bridge=await request(order.url);assert.equal(bridge.status,200);assert.equal(bridge.headers.get('referrer-policy'),'origin');assert(bridge.headers.get('content-security-policy').includes("form-action 'self' https://sep.shaparak.ir"));assert((await bridge.text()).includes('name="Token"'));assert.equal((await request(order.url,null,'b')).status,404);
    const status=await(await request('/api/payments/orders/'+order.id)).json();assert.equal(status.order.it,50);assert(!JSON.stringify(status).includes('token'));assert.equal((await request('/api/payments/orders/'+order.id,null,'b')).status,404);
    assert.equal((await request('/api/payments/sep/callback?ResNum='+order.id+'&key='+'0'.repeat(64),null,null)).status,404);
    assert.equal((await request('/api/payments/sep/callback?ResNum='+order.id+'&ResNum='+order.id+'&key='+'0'.repeat(64),null,null)).status,400);
    assert.equal((await request('/api/payments/sep/callback',{ResNum:order.id},null)).status,415);
    assert.equal((await callback(order.id,'Ref/1+X',{Amount:'2000000'})).status,400);assert.equal((await f.db.wallet(f.owner)).balance,0);
    const responses=await Promise.all(Array.from({length:5},()=>callback(order.id,'Ref/1+X',{},true)));assert(responses.every(r=>r.status===303));await waitPaid(f.db,order.id);
    assert.equal((await f.db.wallet(f.owner)).balance,50);assert.equal(f.db.paymentCredits.length,1);assert.equal(f.bank.verifyCalls,1);
    assert.equal((await callback(order.id,'Ref/1+X')).status,303);assert.equal(f.db.paymentCredits.length,1);
    const second=await start();assert.equal((await callback(second.id,'Ref/1+X')).status,409);assert.equal(f.db.paymentCredits.length,1);
    const third=await start();f.bank.mode='network';assert.equal((await callback(third.id,'Ref2')).status,303);await waitPaid(f.db,third.id,'pending');assert.equal((await f.db.wallet(f.owner)).balance,50);
    f.advance(60000);f.bank.mode='duplicate';await createPayments(f.db,f.options.payments).reconcile();await waitPaid(f.db,third.id);assert.equal((await f.db.wallet(f.owner)).balance,100);
    const fourth=await start();f.bank.mode='wrong-amount';assert.equal((await callback(fourth.id,'Ref3')).status,303);await waitPaid(f.db,fourth.id,'reversed');assert.equal(f.bank.reverseCalls,1);assert.equal((await f.db.wallet(f.owner)).balance,100);
    const fifth=await start();f.bank.mode='network';await callback(fifth.id,'Ref4');await waitPaid(f.db,fifth.id,'pending');f.advance(26*60000);await createPayments(f.db,f.options.payments).reconcile();assert.equal((await f.db.payment(fifth.id)).status,'review');
    f.bank.mode='token-error';const failed=await request('/api/payments/sep/start',{amount:100000,requestId:randomUUID()});assert.equal(failed.status,503);
    const listing=await(await request('/api/admin/payments')).json();assert(listing.total>=5);assert(!JSON.stringify(listing).includes('secret_hash'));assert(!JSON.stringify(listing).includes('token'));assert.equal((await request('/api/admin/payments',null,'b')).status,403);
    const enabled=await(await request('/api/payments/options')).json();assert.equal(enabled.gateways.find(g=>g.id==='sep').enabled,true);assert.equal(enabled.gateways.find(g=>g.id==='zibal').enabled,false);
    assert.equal((await request('/api/payments/zibal/start',{},'a')).status,503);
    const limited=await Promise.all(Array.from({length:12},()=>request('/api/payments/sep/start',{amount:100000,requestId:randomUUID()})));assert(limited.some(r=>r.status===429));
    console.log('PASS: authenticated/CSRF checkout, owner isolation, secret callback, duplicate/concurrent receipts, exact amounts, one credit, retry after lost response, reversal, expiry review, admin journal and rate limit; bank mocked.');
  }finally{await new Promise(r=>server.close(r));await f.db.close();}
  const edge=await require('./payments-fixture.cjs')();
  try {
    const active=createPayments(edge.db,edge.options.payments),paused=createPayments(edge.db,{...edge.options.payments,env:{SEP_ENABLED:'false',SEP_TERMINAL_ID:'2015'}}),user={id:edge.owner,phone:'09120000123',phone_verified:true};
    const begin=()=>active.start(user,{amount:100000,requestId:randomUUID()},'https://resumeit.ir');
    const fields=(id,ref)=>({ResNum:id,RefNum:ref,TerminalId:'2015',State:'OK',Status:'2',Amount:'1000000'});
    const key=id=>new URL(edge.bank.tokens.get(id).url).searchParams.get('key');
    await assert.rejects(paused.start(user,{amount:100000,requestId:randomUUID()},'https://resumeit.ir'),e=>e.status===503);
    const cancelled=await begin();await active.callback({...fields(cancelled.id,''),State:'CanceledByUser',Status:'1'},key(cancelled.id));assert.equal((await edge.db.payment(cancelled.id)).status,'cancelled');assert.equal(edge.bank.verifyCalls,0);
    await paused.callback(fields(cancelled.id,'LATE-CANCEL'),key(cancelled.id));await waitPaid(edge.db,cancelled.id);assert.equal((await edge.db.wallet(edge.owner)).balance,50,'pause blocks starts but settles pending callbacks');
    const expired=await begin();edge.advance(21*60000);await paused.reconcile();assert.equal((await edge.db.payment(expired.id)).status,'expired');await active.callback(fields(expired.id,'LATE-EXPIRED'),key(expired.id));await waitPaid(edge.db,expired.id);assert.equal((await edge.db.wallet(edge.owner)).balance,100);
    const rejected=await begin();edge.bank.mode='rejected';await active.callback(fields(rejected.id,'REJECTED'),key(rejected.id));await waitPaid(edge.db,rejected.id,'review');assert.equal((await edge.db.payment(rejected.id)).last_error,'SEP_-106');const calls=edge.bank.verifyCalls;edge.advance(60000);await paused.reconcile();assert.equal(edge.bank.verifyCalls,calls,'explicit bank rejection is not retried');
    const deleted=await begin(),unconfirmed=await begin();await edge.db.deleteAccount(edge.owner);edge.bank.mode='ok';await paused.callback(fields(deleted.id,'DELETED'),key(deleted.id));await waitPaid(edge.db,deleted.id,'reversed');assert.equal(edge.bank.reverseCalls,1);
    edge.bank.mode='reverse-error';await paused.callback(fields(unconfirmed.id,'REVERSE-UNKNOWN'),key(unconfirmed.id));await waitPaid(edge.db,unconfirmed.id,'review');assert.equal((await edge.db.payment(unconfirmed.id)).last_error,'REVERSE_UNCONFIRMED');assert.equal(edge.db.paymentCredits.length,2,'deleted account never receives a credit');
    console.log('PASS: cancellation/expiry with late verified callbacks, paused gateway settlement, bank rejection stops retries, deleted account reversal and uncertain reversal review.');
  }finally{await edge.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
