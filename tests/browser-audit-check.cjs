const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { createServer } = require('../src/http/server.cjs');
const { testStore } = require('./auth-test-store.cjs');
const { digest } = require('../src/auth/auth.cjs');
const { RI } = require('../src/dashboard/render.cjs');

(async () => {
  const live = process.env.AUDIT_LIVE === '1';
  const db = testStore();
  let store;
  if (!live) {
    const id = await db.provisionAccount('09120000883', null);
    store=require('./workspace-test-store.cjs')(db,[id],{workspaces:true});
    await db.createSession(digest('e'.repeat(64)), id, Date.now() + 600000);
    await db.setAccountNames(id, 'آزمایش', 'داشبورد');
    await db.markPhoneVerified(id);
    await db.mutateDashboard(id, 0, d => {
      d.content = JSON.parse(JSON.stringify(RI.seed('full')));
      d.content.profile.avatar = null;
      d.content.profile.name = 'نام و نام خانوادگی بلند برای بررسی چیدمان';
      d.content.links.items[0].title = 'لینک با عنوان بلند برای بررسی نمایش درست در صفحه‌های کوچک';
      d.content.links.items[0].url = 'https://example.com/' + 'long-path-'.repeat(25);
    });
    db.wallet = async () => ({ balance: 500, rate: 2000, transactions: [] });
  }
  const server = live ? null : createServer(db);
  if (server) await new Promise(r => server.listen(43283, '127.0.0.1', r));
  const base = live ? 'https://resumeit.ir' : 'http://127.0.0.1:43283';
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  const report = { mode: live ? 'live-public' : 'local-populated-dashboard', pages: 0, issues: [], errors: [], failed: [] };
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    if (!live) await context.addCookies([{ name: 'ri_session', value: 'e'.repeat(64), url: base }]);
    const page = await context.newPage(), links = new Set();
    page.on('pageerror', e => report.errors.push({ url: page.url(), error: e.message }));
    page.on('response', r => {
      if (r.status() >= 400 && new URL(r.url()).origin === base) report.failed.push({ url: r.url(), status: r.status() });
    });
    const widths = live ? [390, 1366] : [320, 360, 390, 640, 768, 900, 960, 961, 1024, 1280, 1366, 1920];
    const routes = live
      ? ['/', '/about/', '/terms/', '/contact/', '/login/', '/register/', '/forgot-password/', '/demo/']
      : ['/dashboard/', '/dashboard/links/', '/dashboard/resume/', '/dashboard/themes/', '/dashboard/publish/', '/dashboard/billing/', '/dashboard/stats/', '/dashboard/settings/', '/dashboard/wallet/'];
    fs.mkdirSync('artifacts/browser-audit', { recursive: true });
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 640 ? 360 : 768 });
      for (const route of routes) {
        const response = await page.goto(base + route, { timeout: 60000 });
        assert.equal(response.status(), 200, route);
        await page.locator(live ? 'body' : '#page-title').waitFor();
        if (!live) await page.waitForFunction(() => !document.querySelector('.ri-page-loading'));
        await page.evaluate(() => document.fonts.ready);
        report.pages++;
        const checks = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          offenders: [...document.querySelectorAll('#view *')].filter(e => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
          }).slice(0, 12).map(e => ({ tag: e.tagName, class: e.className, width: Math.round(e.getBoundingClientRect().width) })),
          broken: [...document.images].filter(i => i.getBoundingClientRect().width > 0 && i.complete && !i.naturalWidth).map(i => i.src),
          anchors: [...document.querySelectorAll('a[href]')].map(a => a.href),
        }));
        for (const url of checks.anchors) {
          const u = new URL(url);
          if (u.origin === base && !u.pathname.startsWith('/api/') && !u.pathname.includes('/out/')) links.add(u.href);
        }
        if (checks.scroll > width + 1 || checks.broken.length) {
          report.issues.push({ route, width, scroll: checks.scroll, broken: checks.broken, offenders: checks.offenders });
          await page.screenshot({ path: 'artifacts/browser-audit/' + route.replaceAll('/', '-') + width + '.png' });
        }
        if (!live && [320, 1366].includes(width)) {
          const tabs = await page.locator('#view [role=tab][data-tab]').evaluateAll(es => es.map(e => e.dataset.tab));
          for (const tab of tabs) {
            await page.locator('#view [role=tab][data-tab="' + tab + '"]').click();
            await page.evaluate(() => document.fonts.ready);
            const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
            if (scroll > width + 1) report.issues.push({ route, tab, width, scroll });
          }
          if (route === '/dashboard/') await page.screenshot({ path: 'artifacts/browser-audit/fixed-home-' + width + '.png' });
        }
        if (!live && route === '/dashboard/links/') {
          await page.locator('#view [role=tab][data-tab="items"]').click();
          await page.locator('[data-add]').first().click();
          await page.getByRole('dialog').waitFor();
          await page.keyboard.press('Escape');
          assert.equal(await page.getByRole('dialog').count(), 0);
          if ([320, 1366].includes(width)) await page.screenshot({ path: 'artifacts/browser-audit/fixed-links-' + width + '.png' });
        }
      }
    }
    for (const url of links) {
      const r = await context.request.get(url, { timeout: 30000 });
      if (r.status() >= 400) report.issues.push({ link: url, status: r.status() });
    }
    report.links = links.size;
    fs.writeFileSync('artifacts/browser-audit/' + report.mode + '.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert.deepEqual(report.issues, []);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.failed, []);
  } finally {
    await browser.close();
    if (server) await new Promise(r => server.close(r));
    db.close();
    store?.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
