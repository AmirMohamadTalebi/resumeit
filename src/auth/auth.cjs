const {publicOrigin,readJson}=require('../http/security.cjs');
const {randomBytes,createHash}=require('node:crypto');
const {hashPassword,verifyPassword}=require('./password.cjs');
const digest = value => createHash('sha256').update(value).digest('hex');
function authHandler(database, options = {}) {
  const otp = require('./otp.cjs').createOtpService({ database, ...options });
  const oauth = require('./oauth.cjs').oauthHandler(database,options);
  let pending = 0;
  const token = req => {
    const value = /(?:^|;\s*)ri_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return value ? digest(value) : '';
  };
  const account = req => token(req) ? database.session(token(req)) : null;
  return { account, async handle(req, res, pathname) {
    if (!pathname.startsWith('/api/auth/')) return false;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');
    if(await oauth(req,res,pathname))return true;
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
    const origin = publicOrigin(req);
    const cookie = (value, age) => res.setHeader('Set-Cookie', `ri_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`);
    if (pathname === '/api/auth/session' && req.method === 'GET') {
      try { const user = await account(req); reply(200, { user: user || null }); } catch { reply(503, { error: 'ارتباط با دیتابیس برقرار نشد' }); } return true;
    }
    if(pathname==='/api/auth/publication-check'&&req.method==='GET') {
      try{const user=await account(req);if(!user){reply(401,{error:'اول وارد حسابت شو'});return true;}const missing=[!user.first_name&&'نام',!user.last_name&&'نام خانوادگی',!(user.phone&&user.phone_verified)&&'شماره تأییدشده'].filter(Boolean);reply(200,{canPublish:!missing.length,missing});}catch{reply(503,{error:'نتونستیم مشخصات حسابت رو بررسی کنیم'});}return true;
    }
    if (req.method !== 'POST') { reply(405, { error: 'Method not allowed' }); return true; }
    if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json') { reply(403, { error: 'درخواست معتبر نیست' }); return true; }
    if (pathname === '/api/auth/logout') {
      try { await database.deleteSession(token(req)); cookie('', 0); reply(200, { ok: true }); } catch { reply(503, { error: 'خروج انجام نشد' }); } return true;
    }
    if(['/api/auth/account/names','/api/auth/social/unlink','/api/auth/phone/request','/api/auth/phone/verify'].includes(pathname)) {
      try {
        const user=await account(req);if(!user){reply(401,{error:'اول وارد حسابت شو'});return true;}
        if(req.headers['x-resumeit-owner']&&req.headers['x-resumeit-owner']!==user.id){reply(409,{error:'حساب فعال عوض شده است؛ صفحه را دوباره باز کن'});return true;}
        const input=await readJson(req);
        if(pathname.endsWith('/names')) {
          const {firstName,lastName}=input;
          if([firstName,lastName].some(s=>typeof s!=='string'||!s.trim()||!/[\p{L}]/u.test(s)||s.trim().length>39||/[\x00-\x1f\x7f]/.test(s))){reply(400,{error:'نام و نام خانوادگی رو کامل بنویس، هرکدوم تا ۳۹ کاراکتر'});return true;}
          await database.setAccountNames(user.id,firstName.trim(),lastName.trim());reply(200,{ok:true});
        } else if(pathname.endsWith('/unlink')) {
          if(!['google','github'].includes(input.provider)){reply(400,{error:'روش ورود معتبر نیست'});return true;}
          if(!await database.unlinkSocial(user.id,input.provider))reply(409,{error:'اول یه روش ورود دیگه اضافه کن تا از حسابت بیرون نمونی'});else reply(200,{ok:true});
        } else if(pathname.endsWith('/request')) {
          if(typeof input.phone!=='string'||!/^09\d{9}$/.test(input.phone)){reply(400,{error:'شماره موبایلت رو درست بنویس'});return true;}
          const existing=await database.accountByPhone(input.phone);
          if(existing&&existing.id!==user.id){reply(200,{challengeId:require('node:crypto').randomUUID(),expiresIn:120,retryAfter:60});return true;}
          const result=await otp.request(input.phone,'phone',digest(req.socket.remoteAddress||'unknown'),user.id);
          if(!result)reply(429,{error:'یه دقیقه صبر کن و دوباره امتحان کن'});else reply(200,result);
        } else {
          if(typeof input.challengeId!=='string'||!/^[a-f0-9-]{36}$/.test(input.challengeId)||typeof input.code!=='string'||!/^\d{6}$/.test(input.code)){reply(400,{error:'کد ۶ رقمی رو درست بنویس'});return true;}
          const result=await database.verifyPhoneOtp(input.challengeId,digest(input.challengeId+input.code),user.id,Date.now(),token(req));
          if(!result)reply(401,{error:'کد درست نیست یا اعتبارش تموم شده'});else if(result.existing)reply(409,{error:'این شماره روی یه حساب دیگه ثبت شده'});else reply(200,{ok:true});
        }
      } catch(error){reply(error.status || (error instanceof SyntaxError ? 400 : 503),{error:'درخواست انجام نشد، دوباره امتحان کن'});}return true;
    }
    const signIn = async user => {
      await database.deleteSession(token(req));
      const value = randomBytes(32).toString('hex');
      if(!await database.createSession(digest(value),user.id,Date.now()+7*86400000,user.password_hash,user.phone)) { reply(401,{error:'مشخصات حساب تغییر کرده؛ دوباره وارد شو'}); return; }
      cookie(value,7*86400); reply(200,{ok:true});
    };
    if (['/api/auth/otp/request','/api/auth/otp/verify','/api/auth/register','/api/auth/password/reset'].includes(pathname)) {
      try {
        const input=await readJson(req);
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
          let ownerId=null;
          if(input.purpose==='register' && await database.accountByPhone(input.phone)) {
            reply(409,{error:'این شماره حساب دارد؛ وارد شو یا رمزت را بازیابی کن'}); return true;
          }
          if(input.purpose!=='register') {
            if(!await database.claimLoginAttempts(input.phone,digest(req.socket.remoteAddress||'unknown'))) { reply(429,{error:'تلاش‌های زیادی انجام شده؛ کمی بعد دوباره امتحان کن'}); return true; }
            const owner=await database.accountByPhone(input.phone);
            if(!owner) { reply(200,{challengeId:require('node:crypto').randomUUID(),expiresIn:120,retryAfter:60}); return true; }
            ownerId=owner.id;
          }
          const result=await otp.request(input.phone,input.purpose,digest(req.socket.remoteAddress||'unknown'),ownerId);
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
            if (!user || user.id!==result.ownerId) reply(401,{error:'مشخصات حساب تغییر کرده؛ دوباره کد بگیر'});
            else {await database.markPhoneVerified(user.id);await signIn(user);}
          }
        }
      } catch(error) { reply(error.status || (error instanceof SyntaxError?400:503),{error:'درخواست انجام نشد شماره را بررسی کن و کمی بعد دوباره امتحان کن'}); }
      return true;
    }
    if (pathname !== '/api/auth/login') { reply(404, { error: 'Not found' }); return true; }
    try {
      const { phone, password } = await readJson(req);
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
      reply(error.status || (error instanceof SyntaxError ? 400 : 503), { error: 'ورود انجام نشد؛ دوباره امتحان کن' });
    }
    return true;
  } };
}
module.exports = { hashPassword, verifyPassword, authHandler, digest };

