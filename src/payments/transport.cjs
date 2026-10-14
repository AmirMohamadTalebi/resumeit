module.exports=request=>async(url,body)=>{
  const response=await request(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!response.ok)throw Error('GATEWAY_UNAVAILABLE');
  const chunks=[];let bytes=0;
  for await(const chunk of response.body){bytes+=chunk.length;if(bytes>16384)throw Error('GATEWAY_INVALID_RESPONSE');chunks.push(chunk);}
  const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!result||typeof result!=='object'||Array.isArray(result))throw Error('GATEWAY_INVALID_RESPONSE');
  return result;
};
