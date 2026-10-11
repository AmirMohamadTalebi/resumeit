const { scrypt, randomBytes, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const digest = value => createHash('sha256').update(value).digest('hex');
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('Password must contain 8–128 characters');
  const salt = randomBytes(16).toString('hex');
  return 'scrypt$' + salt + '$' + (await derive(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 })).toString('hex');
}
async function verifyPassword(password, stored) {
  const [, salt, hash] = (stored || 'scrypt$' + '0'.repeat(32) + '$' + '0'.repeat(128)).split('$');
  const actual = await derive(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(actual, Buffer.from(hash, 'hex')) && !!stored;
}
function authHandler(database) {
  const attempts = new Map();
  let pending = 0;
  const token = req => {
    const value = /(?:^|;\s*)ri_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return value ? digest(value) : '';
  };
  const account = req => database?.session(token(req));
  return { account, async handle(req, res, pathname) {
    if (!pathname.startsWith('/api/auth/')) return false;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
    const origin = process.env.PUBLIC_ORIGIN || (local ? 'http://' : 'https://') + req.headers.host;
    const cookie = (value, age) => res.setHeader('Set-Cookie', `ri_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`);
    if (pathname === '/api/auth/session' && req.method === 'GET') {
      const user = account(req); reply(200, { user: user || null }); return true;
    }
    if (req.method !== 'POST') { reply(405, { error: 'Method not allowed' }); return true; }
    if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json') { reply(403, { error: 'درخواست معتبر نیست.' }); return true; }
    if (pathname === '/api/auth/logout') {
      database.deleteSession(token(req)); cookie('', 0); reply(200, { ok: true }); return true;
    }
    if (pathname !== '/api/auth/login') { reply(404, { error: 'Not found' }); return true; }
    try {
      let body = '', size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 2048) { reply(413, { error: 'درخواست بیش از حد بزرگ است.' }); return true; } body += chunk; }
      const { phone, password } = JSON.parse(body);
      if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone) || typeof password !== 'string' || password.length < 8 || password.length > 128) { reply(400, { error: 'شماره و رمز معتبر وارد کن.' }); return true; }
      const now = Date.now();
      for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
      const keys = ['phone:' + phone, 'ip:' + req.socket.remoteAddress];
      if (pending >= 8 || attempts.size >= 10000 || keys.some(key => (attempts.get(key)?.count || 0) >= (key.startsWith('phone:') ? 5 : 100))) {
        res.setHeader('Retry-After', '900'); reply(429, { error: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن.' }); return true;
      }
      keys.forEach(key => { const value = attempts.get(key) || { count: 0, until: now + 900000 }; value.count++; attempts.set(key, value); });
      const user = database.accountByPhone(phone);
      pending++;
      let valid;
      try { valid = await verifyPassword(password, user?.password_hash); } finally { pending--; }
      if (!valid) { reply(401, { error: 'شماره یا رمز عبور درست نیست.' }); return true; }
      attempts.delete(keys[0]);
      database.deleteSession(token(req));
      const value = randomBytes(32).toString('hex');
      database.createSession(digest(value), user.id, now + 7 * 86400000);
      cookie(value, 7 * 86400); reply(200, { ok: true });
    } catch (error) {
      reply(error instanceof SyntaxError ? 400 : 500, { error: 'ورود انجام نشد؛ دوباره امتحان کن.' });
    }
    return true;
  } };
}
module.exports = { hashPassword, verifyPassword, authHandler, digest };
