const assert = require('node:assert/strict');
const http = require('node:http');
const vm = require('node:vm');
const fs = require('node:fs');
const { createServer } = require('../src/http/server.cjs');
const { testStore } = require('./auth-test-store.cjs');
const { verifyPassword } = require('../src/auth/auth.cjs');
const { publicOrigin } = require('../src/http/security.cjs');

(async () => {
  delete process.env.PUBLIC_ORIGIN;
  assert.throws(() => publicOrigin({ headers: { host: 'evil.example' } }));
  process.env.PUBLIC_ORIGIN = 'https://example.com/path';
  assert.throws(() => publicOrigin({ headers: {} }));
  delete process.env.PUBLIC_ORIGIN;
  assert.equal(await verifyPassword('Password123!', 'broken'), false);
  assert.equal(await verifyPassword(null, null), false);
  const db = testStore(), server = createServer(db, { send: async () => { throw new Error('Unexpected SMS'); } });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port, base = 'http://127.0.0.1:' + port;
  const raw = (path, headers = {}) => new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path, headers }, res => { res.resume(); res.on('end', () => resolve(res)); }); req.on('error', reject);
  });
  const post = (route, body) => fetch(base + '/api/auth/' + route, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body });
  try {
    for (const route of ['//dashboard/', '/dashboard/../dashboard/', '/dashboard./', '/%2e/dashboard/', '/dashboard%2findex.html', '/.env', '/dashboard/index.html:secret']) assert.equal((await raw(route)).statusCode, 400, route);
    for (const route of ['/dashboard/', '/%64ashboard/', '/DASHBOARD/index.html']) assert.equal((await raw(route)).statusCode, 303, route);
    assert.equal((await raw('/login', { Host: 'evil.example' })).statusCode, 400);
    for (const input of ['null', '[]', '1', '"value"', '{']) assert.equal((await post('login', input)).status, 400, input);
    assert.equal((await post('login', JSON.stringify({ x: 'a'.repeat(2049) }))).status, 413);
    const landing = await fetch(base), policy = landing.headers.get('content-security-policy');
    assert.match(policy, /frame-ancestors 'none'/); assert.match(policy, /base-uri 'none'/);
    assert(!/script-src[^;]*unsafe-inline|unsafe-eval/.test(policy));
    assert.equal(landing.headers.get('x-frame-options'), 'DENY');
    assert.equal((await fetch(base + '/demo/')).headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal((await fetch(base + '/api/auth/providers')).headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await post('otp/request', JSON.stringify({ phone: '09120000888', purpose: 'reset' }))).status, 200);
    const faulty = createServer({ session: async () => { throw new Error('Private database details'); } });
    await new Promise(r => faulty.listen(0, '127.0.0.1', r));
    try { const response = await fetch('http://127.0.0.1:' + faulty.address().port + '/dashboard/', { headers: { Cookie: 'ri_session=' + 'a'.repeat(64) } }); assert.equal(response.status, 503); assert(!(await response.text()).includes('Private')); }
    finally { await new Promise(r => faulty.close(r)); }
    const context = { window: {}, Intl, URL }; vm.createContext(context);
    vm.runInContext(fs.readFileSync('dist/dashboard/js/core.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('dist/dashboard/js/ui.js', 'utf8'), context);
    const RI = context.window.RI;
    assert.equal(RI.isUrl('javascript:alert(1)'), false);
    assert.equal(RI.isUrl('https://user:pass@example.com'), false);
    assert.equal(RI.isUrl('example.com'), true);
    assert.equal(RI.bg("https://example.com/a');color:red;/*"), '');
    assert.equal(RI.bg('grad:red,blue);color:red'), '');
    assert.equal(RI.bg('data:image/svg+xml,<svg onload=alert(1)>'), '');
    assert.match(RI.bg('grad:#cfe0e8,#97b5c5'), /linear-gradient/);
    vm.runInContext(fs.readFileSync('dist/dashboard/js/data.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('dist/dashboard/js/state.js', 'utf8'), context);
    const original = RI.state.content;
    context.sessionStorage = { getItem: () => JSON.stringify({content:{profile:{name:1}},pub:{}}) };
    RI.toast = () => {};
    RI.restoreDraft('test-owner'); assert.equal(RI.state.content, original);
    const sqlCalls = [];
    const sqlOtp = require('../src/database/otp.cjs')({transaction: async action => action({execute: async (sql, params) => {
      sqlCalls.push([sql, params]);
      if (sql.includes('otp_challenges')) return [[{owner_id:'original-owner',phone:'09120000888',expires_at:Date.now()+60000}]];
      return [[]];
    }})});
    assert.equal(await sqlOtp.resetPasswordVerified('proof','hash',Date.now()), null);
    assert(sqlCalls.some(([sql,params]) => sql.includes('id=? AND phone=? FOR UPDATE') && params[0] === 'original-owner'));
    const sqlSession = require('../src/database/sessions.cjs')({execute:async()=>[],transaction:async action=>action({execute:async()=>[[{password_hash:'hash',phone:'09120000889'}]]})});
    assert.equal(await sqlSession.createSession('token','owner',Date.now()+60000,'hash','09120000888'),false);
    const corrupted = JSON.parse(JSON.stringify(original)); corrupted.skills[0].id = '\"><script>';
    context.sessionStorage.getItem = () => JSON.stringify({content:corrupted,pub:RI.state.pub});
    RI.restoreDraft('test-owner'); assert.equal(RI.state.content, original);
    console.log('PASS: path aliases, auth guards, host/origin validation, malformed/oversized JSON, fail-closed errors, CSP and URL/image injection.');
  } finally { await new Promise(r => server.close(r)); db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
