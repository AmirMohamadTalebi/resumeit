// The models a person can pick for Fandogh, grouped by maker, with the lowest plan that opens each (0 free,
// 1 «آرش», 2 «رستم», 3 «کوروش»; a ResumeIt subscription opens all) and its API price per million input/output
// tokens in dollars (`usd`, October 2026). An answer is billed at the tokens it really used × that price × the
// dollar rate × (1 + margin), in toman, from the person's Fandogh wallet. «فندق محلی» runs on ResumeIt itself and is
// free, and so is a person's own key. The owner can switch models off and change their plan, price, label, model id
// and the provider they go through (an OpenAI-compatible gateway, say).
const {PROVIDERS}=require('./providers.cjs');
const GROUPS=[['fandogh','فندق'],['openai','OpenAI'],['anthropic','Anthropic'],['google','Google'],['moonshot','Moonshot'],['deepseek','DeepSeek']];
const CATALOG=[
  {id:'local',group:'fandogh',label:'فندق محلی',tier:0,provider:null,model:'',usd:[0,0],tags:['رایگان','فوری'],note:'روی خود رزومیت؛ امتیاز، غلط‌گیری و راهنمایی‌های پایه.'},
  {id:'luna',group:'openai',label:'GPT-6 Luna',tier:0,provider:'active',model:'',usd:[.1,.5],tags:['واحد سهمیه','متعادل'],note:'دستیار پیشرفتهٔ پیش‌فرض؛ هر پیامش یک پیام است.'},
  {id:'gpt-6-sol',group:'openai',label:'GPT-6 Sol',tier:3,provider:'openai',model:'gpt-6-sol',usd:[2,10],tags:['استدلال قوی'],note:'تحلیل عمیق سوابق، آگهی و مسیر شغلی.'},
  {id:'gpt-6-astra',group:'openai',label:'GPT-6 Astra',tier:3,provider:'openai',model:'gpt-6-astra',usd:[10,50],tags:['پرچم‌دار'],note:'قوی‌ترین مدل OpenAI برای کارهای سنگین.'},
  {id:'claude-haiku',group:'anthropic',label:'Claude Haiku 5.5',tier:0,provider:'anthropic',model:'claude-haiku-5-5',usd:[.1,.5],tags:['سریع','نوشتن روان'],note:'بازنویسی تمیز و سریع جمله‌ها.'},
  {id:'claude-sonnet',group:'anthropic',label:'Claude Sonnet 5.5',tier:2,provider:'anthropic',model:'claude-sonnet-5-5',usd:[2,10],tags:['نوشتن عالی'],note:'بازنویسی کامل بخش‌ها با لحن حرفه‌ای.'},
  {id:'claude-opus',group:'anthropic',label:'Claude Opus 5.5',tier:3,provider:'anthropic',model:'claude-opus-5-5',usd:[4,20],tags:['خیلی قوی'],note:'بازنویسی کل رزومه و مقایسهٔ دقیق با آگهی.'},
  {id:'claude-fable',group:'anthropic',label:'Claude Fable 5.1',tier:3,provider:'anthropic',model:'claude-fable-5-1',usd:[10,50],tags:['قوی‌ترین'],note:'بهترین مدل Anthropic برای سخت‌ترین کارها.'},
  {id:'gemini-flash-lite',group:'google',label:'Gemini 3.1 Flash-Lite',tier:0,provider:'gemini',model:'gemini-3.1-flash-lite',usd:[.25,1.5],tags:['سبک'],note:'جواب‌های کوتاه و سریع.'},
  {id:'gemini-flash',group:'google',label:'Gemini 3.8 Flash',tier:1,provider:'gemini',model:'gemini-3.8-flash',usd:[.75,3.75],tags:['سریع','متن بلند'],note:'برای مقایسه با آگهی‌های طولانی.'},
  {id:'gemini-pro',group:'google',label:'Gemini 3.1 Pro',tier:2,provider:'gemini',model:'gemini-3.1-pro-preview',usd:[2,12],tags:['استدلال'],note:'برنامه‌ریزی مسیر شغلی و آمادگی مصاحبه.'},
  {id:'gemini-argon',group:'google',label:'Gemini 4 Argon',tier:3,provider:'gemini',model:'gemini-4-argon',usd:[2,10],tags:['پرچم‌دار'],note:'پرچم‌دار گوگل برای تحلیل‌های بزرگ.'},
  {id:'kimi-k2-6',group:'moonshot',label:'Kimi K2.6',tier:1,provider:'moonshot',model:'kimi-k2.6',usd:[.95,4],tags:['اقتصادی'],note:'پاسخ‌های روشن با هزینهٔ کم.'},
  {id:'kimi-k3-1-pro',group:'moonshot',label:'Kimi K3.1 Pro',tier:2,provider:'moonshot',model:'kimi-k3.1-pro',usd:[2,10],tags:['متعادل'],note:'نسخهٔ تازهٔ Kimi برای نوشتن و تحلیل.'},
  {id:'kimi-k3',group:'moonshot',label:'Kimi K3',tier:2,provider:'moonshot',model:'kimi-k3',usd:[3,15],tags:['قوی'],note:'پرچم‌دار Moonshot.'},
  {id:'deepseek',group:'deepseek',label:'DeepSeek Chat',tier:0,provider:'deepseek',model:'deepseek-chat',usd:[.28,.42],tags:['اقتصادی'],note:'پاسخ‌های روشن با هزینهٔ کم.'},
];
const ids=new Set(CATALOG.map(m=>m.id));
// The catalog with the owner's overrides applied.
function models(settings){
  const own=settings?.models||{};
  return CATALOG.map(m=>{const o=own[m.id]||{};return {...m,label:o.label||m.label,usd:m.id==='local'?[0,0]:(Array.isArray(o.usd)?o.usd:m.usd),tier:m.id==='local'?0:(Number.isInteger(o.tier)?o.tier:m.tier),model:o.model||m.model,provider:m.provider&&o.provider?o.provider:m.provider,enabled:m.id==='local'?true:o.enabled!==false};});
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
// Billing. Every token an answer used counts (1 + margin) times, 50% by default (1,000 used → 1,500 charged), and
// each charged token costs the model's own API price (input and output apart) at the dollar rate. Amounts are kept
// in rial and shown in toman: 17,500 charged tokens of GPT-6 Luna ($0.10 a million) are about 525 toman, of GPT-6
// Astra ($10) about 52,500 toman, at 300,000 toman a dollar.
const DEFAULT_BILLING={dollar:300000,markup:50};
const billingOf=settings=>({...DEFAULT_BILLING,...(settings?.billing||{})});
// Rial for an answer that read `input` tokens and wrote `output` tokens.
function charge(model,input,output,settings){
  const b=billingOf(settings),[pin,pout]=model.usd||[0,0];
  return Math.ceil((input*pin+output*pout)/1e6*b.dollar*(1+b.markup/100)*10);
}
// Rial one charged GPT-6 Luna input token costs (the wallet is also read in Luna tokens).
const tokenRial=settings=>{const b=billingOf(settings),luna=models(settings).find(m=>m.id==='luna');return (luna.usd[0]||.1)/1e6*b.dollar*10;};
// A typical message: 10,000 tokens, 8,000 read and 2,000 written.
const typical=(model,settings)=>charge(model,8000,2000,settings);
// What the dashboard shows: every enabled model grouped by maker, whether it can answer now, what a question costs
// and whether the person's plan opens it (`level` is their access level).
function offer(settings,keys,own,level=0){
  const names=Object.fromEntries(GROUPS);
  const list=models(settings).filter(m=>m.enabled).map(m=>({id:m.id,label:m.label,cost:m.id==='local'?0:Math.max(1,Math.round(typical(m,settings)/10)),million:[m.usd[0],m.usd[1]].map(p=>Math.round(p*billingOf(settings).dollar)),tags:m.tags,note:m.note,group:m.group,groupLabel:names[m.group],tier:m.tier,locked:m.tier>level,available:m.id==='local'||!!runtime(m,settings,keys)}));
  if(own)list.splice(1,0,{id:'own',label:'کلید خودت · '+own.model,cost:0,tags:['رایگان','حساب خودت'],note:'از حساب سرویس خودت؛ از سهمیه کم نمی‌شود.',group:'fandogh',groupLabel:names.fandogh,tier:0,locked:false,available:true});
  return list;
}
// Owner overrides: {id: {enabled, tier, usd: [input, output], model, label, provider}}.
function validate(input,fail){
  if(input===undefined)return {};
  if(!input||typeof input!=='object'||Array.isArray(input))fail('فهرست مدل‌ها معتبر نیست');
  const out={};
  for(const [id,v] of Object.entries(input)){
    if(!ids.has(id)||id==='local'||!v||typeof v!=='object'||Array.isArray(v))fail('مدل '+id+' معتبر نیست');
    const usd=v.usd===undefined?CATALOG.find(m=>m.id===id).usd:v.usd;
    if(typeof v.enabled!=='boolean'||!Array.isArray(usd)||usd.length!==2||usd.some(p=>typeof p!=='number'||!(p>0&&p<=500)))fail('قیمت هر میلیون توکن مدل '+id+' باید عددی مثبت (دلار) باشد');
    const tier=v.tier===undefined?CATALOG.find(m=>m.id===id).tier:v.tier;
    if(!Number.isInteger(tier)||tier<0||tier>3)fail('اشتراک لازم برای مدل '+id+' معتبر نیست');
    const model=String(v.model||'').trim(),label=String(v.label||'').trim(),provider=String(v.provider||'').trim();
    if(model&&(model.length>80||!/^[\w.:/@-]+$/.test(model)))fail('شناسهٔ مدل '+id+' معتبر نیست');
    if(label&&(label.length>40||/[<>\x00-\x1f]/.test(label)))fail('نام مدل '+id+' معتبر نیست');
    if(provider&&!Object.hasOwn(PROVIDERS,provider))fail('سرویس مدل '+id+' معتبر نیست');
    out[id]={enabled:v.enabled,tier,usd:usd.map(p=>Math.round(p*1000)/1000),model,label,provider};
  }
  return out;
}
module.exports={CATALOG,GROUPS,models,runtime,offer,validate,ids,charge,typical,tokenRial,billingOf,DEFAULT_BILLING};
