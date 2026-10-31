// Owner panel for Fandogh: settings with masked keys, the provider catalogue, usage numbers and the assistant
// plans as the catalogue sells them; plus a one-line test call so a key can be checked before it is switched on.
const {fail}=require('../dashboard/model.cjs'),{RI}=require('../dashboard/render.cjs');
const providers=require('../ai/providers.cjs'),catalog=require('../ai/catalog.cjs'),llm=require('../ai/assistant-llm.cjs'),ownerSettings=require('../owner/assistant-settings.cjs');

async function view(database){
  const {settings,keys}=await database.assistantSettings(),policy=database.commerceSettings?await database.commerceSettings():require('../owner/settings.cjs').defaults();
  const plans=Object.values(RI.ASSISTANT_PLANS).map(p=>{const ref='assistant:'+p.id;return {ref,id:p.id,period:p.period,months:p.months,base:p.price,price:policy.prices?.[ref]??p.price,paused:!!policy.paused?.includes(ref),expected:{price:policy.prices?.[ref]??p.price,paused:!!policy.paused?.includes(ref),metadata:policy.products?.[ref]||null}};});
  return {
    settings,
    keys:Object.fromEntries(Object.keys(providers.PROVIDERS).map(id=>[id,{set:!!keys[id],hint:ownerSettings.hint(keys[id])}])),
    providers:Object.entries(providers.PROVIDERS).map(([id,p])=>({id,label:p.label,model:p.model,models:p.models,url:p.url,needsUrl:id==='custom'})),
    models:catalog.models(settings).filter(m=>m.id!=='local').map(m=>({...m,base:catalog.CATALOG.find(x=>x.id===m.id),available:!!catalog.runtime(m,settings,keys)})),
    stats:await database.assistantStats(),
    plans,
    live:!!ownerSettings.runtime(settings,keys),
    envFallback:llm.config().enabled,
  };
}
// Sends one short greeting through the chosen provider, with Fandogh's identity rules, and reports what came back.
async function test(database,input,fetcher=fetch){
  if(!input||typeof input!=='object'||!Object.hasOwn(providers.PROVIDERS,input.provider))fail('سرویس انتخاب‌شده معتبر نیست');
  const p=providers.PROVIDERS[input.provider],{keys}=await database.assistantSettings();
  const key=typeof input.key==='string'&&input.key.trim()?input.key.trim():keys[input.provider];
  if(!key)fail('کلید این سرویس هنوز وارد نشده');
  const model=String(input.model||'').trim()||p.model,url=String(input.url||'').trim()||p.url;
  if(model.length>80||!/^[\w.:/@-]+$/.test(model))fail('نام مدل معتبر نیست');
  const started=Date.now();
  try{
    const out=await providers.chat({provider:input.provider,key,model,url,temperature:.3,maxTokens:120,timeout:20000},{system:providers.IDENTITY+'\n\nفقط فارسی و در یک جمله جواب بده.',messages:[{role:'user',content:'سلام! تو کی هستی و از چه هوش مصنوعی‌ای استفاده می‌کنی؟'}]},fetcher);
    return {ok:true,ms:Date.now()-started,reply:providers.guard(out.text).slice(0,300),tokens:out.input+out.output};
  }catch(error){return {ok:false,ms:Date.now()-started,error:error.message};}
}
module.exports={view,test};
