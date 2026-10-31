// Resume assistant API. GET returns today's allowance and the assistant plans; POST /ask answers one question.
// Every question counts against the daily allowance; the owner sets the allowances, can pause Fandogh, and can
// connect a language model in the admin panel. Small talk and anything about who Fandogh is stay with the local
// brain; the rest goes to the model when one is connected and today's cap allows, otherwise to the local brain.
// The local brain also supplies the action buttons (go to a field, open a page) the model's text cannot.
const {readJson}=require('../http/security.cjs'),{fail}=require('./model.cjs'),{RI}=require('./render.cjs');
const brain=require('../../dist/dashboard/js/advisor-brain.js'),llm=require('../ai/assistant-llm.cjs'),ownerSettings=require('../owner/assistant-settings.cjs');
const limits=(env=process.env)=>{const d=ownerSettings.defaults(env);return {free:d.freeDaily,paid:d.paidDaily};};
// The owner's settings when the database keeps them; tests and older stores fall back to the environment.
async function load(database){
  if(database.assistantSettings)return database.assistantSettings();
  return {settings:ownerSettings.defaults(),keys:{}};
}
const IDENTITY=new Set(['name','model','bot','maker']);

async function status(database,userId,config){
  const {settings}=config||await load(database),access=await database.assistantAccess(userId),used=await database.assistantUsed(userId),limit=access.plan==='free'?settings.freeDaily:settings.paidDaily;
  const policy=database.commerceSettings?await database.commerceSettings():{prices:{},paused:[]};
  const plans=Object.values(RI.ASSISTANT_PLANS).map(p=>({id:p.id,period:p.period,months:p.months,price:policy.prices?.['assistant:'+p.id]??p.price,paused:!!policy.paused?.includes('assistant:'+p.id)}));
  return {plan:access.plan,until:access.until,used,limit,remaining:Math.max(0,limit-used),plans,enabled:settings.enabled,ai:!!(ownerSettings.runtime(settings,(config||{}).keys||{})||llm.config().enabled),smalltalk:!!(settings.ai.smalltalk&&ownerSettings.runtime(settings,(config||{}).keys||{}))};
}
// The brain and the model get the story only: contact values become "filled or not", images become a flag.
function content(raw){
  const c=llm.trim(raw);
  c.contacts=c.contacts.map(x=>({type:x.type,public:x.public,value:x.filled?'•':''}));
  c.socials=c.socials.map(platform=>({platform}));
  return c;
}

module.exports=async(database,req,path,origin,user,reply)=>{
  if(path!=='/api/dashboard/assistant'&&path!=='/api/dashboard/assistant/ask')return false;
  if(!database.assistantAccess)fail('دستیار فعلاً در دسترس نیست',503);
  const config=await load(database),{settings,keys}=config;
  if(path==='/api/dashboard/assistant'){if(req.method!=='GET')fail('روش درخواست معتبر نیست',405);reply(200,await status(database,user.id,config));return true;}
  if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
  if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
  const input=await readJson(req,96*1024);
  const question=typeof input.question==='string'?input.question.trim():'',goal=typeof input.goal==='string'?input.goal.trim().slice(0,160):'';
  if(question.length<1||question.length>500||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(question))fail('سؤالت را در یک تا پانصد حرف بنویس');
  if(!input.content||typeof input.content!=='object'||Array.isArray(input.content))fail('اطلاعات رزومه همراه سؤال نیامد');
  if(!settings.enabled){reply(503,{error:'فندق فعلاً در حال استراحت است؛ کمی بعد دوباره سر بزن 🐾',code:'ASSISTANT_PAUSED',usage:await status(database,user.id,config)});return true;}
  const history=Array.isArray(input.history)?input.history.slice(-6).filter(h=>h&&['user','assistant'].includes(h.role)&&typeof h.text==='string').map(h=>({role:h.role,text:h.text.slice(0,1200)})):[];
  const access=await database.assistantAccess(user.id);
  try{await database.useAssistant(user.id,access.plan==='free'?settings.freeDaily:settings.paidDaily);}
  catch(error){if(error.code!=='ASSISTANT_LIMIT')throw error;reply(429,{error:access.plan==='free'?'پیام‌های رایگان امروز تمام شد؛ فردا دوباره می‌توانی بپرسی یا دستیار را فعال کنی.':'سقف استفادهٔ منصفانهٔ امروز پر شد؛ فردا دوباره در خدمتم.',code:'ASSISTANT_LIMIT',usage:await status(database,user.id,config)});return true;}
  const resume=content(input.content),local=brain.reply(question,resume,{goal,history});
  // Who Fandogh is never goes to a model; small talk only when the owner allows it.
  const talk=local.intent==='smalltalk',mine=talk&&(local.topics||[local.topic]).some(t=>IDENTITY.has(t));
  const model=ownerSettings.runtime(settings,keys),capped=model&&database.assistantAICalls?await database.assistantAICalls()>=settings.ai.dailyCalls:false;
  let ai=null;
  if(!mine&&(!talk||settings.ai.smalltalk)&&!capped){
    const score=brain.score(resume,{goal}),analysis={score:score.total,dimensions:score.dims.map(d=>({label:d.label,value:d.value,reasons:d.reasons})),role:score.role?.label||null,typos:brain.spelling(resume)};
    try{ai=await llm.answer({question,content:resume,goal,history,analysis},model||process.env,fetch,!!model);}catch{ai=null;}
    if(model&&database.recordAssistantAI){try{await database.recordAssistantAI(model.provider,!!ai&&!ai.error,ai?.usage?.input,ai?.usage?.output);}catch{}}
    if(ai?.error)ai=null;
  }
  const keep=local.actions.filter(a=>['go','route','tab','goal'].includes(a.kind));
  const answer=ai?{intent:local.intent,text:ai.text,actions:[...ai.actions,...keep].slice(0,8),follow:local.follow,source:'ai'}:{...local,source:'local'};
  reply(200,{reply:answer,usage:await status(database,user.id,config)});
  return true;
};
module.exports.limits=limits;
