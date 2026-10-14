const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../src/http/server.cjs');
const { testStore } = require('./auth-test-store.cjs');

(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const db = testStore(), server = createServer(db);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const logo = /^https:\/\/trustseal\.enamad\.ir\/logo\.aspx/;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR2QAAAAASUVORK5CYII=', 'base64');
  const out = path.resolve('artifacts/enamad'); fs.mkdirSync(out, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route(logo, route => route.abort());
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 }); await page.goto(base);
      const fallback = page.locator('.footer-enamad-fallback'); await fallback.scrollIntoViewIfNeeded();
      assert(await fallback.isVisible()); assert((await fallback.innerText()).includes('resumeit.ir'));
      assert.equal(await fallback.getAttribute('href'), 'https://enamad.ir/');
      assert((await page.locator('[data-enamad-seal] img').getAttribute('alt')).includes('جست‌وجو'));
      assert(!(await page.locator('[data-enamad-seal]').isVisible()));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, 'fallback-' + width + '.png') });
    }
    await page.unroute(logo);
    let release; const pending = new Promise(resolve => { release = resolve; });
    await page.route(logo, async route => { await pending; await route.fulfill({ contentType: 'image/png', body: png }); });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    assert(await page.locator('.footer-enamad-fallback').isVisible());
    release(); await page.locator('[data-enamad-seal]').waitFor({ state: 'visible' });
    assert(!(await page.locator('.footer-enamad-fallback').isVisible()));
    await page.reload(); await page.locator('[data-enamad-seal]').waitFor({ state: 'visible' });
    assert(!(await page.locator('.footer-enamad-fallback').isVisible()));
    const noScript = await browser.newPage({ javaScriptEnabled: false });
    await noScript.route(logo, route => route.abort()); await noScript.goto(base);
    assert(await noScript.locator('.footer-enamad-fallback').isVisible());
    assert.deepEqual(errors, []);
    console.log('PASS: readable eNAMAD fallback/alt/link on desktop and mobile, pending/failed/successful/cached images and JavaScript disabled.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
