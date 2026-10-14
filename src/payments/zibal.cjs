const ROOT='https://gateway.zibal.ir';
function configuration(env=process.env){
  const merchant=String(env.ZIBAL_MERCHANT_ID||'').trim();
  return {enabled:['true','1'].includes(env.ZIBAL_ENABLED)&&/^[A-Za-z0-9_-]{16,128}$/.test(merchant),merchant};
}
function createZibal({fetch:request=global.fetch,env}={}){
  const post=require('./transport.cjs')(request),{merchant}=configuration(env);
  return {
    payUrl:ROOT+'/start/',
    async token(order,callbackUrl,mobile){
      const result=await post(ROOT+'/v1/request',{merchant,amount:Number(order.amount_toman)*10,callbackUrl,orderId:order.id,description:'شارژ کیف پول ResumeIt',mobile});
      if(result.result!==100||!Number.isSafeInteger(result.trackId)||result.trackId<=0){const error=Error('ZIBAL_REQUEST_REJECTED');if(Number.isSafeInteger(result.result))error.code='ZIBAL_'+result.result;throw error;}
      return String(result.trackId);
    },
    async verify(order){
      const body={merchant,trackId:Number(order.token)};
      let result=await post(ROOT+'/v1/inquiry',body);
      if(result.result!==100||result.status!==2)return result;
      if(result.orderId!==order.id||result.amount!==Number(order.amount_toman)*10){const error=Error('ZIBAL_PAYMENT_MISMATCH');error.code='ZIBAL_PAYMENT_MISMATCH';throw error;}
      result=await post(ROOT+'/v1/verify',body);
      if(result.result===201){result=await post(ROOT+'/v1/inquiry',{merchant,trackId:Number(order.token)});if(result.result!==100||result.status!==1)throw Error('ZIBAL_UNCONFIRMED');}
      return result;
    },
  };
}
function verifiedProof(result,order){
  if(result?.result!==100||result.status!==1||result.orderId!==order.id||!Number.isSafeInteger(result.amount)||result.amount<=0)throw Error('ZIBAL_UNCONFIRMED');
  return {amountRial:result.amount,rrn:String(result.refNumber||'').slice(0,50),trace:String(order.token)};
}
module.exports={configuration,createZibal,verifiedProof,ROOT};
