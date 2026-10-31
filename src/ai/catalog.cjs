// The models a person can pick for Fandogh, and what each question costs in messages from the daily allowance.
// «GPT Luna» is the unit (1 message); the others are multiples by how heavy they are. «فندق محلی» runs on ResumeIt
// itself and is free. A person's own key is free too. The owner can switch models off, change their cost, their
// model id and their label in the admin panel; a model is offered only when its provider has a key.
const {PROVIDERS}=require('./providers.cjs');
const CATALOG=[
  {id:'local',label:'فندق محلی',cost:0,provider:null,model:'',tags:['رایگان','فوری'],note:'روی خود رزومیت؛ امتیاز، غلط‌گیری و راهنمایی‌های پایه.'},
  {id:'luna',label:'GPT Luna',cost:1,provider:'active',model:'',tags:['پیش‌فرض پیشرفته','متعادل'],note:'دستیار پیشرفتهٔ رزومیت؛ تعادل خوب سرعت و کیفیت.'},
  {id:'gpt-4o-mini',label:'GPT-4o mini',cost:1,provider:'openai',model:'gpt-4o-mini',tags:['سریع'],note:'سبک و سریع برای سؤال‌های کوتاه.'},
  {id:'gemini-flash',label:'Gemini 2.5 Flash',cost:1,provider:'gemini',model:'gemini-2.5-flash',tags:['سریع','متن بلند'],note:'برای مقایسه با آگهی‌های طولانی.'},
  {id:'deepseek',label:'DeepSeek Chat',cost:1,provider:'deepseek',model:'deepseek-chat',tags:['اقتصادی'],note:'پاسخ‌های روشن با هزینهٔ کم.'},
  {id:'claude-haiku',label:'Claude Haiku 5.5',cost:2,provider:'anthropic',model:'claude-haiku-5-5',tags:['نوشتن روان'],note:'بازنویسی تمیز و سریع متن رزومه.'},
  {id:'gpt-4-1',label:'GPT-4.1',cost:3,provider:'openai',model:'gpt-4.1',tags:['تحلیل'],note:'تحلیل دقیق‌تر سوابق و آگهی.'},
  {id:'gemini-pro',label:'Gemini 2.5 Pro',cost:3,provider:'gemini',model:'gemini-2.5-pro',tags:['استدلال'],note:'برای برنامه‌ریزی مسیر شغلی و مصاحبه.'},
  {id:'claude-sonnet',label:'Claude Sonnet 5.5',cost:4,provider:'anthropic',model:'claude-sonnet-5-5',tags:['بهترین نوشتن'],note:'بهترین انتخاب برای بازنویسی کامل رزومه.'},
  {id:'claude-opus',label:'Claude Opus 5.5',cost:10,provider:'anthropic',model:'claude-opus-5-5',tags:['قوی‌ترین'],note:'برای کارهای سنگین؛ هر پیامش ۱۰ پیام حساب می‌شود.'},
];
const ids=new Set(CATALOG.map(m=>m.id));
// The catalog with the owner's overrides applied.
function models(settings){
  const own=settings?.models||{};
  return CATALOG.map(m=>{const o=own[m.id]||{};return {...m,label:o.label||m.label,cost:m.id==='local'?0:(Number.isInteger(o.cost)?o.cost:m.cost),model:o.model||m.model,enabled:m.id==='local'?true:o.enabled!==false};});
}
// The provider settings a catalog model speaks through, or null when it cannot be used right now.
function runtime(model,settings,keys,env=process.env){
  if(!model||model.id==='local'||!model.enabled)return null;
  const ai=settings.ai||{};
  const provider=model.provider==='active'?ai.provider:model.provider,p=PROVIDERS[provider],key=keys?.[provider];
  if(!settings.enabled||!p||!key)return null;
  if(model.provider==='active'&&!ai.enabled)return null;
  const configured=settings.providers?.[provider]||{};
  return {provider,key,model:model.model||configured.model||p.model,url:configured.url||p.url,temperature:ai.temperature??.4,maxTokens:Math.max(ai.maxTokens||1200,900),timeout:30000};
}
// What the dashboard shows: every enabled model, whether it can answer now and what a question costs.
function offer(settings,keys,own){
  const list=models(settings).filter(m=>m.enabled).map(m=>({id:m.id,label:m.label,cost:m.cost,tags:m.tags,note:m.note,available:m.id==='local'||!!runtime(m,settings,keys)}));
  if(own)list.splice(1,0,{id:'own',label:'کلید خودت · '+own.model,cost:0,tags:['رایگان','حساب خودت'],note:'از حساب سرویس خودت؛ از سهمیه کم نمی‌شود.',available:true});
  return list;
}
// Owner overrides: {id: {enabled, cost, model, label}}.
function validate(input,fail){
  if(input===undefined)return {};
  if(!input||typeof input!=='object'||Array.isArray(input))fail('فهرست مدل‌ها معتبر نیست');
  const out={};
  for(const [id,v] of Object.entries(input)){
    if(!ids.has(id)||id==='local'||!v||typeof v!=='object'||Array.isArray(v))fail('مدل '+id+' معتبر نیست');
    if(typeof v.enabled!=='boolean'||!Number.isInteger(v.cost)||v.cost<1||v.cost>50)fail('هزینهٔ هر مدل باید عددی بین ۱ تا ۵۰ پیام باشد');
    const model=String(v.model||'').trim(),label=String(v.label||'').trim();
    if(model&&(model.length>80||!/^[\w.:/@-]+$/.test(model)))fail('شناسهٔ مدل '+id+' معتبر نیست');
    if(label&&(label.length>40||/[<>\x00-\x1f]/.test(label)))fail('نام مدل '+id+' معتبر نیست');
    out[id]={enabled:v.enabled,cost:v.cost,model,label};
  }
  return out;
}
module.exports={CATALOG,models,runtime,offer,validate,ids};
