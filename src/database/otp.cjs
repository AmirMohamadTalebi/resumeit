const {randomUUID,timingSafeEqual}=require('node:crypto');
module.exports = ({execute,transaction}) => {
  return {
    async reserveOtp(record, ipHash, now) {
      await execute('DELETE FROM login_attempts WHERE expires_at<=?', [now]);
      await execute('DELETE FROM otp_challenges WHERE expires_at<?', [now - 86400000]);
      return transaction(async connection => {
        const day = Math.floor(now / 86400000), tomorrow = (day + 1) * 86400000;
        const limits = [['sms:all:'+day,100,tomorrow], ['sms:ip:'+ipHash,10,now+900000], ['sms:phone:'+record.phone,5,tomorrow]];
        // Lock the shared budget first so concurrent replicas cannot overspend or resend together.
        for (const [key,limit,expires] of limits) {
          await connection.execute('INSERT INTO login_attempts(attempt_key,count,expires_at) VALUES(?,0,?) ON DUPLICATE KEY UPDATE attempt_key=attempt_key',[key,expires]);
          const [[row]] = await connection.execute('SELECT count FROM login_attempts WHERE attempt_key=? FOR UPDATE',[key]);
          if (row.count >= limit) return false;
        }
        const [[old]] = await connection.execute('SELECT sent_at FROM otp_challenges WHERE phone=? FOR UPDATE',[record.phone]);
        if (old && old.sent_at + 60000 > now) return false;
        for (const [key] of limits) await connection.execute('UPDATE login_attempts SET count=count+1 WHERE attempt_key=?',[key]);
        await connection.execute(`INSERT INTO otp_challenges(phone,challenge_id,purpose,code_hash,status,sent_at,expires_at,owner_id) VALUES(?,?,?,?,'pending',?,?,?) ON DUPLICATE KEY UPDATE challenge_id=VALUES(challenge_id),purpose=VALUES(purpose),code_hash=VALUES(code_hash),status='pending',attempts=0,sent_at=VALUES(sent_at),expires_at=VALUES(expires_at),registration_token=NULL,owner_id=VALUES(owner_id)`,[record.phone,record.id,record.purpose,record.hash,now,now+120000,record.ownerId||null]);
        await connection.execute("INSERT INTO otp_events(id,phone,purpose,status,created_at) VALUES(?,?,?,'pending',?)",[record.id,record.phone,record.purpose,now]);
        return true;
      });
    },
    async finishOtpSend(id, success) { await transaction(async con=>{await con.execute('UPDATE otp_challenges SET status=? WHERE challenge_id=? AND status=?',[success?'ready':'consumed',id,'pending']);await con.execute('UPDATE otp_events SET status=? WHERE id=?',[success?'accepted':'failed',id]);}); },
    async verifyOtp(id, hash, purpose, grantHash, now) {
      return transaction(async connection => {
        const [[row]] = await connection.execute('SELECT * FROM otp_challenges WHERE challenge_id=? FOR UPDATE',[id]);
        if (!row || row.purpose !== purpose || row.status !== 'ready' || row.expires_at<=now || row.attempts>=5) return null;
        await connection.execute('UPDATE otp_challenges SET attempts=attempts+1 WHERE challenge_id=?',[id]);
        if (!timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(hash,'hex'))) return null;
        await connection.execute('UPDATE otp_challenges SET status=?,registration_token=?,expires_at=? WHERE challenge_id=?',[purpose!=='login'?'verified':'consumed',grantHash,now+300000,id]);
        await connection.execute('UPDATE otp_events SET verified_at=? WHERE id=?',[now,id]);
        return {phone:row.phone,ownerId:row.owner_id};
      });
    },
    async registrationValid(grantHash,now,purpose='register') { return (await execute("SELECT phone FROM otp_challenges WHERE registration_token=? AND purpose=? AND status='verified' AND expires_at>?",[grantHash,purpose,now])).length>0; },
    async resetPasswordVerified(grantHash,passwordHash,now) {
      return transaction(async connection => {
        const [[row]]=await connection.execute("SELECT * FROM otp_challenges WHERE registration_token=? AND purpose='reset' AND status='verified' FOR UPDATE",[grantHash]);
        if(!row||row.expires_at<=now)return null;
        const [[user]]=await connection.execute('SELECT id,phone FROM users WHERE id=? AND phone=? FOR UPDATE',[row.owner_id,row.phone]);
        if(!user)return null;
        await connection.execute('UPDATE users SET password_hash=?,phone_verified=TRUE WHERE id=?',[passwordHash,user.id]);
        await connection.execute('DELETE FROM sessions WHERE user_id=?',[user.id]);
        await connection.execute('DELETE FROM login_attempts WHERE attempt_key=?',['phone:'+user.phone]);
        await connection.execute("UPDATE otp_challenges SET status='consumed',registration_token=NULL WHERE challenge_id=?",[row.challenge_id]);
        return {...user,password_hash:passwordHash};
      });
    },
    async registerVerified(grantHash, passwordHash, now) {
      return transaction(async connection => {
        const [[row]] = await connection.execute("SELECT * FROM otp_challenges WHERE registration_token=? AND purpose='register' AND status='verified' FOR UPDATE",[grantHash]);
        if (!row || row.expires_at<=now) return null;
        const [[existing]] = await connection.execute('SELECT id FROM users WHERE phone=?',[row.phone]);
        if (existing) return { existing: true };
        const id = randomUUID();
          await connection.execute('INSERT INTO users(id,phone,password_hash,phone_verified) VALUES(?,?,?,TRUE)',[id,row.phone,passwordHash]);
        await connection.execute('INSERT INTO profiles(user_id) VALUES(?)',[id]);
        await connection.execute("UPDATE otp_challenges SET status='consumed',registration_token=NULL WHERE challenge_id=?",[row.challenge_id]);
        return { id, phone: row.phone, password_hash: passwordHash };
      });
    },
  };
};
