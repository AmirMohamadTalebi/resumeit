const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { randomBytes, randomUUID } = require('node:crypto');
const { openDatabase } = require('./database.cjs');

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
    const hash = 'scrypt$' + randomBytes(16).toString('hex') + '$' + randomBytes(64).toString('hex');
    const { digest } = require('./auth.cjs');
    const now=Date.now(), challenge=randomUUID(), grant=digest('test-registration-grant');
    const reserved=await Promise.all(Array.from({length:4},()=>database.reserveOtp({id:challenge,phone:'09120000003',purpose:'register',hash:digest(challenge+'123456')},'otp-test-ip',now)));
    assert.equal(reserved.filter(Boolean).length,1);
    await database.finishOtpSend(challenge,true);
    assert.equal(await database.verifyOtp(challenge,digest(challenge+'123456'),'login',null,now),null);
    assert.equal(await database.verifyOtp(challenge,digest(challenge+'654321'),'register',grant,now),null);
    assert.equal(await database.verifyOtp(challenge,digest(challenge+'123456'),'register',grant,now),'09120000003');
    assert.equal(await database.verifyOtp(challenge,digest(challenge+'123456'),'register',grant,now),null);
    await database.close(); database=await openDatabase(config);
    assert(await database.registrationValid(grant,now));
    assert.equal(await database.registrationValid(grant,now+300001),false);
    const registered=await database.registerVerified(grant,hash,now);
    assert.equal(registered.phone,'09120000003');
    assert.equal(await database.registerVerified(grant,hash,now),null);
    assert.equal((await database.accountByPhone('09120000003')).password_hash,hash);
    for(const [phone,purpose,offset] of [['09120000004','login',0],['09120000005','login',0]]) {
      const id=randomUUID();assert(await database.reserveOtp({id,phone,purpose,hash:digest(id+'123456')},'otp-test-ip',now+offset));await database.finishOtpSend(id,true);
      if(phone==='09120000004') assert.equal(await database.verifyOtp(id,digest(id+'123456'),purpose,null,now+120001),null);
      else { for(let i=0;i<5;i++)assert.equal(await database.verifyOtp(id,digest(id+'654321'),purpose,null,now),null);assert.equal(await database.verifyOtp(id,digest(id+'123456'),purpose,null,now),null); }
    }
    const id = await database.provisionAccount('09120000001', hash);
    await database.provisionAccount('09120000001', 'scrypt$' + randomBytes(16).toString('hex') + '$' + randomBytes(64).toString('hex'));
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
    console.log('PASS: MySQL persistence, atomic profiles, secure sessions, OTP across restarts, replay/expiry/attempt protection, verified registration, concurrent limits and repeatable SQLite migration.');
  } finally {
    if (database) await database.close();
    await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end();
  }
})().catch(error => { console.error('MySQL check failed:', error.code || error.name); process.exitCode = 1; });
