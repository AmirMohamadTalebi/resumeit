const {RI,blank}=require('./render.cjs');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const reserved=new Set(['www','admin','api','app','dashboard','auth','login','register','support','mail','smtp','ftp','cdn','assets','static','cname','blog','status','links','resume','demo']);
function slugValid(s){return typeof s==='string'&&s.length>=3&&s.length<=24&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&!reserved.has(s);}
function webUrl(s){if(typeof s!=='string'||!s||s.length>2048||/[\s\x00-\x1f\x7f]/.test(s))return null;try{if(!/^https?:\/\//i.test(s))s='https://'+s;const u=new URL(s);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:null;}catch{return null;}}
const templates={contacts:{id:'',type:'',label:'',value:'',public:false},skills:{id:'',name:'',level:3},experience:{id:'',role:'',org:'',from:'',to:'',current:false,desc:''},education:{id:'',degree:'',school:'',from:'',to:'',current:false,desc:''},projects:{id:'',title:'',desc:'',url:'',image:null},certs:{id:'',title:'',issuer:'',year:''},languages:{id:'',name:'',level:3},socials:{id:'',platform:'',handle:''},sections:{key:'',visible:true},items:{id:'',type:'',title:'',url:'',icon:'link',active:true,featured:false,image:null}};
function image(value,key){if(value===null||value==='')return null;if(typeof value!=='string'||value.length>3*1024*1024)fail('حجم تصویر بیش از حد مجاز است');if(key!=='avatar'&&/^grad:#[a-f0-9]{6},#[a-f0-9]{6}$/i.test(value))return value;
  const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(m){const b=Buffer.from(m[2],'base64');const valid=m[1]==='png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?b[0]===255&&b[1]===216&&b[2]===255:b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';if(valid)return value;}
  if(/^https:\/\//i.test(value)&&webUrl(value)&&!/[\s'"()\\]/.test(value))return value;
  fail('تصویر باید PNG، JPEG، WebP یا آدرس HTTPS معتبر باشد');
}
function shape(value,sample,key=''){
  if(sample===null)return image(value,key);
  if(Array.isArray(sample)){if(!Array.isArray(value)||value.length>100)fail('تعداد موارد بیش از حد مجاز است');const t=templates[key]||sample[0];return value.map(x=>shape(x,t));}
  if(typeof sample==='object'){if(!value||typeof value!=='object'||Array.isArray(value))fail('ساختار اطلاعات معتبر نیست');return Object.fromEntries(Object.keys(sample).map(k=>[k,shape(value[k]===undefined?sample[k]:value[k],sample[k],k)]));}
  if(typeof value!==typeof sample||(typeof value==='number'&&!Number.isFinite(value))||(typeof value==='string'&&(value.length>10000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))))fail('مقدار واردشده معتبر نیست');
  if(key==='id'&&!/^[a-z0-9_-]{1,64}$/i.test(value))fail('شناسه معتبر نیست');if(key==='level'&&(!Number.isInteger(value)||value<1||value>5))fail('سطح باید بین ۱ و ۵ باشد');return value;
}
function content(input){const c=shape(input,blank());c.resumeTemplates=RI.validateResumeValues(input.resumeTemplates||{});if(c.slug&&!slugValid(c.slug))fail('نام صفحه معتبر نیست یا رزرو شده است');
  for(const key of Object.keys(templates)){const list=key==='items'?c.links.items:c[key];if(new Set(list.map(x=>x.id||x.key)).size!==list.length)fail('شناسه‌های تکراری در فهرست');}
  if(c.sections.some(s=>!blank().sections.some(x=>x.key===s.key)))fail('بخش ناشناخته');
  if(c.contacts.some(x=>!['email','phone','website'].includes(x.type)))fail('نوع تماس معتبر نیست');
  for(const x of c.contacts)if(x.value&&(x.type==='website'?!webUrl(x.value):x.type==='email'?!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x.value):!/^[+0-9\s()-]{6,24}$/.test(x.value)))fail('راه تماس معتبر نیست');
  for(const item of [...c.projects,...c.links.items])if(item.type!=='divider'&&item.url&&!webUrl(item.url))fail('آدرس لینک معتبر نیست');
  if(c.links.items.some(x=>!['link','divider'].includes(x.type)||(x.type==='link'&&(!x.title.trim()||!webUrl(x.url)))||!RI.LINK_ICONS.includes(x.icon)))fail('عنوان یا آدرس لینک را کامل کن');
  if(c.socials.some(x=>!RI.SOCIALS.some(s=>s[0]===x.platform)||(!webUrl(x.handle)&&!/^[a-z0-9_.@/-]{1,200}$/i.test(x.handle))))fail('آدرس شبکهٔ اجتماعی معتبر نیست');
  for(const [key,list]of [['resume',RI.RESUME_TEMPLATES],['links',RI.LINK_TEMPLATES],['font',RI.FONTS],['palette',RI.PALETTES],['linksPalette',RI.PALETTES]])if(!list.some(x=>x.id===c.theme[key]&&x.access==='free'))fail('این قالب یا ظاهر در حساب رایگان در دسترس نیست',403);
  if(!['sharp','soft','round'].includes(c.theme.radius)||!['center','start'].includes(c.links.style.align)||![null,'tpl','ice','sand','dusk','plain'].includes(c.links.style.bgOverride))fail('ظاهر معتبر نیست');
  c.domain={value:'',status:'none'};return c;
}
function preferences(input={}){return {indexing:input.indexing!==false,brand:true,notify:{sms_publish:false,sms_security:false,email_tips:false,email_stats:false,push_milestones:false}};}
function ready(c,kind){if(!slugValid(c.slug))fail('نام صفحه را انتخاب کن');if(kind==='links'){if(!(c.links.header.sync?c.profile.name:c.links.header.name).trim()||!c.links.items.some(x=>x.type==='link'&&x.active))fail('نام و حداقل یک لینک فعال لازم است');}else {const missing=RI.resumeRequirements(c).find(x=>!x.done);if(missing)fail(missing.label);}}
function initial(){return {content:blank(),preferences:preferences(),pub:{resume:{status:'draft',version:0,at:null,snap:null},links:{status:'draft',version:0,at:null,snap:null}},revision:0};}
module.exports={content,preferences,ready,initial,slugValid,webUrl,fail};
