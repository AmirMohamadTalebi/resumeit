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
      try { const user = await account(req); reply(200, { user: user || null }); } catch { reply(503, { error: 'ارتباط با دیتابیس برقرار نشد.' }); } return true;
    }
    if (req.method !== 'POST') { reply(405, { error: 'Method not allowed' }); return true; }
    if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json') { reply(403, { error: 'درخواست معتبر نیست.' }); return true; }
    if (pathname === '/api/auth/logout') {
      try { await database.deleteSession(token(req)); cookie('', 0); reply(200, { ok: true }); } catch { reply(503, { error: 'خروج انجام نشد.' }); } return true;
    }
    if (pathname !== '/api/auth/login') { reply(404, { error: 'Not found' }); return true; }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 2048) { reply(413, { error: 'درخواست بیش از حد بزرگ است.' }); return true; } chunks.push(chunk); }
      const { phone, password } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone) || typeof password !== 'string' || password.length < 8 || password.length > 128) { reply(400, { error: 'شماره و رمز معتبر وارد کن.' }); return true; }
      const now = Date.now();
      if (pending >= 4) {
        res.setHeader('Retry-After', '900'); reply(429, { error: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن.' }); return true;
      }
      pending++;
      try {
      if (!await database.claimLoginAttempts(phone, digest(req.socket.remoteAddress || 'unknown'))) {
        res.setHeader('Retry-After', '900'); reply(429, { error: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن.' }); return true;
      }
      const user = await database.accountByPhone(phone);
      const valid = await verifyPassword(password, user?.password_hash);
      if (!valid) { reply(401, { error: 'شماره یا رمز عبور درست نیست.' }); return true; }
      await database.clearLoginAttempts(phone);
      await database.deleteSession(token(req));
      const value = randomBytes(32).toString('hex');
      await database.createSession(digest(value), user.id, now + 7 * 86400000);
      cookie(value, 7 * 86400); reply(200, { ok: true });
      } finally { pending--; }
    } catch (error) {
      reply(error instanceof SyntaxError ? 400 : 500, { error: 'ورود انجام نشد؛ دوباره امتحان کن.' });
    }
    return true;
  } };
}
module.exports = { hashPassword, verifyPassword, authHandler, digest };
