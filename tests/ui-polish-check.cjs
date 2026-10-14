const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('../src/http/server.cjs');
const { RI } = require('../src/dashboard/render.cjs');
function luminance(hex) {
  const rgb = hex.trim().slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}

(async () => {
  const fixture = await require('./admin-fixture.cjs')();
  await fixture.db.mutateDashboard(fixture.owner, 0, d => {
    d.content = structuredClone(RI.seed('full'));
    d.content.profile.avatar = null;
    d.content.links.items[0].title = 'عنوان طولانی لینک برای بررسی خوانایی آمار و صفحه در نمایشگر کوچک';
  });
  const server = createServer(fixture.db);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'ri_session', value: 'a'.repeat(64), url: base }]);
    await context.addInitScript(id => sessionStorage.setItem('ri-panel-choice', id), fixture.owner);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const [width, height] of [[320, 740], [390, 844], [640, 360], [1366, 768]]) {
      await page.setViewportSize({ width, height });
      for (const route of ['about', 'contact', 'terms', 'privacy']) {
        await page.goto(base + '/' + route + '/');
        const gap = await page.evaluate(() => document.querySelector('h1').getBoundingClientRect().top - document.querySelector('.public-header').getBoundingClientRect().bottom);
        assert(gap >= 24 && gap <= 64, 'informational page spacing ' + route + ' ' + width);
      }
      await page.goto(base + '/dashboard/settings/');
      await page.locator('[data-brand]').waitFor();
      const colors = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        return ['ok', 'warn'].map(key => [css.getPropertyValue('--' + key), css.getPropertyValue('--' + key + '-bg')]);
      });
      for (const [foreground, background] of colors) assert((luminance(background) + .05) / (luminance(foreground) + .05) >= 4.5, 'status text contrast');
      assert(await page.locator('[data-brand]').isDisabled());
      assert(await page.locator('[data-brand]').isChecked());
      assert(!(await page.locator('#view').innerText()).includes('با اشتراک می‌توانی آن را برداری'));
      assert(await page.evaluate(() => document.querySelector('[data-name]').getBoundingClientRect().top >= document.querySelector('#a_last').getBoundingClientRect().bottom));
      if (width === 1366) assert(await page.evaluate(() => document.querySelector('.nav__item[data-route=settings]').getBoundingClientRect().bottom <= document.querySelector('.nav').getBoundingClientRect().bottom), 'all navigation entries fit at 768px height');
      await page.goto(base + '/dashboard/stats/');
      await page.locator('.chart').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('.legend li').count(), 2);
      const cards = await page.locator('.stat').evaluateAll(nodes => nodes.map(e => ({ top: e.offsetTop, height: e.offsetHeight })));
      if (width <= 760) {
        assert(cards.every(c => c.top === cards[0].top), 'statistics stay in one compact row');
        assert(cards.every(c => c.height < 110));
      }
      for (const range of [7, 30, 90]) {
        await page.locator('[data-r="' + range + '"]').click();
        const clipped = await page.locator('.chart text').evaluateAll(nodes => nodes.map(e => e.getBBox()).some(r => r.x < 0 || r.x + r.width > 640));
        assert(!clipped, 'chart labels fit for ' + range + ' days');
      }
      assert.match(await page.locator('.allsteps tbody tr').last().textContent(), /امروز/);
      await page.goto(base + '/dashboard/wallet/');
      await page.locator('.wallet-overview').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (width === 640) assert(await page.locator('.bottom-nav').evaluate(e => e.offsetHeight <= 50), 'landscape navigation stays compact');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [route, list] of [['links', '#ltabs'], ['themes', '#ttabs'], ['publish', '#ptabs'], ['resume', '.stepper__chips']]) {
      await page.goto(base + '/dashboard/' + route + '/');
      await page.locator(list + ' [role=tab]').first().focus();
      await page.keyboard.press('End');
      assert.equal(await page.locator(list + ' [role=tab]').last().getAttribute('aria-selected'), 'true', route + ' End');
      assert(await page.locator(list + ' [role=tab]').last().evaluate(e => e === document.activeElement));
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.locator(list + ' [role=tab]').nth(1).getAttribute('aria-selected'), 'true', route + ' RTL arrow');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator(list + ' [role=tab]').first().getAttribute('aria-selected'), 'true');
    }
    await page.goto(base + '/dashboard/links/');
    await page.locator('[data-add]').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    for (let i = 0; i < 15; i++) await page.keyboard.press('Tab');
    assert(await dialog.evaluate(e => e.contains(document.activeElement)), 'modal keeps keyboard focus');
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    await page.goto(base + '/admin/users/');
    await page.locator('.table-scroll').waitFor();
    assert(await page.locator('.table-hint').isVisible());
    assert.equal(await page.locator('.table-scroll').getAttribute('tabindex'), '0');
    assert(await page.locator('#admin-menu').evaluate(e => e !== document.activeElement), 'menu does not steal initial focus');
    await page.goto(base + '/admin/users/?user=' + fixture.target);
    await page.locator('[data-action=credit]').click();
    await page.locator('#action-dialog[open]').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#action-dialog').open);
    assert(await page.locator('[data-action=credit]').evaluate(e => e === document.activeElement), 'Escape returns to the action trigger');
    assert.deepEqual(errors, []);
    console.log('PASS: compact public/landscape spacing, honest brand settings, account form order, statistics/labels, wallet layout, RTL keyboard tabs and modal focus.');
  } finally {
    await browser?.close();
    await new Promise(r => server.close(r));
    await fixture.db.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
