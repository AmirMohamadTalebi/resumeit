const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openDatabase } = require('./database.cjs');
const { createServer } = require('./server.cjs');
const { hashPassword, verifyPassword, digest } = require('./auth.cjs');
(async () => {
  delete process.env.PUBLIC_ORIGIN;
  const filename = path.join(mkdtempSync(path.join(tmpdir(), 'resumeit-auth-')), 'check.sqlite');
  const old = new DatabaseSync(filename);
  old.exec(`CREATE TABLE users(id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, created_at TEXT DEFAULT CURRENT_TIMESTAMP) STRICT;
    CREATE TABLE profiles(user_id TEXT PRIMARY KEY REFERENCES users(id), name TEXT DEFAULT '', role TEXT DEFAULT '', bio TEXT DEFAULT '', updated_at TEXT DEFAULT CURRENT_TIMESTAMP) STRICT;
    CREATE TABLE links(user_id TEXT, position INTEGER, name TEXT, url TEXT, PRIMARY KEY(user_id,position)) STRICT;
    INSERT INTO users(id,phone) VALUES ('old','09120000002'); PRAGMA user_version=1;`);
  old.close();
  const password = 'AuthFixture123!';
  const hash = await hashPassword(password);
  assert(await verifyPassword(password, hash));
  assert.equal(await verifyPassword('wrong123', hash), false);
  let database = openDatabase(filename);
  assert.equal(database.accountByPhone('09120000002').id, 'old', 'v1 migration preserves users');
  const userId = database.provisionAccount('09120000001', hash);
  database.provisionAccount('09120000001', await hashPassword('Different123!'));
  assert.equal(database.accountByPhone('09120000001').password_hash, hash, 'bootstrap never resets a password');
  database.close(); database = openDatabase(filename);
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
    assert.deepEqual(session.user, { id: userId, phone: '09120000001' });
    database.close(); database = openDatabase(filename);
    assert(database.session(digest(cookie.match(/ri_session=([a-f0-9]+)/)[1])), 'session survives database reopen');
    // The server holds the original database object; reopen is tested separately.
    const secondServer = createServer(database);
    await new Promise(resolve => secondServer.listen(0, '127.0.0.1', resolve));
    const secondBase = 'http://127.0.0.1:' + secondServer.address().port;
    try {
      assert.equal((await fetch(secondBase + '/api/auth/logout', { method: 'POST', headers: { ...headers, Origin: secondBase, 'Content-Type': 'application/json' }, body: '{}' })).status, 200);
      assert.equal((await fetch(secondBase + '/dashboard/', { headers, redirect: 'manual' })).status, 303);
      database.createSession('expired', userId, Date.now() - 1); assert.equal(database.session('expired'), undefined);
      for (let i = 0; i < 5; i++) assert.equal((await fetch(secondBase + '/api/auth/login', { method: 'POST', headers: { Origin: secondBase, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '09120000001', password: 'wrong123' }) })).status, 401);
      assert.equal((await fetch(secondBase + '/api/auth/login', { method: 'POST', headers: { Origin: secondBase, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '09120000001', password }) })).status, 429);
    } finally { await new Promise(resolve => secondServer.close(resolve)); }
    assert.equal(readFileSync(filename).includes(Buffer.from(password)), false);
    console.log('PASS: migration, password hashing, persistent sessions, protected dashboard, origin checks, expiry, logout and attempt limits.');
  } finally { await new Promise(resolve => server.close(resolve)); database.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
