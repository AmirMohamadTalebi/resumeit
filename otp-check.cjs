const assert=require('node:assert/strict');
const {createOtpService}=require('./otp.cjs');
const {testStore}=require('./auth-test-store.cjs');
const {createServer}=require('./server.cjs');
(async()=>{
 let time=Date.now(),sent=[];const database=testStore();
 const send=async(phone,code)=>sent.push({phone,code});
 const otp=createOtpService({database,send,now:()=>time}), second=createOtpService({database,send,now:()=>time});
 const request=await otp.request('09120000001','register','ip');
 assert.match(sent[0].code,/^\d{6}$/);assert.equal(await second.request('09120000001','login','other-ip'),null);
 assert.equal(await second.verify(request.challengeId,sent[0].code,'login'),null);
 const verified=await second.verify(request.challengeId,sent[0].code,'register');assert(verified.registrationToken);
 assert.equal(await otp.verify(request.challengeId,sent[0].code,'register'),null);
 const {digest}=require('./auth.cjs');
 assert(await database.registrationValid(digest(verified.registrationToken),time));
 time+=300001;assert.equal(await database.registrationValid(digest(verified.registrationToken),time),false);
 const expired=await otp.request('09120000002','login','ip');time+=120001;
 assert.equal(await otp.verify(expired.challengeId,sent.at(-1).code,'login'),null);
 const wrong=await otp.request('09120000003','login','ip'),actual=sent.at(-1).code;
 const other=actual==='111111'?'222222':'111111';
 for(let i=0;i<5;i++)assert.equal(await otp.verify(wrong.challengeId,other,'login'),null);
 assert.equal(await otp.verify(wrong.challengeId,actual,'login'),null);
 const failing=createOtpService({database,now:()=>time,send:async()=>{throw Error('private');}});
 await assert.rejects(failing.request('09120000004','login','ip'));
 assert.equal(await otp.request('09120000004','login','ip'),null);
 const results=await Promise.all([otp.request('09120000005','login','ip'),second.request('09120000005','login','ip')]);assert.equal(results.filter(Boolean).length,1);
 const limited=testStore(), budget=createOtpService({database:limited,send,now:()=>time});
 for(let i=0;i<5;i++){assert(await budget.request('09120000006','login','budget'));time+=60001;}
 assert.equal(await budget.request('09120000006','login','budget'),null);
 const webDb=testStore(),codes=new Map(),server=createServer(webDb,{send:async(phone,code)=>codes.set(phone,code)});
 const server2=createServer(webDb,{send:async(phone,code)=>codes.set(phone,code)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>server2.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,base2='http://127.0.0.1:'+server2.address().port;
 const post=(route,body,url=base,origin=url)=>fetch(url+'/api/auth/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try {
  assert.equal((await post('otp/request',{phone:'09120000011',purpose:'register'},base,'https://evil.example')).status,403);
  assert.equal((await post('register',{registrationToken:'a'.repeat(64),password:'NewPassword123!'})).status,401);
  const r=await post('otp/request',{phone:'09120000011',purpose:'register'});assert.equal(r.status,200);const challenge=await r.json();assert.equal(await webDb.accountByPhone('09120000011'),undefined);
  assert.equal((await post('otp/request',{phone:'09120000011',purpose:'register'},base2)).status,429);
  const body={challengeId:challenge.challengeId,code:codes.get('09120000011'),purpose:'register'};
  const v=await post('otp/verify',body,base2);assert.equal(v.status,200);const grant=await v.json();
  assert.equal((await post('otp/verify',body)).status,401);
  const registration=await post('register',{...grant,password:'NewPassword123!'});assert.equal(registration.status,200);assert.match(registration.headers.get('set-cookie'),/HttpOnly/);
  assert.equal((await post('register',{...grant,password:'OtherPassword123!'})).status,401);
  const user=await webDb.accountByPhone('09120000011');const {verifyPassword}=require('./auth.cjs');assert(await verifyPassword('NewPassword123!',user.password_hash));
  await webDb.provisionAccount('09120000012',null);
  const l=await(await post('otp/request',{phone:'09120000012',purpose:'login'})).json();
  const login=await post('otp/verify',{challengeId:l.challengeId,code:codes.get('09120000012'),purpose:'login'},base2);assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await fetch(base+'/dashboard/',{headers:{Cookie:cookie}})).status,200);
  const e=await(await post('otp/request',{phone:'09120000011',purpose:'register'})).json();
  // The original successful request is still inside its cooldown; do not overwrite that account.
  assert.equal(e.challengeId,undefined);assert(await verifyPassword('NewPassword123!',(await webDb.accountByPhone('09120000011')).password_hash));
 } finally {await new Promise(r=>server.close(r));await new Promise(r=>server2.close(r));}
 console.log('PASS: shared OTP, expiry, replay, purpose binding, attempts, quotas, concurrent sends, SMS failure, verified registration and code login; no real SMS sent.');
})().catch(error=>{console.error(error);process.exitCode=1;});
