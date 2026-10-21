module.exports=request=>async(url,body)=>{
  const response=await request(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!response.ok)throw Object.assign(Error('GATEWAY_UNAVAILABLE'),{code:'GATEWAY_HTTP_'+response.status});
  const chunks=[];let bytes=0;
  for await(const chunk of response.body){bytes+=chunk.length;if(bytes>16384)throw Object.assign(Error('GATEWAY_INVALID_RESPONSE'),{code:'GATEWAY_INVALID_RESPONSE'});chunks.push(chunk);}
  let result;try{result=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(Error('GATEWAY_INVALID_RESPONSE'),{code:'GATEWAY_INVALID_RESPONSE'});}
  if(!result||typeof result!=='object'||Array.isArray(result))throw Object.assign(Error('GATEWAY_INVALID_RESPONSE'),{code:'GATEWAY_INVALID_RESPONSE'});
  return result;
};
