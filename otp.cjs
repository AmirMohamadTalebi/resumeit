const { randomInt, randomUUID, createHash, timingSafeEqual } = require('node:crypto');
const { sendVerificationSms } = require('./smsir.cjs');
const digest = value => createHash('sha256').update(value).digest();

// shortcut: challenges live on one server; use shared expiring storage before scaling or exposing an API.
function createOtpService({ send = sendVerificationSms, now = Date.now } = {}) {
  const challenges = new Map(), phones = new Map();
  const ttl = 120000, cooldown = 60000, maxPending = 1000;
  function prune() {
    for (const [id, record] of challenges) {
      if (record.expires <= now()) { challenges.delete(id); if (phones.get(record.phone) === id) phones.delete(record.phone); }
    }
  }
  async function request(phone) {
    if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone)) throw new Error('Invalid phone');
    prune();
    const previousId = phones.get(phone), previous = challenges.get(previousId);
    if (previous && (previous.pending || previous.sentAt + cooldown > now())) throw new Error('Please wait before requesting another code');
    if (challenges.size >= maxPending) throw new Error('Verification is busy; try later');
    const id = randomUUID(), code = String(randomInt(100000, 1000000));
    const record = { phone, hash: digest(id + code), sentAt: now(), expires: now() + ttl, attempts: 0, pending: true };
    if (previousId) challenges.delete(previousId);
    challenges.set(id, record); phones.set(phone, id);
    try {
      await send(phone, code);
      record.pending = false;
      return { challengeId: id, expiresIn: ttl / 1000, retryAfter: cooldown / 1000 };
    } catch {
      // Keep the cooldown after uncertain submission to avoid duplicate billing.
      record.pending = false; record.attempts = 5;
      throw new Error('Verification SMS could not be confirmed');
    }
  }
  function verify(id, code) {
    prune();
    const record = challenges.get(id);
    if (!record || record.pending || record.attempts >= 5) throw new Error('Invalid or expired verification');
    // Malformed attempts count too; the public endpoint must additionally limit traffic by IP.
    record.attempts++;
    if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !timingSafeEqual(record.hash, digest(id + code))) {
      throw new Error('Invalid or expired verification');
    }
    challenges.delete(id);
    // Retain only the cooldown, without accepting this code again.
    challenges.set(id, { ...record, attempts: 5 });
    return { phone: record.phone };
  }
  return { request, verify };
}
module.exports = { createOtpService };
