const { randomBytes, randomUUID, createHash, timingSafeEqual } = require('node:crypto');
const { fail } = require('../dashboard/model.cjs');
const sep = require('./sep.cjs'),zibal=require('./zibal.cjs');
const hash = value => createHash('sha256').update(value).digest('hex');
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const reference = /^[A-Za-z0-9+/=_-]{1,50}$/;
const publicOrder = o => ({ id:o.id,provider:o.provider,amount:Number(o.amount_toman),it:Number(o.credit_units??o.amount_toman)/2000,status:o.status,rrn:o.rrn||'',trace:o.trace||'',at:Number(o.created_at),updatedAt:Number(o.updated_at) });

function createPayments(database, options = {}) {
  const configs={sep:sep.configuration(options.env),zibal:zibal.configuration(options.env)},providers={sep:options.provider||options.providers?.sep||sep.createSep(options),zibal:options.providers?.zibal||zibal.createZibal(options)},now=options.now||Date.now;
  const gateways=async()=>{const policy=database.paymentPolicy?await database.paymentPolicy():{sep:true,zibal:true};return [{id:'sep',name:'سپ — پرداخت الکترونیک سامان',enabled:configs.sep.enabled&&policy.sep},{id:'zibal',name:'زیبال',enabled:configs.zibal.enabled&&policy.zibal}];};
  async function invoice(user,input){
    if(!user.phone_verified||!user.phone)fail('برای پرداخت، شمارهٔ حساب را تأیید کن',403);
    const rate=database.commerceSettings?(await database.commerceSettings()).rate:2000;
    const time=now(),row=await database.createInvoice({id:randomUUID(),user_id:user.id,amount_toman:input.amount,...require('../owner/settings.cjs').quote(input.amount,rate),request_id:input.requestId,created_at:time,expires_at:time+24*3600000});
    return {id:row.id,url:'/payments/checkout?id='+row.id};
  }
  async function start(user, input, origin, gateway='sep') {
    if(!configs[gateway])fail('درگاه معتبر نیست',404);
    const config=configs[gateway],provider=providers[gateway];
    if(!(await gateways()).find(g=>g.id===gateway)?.enabled)fail('درگاه انتخاب‌شده برای پرداخت جدید فعال نیست',503);
    let invoiceId,quote;
    if(input.invoiceId){
      if(!uuid.test(input.invoiceId))fail('پیش‌فاکتور معتبر نیست');
      const row=await database.invoice(input.invoiceId);if(!row||row.user_id!==user.id)fail('پیش‌فاکتور پیدا نشد',404);
      const existing=await database.payment(row.id);if(existing?.status==='paid'||existing?.ref_num&&existing.provider==='sep')return {id:row.id,url:'/payments/result?id='+row.id};
      if(Number(row.expires_at)<=now())fail('مهلت پیش‌فاکتور تمام شد؛ پیش‌فاکتور تازه بساز',409);
      invoiceId=row.id;input={amount:Number(row.amount_toman),requestId:row.request_id};quote={it_rate:Number(row.it_rate||2000),credit_units:Number(row.credit_units??row.amount_toman)};
    }
    if(!user.phone_verified||!user.phone)fail('برای پرداخت، شمارهٔ حساب را تأیید کن',403);
    if(!Number.isSafeInteger(input.amount)||input.amount<2000||input.amount>100000000||input.amount%2000!==0||typeof input.requestId!=='string'||!/^[a-z0-9_-]{16,64}$/i.test(input.requestId))fail('مبلغ باید مضرب ۲٬۰۰۰ تومان و در محدودهٔ مجاز باشد');
    const secret=randomBytes(32).toString('hex'),time=now();
    quote ||= require('../owner/settings.cjs').quote(input.amount,database.commerceSettings?(await database.commerceSettings()).rate:2000);
    const result=await database.createPayment({id:invoiceId||randomUUID(),user_id:user.id,provider:gateway,terminal_id:config.terminal||0,amount_toman:input.amount,...quote,request_id:input.requestId,secret_hash:hash(secret),created_at:time,expires_at:time+20*60000});
    const order=result.order;
    if(result.created) {
      try { const token=await provider.token(order,origin+'/api/payments/'+gateway+'/callback?key='+secret+'&id='+order.id,user.phone);await database.paymentToken(order.id,token,now());if(gateway==='zibal')await database.receivePayment(order.id,token,now()); }
      catch(error) { await database.paymentStartFailed(order.id,now(),/^[A-Z0-9_-]{1,64}$/.test(error.code||'')?error.code:'TOKEN_FAILED');fail('اتصال به درگاه انجام نشد؛ پیش‌فاکتور تازه بساز',503); }
    } else if(order.status==='creating') {if(now()-Number(order.created_at)>60000)await database.paymentStartFailed(order.id,now());fail('این درخواست هنوز آماده نشده؛ درخواست تازه ایجاد کن',409);}
    else if(order.status==='paid'||order.ref_num&&gateway==='sep')return {id:order.id,url:'/payments/result?id='+order.id};
    else if(order.status!=='pending'||Number(order.expires_at)<=now())fail('این درخواست قابل پرداخت نیست؛ درخواست تازه ایجاد کن',409);
    return {id:order.id,url:'/payments/'+gateway+'/redirect?id='+order.id};
  }
  async function reverse(order, reason) {
    const provider=providers[order.provider];
    if(!provider.reverse){await database.releasePayment(order.id,order.lease_key,'review','REFUND_REQUIRED_'+reason,now());return;}
    try {
      const proof=sep.verifiedProof(await provider.reverse(order),order);
      if(!proof.amountRial)throw new Error('INVALID_REVERSE');
      await database.releasePayment(order.id,order.lease_key,'reversed',reason,now());
    } catch { await database.releasePayment(order.id,order.lease_key,'review','REVERSE_UNCONFIRMED',now()); }
  }
  async function verify(id) {
    const order=await database.claimPayment(id,now());
    if(!order)return;
    const provider=providers[order.provider];
    let bankCode;
    try {
      const response=await provider.verify(order);
      const code=order.provider==='sep'?response?.ResultCode:response?.result;
      bankCode=Number.isSafeInteger(code)?order.provider.toUpperCase()+'_'+code:null;
      if(order.provider==='zibal'&&code===100&&response.status!==1){
        const status=response.status===-1?(Number(order.expires_at)<=now()?'expired':'pending'):response.status===3?'cancelled':[15,18].includes(response.status)?'reversed':response.status===16?'review':'failed';
        if(status==='pending'){await database.paymentUnpaid(id,order.lease_key,now());return;}
        await database.releasePayment(id,order.lease_key,status,'ZIBAL_STATUS_'+response.status,now(),60000);return;
      }
      if(order.provider==='zibal'&&[102,103,104,202,203].includes(code)){await database.releasePayment(id,order.lease_key,code===202?'failed':'review',bankCode,now());return;}
      if(response?.ResultCode===5) {await database.releasePayment(id,order.lease_key,'reversed','BANK_REVERSED',now());return;}
      if(Number.isSafeInteger(response?.ResultCode)&&response.ResultCode<0) {await database.releasePayment(id,order.lease_key,'review',bankCode,now());return;}
      const proof=(order.provider==='sep'?sep:zibal).verifiedProof(response,order);
      if(proof.amountRial!==Number(order.amount_toman)*10) {await reverse(order,'AMOUNT_MISMATCH');return;}
      const result=await database.completePayment(order,proof,now());
      if(result?.accountDeleted)await reverse(order,'ACCOUNT_DELETED');
      else if(result?.status==='paid'&&database.notify)await database.notify(order.user_id,'payments','کیف پول شارژ شد',String(Number(order.credit_units??order.amount_toman)/2000)+' It به موجودی اضافه شد.','/dashboard/wallet/?payment='+order.id,'credit:'+order.id).catch(()=>{});
    } catch(error) { await database.releasePayment(id,order.lease_key,error.code==='ZIBAL_PAYMENT_MISMATCH'?'review':'pending',error.code==='ZIBAL_PAYMENT_MISMATCH'?error.code:bankCode||'VERIFY_UNCONFIRMED',now(),Math.min(300000,15000*2**Math.min(4,Number(order.attempts)))); }
  }
  async function callback(fields, key, gateway='sep') {
    if(!uuid.test(fields.ResNum||'')||!/^[a-f0-9]{64}$/.test(key||''))fail('اطلاعات بازگشت پرداخت معتبر نیست');
    const order=await database.payment(fields.ResNum);
    if(!order||!timingSafeEqual(Buffer.from(order.secret_hash,'hex'),Buffer.from(hash(key),'hex')))fail('درخواست پرداخت پیدا نشد',404);
    if(order.provider!==gateway)fail('درگاه پرداخت مطابقت ندارد',400);
    if(order.status==='paid')return order.id;
    if(gateway==='zibal'){
      if(!/^[1-9]\d{0,15}$/.test(fields.trackId||'')||String(order.token)!==fields.trackId||fields.orderId!==order.id)fail('شناسهٔ تراکنش زیبال مطابقت ندارد');
      if(!['1','0'].includes(fields.success))fail('وضعیت بازگشت زیبال معتبر نیست');
      await database.receivePayment(order.id,fields.trackId,now());void verify(order.id).catch(()=>{});
    }
    else if(fields.State==='OK'&&fields.Status==='2') {
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
    try {
      const due=await database.duePayments(now());let cursor=0;
      // Three bounded workers keep a slow bank response from blocking every later order.
      await Promise.all(Array.from({length:Math.min(3,due.length)},async()=>{while(cursor<due.length){const order=due[cursor++];await verify(order.id);}}));
    } finally {running=false;}
  }
  return {invoice,start,callback,verify,reconcile,gateways,enabled:configs.sep.enabled||configs.zibal.enabled,payUrl:providers.sep.payUrl||sep.PAY_URL,publicOrder};
}
module.exports={createPayments,publicOrder,uuid};
