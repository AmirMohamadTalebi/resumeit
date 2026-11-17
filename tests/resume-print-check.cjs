// Save as PDF and the plain version (council N2-a): the dashboard prints the résumé from a hidden same-origin frame
// (no scripts, print.css), only for templates the person may use; phones get the browser-menu steps; the plain
// version opens from the publish card. The server side of the plain version is checked in dashboard-api-check.
const assert = require('node:assert/strict'), fs = require('node:fs');
const { createServer } = require('../src/http/server.cjs'), { testStore } = require('./auth-test-store.cjs'), { digest } = require('../src/auth/auth.cjs'), model = require('../src/dashboard/model.cjs'), { chromium } = require('playwright');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const db = testStore(), id = await db.provisionAccount('09120000806', null);
  await db.setAccountNames(id, 'امیر', 'طالبی'); await db.markPhoneVerified(id); await db.createSession(digest('a'.repeat(64)), id, Date.now() + 600000);
  const c = model.initial().content; c.slug = 'amir'; c.profile.name = 'امیر طالبی'; c.profile.title = 'توسعه‌دهنده'; c.profile.bio = 'رزومه و لینک‌های من';
  c.contacts[0].value = 'hello@example.com'; c.contacts[0].public = true; c.contacts[1].value = '09129999999'; c.contacts[1].public = false;
  c.skills = [{ id: 'skill1', name: 'JavaScript', level: 4 }];
  c.experience = [{ id: 'e1', role: 'توسعه‌دهندهٔ ارشد', org: 'شرکت نمونه', from: '۱۴۰۱', to: '', current: true, desc: 'ساخت رابط‌های سریع' }];
  await db.mutateDashboard(id, 0, d => { d.content = model.content(c); d.slug = c.slug; });
  const server = createServer(db); await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const errors = []; let browser;
  try {
    browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce' }); await context.addCookies([{ name: 'ri_session', value: 'a'.repeat(64), url: base }]);
    // The print dialog cannot be seen in a headless browser, so a frame's print() only counts the call on the top window.
    await context.addInitScript(() => { if (window !== window.top) window.print = () => { top.__printed = (top.__printed || 0) + 1; }; });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/dashboard/publish/'); await page.locator('[data-save-pdf]').waitFor();
    assert.equal(await page.locator('[data-save-pdf]').count(), 1, 'only the résumé card has it'); assert.equal(await page.locator('[data-ats]').count(), 1);
    assert.match(await page.locator('.pb-hint').first().innerText(), /ذخیره به‌عنوان PDF/);

    // 1. A free template prints: one print() call from a frame without script permission, with print.css and no private contact.
    await page.locator('[data-save-pdf]').click(); await page.waitForFunction(() => window.__printed === 1);
    const frame = page.locator('iframe[title="چاپ رزومه"]'); await frame.waitFor({ state: 'attached' });
    assert.equal(await frame.getAttribute('sandbox'), 'allow-same-origin allow-modals', 'no allow-scripts');
    const srcdoc = await frame.getAttribute('srcdoc'); assert(srcdoc.includes('/public-assets/print.css')); assert(!/<script/i.test(srcdoc), 'no script in the print document');
    assert(srcdoc.includes('امیر طالبی') && srcdoc.includes('JavaScript') && srcdoc.includes('شرکت نمونه')); assert(!srcdoc.includes('09129999999'), 'a private contact is not printed');
    // The print rules hide the menu and the message form and paint the page white.
    await page.emulateMedia({ media: 'print' });
    const printed = await frame.evaluate(f => { const d = f.contentDocument, shown = s => [...d.querySelectorAll(s)].some(e => getComputedStyle(e).display !== 'none'); return { nav: d.querySelectorAll('.pv-nav').length, navShown: shown('.pv-nav,nav'), formShown: shown('form,.ri-inbox'), bg: getComputedStyle(d.body).backgroundColor }; });
    assert(printed.nav > 0 && !printed.navShown && !printed.formShown, 'menu and message form are hidden when printing: ' + JSON.stringify(printed)); assert.equal(printed.bg, 'rgb(255, 255, 255)');
    await page.emulateMedia({ media: 'screen' });

    // 2. A paid template the person does not own does not print; the plain version stays free.
    await frame.evaluate(f => f.remove()); await page.evaluate(() => { RI.C().theme.resume = 'vista'; });
    await page.locator('[data-save-pdf]').click(); await page.locator('.toast', { hasText: 'PDF قالب پولی' }).waitFor();
    assert.equal(await page.locator('iframe[title="چاپ رزومه"]').count(), 0); assert.equal(await page.evaluate(() => window.__printed), 1, 'no second print');
    await page.evaluate(() => { RI.C().theme.resume = 'glacier'; });

    // 3. Plain version: needs the page to be published, then opens ?format=ats in a new tab.
    await page.locator('[data-ats]').click(); await page.locator('.toast', { hasText: 'پس از انتشار' }).waitFor();
    await page.locator('#topPublish').click(); await page.locator('[data-publish-kind=resume]').click();
    await page.waitForFunction(() => document.querySelector('[data-publish-kind=resume]')?.textContent === 'منتشر شد'); await page.getByRole('dialog').getByRole('button', { name: 'بستن', exact: true }).last().click();
    // The card links to the person's real public address, which a local test server does not own; the request is caught and
    // the page content itself is checked in dashboard-api-check.
    let asked = null; await context.route(/format=ats/, route => { asked = route.request().url(); route.fulfill({ contentType: 'text/html', body: 'ok' }); });
    const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('[data-ats]').click()]);
    await popup.waitForLoadState(); assert.match(asked, /amir[^?]*\/?\?format=ats$/); await popup.close();

    // 4. Phones have no reliable print-from-frame: the steps for the browser menu are shown, nothing is printed.
    const phone = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await phone.addCookies([{ name: 'ri_session', value: 'a'.repeat(64), url: base }]); const small = await phone.newPage(); small.on('pageerror', e => errors.push(e.message));
    await small.goto(base + '/dashboard/publish/'); await small.locator('[data-save-pdf]').waitFor(); await small.locator('[data-save-pdf]').click();
    const dialog = small.getByRole('dialog'); await dialog.waitFor(); assert.match(await dialog.innerText(), /آیفون \(Safari\)[\s\S]*اندروید \(Chrome\)/);
    assert.equal(await small.locator('iframe[title="چاپ رزومه"]').count(), 0); assert(await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll');
    fs.mkdirSync('artifacts/resume-print', { recursive: true }); await small.screenshot({ path: 'artifacts/resume-print/phone-steps.png' }); await phone.close();
    assert.deepEqual(errors, []);
    console.log('PASS resume print: one print() from a script-free same-origin frame with print.css, menu and message form hidden, private contact absent, paid template blocked, plain version opens only after publishing and holds no script, phone steps instead of a frame.');
  } finally { await browser?.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
