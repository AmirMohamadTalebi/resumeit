// The models a person can pick for Fandogh, grouped by maker, with what each question costs in messages and the
// lowest plan that opens it (0 free, 1 «آرش», 2 «رستم», 3 «کوروش»; a ResumeIt subscription opens all). GPT-6 Luna
// is the unit (1 message) and every other model costs 2 or more, roughly in step with its API price. «فندق محلی»
// runs on ResumeIt itself and is free, and so is a person's own key. The owner can switch models off and change
// their cost, plan, label, model id and the provider they go through (an OpenAI-compatible gateway, say).
// `usd` is the October 2026 API price per million input/output tokens, used for the plan prices and the panel.
const {PROVIDERS}=require('./providers.cjs');
const GROUPS=[['fandogh','فندق'],['openai','OpenAI'],['anthropic','Anthropic'],['google','Google'],['moonshot','Moonshot'],['deepseek','DeepSeek']];
const CATALOG=[
  {id:'local',group:'fandogh',label:'فندق محلی',cost:0,tier:0,provider:null,model:'',usd:[0,0],tags:['رایگان','فوری'],note:'روی خود رزومیت؛ امتیاز، غلط‌گیری و راهنمایی‌های پایه.'},
  {id:'luna',group:'openai',label:'GPT-6 Luna',cost:1,tier:0,provider:'active',model:'',usd:[.1,.5],tags:['واحد سهمیه','متعادل'],note:'دستیار پیشرفتهٔ پیش‌فرض؛ هر پیامش یک پیام است.'},
  {id:'gpt-6-sol',group:'openai',label:'GPT-6 Sol',cost:4,tier:3,provider:'openai',model:'gpt-6-sol',usd:[2,10],tags:['استدلال قوی'],note:'تحلیل عمیق سوابق، آگهی و مسیر شغلی.'},
  {id:'gpt-6-astra',group:'openai',label:'GPT-6 Astra',cost:8,tier:3,provider:'openai',model:'gpt-6-astra',usd:[10,50],tags:['پرچم‌دار'],note:'قوی‌ترین مدل OpenAI برای کارهای سنگین.'},
  {id:'claude-haiku',group:'anthropic',label:'Claude Haiku 5.5',cost:2,tier:0,provider:'anthropic',model:'claude-haiku-5-5',usd:[.1,.5],tags:['سریع','نوشتن روان'],note:'بازنویسی تمیز و سریع جمله‌ها.'},
  {id:'claude-sonnet',group:'anthropic',label:'Claude Sonnet 5.5',cost:4,tier:2,provider:'anthropic',model:'claude-sonnet-5-5',usd:[2,10],tags:['نوشتن عالی'],note:'بازنویسی کامل بخش‌ها با لحن حرفه‌ای.'},
  {id:'claude-opus',group:'anthropic',label:'Claude Opus 5.5',cost:6,tier:3,provider:'anthropic',model:'claude-opus-5-5',usd:[4,20],tags:['خیلی قوی'],note:'بازنویسی کل رزومه و مقایسهٔ دقیق با آگهی.'},
  {id:'claude-fable',group:'anthropic',label:'Claude Fable 5.1',cost:8,tier:3,provider:'anthropic',model:'claude-fable-5-1',usd:[10,50],tags:['قوی‌ترین'],note:'بهترین مدل Anthropic برای سخت‌ترین کارها.'},
  {id:'gemini-flash-lite',group:'google',label:'Gemini 3.1 Flash-Lite',cost:2,tier:0,provider:'gemini',model:'gemini-3.1-flash-lite',usd:[.25,1.5],tags:['سبک'],note:'جواب‌های کوتاه و سریع.'},
  {id:'gemini-flash',group:'google',label:'Gemini 3.8 Flash',cost:3,tier:1,provider:'gemini',model:'gemini-3.8-flash',usd:[.75,3.75],tags:['سریع','متن بلند'],note:'برای مقایسه با آگهی‌های طولانی.'},
  {id:'gemini-pro',group:'google',label:'Gemini 3.1 Pro',cost:4,tier:2,provider:'gemini',model:'gemini-3.1-pro-preview',usd:[2,12],tags:['استدلال'],note:'برنامه‌ریزی مسیر شغلی و آمادگی مصاحبه.'},
  {id:'gemini-argon',group:'google',label:'Gemini 4 Argon',cost:4,tier:3,provider:'gemini',model:'gemini-4-argon',usd:[2,10],tags:['پرچم‌دار'],note:'پرچم‌دار گوگل برای تحلیل‌های بزرگ.'},
  {id:'kimi-k2-6',group:'moonshot',label:'Kimi K2.6',cost:3,tier:1,provider:'moonshot',model:'kimi-k2.6',usd:[.95,4],tags:['اقتصادی'],note:'پاسخ‌های روشن با هزینهٔ کم.'},
  {id:'kimi-k3-1-pro',group:'moonshot',label:'Kimi K3.1 Pro',cost:4,tier:2,provider:'moonshot',model:'kimi-k3.1-pro',usd:[2,10],tags:['متعادل'],note:'نسخهٔ تازهٔ Kimi برای نوشتن و تحلیل.'},
  {id:'kimi-k3',group:'moonshot',label:'Kimi K3',cost:5,tier:2,provider:'moonshot',model:'kimi-k3',usd:[3,15],tags:['قوی'],note:'پرچم‌دار Moonshot.'},
  {id:'deepseek',group:'deepseek',label:'DeepSeek Chat',cost:2,tier:0,provider:'deepseek',model:'deepseek-chat',usd:[.28,.42],tags:['اقتصادی'],note:'پاسخ‌های روشن با هزینهٔ کم.'},
];
const ids=new Set(CATALOG.map(m=>m.id));
// The catalog with the owner's overrides applied.
function models(settings){
  const own=settings?.models||{};
  return CATALOG.map(m=>{const o=own[m.id]||{};return {...m,label:o.label||m.label,cost:m.id==='local'?0:(Number.isInteger(o.cost)?o.cost:m.cost),tier:m.id==='local'?0:(Number.isInteger(o.tier)?o.tier:m.tier),model:o.model||m.model,provider:m.provider&&o.provider?o.provider:m.provider,enabled:m.id==='local'?true:o.enabled!==false};});
}
// The provider settings a catalog model speaks through, or null when it cannot be used right now.
function runtime(model,settings,keys){
  if(!model||model.id==='local'||!model.enabled)return null;
  const ai=settings.ai||{};
  const provider=model.provider==='active'?ai.provider:model.provider,p=PROVIDERS[provider],key=keys?.[provider];
  if(!settings.enabled||!p||!key)return null;
  if(model.provider==='active'&&!ai.enabled)return null;
  const configured=settings.providers?.[provider]||{};
  return {provider,key,model:model.model||configured.model||p.model,url:configured.url||p.url,temperature:ai.temperature??.4,maxTokens:Math.max(ai.maxTokens||1200,900),timeout:30000};
}
// What the dashboard shows: every enabled model grouped by maker, whether it can answer now, what a question costs
// and whether the person's plan opens it (`level` is their access level).
function offer(settings,keys,own,level=0){
  const names=Object.fromEntries(GROUPS);
  const list=models(settings).filter(m=>m.enabled).map(m=>({id:m.id,label:m.label,cost:m.cost,tags:m.tags,note:m.note,group:m.group,groupLabel:names[m.group],tier:m.tier,locked:m.tier>level,available:m.id==='local'||!!runtime(m,settings,keys)}));
  if(own)list.splice(1,0,{id:'own',label:'کلید خودت · '+own.model,cost:0,tags:['رایگان','حساب خودت'],note:'از حساب سرویس خودت؛ از سهمیه کم نمی‌شود.',group:'fandogh',groupLabel:names.fandogh,tier:0,locked:false,available:true});
  return list;
}
// Per-message dollar cost at 10,000 tokens, 80% of them read and 20% written.
const perMessage=m=>(m.usd[0]*.8+m.usd[1]*.2)*10000/1e6;
// Owner overrides: {id: {enabled, cost, tier, model, label, provider}}.
function validate(input,fail){
  if(input===undefined)return {};
  if(!input||typeof input!=='object'||Array.isArray(input))fail('فهرست مدل‌ها معتبر نیست');
  const out={};
  for(const [id,v] of Object.entries(input)){
    if(!ids.has(id)||id==='local'||!v||typeof v!=='object'||Array.isArray(v))fail('مدل '+id+' معتبر نیست');
    if(typeof v.enabled!=='boolean'||!Number.isInteger(v.cost)||v.cost<1||v.cost>50)fail('هزینهٔ هر مدل باید عددی بین ۱ تا ۵۰ پیام باشد');
    const tier=v.tier===undefined?CATALOG.find(m=>m.id===id).tier:v.tier;
    if(!Number.isInteger(tier)||tier<0||tier>3)fail('اشتراک لازم برای مدل '+id+' معتبر نیست');
    const model=String(v.model||'').trim(),label=String(v.label||'').trim(),provider=String(v.provider||'').trim();
    if(model&&(model.length>80||!/^[\w.:/@-]+$/.test(model)))fail('شناسهٔ مدل '+id+' معتبر نیست');
    if(label&&(label.length>40||/[<>\x00-\x1f]/.test(label)))fail('نام مدل '+id+' معتبر نیست');
    if(provider&&!Object.hasOwn(PROVIDERS,provider))fail('سرویس مدل '+id+' معتبر نیست');
    out[id]={enabled:v.enabled,cost:v.cost,tier,model,label,provider};
  }
  return out;
}
module.exports={CATALOG,GROUPS,models,runtime,offer,validate,ids,perMessage};
