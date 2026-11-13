const {publicOrigin,readJson}=require('../http/security.cjs');
const {randomBytes,createHash}=require('node:crypto');
const {hashPassword,verifyPassword}=require('./password.cjs');
const {clientIp}=require('../http/client-ip.cjs');
const digest = value => createHash('sha256').update(value).digest('hex');
function authHandler(database, options = {}) {
  const otp = require('./otp.cjs').createOtpService({ database, ...options });
  const mailAvailable = () => !!(options.sendMail || options.mailer?.available?.email);
  const oauth = require('./oauth.cjs').oauthHandler(database,options);
  const status=require('./account-status.cjs'),statusHandler=status.handler(database);
  // scrypt is CPU-bound: a small shared pool keeps the event loop responsive without making every login wait behind one.
  let pending = 0;
  const scryptSlots = 4, ipHash = req => digest(clientIp(req));
  const token = req => {
    const value = /(?:^|;\s*)ri_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return value ? digest(value) : '';
  };
  // "Last active" for the device list is refreshed at most every five minutes per session, from memory first.
  const touched = new Map();
  const touch = hash => {
    if (!database.touchSession) return;
    const now = Date.now(), last = touched.get(hash);
    if (last && now - last < 300000) return;
    touched.delete(hash); if (touched.size >= 10000) touched.delete(touched.keys().next().value); touched.set(hash, now);
    database.touchSession(hash, now).catch(() => {});
  };
  // Static dashboard files (JS, CSS, fonts) are identical for every user; once a session was verified in the
  // last minute they skip the database so one page load no longer queues a session query per file.
  const verified = new Map();
  const remember = hash => { verified.delete(hash); if (verified.size >= 10000) verified.delete(verified.keys().next().value); verified.set(hash, Date.now() + 60000); };
  const account = async req => { const hash = token(req); if (!hash) return null; const user = await database.session(hash); if (user) { touch(hash); remember(hash); } else verified.delete(hash); return user; };
  account.asset = async req => { const hash = token(req); if (hash && verified.get(hash) > Date.now()) return true; return account(req); };
  const sessionRows = async (user, current) => (await database.userSessions(user.id)).map(row => ({ id: row.id, current: row.tokenHash === current, device: require('./device.cjs').deviceLabel(row.userAgent), createdAt: row.createdAt, lastSeen: row.lastSeen, expiresAt: row.expiresAt }));
  return { account, restricted:async req=>{const proof=database.noticeProof?await database.noticeProof(status.proofHash(req)):null;return proof?.notice.active?proof:null;}, async handle(req, res, pathname) {
    if (!pathname.startsWith('/api/auth/')) return false;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');
    if(await oauth(req,res,pathname))return true;
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
    const origin = publicOrigin(req);
    try{if(await statusHandler(req,res,pathname,origin,reply))return true;}catch(error){reply(error.status||503,{error:error.status?error.message:'بررسی وضعیت انجام نشد؛ دوباره تلاش کن'});return true;}
    const cookie = (value, age) => res.setHeader('Set-Cookie', `ri_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`);
    if (pathname === '/api/auth/session' && req.method === 'GET') {
      try { const user = await account(req),restricted=!user&&database.noticeProof?await database.noticeProof(status.proofHash(req)):null;reply(200, { user: user || null,...(restricted?.notice.active?{restricted:true,redirect:'/account-status/'}:{}) }); } catch { reply(503, { error: 'ارتباط با دیتابیس برقرار نشد' }); } return true;
    }
    if(pathname==='/api/auth/publication-check'&&req.method==='GET') {
      try{const user=await account(req);if(!user){reply(401,{error:'اول وارد حسابت شو'});return true;}const missing=[!user.first_name&&'نام',!user.last_name&&'نام خانوادگی',!((user.phone&&user.phone_verified)||user.email_ok)&&'شماره یا ایمیل تأییدشده'].filter(Boolean);reply(200,{canPublish:!missing.length,missing});}catch{reply(503,{error:'نتونستیم مشخصات حسابت رو بررسی کنیم'});}return true;
    }
    if(pathname==='/api/auth/sessions'&&req.method==='GET') {
      try{const user=await account(req);if(!user){reply(401,{error:'اول وارد حسابت شو'});return true;}if(!database.userSessions){reply(404,{error:'فهرست دستگاه‌ها در دسترس نیست'});return true;}reply(200,{sessions:await sessionRows(user,token(req))});}catch{reply(503,{error:'فهرست دستگاه‌ها دریافت نشد؛ دوباره امتحان کن'});}return true;
    }
    if (req.method !== 'POST') { reply(405, { error: 'Method not allowed' }); return true; }
    if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json') { reply(403, { error: 'درخواست معتبر نیست' }); return true; }
    if (pathname === '/api/auth/logout') {
      try { await database.deleteSession(token(req));if(database.deleteNoticeProof)await database.deleteNoticeProof(status.proofHash(req));cookie('', 0);res.appendHeader('Set-Cookie',`ri_restriction=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${origin.startsWith('https:')?'; Secure':''}`);reply(200, { ok: true }); } catch { reply(503, { error: 'خروج انجام نشد' }); } return true;
    }
    if(['/api/auth/sessions/revoke','/api/auth/sessions/revoke-others'].includes(pathname)) {
      try {
        const user=await account(req);if(!user){reply(401,{error:'اول وارد حسابت شو'});return true;}
        if(req.headers['x-resumeit-owner']&&req.headers['x-resumeit-owner']!==user.id){reply(409,{error:'حساب فعال عوض شده است؛ صفحه را دوباره باز کن'});return true;}
        if(!database.userSessions){reply(404,{error:'فهرست دستگاه‌ها در دسترس نیست'});return true;}
        const input=await readJson(req),current=token(req);
        if(pathname.endsWith('/revoke-others')){const closed=await database.revokeOtherSessions(user.id,current);reply(200,{closed,sessions:await sessionRows(user,current)});return true;}
        if(typeof input.id!=='string'||!/^[a-f0-9]{24}$/.test(input.id)){reply(400,{error:'دستگاه معتبر نیست'});return true;}
        const target=(await sessionRows(user,current)).find(row=>row.id===input.id);
        if(!target){reply(404,{error:'این نشست قبلاً بسته شده است'});return true;}
        if(target.current){reply(400,{error:'برای این دستگاه از دکمهٔ «خروج» استفاده کن'});return true;}
        await database.revokeUserSession(user.id,input.id);reply(200,{sessions:await sessionRows(user,current)});
      } catch(error){reply(error.status || (error instanceof SyntaxError ? 400 : 503),{error:'بستن نشست انجام نشد؛ دوباره امتحان کن'});}return true;
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
          const result=await otp.request(input.phone,'phone',ipHash(req),user.id);
          if(!result||result.blocked){res.setHeader('Retry-After',String(result?.retryAfter||60));reply(429,{error:require('./otp.cjs').limitMessage(result||{blocked:'resend',retryAfter:60})});}else reply(200,result);
        } else {
          if(typeof input.challengeId!=='string'||!/^[a-f0-9-]{36}$/.test(input.challengeId)||typeof input.code!=='string'||!/^\d{6}$/.test(input.code)){reply(400,{error:'کد ۶ رقمی رو درست بنویس'});return true;}
          const result=await database.verifyPhoneOtp(input.challengeId,digest(input.challengeId+input.code),user.id,Date.now(),token(req));
          if(!result)reply(401,{error:'کد درست نیست یا اعتبارش تموم شده'});else if(result.existing)reply(409,{error:'این شماره روی یه حساب دیگه ثبت شده'});else reply(200,{ok:true});
        }
      } catch(error){reply(error.status || (error instanceof SyntaxError ? 400 : error.code==='SMS_FAILED' ? 502 : 503),{error:error.code==='SMS_FAILED'?require('./otp.cjs').smsFailedMessage:'درخواست انجام نشد، دوباره امتحان کن'});}return true;
    }
    const signIn = async user => {
      const notice=database.accountNotice?await database.accountNotice(user.id):null;if(notice){reply(200,await status.issue(database,req,res,notice,{type:user.phone?'phone':'session',value:user.phone||null},origin));return;}
      await database.deleteSession(token(req));
      const value = randomBytes(32).toString('hex');
      if(!await database.createSession(digest(value),user.id,Date.now()+7*86400000,user.password_hash,user.phone,req.headers['user-agent'])) { reply(401,{error:'مشخصات حساب تغییر کرده؛ دوباره وارد شو'}); return; }
      cookie(value,7*86400);res.appendHeader('Set-Cookie',`ri_restriction=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${origin.startsWith('https:')?'; Secure':''}`);reply(200,{ok:true});
    };
    if (['/api/auth/otp/request','/api/auth/otp/verify','/api/auth/register','/api/auth/password/reset'].includes(pathname)) {
      try {
        const input=await readJson(req);
        if (pathname==='/api/auth/register'||pathname==='/api/auth/password/reset') {
          const reset=pathname==='/api/auth/password/reset',grant=reset?input.resetToken:input.registrationToken;
          if (typeof grant!=='string'||!/^[a-f0-9]{64}$/.test(grant) || typeof input.password!=='string' || input.password.length<8 || input.password.length>128) { reply(400,{error:'رمزت باید بین ۸ تا ۱۲۸ کاراکتر باشه'}); return true; }
          if (!await database.registrationValid(digest(grant),Date.now(),reset?'reset':'register')) { reply(401,{error:'تأیید شماره منقضی شده؛ دوباره کد بگیر'}); return true; }
          if (pending>=scryptSlots) { res.setHeader('Retry-After','3'); reply(429,{error:'سرور کمی شلوغه؛ چند ثانیه بعد دوباره امتحان کن'}); return true; }
          pending++;
          try {
            const hash=await hashPassword(input.password);
            const user=await (reset?database.resetPasswordVerified(digest(grant),hash,Date.now()):database.registerVerified(digest(grant),hash,Date.now(),/(?:^|;\s*)ri_ref=([a-z0-9]{8})(?:;|$)/.exec(req.headers.cookie||'')?.[1]));
            if (!user) reply(401,{error:'تأیید شماره منقضی شده؛ دوباره کد بگیر'});
            else if(user.existing) reply(409,{error:'این شماره حساب دارد؛ از صفحهٔ ورود استفاده کن'});
            else await signIn(user);
          } finally { pending--; }
          return true;
        }
        if (!['login','register','reset'].includes(input.purpose)) { reply(400,{error:'درخواست معتبر نیست'}); return true; }
        if (pathname.endsWith('/request')) {
          if (typeof input.phone!=='string'||!/^09\d{9}$/.test(input.phone)) { reply(400,{error:'شمارهٔ موبایل معتبر وارد کن'}); return true; }
          let ownerId=null,email=null;
          const channel=input.channel==='email'?'email':'sms';
          if(channel==='email'&&input.purpose==='register') { reply(400,{error:'کد ثبت‌نام فقط پیامک می‌شود'}); return true; }
          // Throttle registration probes too: the "already registered" answer must not become a free phone lookup.
          if(input.purpose==='register' && !await database.claimLoginAttempts('register:'+input.phone,ipHash(req))) { res.setHeader('Retry-After','900'); reply(429,{error:'تلاش‌های زیادی انجام شده؛ کمی بعد دوباره امتحان کن'}); return true; }
          if(input.purpose==='register' && await database.accountByPhone(input.phone)) {
            reply(409,{error:'این شماره حساب دارد؛ وارد شو یا رمزت را بازیابی کن'}); return true;
          }
          if(input.purpose!=='register') {
            if(!await database.claimLoginAttempts(input.phone,ipHash(req))) { reply(429,{error:'تلاش‌های زیادی انجام شده؛ کمی بعد دوباره امتحان کن'}); return true; }
            const owner=await database.accountByPhone(input.phone);
            const deleted=!owner&&database.identityNotice?await database.identityNotice('phone',input.phone):null;
            if(!owner&&!deleted&&channel==='email') { reply(mailAvailable()?404:503,mailAvailable()?{error:'برای این شماره ایمیل تأییدشده‌ای نداریم؛ با پیامک ادامه بده یا با رمز وارد شو',code:'no_email'}:{error:'ارسال ایمیل فعلاً در دسترس نیست؛ با پیامک ادامه بده یا با رمز وارد شو',code:'email_unavailable'}); return true; }
            if(!owner&&!deleted) { reply(200,{challengeId:require('node:crypto').randomUUID(),expiresIn:120,retryAfter:60}); return true; }
            ownerId=owner?.id||deleted.user_id;
            if(channel==='email') {
              if(!mailAvailable()) { reply(503,{error:'ارسال ایمیل فعلاً در دسترس نیست؛ با پیامک ادامه بده یا با رمز وارد شو',code:'email_unavailable'}); return true; }
              // An unknown phone and a phone without a verified address get the same answer.
              email=owner?await database.verifiedEmail(owner.id):null;
              if(!email) { reply(404,{error:'برای این شماره ایمیل تأییدشده‌ای نداریم؛ با پیامک ادامه بده یا با رمز وارد شو',code:'no_email'}); return true; }
            }
          }
          const result=await otp.request(input.phone,input.purpose,ipHash(req),ownerId,channel,email);
          if (!result||result.blocked) { res.setHeader('Retry-After',String(result?.retryAfter||60)); reply(429,{error:require('./otp.cjs').limitMessage(result||{blocked:'resend',retryAfter:60}),retryAfter:result?.retryAfter||60}); }
          else reply(200,channel==='email'?{...result,hint:email.replace(/^(.).*?@(.).*?(\.[^.]+)$/,'$1***@$2***$3')}:result);
        } else {
          if (typeof input.challengeId!=='string'||!/^[a-f0-9-]{36}$/.test(input.challengeId)||typeof input.code!=='string'||!/^\d{6}$/.test(input.code)) { reply(400,{error:'کد شش‌رقمی معتبر وارد کن'}); return true; }
          const result=await otp.verify(input.challengeId,input.code,input.purpose);
          if(result&&database.identityNotice){const current=await database.accountByPhone(result.phone);if(['login','reset'].includes(input.purpose)&&current&&current.id!==result.ownerId){reply(401,{error:'مشخصات حساب تغییر کرده؛ دوباره کد بگیر'});return true;}const notice=await database.identityNotice('phone',result.phone);if(notice){reply(200,await status.issue(database,req,res,notice,{type:'phone',value:result.phone},origin));return true;}}
          if (!result) reply(401,{error:'این کد درست نیست یا اعتبارش تموم شده، تا پنج بار می‌تونی امتحان کنی'});
          else if(input.purpose==='register') reply(200,{registrationToken:result.registrationToken});
          else if(input.purpose==='reset') {
            if(!await database.accountByPhone(result.phone)) reply(404,{error:'این شماره هنوز حساب ندارد؛ ثبت‌نام کن'});
            else reply(200,{resetToken:result.resetToken});
          }
          else {
            const user=await database.accountByPhone(result.phone);
            if (!user || user.id!==result.ownerId) reply(401,{error:'مشخصات حساب تغییر کرده؛ دوباره کد بگیر'});
            // Only an SMS code proves the phone; a code that came by email proves the mailbox, not the number.
            else {if(result.channel!=='email')await database.markPhoneVerified(user.id);await signIn(user);}
          }
        }
      } catch(error) { reply(error.status || (error instanceof SyntaxError?400:503),{error:error.code==='SMS_FAILED'?require('./otp.cjs').smsFailedMessage:error.code==='EMAIL_FAILED'?require('./otp.cjs').emailFailedMessage:'درخواست انجام نشد؛ شماره را بررسی کن و کمی بعد دوباره امتحان کن'}); }
      return true;
    }
    if (pathname !== '/api/auth/login') { reply(404, { error: 'Not found' }); return true; }
    try {
      const { phone, password } = await readJson(req);
      if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone) || typeof password !== 'string' || password.length < 8 || password.length > 128) { reply(400, { error: 'شماره و رمز معتبر وارد کن' }); return true; }
      if (pending >= scryptSlots) {
        res.setHeader('Retry-After', '3'); reply(429, { error: 'سرور کمی شلوغه؛ چند ثانیه بعد دوباره امتحان کن' }); return true;
      }
      pending++;
      try {
      if (!await database.claimLoginAttempts(phone, ipHash(req))) {
        res.setHeader('Retry-After', '900'); reply(429, { error: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن' }); return true;
      }
      const user = await database.accountByPhone(phone);
      const valid = await verifyPassword(password, user?.password_hash);
      if (!valid) { reply(401, { error: 'شماره یا رمزت درست نیست' }); return true; }
      await database.clearLoginAttempts(phone, ipHash(req));
      await signIn(user);
      } finally { pending--; }
    } catch (error) {
      reply(error.status || (error instanceof SyntaxError ? 400 : 503), { error: 'ورود انجام نشد؛ دوباره امتحان کن' });
    }
    return true;
  } };
}
module.exports = { hashPassword, verifyPassword, authHandler, digest };

