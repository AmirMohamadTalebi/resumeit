const assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const {limitMessage,smsFailedMessage,createOtpService}=require('../src/auth/otp.cjs');
// The production OTP store on SQLite: each budget that stops a code is named, so people see why no SMS arrived.
const sql=new DatabaseSync(':memory:');
sql.exec("CREATE TABLE login_attempts(attempt_key TEXT PRIMARY KEY,count INTEGER,expires_at INTEGER);CREATE TABLE otp_challenges(phone TEXT PRIMARY KEY,challenge_id TEXT UNIQUE,purpose TEXT,code_hash TEXT,status TEXT,attempts INTEGER DEFAULT 0,sent_at INTEGER,expires_at INTEGER,registration_token TEXT,owner_id TEXT,channel TEXT NOT NULL DEFAULT 'sms');CREATE TABLE otp_events(id TEXT PRIMARY KEY,phone TEXT,purpose TEXT,status TEXT,created_at INTEGER,verified_at INTEGER);");
const execute=async(q,args=[])=>{q=q.replace(/ FOR UPDATE/g,'').replace('ON DUPLICATE KEY UPDATE attempt_key=attempt_key','ON CONFLICT DO NOTHING').replace(/ON DUPLICATE KEY UPDATE challenge_id=VALUES\(challenge_id\),purpose=VALUES\(purpose\),code_hash=VALUES\(code_hash\),status='pending',attempts=0,sent_at=VALUES\(sent_at\),expires_at=VALUES\(expires_at\),registration_token=NULL,owner_id=VALUES\(owner_id\),channel=VALUES\(channel\)/,"ON CONFLICT(phone) DO UPDATE SET challenge_id=excluded.challenge_id,purpose=excluded.purpose,code_hash=excluded.code_hash,status='pending',attempts=0,sent_at=excluded.sent_at,expires_at=excluded.expires_at,registration_token=NULL,owner_id=excluded.owner_id,channel=excluded.channel");const st=sql.prepare(q);return /^\s*SELECT/i.test(q)?st.all(...args):{affectedRows:st.run(...args).changes};};
const transaction=async action=>{sql.exec('BEGIN');try{const r=await action({execute:async(q,a)=>[await execute(q,a)]});sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}};
const database=require('../src/database/otp.cjs')({execute,transaction});
(async()=>{
  process.env.RESUMEIT_QUIET_ERRORS='1';
  let now=Date.UTC(2026,9,29,8);const sent=[];const otp=createOtpService({database,send:async p=>sent.push(p),now:()=>now});
  assert((await otp.request('09120000001','login','ip-a')).challengeId);
  const resend=await otp.request('09120000001','login','ip-a');assert.equal(resend.blocked,'resend');assert(resend.retryAfter>0&&resend.retryAfter<=60);
  assert.match(limitMessage(resend),/ثانیهٔ دیگر/);
  // Per-phone daily cap (default 8, SMS_PHONE_DAILY_LIMIT changes it).
  // Three minutes apart, so the burst cap (six codes in fifteen minutes, any channel) is not what stops them.
  for(let i=1;i<8;i++){now+=181000;assert((await otp.request('09120000001','login','ip-'+i)).challengeId,'code '+(i+1));}
  now+=181000;const phone=await otp.request('09120000001','login','ip-z');assert.equal(phone.blocked,'phone');assert.match(limitMessage(phone),/امروز پر شده/);
  // Per-address cap: ten codes in fifteen minutes from one network.
  for(let i=0;i<10;i++)assert((await otp.request('0912000010'+i,'login','shared')).challengeId);
  const ip=await otp.request('09120000200','login','shared');assert.equal(ip.blocked,'ip');assert.match(limitMessage(ip),/دقیقهٔ دیگر/);
  // A failed SMS is reported as such, not as a limit.
  const failing=createOtpService({database,send:async()=>{throw Object.assign(new Error('x'),{code:'SMSIR_HTTP_401_STATUS_0'});},now:()=>now+3600000});
  await assert.rejects(failing.request('09120000300','login','ip-f'),e=>e.code==='SMS_FAILED');
  assert.match(smsFailedMessage,/پیامک ارسال نشد/);
  assert.equal(require('../src/auth/limits.cjs').smsLimits({SMS_PHONE_DAILY_LIMIT:'12'}).phoneDaily,12);
  assert.equal(require('../src/auth/limits.cjs').smsLimits({SMS_PHONE_DAILY_LIMIT:'1'}).phoneDaily,8,'out-of-range values fall back');
  // Email codes: own budgets, a thirty-second wait to switch channel, a minute to resend, and they never touch the SMS cost log.
  const mails=[],mailOtp=createOtpService({database,send:async p=>sent.push(p),sendMail:async(address,code,purpose)=>mails.push({address,code,purpose}),now:()=>now});
  now+=3600000;const first=await mailOtp.request('09120000400','login','ip-m1',null,'email','a@example.com');assert.equal(first.channel,'email');assert.equal(first.expiresIn,300);assert.equal(mails.length,1);assert.equal(mails[0].purpose,'login');assert.match(mails[0].code,/^\d{6}$/);
  assert.equal((await mailOtp.request('09120000400','login','ip-m1',null,'email','a@example.com')).blocked,'resend','same channel waits a minute');
  now+=31000;const smsAfter=await mailOtp.request('09120000400','login','ip-m1',null,'sms');assert(smsAfter.challengeId,'the other channel is open after thirty seconds');assert.equal(smsAfter.channel,'sms');
  now+=10000;assert.equal((await mailOtp.request('09120000400','login','ip-m1',null,'email','a@example.com')).blocked,'resend','switching back also waits thirty seconds from the last code');
  const smsEvents=sql.prepare('SELECT COUNT(*) n FROM otp_events').get().n;now+=31000;assert((await mailOtp.request('09120000400','login','ip-m1',null,'email','a@example.com')).challengeId);assert.equal(sql.prepare('SELECT COUNT(*) n FROM otp_events').get().n,smsEvents,'email codes are not logged as SMS');
  // Burst: six codes in fifteen minutes to one phone, whatever the channel.
  const burstPhone='09120000500';let burst=0;for(let i=0;i<8;i++){const r=await mailOtp.request(burstPhone,'login','ip-b'+i,null,i%2?'sms':'email','b@example.com');if(r.challengeId)burst++;now+=61000;}
  assert.equal(burst,6,'six codes then the burst cap: '+burst);
  const failingMail=createOtpService({database,sendMail:async()=>{throw new Error('smtp down');},now:()=>now+7200000});await assert.rejects(failingMail.request('09120000600','login','ip-fm',null,'email','c@example.com'),e=>e.code==='EMAIL_FAILED');
  assert.equal(require('../src/auth/limits.cjs').mailLimits({OTP_EMAIL_DAILY_LIMIT:'5'}).daily,1000,'out-of-range values fall back');
  console.log('PASS: OTP limits name the resend wait, per-phone daily cap, per-network cap and SMS failure with distinct messages; phone cap configurable.');
})().catch(e=>{console.error(e);process.exitCode=1;});
