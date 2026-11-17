// Visit sources in the product (council C3-a): a real public visit records its group, the stats page shows the groups,
// and the publish card builds a link with ?src= for the chosen place.
const assert = require('node:assert/strict'), fs = require('node:fs');
const { createServer } = require('../src/http/server.cjs'), { testStore } = require('./auth-test-store.cjs'), { digest } = require('../src/auth/auth.cjs'), model = require('../src/dashboard/model.cjs'), { chromium } = require('playwright');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const db = testStore(), id = await db.provisionAccount('09120000808', null);
  await db.setAccountNames(id, 'امیر', 'طالبی'); await db.markPhoneVerified(id); await db.createSession(digest('a'.repeat(64)), id, Date.now() + 600000);
  const c = model.initial().content; c.slug = 'amir'; c.profile.name = 'امیر طالبی'; c.profile.title = 'توسعه‌دهنده'; c.profile.bio = 'رزومه من'; c.contacts[0].value = 'hello@example.com'; c.contacts[0].public = true; c.skills = [{ id: 'k1', name: 'JavaScript', level: 4 }];
  // The real dashboard database code runs on SQLite here, so the store is created before the page is saved.
  const store = require('./workspace-test-store.cjs')(db, [id], { workspaces: true });
  await db.mutateDashboard(id, 0, d => { d.content = model.content(c); d.slug = c.slug; });
  const server = createServer(db); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port, errors = []; let browser;
  try {
    browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } }); await context.addCookies([{ name: 'ri_session', value: 'a'.repeat(64), url: base }]);
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    // Publish the résumé through the real controls.
    await page.goto(base + '/dashboard/publish/'); await page.locator('#topPublish').click(); await page.locator('[data-publish-kind=resume]').click();
    await page.waitForFunction(() => document.querySelector('[data-publish-kind=resume]')?.textContent === 'منتشر شد'); await page.getByRole('dialog').getByRole('button', { name: 'بستن', exact: true }).last().click();

    // 1. A real first visit with a tag records its group; the page's canonical address stays without the tag.
    const visit = await fetch(base + '/u/amir/?src=instagram', { headers: { referer: 'https://t.me/x' } }); const html = await visit.text(); assert.equal(visit.status, 200);
    assert(!/rel="canonical" href="[^"]*src=/.test(html), 'canonical has no ?src');
    assert.deepEqual((await db.dashboardSources(id, 7, 1)).map(r => [r.event, r.src, Number(r.total)]), [['resume', 'instagram', 1]], 'the tag beat the Referer');

    // 2. The stats page lists groups largest first, in Persian, with the unknown-origin note.
    for (const [src, times] of [['telegram', 3], ['google', 1], ['irmsg', 1]]) for (let i = 0; i < times; i++) await db.recordMetric(id, 'resume', '', Date.now(), 1, src);
    await page.goto(base + '/dashboard/stats/'); await page.locator('.srclist li').first().waitFor();
    const rows = await page.locator('.srclist li').evaluateAll(l => l.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    assert.match(rows[0], /^تلگرام\s+[۳3]/); assert.equal(rows.length, 4); assert(rows.some(r => /^پیام‌رسان داخلی/.test(r)) && rows.some(r => /^گوگل/.test(r)) && rows.some(r => /^اینستاگرام/.test(r)));
    assert.match(await page.locator('.srcpanel__note').innerText(), /سایر/); fs.mkdirSync('artifacts/sources', { recursive: true }); await page.waitForTimeout(1200); await page.locator('.srcpanel').screenshot({ path: 'artifacts/sources/stats-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll on phones'); await page.locator('.srcpanel').screenshot({ path: 'artifacts/sources/stats-mobile.png' });

    // 3. The publish card builds a link for the chosen place (only once published), and the stats stay empty-state friendly for another slot.
    await page.setViewportSize({ width: 1280, height: 900 }); await page.goto(base + '/dashboard/publish/'); await page.locator('.pb-src summary').first().click();
    await page.locator('.pb-src select').first().selectOption('jobsite'); await page.locator('[data-src-copy]').first().click();
    await page.waitForFunction(async () => /[?&]src=jobsite$/.test(await navigator.clipboard.readText()));
    assert.equal(await page.locator('.pb-src').count(), 1, 'only the published page has the link builder');
    assert.deepEqual(errors, []);
    console.log('PASS visit sources (product): a tagged visit is recorded under its tag with a clean canonical, the stats page lists the groups in Persian largest first, and the publish card copies a ?src= link for the chosen place.');
  } finally { await browser?.close(); await new Promise(r => server.close(r)); store.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
