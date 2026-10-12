const mysql = require('mysql2/promise');
const { randomUUID, timingSafeEqual } = require('node:crypto');

async function openDatabase(options) {
  if (!options && (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD)) throw new Error('MySQL settings are required');
  const pool = mysql.createPool(options || {
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    connectionLimit: 4, queueLimit: 32, connectTimeout: 10000, charset: 'utf8mb4',
  });
  const execute = async (sql, params = []) => (await pool.execute(sql, params))[0];
  async function transaction(action) {
    const connection = await pool.getConnection();
    try { await connection.beginTransaction(); const result = await action(connection); await connection.commit(); return result; }
    catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
  try {
    for (const sql of [
      `CREATE TABLE IF NOT EXISTS users (id CHAR(36) PRIMARY KEY, phone CHAR(11) NOT NULL UNIQUE, password_hash VARCHAR(168), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS profiles (user_id CHAR(36) PRIMARY KEY, name VARCHAR(80) NOT NULL DEFAULT '', role VARCHAR(100) NOT NULL DEFAULT '', bio VARCHAR(500) NOT NULL DEFAULT '', updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS links (user_id CHAR(36) NOT NULL, position INT NOT NULL, name VARCHAR(80) NOT NULL, url VARCHAR(2048) NOT NULL, PRIMARY KEY(user_id,position), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS sessions (token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL, expires_at BIGINT NOT NULL, INDEX(expires_at), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS login_attempts (attempt_key VARCHAR(96) PRIMARY KEY, count INT NOT NULL, expires_at BIGINT NOT NULL, INDEX(expires_at)) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS otp_challenges (phone CHAR(11) PRIMARY KEY, challenge_id CHAR(36) NOT NULL UNIQUE, purpose VARCHAR(8) NOT NULL, code_hash CHAR(64) NOT NULL, status VARCHAR(10) NOT NULL, attempts INT NOT NULL DEFAULT 0, sent_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, registration_token CHAR(64), INDEX(expires_at)) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS social_identities (provider VARCHAR(8) NOT NULL, subject VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, user_id CHAR(36) NOT NULL, PRIMARY KEY(provider,subject), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS oauth_states (state_hash CHAR(64) PRIMARY KEY, provider VARCHAR(8) NOT NULL, verifier VARCHAR(43) NOT NULL, owner_id CHAR(36), expires_at BIGINT NOT NULL, INDEX(expires_at)) ENGINE=InnoDB`,
    ]) await execute(sql);
    const [phoneColumn]=await execute("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='phone'");
    if(phoneColumn.IS_NULLABLE==='NO')await execute('ALTER TABLE users MODIFY phone CHAR(11) NULL');
    for(const [table,column,type] of [['users','phone_verified','BOOLEAN NOT NULL DEFAULT FALSE'],['profiles','first_name',"VARCHAR(39) NOT NULL DEFAULT ''"],['profiles','last_name',"VARCHAR(39) NOT NULL DEFAULT ''"],['otp_challenges','owner_id','CHAR(36)']]) {
      const rows=await execute('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,column]);
      if(!rows.length)await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  } catch (error) { await pool.end(); throw error; }
  function text(value, limit, required = false) {
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw new Error('Invalid profile text');
    return value.trim();
  }
  const store = {
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
    async socialAccount(provider,subject,name,ownerId=null) {
      const lookup=async()=> (await execute('SELECT users.id,users.phone,users.password_hash FROM social_identities JOIN users ON users.id=user_id WHERE provider=? AND subject=?',[provider,subject]))[0];
      const existing=await lookup();if(existing){if(ownerId&&existing.id!==ownerId)throw new Error('Identity already linked');return existing;}
      try {
        return await transaction(async connection=>{
          const id=ownerId||randomUUID();
          if(!ownerId){await connection.execute('INSERT INTO users(id,phone,password_hash) VALUES(?,NULL,NULL)',[id]);await connection.execute('INSERT INTO profiles(user_id,name) VALUES(?,?)',[id,name]);}
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
    async verifyPhoneOtp(id,hash,userId,now) {
      return transaction(async connection=>{
        const [[row]]=await connection.execute("SELECT * FROM otp_challenges WHERE challenge_id=? AND purpose='phone' AND owner_id=? FOR UPDATE",[id,userId]);
        if(!row||row.status!=='ready'||row.expires_at<=now||row.attempts>=5)return null;
        await connection.execute('UPDATE otp_challenges SET attempts=attempts+1 WHERE challenge_id=?',[id]);
        if(!timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(hash,'hex')))return null;
        const [[existing]]=await connection.execute('SELECT id FROM users WHERE phone=?',[row.phone]);
        if(existing&&existing.id!==userId)return {existing:true};
        await connection.execute('UPDATE users SET phone=?,phone_verified=TRUE WHERE id=?',[row.phone,userId]);
        await connection.execute("UPDATE otp_challenges SET status='consumed' WHERE challenge_id=?",[id]);
        return {phone:row.phone};
      }).catch(error=>{if(error.code==='ER_DUP_ENTRY')return {existing:true};throw error;});
    },
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
        return true;
      });
    },
    async finishOtpSend(id, success) { await execute('UPDATE otp_challenges SET status=? WHERE challenge_id=? AND status=?',[success?'ready':'consumed',id,'pending']); },
    async verifyOtp(id, hash, purpose, grantHash, now) {
      return transaction(async connection => {
        const [[row]] = await connection.execute('SELECT * FROM otp_challenges WHERE challenge_id=? FOR UPDATE',[id]);
        if (!row || row.purpose !== purpose || row.status !== 'ready' || row.expires_at<=now || row.attempts>=5) return null;
        await connection.execute('UPDATE otp_challenges SET attempts=attempts+1 WHERE challenge_id=?',[id]);
        if (!timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(hash,'hex'))) return null;
        await connection.execute('UPDATE otp_challenges SET status=?,registration_token=?,expires_at=? WHERE challenge_id=?',[purpose!=='login'?'verified':'consumed',grantHash,now+300000,id]);
        return row.phone;
      });
    },
    async registrationValid(grantHash,now,purpose='register') { return (await execute("SELECT phone FROM otp_challenges WHERE registration_token=? AND purpose=? AND status='verified' AND expires_at>?",[grantHash,purpose,now])).length>0; },
    async resetPasswordVerified(grantHash,passwordHash,now) {
      return transaction(async connection => {
        const [[row]]=await connection.execute("SELECT * FROM otp_challenges WHERE registration_token=? AND purpose='reset' AND status='verified' FOR UPDATE",[grantHash]);
        if(!row||row.expires_at<=now)return null;
        const [[user]]=await connection.execute('SELECT id,phone FROM users WHERE phone=? FOR UPDATE',[row.phone]);
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
        return { id, phone: row.phone };
      });
    },
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
    async createSession(tokenHash, userId, expiresAt, expectedHash) {
      await execute('DELETE FROM sessions WHERE expires_at<=?', [Date.now()]);
      return transaction(async connection=>{
        const [[user]]=await connection.execute('SELECT password_hash FROM users WHERE id=? FOR UPDATE',[userId]);
        if(!user||(expectedHash!==undefined&&user.password_hash!==expectedHash))return false;
        await connection.execute('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', [tokenHash, userId, expiresAt]);
        return true;
      });
    },
    async session(tokenHash) { return (await execute("SELECT u.id,u.phone,u.phone_verified,p.first_name,p.last_name,EXISTS(SELECT 1 FROM social_identities WHERE user_id=u.id AND provider='google') AS google,EXISTS(SELECT 1 FROM social_identities WHERE user_id=u.id AND provider='github') AS github FROM sessions s JOIN users u ON u.id=s.user_id JOIN profiles p ON p.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?", [tokenHash, Date.now()]))[0]; },
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
    async getProfile(userId) {
      const profile = (await execute('SELECT name,role,bio FROM profiles WHERE user_id=?', [userId]))[0];
      return profile ? { ...profile, links: await execute('SELECT name,url FROM links WHERE user_id=? ORDER BY position', [userId]) } : null;
    },
    async saveProfile(userId, input) {
      if (!input || !Array.isArray(input.links) || input.links.length > 30) throw new Error('Invalid profile');
      const name = text(input.name,80,true), role = text(input.role,100,true), bio = text(input.bio,500);
      const links = input.links.map(link => {
        const name = text(link?.name,80,true), url = new URL(text(link?.url,2048,true));
        if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid URL');
        return { name, url: url.href };
      });
      await transaction(async connection => {
        const [[user]] = await connection.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [userId]);
        if (!user) throw new Error('Unknown user');
        await connection.execute('UPDATE profiles SET name=?,role=?,bio=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?', [name,role,bio,userId]);
        await connection.execute('DELETE FROM links WHERE user_id=?', [userId]);
        for (const [index,link] of links.entries()) await connection.execute('INSERT INTO links(user_id,position,name,url) VALUES(?,?,?,?)', [userId,index,link.name,link.url]);
      });
    },
    async importSqlite(filename) {
      const { DatabaseSync } = require('node:sqlite');
      if (!require('node:fs').existsSync(filename)) throw new Error('Migration source is missing');
      const source = new DatabaseSync(filename, { readOnly: true });
      try {
        source.exec('BEGIN');
        await transaction(async connection => {
          // One transaction preserves the old account IDs, hashes, profiles and active sessions.
          for (const [table,columns] of [['users',['id','phone','password_hash','created_at']],['profiles',['user_id','name','role','bio','updated_at']],['links',['user_id','position','name','url']],['sessions',['token_hash','user_id','expires_at']]]) {
            const rows = source.prepare('SELECT ' + columns.join(',') + ' FROM ' + table).all();
            for (const row of rows) {
              if (table === 'sessions' && row.expires_at <= Date.now()) continue;
              await connection.execute(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${columns[0]}=${columns[0]}`, columns.map(column => row[column]));
            }
          }
          for (const user of source.prepare('SELECT id,phone,password_hash FROM users').all()) {
            const [[saved]] = await connection.execute('SELECT id,password_hash FROM users WHERE phone=?', [user.phone]);
            if (saved.id !== user.id || saved.password_hash !== user.password_hash) throw new Error('Migration account conflict');
          }
        });
        return { users: source.prepare('SELECT count(*) AS count FROM users').get().count };
      } finally { source.close(); }
    },
    async close() { await pool.end(); },
  };
  return store;
}
module.exports = { openDatabase };
