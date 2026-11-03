// Resume assistant: who may use which models and what they pay. The Fandogh plans («آرش»، «رستم»، «کوروش»,
// account_access ref "assistant:<id>") and a ResumeIt subscription open models; using them is paid from the
// person's Fandogh wallet (rial, so fractions of a toman are kept), topped up with It from the main wallet. Every
// change is a ledger row: a top-up, welcome or starter credit, or an answer with its model and tokens. Older
// "assistant:m1|m3|m6" purchases count as «آرش».

// Owner settings live in one row; provider keys sit sealed in their own column. AI usage is counted per day and
// provider so the panel can show calls, failures and tokens without storing any conversation.
const userSettings=require('../dashboard/assistant-user.cjs'),settings=require('../owner/assistant-settings.cjs'),{requireOwner}=require('../admin/access.cjs'),{fail}=require('../dashboard/model.cjs'),{randomUUID,createHash}=require('node:crypto');
async function initialize(execute){
  await execute('CREATE TABLE IF NOT EXISTS assistant_usage(user_id CHAR(36) NOT NULL,day INT NOT NULL,used INT NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS fandogh_wallets(user_id CHAR(36) PRIMARY KEY,balance BIGINT NOT NULL DEFAULT 0,updated_at BIGINT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS fandogh_ledger(id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,at BIGINT NOT NULL,delta BIGINT NOT NULL,balance BIGINT NOT NULL,kind VARCHAR(12) NOT NULL,model VARCHAR(40) NULL,input_tokens INT NOT NULL DEFAULT 0,output_tokens INT NOT NULL DEFAULT 0,label VARCHAR(160) NOT NULL,ref VARCHAR(80) NULL,UNIQUE KEY fandogh_ledger_ref(ref),INDEX fandogh_ledger_user(user_id,at),INDEX fandogh_ledger_at(at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_settings(id INT PRIMARY KEY,settings JSON NOT NULL,secrets TEXT NULL) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_user_settings(user_id CHAR(36) PRIMARY KEY,settings JSON NOT NULL,secret TEXT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
  await execute('CREATE TABLE IF NOT EXISTS assistant_ai_usage(day INT NOT NULL,provider VARCHAR(24) NOT NULL,calls INT NOT NULL DEFAULT 0,failures INT NOT NULL DEFAULT 0,input_tokens BIGINT NOT NULL DEFAULT 0,output_tokens BIGINT NOT NULL DEFAULT 0,PRIMARY KEY(day,provider)) ENGINE=InnoDB');
}
const HOUR=3600000;
// One ledger row and the new balance, inside a transaction that holds the wallet row.
async function move(con,userId,delta,row,now=Date.now()){
  await con.execute('INSERT IGNORE INTO fandogh_wallets(user_id,balance,updated_at) VALUES(?,0,?)',[userId,now]);
  const [[w]]=await con.execute('SELECT balance FROM fandogh_wallets WHERE user_id=? FOR UPDATE',[userId]),balance=Number(w?.balance||0)+delta;
  await con.execute('UPDATE fandogh_wallets SET balance=?,updated_at=? WHERE user_id=?',[balance,now,userId]);
  await con.execute('INSERT INTO fandogh_ledger(id,user_id,at,delta,balance,kind,model,input_tokens,output_tokens,label,ref) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[randomUUID(),userId,now,delta,balance,row.kind,row.model||null,Math.max(0,Math.round(row.input||0)),Math.max(0,Math.round(row.output||0)),String(row.label||'').slice(0,160),row.ref||null]);
  return balance;
}
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
  // The Fandogh wallet: its balance in rial, the latest credits (top-ups, gifts, plan credit) and, instead of one row
  // per answer, what was spent each day (Tehran time) over the last two weeks.
  async fandoghWallet(userId,limit=20){
    const [w]=await execute('SELECT balance FROM fandogh_wallets WHERE user_id=?',[userId]);
    const rows=await execute("SELECT id,at,delta,balance,kind,model,input_tokens,output_tokens,label FROM fandogh_ledger WHERE user_id=? AND kind<>'usage' ORDER BY at DESC LIMIT "+Math.max(1,Math.min(100,limit|0)),[userId]);
    const since=Date.now()-14*86400000,usage=await execute("SELECT at,delta,input_tokens,output_tokens FROM fandogh_ledger WHERE user_id=? AND kind='usage' AND at>?",[userId,since]),days=new Map();
    for(const u of usage){const key=new Date(Number(u.at)+12600000).toISOString().slice(0,10),d=days.get(key)||{day:key,at:Date.parse(key+'T00:00:00Z')-12600000,delta:0,input:0,output:0,count:0};d.delta+=Number(u.delta);d.input+=Number(u.input_tokens);d.output+=Number(u.output_tokens);d.count++;days.set(key,d);}
    return {balance:Number(w?.balance||0),ledger:rows.map(x=>({id:x.id,at:Number(x.at),delta:Number(x.delta),balance:Number(x.balance),kind:x.kind,model:x.model,input:Number(x.input_tokens),output:Number(x.output_tokens),label:x.label})),daily:[...days.values()].sort((a,b)=>b.at-a.at)};
  },
  // Credit (welcome, starter, a gift from the owner); with a ref it happens once.
  async creditFandogh(userId,rial,kind,ref,label,now=Date.now()){
    if(!Number.isSafeInteger(rial)||rial<=0)return false;
    return transaction(async con=>{
      if(ref){const [[prior]]=await con.execute('SELECT id FROM fandogh_ledger WHERE ref=?',[ref]);if(prior)return false;}
      await move(con,userId,rial,{kind,label,ref},now);return true;
    });
  },
  // Takes a typical message's price before the model is called, inside the wallet row's lock, so parallel requests
  // cannot spend the same credit twice. Returns the ledger row id, or null when the balance is short.
  async holdFandogh(userId,rial,row,now=Date.now()){
    if(!Number.isSafeInteger(rial)||rial<=0)return null;
    return transaction(async con=>{
      await con.execute('INSERT IGNORE INTO fandogh_wallets(user_id,balance,updated_at) VALUES(?,0,?)',[userId,now]);
      const [[w]]=await con.execute('SELECT balance FROM fandogh_wallets WHERE user_id=? FOR UPDATE',[userId]);if(Number(w?.balance||0)<rial)return null;
      const id=randomUUID(),balance=Number(w.balance)-rial;
      await con.execute('UPDATE fandogh_wallets SET balance=?,updated_at=? WHERE user_id=?',[balance,now,userId]);
      await con.execute('INSERT INTO fandogh_ledger(id,user_id,at,delta,balance,kind,model,input_tokens,output_tokens,label,ref) VALUES(?,?,?,?,?,?,?,?,?,?,NULL)',[id,userId,now,-rial,balance,'usage',row.model||null,Math.max(0,Math.round(row.input||0)),Math.max(0,Math.round(row.output||0)),String(row.label||'').slice(0,160)]);
      return id;
    });
  },
  // Turns a hold into the real price (actual tokens), or returns it all when no answer came (rial 0).
  async settleFandogh(userId,id,rial,row={},now=Date.now()){
    return transaction(async con=>{
      const [[held]]=await con.execute("SELECT delta FROM fandogh_ledger WHERE id=? AND user_id=? AND kind='usage'",[id,userId]);if(!held)return null;
      const [[w]]=await con.execute('SELECT balance FROM fandogh_wallets WHERE user_id=? FOR UPDATE',[userId]),balance=Number(w?.balance||0)-Number(held.delta)-Math.max(0,rial);
      await con.execute('UPDATE fandogh_wallets SET balance=?,updated_at=? WHERE user_id=?',[balance,now,userId]);
      if(rial>0)await con.execute('UPDATE fandogh_ledger SET delta=?,balance=?,input_tokens=?,output_tokens=? WHERE id=?',[-rial,balance,Math.max(0,Math.round(row.input||0)),Math.max(0,Math.round(row.output||0)),id]);
      else await con.execute('DELETE FROM fandogh_ledger WHERE id=?',[id]);
      return balance;
    });
  },
  // A top-up: It from the main wallet becomes toman in the Fandogh wallet at the shop's rate. Repeating the same
  // request id does nothing.
  async topUpFandogh(userId,its,requestId,now=Date.now()){
    if(!Number.isSafeInteger(its)||its<1||its>10000)fail('مبلغ شارژ باید بین ۱ تا ۱۰٬۰۰۰ It باشد');
    if(!/^[a-z0-9_-]{16,64}$/i.test(requestId||''))fail('شناسهٔ درخواست معتبر نیست');
    const policy=this.commerceSettings?await this.commerceSettings():{rate:2000},units=its*RI.IT_RATE,rial=Math.round(units*(policy.rate||2000)/2000)*10;
    return transaction(async con=>{
      const [[prior]]=await con.execute('SELECT id FROM fandogh_ledger WHERE ref=?',['topup:'+requestId]);if(prior)return {ok:true,repeated:true};
      const [[row]]=await con.execute('SELECT balance_units FROM wallets WHERE user_id=? FOR UPDATE',[userId]),left=Number(row?.balance_units||0)-units;
      if(!row||left<0)fail('موجودی It کیف پول کافی نیست؛ اول کیف پول را شارژ کن',409);
      await con.execute('UPDATE wallets SET balance_units=? WHERE user_id=?',[left,userId]);
      await con.execute('INSERT INTO wallet_transactions(id,user_id,delta_units,balance_units,label,reference,created_at) VALUES(?,?,?,?,?,?,?)',[randomUUID(),userId,-units,left,'شارژ کیف پول فندق','fandogh:'+requestId,now]);
      const balance=await move(con,userId,rial,{kind:'topup',label:'شارژ با '+its+' It',ref:'topup:'+requestId},now);
      return {ok:true,balance,its:left/RI.IT_RATE};
    });
  },
  // Server-side view: settings merged over defaults and the opened provider keys. Never sent to a browser.
  async assistantSettings(){
    const [row]=await execute('SELECT settings,secrets FROM assistant_settings WHERE id=1'),base=settings.defaults(),saved=row?parse(row.settings):{};
    return {settings:{...base,...saved,billing:{...base.billing,...(saved.billing||{}),starter:{...base.billing.starter,...(saved.billing?.starter||{})}},ai:{...base.ai,...(saved.ai||{})},providers:{...(saved.providers||{})}},keys:settings.open(row?.secrets)};
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
    const events=await execute("SELECT user_id,at,delta FROM fandogh_ledger WHERE kind='usage' AND at>?",[now-15*24*HOUR]),byDay=new Map(),todayUsers=new Map();
    for(const e of events){const day=tehranDay(Number(e.at)),d=byDay.get(day)||{messages:0,spent:0,users:new Set()};d.messages+=1;d.spent-=Number(e.delta);d.users.add(e.user_id);byDay.set(day,d);}
    const usage=[...byDay].map(([day,d])=>({day,messages:d.messages,spent:d.spent,users:d.users.size}));
    const ai=await execute('SELECT day,provider,calls,failures,input_tokens,output_tokens FROM assistant_ai_usage WHERE day>=?',[days[0]]);
    for(const e of events)if(tehranDay(Number(e.at))===today)todayUsers.set(e.user_id,(todayUsers.get(e.user_id)||0)-Number(e.delta));
    const top=[...todayUsers].sort((x,y)=>y[1]-x[1]).slice(0,8).map(([user_id,used])=>({user_id,used}));
    const [plans]=await execute("SELECT COUNT(DISTINCT CASE WHEN ref LIKE 'assistant:%' THEN user_id END) AS assistant,COUNT(DISTINCT CASE WHEN ref LIKE 'subscription:%' THEN user_id END) AS subscription FROM account_access WHERE expires_at>?",[now]);
    const series=days.map(day=>{const u=usage.find(r=>Number(r.day)===day),a=ai.filter(r=>Number(r.day)===day);return {day,messages:Number(u?.messages||0),spent:Number(u?.spent||0),users:Number(u?.users||0),aiCalls:a.reduce((s,r)=>s+Number(r.calls),0),aiFailures:a.reduce((s,r)=>s+Number(r.failures),0),tokens:a.reduce((s,r)=>s+Number(r.input_tokens)+Number(r.output_tokens),0)};});
    const providers={};for(const r of ai){const p=providers[r.provider]||(providers[r.provider]={calls:0,failures:0,input:0,output:0});p.calls+=Number(r.calls);p.failures+=Number(r.failures);p.input+=Number(r.input_tokens);p.output+=Number(r.output_tokens);}
    return {today:series[13],series,top:top.map(r=>({id:r.user_id,used:Number(r.used)})),providers,buyers:{assistant:Number(plans?.assistant||0),subscription:Number(plans?.subscription||0)}};
  },
});
module.exports.initialize=initialize;
module.exports.tehranDay=tehranDay;
