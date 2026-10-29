const {createHash}=require('node:crypto');
const isImage=value=>typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(value);
const digest=value=>createHash('sha256').update(value).digest('hex').slice(0,32);
// Image bytes live in dashboard_media; documents keep only this address, named by the data URI's hash so
// addresses handed out before the move stay valid. Older clients may still append ?workspace=N.
const REF=/^\/api\/dashboard\/media\/([a-f0-9]{32})(?:\?workspace=[1-9][0-9]{0,9})?$/;
const refOf=hash=>'/api/dashboard/media/'+hash;
const refHash=value=>typeof value==='string'&&REF.exec(value)?.[1]||null;
function visit(value,transform){
  if(Array.isArray(value))return value.map(v=>visit(v,transform));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,visit(v,transform)]));
  return transform(value);
}
function images(content){const result=new Map();visit(content,value=>{if(isImage(value))result.set(digest(value),value);return value;});return result;}
// Hashes an input names, either as stored addresses or as images it still carries inline.
function hashes(content){const result=new Set();visit(content,value=>{const hash=refHash(value)||(isImage(value)?digest(value):null);if(hash)result.add(hash);return value;});return result;}
// Every image a stored row uses: draft, published copies and the publication snapshots kept as JSON text.
function documentHashes(doc){
  const result=new Set([...hashes(doc?.content),...hashes(doc?.published)]);
  for(const kind of ['resume','links']){const snap=doc?.pub?.[kind]?.snap;if(typeof snap==='string')try{for(const hash of hashes(JSON.parse(snap)))result.add(hash);}catch{}}
  return result;
}
// Replaces inline images with their address and collects the bytes (hash → data URI) for storage.
function externalize(value,files){return visit(value,v=>{if(!isImage(v))return v;const hash=digest(v);files.set(hash,v);return refOf(hash);});}
function externalizePub(pub,files){
  if(!pub||typeof pub!=='object')return pub;const result=structuredClone(pub);
  for(const kind of ['resume','links']){const entry=result[kind];if(typeof entry?.snap==='string'&&entry.snap.includes('data:image/'))try{entry.snap=JSON.stringify(externalize(JSON.parse(entry.snap),files));}catch{}}
  return result;
}
function decode(value){const m=/^data:(image\/(?:png|jpeg|webp));base64,/.exec(value);return m&&{type:m[1],body:Buffer.from(value.slice(m[0].length),'base64')};}
function lightweight(doc,workspace=1){
  const suffix=workspace>1?'?workspace='+workspace:'',address=value=>isImage(value)?refOf(digest(value))+suffix:suffix&&refHash(value)?refOf(refHash(value))+suffix:value;
  const result=visit(doc,address);
  for(const kind of ['resume','links'])if(result.pub?.[kind]?.snap){
    try{result.pub[kind].snap=JSON.stringify(visit(JSON.parse(result.pub[kind].snap),address));}catch{}
  }
  return result;
}
// Turns addresses sent back by the editor into stored form. A row that still holds the image inline
// (not yet moved) gets the data URI back; otherwise the hash must be one this account already stores.
function expand(input,previous,known=new Set()){
  const existing=images(previous),referenced=hashes(previous);
  return visit(input,value=>{
    if(typeof value!=='string'||!value.startsWith('/api/dashboard/media/'))return value;
    const hash=refHash(value);
    if(hash&&existing.has(hash))return existing.get(hash);
    if(hash&&(referenced.has(hash)||known.has(hash)))return refOf(hash);
    throw Object.assign(new Error('تصویر قبلی در دسترس نیست؛ صفحه را تازه کن'),{status:409});
  });
}
// Swap exact string values only (never substrings), e.g. a copied external image address for its data URI.
// Link and contact addresses keep their text even when they point at the same file as an image.
function replaceValues(input,map,key=''){
  if(!map.size)return input;
  if(Array.isArray(input))return input.map(v=>replaceValues(v,map,key));
  if(input&&typeof input==='object')return Object.fromEntries(Object.entries(input).map(([k,v])=>[k,replaceValues(v,map,k)]));
  return typeof input==='string'&&!['url','value'].includes(key)&&map.has(input)?map.get(input):input;
}
module.exports={lightweight,expand,images,hashes,documentHashes,externalize,externalizePub,decode,replaceValues,refOf,refHash,digest,isImage,REF};
