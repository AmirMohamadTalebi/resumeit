const { randomUUID } = require('node:crypto');
function testStore() {
  const users = new Map(), sessions = new Map(), attempts = new Map(), challenges = new Map(), smsLimits = new Map(), oauthStates = new Map(), identities=new Map(), emails=new Map();
  const byId=id=>[...users.values()].find(u=>u.id===id);
  return {
    ...require('./dashboard-test-store.cjs')(byId,id=>{for(const [p,u]of users)if(u.id===id)users.delete(p);for(const [k,s]of sessions)if(s.id===id)sessions.delete(k);for(const [k,owner]of identities)if(owner===id)identities.delete(k);}),
    async createOAuthState(hash,provider,verifier,expires,ownerId=null) {oauthStates.set(hash,{provider,verifier,expires_at:expires,owner_id:ownerId});},
    async consumeOAuthState(hash,provider,now) {const row=oauthStates.get(hash);if(!row||row.provider!==provider)return null;oauthStates.delete(hash);return row.expires_at>now?row:null;},
    async socialAccount(provider,subject,name,ownerId=null) {const key=provider+':'+subject,existing=identities.get(key);if(existing){if(ownerId&&ownerId!==existing)throw new Error('Already linked');return {...byId(existing)};}const user=ownerId?byId(ownerId):{id:randomUUID(),phone:null,password_hash:null,name};if(!user)throw new Error('Missing');if(!ownerId)users.set(user.id,user);identities.set(key,user.id);return {...user};},
    async unlinkSocial(id,provider) {const user=byId(id),others=[...identities].filter(([key,owner])=>owner===id&&!key.startsWith(provider+':'));if(!others.length&&!(user.phone&&(user.phone_verified||user.password_hash)))return false;for(const [key,owner]of identities)if(owner===id&&key.startsWith(provider+':'))identities.delete(key);return true;},
    async setAccountNames(id,first,last) {Object.assign(byId(id),{first_name:first,last_name:last});},
    async markPhoneVerified(id) {byId(id).phone_verified=true;},
    async verifiedEmail(id) {return emails.get(id)||null;},
    setVerifiedEmail(id,address) {if(address)emails.set(id,address);else emails.delete(id);},
    async verifyPhoneOtp(id,hash,userId,now,keepSession='') {const row=[...challenges.values()].find(r=>r.id===id);if(!row||row.ownerId!==userId||row.purpose!=='phone'||row.status!=='ready'||row.expires<=now||row.attempts>=5)return null;row.attempts++;if(row.hash!==hash)return null;const existing=users.get(row.phone);if(existing&&existing.id!==userId)return {existing:true};const user=byId(userId);if(user.phone!==row.phone){challenges.delete(user.phone);for(const [key,session]of sessions)if(session.id===userId&&key!==keepSession)sessions.delete(key);}for(const [key,u]of users)if(u.id===userId)users.delete(key);user.phone=row.phone;user.phone_verified=true;users.set(row.phone,user);row.status='consumed';return {phone:row.phone};},
    async reserveOtp(record,ip,now) {
      const old=challenges.get(record.phone),email=record.channel==='email';
      // Same channel again after a minute; the other channel after 30 seconds.
      if(old&&old.sentAt+((old.channel||'sms')!==(email?'email':'sms')?30000:60000)>now) return false;
      const day=Math.floor(now/86400000),kind=email?'mail:':'';
      const limits=[[kind+'all:'+day,email?1000:100,(day+1)*86400000],[kind+'ip:'+ip,email?20:10,now+900000],[kind+'phone:'+record.phone,email?12:5,(day+1)*86400000],['burst:'+record.phone,6,now+900000]];
      for(const [key,limit] of limits) {const row=smsLimits.get(key);if(row&&row.expires>now&&row.count>=limit)return false;}
      for(const [key,,expires] of limits) {const row=smsLimits.get(key);smsLimits.set(key,{count:row&&row.expires>now?row.count+1:1,expires:row&&row.expires>now?row.expires:expires});}
      challenges.set(record.phone,{...record,channel:email?'email':'sms',status:'pending',attempts:0,sentAt:now,expires:now+(email?300000:120000)});return true;
    },
    async finishOtpSend(id,success) {const row=[...challenges.values()].find(r=>r.id===id);if(row&&row.status==='pending')row.status=success?'ready':'consumed';},
    async verifyOtp(id,hash,purpose,grant,now) {
      const row=[...challenges.values()].find(r=>r.id===id);
      if(!row||row.purpose!==purpose||row.status!=='ready'||row.expires<=now||row.attempts>=5)return null;
      row.attempts++;if(row.hash!==hash)return null;row.status=purpose!=='login'?'verified':'consumed';row.grant=grant;row.expires=now+300000;return {phone:row.phone,ownerId:row.ownerId,channel:row.channel||'sms'};
    },
    async registrationValid(grant,now,purpose='register') {return [...challenges.values()].some(r=>r.grant===grant&&r.purpose===purpose&&r.status==='verified'&&r.expires>now);},
    async resetPasswordVerified(grant,hash,now) {
      const row=[...challenges.values()].find(r=>r.grant===grant&&r.purpose==='reset'&&r.status==='verified'&&r.expires>now);
      if(!row)return null;const user=users.get(row.phone);if(!user||user.id!==row.ownerId)return null;
      user.password_hash=hash;user.phone_verified=true;row.status='consumed';row.grant=null;attempts.delete(row.phone);
      for(const [key,session] of sessions)if(session.id===user.id)sessions.delete(key);
      return {...user};
    },
    async registerVerified(grant,hash,now) {
      const row=[...challenges.values()].find(r=>r.grant===grant&&r.purpose==='register'&&r.status==='verified'&&r.expires>now);
      if(!row)return null;if(users.has(row.phone))return {existing:true};
      const user={id:randomUUID(),phone:row.phone,password_hash:hash,phone_verified:true};users.set(row.phone,user);row.status='consumed';row.grant=null;return user;
    },
    async provisionAccount(phone, hash) { if (!users.has(phone)) users.set(phone, { id: randomUUID(), phone, password_hash: hash }); return users.get(phone).id; },
    async accountByPhone(phone) { const user=users.get(phone); return user?{...user}:undefined; },
    async createSession(token, id, expires, expectedHash,expectedPhone) {const user=[...users.values()].find(u=>u.id===id);if(!user||(expectedHash!==undefined&&user.password_hash!==expectedHash)||(expectedPhone!==undefined&&user.phone!==expectedPhone))return false;sessions.set(token, { id, expires });return true;},
    async session(token) { const s = sessions.get(token); if (!s || s.expires <= Date.now()) return; const user=byId(s.id);return {id:user.id,phone:user.phone,phone_verified:user.phone_verified||false,first_name:user.first_name||'',last_name:user.last_name||'',google:[...identities].some(([k,id])=>k.startsWith('google:')&&id===user.id),github:[...identities].some(([k,id])=>k.startsWith('github:')&&id===user.id)}; },
    async deleteSession(token) { sessions.delete(token); },
    async userSessions(userId) { return [...sessions].filter(([,s])=>s.id===userId&&s.expires>Date.now()).map(([hash,s])=>({id:require('node:crypto').createHash('sha256').update(hash).digest('hex').slice(0,24),tokenHash:hash,createdAt:null,lastSeen:null,userAgent:'',expiresAt:s.expires})); },
    async revokeUserSession(userId,id) { const target=(await this.userSessions(userId)).find(row=>row.id===id);if(!target)return false;sessions.delete(target.tokenHash);return true; },
    async revokeOtherSessions(userId,keep) { let closed=0;for(const [hash,s] of sessions)if(s.id===userId&&hash!==keep){sessions.delete(hash);closed++;}return closed; },
    async claimLoginAttempts(phone, ip) { const keys = [[ip,100],[phone,5]]; if (keys.some(([key,limit]) => (attempts.get(key)||0) >= limit)) return false; keys.forEach(([key]) => attempts.set(key,(attempts.get(key)||0)+1)); return true; },
    async clearLoginAttempts(phone) { attempts.delete(phone); },
    async close() {}
  };
}
module.exports = { testStore };
