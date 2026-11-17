// Versions in the product (council C1-a): publishing makes a copy, the «نسخه‌ها» tab lists it with what differs, restoring brings back
// the draft only (the public page stays), the routes need the right account, slot and origin, and the data export carries them.
const assert = require('node:assert/strict'), fs = require('node:fs');
const { createServer } = require('../src/http/server.cjs'), { testStore } = require('./auth-test-store.cjs'), { digest } = require('../src/auth/auth.cjs'), model = require('../src/dashboard/model.cjs'), { chromium } = require('playwright');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const db = testStore(), id = await db.provisionAccount('09120000810', null), other = await db.provisionAccount('09120000811', null);
  for (const u of [id, other]) { await db.setAccountNames(u, 'امیر', 'طالبی'); await db.markPhoneVerified(u); }
  await db.createSession(digest('a'.repeat(64)), id, Date.now() + 600000); await db.createSession(digest('b'.repeat(64)), other, Date.now() + 600000);
  const store = require('./workspace-test-store.cjs')(db, [id, other], { workspaces: true });
  const c = model.initial().content; c.slug = 'amir'; c.profile.name = 'امیر طالبی'; c.profile.title = 'نسخهٔ اول'; c.profile.bio = 'رزومه من'; c.contacts[0].value = 'hello@example.com'; c.contacts[0].public = true; c.skills = [{ id: 'k1', name: 'JavaScript', level: 4 }];
  await db.mutateDashboard(id, 0, d => { d.content = model.content(c); d.slug = c.slug; });
  const server = createServer(db); await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port, errors = []; let browser;
  const api = async (route, body, session = 'a') => { const r = await fetch(base + '/api/dashboard/' + route, { method: body ? 'POST' : 'GET', headers: { cookie: 'ri_session=' + session.repeat(64), ...(body ? { 'content-type': 'application/json', origin: base } : {}) }, body: body && JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };
  try {
    browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } }); await context.addCookies([{ name: 'ri_session', value: 'a'.repeat(64), url: base }]);
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    const publish = async () => { await page.goto(base + '/dashboard/publish/'); await page.locator('#topPublish').click(); await page.locator('[data-publish-kind=resume]').click(); await page.waitForFunction(() => /منتشر شد/.test(document.querySelector('[data-publish-kind=resume]')?.textContent || '')); await page.getByRole('dialog').getByRole('button', { name: 'بستن', exact: true }).last().click(); };
    // 1. No version before the first publish; the tab says so. A publish makes one.
    await page.goto(base + '/dashboard/publish/'); await page.locator('#ptabs [data-tab=versions]').click(); await page.locator('.empty, .pb-vlist').first().waitFor(); assert.equal(await page.locator('.pb-vlist li').count(), 0);
    await publish(); await page.locator('#ptabs [data-tab=versions]').click(); await page.locator('.pb-vlist li').first().waitFor(); assert.equal(await page.locator('.pb-vlist li').count(), 1); assert.match(await page.locator('.pb-vlist li').first().innerText(), /انتشار[\s\S]*مثل پیش‌نویس فعلی/);
    // 2. Change the draft and publish again: two versions, the older one shows what differs from the draft.
    await page.evaluate(() => { RI.C().profile.title = 'نسخهٔ دوم'; RI.touch('profile'); }); await page.waitForFunction(() => !RI.state.ui.dirty, null, { timeout: 15000 }).catch(() => {});
    await publish(); await page.locator('#ptabs [data-tab=versions]').click(); await page.locator('.pb-vlist li').nth(1).waitFor(); assert.equal(await page.locator('.pb-vlist li').count(), 2);
    assert.match(await page.locator('.pb-vlist li').nth(1).innerText(), /فرق دارد در: .*معرفی/);
    // 3. Edit the draft only, then restore the older version: the draft goes back, the public page is untouched, a backup appears.
    await page.evaluate(() => { RI.C().profile.title = 'پیش‌نویس سوم'; RI.touch('profile'); }); await page.waitForFunction(() => !RI.state.ui.dirty, null, { timeout: 15000 });
    await page.locator('.pb-vlist li').nth(1).locator('[data-restore]').click(); await page.getByRole('dialog').getByRole('button', { name: 'بازگردانی', exact: true }).click();
    await page.waitForFunction(() => RI.C().profile.title === 'نسخهٔ اول'); await page.locator('.toast', { hasText: 'صفحهٔ عمومی تا انتشار عوض نمی‌شود' }).waitFor();
    assert.equal((await db.loadDashboard(id)).content.profile.title, 'نسخهٔ اول'); const pub = await fetch(base + '/u/amir/'); assert((await pub.text()).includes('نسخهٔ دوم'), 'the public page still shows the published version');
    await page.locator('.pb-vlist li').nth(2).waitFor(); assert.match(await page.locator('.pb-vlist li').first().innerText(), /پیش از بازگردانی/);
    // 4. The routes: another account cannot list or restore; no origin, no restore; a stale revision is a conflict; clearing needs the word.
    const mine = (await api('versions')).json.versions; assert.equal(mine.length, 3); assert.equal((await api('versions', null, 'b')).json.versions.length, 0);
    assert.equal((await api('versions/restore', { id: mine[0].id, revision: 0 }, 'b')).status, 404);
    const forged = await fetch(base + '/api/dashboard/versions/restore', { method: 'POST', headers: { cookie: 'ri_session=' + 'a'.repeat(64), 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify({ id: mine[0].id, revision: 0 }) }); assert.equal(forged.status, 403);
    assert.equal((await api('versions/restore', { id: mine[0].id, revision: 0 })).status, 409, 'a stale page revision cannot restore'); assert.equal((await api('versions/restore', { id: 'x' })).status, 400);
    assert.equal((await api('versions/clear', {})).status, 400); assert.equal((await api('versions?workspace=2')).json.versions.length, 0, 'another page has its own list');
    // 5. The data export carries the versions; the clear button empties this page's copies after a confirmation.
    await page.goto(base + '/dashboard/settings/'); await page.locator('#set-tab-data').click(); const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export]').click()]);
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8')); assert.equal(exported.versions.length, 3); assert.equal(exported.versions[0].content.profile.name, 'امیر طالبی');
    fs.mkdirSync('artifacts/versions', { recursive: true }); await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base + '/dashboard/publish/'); await page.locator('#ptabs [data-tab=versions]').click(); await page.locator('.pb-vlist li').first().waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll on phones'); await page.waitForTimeout(700); await page.screenshot({ path: 'artifacts/versions/tab-mobile.png' }); await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(base + '/dashboard/publish/'); await page.locator('#ptabs [data-tab=versions]').click(); await page.locator('[data-versions-clear]').click(); await page.getByRole('dialog').getByRole('button', { name: 'حذف همه', exact: true }).click();
    await page.locator('.pb-versions .empty, .pb-versions [class*=empty]').first().waitFor(); assert.equal((await api('versions')).json.versions.length, 0);
    assert.deepEqual(errors, []);
    console.log('PASS versions (product): publish makes a copy, the tab lists copies with what differs, restore brings back the draft only and keeps a backup, the public page is untouched, other accounts, stale revisions, forged origins and missing confirmation are refused, export carries versions, clear empties the list, phone width.');
  } finally { await browser?.close(); await new Promise(r => server.close(r)); store.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
