const assert=require('node:assert/strict');
const {clientIp,trustedHops}=require('../src/http/client-ip.cjs');
const {countable}=require('../src/dashboard/metrics.cjs');
const {confirmPassword}=require('../src/auth/confirm.cjs');
const {hashPassword}=require('../src/auth/password.cjs');
const {smsLimits}=require('../src/auth/limits.cjs');
const {ownerPhone}=require('../src/admin/access.cjs');
(async()=>{
  const req=(headers={},address='10.0.0.5',method='GET')=>({method,headers,socket:{remoteAddress:address},url:'/'});
  // Without TRUST_PROXY a client cannot pick its own address through X-Forwarded-For.
  assert.equal(clientIp(req({'x-forwarded-for':'1.2.3.4'}),{}),'10.0.0.5');
  assert.equal(clientIp(req({'x-forwarded-for':'6.6.6.6, 1.2.3.4'}),{TRUST_PROXY:'1'}),'1.2.3.4','one proxy: the entry it appended');
  assert.equal(clientIp(req({'x-forwarded-for':'1.2.3.4, 9.9.9.9'}),{TRUST_PROXY:'2'}),'1.2.3.4');
  assert.equal(clientIp(req({'x-forwarded-for':'not-an-ip'}),{TRUST_PROXY:'1'}),'10.0.0.5');
  assert.equal(clientIp(req({}),{TRUST_PROXY:'1'}),'10.0.0.5');
  assert.equal(trustedHops({TRUST_PROXY:'abc'}),0);assert.equal(trustedHops({TRUST_PROXY:'99'}),0);

  const browser={'user-agent':'Mozilla/5.0 (Windows NT 10.0) Chrome/140 Safari/537.36'};
  assert.equal(countable(req({'user-agent':'Googlebot/2.1'}),'visit-a'),false,'crawlers are not visitors');
  assert.equal(countable(req({'user-agent':'TelegramBot (like TwitterBot)'}),'visit-a'),false);
  assert.equal(countable(req({...browser,'sec-purpose':'prefetch'}),'visit-a'),false);
  assert.equal(countable(req(browser,'10.0.0.5','HEAD'),'visit-a'),false);
  assert.equal(countable(req(browser),'visit-a'),true);
  assert.equal(countable(req(browser),'visit-a'),false,'repeat from the same address is deduplicated');
  assert.equal(countable(req(browser,'10.0.0.6'),'visit-a'),true,'another visitor still counts');
  assert.equal(countable(req(browser),'visit-b'),true,'another page still counts');

  const hash=await hashPassword('CorrectHorse1'),db={accountByPhone:async phone=>phone==='09120000001'?{id:'u1',phone,password_hash:hash}:phone==='09120000002'?{id:'u2',phone,password_hash:null}:undefined};
  await assert.rejects(confirmPassword(db,{id:'u1',phone:'09120000001'},undefined),e=>e.status===403&&e.code==='PASSWORD_REQUIRED');
  await assert.rejects(confirmPassword(db,{id:'u1',phone:'09120000001'},'WrongHorse1'),e=>e.status===403);
  await confirmPassword(db,{id:'u1',phone:'09120000001'},'CorrectHorse1');
  await confirmPassword(db,{id:'u2',phone:'09120000002'},'');
  await confirmPassword(db,{id:'u3',phone:null},undefined);

  assert.equal(smsLimits({}).otpDaily,100);assert.equal(smsLimits({SMS_DAILY_LIMIT:'500'}).otpDaily,500);assert.equal(smsLimits({SMS_DAILY_LIMIT:'-1'}).otpDaily,100);
  assert.equal(ownerPhone({OWNER_PHONE:'09121234567'}),'09121234567');assert.equal(ownerPhone({}),null);assert.equal(ownerPhone({OWNER_PHONE:'2a0b3a10'}),null);
  assert(!require('node:fs').readFileSync(require.resolve('../src/admin/access.cjs'),'utf8').match(/[a-f0-9]{64}/),'no owner phone hash in source');
  console.log('PASS: proxy-aware client address, bot/prefetch/repeat metric filtering, password re-check for irreversible actions, SMS budget config and env-only owner bootstrap.');
})().catch(error=>{console.error(error);process.exitCode=1;});
