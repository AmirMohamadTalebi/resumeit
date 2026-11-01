// Resume assistant API. GET returns the Fandogh wallet (toman and Luna tokens, latest charges), the models on offer
// (grouped by maker, with what the person's plan opens and what a typical message costs) and the Fandogh plans;
// POST /topup turns It into wallet credit; POST /ask answers one question with the model the person picked and
// charges the tokens it really used at the model's price plus the owner's margin. «فندق محلی» (the local brain) is
// the default and free, a model above the person's plan is not used, and their own key is free. Who Fandogh is always stays local, and so does small talk unless the owner allows it. When the
// local brain cannot answer, it says where the advanced assistant is. Resume edits the model proposes are checked
// against the resume the user sent and returned as `edits`; the dashboard applies them.
const {readJson}=require('../http/security.cjs'),{fail}=require('./model.cjs'),{RI}=require('./render.cjs');
const brain=require('../../dist/dashboard/js/advisor-brain.js'),llm=require('../ai/assistant-llm.cjs'),ownerSettings=require('../owner/assistant-settings.cjs'),Edits=require('../../dist/dashboard/js/assistant-edits.js'),userAssistant=require('./assistant-user.cjs'),providers=require('../ai/providers.cjs'),catalog=require('../ai/catalog.cjs');
// The owner's settings when the database keeps them; tests and older stores fall back to the environment.
async function load(database){
  if(database.assistantSettings)return database.assistantSettings();
  return {settings:ownerSettings.defaults(),keys:{}};
}
const IDENTITY=new Set(['name','model','bot','maker']);
const ROUTES=['/api/dashboard/assistant','/api/dashboard/assistant/ask','/api/dashboard/assistant/me','/api/dashboard/assistant/me/test','/api/dashboard/assistant/topup'];

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
function offer(settings,keys,me,level=0){
  const own=userAssistant.runtime(me.settings,me.key),list=catalog.offer(settings,keys,own,level);
  for(const m of list)if(m.id==='luna'&&!m.available)m.available=!!connect(catalog.models(settings).find(x=>x.id==='luna'),settings,keys);
  return list;
}
async function status(database,userId,config,me){
  me=me||await mine(database,userId);
  const {settings,keys}=config||await load(database),access=await database.assistantAccess(userId),bill=catalog.billingOf(settings);
  // A new account starts with a little credit to try the advanced models, once.
  if(bill.welcome>0&&database.creditFandogh)try{await database.creditFandogh(userId,bill.welcome*10,'welcome','welcome:'+userId,'هدیهٔ شروع فندق');}catch{}
  const wallet=database.fandoghWallet?await database.fandoghWallet(userId,12):{balance:0,ledger:[],daily:[]},token=catalog.tokenRial(settings);
  const policy=database.commerceSettings?await database.commerceSettings():{prices:{},paused:[]};
  const plans=Object.values(RI.ASSISTANT_PLANS).map(p=>({id:p.id,name:policy.products?.['assistant:'+p.id]?.name||p.name,title:p.title,period:p.period,months:p.months,level:p.level,credit:bill.starter?.[p.id]??p.credit,desc:policy.products?.['assistant:'+p.id]?.desc||p.desc,price:policy.prices?.['assistant:'+p.id]??p.price,paused:!!policy.paused?.includes('assistant:'+p.id)}));
  const models=offer(settings,keys||{},me,access.level),engine=models.some(m=>m.id===me.settings.engine&&m.available&&!m.locked)?me.settings.engine:'local';
  const toman=rial=>Math.round(rial)/10;
  return {plan:access.plan,planName:RI.ASSISTANT_PLANS[access.plan]?.name||(access.plan==='subscription'?'اشتراک رزومیت':'رایگان'),level:access.level,subscription:access.subscription,until:access.until,
    wallet:{toman:toman(wallet.balance),tokens:Math.floor(wallet.balance/token),tokenToman:Math.round(token/10*1e6)/1e6,ledger:wallet.ledger.map(x=>({...x,toman:toman(x.delta),tokens:x.kind==='usage'?-Math.round((x.input+x.output)*(1+bill.markup/100)):Math.round(x.delta/token)})),daily:(wallet.daily||[]).map(d=>({at:d.at,day:d.day,count:d.count,toman:toman(d.delta),tokens:-Math.round((d.input+d.output)*(1+bill.markup/100))}))},
    billing:{markup:bill.markup,dollar:bill.dollar,welcome:bill.welcome,site:bill.starter?.subscription??RI.ASSISTANT_SITE.credit,topups:RI.FANDOGH_TOPUPS},tiers:RI.ASSISTANT_TIERS,plans,enabled:settings.enabled,ai:models.some(m=>m.id!=='local'&&m.available),smalltalk:!!settings.ai.smalltalk,name:me.settings.name,suggest:me.settings.suggest!==false,own:!!userAssistant.runtime(me.settings,me.key),models,engine};
}
// The brain and the model get the story only: contact values become "filled or not", images become a flag.
function content(raw){
  const c=llm.trim(raw);
  c.contacts=c.contacts.map(x=>({type:x.type,public:x.public,value:x.filled?'•':''}));
  c.socials=c.socials.map(platform=>({platform}));
  return c;
}

// At most 20 questions a minute per person, so one account cannot use up the site's daily AI calls for everyone.
// shortcut: counted in this process only; move it to the database if the site ever runs several processes.
const asked=new Map();
function tooFast(id,now=Date.now()){
  const list=(asked.get(id)||[]).filter(t=>now-t<60000);list.push(now);asked.set(id,list);
  if(asked.size>5000)for(const [key,times] of asked)if(now-times[times.length-1]>60000)asked.delete(key);
  return list.length>20;
}
module.exports=async(database,req,path,origin,user,reply)=>{
  if(!ROUTES.includes(path))return false;
  if(!database.assistantAccess)fail('دستیار فعلاً در دسترس نیست',503);
  const config=await load(database),{settings,keys}=config;
  // The person's own settings: name, tone, length, default model and, if they like, their own key (free).
  if(path==='/api/dashboard/assistant/me'||path==='/api/dashboard/assistant/me/test'){
    if(req.method==='GET'&&path.endsWith('/me')){const me=await mine(database,user.id),access=await database.assistantAccess(user.id);reply(200,{...userAssistant.view(me.settings,me.key),models:offer(settings,keys,me,access.level)});return true;}
    if(req.method!=='POST')fail('روش درخواست معتبر نیست',405);
    if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json')fail('مبدأ درخواست معتبر نیست',403);
    if(!database.saveAssistantUserSettings)fail('تنظیمات فندق فعلاً در دسترس نیست',503);
    const body=await readJson(req,16*1024);
    if(path.endsWith('/me')){const saved=await database.saveAssistantUserSettings(user.id,userAssistant.validate(body.settings),userAssistant.validateKey(body.key));const access=await database.assistantAccess(user.id);reply(200,{...userAssistant.view(saved.settings,saved.key),models:offer(settings,keys,saved,access.level)});return true;}
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
  if(path==='/api/dashboard/assistant/topup'){
    if(!database.topUpFandogh)fail('شارژ کیف پول فندق فعلاً در دسترس نیست',503);
    const body=await readJson(req,4*1024);
    const out=await database.topUpFandogh(user.id,body.its,body.requestId);
    reply(200,{ok:true,repeated:!!out.repeated,usage:await status(database,user.id,config)});return true;
  }
  if(tooFast(user.id)){fail('پیام‌ها خیلی پشت سر هم است؛ چند ثانیه صبر کن و دوباره بپرس',429);}
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
  const access=await database.assistantAccess(user.id),locked=pick.id!=='own'&&(pick.tier||0)>access.level;
  const cfg=pick.id==='own'?own:pick.id==='local'||locked?null:connect(pick,settings,keys);
  const resume=content(input.content),local=brain.reply(question.slice(0,500),resume,{goal,history});
  const talk=local.intent==='smalltalk',identity=talk&&(local.topics||[local.topic]).some(t=>IDENTITY.has(t));
  const useModel=!!cfg&&!identity&&(!talk||settings.ai.smalltalk||pick.id==='own');
  const shared=useModel&&pick.id!=='own',capped=shared&&database.assistantAICalls?await database.assistantAICalls()>=settings.ai.dailyCalls:false;
  // A paid model needs credit for a typical message; the real price replaces it once the answer is here.
  const paid=useModel&&!capped&&pick.id!=='own',estimate=paid?catalog.typical(pick,settings):0;
  // The typical price is held up front, so parallel messages cannot spend the same credit twice.
  const hold=paid&&database.holdFandogh?await database.holdFandogh(user.id,estimate,{model:pick.id,label:pick.label}):null;
  if(paid&&database.holdFandogh){
    if(!hold){reply(402,{error:'اعتبار کیف پول فندق برای «'+pick.label+'» کافی نیست (هر پیام حدود '+RI.fa(Math.ceil(estimate/10))+' تومان). کیف پول فندق را با It شارژ کن؛ فندق محلی همچنان رایگان جواب می‌دهد.',code:'FANDOGH_BALANCE',usage:await status(database,user.id,config,me)});return true;}
  }
  let ai=null;
  if(useModel&&!capped){
    const score=brain.score(resume,{goal}),analysis={score:score.total,dimensions:score.dims.map(d=>({label:d.label,value:d.value,reasons:d.reasons})),role:score.role?.label||null,typos:brain.spelling(resume)};
    try{ai=await llm.answer({question,content:resume,goal,history,analysis,mode,page,persona:userAssistant.persona(me.settings)},cfg,fetch,true);}catch{ai=null;}
    if(shared&&cfg.provider&&database.recordAssistantAI){try{await database.recordAssistantAI(cfg.provider,!!ai&&!ai.error,ai?.usage?.input,ai?.usage?.output);}catch{}}
    if(ai?.error)ai=null;
    // Charged only for an answer that came: the tokens the provider reported (a typical message when it reported
    // none) at the model's price plus the margin. No answer, nothing to pay; the local brain answers for free.
    if(hold){
      const reported=!!(ai?.usage?.input||ai?.usage?.output),input=reported?ai.usage.input||0:8000,output=reported?ai.usage.output||0:2000,rial=!ai?0:reported?catalog.charge(pick,input,output,settings):estimate;
      // A failed settlement keeps the held typical price; the answer is still delivered.
      try{await database.settleFandogh(user.id,hold,rial,{input,output});}catch(error){require('../http/log.cjs').logFailure('assistant',req,error);}
      if(ai)ai.bill={rial,input,output};
    }
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
      const models=offer(settings,keys,me,access.level),better=models.find(m=>m.id==='luna'&&m.available&&!m.locked)||models.find(m=>m.id!=='local'&&m.available&&!m.locked);
      // A model above the person's plan: name the plan that opens it.
      const need=locked&&Object.values(RI.ASSISTANT_PLANS).find(p=>p.level>=pick.tier);
      const why=locked?'«'+pick.label+'» در اشتراک «'+(need?.name||'کوروش')+'» فندق یا اشتراک رزومیت باز است. ':pick.id!=='local'&&!cfg?'«'+pick.label+'» الان در دسترس نیست. ':'';
      answer.text=(answer.text?answer.text+'\n\n':'')+why+(better?'برای این‌جور سؤال‌ها دستیار پیشرفته بهتر کمک می‌کند: «'+better.label+'» را از انتخاب مدل در صفحهٔ فندق بزن ('+(better.cost?'هر پیام حدود '+RI.fa(better.cost)+' تومان از کیف پول فندق':'رایگان')+')، یا در «تنظیمات فندق» پیش‌فرضش کن.':'برای جواب‌های پیشرفته‌تر، در «تنظیمات فندق» کلید هوش مصنوعی خودت را وصل کن؛ رایگان است و از سهمیه کم نمی‌شود.');
      answer.actions=[...(locked?[{kind:'route',route:'assistant',label:'اشتراک‌های فندق'}]:[]),...(better?[{kind:'model',label:'بپرس از '+better.label,value:better.id}]:[]),...(locked?[]:[{kind:'route',route:'assistant',label:'تنظیمات فندق'}]),...(answer.actions||[])].slice(0,6);
    }
  }
  const token=catalog.tokenRial(settings);
  answer.model={id:ai?pick.id:'local',label:ai?pick.label:'فندق محلی',cost:ai?.bill?Math.round(ai.bill.rial)/10:0,tokens:ai?.bill?Math.round((ai.bill.input+ai.bill.output)*(1+catalog.billingOf(settings).markup/100)):0,used:ai?.bill?ai.bill.input+ai.bill.output:0};
  reply(200,{reply:answer,usage:await status(database,user.id,config,me)});
  return true;
};

