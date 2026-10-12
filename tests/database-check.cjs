const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { randomBytes, randomUUID } = require('node:crypto');
const { openDatabase } = require('../src/database/database.cjs');

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
    const { digest } = require('../src/auth/auth.cjs');
    const socialAccounts=await Promise.all(Array.from({length:4},()=>database.socialAccount('google','9000001','Test User')));
    assert.equal(new Set(socialAccounts.map(u=>u.id)).size,1);const socialId=socialAccounts[0].id;assert.equal(socialAccounts[0].phone,null);
    await database.createOAuthState(digest('oauth-test-state'),'google','v'.repeat(43),Date.now()+600000,socialId);
    await database.close();database=await openDatabase(config);
    const consumed=await Promise.all(Array.from({length:4},()=>database.consumeOAuthState(digest('oauth-test-state'),'google',Date.now())));
    assert.equal(consumed.filter(Boolean).length,1);assert.equal(consumed.find(Boolean).owner_id,socialId);
    await database.setAccountNames(socialId,'سارا','محمدی');
    const phoneProof=randomUUID(),proofTime=Date.now();
    assert(await database.reserveOtp({id:phoneProof,phone:'09120000991',purpose:'phone',hash:digest(phoneProof+'123456'),ownerId:socialId},'social-phone-ip',proofTime));
    await database.finishOtpSend(phoneProof,true);
    assert.equal(await database.verifyPhoneOtp(phoneProof,digest(phoneProof+'123456'),randomUUID(),proofTime),null);
    assert.equal((await database.verifyPhoneOtp(phoneProof,digest(phoneProof+'123456'),socialId,proofTime)).phone,'09120000991');
    assert.equal(await database.verifyPhoneOtp(phoneProof,digest(phoneProof+'123456'),socialId,proofTime),null);
    assert.equal((await database.socialAccount('github','9000002','',socialId)).id,socialId);
    const otherSocial=await database.socialAccount('google','9000003','Another');
    await assert.rejects(database.socialAccount('github','9000002','',otherSocial.id));
    assert.equal(await database.unlinkSocial(otherSocial.id,'google'),false);
    await database.createSession('f'.repeat(64),socialId,Date.now()+60000,null);
    const verifiedSocial=await database.session('f'.repeat(64));assert.equal(verifiedSocial.first_name,'سارا');assert.equal(verifiedSocial.last_name,'محمدی');assert.equal(verifiedSocial.phone_verified,1);assert.equal(verifiedSocial.github,1);
    const now=Date.now(), challenge=randomUUID(), grant=digest('test-registration-grant');
    const reserved=await Promise.all(Array.from({length:4},()=>database.reserveOtp({id:challenge,phone:'09120000003',purpose:'register',hash:digest(challenge+'123456')},'otp-test-ip',now)));
    assert.equal(reserved.filter(Boolean).length,1);
    await database.finishOtpSend(challenge,true);
    assert.equal(await database.verifyOtp(challenge,digest(challenge+'123456'),'login',null,now),null);
    assert.equal(await database.verifyOtp(challenge,digest(challenge+'654321'),'register',grant,now),null);
    assert.equal((await database.verifyOtp(challenge,digest(challenge+'123456'),'register',grant,now)).phone,'09120000003');
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
    const resetId=randomUUID(),resetGrant=digest('reset-grant'),newHash='scrypt$'+randomBytes(16).toString('hex')+'$'+randomBytes(64).toString('hex');
    assert(await database.reserveOtp({id:resetId,phone:'09120000001',purpose:'reset',ownerId:id,hash:digest(resetId+'123456')},'reset-ip',now));
    await database.finishOtpSend(resetId,true);
    await database.verifyOtp(resetId,digest(resetId+'123456'),'reset',resetGrant,now);
    await database.close();database=await openDatabase(config);
    assert(await database.registrationValid(resetGrant,now,'reset'));
    assert.equal(await database.registrationValid(resetGrant,now),false);
    assert.equal(await database.resetPasswordVerified(resetGrant,newHash,now+300001),null);
    await database.createSession('c'.repeat(64),id,Date.now()+60000,hash);
    assert.equal((await database.resetPasswordVerified(resetGrant,newHash,now)).password_hash,newHash);
    assert.equal(await database.session('c'.repeat(64)),undefined);
    assert.equal(await database.resetPasswordVerified(resetGrant,hash,now),null);
    assert.equal(await database.createSession('d'.repeat(64),id,Date.now()+60000,hash),false);
    assert(await database.createSession('e'.repeat(64),id,Date.now()+60000,newHash));
    assert.equal(await database.createSession('9'.repeat(64),id,Date.now()+60000,newHash,'09120000999'),false);
    const oldProof=randomUUID(),oldGrant=digest('old-phone-reset'),replacement=randomUUID();
    assert(await database.reserveOtp({id:oldProof,phone:'09120000001',purpose:'reset',ownerId:id,hash:digest(oldProof+'123456')},'phone-change-test',now+60001));
    await database.finishOtpSend(oldProof,true);
    await database.verifyOtp(oldProof,digest(oldProof+'123456'),'reset',oldGrant,now+60001);
    assert(await database.reserveOtp({id:replacement,phone:'09120000888',purpose:'phone',ownerId:id,hash:digest(replacement+'123456')},'phone-change-test',now+60001));
    await database.finishOtpSend(replacement,true);
    await database.createSession('8'.repeat(64),id,Date.now()+60000,newHash);
    assert((await database.verifyPhoneOtp(replacement,digest(replacement+'123456'),id,now+60001,'e'.repeat(64))).phone);
    assert.equal(await database.session('8'.repeat(64)),undefined);
    assert(await database.session('e'.repeat(64)));
    assert.equal(await database.registrationValid(oldGrant,now+60001,'reset'),false);
    await database.provisionAccount('09120000001',hash);
    assert.equal(await database.resetPasswordVerified(oldGrant,hash,now+60001),null);
    const dashModel=require('../src/dashboard/model.cjs'),draft=dashModel.initial().content;draft.slug='mysql-profile';draft.profile.name='Persistent';draft.links.items=[{id:'one',type:'link',title:'Site',url:'https://example.com',icon:'link',active:true,featured:false}];
    const owner=(await database.accountByPhone('09120000001')).id;
    await database.mutateDashboard(owner,0,d=>{d.content=dashModel.content(draft);d.slug=draft.slug;});
    await database.close();database=await openDatabase(config);assert.equal((await database.loadDashboard(owner)).content.profile.name,'Persistent');
    await assert.rejects(database.mutateDashboard(owner,0,()=>{}),e=>e.status===409);
    const rival=await database.provisionAccount('09120000008',hash);await assert.rejects(database.mutateDashboard(rival,0,d=>{d.slug=draft.slug;}),e=>e.status===409);
    await database.mutateDashboard(owner,1,d=>{d.published.links=structuredClone(d.content);d.pub.links.status='published';});
    assert.equal((await database.publicPage('mysql-profile','links')).content.links.items[0].title,'Site');
    await database.recordMetric(owner,'links');await database.recordMetric(owner,'click','one');assert.equal((await database.dashboardStats(owner)).length,2);
    await database.deleteAccount(rival);assert.equal(await database.accountByPhone('09120000008'),undefined);
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
    console.log('PASS: MySQL persistence, concurrent social identities, bound single-use OAuth/phone proof, names/verified phone, unlink protection, atomic profiles, secure sessions, OTP across restarts, replay/expiry/attempt protection, verified registration, password reset and session revocation, concurrent limits and repeatable SQLite migration.');
  } finally {
    if (database) await database.close();
    await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end();
  }
})().catch(error => { console.error('MySQL check failed:', error.code === 'ERR_ASSERTION' ? error.stack : error.code || error.name); process.exitCode = 1; });
