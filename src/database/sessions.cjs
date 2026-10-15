const {randomUUID}=require('node:crypto');
module.exports = ({execute,transaction}) => {
  return {
    async provisionAccount(phone, passwordHash) {
      if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone) || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash)) throw new Error('Invalid account');
      return transaction(async connection => {
        await connection.execute('INSERT INTO users(id,phone,password_hash) VALUES(?,?,?) ON DUPLICATE KEY UPDATE password_hash=COALESCE(password_hash,VALUES(password_hash))', [randomUUID(), phone, passwordHash]);
        const [[user]] = await connection.execute('SELECT id FROM users WHERE phone=?', [phone]);
        await connection.execute('INSERT INTO profiles(user_id) VALUES(?) ON DUPLICATE KEY UPDATE user_id=user_id', [user.id]);
        return user.id;
      });
    },
    async accountByPhone(phone) { return (await execute('SELECT id,phone,password_hash FROM users WHERE phone=?', [phone]))[0]; },
    async createSession(tokenHash, userId, expiresAt, expectedHash, expectedPhone) {
      await execute('DELETE FROM sessions WHERE expires_at<=?', [Date.now()]);
      return transaction(async connection=>{
        const [[user]]=await connection.execute('SELECT u.password_hash,u.phone,COALESCE(c.suspended,0) suspended FROM users u LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=? FOR UPDATE',[userId]);
        if(user?.suspended)return false;
        if(!user||(expectedHash!==undefined&&user.password_hash!==expectedHash)||(expectedPhone!==undefined&&user.phone!==expectedPhone))return false;
        await connection.execute('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', [tokenHash, userId, expiresAt]);
        return true;
      });
    },
    async session(tokenHash) {
      const [user]=await execute("SELECT u.id,u.phone,u.phone_verified,p.first_name,p.last_name,EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) AS is_admin,EXISTS(SELECT 1 FROM owner_accounts WHERE user_id=u.id) AS is_owner,EXISTS(SELECT 1 FROM support_accounts WHERE user_id=u.id) AS is_support,EXISTS(SELECT 1 FROM social_identities WHERE user_id=u.id AND provider='google') AS google,EXISTS(SELECT 1 FROM social_identities WHERE user_id=u.id AND provider='github') AS github FROM sessions s JOIN users u ON u.id=s.user_id JOIN profiles p ON p.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND COALESCE(c.suspended,FALSE)=FALSE", [tokenHash, Date.now()]);
      if(user)user.account_role=user.is_owner?'owner':user.is_admin?'admin':user.is_support?'support':'user';
      return user;
    },
    async deleteSession(tokenHash) { await execute('DELETE FROM sessions WHERE token_hash=?', [tokenHash]); },
    async claimLoginAttempts(phone, ipHash) {
      const now = Date.now();
      await execute('DELETE FROM login_attempts WHERE expires_at<=?', [now]);
      return transaction(async connection => {
        for (const [key, limit] of [['ip:' + ipHash, 100], ['phone:' + phone, 5]]) {
          await connection.execute('INSERT INTO login_attempts(attempt_key,count,expires_at) VALUES(?,0,?) ON DUPLICATE KEY UPDATE attempt_key=attempt_key', [key, now + 900000]);
          const [[row]] = await connection.execute('SELECT count FROM login_attempts WHERE attempt_key=? FOR UPDATE', [key]);
          if (row.count >= limit) return false;
          await connection.execute('UPDATE login_attempts SET count=count+1 WHERE attempt_key=?', [key]);
        }
        return true;
      });
    },
    async clearLoginAttempts(phone) { await execute('DELETE FROM login_attempts WHERE attempt_key=?', ['phone:' + phone]); },
  };
};
