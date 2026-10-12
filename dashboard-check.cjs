const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('./server.cjs');
const { testStore } = require('./auth-test-store.cjs');
const { hashPassword } = require('./auth.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const database = testStore();
  const ownerId=await database.provisionAccount('09120000001', await hashPassword('DemoOnly123!'));
  await database.socialAccount('google','10001','',ownerId);await database.socialAccount('github','10002','',ownerId);
  const server = createServer(database);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    const redirect = await fetch(base + '/dashboard?test=1', { redirect: 'manual' });
    assert.equal(redirect.status, 303);
    assert.equal(redirect.headers.get('location'), '/login/');
    for (const route of ['resume','links','themes','publish','billing','stats','settings']) {
      const response = await fetch(base + '/dashboard/' + route + '/', {redirect:'manual'});
      assert.equal(response.status,303); assert.equal(response.headers.get('location'),'/login/');
    }
    assert.equal((await fetch(base + '/.env')).status, 404);
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
    await page.goto(base + '/dashboard/');
    await page.waitForURL('**/login/');
    await page.locator('#mobile').fill('09120000001');
    await page.locator('#pass').fill('DemoOnly123!');
    await page.locator('#accept-terms').check();await page.locator('#sb').click();
    await page.locator('#goDash').click();
    await page.waitForURL('**/dashboard/');
    await page.waitForSelector('#page-title').catch(error => { console.error({errors,failed}); throw error; });
    assert.equal(await page.locator('#demoBtn').count(), 0);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(()=>RI.go('settings'));await page.waitForSelector('[data-conn="google"]');
    await page.evaluate(()=>{for(let i=0;i<12;i++)RI.rerender();});
    for(const provider of ['google','github']) {
      const control=()=>page.locator('[data-conn="'+provider+'"]');
      assert(await page.evaluate(k=>RI.state.account[k],provider));
      await control().click();assert.equal(await page.getByRole('dialog').count(),1);
      await page.getByRole('dialog').getByRole('button',{name:'انصراف',exact:true}).click();
      assert.equal(await page.getByRole('dialog').count(),0);assert(await page.evaluate(k=>RI.state.account[k],provider));
      await control().click();assert.equal(await page.getByRole('dialog').count(),1);
      await page.getByRole('dialog').getByRole('button',{name:'قطع اتصال',exact:true}).click();
      await page.waitForFunction(k=>!RI.state.account[k],provider);assert.equal(await page.getByRole('dialog').count(),0);
    }
    await page.evaluate(()=>RI.go('home'));await page.waitForURL('**/dashboard/');await page.waitForSelector('#page-title');
    const output = path.join(__dirname, 'artifacts', 'dashboard'); fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    for (const route of ['resume', 'links', 'themes', 'publish', 'billing', 'stats', 'settings', 'home']) {
      await page.locator('#sidebar [data-route="' + route + '"]').click();
      await page.waitForFunction(route => document.querySelector('#sidebar [data-route="' + route + '"]')?.getAttribute('aria-current') === 'page' && !!document.querySelector('#page-title'), route);
      assert.equal(await page.locator('#page-title').count(), 1, route);
      const routePath = route === 'home' ? '/dashboard/' : '/dashboard/' + route + '/';
      assert.equal(new URL(page.url()).pathname, routePath);
      assert.equal(new URL(page.url()).hash, '');
      assert.deepEqual(await page.evaluate(() => Object.keys(RI.pages)), [route]);
      await page.reload(); await page.waitForSelector('#page-title');
      if (route === 'billing') {
        assert(!(await page.locator('#view').innerText()).includes('مبلغ نمایشی'));
        assert.deepEqual(await page.evaluate(() => Object.values(RI.PLANS).map(p => p.price / p.months)), [95000,85000,75000]);
        await page.locator('[data-sub="q"]').click();
        assert((await page.getByRole('dialog').innerText()).includes('پرداخت هنوز فعال نیست'));
        await page.getByRole('dialog').getByRole('button', {name:'بستن',exact:true}).last().click();
        assert.equal(await page.evaluate(() => RI.hasSub()), false);
      }
    }
    await page.locator('#sidebar [data-route="resume"]').click();
    await page.locator('[role="tab"][data-step="skills"]').click();
    const originalSkills = await page.evaluate(() => RI.C().skills.length);
    await page.locator('[data-add]').first().click();
    await page.getByRole('dialog').locator('[data-field="name"] input').fill('QA Skill');
    await page.getByRole('dialog').getByRole('button', { name: 'افزودن', exact: true }).click();
    await page.waitForFunction(n => RI.C().skills.length === n + 1, originalSkills);
    await page.locator('#saveBtn').click();
    await page.waitForFunction(() => !RI.state.ui.dirty && !RI.state.ui.saving);
    await page.locator('#sidebar [data-route="links"]').click();
    await page.waitForSelector('[data-add]');
    assert.equal(await page.evaluate(() => RI.C().skills.some(item => item.name === 'QA Skill')), true);
    await page.locator('[data-add]').first().click();
    await page.getByRole('dialog').locator('[data-field="title"] input').fill('QA Link');
    await page.getByRole('dialog').locator('[data-field="url"] input').fill('https://example.com/qa');
    await page.getByRole('dialog').getByRole('button', { name: 'افزودن', exact: true }).click();
    await page.waitForFunction(() => RI.C().links.items.some(item => item.title === 'QA Link'));
    const id = await page.evaluate(() => RI.C().links.items.find(item => item.title === 'QA Link').id);
    await page.locator('[data-edit="' + id + '"]').click();
    await page.getByRole('dialog').locator('[data-field="title"] input').fill('QA Edited');
    await page.getByRole('dialog').getByRole('button', { name: 'ذخیرهٔ تغییر', exact: true }).click();
    await page.waitForFunction(id => RI.C().links.items.find(item => item.id === id).title === 'QA Edited', id);
    await page.locator('[data-up="' + id + '"]').click();
    await page.locator('[data-active="' + id + '"]').uncheck();
    assert.equal(await page.evaluate(id => RI.C().links.items.find(item => item.id === id).active, id), false);
    await page.locator('[data-del="' + id + '"]').click();
    await page.getByRole('dialog').getByRole('button', { name: 'حذف', exact: true }).click();
    await page.waitForFunction(id => !RI.C().links.items.some(item => item.id === id), id);
    await page.locator('#saveBtn').click(); await page.waitForFunction(() => !RI.state.ui.dirty);
    await page.reload(); await page.waitForSelector('#page-title');
    assert.equal(await page.evaluate(() => RI.C().skills.some(item => item.name === 'QA Skill')), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('resumeit-demo-draft')), null);
    const otherTab = await page.context().newPage();
    await otherTab.goto(base + '/dashboard/resume/?step=skills'); await otherTab.waitForSelector('#page-title');
    assert.equal(await otherTab.locator('[data-step="skills"][role="tab"]').getAttribute('aria-selected'), 'true');
    assert.equal(await otherTab.evaluate(() => RI.C().skills.some(item => item.name === 'QA Skill')), false);
    await otherTab.close();
    const savedTitle = await page.evaluate(() => RI.C().profile.title);
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new DOMException('Quota', 'QuotaExceededError'); };
      RI.C().profile.title = 'quota failure'; RI.touch('profile');
    });
    assert.equal(await page.evaluate(() => RI.save()), false);
    assert.equal(await page.evaluate(() => RI.state.ui.dirty), true);
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; RI.revert(); });
    assert.equal(await page.evaluate(() => RI.C().profile.title), savedTitle);
    await page.evaluate(() => { RI.C().profile.title = 'unsaved'; RI.touch('profile'); });
    await page.locator('#sidebar [data-route="home"]').click();
    await page.getByRole('dialog').getByRole('button', {name:'ماندن در صفحه',exact:true}).click();
    assert.equal(new URL(page.url()).pathname, '/dashboard/links/');
    await page.locator('#sidebar [data-route="home"]').click();
    await page.getByRole('dialog').getByRole('button', {name:'دور انداختن تغییرات',exact:true}).click();
    await page.waitForURL('**/dashboard/'); await page.waitForSelector('#page-title');
    assert.notEqual(await page.evaluate(() => RI.C().profile.title), 'unsaved');
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = [];
    for (const route of ['home', 'resume', 'links', 'themes', 'publish', 'billing', 'stats', 'settings']) {
      await page.evaluate(route => RI.go(route), route);
      await page.waitForFunction(route => document.querySelector('#sidebar [data-route="' + route + '"]')?.getAttribute('aria-current') === 'page' && !!document.querySelector('#page-title'), route);
      if (!(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))) {
        overflow.push(route);
        console.log(route, await page.evaluate(() => [...document.querySelectorAll('#view *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 || el.getBoundingClientRect().left < -1).slice(0, 10).map(el => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width, text: el.textContent.slice(0, 80) }))));
      }
      if (route === 'publish' || route === 'home') await page.screenshot({ path: path.join(output, route + '-mobile.png'), fullPage: true });
    }
    await page.evaluate(() => RI.go('home')); await page.waitForURL('**/dashboard/'); await page.waitForSelector('#page-title');
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    await page.locator('#menuBtn').click();
    assert.equal(await page.locator('#sidebar').getAttribute('data-open'), 'true');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { RI.logout(); });
    await page.getByRole('dialog').getByRole('button', { name: 'خروج', exact: true }).click();
    await page.waitForURL('**/login/');
    assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('resumeit-draft-v1:')).length), 0);
    await page.goto(base + '/dashboard/'); await page.waitForURL('**/login/');
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    assert.deepEqual(overflow, [], 'Mobile overflow');
    console.log('PASS: all eight routes, login/logout, skill creation, link CRUD/order/toggle, tab draft persistence, desktop/mobile and no browser errors.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); database.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
