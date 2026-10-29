const { randomInt, randomUUID, randomBytes, createHash } = require('node:crypto');
const { sendVerificationSms } = require('../services/smsir.cjs');
const digest = value => createHash('sha256').update(value).digest('hex');
function createOtpService({ database, send = sendVerificationSms, now = Date.now }) {
  async function request(phone, purpose, ipHash, ownerId=null) {
    const id = randomUUID(), code = String(randomInt(100000,1000000));
    const reserved = await database.reserveOtp({ id, phone, purpose, hash:digest(id+code), ownerId },ipHash,now());
    if (reserved !== true) return { blocked: reserved?.reason || 'resend', retryAfter: reserved?.retryAfter || 60 };
    try { await send(phone,code); }
    catch (error) {
      await database.finishOtpSend(id,false);
      // The code names the SMS.ir answer (HTTP status, provider status, timeout or missing settings), never the phone or message.
      if (!process.env.RESUMEIT_QUIET_ERRORS) console.error(JSON.stringify({ event:'sms_failed', purpose, code:error.code||'SMS_ERROR', at:new Date().toISOString() }));
      throw Object.assign(new Error('SMS submission failed'),{ code:'SMS_FAILED' });
    }
    await database.finishOtpSend(id,true);
    return { challengeId:id, expiresIn:120, retryAfter:60 };
  }
  async function verify(id,code,purpose) {
    const grant = randomBytes(32).toString('hex');
    const proof = await database.verifyOtp(id,digest(id+code),purpose,purpose!=='login'?digest(grant):null,now());
    return proof ? { ...proof, ...(purpose==='register'?{registrationToken:grant}:purpose==='reset'?{resetToken:grant}:{}) } : null;
  }
  return { request, verify };
}
const fa = n => Number(n).toLocaleString('fa-IR');
// One wording for every flow that sends a code (login, sign-up, recovery, phone linking, page reset).
function limitMessage(result) {
  const wait = Math.max(1, Math.ceil(result.retryAfter / 60));
  if (result.blocked === 'phone') return 'سقف ارسال کد برای این شماره امروز پر شده است؛ فردا دوباره امتحان کن یا با رمز عبور وارد شو.';
  if (result.blocked === 'ip') return 'از این اینترنت در چند دقیقهٔ اخیر کد زیادی درخواست شده؛ ' + fa(wait) + ' دقیقهٔ دیگر دوباره امتحان کن.';
  if (result.blocked === 'site') return 'سهمیهٔ امروز پیامک سایت تمام شده است؛ فردا دوباره امتحان کن یا به پشتیبانی خبر بده.';
  return 'کد قبلی همین الان ارسال شده؛ ' + fa(result.retryAfter) + ' ثانیهٔ دیگر می‌توانی کد تازه بگیری.';
}
const smsFailedMessage = 'پیامک ارسال نشد؛ چند دقیقهٔ دیگر دوباره امتحان کن. اگر تکرار شد، به پشتیبانی خبر بده.';
module.exports = { createOtpService, limitMessage, smsFailedMessage };
