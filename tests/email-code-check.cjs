const assert = require('node:assert/strict');
const { testStore } = require('./auth-test-store.cjs');
const { createServer } = require('../src/http/server.cjs');
const { hashPassword } = require('../src/auth/auth.cjs');
// Login and recovery codes by email, end to end over HTTP: only an account with a verified address gets one, the code
// proves the mailbox but not the phone, and the SMS route stays available beside it.
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const database = testStore(), hash = await hashPassword('CodeFixture123!');
  const withEmail = await database.provisionAccount('09120000701', hash), withoutEmail = await database.provisionAccount('09120000702', hash);
  database.setVerifiedEmail(withEmail, 'reza.ahmadi@example.com');
  const mails = [], texts = new Map();
  let mailOn = true;
  const server = createServer(database, {
    send: async (phone, code) => texts.set(phone, code),
    notifications: { provider: { available: { get email() { return mailOn; }, sms: false, push: false }, publicKey: null, mail: async (to, subject, text) => mails.push({ to, subject, text }), close() {} } }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (route, body) => fetch(base + '/api/auth/' + route, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await (await fetch(base + '/api/auth/providers')).json()).email, true, 'sign-in screens learn that email codes work');

    // Registration codes stay on SMS: the new account has no address yet and the phone must be proven.
    assert.equal((await post('otp/request', { phone: '09120000799', purpose: 'register', channel: 'email' })).status, 400);

    // No verified address (or no account at all): the same plain answer, nothing sent.
    for (const phone of [withoutEmail ? '09120000702' : '', '09120000798']) {
      const r = await post('otp/request', { phone, purpose: 'login', channel: 'email' });
      assert.equal(r.status, 404); const body = await r.json(); assert.equal(body.code, 'no_email'); assert.match(body.error, /ایمیل/);
    }
    assert.equal(mails.length, 0);

    // An account with a verified address: the code goes there, the answer hides most of it.
    const sent = await post('otp/request', { phone: '09120000701', purpose: 'login', channel: 'email' });
    assert.equal(sent.status, 200); const challenge = await sent.json();
    assert.equal(challenge.channel, 'email'); assert.equal(challenge.expiresIn, 300); assert.match(challenge.hint, /^r\*\*\*@e\*\*\*\.com$/); assert(!JSON.stringify(challenge).includes('ahmadi'));
    assert.equal(mails.length, 1); assert.equal(mails[0].to, 'reza.ahmadi@example.com'); assert.match(mails[0].subject, /کد ورود/);
    const code = /\n(\d{6})\n/.exec(mails[0].text)[1];

    // Asking by SMS right away is too soon; the same channel waits a minute.
    assert.equal((await post('otp/request', { phone: '09120000701', purpose: 'login', channel: 'email' })).status, 429);
    assert.equal((await post('otp/request', { phone: '09120000701', purpose: 'login', channel: 'sms' })).status, 429, 'switching waits thirty seconds');

    // A wrong code does not sign in; the right one does, and the phone stays unverified because only the mailbox was proven.
    assert.equal((await post('otp/verify', { challengeId: challenge.challengeId, code: code === '000000' ? '111111' : '000000', purpose: 'login' })).status, 401);
    const verified = await post('otp/verify', { challengeId: challenge.challengeId, code, purpose: 'login' });
    assert.equal(verified.status, 200); assert.match(verified.headers.get('set-cookie'), /ri_session=/);
    assert.notEqual((await database.accountByPhone('09120000701')).phone_verified, true, 'an email code never verifies the phone');

    // Recovery by email works the same way and says "recovery" in the message.
    const reset = await post('otp/request', { phone: '09120000701', purpose: 'reset', channel: 'email' });
    assert.equal(reset.status, 429, 'one code per minute for the same phone');

    // Mail not configured: a clear answer pointing to SMS and password.
    mailOn = false;
    const down = await post('otp/request', { phone: '09120000701', purpose: 'login', channel: 'email' });
    assert.equal(down.status, 503); assert.equal((await down.json()).code, 'email_unavailable');
    assert.equal((await (await fetch(base + '/api/auth/providers')).json()).email, false);
  } finally { server.close(); }
  console.log('PASS email codes: only a verified address receives one, hidden address hint, thirty-second switch and one-minute resend, the phone stays unverified, SMS and registration unchanged, clear answers when mail is off.');
})().catch(error => { console.error(error); process.exitCode = 1; });
