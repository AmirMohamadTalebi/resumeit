// Each person's own Fandogh settings: the name they call it, its tone and answer length, and optionally their own
// language-model key. With their own key Fandogh answers through their account, so those questions are free and do
// not use the daily allowance. The key is sealed like the owner's keys and never sent back, only its last four
// characters.
const {fail}=require('./model.cjs'),{PROVIDERS}=require('../ai/providers.cjs'),sealing=require('../owner/assistant-settings.cjs');
const TONES=['friendly','formal'],LENGTHS=['short','detailed'];
const defaults=()=>({name:'فندق',tone:'friendly',length:'short',engine:'local',suggest:true,own:{enabled:false,provider:'openai',model:'',url:''}});
const merge=saved=>{const d=defaults(),s=saved&&typeof saved==='object'?saved:{};return {...d,...s,own:{...d.own,...(s.own||{})}};};
function validate(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('تنظیمات فندق معتبر نیست');
  const name=typeof input.name==='string'?input.name.trim():'',own=input.own||{};
  if(name.length<1||name.length>20||/[\x00-\x1f\x7f<>{}]/.test(name))fail('اسم دستیار باید ۱ تا ۲۰ حرف باشد');
  if(!TONES.includes(input.tone))fail('لحن انتخاب‌شده معتبر نیست');
  if(!LENGTHS.includes(input.length))fail('طول جواب انتخاب‌شده معتبر نیست');
  if(typeof own!=='object'||Array.isArray(own)||typeof own.enabled!=='boolean'||!Object.hasOwn(PROVIDERS,own.provider))fail('سرویس هوش مصنوعی معتبر نیست');
  const model=String(own.model||'').trim(),url=String(own.url||'').trim().replace(/\/+$/,'');
  if(model&&(model.length>80||!/^[\w.:/@-]+$/.test(model)))fail('نام مدل معتبر نیست');
  if(url&&(url.length>200||!/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[\w.~%/-]*)?$/i.test(url)))fail('نشانی سرویس باید با https شروع شود');
  if(own.provider==='custom'&&!url&&own.enabled)fail('برای سرویس سازگار با OpenAI نشانی لازم است');
  const engine=input.engine===undefined?'local':input.engine;
  if(typeof engine!=='string'||!/^[a-z0-9.-]{1,32}$/.test(engine))fail('مدل پیش‌فرض معتبر نیست');
  if(input.suggest!==undefined&&typeof input.suggest!=='boolean')fail('نمایش پیشنهادها معتبر نیست');
  return {name,tone:input.tone,length:input.length,engine,suggest:input.suggest!==false,own:{enabled:own.enabled,provider:own.provider,model,url:own.provider==='custom'?url:''}};
}
// A new key: a string to set, null to remove, undefined to keep the stored one.
function validateKey(key){
  if(key===undefined||key===null)return key;
  if(typeof key!=='string'||key.trim().length<8||key.length>400||/\s/.test(key.trim()))fail('کلید واردشده معتبر نیست');
  return key.trim();
}
const seal=key=>key?sealing.seal({key}):null;
const open=sealed=>sealing.open(sealed).key||'';
// The model this person's questions go through, or null when they use the shared Fandogh.
function runtime(settings,key){
  const own=settings.own,p=PROVIDERS[own.provider];
  if(!own.enabled||!key||!p)return null;
  return {provider:own.provider,key,model:own.model||p.model,url:own.url||p.url,temperature:.4,maxTokens:1200,timeout:25000};
}
function view(settings,key){
  return {settings,key:{set:!!key,hint:sealing.hint(key)},providers:Object.entries(PROVIDERS).map(([id,p])=>({id,label:p.label,model:p.model,models:p.models||[],needsUrl:id==='custom'}))};
}
// The persona lines added to the model's instructions.
function persona(settings){
  const lines=[];
  if(settings.name&&settings.name!=='فندق')lines.push('کاربر برای تو اسم «'+settings.name+'» را انتخاب کرده؛ خودت را «'+settings.name+'» معرفی کن (همان دستیار رزومهٔ رزومیت).');
  lines.push(settings.tone==='formal'?'لحن: رسمی و مؤدبانه، با «شما».':'لحن: صمیمی و گرم، با «تو».');
  lines.push(settings.length==='detailed'?'طول جواب: مفصل‌تر، با فهرست و مثال وقتی کمک می‌کند (حداکثر ۱۲ جمله).':'طول جواب: کوتاه، ۲ تا ۴ جمله.');
  return lines.join('\n');
}
module.exports={defaults,merge,validate,validateKey,seal,open,runtime,view,persona};
