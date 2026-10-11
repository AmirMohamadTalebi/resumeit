const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { randomBytes, randomUUID } = require('node:crypto');
const { openDatabase } = require('./database.cjs');
const { hashPassword } = require('./auth.cjs');
try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
(async () => {
  const options = { host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD };
  const name = 'resumeit_check_' + randomBytes(6).toString('hex');
  const admin = await mysql.createConnection(options);
  let database;
  try {
    await admin.query('CREATE DATABASE `' + name + '`');
    const config = { ...options, database: name, connectionLimit: 4 };
    database = await openDatabase(config);
    const hash = await hashPassword('AuthFixture123!');
    const id = await database.provisionAccount('09120000001', hash);
    await database.provisionAccount('09120000001', await hashPassword('Different123!'));
    assert.equal((await database.accountByPhone('09120000001')).password_hash, hash);
    const profile = { name: "O'Reilly", role: 'Developer', bio: '', links: [{ name: 'Site', url: 'https://example.com/' }] };
    await database.saveProfile(id, profile);
    await assert.rejects(database.saveProfile(id, { ...profile, name: '  ' }));
    await assert.rejects(database.saveProfile(id, { ...profile, links: [{ name:'Bad',url:'javascript:alert(1)' }] }));
    await database.createSession('a'.repeat(64), id, Date.now() + 60000);
    await database.close(); database = await openDatabase(config);
    assert.deepEqual(await database.getProfile(id), profile);
    assert.equal((await database.session('a'.repeat(64))).id, id);
    await database.createSession('b'.repeat(64), id, Date.now() - 1);
    assert.equal(await database.session('b'.repeat(64)), undefined);
    await database.deleteSession('a'.repeat(64)); assert.equal(await database.session('a'.repeat(64)), undefined);
    const attempts = await Promise.all(Array.from({ length: 8 }, () => database.claimLoginAttempts('09120000001','test-ip')));
    assert.equal(attempts.filter(Boolean).length,5);
    await database.clearLoginAttempts('09120000001'); assert(await database.claimLoginAttempts('09120000001','test-ip'));
    const { DatabaseSync } = require('node:sqlite');
    const filename = require('node:path').join(require('node:os').tmpdir(),name + '.sqlite');
    const source = new DatabaseSync(filename), oldId = randomUUID();
    try {
      source.exec(`CREATE TABLE users(id TEXT,phone TEXT,password_hash TEXT,created_at TEXT);
        CREATE TABLE profiles(user_id TEXT,name TEXT,role TEXT,bio TEXT,updated_at TEXT);
        CREATE TABLE links(user_id TEXT,position INTEGER,name TEXT,url TEXT);
        CREATE TABLE sessions(token_hash TEXT,user_id TEXT,expires_at INTEGER);`);
      source.prepare("INSERT INTO users VALUES (?,?,?, '2026-01-01 00:00:00')").run(oldId,'09120000002',hash);
    } finally { source.close(); }
    try {
      assert.equal((await database.importSqlite(filename)).users,1);
      assert.equal((await database.accountByPhone('09120000002')).id,oldId);
      assert.equal((await database.accountByPhone('09120000002')).password_hash,hash);
      await database.importSqlite(filename);
    } finally { require('node:fs').unlinkSync(filename); }
    console.log('PASS: MySQL persistence, atomic profiles, secure sessions, concurrent attempt limits and repeatable SQLite migration.');
  } finally {
    if (database) await database.close();
    await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end();
  }
})().catch(error => { console.error('MySQL check failed:', error.code || error.name); process.exitCode = 1; });
