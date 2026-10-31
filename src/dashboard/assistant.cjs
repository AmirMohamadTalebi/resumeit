// Resume assistant API. GET returns today's allowance, the models on offer and the assistant plans; POST /ask
// answers one question with the model the person picked. «فندق محلی» (the local brain) is the default and free;
// the other models cost their catalog price in messages from the daily allowance (GPT Luna = 1), and a person's
// own key is free. Who Fandogh is always stays local, and so does small talk unless the owner allows it. When the
// local brain cannot answer, it says where the advanced assistant is. Resume edits the model proposes are checked
// against the resume the user sent and returned as `edits`; the dashboard applies them.
const {readJson}=require('../http/security.cjs'),{fail}=require('./model.cjs'),{RI}=require('./render.cjs');
const brain=require('../../dist/dashboard/js/advisor-brain.js'),llm=require('../ai/assistant-llm.cjs'),ownerSettings=require('../owner/assistant-settings.cjs'),Edits=require('../../dist/dashboard/js/assistant-edits.js'),userAssistant=require('./assistant-user.cjs'),providers=require('../ai/providers.cjs'),catalog=require('../ai/catalog.cjs');
const limits=(env=process.env)=>{const d=ownerSettings.defaults(env);return {free:d.freeDaily,paid:d.paidDaily};};
// The owner's settings when the database keeps them; tests and older stores fall back to the environment.
async function load(database){
  if(database.assistantSettings)return database.assistantSettings();
  return {settings:ownerSettings.defaults(),keys:{}};
}
const IDENTITY=new Set(['name','model','bot','maker']);
const ROUTES=['/api/dashboard/assistant','/api/dashboard/assistant/ask','/api/dashboard/assistant/me','/api/dashboard/assistant/me/test'];

// The person's own settings; stores without the table (older tests) behave as if nothing was saved.
async function mine(database,userId){
  try{return database.assistantUserSettings?await database.assistantUserSettings(userId):{settings:userAssistant.defaults(),key:''};}catch{return {settings:userAssistant.defaults(),key:''};}
}
// The provider settings behind a catalog model; GPT Luna also works through the older ASSISTANT_AI_* variables.
function connect(model,settings,keys){
  const cfg=catalog.runtime(model,settings,keys);if(cfg)return cfg;
  if(model.id==='luna'&&settings.enabled&&llm.config().enabled)return llm.resolve(process.env);
  return null;
}
function offer(settings,keys,me){
  const own=userAssistant.runtime(me.settings,me.key),list=catalog.offer(settings,keys,own);
  for(const m of list)if(m.id==='luna'&&!m.available)m.available=!!connect(catalog.models(settings).find(x=>x.id==='luna'),settings,keys);
  return list;
}
async function status(database,userId,config,me){
  me=me||await mine(database,userId);
  const {settings,keys}=config||await load(database),access=await database.assistantAccess(userId),used=await database.assistantUsed(userId),limit=access.plan==='free'?settings.freeDaily:settings.paidDaily;
  const policy=database.commerceSettings?await database.commerceSettings():{prices:{},paused:[]};
  const plans=Object.values(RI.ASSISTANT_PLANS).map(p=>({id:p.id,period:p.period,months:p.months,price:policy.prices?.['assistant:'+p.id]??p.price,paused:!!policy.paused?.includes('assistant:'+p.id)}));
  const models=offer(settings,keys||{},me),engine=models.some(m=>m.id===me.settings.engine&&m.available)?me.settings.engine:'local';
  return {plan:access.plan,until:access.until,used,limit,remaining:Math.max(0,limit-used),plans,enabled:settings.enabled,ai:models.some(m=>m.id!=='local'&&m.available),smalltalk:!!settings.ai.smalltalk,name:me.settings.name,own:!!userAssistant.runtime(me.settings,me.key),models,engine};
}
// The brain and the model get the story only: contact values become "filled or not", images become a flag.
function content(raw){
  const c=llm.trim(raw);
  c.contacts=c.contacts.map(x=>({type:x.type,public:x.public,value:x.filled?'•':''}));
  c.socials=c.socials.map(platform=>({platform}));
  return c;
}

module.exports=async(database,req,path,origin,user,reply)=>{
  if(!ROUTES.includes(path))return false;
  if(!database.assistantAccess)fail('دستیار فعلاً در دسترس نیست',503);
  const config=await load(database),{settings,keys}=config;
  // The person's own settings: name, tone, length, default model and, if they like, their own key (free).
  if(path==='/api/dashboard/assistant/me'||path==='/api/dashboard/assistant/me/test'){
    if(req.method==='GET'&&path.endsWith('/me')){const me=await mine(database,user.id);reply(200,{...userAssistant.view(me.settings,me.key),models:offer(settings,keys,me)});return true;}
    if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
    if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
    if(!database.saveAssistantUserSettings)fail('تنظیمات فندق فعلاً در دسترس نیست',503);
    const body=await readJson(req,16*1024);
    if(path.endsWith('/me')){const saved=await database.saveAssistantUserSettings(user.id,userAssistant.validate(body.settings),userAssistant.validateKey(body.key));reply(200,{...userAssistant.view(saved.settings,saved.key),models:offer(settings,keys,saved)});return true;}
    // Connection test with the key just typed or the stored one; the key never comes back in an error.
    const me=await mine(database,user.id),draft=userAssistant.validate({...me.settings,own:{...me.settings.own,...(body.own||{}),enabled:true}}),key=userAssistant.validateKey(body.key)||me.key;
    const cfg=userAssistant.runtime(draft,key);if(!cfg)fail('اول کلید سرویس را وارد کن');
    try{const out=await providers.chat({...cfg,maxTokens:120},{system:providers.IDENTITY+'\n'+userAssistant.persona(draft),messages:[{role:'user',content:'در یک جمله سلام کن و خودت را معرفی کن.'}]},fetch);reply(200,{ok:true,reply:providers.guard(out.text).slice(0,300)});}
    catch(error){reply(200,{ok:false,error:String(error?.message||'اتصال برقرار نشد').split(key).join('…').slice(0,300)});}
    return true;
  }
  if(path==='/api/dashboard/assistant'){if(req.method!=='GET')fail('روش درخواست معتبر نیست',405);reply(200,await status(database,user.id,config));return true;}
  if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
  if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
  const me=await mine(database,user.id),own=userAssistant.runtime(me.settings,me.key);
  const input=await readJson(req,128*1024);
  const question=typeof input.question==='string'?input.question.trim():'',goal=typeof input.goal==='string'?input.goal.trim().slice(0,160):'';
  const mode=input.mode==='auto'?'auto':'ask',page=typeof input.page==='string'&&/^[a-z-]{0,24}$/.test(input.page)?input.page:'';
  if(question.length<1||question.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(question))fail('پیامت را در یک تا چهار هزار حرف بنویس');
  if(!input.content||typeof input.content!=='object'||Array.isArray(input.content))fail('اطلاعات رزومه همراه سؤال نیامد');
  if(!settings.enabled){reply(503,{error:'فندق فعلاً در حال استراحت است؛ کمی بعد دوباره سر بزن 🐾',code:'ASSISTANT_PAUSED',usage:await status(database,user.id,config,me)});return true;}
  const history=Array.isArray(input.history)?input.history.slice(-10).filter(h=>h&&['user','assistant'].includes(h.role)&&typeof h.text==='string').map(h=>({role:h.role,text:h.text.slice(0,1600)})):[];
  // Which model answers: the one picked for this message, else the person's default, else the local brain.
  const wanted=typeof input.model==='string'&&/^[a-z0-9.-]{1,32}$/.test(input.model)?input.model:me.settings.engine||'local';
  const pick=wanted==='own'&&own?{id:'own',label:'کلید خودت',cost:0}:catalog.models(settings).find(m=>m.id===wanted&&m.enabled)||catalog.models(settings)[0];
  const cfg=pick.id==='own'?own:pick.id==='local'?null:connect(pick,settings,keys);
  const resume=content(input.content),local=brain.reply(question.slice(0,500),resume,{goal,history});
  const talk=local.intent==='smalltalk',identity=talk&&(local.topics||[local.topic]).some(t=>IDENTITY.has(t));
  const useModel=!!cfg&&!identity&&(!talk||settings.ai.smalltalk||pick.id==='own');
  const shared=useModel&&pick.id!=='own',capped=shared&&database.assistantAICalls?await database.assistantAICalls()>=settings.ai.dailyCalls:false;
  const cost=useModel&&!capped?pick.cost:0,access=await database.assistantAccess(user.id),limit=access.plan==='free'?settings.freeDaily:settings.paidDaily;
  if(cost)try{await database.useAssistant(user.id,limit,Date.now(),cost);}
  catch(error){if(error.code!=='ASSISTANT_LIMIT')throw error;reply(429,{error:cost>1?'«'+pick.label+'» برای هر پیام '+RI.fa(cost)+' پیام از سهمیه می‌خواهد و سهمیهٔ امروزت کافی نیست؛ مدل سبک‌تر یا فندق محلی (رایگان) را امتحان کن.':access.plan==='free'?'پیام‌های رایگان امروز تمام شد؛ فندق محلی همچنان رایگان جواب می‌دهد، یا دستیار را فعال کن.':'سقف استفادهٔ منصفانهٔ امروز پر شد؛ فندق محلی همچنان رایگان در خدمتت است.',code:'ASSISTANT_LIMIT',usage:await status(database,user.id,config,me)});return true;}
  let ai=null;
  if(useModel&&!capped){
    const score=brain.score(resume,{goal}),analysis={score:score.total,dimensions:score.dims.map(d=>({label:d.label,value:d.value,reasons:d.reasons})),role:score.role?.label||null,typos:brain.spelling(resume)};
    try{ai=await llm.answer({question,content:resume,goal,history,analysis,mode,page,persona:userAssistant.persona(me.settings)},cfg,fetch,true);}catch{ai=null;}
    if(shared&&cfg.provider&&database.recordAssistantAI){try{await database.recordAssistantAI(cfg.provider,!!ai&&!ai.error,ai?.usage?.input,ai?.usage?.output);}catch{}}
    if(ai?.error)ai=null;
    // No answer from the model: give the messages back and let the local brain answer for free.
    if(!ai&&cost)try{await database.refundAssistant(user.id,Date.now(),cost);}catch{}
  }
  const keep=local.actions.filter(a=>['go','route','tab','goal'].includes(a.kind));
  // Edits are checked against the resume as the user sent it (real ids and fields), never the trimmed copy.
  const changes=ai?Edits.normalize(ai.edits,input.content):[];
  let answer;
  if(ai)answer={intent:local.intent,text:ai.text||(changes.length?'این تغییرها را برای رزومه‌ات آماده کردم:':''),actions:[...ai.actions,...keep].slice(0,8),edits:changes,follow:changes.length?['بازم بهترش کن','چرا این تغییرها؟',...local.follow].slice(0,3):local.follow,source:'ai'};
  else{
    answer={...local,source:'local'};
    // The local brain could not help: say where the advanced assistant is.
    if(local.intent==='unknown'||(pick.id!=='local'&&!useModel&&!talk)){
      const models=offer(settings,keys,me),better=models.find(m=>m.id==='luna'&&m.available)||models.find(m=>m.id!=='local'&&m.available);
      const why=pick.id!=='local'&&!cfg?'«'+pick.label+'» الان در دسترس نیست. ':'';
      answer.text=(answer.text?answer.text+'\n\n':'')+why+(better?'برای این‌جور سؤال‌ها دستیار پیشرفته بهتر کمک می‌کند: «'+better.label+'» را از انتخاب مدل در صفحهٔ فندق بزن ('+(better.cost?RI.fa(better.cost)+' پیام از سهمیه':'رایگان')+')، یا در «تنظیمات فندق» پیش‌فرضش کن.':'برای جواب‌های پیشرفته‌تر، در «تنظیمات فندق» کلید هوش مصنوعی خودت را وصل کن؛ رایگان است و از سهمیه کم نمی‌شود.');
      answer.actions=[...(better?[{kind:'model',label:'بپرس از '+better.label,value:better.id}]:[]),{kind:'route',route:'assistant',label:'تنظیمات فندق'},...(answer.actions||[])].slice(0,6);
    }
  }
  answer.model={id:ai?pick.id:'local',label:ai?pick.label:'فندق محلی',cost:ai?cost:0};
  reply(200,{reply:answer,usage:await status(database,user.id,config,me)});
  return true;
};
module.exports.limits=limits;
