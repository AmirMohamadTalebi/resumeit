const { randomUUID } = require('node:crypto');
function testStore() {
  const users = new Map(), sessions = new Map(), attempts = new Map();
  return {
    async provisionAccount(phone, hash) { if (!users.has(phone)) users.set(phone, { id: randomUUID(), phone, password_hash: hash }); return users.get(phone).id; },
    async accountByPhone(phone) { return users.get(phone); },
    async createSession(token, id, expires) { sessions.set(token, { id, expires }); },
    async session(token) { const s = sessions.get(token); if (!s || s.expires <= Date.now()) return; const user = [...users.values()].find(u => u.id === s.id); return { id: user.id, phone: user.phone }; },
    async deleteSession(token) { sessions.delete(token); },
    async claimLoginAttempts(phone, ip) { const keys = [[ip,100],[phone,5]]; if (keys.some(([key,limit]) => (attempts.get(key)||0) >= limit)) return false; keys.forEach(([key]) => attempts.set(key,(attempts.get(key)||0)+1)); return true; },
    async clearLoginAttempts(phone) { attempts.delete(phone); },
    async close() {}
  };
}
module.exports = { testStore };
