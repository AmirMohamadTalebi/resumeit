const {createHash}=require('node:crypto');
const {clientIp}=require('../http/client-ip.cjs');
// Crawlers, link unfurlers and prefetches are not visitors; counting them inflates stats and costs a DB write each.
const automated=/bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|skype|preview|curl\/|wget\/|python-requests|python-urllib|httpclient|go-http-client|java\/|okhttp|axios\/|node-fetch|scrapy/i;
// Cookie-less clients get one counted event per address and key in each window; the map is bounded.
const recent=new Map(),capacity=20000,window=30*60000;
function countable(req,key,now=Date.now()){
  if(req.method!=='GET'||automated.test(req.headers['user-agent']||'')||/prefetch|prerender/i.test(String(req.headers['sec-purpose']||req.headers.purpose||'')))return false;
  const id=createHash('sha256').update(key+'|'+clientIp(req)).digest('base64url'),seen=recent.get(id);
  if(seen&&now-seen<window)return false;
  recent.delete(id);if(recent.size>=capacity)recent.delete(recent.keys().next().value);
  recent.set(id,now);return true;
}
module.exports={countable};
