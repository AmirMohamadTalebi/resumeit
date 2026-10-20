const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createServer}=require('../src/http/server.cjs');
const {testStore}=require('./auth-test-store.cjs');
(async()=>{
 const db=testStore(),codes=new Map();await db.provisionAccount('09120000615',null);
 const valid=db.registrationValid;db.registrationValid=async()=>false;
 const server=createServer(db,{send:async(phone,code)=>codes.set(phone,code)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 const out=path.join(__dirname,'../artifacts/council-audit-2026-10-20');fs.mkdirSync(out,{recursive:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.clock.install();
 for(const [route,phone,label] of [['register','09120000616','11-register'],['forgot-password','09120000615','11-reset']]){
  await page.goto(base+'/'+route+'/');await page.locator('#mobile').fill(phone);
  if(await page.locator('#accept-terms').count())await page.locator('#accept-terms').check();
  await page.locator('#sb').click();await page.locator('#otp-code').waitFor();
  assert.match(await page.locator('#resend').innerText(),/۰۱:۰۰|۰۰:۵۹/);
  assert.equal(await page.locator('#resendBtn').count(),0);
  await page.clock.runFor(1000);assert.match(await page.locator('#resend').innerText(),/۰۰:۵۹/);
  await page.clock.runFor(59000);assert.equal(await page.locator('#resendBtn').count(),1);
  await page.screenshot({path:path.join(out,label+'-countdown-after.png')});
  await page.locator('#otp-code').fill(codes.get(phone));await page.locator('#vb').click();
  await page.locator('#np').fill('OnlyTestPassword123!');await page.locator('#np2').fill('OnlyTestPassword123!');await page.locator('[data-eye=np]').click();await page.locator('[data-eye=np2]').click();await page.locator('#sb').click();
  await page.locator('[data-reverify]').waitFor();assert.equal(await page.locator('#np').inputValue(),'');assert.equal(await page.locator('#np2').inputValue(),'');assert.equal(await page.locator('#stt').innerText(),'');assert.equal(await page.locator('#sb').isDisabled(),true);assert.equal(await page.locator('[data-reverify]').evaluate(e=>e===document.activeElement),true);
  await page.screenshot({path:path.join(out,label+'-expired-after.png')});
  await page.locator('[data-reverify]').click();await page.locator('#mobile').waitFor();assert.equal(await page.locator('#mobile').inputValue(),phone);
 }
 await page.goto(base+'/forgot-password/');assert.match(await page.locator('#view').innerText(),/اگر حسابی با این شماره وجود داشته باشد/);
 await page.locator('#mobile').fill('09120000619');await page.locator('#sb').click();await page.locator('#otp-code').waitFor();assert.equal(codes.has('09120000619'),false);
 await page.locator('.sms-help summary').click();assert.equal(await page.locator('.sms-help a[href="/login/"]').count(),1);assert.equal(await page.locator('.sms-help a[href="/contact/"]').count(),1);
 await page.screenshot({path:path.join(out,'13-recovery-help-after.png')});
 db.registrationValid=valid;
 console.log('PASS audit11/13: countdown 60/59/0, expired signup/reset proof, revealed passwords cleared, phone preserved, conditional recovery/help and no mock SMS for missing account.');
 }finally{await browser.close();await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
