const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function openDatabase(filename = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'resumeit.sqlite')) {
  mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 2) { db.close(); throw new Error('Database belongs to a newer version of ResumeIt'); }
  if (version === 0) db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE CHECK(length(phone) = 11),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    CREATE TABLE profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    CREATE TABLE links (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      position INTEGER NOT NULL CHECK(position >= 0 AND position < 30),
      name TEXT NOT NULL, url TEXT NOT NULL,
      PRIMARY KEY (user_id, position)
    ) STRICT;
    PRAGMA user_version = 1;
    COMMIT;
  `);
  if (version < 2) db.exec(`
    BEGIN IMMEDIATE;
    ALTER TABLE users ADD COLUMN password_hash TEXT;
    CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    ) STRICT;
    PRAGMA user_version = 2;
    COMMIT;
  `);
  const userByPhone = db.prepare('SELECT id, phone, password_hash FROM users WHERE phone = ?');
  const userExists = db.prepare('SELECT id FROM users WHERE id = ?');
  const insertUser = db.prepare('INSERT INTO users (id, phone) VALUES (?, ?) ON CONFLICT(phone) DO NOTHING');
  const insertProfile = db.prepare('INSERT INTO profiles (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING');
  const profileByUser = db.prepare('SELECT name, role, bio FROM profiles WHERE user_id = ?');
  const linksByUser = db.prepare('SELECT name, url FROM links WHERE user_id = ? ORDER BY position');
  const updateProfile = db.prepare('UPDATE profiles SET name = ?, role = ?, bio = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?');
  const clearLinks = db.prepare('DELETE FROM links WHERE user_id = ?');
  const insertLink = db.prepare('INSERT INTO links (user_id, position, name, url) VALUES (?, ?, ?, ?)');
  function transaction(action) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = action(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function text(value, limit, required = false) {
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw new Error('Invalid profile text');
    return value.trim();
  }
  return {
    provisionAccount(phone, passwordHash) {
      if (!/^09\d{9}$/.test(phone) || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash)) throw new Error('Invalid account');
      return transaction(() => {
        insertUser.run(randomUUID(), phone);
        const user = userByPhone.get(phone);
        if (!user.password_hash) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
        insertProfile.run(user.id);
        return user.id;
      });
    },
    accountByPhone(phone) { return userByPhone.get(phone); },
    createSession(tokenHash, userId, expiresAt) {
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
      db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt);
    },
    session(tokenHash) {
      return db.prepare('SELECT users.id, users.phone FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?').get(tokenHash, Date.now());
    },
    deleteSession(tokenHash) { db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash); },
    // Call only after a server-side OTP verification; never accept this operation from the demo UI.
    userAfterVerifiedPhone(phone) {
      if (typeof phone !== 'string' || !/^09\d{9}$/.test(phone)) throw new Error('Invalid phone');
      return transaction(() => {
        insertUser.run(randomUUID(), phone);
        const { id } = userByPhone.get(phone);
        insertProfile.run(id);
        return id;
      });
    },
    getProfile(userId) {
      const profile = profileByUser.get(userId);
      return profile ? { ...profile, links: linksByUser.all(userId) } : null;
    },
    // userId must come from the authenticated server session, not a request body.
    saveProfile(userId, input) {
      if (!input || !Array.isArray(input.links) || input.links.length > 30) throw new Error('Invalid profile');
      const name = text(input.name, 80, true), role = text(input.role, 100, true), bio = text(input.bio, 500);
      const links = input.links.map(link => {
        const name = text(link?.name, 80, true), value = text(link?.url, 2048, true);
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid link URL');
        return { name, url: url.href };
      });
      transaction(() => {
        if (!userExists.get(userId)) throw new Error('Unknown user');
        updateProfile.run(name, role, bio, userId);
        clearLinks.run(userId);
        links.forEach((link, index) => insertLink.run(userId, index, link.name, link.url));
      });
    },
    close() { db.close(); }
  };
}
module.exports = { openDatabase };
