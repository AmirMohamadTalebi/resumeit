const assert = require('node:assert/strict');
const templates = require('../src/notifications/email-templates.cjs');
const marketing = require('../src/notifications/marketing.cjs');
// Every email is one themed layout; user-supplied text is escaped; the unsubscribe link only works for its own account.
delete process.env.PUBLIC_ORIGIN;
for (const [key, t] of Object.entries(templates.templates)) {
  const mail = templates.render(key, t.sample);
  assert(mail.subject && mail.text && mail.html.startsWith('<!doctype html>'), key);
  assert(mail.html.includes('dir="rtl"') && mail.html.includes('#f0bd52') && !/<script/i.test(mail.html), key + ' keeps the site look and carries no script');
}
const evil = templates.render('promo', { title: '<img src=x onerror=alert(1)>', body: '"><script>alert(1)</script>', cta: '<b>x</b>', url: 'javascript:alert(1)' });
assert(!/<img src=x|<script|<b>x/.test(evil.html), 'text is escaped');
assert(!/href="javascript:/.test(evil.html), 'a script link never becomes a button');
assert.match(templates.render('login-code', { code: '123456' }).html, /123456/);
const calls = []; const db = { saveMarketingConsent: async (...a) => calls.push(a) };
const m = marketing(db, { available: { email: true } }, { SMTP_PASSWORD: 'x'.repeat(16) });
const id = '11111111-1111-1111-1111-111111111111', url = new URL(m.link(id));
assert(m.valid(id, url.searchParams.get('t')) && !m.valid('22222222-2222-2222-2222-222222222222', url.searchParams.get('t')) && !m.valid(id, 'bad'));
(async () => {
  const res = { setHeader() {}, writeHead(status) { this.status = status; }, end() {} };
  assert.equal(await m.handlePublic({ method: 'GET', url: url.pathname + url.search }, res, url.pathname), true);
  assert.equal(res.status, 200); assert.deepEqual(calls, [[id, false, 'link']]);
  const bad = { setHeader() {}, writeHead(status) { this.status = status; }, end() {} };
  await m.handlePublic({ method: 'GET', url: '/mail/unsubscribe?u=' + id + '&t=nope' }, bad, '/mail/unsubscribe');
  assert.equal(bad.status, 400); assert.equal(calls.length, 1, 'a wrong token changes nothing');
  console.log('PASS email templates: one themed layout for every kind, escaped text, safe links, signed one-click unsubscribe.');
})().catch(e => { console.error(e); process.exitCode = 1; });
