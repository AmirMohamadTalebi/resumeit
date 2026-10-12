const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createServer} = require('./server.cjs');
const {testStore} = require('./auth-test-store.cjs');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const db = testStore(), codes = new Map();
  const server = createServer(db, {send:async(phone,code)=>{codes.set(phone,code);}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = 'http://127.0.0.1:'+server.address().port;
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge',headless:true});
    const context = await browser.newContext({viewport:{width:320,height:740},isMobile:true,hasTouch:true});
    const page = await context.newPage(), errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(() => {
      window.OTPCredential = function(){};
      window.smsCalls = 0;
      Object.defineProperty(navigator,'credentials',{value:{get:options=>new Promise((resolve,reject)=>{
        window.smsCalls++; window.acceptSms=code=>resolve({code});
        options.signal.addEventListener('abort',()=>{window.smsCancelled=true;reject(new DOMException('Aborted','AbortError'));});
      })}});
    });
    fs.mkdirSync('artifacts/auth-mobile',{recursive:true});
    for (const [route, phone] of [['login','09120000131'],['register','09120000132'],['forgot-password','09120000133']]) {
      if(route!=='register')await db.provisionAccount(phone,null);
      await page.goto(base+'/'+route+'/');
      if(route==='login')await page.locator('[data-mode=otp]').tap();
      const mobile = page.locator('#mobile');
      await mobile.fill(phone);
      assert.equal(await mobile.evaluate(e=>getComputedStyle(e).paddingLeft),'14px');
      let release;
      const held = new Promise(r=>release=r);
      await page.route('**/api/auth/otp/request',async r=>{await held;await r.continue();});
      const start=Date.now();
      await page.locator('#sb').tap();
      await page.waitForFunction(()=>window.smsCalls===1);
      // An SMS can arrive before the server response; retain it for the new input.
      await page.evaluate(()=>window.acceptSms('001122'));
      release();
      const input=page.locator('#otp-code');
      await input.waitFor();
      assert(Date.now()-start<2000,'OTP request must not use the final R minimum delay');
      await page.unroute('**/api/auth/otp/request');
      assert.equal(await input.inputValue(),'001122');
      assert.equal(await page.locator('.otp__i').count(),1);
      assert.equal(await input.getAttribute('inputmode'),'numeric');
      assert.equal(await input.getAttribute('autocomplete'),'one-time-code');
      assert.equal(await input.evaluate(e=>e.closest('[inert]')),null);
      assert.equal(await page.locator('.busy').count(),0);
      const box=await input.boundingBox();
      assert(box.x>=0 && box.x+box.width<=320);
      await input.tap();
      assert(await input.evaluate(e=>document.activeElement===e));
      await input.fill('۱۲۳۴۵۶');
      assert.equal(await input.inputValue(),'123456');
      assert.equal(await page.locator('#vb').isEnabled(),true);
      assert.equal(await page.locator('.auth-transit').count(),0);
      assert.equal(await page.locator('#np').count(),0,'Filling a code must wait for explicit confirmation');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:'artifacts/auth-mobile/'+route+'-otp.png',fullPage:true});
      await input.fill(codes.get(phone));
      await page.locator('#vb').tap();
      await page.locator(route==='login'?'#goDash':'#np').waitFor();
    }
    await page.goto(base+'/register/');
    await page.evaluate(()=>ResumeItNotify('<b>ذخیره شد</b>',{kind:'success',duration:500}));
    const toast=page.locator('#ri-notifications .ri-notification');
    await toast.waitFor();
    assert.equal(await toast.locator('b').count(),0);
    assert.equal(await page.locator('#ri-notifications').evaluate(e=>getComputedStyle(e).right),'16px');
    assert.equal(await page.locator('#ri-notifications').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    await toast.waitFor({state:'detached'});
    await page.evaluate(()=>ResumeItNotify('دوباره امتحان کن',{kind:'error'}));
    await page.locator('#ri-notifications button').tap();
    await page.locator('.ri-notification').waitFor({state:'detached'});
    await page.evaluate(()=>{for(let i=0;i<5;i++)ResumeItNotify('اعلان '+i);});
    assert.equal(await page.locator('.ri-notification').count(),3);
    await page.waitForTimeout(300);
    await page.screenshot({path:'artifacts/auth-mobile/toasts.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: touch OTP in all three flows at 320px, immediate request, consented WebOTP buffer, explicit confirm, Persian digits, no blocking overlay, safe top-right toasts/dismiss/expiry/limit');
  } finally {await browser?.close();await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
