const { randomInt, randomUUID, randomBytes, createHash } = require('node:crypto');
const { sendVerificationSms } = require('./smsir.cjs');
const digest = value => createHash('sha256').update(value).digest('hex');
function createOtpService({ database, send = sendVerificationSms, now = Date.now }) {
  async function request(phone, purpose, ipHash, ownerId=null) {
    const id = randomUUID(), code = String(randomInt(100000,1000000));
    if (!await database.reserveOtp({ id, phone, purpose, hash:digest(id+code), ownerId },ipHash,now())) return null;
    try { await send(phone,code); await database.finishOtpSend(id,true); }
    catch { await database.finishOtpSend(id,false); throw new Error('SMS submission failed'); }
    return { challengeId:id, expiresIn:120, retryAfter:60 };
  }
  async function verify(id,code,purpose) {
    const grant = randomBytes(32).toString('hex');
    const phone = await database.verifyOtp(id,digest(id+code),purpose,purpose!=='login'?digest(grant):null,now());
    return phone ? { phone, ...(purpose==='register'?{registrationToken:grant}:purpose==='reset'?{resetToken:grant}:{}) } : null;
  }
  return { request, verify };
}
module.exports = { createOtpService };
