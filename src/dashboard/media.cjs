const {createHash}=require('node:crypto');
const isImage=value=>typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(value);
const digest=value=>createHash('sha256').update(value).digest('hex').slice(0,32);
function visit(value,transform){
  if(Array.isArray(value))return value.map(v=>visit(v,transform));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,visit(v,transform)]));
  return transform(value);
}
function images(content){const result=new Map();visit(content,value=>{if(isImage(value))result.set(digest(value),value);return value;});return result;}
function lightweight(doc,workspace=1){
  const imageUrl=value=>'/api/dashboard/media/'+digest(value)+(workspace>1?'?workspace='+workspace:'');
  const result=visit(doc,value=>isImage(value)?imageUrl(value):value);
  for(const kind of ['resume','links'])if(result.pub?.[kind]?.snap){
    try{result.pub[kind].snap=JSON.stringify(visit(JSON.parse(result.pub[kind].snap),value=>isImage(value)?imageUrl(value):value));}catch{}
  }
  return result;
}
function expand(input,previous){
  const existing=images(previous);
  return visit(input,value=>{
    if(typeof value!=='string'||!value.startsWith('/api/dashboard/media/'))return value;
    const match=/^\/api\/dashboard\/media\/([a-f0-9]{32})(?:\?workspace=[1-9][0-9]{0,9})?$/.exec(value),image=match&&existing.get(match[1]);
    if(!image)throw Object.assign(new Error('تصویر قبلی در دسترس نیست؛ صفحه را تازه کن'),{status:409});
    return image;
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
module.exports={lightweight,expand,images,replaceValues};
