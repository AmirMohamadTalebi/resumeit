const assert = require('node:assert/strict');
const { createServer } = require('../src/http/server.cjs'), { testStore } = require('./auth-test-store.cjs'), { hashPassword } = require('../src/auth/auth.cjs'), { chromium } = require('playwright');
// The sign-in screen offers the email code first, keeps SMS locked for thirty seconds, and the email step explains where the code went.
(async () => {
  const database = testStore(), id = await database.provisionAccount('09120000801', await hashPassword('CodeFixture123!'));
  database.setVerifiedEmail(id, 'sara.mohammadi@example.com');
  const mails = [];
  const server = createServer(database, { send: async () => {}, notifications: { provider: { available: { email: true, sms: false, push: false }, publicKey: null, mail: async (to, subject, text) => mails.push({ to, text }), close() {} } } });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  try {
    const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/login/');
    assert.equal(await page.locator('[data-mode="pass"]').getAttribute('aria-selected'), 'true', 'password stays first');
    await page.locator('[data-mode="otp"]').click();
    assert.equal(await page.locator('[data-ch="email"]').getAttribute('aria-checked'), 'true');
    assert(await page.locator('[data-ch="sms"]').isDisabled(), 'SMS locked at first');
    await page.waitForTimeout(1500); await page.screenshot({ path: 'artifacts/email-login-tab.png' });
    await page.locator('#mobile').fill('09120000802'); await page.locator('#sb').click();
    await page.locator('.form-error, [role=alert]:not([hidden])').first().waitFor();
    assert.match(await page.locator('main').innerText(), /ایمیل/, 'no-email answer is shown');
    await page.locator('#mobile').fill('09120000801'); await page.locator('#sb').click();
    await page.locator('#otp-code').waitFor();
    assert.match(await page.locator('#otp-intro').innerText(), /s\*\*\*@e\*\*\*\.com/); assert.equal(mails.length, 1);
    assert.match(await page.locator('#switch').innerText(), /پیامک/);
    await page.waitForTimeout(1800); await page.screenshot({ path: process.env.SHOT || 'artifacts/email-login.png' });
    assert.deepEqual(errors, []);
    console.log('PASS email-first sign-in screen: password first, email default, SMS locked, clear no-email answer, hidden address hint, switch countdown.');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
