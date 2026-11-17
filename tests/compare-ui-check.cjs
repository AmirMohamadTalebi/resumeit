// The comparison in the product (council C3-c): chips and one sentence on the stats page, the same chips on the home tiles,
// slot 2 compared on its own, and a card that leads to the link builder when no visit has come.
const assert = require('node:assert/strict'), fs = require('node:fs');
const { createServer } = require('../src/http/server.cjs'), { testStore } = require('./auth-test-store.cjs'), { digest } = require('../src/auth/auth.cjs'), model = require('../src/dashboard/model.cjs'), { chromium } = require('playwright');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const db = testStore(), id = await db.provisionAccount('09120000809', null);
  await db.setAccountNames(id, 'امیر', 'طالبی'); await db.markPhoneVerified(id); await db.createSession(digest('a'.repeat(64)), id, Date.now() + 600000);
  const store = require('./workspace-test-store.cjs')(db, [id], { workspaces: true });
  const c = model.initial().content; c.slug = 'amir'; c.profile.name = 'امیر طالبی'; c.profile.title = 'توسعه‌دهنده'; await db.mutateDashboard(id, 0, d => { d.content = model.content(c); d.slug = c.slug; });
  const server = createServer(db); await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port, errors = []; let browser;
  const DAY = 864e5, visits = async (daysAgo, times, slot = 1, event = 'resume') => { for (let i = 0; i < times; i++) await db.recordMetric(id, event, '', Date.now() - daysAgo * DAY, slot); };
  try {
    browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } }); await context.addCookies([{ name: 'ri_session', value: 'a'.repeat(64), url: base }]);
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    const stats = async () => { await page.goto(base + '/dashboard/stats/'); await page.locator('.statgrid').waitFor(); };
    // 1. Nothing yet: no chips, no sentence, and a card with the way forward.
    await stats(); assert.equal(await page.locator('.cmp').count(), 0); assert.match(await page.locator('.cmpnote--empty').innerText(), /هنوز بازدیدی نیامده/);
    await page.locator('.cmpnote--empty [data-go=publish]').click(); await page.locator('.pb-card').first().waitFor();
    // 2. Only this week: "new", never a percentage of zero.
    await visits(1, 4); await stats(); assert.match(await page.locator('.stat', { hasText: 'بازدید رزومه' }).locator('.cmp').innerText(), /جدید/); assert.match(await page.locator('p.cmpnote').innerText(), /۴ بازدید داشتی؛ دورهٔ قبل بازدیدی نبود/);
    assert.equal(await page.locator('.cmpnote--empty').count(), 0);
    // 3. Last week had 8, this week 4: down 50%, in the chip and the sentence.
    await visits(9, 8); await stats(); assert.match(await page.locator('.stat', { hasText: 'بازدید رزومه' }).locator('.cmp--down').innerText(), /▼ ۵۰٪ کمتر از ۷ روز قبل/); assert.match(await page.locator('p.cmpnote').innerText(), /۵۰٪ کمتر/);
    // 4. Raising this week above last week flips it up; the 30-day range compares too, 90 days makes no claim.
    await visits(2, 12); await stats(); assert.match(await page.locator('.stat', { hasText: 'بازدید رزومه' }).locator('.cmp--up').innerText(), /▲ ۱۰۰٪ بیشتر/);
    await page.locator('[data-r="30"]').click(); assert.match(await page.locator('.stat', { hasText: 'بازدید رزومه' }).locator('.cmp').innerText(), /۳۰ روز قبل/);
    await page.locator('[data-r="90"]').click(); assert.equal(await page.locator('.cmp').count(), 0, 'no claim for 90 days'); assert.equal(await page.locator('p.cmpnote').count(), 0);
    // 5. The home tile shows the 7-day chip.
    await page.goto(base + '/dashboard/'); await page.locator('.hb-kpi .cmp--up').first().waitFor(); assert.match(await page.locator('.hb-kpi', { hasText: 'بازدید رزومه' }).locator('.cmp').innerText(), /۷ روز قبل/);
    fs.mkdirSync('artifacts/compare', { recursive: true }); await page.waitForTimeout(900); await page.screenshot({ path: 'artifacts/compare/home-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 }); await stats(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll'); await page.waitForTimeout(900); await page.screenshot({ path: 'artifacts/compare/stats-mobile.png' });
    assert.deepEqual(errors, []);
    console.log('PASS compare in the product: empty-state card to the link builder, "new" without a percentage, down then up with matching chip and sentence, 30 days compared, 90 days silent, home tile chip, phone width.');
  } finally { await browser?.close(); await new Promise(r => server.close(r)); store.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
