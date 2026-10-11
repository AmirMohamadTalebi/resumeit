const { randomUUID } = require('node:crypto');
function testStore() {
  const users = new Map(), sessions = new Map(), attempts = new Map(), challenges = new Map(), smsLimits = new Map();
  return {
    async reserveOtp(record,ip,now) {
      const old=challenges.get(record.phone);
      if(old&&old.sentAt+60000>now) return false;
      const day=Math.floor(now/86400000);
      const limits=[['all:'+day,100,(day+1)*86400000],['ip:'+ip,10,now+900000],['phone:'+record.phone,5,(day+1)*86400000]];
      for(const [key,limit] of limits) {const row=smsLimits.get(key);if(row&&row.expires>now&&row.count>=limit)return false;}
      for(const [key,,expires] of limits) {const row=smsLimits.get(key);smsLimits.set(key,{count:row&&row.expires>now?row.count+1:1,expires:row&&row.expires>now?row.expires:expires});}
      challenges.set(record.phone,{...record,status:'pending',attempts:0,sentAt:now,expires:now+120000});return true;
    },
    async finishOtpSend(id,success) {const row=[...challenges.values()].find(r=>r.id===id);if(row&&row.status==='pending')row.status=success?'ready':'consumed';},
    async verifyOtp(id,hash,purpose,grant,now) {
      const row=[...challenges.values()].find(r=>r.id===id);
      if(!row||row.purpose!==purpose||row.status!=='ready'||row.expires<=now||row.attempts>=5)return null;
      row.attempts++;if(row.hash!==hash)return null;row.status=purpose!=='login'?'verified':'consumed';row.grant=grant;row.expires=now+300000;return row.phone;
    },
    async registrationValid(grant,now,purpose='register') {return [...challenges.values()].some(r=>r.grant===grant&&r.purpose===purpose&&r.status==='verified'&&r.expires>now);},
    async resetPasswordVerified(grant,hash,now) {
      const row=[...challenges.values()].find(r=>r.grant===grant&&r.purpose==='reset'&&r.status==='verified'&&r.expires>now);
      if(!row)return null;const user=users.get(row.phone);if(!user)return null;
      user.password_hash=hash;row.status='consumed';row.grant=null;attempts.delete(row.phone);
      for(const [key,session] of sessions)if(session.id===user.id)sessions.delete(key);
      return {...user};
    },
    async registerVerified(grant,hash,now) {
      const row=[...challenges.values()].find(r=>r.grant===grant&&r.purpose==='register'&&r.status==='verified'&&r.expires>now);
      if(!row)return null;if(users.has(row.phone))return {existing:true};
      const user={id:randomUUID(),phone:row.phone,password_hash:hash};users.set(row.phone,user);row.status='consumed';row.grant=null;return user;
    },
    async provisionAccount(phone, hash) { if (!users.has(phone)) users.set(phone, { id: randomUUID(), phone, password_hash: hash }); return users.get(phone).id; },
    async accountByPhone(phone) { const user=users.get(phone); return user?{...user}:undefined; },
    async createSession(token, id, expires, expectedHash) {const user=[...users.values()].find(u=>u.id===id);if(!user||(expectedHash!==undefined&&user.password_hash!==expectedHash))return false;sessions.set(token, { id, expires });return true;},
    async session(token) { const s = sessions.get(token); if (!s || s.expires <= Date.now()) return; const user = [...users.values()].find(u => u.id === s.id); return { id: user.id, phone: user.phone }; },
    async deleteSession(token) { sessions.delete(token); },
    async claimLoginAttempts(phone, ip) { const keys = [[ip,100],[phone,5]]; if (keys.some(([key,limit]) => (attempts.get(key)||0) >= limit)) return false; keys.forEach(([key]) => attempts.set(key,(attempts.get(key)||0)+1)); return true; },
    async clearLoginAttempts(phone) { attempts.delete(phone); },
    async close() {}
  };
}
module.exports = { testStore };
