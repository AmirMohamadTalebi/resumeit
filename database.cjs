const mysql = require('mysql2/promise');
const { randomUUID } = require('node:crypto');

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
    ]) await execute(sql);
  } catch (error) { await pool.end(); throw error; }
  function text(value, limit, required = false) {
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw new Error('Invalid profile text');
    return value.trim();
  }
  const store = {
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
    async createSession(tokenHash, userId, expiresAt) {
      await execute('DELETE FROM sessions WHERE expires_at<=?', [Date.now()]);
      await execute('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', [tokenHash, userId, expiresAt]);
    },
    async session(tokenHash) { return (await execute('SELECT users.id,users.phone FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?', [tokenHash, Date.now()]))[0]; },
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
