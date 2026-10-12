const assert = require('node:assert/strict');
const { testStore } = require('./auth-test-store.cjs');
const { createServer } = require('../server.cjs');
const { hashPassword, verifyPassword, digest } = require('../src/auth/auth.cjs');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const password = 'AuthFixture123!';
  const hash = await hashPassword(password);
  assert(await verifyPassword(password, hash));
  assert.equal(await verifyPassword('wrong123', hash), false);
  const database = testStore();
  const userId = await database.provisionAccount('09120000001', hash);
  const server = createServer(database);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const login = (password, origin = base) => fetch(base + '/api/auth/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '09120000001', password }) });
  try {
    assert.equal((await fetch(base + '/dashboard/', { redirect: 'manual' })).status, 303);
    assert.equal((await fetch(base + '/%64ashboard/', { redirect: 'manual' })).status, 303);
    assert.equal((await login(password, 'https://evil.example')).status, 403);
    assert.equal((await login('wrong123')).status, 401);
    const response = await login(password); assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie'); assert.match(cookie, /HttpOnly; SameSite=Lax/);
    const headers = { Cookie: cookie.split(';')[0] };
    assert.equal((await fetch(base + '/dashboard/', { headers })).status, 200);
    const session = await (await fetch(base + '/api/auth/session', { headers })).json();
    assert.deepEqual(session.user, { id: userId, phone: '09120000001',phone_verified:false,first_name:'',last_name:'',google:false,github:false });
    const secondServer = createServer(database);
    await new Promise(resolve => secondServer.listen(0, '127.0.0.1', resolve));
    const secondBase = 'http://127.0.0.1:' + secondServer.address().port;
    try {
      assert.equal((await fetch(secondBase + '/api/auth/logout', { method: 'POST', headers: { ...headers, Origin: secondBase, 'Content-Type': 'application/json' }, body: '{}' })).status, 200);
      assert.equal((await fetch(secondBase + '/dashboard/', { headers, redirect: 'manual' })).status, 303);
      await database.createSession('expired', userId, Date.now() - 1); assert.equal(await database.session('expired'), undefined);
      for (let i = 0; i < 5; i++) assert.equal((await fetch(secondBase + '/api/auth/login', { method: 'POST', headers: { Origin: secondBase, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '09120000001', password: 'wrong123' }) })).status, 401);
      assert.equal((await fetch(secondBase + '/api/auth/login', { method: 'POST', headers: { Origin: secondBase, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '09120000001', password }) })).status, 429);
    } finally { await new Promise(resolve => secondServer.close(resolve)); }
    console.log('PASS: password hashing, protected dashboard, origin checks, expiry, logout and attempt limits.');
  } finally { await new Promise(resolve => server.close(resolve)); database.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
