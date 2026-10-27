const {RI,blank}=require('./render.cjs');
const fail=(message,status=400,code)=>{throw Object.assign(new Error(message),{status,code});};
const reserved=new Set(RI.TAKEN_SLUGS);
function slugValid(s){return typeof s==='string'&&s.length>=3&&s.length<=24&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&!reserved.has(s);}
function webUrl(s){if(typeof s!=='string'||!s||s.length>2048||/[\s\x00-\x1f\x7f]/.test(s))return null;try{if(!/^https?:\/\//i.test(s))s='https://'+s;const u=new URL(s);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:null;}catch{return null;}}
const templates={contacts:{id:'',type:'',label:'',value:'',public:false},skills:{id:'',name:'',level:3},experience:{id:'',role:'',org:'',from:'',to:'',current:false,desc:''},education:{id:'',degree:'',school:'',from:'',to:'',current:false,desc:''},projects:{id:'',title:'',desc:'',url:'',image:null},certs:{id:'',title:'',issuer:'',year:''},languages:{id:'',name:'',level:3},socials:{id:'',platform:'',handle:''},sections:{key:'',visible:true},items:{id:'',type:'',title:'',url:'',icon:'link',active:true,featured:false,image:null}};
function image(value,key){if(value===null||value==='')return null;if(typeof value!=='string'||value.length>3*1024*1024)fail('حجم تصویر بیش از حد مجاز است');if(key!=='avatar'&&/^grad:#[a-f0-9]{6},#[a-f0-9]{6}$/i.test(value))return value;
  const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(m){const b=Buffer.from(m[2].slice(0,32),'base64');/* only the signature bytes are needed; decoding megabytes per autosave is wasted work */const valid=m[1]==='png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?b[0]===255&&b[1]===216&&b[2]===255:b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';if(valid)return value;}
  if(/^https:\/\//i.test(value)&&webUrl(value)&&!/[\s'"()\\]/.test(value)){collector?.add(value);return value;}
  fail('تصویر باید PNG، JPEG، WebP یا آدرس HTTPS معتبر باشد');
}
const base64Bytes=value=>{const b64=value.slice(value.indexOf(',')+1);return Math.floor(b64.length*3/4)-(b64.endsWith('==')?2:b64.endsWith('=')?1:0);};
// Validation is synchronous, so a module-level collector safely gathers the external image addresses it meets.
let collector=null;
function shape(value,sample,key=''){
  if(sample===null)return image(value,key);
  if(Array.isArray(sample)){if(!Array.isArray(value)||value.length>RI.MAX_LIST_ITEMS)fail('تعداد موارد بیش از حد مجاز است');const t=templates[key]||sample[0];return value.map(x=>shape(x,t));}
  if(typeof sample==='object'){if(!value||typeof value!=='object'||Array.isArray(value))fail('ساختار اطلاعات معتبر نیست');return Object.fromEntries(Object.keys(sample).map(k=>[k,shape(value[k]===undefined?sample[k]:value[k],sample[k],k)]));}
  if(typeof value!==typeof sample||(typeof value==='number'&&!Number.isFinite(value))||(typeof value==='string'&&(value.length>10000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))))fail('مقدار واردشده معتبر نیست');
  if(key==='id'&&!/^[a-z0-9_-]{1,64}$/i.test(value))fail('شناسه معتبر نیست');if(key==='level'&&(!Number.isInteger(value)||value<1||value>5))fail('سطح باید بین ۱ و ۵ باشد');return value;
}
// With options.localized (address → data URI), external images must already be copied: any address not yet
// in the map stops validation with EXTERNAL_IMAGES and the list, so the caller can download and retry.
function content(input,billing={},previous,options={}){
  if(!options.localized)return validateContent(input,billing,previous);
  const found=new Set(),localized=options.localized;collector=found;
  try{
    return validateContent(require('./media.cjs').replaceValues(input,localized),billing,previous,()=>{
      const urls=[...found].filter(url=>localized.get(url)!==url);if(!urls.length)return;
      const before=previous?JSON.stringify(previous):'';
      throw Object.assign(new Error('تصویرهای اینترنتی هنوز کپی نشده‌اند'),{status:400,code:'EXTERNAL_IMAGES',urls,existing:urls.filter(url=>before.includes(JSON.stringify(url)))});
    });
  }finally{collector=null;}
}
// External image addresses inside stored content; legacy content that no longer validates yields none.
function externalImages(c){
  const found=new Set(),stop={};collector=found;
  try{validateContent(c,{},c,()=>{throw stop;});}catch(error){if(error!==stop)return [];}finally{collector=null;}
  return [...found];
}
function validateContent(input,billing={},previous,afterImages){input=require('./media.cjs').expand(input,previous);const c=shape(input,blank());c.resumeTemplates=RI.validateResumeValues(input.resumeTemplates||{});
  for(const [id,entry] of Object.entries(c.resumeTemplates)){
    const spec=RI.resumeSpec(id),check=values=>{for(const [key,value]of Object.entries(values)){const f=spec.fields.concat(spec.settings).find(x=>x.key===key);if(f?.type==='image'&&value&&!/^\/templates\/(vista|satiar)\/[a-f0-9]{16}\.(png|jpg|jpeg|webp|svg|gif)$/.test(value))image(value,'avatar');}};
    check(entry.fields);check(entry.settings);for(const rows of Object.values(entry.collections||{}))for(const row of rows)check(row.fields);
  }
  afterImages?.();
  if(c.slug&&!slugValid(c.slug)&&c.slug!==previous?.slug)fail('نام صفحه معتبر نیست یا رزرو شده است');
  if(!RI.pagePathValid(c.routing.links)||c.routing.resume&&!RI.pagePathValid(c.routing.resume))fail('مسیر صفحه باید ۱ تا ۲۴ حرف کوچک انگلیسی، عدد یا خط تیره باشد؛ مسیر لینک خالی یا سیستمی مجاز نیست');
  if(c.routing.links===c.routing.resume)fail('مسیر رزومه و لینک‌ها باید متفاوت باشند');
  if(['link','links'].includes(c.routing.resume))fail('مسیرهای link و links برای سازگاری صفحهٔ لینک‌ها رزرو شده‌اند');
  for(const key of Object.keys(templates)){const list=key==='items'?c.links.items:c[key];if(new Set(list.map(x=>x.id||x.key)).size!==list.length)fail('شناسه‌های تکراری در فهرست');}
  if(c.sections.some(s=>!blank().sections.some(x=>x.key===s.key)))fail('بخش ناشناخته');
  if(c.contacts.some(x=>!['email','phone','website'].includes(x.type)))fail('نوع تماس معتبر نیست');
  for(const x of c.contacts)if(x.value&&(x.type==='website'?!webUrl(x.value):x.type==='email'?!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x.value):!/^[+0-9\s()-]{6,24}$/.test(x.value)))fail('راه تماس معتبر نیست');
  for(const item of [...c.projects,...c.links.items])if(item.type!=='divider'&&item.url&&!webUrl(item.url))fail('آدرس لینک معتبر نیست');
  if(c.links.items.some(x=>!['link','divider','text','image'].includes(x.type)||(x.type==='link'&&(!x.title.trim()||!webUrl(x.url)))||(x.type==='text'&&!x.title.trim())||(x.type==='image'&&!x.image)||!RI.LINK_ICONS.includes(x.icon)))fail('عنوان، تصویر یا آدرس جزء صفحه را کامل کن');
  const subscriber=billing.plan&&billing.plan.end>Date.now();
  const policy=billing.commerce||require('../owner/settings.cjs').defaults(),maxImage=subscriber?policy.imagePaid:policy.imageFree,existingImages=require('./media.cjs').images(previous),newImages=require('./media.cjs').images(c);
  for(const [id,value]of newImages)if(!existingImages.has(id)&&base64Bytes(value)>maxImage)fail('حجم هر تصویر برای '+(subscriber?'اشتراکی':'رایگان')+' حداکثر '+Math.floor(maxImage/1024)+' کیلوبایت است',413);
  for(const kind of ['resume','links']){const brand=c.branding[kind];if(!['resumeit','custom','hidden'].includes(brand.mode)||brand.text.length>100)fail('امضای صفحه معتبر نیست');if(brand.mode!=='resumeit'&&!subscriber&&JSON.stringify(brand)!==JSON.stringify(previous?.branding?.[kind]))fail('امضای اختصاصی به اشتراک فعال نیاز دارد',403);}
  for(const item of c.links.items.filter(x=>['text','image'].includes(x.type)))if(!subscriber&&!previous?.links?.items.some(old=>old.id===item.id&&JSON.stringify(old)===JSON.stringify(item)))fail('بلوک متن و تصویر به اشتراک فعال نیاز دارد',403);
  if(c.socials.some(x=>!RI.SOCIALS.some(s=>s[0]===x.platform)||!RI.socialHandleValid(x.handle)))fail('آدرس شبکهٔ اجتماعی معتبر نیست');
  checkAccess(c,billing,undefined,previous);
  if(!['sharp','soft','round'].includes(c.theme.radius)||!['center','start','end'].includes(c.links.style.align)||![null,'tpl','ice','sand','dusk','plain'].includes(c.links.style.bgOverride))fail('ظاهر معتبر نیست');
  c.domain={value:'',status:'none'};return c;
}
function validatePatch(patch){if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!Object.hasOwn(blank(),k)))fail('بخش تغییرکرده معتبر نیست');return patch;}
function preferences(input={}){return {indexing:input.indexing!==false,brand:true,notify:{sms_publish:false,sms_security:false,email_tips:false,email_stats:false,push_milestones:false}};}
function checkAccess(c,billing={},kind,previous){if(kind!=='links'){const selected=c.resumeTemplates?.[c.theme.resume]?.settings?.font,f=RI.FONTS.find(x=>x.id===selected);if(f&&!RI.allowed('font:'+f.id,f,billing)&&!(previous?.theme.resume===c.theme.resume&&previous.resumeTemplates?.[c.theme.resume]?.settings?.font===selected))fail('این فونت به خرید یک‌باره نیاز دارد',403);}for(const [key,ref,list]of [['resume','rt',RI.RESUME_TEMPLATES],['links','lt',RI.LINK_TEMPLATES],['font','font',RI.FONTS],['palette','pal',RI.PALETTES],['linksPalette','pal',RI.PALETTES]]){if(kind==='resume'&&['links','linksPalette'].includes(key)||kind==='links'&&['resume','palette'].includes(key))continue;const item=list.find(x=>x.id===c.theme[key]);if(!item||!RI.allowed(ref+':'+item.id,item,billing)&&previous?.theme[key]!==c.theme[key])fail('این ظاهر به خرید یک‌باره یا اشتراک فعال نیاز دارد',403);}}
function publicContent(c,billing={}){
  const result=structuredClone(c),subscriber=billing.plan&&billing.plan.end>Date.now();
  for(const [key,ref,list]of [['resume','rt',RI.RESUME_TEMPLATES],['links','lt',RI.LINK_TEMPLATES],['palette','pal',RI.PALETTES],['linksPalette','pal',RI.PALETTES]]){const item=list.find(x=>x.id===result.theme[key]);if(!item||!RI.allowed(ref+':'+item.id,item,billing))result.theme[key]=list.find(x=>x.access==='free').id;}
  const customFont=result.resumeTemplates?.[result.theme.resume]?.settings?.font,f=RI.FONTS.find(x=>x.id===customFont),chosen=RI.FONTS.find(x=>x.id===result.theme.font);
  if(!chosen||!RI.allowed('font:'+chosen.id,chosen,billing))result.theme.font='vazir';
  if(f&&!RI.allowed('font:'+f.id,f,billing))result.resumeTemplates[result.theme.resume].settings.font='theme';
  if(!subscriber){result.branding=blank().branding;result.links.items=result.links.items.filter(x=>!['text','image'].includes(x.type));}
  return result;
}
function ready(c,kind,billing={},existingSlug=false){checkAccess(c,billing,kind);if(!slugValid(c.slug)&&!existingSlug)fail('نام صفحه را انتخاب کن');if(kind==='links'){if(!(c.links.header.sync?c.profile.name:c.links.header.name).trim()||!c.links.items.some(x=>x.type==='link'&&x.active))fail('نام و حداقل یک لینک فعال لازم است');}else {const missing=RI.resumeRequirements(c).find(x=>!x.done);if(missing)fail(missing.label);}}
function initial(){return {content:blank(),preferences:preferences(),pub:{resume:{status:'draft',version:0,at:null,snap:null},links:{status:'draft',version:0,at:null,snap:null}},revision:0};}
module.exports={validatePatch,content,externalImages,preferences,ready,initial,slugValid,webUrl,fail,checkAccess,publicContent};
