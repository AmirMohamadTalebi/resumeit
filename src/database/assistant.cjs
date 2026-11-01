// Resume assistant usage: who may ask how many questions. Every message is logged with its cost (heavier models
// cost more), and the allowance is two rolling windows: the last five hours and the last seven days. A ResumeIt
// subscription includes Fandogh with every model; the Fandogh plans («آرش»، «رستم»، «کوروش», account_access ref
// "assistant:<id>") add volume and open more models. Older "assistant:m1|m3|m6" purchases count as «آرش».

// Owner settings live in one row; provider keys sit sealed in their own column. AI usage is counted per day and
// provider so the panel can show calls, failures and tokens without storing any conversation.
const userSettings=require('../dashboard/assistant-user.cjs'),settings=require('../owner/assistant-settings.cjs'),{requireOwner}=require('../admin/access.cjs'),{fail}=require('../dashboard/model.cjs'),{randomUUID,createHash}=require('node:crypto');
async function initialize(execute){
  await execute('CREATE TABLE IF NOT EXISTS assistant_usage(user_id CHAR(36) NOT NULL,day INT NOT NULL,used INT NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_events(id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,at BIGINT NOT NULL,amount INT NOT NULL,INDEX assistant_events_user(user_id,at),INDEX assistant_events_at(at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_settings(id INT PRIMARY KEY,settings JSON NOT NULL,secrets TEXT NULL) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_user_settings(user_id CHAR(36) PRIMARY KEY,settings JSON NOT NULL,secret TEXT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_ai_usage(day INT NOT NULL,provider VARCHAR(24) NOT NULL,calls INT NOT NULL DEFAULT 0,failures INT NOT NULL DEFAULT 0,input_tokens BIGINT NOT NULL DEFAULT 0,output_tokens BIGINT NOT NULL DEFAULT 0,PRIMARY KEY(day,provider)) ENGINE=InnoDB');
}
const HOUR=3600000,WINDOW=5*HOUR,WEEK=7*24*HOUR,KEEP=15*24*HOUR;
const {RI}=require('../dashboard/render.cjs');
const parse=x=>typeof x==='string'?JSON.parse(x):x;
// 20261030 for the calendar day in Tehran, so the allowance renews at local midnight.
const tehranDay=(now=Date.now())=>Number(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(now).replace(/-/g,''));

module.exports=({execute,transaction})=>({
  // The person's plan: the best Fandogh plan they hold, a ResumeIt subscription (every model, lighter volume) or
  // free. Holding both gives the better of each: the higher model level and the larger allowance.
  async assistantAccess(userId,now=Date.now()){
    const rows=await execute("SELECT ref,expires_at FROM account_access WHERE user_id=? AND (ref LIKE 'subscription:%' OR ref LIKE 'assistant:%') AND expires_at>?",[userId,now]);
    const sub=Math.max(0,...rows.filter(r=>r.ref.startsWith('subscription:')).map(r=>Number(r.expires_at)));
    const held=rows.filter(r=>r.ref.startsWith('assistant:')).map(r=>{const id=r.ref.slice(10),plan=RI.ASSISTANT_PLANS[RI.ASSISTANT_LEGACY[id]||id];return plan&&{plan,until:Number(r.expires_at)};}).filter(Boolean).sort((x,y)=>y.plan.level-x.plan.level);
    const best=held[0];
    if(best)return {plan:best.plan.id,level:sub?RI.ASSISTANT_SITE.level:best.plan.level,until:best.until,subscription:!!sub};
    return sub?{plan:'subscription',level:RI.ASSISTANT_SITE.level,until:sub,subscription:true}:{plan:'free',level:0,until:null,subscription:false};
  },
  // Messages used in the last five hours and the last week, and when each window frees its oldest message.
  async assistantUsage(userId,now=Date.now()){
    const rows=await execute('SELECT at,amount FROM assistant_events WHERE user_id=? AND at>? ORDER BY at',[userId,now-WEEK]);
    const span=size=>{const list=rows.filter(r=>Number(r.at)>now-size);return {used:list.reduce((t,r)=>t+Number(r.amount),0),resetAt:list.length?Number(list[0].at)+size:null};};
    return {window:span(WINDOW),week:span(WEEK)};
  },
  async assistantUsed(userId,now=Date.now()){return (await this.assistantUsage(userId,now)).week.used;},
  // Takes a message's cost from both windows, or refuses with ASSISTANT_LIMIT naming the window that is full and
  // when it frees up. Returns the event id so a failed answer can be given back.
  async useAssistant(userId,limits,now=Date.now(),amount=1){
    return transaction(async con=>{
      await con.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[userId]);
      const [rows]=await con.execute('SELECT at,amount FROM assistant_events WHERE user_id=? AND at>? ORDER BY at',[userId,now-WEEK]);
      for(const [scope,size] of [['window',WINDOW],['week',WEEK]]){
        const list=rows.filter(r=>Number(r.at)>now-size),used=list.reduce((t,r)=>t+Number(r.amount),0);
        if(used+amount>limits[scope]){
          // The window frees enough room once its oldest messages age out.
          let room=limits[scope]-used,resetAt=null;for(const r of list){room+=Number(r.amount);if(room>=amount){resetAt=Number(r.at)+size;break;}}
          throw Object.assign(new Error('سهمیهٔ فندق تمام شد'),{status:429,code:'ASSISTANT_LIMIT',scope,resetAt});
        }
      }
      const id=randomUUID();
      await con.execute('INSERT INTO assistant_events(id,user_id,at,amount) VALUES(?,?,?,?)',[id,userId,now,amount]);
      await con.execute('DELETE FROM assistant_events WHERE user_id=? AND at<?',[userId,now-KEEP]);
      return id;
    });
  },
  // Gives a message back when no answer could be produced at all.
  async refundAssistant(userId,eventId){
    if(eventId)await execute('DELETE FROM assistant_events WHERE id=? AND user_id=?',[eventId,userId]);
  },
  // Server-side view: settings merged over defaults and the opened provider keys. Never sent to a browser.
  async assistantSettings(){
    const [row]=await execute('SELECT settings,secrets FROM assistant_settings WHERE id=1'),base=settings.defaults(),saved=row?parse(row.settings):{};
    return {settings:{...base,...saved,limits:{...base.limits,...(saved.limits||{})},ai:{...base.ai,...(saved.ai||{})},providers:{...(saved.providers||{})}},keys:settings.open(row?.secrets)};
  },
  // Saves the owner's settings and any changed keys, with the reason in the admin audit (key values never are).
  async saveAssistantSettings(actor,input){
    if(typeof input?.reason!=='string'||input.reason.trim().length<5||input.reason.length>500||/[\x00-\x1f\x7f<>]/.test(input.reason)||!/^[-a-f0-9]{16,64}$/.test(input.requestId||''))fail('دلیل و شناسهٔ عملیات معتبر نیست');
    const value=settings.validate(input.settings),changes=settings.validateKeys(input.keys),fingerprint=createHash('sha256').update(JSON.stringify({value,keys:Object.keys(changes)})).digest('hex');
    return transaction(async con=>{
      await requireOwner(con,actor);
      const [[prior]]=await con.execute('SELECT actor_id,action,details FROM admin_audit WHERE request_id=?',[input.requestId]);
      if(prior){if(prior.actor_id!==actor||prior.action!=='owner-assistant'||parse(prior.details).fingerprint!==fingerprint)fail('شناسهٔ عملیات قبلاً استفاده شده',409);return {ok:true,repeated:true};}
      const [[row]]=await con.execute('SELECT settings,secrets FROM assistant_settings WHERE id=1 FOR UPDATE'),keys=settings.open(row?.secrets);
      for(const [id,key]of Object.entries(changes))if(key===null)delete keys[id];else keys[id]=key;
      if(value.ai.enabled&&!keys[value.ai.provider])fail('برای روشن‌کردن پاسخ هوش مصنوعی، اول کلید سرویس انتخاب‌شده را وارد کن');
      const sealed=settings.seal(keys);
      if(row)await con.execute('UPDATE assistant_settings SET settings=?,secrets=? WHERE id=1',[JSON.stringify(value),sealed]);else await con.execute('INSERT INTO assistant_settings(id,settings,secrets) VALUES(1,?,?)',[JSON.stringify(value),sealed]);
      await con.execute('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,NULL,?,?,?,?,?)',[randomUUID(),actor,'owner-assistant',input.reason.trim(),JSON.stringify({previous:row?parse(row.settings):null,settings:value,keys:Object.fromEntries(Object.entries(changes).map(([id,key])=>[id,key===null?'removed':'set'])),fingerprint}),input.requestId,Date.now()]);
      return {ok:true};
    });
  },
  // A person's own Fandogh settings and their opened key (server-side only).
  async assistantUserSettings(userId){
    const [row]=await execute('SELECT settings,secret FROM assistant_user_settings WHERE user_id=?',[userId]);
    return {settings:userSettings.merge(row?parse(row.settings):null),key:row?userSettings.open(row.secret):''};
  },
  // Saves validated settings; key undefined keeps the stored key, null removes it, a string replaces it.
  async saveAssistantUserSettings(userId,value,key){
    return transaction(async con=>{
      const [[row]]=await con.execute('SELECT secret FROM assistant_user_settings WHERE user_id=? FOR UPDATE',[userId]);
      const current=row?userSettings.open(row.secret):'',next=key===undefined?current:key===null?'':key;
      if(value.own.enabled&&!next)fail('برای استفاده از هوش مصنوعی خودت، اول کلیدش را وارد کن');
      if(row)await con.execute('UPDATE assistant_user_settings SET settings=?,secret=? WHERE user_id=?',[JSON.stringify(value),userSettings.seal(next),userId]);
      else await con.execute('INSERT INTO assistant_user_settings(user_id,settings,secret) VALUES(?,?,?)',[userId,JSON.stringify(value),userSettings.seal(next)]);
      return {settings:value,key:next};
    });
  },
  async recordAssistantAI(provider,ok,input=0,output=0,now=Date.now()){
    const day=tehranDay(now);
    await execute('INSERT IGNORE INTO assistant_ai_usage(day,provider,calls,failures,input_tokens,output_tokens) VALUES(?,?,0,0,0,0)',[day,provider]);
    await execute('UPDATE assistant_ai_usage SET calls=calls+1,failures=failures+?,input_tokens=input_tokens+?,output_tokens=output_tokens+? WHERE day=? AND provider=?',[ok?0:1,Math.max(0,Math.round(input)||0),Math.max(0,Math.round(output)||0),day,provider]);
  },
  async assistantAICalls(now=Date.now()){
    const [row]=await execute('SELECT COALESCE(SUM(calls),0) AS calls FROM assistant_ai_usage WHERE day=?',[tehranDay(now)]);
    return Number(row?.calls||0);
  },
  // The owner panel's numbers: today, the last 14 Tehran days, the heaviest users today and who pays for Fandogh.
  async assistantStats(now=Date.now()){
    const days=Array.from({length:14},(_,i)=>tehranDay(now-(13-i)*86400000)),today=days[13];
    const events=await execute('SELECT user_id,at,amount FROM assistant_events WHERE at>?',[now-15*24*HOUR]),byDay=new Map(),todayUsers=new Map();
    for(const e of events){const day=tehranDay(Number(e.at)),d=byDay.get(day)||{messages:0,users:new Set()};d.messages+=Number(e.amount);d.users.add(e.user_id);byDay.set(day,d);}
    const usage=[...byDay].map(([day,d])=>({day,messages:d.messages,users:d.users.size}));
    const ai=await execute('SELECT day,provider,calls,failures,input_tokens,output_tokens FROM assistant_ai_usage WHERE day>=?',[days[0]]);
    for(const e of events)if(tehranDay(Number(e.at))===today)todayUsers.set(e.user_id,(todayUsers.get(e.user_id)||0)+Number(e.amount));
    const top=[...todayUsers].sort((x,y)=>y[1]-x[1]).slice(0,8).map(([user_id,used])=>({user_id,used}));
    const [plans]=await execute("SELECT COUNT(DISTINCT CASE WHEN ref LIKE 'assistant:%' THEN user_id END) AS assistant,COUNT(DISTINCT CASE WHEN ref LIKE 'subscription:%' THEN user_id END) AS subscription FROM account_access WHERE expires_at>?",[now]);
    const series=days.map(day=>{const u=usage.find(r=>Number(r.day)===day),a=ai.filter(r=>Number(r.day)===day);return {day,messages:Number(u?.messages||0),users:Number(u?.users||0),aiCalls:a.reduce((s,r)=>s+Number(r.calls),0),aiFailures:a.reduce((s,r)=>s+Number(r.failures),0),tokens:a.reduce((s,r)=>s+Number(r.input_tokens)+Number(r.output_tokens),0)};});
    const providers={};for(const r of ai){const p=providers[r.provider]||(providers[r.provider]={calls:0,failures:0,input:0,output:0});p.calls+=Number(r.calls);p.failures+=Number(r.failures);p.input+=Number(r.input_tokens);p.output+=Number(r.output_tokens);}
    return {today:series[13],series,top:top.map(r=>({id:r.user_id,used:Number(r.used)})),providers,buyers:{assistant:Number(plans?.assistant||0),subscription:Number(plans?.subscription||0)}};
  },
});
module.exports.initialize=initialize;
module.exports.tehranDay=tehranDay;
