const { randomInt, randomUUID, randomBytes, createHash } = require('node:crypto');
const { sendVerificationSms } = require('../services/smsir.cjs');
const digest = value => createHash('sha256').update(value).digest('hex');
// The email carrying a login or recovery code: plain text, the code alone and what to do if the request was not theirs.
function codeMail(code, purpose) { return require('../notifications/email-templates.cjs').render(purpose === 'reset' ? 'reset-code' : 'login-code', { code }); }
function createOtpService({ database, send = sendVerificationSms, sendMail, mailer, now = Date.now }) {
  const mail = sendMail || (mailer ? (address, code, purpose) => { const { subject, text, html } = codeMail(code, purpose); return mailer.mail(address, subject, text, html); } : async () => { throw Object.assign(new Error('EMAIL_NOT_CONFIGURED'), { code: 'EMAIL_NOT_CONFIGURED' }); });
  // channel is 'sms' (to the phone) or 'email' (to the account's verified address, passed as email).
  async function request(phone, purpose, ipHash, ownerId=null, channel='sms', email=null) {
    const id = randomUUID(), code = String(randomInt(100000,1000000));
    const reserved = await database.reserveOtp({ id, phone, purpose, hash:digest(id+code), ownerId, channel },ipHash,now());
    if (reserved !== true) return { blocked: reserved?.reason || 'resend', retryAfter: reserved?.retryAfter || 60 };
    try { if (channel === 'email') await mail(email, code, purpose); else await send(phone,code); }
    catch (error) {
      await database.finishOtpSend(id,false);
      // The code names the SMS.ir answer (HTTP status, provider status, timeout or missing settings), never the phone or message.
      if (!process.env.RESUMEIT_QUIET_ERRORS) console.error(JSON.stringify({ event:channel === 'email' ? 'email_failed' : 'sms_failed', purpose, code:error.code||'SEND_ERROR', at:new Date().toISOString() }));
      throw Object.assign(new Error('Code submission failed'),{ code:channel === 'email' ? 'EMAIL_FAILED' : 'SMS_FAILED' });
    }
    await database.finishOtpSend(id,true);
    return { challengeId:id, expiresIn:channel === 'email' ? 300 : 120, retryAfter:60, channel };
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
  if (result.blocked === 'burst') return 'کد زیادی برای این شماره درخواست شده؛ ' + fa(wait) + ' دقیقهٔ دیگر دوباره امتحان کن.';
  if (result.blocked === 'phone') return 'سقف ارسال کد برای این شماره امروز پر شده است؛ فردا دوباره امتحان کن یا با رمز عبور وارد شو.';
  if (result.blocked === 'ip') return 'از این اینترنت در چند دقیقهٔ اخیر کد زیادی درخواست شده؛ ' + fa(wait) + ' دقیقهٔ دیگر دوباره امتحان کن.';
  if (result.blocked === 'site') return 'سهمیهٔ امروز پیامک سایت تمام شده است؛ فردا دوباره امتحان کن یا به پشتیبانی خبر بده.';
  return 'کد قبلی همین الان ارسال شده؛ ' + fa(result.retryAfter) + ' ثانیهٔ دیگر می‌توانی کد تازه بگیری.';
}
const emailFailedMessage = 'ایمیل ارسال نشد؛ چند دقیقهٔ دیگر دوباره امتحان کن یا کد را با پیامک بگیر.';
const smsFailedMessage = 'پیامک ارسال نشد؛ چند دقیقهٔ دیگر دوباره امتحان کن. اگر تکرار شد، به پشتیبانی خبر بده.';
module.exports = { createOtpService, limitMessage, smsFailedMessage, emailFailedMessage, codeMail };
