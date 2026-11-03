const {isIP}=require('node:net');
// TRUST_PROXY is the number of reverse proxies in front of Node; each appends one X-Forwarded-For entry.
// Unset or 0 ignores the header, so a direct client cannot spoof its address.
function trustedHops(env=process.env){const hops=Number(String(env.TRUST_PROXY||'0').trim());return Number.isSafeInteger(hops)&&hops>0&&hops<=5?hops:0;}
function clientIp(req,env=process.env){
  const socket=req.socket?.remoteAddress||'unknown',hops=trustedHops(env);
  if(!hops)return socket;
  const header=String(req.headers['x-forwarded-for']||'');
  if(!header||header.length>1024)return socket;
  const list=header.split(',').map(value=>value.trim()).filter(Boolean);
  // Fewer entries than proxies means the header did not come through all of them: never trust the client's own first entry.
  if(list.length<hops)return socket;
  const candidate=list[list.length-hops];
  return isIP(candidate||'')?candidate:socket;
}
module.exports={clientIp,trustedHops};
