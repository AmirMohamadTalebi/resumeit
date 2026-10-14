const assert=require('node:assert/strict'),zibal=require('../src/payments/zibal.cjs');
(async()=>{
  const env={ZIBAL_ENABLED:'true',ZIBAL_MERCHANT_ID:'m'.repeat(36)},order={id:'invoice-test',amount_toman:100000,token:'15966442233311'},calls=[];
  assert.equal(zibal.configuration(env).enabled,true);for(const merchant of ['', 'zibal','https://evil.example','m'.repeat(129)])assert.equal(zibal.configuration({...env,ZIBAL_MERCHANT_ID:merchant}).enabled,false);
  let verified=false,duplicate=false,wrong=false;
  const provider=zibal.createZibal({env,fetch:async(url,input)=>{
    const body=JSON.parse(input.body);calls.push({url,body,input});
    let result;if(url.endsWith('/request'))result={result:100,trackId:Number(order.token)};
    else if(url.endsWith('/verify')){verified=true;result=duplicate?{result:201}:{result:100,status:1,orderId:order.id,amount:1000000,refNumber:12312};}
    else result={result:100,status:verified?1:2,orderId:order.id,amount:wrong?2000000:1000000,refNumber:12312};
    return new Response(JSON.stringify(result));
  }});
  assert.equal(await provider.token(order,'https://resumeit.ir/api/payments/zibal/callback?key=secret','09120000123'),order.token);
  assert.deepEqual(calls[0].body,{merchant:env.ZIBAL_MERCHANT_ID,amount:1000000,callbackUrl:'https://resumeit.ir/api/payments/zibal/callback?key=secret',orderId:order.id,description:'شارژ کیف پول ResumeIt',mobile:'09120000123'});assert.equal(calls[0].input.redirect,'error');assert(calls[0].input.signal);
  const proof=await provider.verify(order);assert.equal(zibal.verifiedProof(proof,order).amountRial,1000000);assert.deepEqual(calls[2].body,{merchant:env.ZIBAL_MERCHANT_ID,trackId:Number(order.token)});
  verified=false;duplicate=true;assert.equal(zibal.verifiedProof(await provider.verify(order),order).rrn,'12312');assert(calls.at(-1).url.endsWith('/inquiry'));
  verified=false;wrong=true;await assert.rejects(provider.verify(order),e=>e.code==='ZIBAL_PAYMENT_MISMATCH');assert(calls.at(-1).url.endsWith('/inquiry'),'mismatch is never verified');
  for(const data of [{...proof,status:2},{...proof,orderId:'OTHER'},{...proof,amount:-1},{...proof,result:201}])assert.throws(()=>zibal.verifiedProof(data,order));
  for(const response of [new Response('{}',{status:503}),new Response('not json'),new Response('x'.repeat(17000)),new Response(JSON.stringify({result:100,trackId:'evil'}))])await assert.rejects(zibal.createZibal({env,fetch:async()=>response}).token(order,'https://resumeit.ir/callback','09120000123'));
  console.log('PASS: official Zibal request/inquiry/verify contract, Rial conversion, repeated verification recovery, order binding, no confirmation on mismatch, fixed TLS endpoints, timeout and bounded responses; no real gateway request.');
})().catch(e=>{console.error(e);process.exitCode=1;});
