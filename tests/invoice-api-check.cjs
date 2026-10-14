const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createServer}=require('../src/http/server.cjs');
const wait=async(db,id,status)=>{for(let i=0;i<100;i++){const row=await db.payment(id);if(row.status===status)return row;await new Promise(r=>setTimeout(r,5));}assert.fail('Status did not reach '+status);};
(async()=>{
  const f=await require('./payments-fixture.cjs')();Object.assign(f.options.payments.env,{ZIBAL_ENABLED:'true',ZIBAL_MERCHANT_ID:'m'.repeat(36)});
  const server=createServer(f.db,f.options);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const request=(path,body,cookie='a',origin=base)=>fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{...(cookie?{Cookie:'ri_session='+cookie.repeat(64)}:{}),...(body?{Origin:origin,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const invoice=async(amount=100000,key=randomUUID())=>{const response=await request('/api/payments/invoices',{amount,requestId:key});assert.equal(response.status,200);return response.json();};
  const pay=(id,provider)=>request('/api/payments/invoices/'+id+'/pay',{provider,amount:2});
  const callback=id=>{const {url,token}=f.zibal.tokens.get(id),target=new URL(url);for(const [k,v]of Object.entries({trackId:token,orderId:id,success:'1'}))target.searchParams.set(k,v);return fetch(target,{redirect:'manual'});};
  try{
    assert.equal((await request('/api/payments/invoices',{amount:100000,requestId:randomUUID()},null)).status,401);assert.equal((await request('/api/payments/invoices',{amount:100000,requestId:randomUUID()},'a','https://evil.example')).status,403);
    for(const amount of [45000,-1,100000.5,'100000'])assert.equal((await request('/api/payments/invoices',{amount,requestId:randomUUID()})).status,400);
    const key=randomUUID(),first=await invoice(100000,key);assert.equal((await invoice(100000,key)).id,first.id);assert.equal((await request('/api/payments/invoices',{amount:102000,requestId:key})).status,409);
    assert.equal((await request(first.url,null,'b')).status,404);assert.equal((await request(first.url,null,null)).status,303);
    const page=await request(first.url);assert.equal(page.status,200);const html=await page.text();assert(html.includes('پیش‌فاکتور شارژ کیف پول'));assert(html.includes('value="sep"'));assert(html.includes('value="zibal"'));assert(html.includes('۱۰۰٬۰۰۰ تومان'));assert.equal((await pay(first.id,'evil')).status,400);assert.equal((await request('/api/payments/invoices/'+first.id+'/pay')).status,405);
    const starts=await Promise.all([pay(first.id,'sep'),pay(first.id,'zibal')]);assert.equal(starts.filter(r=>r.status===200).length,1);assert.equal(starts.filter(r=>r.status===409).length,1);assert.equal((await f.db.payment(first.id)).amount_toman,100000,'client amount cannot replace invoice');
    const second=await invoice(),start=await pay(second.id,'zibal');assert.equal(start.status,200);assert.equal((await(await pay(second.id,'zibal')).json()).id,second.id);assert.equal(f.zibal.tokenCalls,1);
    const redirect=await request((await start.json()).url);assert.equal(redirect.status,303);assert(redirect.headers.get('location').startsWith('https://gateway.zibal.ir/start/'));
    const target=new URL(f.zibal.tokens.get(second.id).url);target.searchParams.set('orderId',second.id);target.searchParams.set('trackId','1');target.searchParams.set('success','1');assert.equal((await fetch(target)).status,400);
    const unpaid=await callback(second.id);assert.equal(unpaid.status,303);await wait(f.db,second.id,'pending');assert.equal((await f.db.wallet(f.owner)).balance,0,'success query alone cannot credit');
    f.zibal.paid.add(f.zibal.tokens.get(second.id).token);
    const originalSession=f.db.session;f.db.session=async()=>{assert.fail('Zibal callback must never check user session');};
    try{
      const callbacks=await Promise.all(Array.from({length:4},()=>callback(second.id)));assert(callbacks.every(r=>r.status===303));
      const token=f.zibal.tokens.get(second.id),postUrl=new URL(token.url);
      const serverPost=await fetch(postUrl,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:'ri_session=expired'},body:new URLSearchParams({trackId:token.token,orderId:second.id,success:'1'})});assert.equal(serverPost.status,303);
      await wait(f.db,second.id,'paid');
    }finally{f.db.session=originalSession;}
assert.equal(f.db.paymentCredits.length,1);assert.equal((await f.db.wallet(f.owner)).balance,50);
    const paidPage=await request('/payments/result?id='+second.id);const paidHtml=await paidPage.text();assert(paidHtml.includes('فاکتور شارژ کیف پول'));assert(paidHtml.includes('12312121'));assert(paidHtml.includes('۵۰ It'));assert(!paidHtml.includes('secret_hash'));assert(!paidHtml.includes('merchant'));assert.equal((await request('/payments/result?id='+second.id,null,'b')).status,404);assert.equal((await request(second.url)).status,303);
    const third=await invoice();await pay(third.id,'zibal');f.zibal.paid.add(f.zibal.tokens.get(third.id).token);f.advance(60000);await require('../src/payments/service.cjs').createPayments(f.db,f.options.payments).reconcile();await wait(f.db,third.id,'paid');assert.equal((await f.db.wallet(f.owner)).balance,100,'inquiry recovers payment without browser callback');
    const fourth=await invoice();await pay(fourth.id,'zibal');f.zibal.mode='cancelled';await callback(fourth.id);await wait(f.db,fourth.id,'cancelled');assert.equal((await f.db.wallet(f.owner)).balance,100);
    const fifth=await invoice();f.zibal.mode='ok';await pay(fifth.id,'zibal');f.zibal.paid.add(f.zibal.tokens.get(fifth.id).token);f.zibal.mode='wrong-amount';await callback(fifth.id);await wait(f.db,fifth.id,'review');assert.equal((await f.db.payment(fifth.id)).last_error,'REFUND_REQUIRED_AMOUNT_MISMATCH');assert.equal((await f.db.wallet(f.owner)).balance,100);
    const slow=await invoice();f.zibal.mode='ok';await pay(slow.id,'zibal');const service=require('../src/payments/service.cjs').createPayments(f.db,f.options.payments);for(let i=0;i<15;i++){f.advance(60000);await service.reconcile();}assert.equal((await f.db.payment(slow.id)).status,'pending');assert.equal((await f.db.payment(slow.id)).attempts,0,'unpaid checks do not exhaust verification retry budget');f.zibal.paid.add(f.zibal.tokens.get(slow.id).token);await callback(slow.id);await wait(f.db,slow.id,'paid');assert.equal((await f.db.wallet(f.owner)).balance,150);
    const expired=await invoice();f.advance(25*3600000);assert.equal((await pay(expired.id,'sep')).status,409);
    console.log('PASS: persistent/idempotent private invoices, immutable amount, exclusive gateway selection, both redirects, verified-only Zibal credits, concurrent callback dedupe, lost-callback reconciliation, cancellation, refund review, invoice/result privacy and expiry; gateways mocked.');
  }finally{await new Promise(r=>server.close(r));await f.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
