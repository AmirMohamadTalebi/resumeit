// The invite link: only the landing page keeps a valid ?ref code (30-day, HttpOnly cookie) and the page footer carries it.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { createServer } = require('../src/http/server.cjs');
const { testStore } = require('./auth-test-store.cjs');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const server = createServer(testStore()); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port, cookieOf = async (path, init) => (await fetch(base + path, { redirect: 'manual', ...init })).headers.getSetCookie().filter(c => c.startsWith('ri_ref='));
  try {
    const ok = await cookieOf('/?ref=abcd2345'); assert.equal(ok.length, 1);
    assert.match(ok[0], /^ri_ref=abcd2345; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000/);
    assert.equal((await cookieOf('/?utm=a&ref=abcd2345')).length, 1, 'works beside other parameters');
    for (const bad of ['/?ref=ABCD2345', '/?ref=abcd234', '/?ref=abcd23456', '/?ref=abcd234%0d', "/?ref=a'bcd234", '/?ref=', '/?ref=abcd2345&ref=zzzzzzzz'.replace('&ref=zzzzzzzz', '&x=1').replace('abcd2345', 'abcd-345')])
      assert.equal((await cookieOf(bad)).length, 0, 'ignored: ' + bad);
    assert.equal((await cookieOf('/about/?ref=abcd2345')).length, 0, 'only the landing page sets it');
    assert.equal((await cookieOf('/login/?ref=abcd2345')).length, 0);
    assert.equal((await cookieOf('/?ref=abcd2345', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).length, 0, 'GET only');
    assert.equal((await fetch(base + '/?ref=abcd2345')).status, 200, 'the page still loads');

    // The footer link of a published page carries the owner's code, and only a well-formed code.
    const context = { window: {}, Intl, URL }; vm.createContext(context);
    for (const f of ['core', 'ui', 'data', 'state', 'preview']) vm.runInContext(fs.readFileSync('dist/dashboard/js/' + f + '.js', 'utf8'), context);
    const RI = context.window.RI, c = RI.C(), foot = ref => { c._ref = ref; return RI.brandFoot(c, 'resume'); };
    assert.match(foot('abcd2345'), /href="https:\/\/resumeit\.ir\/\?ref=abcd2345"/);
    assert.match(foot(undefined), /href="https:\/\/resumeit\.ir\/"/);
    for (const evil of ['"><script>', 'abcd2345"x', 'ABCD2345', 'abc', 'abcd2345 ']) assert.match(foot(evil), /href="https:\/\/resumeit\.ir\/"/, 'rejected: ' + evil);
    c._ref = 'abcd2345'; c.branding = { resume: { mode: 'hidden' } }; assert.equal(RI.brandFoot(c, 'resume'), '', 'hidden brand has no link');
    c.branding = { resume: { mode: 'custom', text: 'نوشتهٔ خودم' } }; assert(!RI.brandFoot(c, 'resume').includes('ref='), 'custom text has no link');
    console.log('PASS invite link: 30-day HttpOnly cookie only from the landing page, only for a well-formed code on GET; footer link carries the owner code, rejects odd codes, and hidden/custom brands show none.');
  } finally { await new Promise(r => server.close(r)); }
})().catch(error => { console.error(error); process.exit(1); });
