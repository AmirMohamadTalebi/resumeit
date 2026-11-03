const https=require('node:https'),dns=require('node:dns');
const {BlockList,isIP}=require('node:net');
const {fail}=require('./model.cjs');
// External image addresses are copied onto ResumeIt so published pages never make visitors' browsers
// contact third-party hosts. The fetch runs on the server, so it is locked down against SSRF:
// HTTPS on port 443 only, every resolved address must be public, redirects are re-checked, and
// size, time and file type are bounded.
const maxBytes=2.5*1024*1024,timeout=8000,maxRedirects=3,maxPerSave=10;
const blocked=new BlockList();
for(const [net,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(net,bits,'ipv4');
for(const [net,bits] of [['::',128],['::1',128],['64:ff9b::',96],['100::',64],['2001::',23],['2001:db8::',32],['fc00::',7],['fe80::',10],['ff00::',8]])blocked.addSubnet(net,bits,'ipv6');
function publicAddress(address){
  const family=isIP(address);if(!family)return false;
  const mapped=family===6&&/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if(mapped)return publicAddress(mapped[1]);
  return !blocked.check(address,family===4?'ipv4':'ipv6');
}
function lookup(hostname,options,callback){
  dns.lookup(hostname,{all:true,verbatim:true},(error,addresses)=>{
    if(error)return callback(error);
    if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))return callback(Object.assign(new Error('Blocked address'),{code:'BLOCKED_ADDRESS'}));
    if(options?.all)callback(null,[addresses[0]]);else callback(null,addresses[0].address,addresses[0].family);
  });
}
function sniff(bytes){
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'webp';
  return null;
}
function get(address,redirects,until=Date.now()+timeout){
  return new Promise((resolve,reject)=>{
    let url;try{url=new URL(address);}catch{return reject(Object.assign(new Error('Invalid URL'),{code:'INVALID_URL'}));}
    const host=url.hostname.replace(/^\[|\]$/g,'');
    if(url.protocol!=='https:'||(url.port&&url.port!=='443')||url.username||url.password||(isIP(host)&&!publicAddress(host)))return reject(Object.assign(new Error('Blocked URL'),{code:'BLOCKED_ADDRESS'}));
    const request=https.get(url,{lookup,timeout,headers:{Accept:'image/png,image/jpeg,image/webp;q=0.9,*/*;q=0.1','User-Agent':'ResumeIt-ImageCopy/1.0'}},response=>{
      if([301,302,303,307,308].includes(response.statusCode)&&response.headers.location){
        response.resume();
        if(redirects>=maxRedirects)return reject(Object.assign(new Error('Too many redirects'),{code:'REDIRECTS'}));
        return resolve(get(new URL(response.headers.location,url).href,redirects+1,until));
      }
      if(response.statusCode!==200){response.resume();return reject(Object.assign(new Error('HTTP '+response.statusCode),{code:'HTTP_'+response.statusCode}));}
      if(Number(response.headers['content-length'])>maxBytes){response.destroy();return reject(Object.assign(new Error('Too large'),{code:'TOO_LARGE'}));}
      const chunks=[];let size=0;
      response.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){response.destroy();reject(Object.assign(new Error('Too large'),{code:'TOO_LARGE'}));}else chunks.push(chunk);});
      response.on('end',()=>resolve(Buffer.concat(chunks)));
      response.on('error',reject);
    });
    // `timeout` only covers idle sockets; the deadline also stops a server that drips bytes slowly.
    const deadline=setTimeout(()=>request.destroy(Object.assign(new Error('Timeout'),{code:'TIMEOUT'})),Math.max(0,until-Date.now()));
    request.on('close',()=>clearTimeout(deadline));
    request.on('timeout',()=>request.destroy(Object.assign(new Error('Timeout'),{code:'TIMEOUT'})));
    request.on('error',reject);
  });
}
// Repeated autosaves resend the same address until the editor reloads; reuse recent copies.
const cache=new Map(),cacheBytes=32*1024*1024,cacheAge=30*60000;let cached=0;
async function download(address){
  const hit=cache.get(address);if(hit&&Date.now()-hit.at<cacheAge)return hit.value;
  const bytes=await get(address,0),type=sniff(bytes);
  if(!type)throw Object.assign(new Error('Unsupported image'),{code:'UNSUPPORTED_TYPE'});
  const value='data:image/'+type+';base64,'+bytes.toString('base64');
  if(hit){cached-=hit.value.length;cache.delete(address);}
  while(cache.size&&cached+value.length>cacheBytes){const [key,old]=cache.entries().next().value;cached-=old.value.length;cache.delete(key);}
  if(value.length<=cacheBytes){cache.set(address,{value,at:Date.now()});cached+=value.length;}
  return value;
}
// Fills `localized` with address → data URI. An address that was already saved before and can no longer be
// fetched is kept as it is (mapped to itself) so a dead third-party link never blocks saving the rest.
async function localize(urls,existing,localized,fetcher=download){
  const pending=urls.filter(url=>!localized.has(url));
  if(pending.length>maxPerSave)fail('در هر ذخیره حداکثر '+maxPerSave+' تصویر از آدرس اینترنتی کپی می‌شود؛ بقیه را بعداً اضافه کن',400);
  const results=await Promise.allSettled(pending.map(url=>fetcher(url)));
  results.forEach((result,i)=>{
    const url=pending[i];
    if(result.status==='fulfilled')localized.set(url,result.value);
    else if(existing.includes(url))localized.set(url,url);
    else{let host='آدرس واردشده';try{host=new URL(url).hostname;}catch{}fail('تصویر «'+host+'» دریافت نشد؛ آدرس باید مستقیم به یک فایل PNG، JPEG یا WebP عمومی (حداکثر ۲٫۵ مگابایت) باشد. می‌توانی تصویر را مستقیم آپلود کنی',422,'IMAGE_FETCH_FAILED');}
  });
  return localized;
}
module.exports={download,localize,publicAddress,lookup,sniff};
