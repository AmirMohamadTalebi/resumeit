// Landing FAQ and the «فرصت بعدی، شاید یک آدرس بخواهد» section, checked in code on desktop and phone widths:
// search, highlights, categories and counts, one-open accordion, keyboard and deep links; the live address preview,
// its publish-page rule and sign-up on Enter; no sideways scroll; reduced motion keeps everything usable.
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { createServer } = require('../src/http/server.cjs'), { testStore } = require('./auth-test-store.cjs');
(async () => {
  const server = createServer(testStore()); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  const open = el => el.evaluate(d => d.open), visible = page => page.locator('.faq-list details:visible').count();
  try {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/'); await page.addStyleTag({ content: '.ln-fandogh{display:none!important}' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ': no sideways scroll');

      // FAQ: structure, numbers and counts.
      const details = page.locator('.faq-list details'), summaries = page.locator('.faq-list summary');
      await page.locator('#faq').scrollIntoViewIfNeeded();
      assert.equal(await details.count(), 12);
      assert.equal(await page.locator('.ln-faq__num').first().textContent(), '۰۱');
      assert.equal(await page.locator('.ln-faq__num').last().textContent(), '۱۲');
      assert.equal(await page.locator('[data-faq-count=all]').textContent(), '۱۲');
      assert.equal(await page.locator('[data-faq-count=fandogh]').textContent(), '۳');
      assert.equal(await page.locator('[data-faq-count=pay]').textContent(), '۲');

      // One answer open at a time, with its own link; a second click closes it; Enter works from the keyboard.
      // Each step waits for the accordion's height animation to finish (slower on CI runners) before checking.
      const until = async (check, message) => {
        for (const started = Date.now(); ; await page.waitForTimeout(100)) {
          const idle = await page.evaluate(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity && a.effect?.target?.closest?.('.faq-list')));
          if (idle && await check()) return;
          if (Date.now() - started > 4000) assert.fail(message);
        }
      };
      await summaries.nth(0).click();
      await until(() => open(details.nth(0)), 'first answer opens');
      assert.equal(new URL(page.url()).hash, '#faq-what', 'opening gives the answer its own link');
      await summaries.nth(1).click();
      await until(async () => !(await open(details.nth(0))) && await open(details.nth(1)), 'opening another closes the first');
      await summaries.nth(1).click();
      await until(async () => !(await open(details.nth(1))), 'second click closes');
      await summaries.nth(2).focus(); await page.keyboard.press('Enter');
      await until(() => open(details.nth(2)), 'Enter opens from the keyboard');

      // Categories narrow the list and mark the pressed chip.
      await page.locator('.ln-faq__cat[data-faq-cat=pay]').click(); await page.waitForTimeout(250);
      assert.equal(await visible(page), 2);
      assert.equal(await page.locator('.ln-faq__cat[data-faq-cat=pay]').getAttribute('aria-pressed'), 'true');
      await page.locator('.ln-faq__cat[data-faq-cat=all]').click(); await page.waitForTimeout(250);
      assert.equal(await visible(page), 12);

      // Search filters, highlights, counts and opens a single match; Arabic ي/ك still match; empty state; clear.
      await page.fill('#faq-q', 'دامنه'); await page.waitForTimeout(350);
      assert.equal(await visible(page), 1);
      assert(await open(page.locator('#faq-domain')), 'the only match opens itself');
      assert(await page.locator('#faq-domain mark').count() >= 1, 'the match is highlighted');
      assert.equal(await page.locator('[data-faq-count=all]').textContent(), '۱');
      assert(await page.locator('[data-faq-clear]').isVisible());
      await page.fill('#faq-q', 'اشتراك'); await page.waitForTimeout(350);
      assert(await visible(page) >= 2, 'Arabic kaf matches Persian text');
      await page.fill('#faq-q', 'زرافه'); await page.waitForTimeout(350);
      assert.equal(await visible(page), 0); assert(await page.locator('[data-faq-empty]').isVisible(), 'empty state with a way to ask support');
      await page.click('[data-faq-clear]'); await page.waitForTimeout(350);
      assert.equal(await visible(page), 12); assert.equal(await page.locator('#faq-q').inputValue(), ''); assert.equal(await page.locator('.faq-list mark').count(), 0);
      assert(!(await page.locator('[data-faq-empty]').isVisible()));

      // A shared link opens its answer, even when that answer is filtered out.
      await page.locator('.ln-faq__cat[data-faq-cat=start]').click();
      await page.evaluate(() => { location.hash = 'faq-it'; }); await page.waitForTimeout(300);
      assert(await open(page.locator('#faq-it')) && await page.locator('#faq-it').isVisible(), 'hash opens a filtered-out answer');

      // The address section: sign-up link, the publish page's rule, warnings and the live preview.
      await page.locator('#claim').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.closing-actions .btn').getAttribute('href'), '/register/');
      const input = page.locator('#claim-name'), url = page.locator('[data-claim-url]'), claim = page.locator('.ln-claim'), hint = page.locator('[data-claim-hint]');
      await input.fill('Nika_Rad!!');
      assert.equal(await input.inputValue(), 'nikarad', 'only lowercase letters, digits and hyphens are kept');
      assert.equal(await url.textContent(), 'nikarad'); assert.equal(await page.locator('[data-claim-initial]').textContent(), 'N');
      assert.match(await claim.getAttribute('class'), /is-valid/); assert.match(await hint.textContent(), /آدرس قشنگی است/);
      await input.fill('ab'); assert.doesNotMatch(await claim.getAttribute('class'), /is-valid/, 'two letters are too short');
      await input.fill('amir--rad-'); assert.equal(await input.inputValue(), 'amir-rad-', 'double hyphens collapse');
      assert.doesNotMatch(await claim.getAttribute('class'), /is-valid/, 'a trailing hyphen is not valid yet');
      await input.fill('نیکا'); assert.equal(await input.inputValue(), ''); assert.equal(await url.textContent(), 'you');
      assert.match(await hint.getAttribute('class'), /is-warn/); assert.match(await hint.textContent(), /حروف انگلیسی/);
      await input.fill('a'.repeat(40)); assert.equal((await input.inputValue()).length, 24, 'at most 24 characters');
      await input.fill('nika');
      await Promise.all([page.waitForURL(u => new URL(u).pathname === '/register/'), input.press('Enter')]);
      assert.deepEqual(errors, [], width + ': no page errors');
      await page.close();
    }

    // Reduced motion: answers open at once, the preview does not type by itself, and validation still works.
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } }), page = await context.newPage();
    await page.goto(base + '/'); await page.addStyleTag({ content: '.ln-fandogh{display:none!important}' });
    await page.locator('.faq-list summary').first().click();
    assert(await open(page.locator('.faq-list details').first()), 'opens instantly with reduced motion');
    await page.locator('#claim').scrollIntoViewIfNeeded(); const still = await page.locator('[data-claim-url]').textContent(); await page.waitForTimeout(2500);
    assert.equal(await page.locator('[data-claim-url]').textContent(), still, 'demo names stay still with reduced motion');
    await page.fill('#claim-name', 'sara'); assert.match(await page.locator('.ln-claim').getAttribute('class'), /is-valid/);
    await context.close();
    console.log('PASS landing sections: FAQ search, highlights, categories, counts, one-open accordion, keyboard and deep links; address preview with the publish rule, warnings and sign-up; no sideways scroll; reduced motion.');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
