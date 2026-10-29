const {createHash}=require('node:crypto');
// Image bytes keyed by scope and content hash. A hash names exactly one file, so an entry can never be
// stale; the cache only bounds memory and how long a removed or unpublished image stays reachable.
// Without it every image request re-read and re-parsed the whole multi-megabyte document.
const entries=new Map(),limit=Math.max(8,Number(process.env.MEDIA_CACHE_MB)||64)*1024*1024,age=10*60000;let bytes=0;
const pattern=/^data:image\/(png|jpeg|webp);base64,/;
const hashOf=value=>createHash('sha256').update(value).digest('hex').slice(0,32);
function drop(key){const entry=entries.get(key);if(!entry)return;bytes-=entry.body.length;entries.delete(key);}
function put(scope,value,hash=hashOf(value)){
  const m=pattern.exec(value);if(!m)return null;
  const key=scope+'|'+hash;
  if(entries.has(key)){const entry=entries.get(key);entries.delete(key);entry.at=Date.now();entries.set(key,entry);return hash;}
  const body=Buffer.from(value.slice(m[0].length),'base64');if(body.length>limit/4)return hash;
  while(entries.size&&bytes+body.length>limit)drop(entries.keys().next().value);
  entries.set(key,{type:'image/'+m[1],body,at:Date.now()});bytes+=body.length;return hash;
}
function get(scope,hash){
  const key=scope+'|'+hash,entry=entries.get(key);if(!entry)return null;
  if(Date.now()-entry.at>age){drop(key);return null;}
  entries.delete(key);entries.set(key,entry);return entry;
}
// Adds every image found in a document; returns data URI → hash so callers can swap inline images for URLs.
function fill(scope,content){const found=new Map();for(const [hash,value] of require('./media.cjs').images(content)){if(put(scope,value,hash))found.set(value,hash);}return found;}
// Stores bytes read from dashboard_media under the same bounds as inline images.
function set(scope,hash,{type,body}){
  const key=scope+'|'+hash,entry={type,body,at:Date.now()};drop(key);
  if(body.length<=limit/4){while(entries.size&&bytes+body.length>limit)drop(entries.keys().next().value);entries.set(key,entry);bytes+=body.length;}
  return entry;
}
// A hash always names the same bytes, so its type never changes; public pages look each one up once.
const typeCache=new Map();
async function types(owner,hashes,lookup){
  const result=new Map(),missing=[];
  for(const hash of hashes){const type=typeCache.get(owner+'|'+hash);if(type)result.set(hash,type);else missing.push(hash);}
  if(missing.length)for(const [hash,type] of await lookup(missing)){result.set(hash,type);if(typeCache.size>=20000)typeCache.delete(typeCache.keys().next().value);typeCache.set(owner+'|'+hash,type);}
  return result;
}
// Which stored images a rendered public page may serve, and whose they are; lets the file request skip
// re-reading the page. Expires like the bytes so an unpublished image stops being reachable.
const allowed=new Map();
function allow(scope,owner,hashes){for(const hash of hashes){const key=scope+'|'+hash;allowed.delete(key);if(allowed.size>=20000)allowed.delete(allowed.keys().next().value);allowed.set(key,{owner,at:Date.now()});}}
function allowedOwner(scope,hash){const key=scope+'|'+hash,entry=allowed.get(key);if(!entry)return null;if(Date.now()-entry.at>age){allowed.delete(key);return null;}return entry.owner;}
function clear(){entries.clear();bytes=0;typeCache.clear();allowed.clear();}
module.exports={put,get,set,fill,types,allow,allowedOwner,hashOf,clear};
