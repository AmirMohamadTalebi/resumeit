const {randomUUID,timingSafeEqual}=require('node:crypto');
module.exports = ({execute,transaction}) => {
  return {
    async createOAuthState(hash,provider,verifier,expires,ownerId=null) {
      await execute('DELETE FROM oauth_states WHERE expires_at<=?',[Date.now()]);
      await execute('INSERT INTO oauth_states(state_hash,provider,verifier,expires_at,owner_id) VALUES(?,?,?,?,?)',[hash,provider,verifier,expires,ownerId]);
    },
    async consumeOAuthState(hash,provider,now) {
      return transaction(async connection=>{
        const [[row]]=await connection.execute('SELECT verifier,expires_at,owner_id FROM oauth_states WHERE state_hash=? AND provider=? FOR UPDATE',[hash,provider]);
        if(!row)return null;
        await connection.execute('DELETE FROM oauth_states WHERE state_hash=?',[hash]);
        return row.expires_at>now?row:null;
      });
    },
    async socialAccount(provider,subject,name,ownerId=null,referralCode=null) {
      const lookup=async()=> (await execute('SELECT users.id,users.phone,users.password_hash FROM social_identities JOIN users ON users.id=user_id WHERE provider=? AND subject=?',[provider,subject]))[0];
      const existing=await lookup();if(existing){if(ownerId&&existing.id!==ownerId)throw new Error('Identity already linked');return existing;}
      try {
        return await transaction(async connection=>{
          const id=ownerId||randomUUID();
          if(!ownerId){await connection.execute('INSERT INTO users(id,phone,password_hash) VALUES(?,NULL,NULL)',[id]);await connection.execute('INSERT INTO profiles(user_id,name) VALUES(?,?)',[id,name]);await require('./referrals.cjs').attach(connection,id,referralCode);}
          const [[user]]=await connection.execute('SELECT id,phone,password_hash FROM users WHERE id=? FOR UPDATE',[id]);
          if(!user)throw new Error('Account missing');
          await connection.execute('INSERT INTO social_identities(provider,subject,user_id) VALUES(?,?,?)',[provider,subject,id]);
          return user;
        });
      } catch(error) {if(error.code!=='ER_DUP_ENTRY')throw error;const winner=await lookup();if(!winner||(ownerId&&winner.id!==ownerId))throw error;return winner;}
    },
    async unlinkSocial(userId,provider) {
      return transaction(async connection=>{
        const [[user]]=await connection.execute('SELECT phone,phone_verified,password_hash FROM users WHERE id=? FOR UPDATE',[userId]);
        const [others]=await connection.execute('SELECT provider FROM social_identities WHERE user_id=? AND provider<>?',[userId,provider]);
        if(!user||(!others.length&&!(user.phone&&(user.phone_verified||user.password_hash))))return false;
        await connection.execute('DELETE FROM social_identities WHERE user_id=? AND provider=?',[userId,provider]);return true;
      });
    },
    async setAccountNames(userId,first,last) {await execute('UPDATE profiles SET first_name=?,last_name=?,name=? WHERE user_id=?',[first,last,first+' '+last,userId]);},
    async markPhoneVerified(userId) {await execute('UPDATE users SET phone_verified=TRUE WHERE id=? AND phone IS NOT NULL',[userId]);},
    async verifyPhoneOtp(id,hash,userId,now,keepSession='') {
      return transaction(async connection=>{
        const [[row]]=await connection.execute("SELECT * FROM otp_challenges WHERE challenge_id=? AND purpose='phone' AND owner_id=? FOR UPDATE",[id,userId]);
        if(!row||row.status!=='ready'||row.expires_at<=now||row.attempts>=5)return null;
        await connection.execute('UPDATE otp_challenges SET attempts=attempts+1 WHERE challenge_id=?',[id]);
        if(!timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(hash,'hex')))return null;
        const [[existing]]=await connection.execute('SELECT id FROM users WHERE phone=?',[row.phone]);
        if(existing&&existing.id!==userId)return {existing:true};
        const [[user]]=await connection.execute('SELECT phone FROM users WHERE id=? FOR UPDATE',[userId]);
        if(!user)return null;
        await connection.execute('UPDATE users SET phone=?,phone_verified=TRUE WHERE id=?',[row.phone,userId]);
        if(user.phone!==row.phone) {
          await connection.execute('DELETE FROM sessions WHERE user_id=? AND token_hash<>?',[userId,keepSession]);
          await connection.execute('DELETE FROM otp_challenges WHERE phone=?',[user.phone]);
        }
        await connection.execute("UPDATE otp_challenges SET status='consumed' WHERE challenge_id=?",[id]);
        await connection.execute('UPDATE otp_events SET verified_at=? WHERE id=?',[now,id]);
        return {phone:row.phone};
      }).catch(error=>{if(error.code==='ER_DUP_ENTRY')return {existing:true};throw error;});
    },
  };
};
