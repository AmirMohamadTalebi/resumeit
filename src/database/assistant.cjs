// Resume assistant usage: who may ask how many questions a day. Any active subscription includes the assistant;
// it can also be bought alone by the month (account_access ref "assistant:m1|m3|m6"). Counting is per Tehran day.

// Owner settings live in one row; provider keys sit sealed in their own column. AI usage is counted per day and
// provider so the panel can show calls, failures and tokens without storing any conversation.
const userSettings=require('../dashboard/assistant-user.cjs'),settings=require('../owner/assistant-settings.cjs'),{requireOwner}=require('../admin/access.cjs'),{fail}=require('../dashboard/model.cjs'),{randomUUID,createHash}=require('node:crypto');
async function initialize(execute){
  await execute('CREATE TABLE IF NOT EXISTS assistant_usage(user_id CHAR(36) NOT NULL,day INT NOT NULL,used INT NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_settings(id INT PRIMARY KEY,settings JSON NOT NULL,secrets TEXT NULL) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_user_settings(user_id CHAR(36) PRIMARY KEY,settings JSON NOT NULL,secret TEXT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_ai_usage(day INT NOT NULL,provider VARCHAR(24) NOT NULL,calls INT NOT NULL DEFAULT 0,failures INT NOT NULL DEFAULT 0,input_tokens BIGINT NOT NULL DEFAULT 0,output_tokens BIGINT NOT NULL DEFAULT 0,PRIMARY KEY(day,provider)) ENGINE=InnoDB');
}
const parse=x=>typeof x==='string'?JSON.parse(x):x;
// 20261030 for the calendar day in Tehran, so the allowance renews at local midnight.
const tehranDay=(now=Date.now())=>Number(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(now).replace(/-/g,''));

module.exports=({execute,transaction})=>({
  async assistantAccess(userId,now=Date.now()){
    const rows=await execute("SELECT ref,expires_at FROM account_access WHERE user_id=? AND (ref LIKE 'subscription:%' OR ref LIKE 'assistant:%') AND expires_at>?",[userId,now]);
    const until=kind=>Math.max(0,...rows.filter(r=>r.ref.startsWith(kind+':')).map(r=>Number(r.expires_at)));
    const sub=until('subscription'),own=until('assistant');
    return sub?{plan:'subscription',until:sub}:own?{plan:'assistant',until:own}:{plan:'free',until:null};
  },
  async assistantUsed(userId,now=Date.now()){
    const [row]=await execute('SELECT used FROM assistant_usage WHERE user_id=? AND day=?',[userId,tehranDay(now)]);
    return Number(row?.used||0);
  },
  // Takes one question from today's allowance, or refuses with ASSISTANT_LIMIT when it is used up.
  async useAssistant(userId,limit,now=Date.now()){
    const day=tehranDay(now);
    return transaction(async con=>{
      await con.execute('INSERT IGNORE INTO assistant_usage(user_id,day,used) VALUES(?,?,0)',[userId,day]);
      const [[row]]=await con.execute('SELECT used FROM assistant_usage WHERE user_id=? AND day=? FOR UPDATE',[userId,day]);
      const used=Number(row?.used||0);
      if(used>=limit)throw Object.assign(new Error('سهمیهٔ امروز دستیار تمام شد'),{status:429,code:'ASSISTANT_LIMIT'});
      await con.execute('UPDATE assistant_usage SET used=? WHERE user_id=? AND day=?',[used+1,userId,day]);
      return used+1;
    });
  },
  // Gives a question back when no answer could be produced at all.
  async refundAssistant(userId,now=Date.now()){
    await execute('UPDATE assistant_usage SET used=CASE WHEN used>0 THEN used-1 ELSE 0 END WHERE user_id=? AND day=?',[userId,tehranDay(now)]);
  },
  // Server-side view: settings merged over defaults and the opened provider keys. Never sent to a browser.
  async assistantSettings(){
    const [row]=await execute('SELECT settings,secrets FROM assistant_settings WHERE id=1'),base=settings.defaults(),saved=row?parse(row.settings):{};
    return {settings:{...base,...saved,ai:{...base.ai,...(saved.ai||{})},providers:{...(saved.providers||{})}},keys:settings.open(row?.secrets)};
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
    const usage=await execute('SELECT day,COALESCE(SUM(used),0) AS messages,COUNT(*) AS users FROM assistant_usage WHERE day>=? GROUP BY day',[days[0]]);
    const ai=await execute('SELECT day,provider,calls,failures,input_tokens,output_tokens FROM assistant_ai_usage WHERE day>=?',[days[0]]);
    const top=await execute('SELECT user_id,used FROM assistant_usage WHERE day=? ORDER BY used DESC LIMIT 8',[today]);
    const [plans]=await execute("SELECT COUNT(DISTINCT CASE WHEN ref LIKE 'assistant:%' THEN user_id END) AS assistant,COUNT(DISTINCT CASE WHEN ref LIKE 'subscription:%' THEN user_id END) AS subscription FROM account_access WHERE expires_at>?",[now]);
    const series=days.map(day=>{const u=usage.find(r=>Number(r.day)===day),a=ai.filter(r=>Number(r.day)===day);return {day,messages:Number(u?.messages||0),users:Number(u?.users||0),aiCalls:a.reduce((s,r)=>s+Number(r.calls),0),aiFailures:a.reduce((s,r)=>s+Number(r.failures),0),tokens:a.reduce((s,r)=>s+Number(r.input_tokens)+Number(r.output_tokens),0)};});
    const providers={};for(const r of ai){const p=providers[r.provider]||(providers[r.provider]={calls:0,failures:0,input:0,output:0});p.calls+=Number(r.calls);p.failures+=Number(r.failures);p.input+=Number(r.input_tokens);p.output+=Number(r.output_tokens);}
    return {today:series[13],series,top:top.map(r=>({id:r.user_id,used:Number(r.used)})),providers,buyers:{assistant:Number(plans?.assistant||0),subscription:Number(plans?.subscription||0)}};
  },
});
module.exports.initialize=initialize;
module.exports.tehranDay=tehranDay;
