const { randomBytes, randomUUID, createHash, timingSafeEqual } = require('node:crypto');
const { fail } = require('../dashboard/model.cjs');
const sep = require('./sep.cjs');
const hash = value => createHash('sha256').update(value).digest('hex');
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const reference = /^[A-Za-z0-9+/=_-]{1,50}$/;
const publicOrder = o => ({ id:o.id,provider:o.provider,amount:Number(o.amount_toman),it:Number(o.amount_toman)/2000,status:o.status,rrn:o.rrn||'',trace:o.trace||'',at:Number(o.created_at),updatedAt:Number(o.updated_at) });

function createPayments(database, options = {}) {
  const config=sep.configuration(options.env),provider=options.provider||sep.createSep(options),now=options.now||Date.now;
  const gateways=()=>[{id:'sep',name:'سپ — پرداخت الکترونیک سامان',enabled:config.enabled},{id:'zibal',name:'زیبال',enabled:false}];
  async function start(user, input, origin) {
    if(!config.enabled)fail('سپ هنوز فعال نشده؛ پذیرندگی در حال آماده‌سازی است',503);
    if(!user.phone_verified||!user.phone)fail('برای پرداخت، شمارهٔ حساب را تأیید کن',403);
    if(!Number.isSafeInteger(input.amount)||input.amount<2000||input.amount>100000000||input.amount%2000!==0||typeof input.requestId!=='string'||!/^[a-z0-9_-]{16,64}$/i.test(input.requestId))fail('مبلغ باید مضرب ۲٬۰۰۰ تومان و در محدودهٔ مجاز باشد');
    const secret=randomBytes(32).toString('hex'),time=now();
    const result=await database.createPayment({id:randomUUID(),user_id:user.id,provider:'sep',terminal_id:config.terminal,amount_toman:input.amount,request_id:input.requestId,secret_hash:hash(secret),created_at:time,expires_at:time+20*60000});
    const order=result.order;
    if(result.created) {
      try { const token=await provider.token(order,origin+'/api/payments/sep/callback?key='+secret,user.phone);await database.paymentToken(order.id,token,now()); }
      catch(error) { await database.paymentStartFailed(order.id,now(),/^[A-Z0-9_-]{1,64}$/.test(error.code||'')?error.code:'TOKEN_FAILED');fail('درخواست اتصال به سپ انجام نشد؛ از درخواست تازه استفاده کن',503); }
    } else if(order.status==='creating') {if(now()-Number(order.created_at)>60000)await database.paymentStartFailed(order.id,now());fail('این درخواست هنوز آماده نشده؛ درخواست تازه ایجاد کن',409);}
    else if(order.status==='paid'||order.ref_num)return {id:order.id,url:'/dashboard/wallet/?payment='+order.id};
    else if(order.status!=='pending'||Number(order.expires_at)<=now())fail('این درخواست قابل پرداخت نیست؛ درخواست تازه ایجاد کن',409);
    return {id:order.id,url:'/payments/sep/redirect?id='+order.id};
  }
  async function reverse(order, reason) {
    try {
      const proof=sep.verifiedProof(await provider.reverse(order),order);
      if(!proof.amountRial)throw new Error('INVALID_REVERSE');
      await database.releasePayment(order.id,order.lease_key,'reversed',reason,now());
    } catch { await database.releasePayment(order.id,order.lease_key,'review','REVERSE_UNCONFIRMED',now()); }
  }
  async function verify(id) {
    const order=await database.claimPayment(id,now());
    if(!order)return;
    let bankCode;
    try {
      const response=await provider.verify(order);
      bankCode=Number.isSafeInteger(response?.ResultCode)?'SEP_'+response.ResultCode:null;
      if(response?.ResultCode===5) {await database.releasePayment(id,order.lease_key,'reversed','BANK_REVERSED',now());return;}
      if(Number.isSafeInteger(response?.ResultCode)&&response.ResultCode<0) {await database.releasePayment(id,order.lease_key,'review',bankCode,now());return;}
      const proof=sep.verifiedProof(response,order);
      if(proof.amountRial!==Number(order.amount_toman)*10) {await reverse(order,'AMOUNT_MISMATCH');return;}
      const result=await database.completePayment(order,proof,now());
      if(result?.accountDeleted)await reverse(order,'ACCOUNT_DELETED');
    } catch { await database.releasePayment(id,order.lease_key,'pending',bankCode||'VERIFY_UNCONFIRMED',now(),Math.min(300000,15000*2**Math.min(4,Number(order.attempts)))); }
  }
  async function callback(fields, key) {
    if(!uuid.test(fields.ResNum||'')||!/^[a-f0-9]{64}$/.test(key||''))fail('اطلاعات بازگشت پرداخت معتبر نیست');
    const order=await database.payment(fields.ResNum);
    if(!order||!timingSafeEqual(Buffer.from(order.secret_hash,'hex'),Buffer.from(hash(key),'hex')))fail('درخواست پرداخت پیدا نشد',404);
    if(order.provider!=='sep')fail('درگاه پرداخت مطابقت ندارد',400);
    if(order.status==='paid')return order.id;
    if(fields.State==='OK'&&fields.Status==='2') {
      if(!reference.test(fields.RefNum||'')||String(fields.TerminalId)!==String(order.terminal_id)||Number(fields.Amount)!==Number(order.amount_toman)*10)fail('اطلاعات رسید با درخواست پرداخت مطابقت ندارد',400);
      await database.receivePayment(order.id,fields.RefNum,now());
      // Persist the receipt before network verification; a restart can resume it.
      void verify(order.id).catch(()=>{});
    }
    else if(fields.State==='CanceledByUser'&&fields.Status==='1')await database.cancelPayment(order.id,now());
    return order.id;
  }
  let running=false;
  async function reconcile() {
    if(running||!database.duePayments)return;
    running=true;
    try { for(const order of await database.duePayments(now()))await verify(order.id); } finally {running=false;}
  }
  return {start,callback,verify,reconcile,gateways,enabled:config.enabled,payUrl:provider.payUrl||sep.PAY_URL,publicOrder};
}
module.exports={createPayments,publicOrder,uuid};
