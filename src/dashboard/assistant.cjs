// Resume assistant API. GET returns today's allowance and the assistant plans; POST /ask answers one question.
// Every question counts against the daily allowance (free: a few; subscription or assistant plan: generous).
// The answer comes from the language model when one is configured, otherwise from the local brain; the local
// brain also supplies the action buttons (go to a field, open a page) the model's text cannot.
const {readJson}=require('../http/security.cjs'),{fail}=require('./model.cjs'),{RI}=require('./render.cjs');
const brain=require('../../dist/dashboard/js/advisor-brain.js'),llm=require('../ai/assistant-llm.cjs');
const positive=(value,fallback)=>{const n=Number(value);return Number.isSafeInteger(n)&&n>0&&n<=10000?n:fallback;};
const limits=(env=process.env)=>({free:positive(env.ASSISTANT_FREE_DAILY,RI.ASSISTANT_FREE_DAILY),paid:positive(env.ASSISTANT_PAID_DAILY,200)});

async function status(database,userId){
  const access=await database.assistantAccess(userId),used=await database.assistantUsed(userId),l=limits(),limit=access.plan==='free'?l.free:l.paid;
  const policy=database.commerceSettings?await database.commerceSettings():{prices:{},paused:[]};
  const plans=Object.values(RI.ASSISTANT_PLANS).map(p=>({id:p.id,period:p.period,months:p.months,price:policy.prices?.['assistant:'+p.id]??p.price,paused:!!policy.paused?.includes('assistant:'+p.id)}));
  return {plan:access.plan,until:access.until,used,limit,remaining:Math.max(0,limit-used),plans,ai:llm.config().enabled};
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
  if(path==='/api/dashboard/assistant'){if(req.method!=='GET')fail('روش درخواست معتبر نیست',405);reply(200,await status(database,user.id));return true;}
  if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
  if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
  const input=await readJson(req,96*1024);
  const question=typeof input.question==='string'?input.question.trim():'',goal=typeof input.goal==='string'?input.goal.trim().slice(0,160):'';
  if(question.length<1||question.length>500||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(question))fail('سؤالت را در یک تا پانصد حرف بنویس');
  if(!input.content||typeof input.content!=='object'||Array.isArray(input.content))fail('اطلاعات رزومه همراه سؤال نیامد');
  const history=Array.isArray(input.history)?input.history.slice(-6).filter(h=>h&&['user','assistant'].includes(h.role)&&typeof h.text==='string').map(h=>({role:h.role,text:h.text.slice(0,1200)})):[];
  const access=await database.assistantAccess(user.id),l=limits();
  try{await database.useAssistant(user.id,access.plan==='free'?l.free:l.paid);}
  catch(error){if(error.code!=='ASSISTANT_LIMIT')throw error;reply(429,{error:access.plan==='free'?'پیام‌های رایگان امروز تمام شد؛ فردا دوباره می‌توانی بپرسی یا دستیار را فعال کنی.':'سقف استفادهٔ منصفانهٔ امروز پر شد؛ فردا دوباره در خدمتم.',code:'ASSISTANT_LIMIT',usage:await status(database,user.id)});return true;}
  const resume=content(input.content),local=brain.reply(question,resume,{goal});
  const score=brain.score(resume,{goal}),analysis={score:score.total,dimensions:score.dims.map(d=>({label:d.label,value:d.value,reasons:d.reasons})),role:score.role?.label||null,typos:brain.spelling(resume)};
  let ai=null;try{ai=await llm.answer({question,content:resume,goal,history,analysis});}catch{ai=null;}
  const keep=local.actions.filter(a=>['go','route','tab','goal'].includes(a.kind));
  const answer=ai?{intent:local.intent,text:ai.text,actions:[...ai.actions,...keep].slice(0,8),follow:local.follow,source:'ai'}:{...local,source:'local'};
  reply(200,{reply:answer,usage:await status(database,user.id)});
  return true;
};
module.exports.limits=limits;
