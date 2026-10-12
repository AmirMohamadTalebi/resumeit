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
function authHandler(database, options = {}) {
  const otp = require('./otp.cjs').createOtpService({ database, ...options });
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
      try { const user = await account(req); reply(200, { user: user || null }); } catch { reply(503, { error: 'ارتباط با دیتابیس برقرار نشد' }); } return true;
    }
    if (req.method !== 'POST') { reply(405, { error: 'Method not allowed' }); return true; }
    if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json') { reply(403, { error: 'درخواست معتبر نیست' }); return true; }
    if (pathname === '/api/auth/logout') {
      try { await database.deleteSession(token(req)); cookie('', 0); reply(200, { ok: true }); } catch { reply(503, { error: 'خروج انجام نشد' }); } return true;
    }
    const signIn = async user => {
      await database.deleteSession(token(req));
      const value = randomBytes(32).toString('hex');
      if(!await database.createSession(digest(value),user.id,Date.now()+7*86400000,user.password_hash)) { reply(401,{error:'رمز حساب تغییر کرده؛ دوباره وارد شو'}); return; }
      cookie(value,7*86400); reply(200,{ok:true});
    };
    if (['/api/auth/otp/request','/api/auth/otp/verify','/api/auth/register','/api/auth/password/reset'].includes(pathname)) {
      try {
        const chunks=[]; let size=0;
        for await (const chunk of req) { size+=chunk.length; if(size>2048) { reply(413,{error:'درخواست بیش از حد بزرگ است'}); return true; } chunks.push(chunk); }
        const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (pathname==='/api/auth/register'||pathname==='/api/auth/password/reset') {
          const reset=pathname==='/api/auth/password/reset',grant=reset?input.resetToken:input.registrationToken;
          if (typeof grant!=='string'||!/^[a-f0-9]{64}$/.test(grant) || typeof input.password!=='string' || input.password.length<8 || input.password.length>128) { reply(400,{error:'رمزت باید بین ۸ تا ۱۲۸ کاراکتر باشه'}); return true; }
          if (!await database.registrationValid(digest(grant),Date.now(),reset?'reset':'register')) { reply(401,{error:'تأیید شماره منقضی شده؛ دوباره کد بگیر'}); return true; }
          if (pending>=1) { reply(429,{error:'چند لحظه بعد دوباره امتحان کن'}); return true; }
          pending++;
          try {
            const hash=await hashPassword(input.password);
            const user=await (reset?database.resetPasswordVerified(digest(grant),hash,Date.now()):database.registerVerified(digest(grant),hash,Date.now()));
            if (!user) reply(401,{error:'تأیید شماره منقضی شده؛ دوباره کد بگیر'});
            else if(user.existing) reply(409,{error:'این شماره حساب دارد؛ از صفحهٔ ورود استفاده کن'});
            else await signIn(user);
          } finally { pending--; }
          return true;
        }
        if (!['login','register','reset'].includes(input.purpose)) { reply(400,{error:'درخواست معتبر نیست'}); return true; }
        if (pathname.endsWith('/request')) {
          if (typeof input.phone!=='string'||!/^09\d{9}$/.test(input.phone)) { reply(400,{error:'شمارهٔ موبایل معتبر وارد کن'}); return true; }
          if(input.purpose!=='register') {
            if(!await database.claimLoginAttempts(input.phone,digest(req.socket.remoteAddress||'unknown'))) { reply(429,{error:'تلاش‌های زیادی انجام شده؛ کمی بعد دوباره امتحان کن'}); return true; }
            if(!await database.accountByPhone(input.phone)) { reply(404,{code:'ACCOUNT_NOT_FOUND',error:'این شماره هنوز حساب ندارد؛ ثبت‌نام کن'}); return true; }
          }
          const result=await otp.request(input.phone,input.purpose,digest(req.socket.remoteAddress||'unknown'));
          if (!result) { res.setHeader('Retry-After','60'); reply(429,{error:'محدودیت ارسال کد؛ یک دقیقه صبر کن اگر سهمیهٔ روزانه تمام شده، فردا امتحان کن'}); }
          else reply(200,result);
        } else {
          if (typeof input.challengeId!=='string'||!/^[a-f0-9-]{36}$/.test(input.challengeId)||typeof input.code!=='string'||!/^\d{6}$/.test(input.code)) { reply(400,{error:'کد شش‌رقمی معتبر وارد کن'}); return true; }
          const result=await otp.verify(input.challengeId,input.code,input.purpose);
          if (!result) reply(401,{error:'این کد درست نیست یا اعتبارش تموم شده، تا پنج بار می‌تونی امتحان کنی'});
          else if(input.purpose==='register') reply(200,{registrationToken:result.registrationToken});
          else if(input.purpose==='reset') {
            if(!await database.accountByPhone(result.phone)) reply(404,{error:'این شماره هنوز حساب ندارد؛ ثبت‌نام کن'});
            else reply(200,{resetToken:result.resetToken});
          }
          else {
            const user=await database.accountByPhone(result.phone);
            if (!user) reply(404,{error:'این شماره هنوز حساب ندارد؛ ثبت‌نام کن'});
            else await signIn(user);
          }
        }
      } catch(error) { reply(error instanceof SyntaxError?400:503,{error:'درخواست انجام نشد شماره را بررسی کن و کمی بعد دوباره امتحان کن'}); }
      return true;
    }
    if (pathname !== '/api/auth/login') { reply(404, { error: 'Not found' }); return true; }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 2048) { reply(413, { error: 'درخواست بیش از حد بزرگ است' }); return true; } chunks.push(chunk); }
      const { phone, password } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone) || typeof password !== 'string' || password.length < 8 || password.length > 128) { reply(400, { error: 'شماره و رمز معتبر وارد کن' }); return true; }
      if (pending >= 1) {
        res.setHeader('Retry-After', '900'); reply(429, { error: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن' }); return true;
      }
      pending++;
      try {
      if (!await database.claimLoginAttempts(phone, digest(req.socket.remoteAddress || 'unknown'))) {
        res.setHeader('Retry-After', '900'); reply(429, { error: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن' }); return true;
      }
      const user = await database.accountByPhone(phone);
      const valid = await verifyPassword(password, user?.password_hash);
      if (!valid) { reply(401, { error: 'شماره یا رمزت درست نیست' }); return true; }
      await database.clearLoginAttempts(phone);
      await signIn(user);
      } finally { pending--; }
    } catch (error) {
      reply(error instanceof SyntaxError ? 400 : 500, { error: 'ورود انجام نشد؛ دوباره امتحان کن' });
    }
    return true;
  } };
}
module.exports = { hashPassword, verifyPassword, authHandler, digest };
