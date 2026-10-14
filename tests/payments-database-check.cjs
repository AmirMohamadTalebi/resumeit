const assert=require('node:assert/strict'),mysql=require('mysql2/promise'),{randomBytes,randomUUID,createHash}=require('node:crypto');
const {openDatabase}=require('../src/database/database.cjs');
try{process.loadEnvFile();}catch(e){if(e.code!=='ENOENT')throw e;}
(async()=>{
  const options={host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD},name='resumeit_payment_check_'+randomBytes(6).toString('hex');
  const admin=await mysql.createConnection(options);let db;
  try{
    await admin.query('CREATE DATABASE `'+name+'`');const config={...options,database:name,connectionLimit:4};db=await openDatabase(config);
    const passwordHash='scrypt$'+randomBytes(16).toString('hex')+'$'+randomBytes(64).toString('hex');
    const owner=await db.provisionAccount('09120000711',passwordHash),other=await db.provisionAccount('09120000712',passwordHash),now=Date.now();
    const make=(user=owner)=>({id:randomUUID(),user_id:user,provider:'sep',terminal_id:2015,amount_toman:100000,request_id:randomUUID(),secret_hash:createHash('sha256').update(randomBytes(32)).digest('hex'),created_at:now,expires_at:now+1200000});
    const order=make(),starts=await Promise.all(Array.from({length:4},()=>db.createPayment(order)));assert.equal(starts.filter(r=>r.created).length,1);assert.equal(new Set(starts.map(r=>r.order.id)).size,1);
    await assert.rejects(db.createPayment({...order,amount_toman:102000}),e=>e.status===409);await assert.rejects(db.createPayment({...make(),amount_toman:45000}));
    await db.paymentToken(order.id,'a'.repeat(32),now);await db.receivePayment(order.id,'BANK/REF+SQL',now);
    const claims=await Promise.all(Array.from({length:4},()=>db.claimPayment(order.id,now)));assert.equal(claims.filter(Boolean).length,1);const lease=claims.find(Boolean);
    const proof={amountRial:1000000,rrn:'1200012345',trace:'1000123'};
    await Promise.all(Array.from({length:4},()=>db.completePayment(lease,proof,now)));
    assert.equal((await db.wallet(owner)).balance,50);assert.equal((await db.wallet(owner)).transactions.length,1);assert.equal((await db.payment(order.id)).status,'paid');
    const billing=await db.billing(owner);assert.equal(billing.payments.length,1);assert.equal(billing.payments[0].amount,100000);assert.equal((await db.paymentsForUser(other)).length,0);
    const duplicate=make();await db.createPayment(duplicate);await db.paymentToken(duplicate.id,'b'.repeat(32),now);await assert.rejects(db.receivePayment(duplicate.id,'BANK/REF+SQL',now),e=>e.status===409);
    const retry=make();await db.createPayment(retry);await db.paymentToken(retry.id,'c'.repeat(32),now);await db.receivePayment(retry.id,'BANK-RETRY',now);const old=await db.claimPayment(retry.id,now);
    await db.close();db=await openDatabase(config);assert.equal((await db.wallet(owner)).balance,50);assert.equal(await db.claimPayment(retry.id,now+10000),null);
    const fresh=await db.claimPayment(retry.id,now+31000);assert(fresh);assert.notEqual(fresh.lease_key,old.lease_key);assert.equal(await db.completePayment(old,proof,now+31000),null);await db.completePayment(fresh,proof,now+31000);assert.equal((await db.wallet(owner)).balance,100);
    const wrong=make();await db.createPayment(wrong);await db.paymentToken(wrong.id,'d'.repeat(32),now);await db.receivePayment(wrong.id,'BANK-WRONG',now);const wrongLease=await db.claimPayment(wrong.id,now);await assert.rejects(db.completePayment(wrongLease,{...proof,amountRial:2000000},now));assert.equal((await db.wallet(owner)).balance,100);
    await db.releasePayment(wrong.id,wrongLease.lease_key,'pending','NETWORK',now,30000);assert.equal(await db.claimPayment(wrong.id,now+10000),null);assert((await db.duePayments(now+31000)).some(o=>o.id===wrong.id));
    const deleted=make(other);await db.createPayment(deleted);await db.paymentToken(deleted.id,'e'.repeat(32),now);await db.deleteAccount(other);assert.equal((await db.payment(deleted.id)).user_id,null);await db.receivePayment(deleted.id,'BANK-DELETED',now);const gone=await db.claimPayment(deleted.id,now);assert.equal((await db.completePayment(gone,proof,now)).accountDeleted,true);
    const list=await db.adminList('payments',{page:1,q:'BANK',from:0,status:'paid'});assert.equal(list.total,0,'search excludes secret provider receipt');
    const all=await db.adminList('payments',{page:1,q:'',from:0,status:'paid'});assert.equal(all.total,2);assert(!JSON.stringify(all).includes('token'));assert(!JSON.stringify(all).includes('secret_hash'));
    const until=Number(wrongLease.verify_until);await db.claimPayment(wrong.id,until+1);assert.equal((await db.payment(wrong.id)).status,'review');
    const cancelled=make();await db.createPayment(cancelled);await db.paymentToken(cancelled.id,'f'.repeat(32),now);await db.cancelPayment(cancelled.id,now);assert.equal((await db.payment(cancelled.id)).status,'cancelled');await db.receivePayment(cancelled.id,'LATE-CANCEL',now);assert(await db.claimPayment(cancelled.id,now));
    const expired=make();await db.createPayment(expired);await db.paymentToken(expired.id,'g'.repeat(32),now);await db.duePayments(now+1200001);assert.equal((await db.payment(expired.id)).status,'expired');await db.receivePayment(expired.id,'LATE-EXPIRED',now+1200001);assert(await db.claimPayment(expired.id,now+1200001));
    const abandoned=make();await db.createPayment(abandoned);await db.duePayments(now+61000);assert.equal((await db.payment(abandoned.id)).status,'failed');assert.equal((await db.payment(abandoned.id)).last_error,'TOKEN_INTERRUPTED');
    console.log('PASS: real MySQL checkout idempotency/concurrency, unique bank receipts, atomic wallet credit, failed amount rollback, restart/stale lease recovery, retry scheduling, financial tombstone after deletion and private admin projections.');
  }finally{await db?.close();await admin.query('DROP DATABASE IF EXISTS `'+name+'`');await admin.end();}
})().catch(e=>{console.error('Payment MySQL check failed:',e.code==='ERR_ASSERTION'?e.stack:e.code||e.name);process.exitCode=1;});
