const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { randomBytes, randomUUID } = require('node:crypto');
const { openDatabase } = require('../src/database/database.cjs');

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
process.env.OWNER_PHONE = '09120000777';
// Money paths under real MySQL row locks: requests that arrive together must never spend the same credit twice,
// pass a cap together or deadlock. SQLite runs transactions one after another, so only a real server proves this.
(async () => {
  const options = { host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD };
  const name = 'resumeit_races_' + randomBytes(6).toString('hex');
  const admin = await mysql.createConnection(options);
  let database;
  try {
    await admin.query('CREATE DATABASE `' + name + '`');
    database = await openDatabase({ ...options, database: name, connectionLimit: 12 });
    await admin.query('USE `' + name + '`');
    const sql = async (query, params) => (await admin.query(query, params))[0];
    const hash = 'scrypt$' + randomBytes(16).toString('hex') + '$' + randomBytes(64).toString('hex');
    const person = await database.provisionAccount('09120000101', hash), agent = await database.provisionAccount('09120000102', hash), fresh = await database.provisionAccount('09120000103', hash);
    const people = await Promise.all(Array.from({ length: 6 }, (_, i) => database.provisionAccount('0912000020' + i, hash)));

    // Fandogh: ten credits at once to a wallet that does not exist yet all land, without a deadlock.
    const gifts = await Promise.allSettled(Array.from({ length: 10 }, () => database.creditFandogh(fresh, 1000, 'gift', null, 'هدیه')));
    assert(gifts.every(r => r.status === 'fulfilled'), 'parallel credits: ' + gifts.map(r => r.status === 'fulfilled' ? 'ok' : r.reason.code).join(','));
    assert.equal((await database.fandoghWallet(fresh)).balance, 10000);

    // Fandogh: 50,000 rial covers two holds of 20,000; ten parallel holds take two, never more, never deadlock.
    assert.equal(await database.creditFandogh(person, 50000, 'welcome', 'welcome:' + person, 'هدیه'), true);
    const holds = await Promise.allSettled(Array.from({ length: 10 }, () => database.holdFandogh(person, 20000, { model: 'luna', label: 'GPT-6 Luna', input: 8000, output: 2000 })));
    assert(holds.every(r => r.status === 'fulfilled'), 'parallel holds: ' + holds.map(r => r.status === 'fulfilled' ? 'ok' : r.reason.code).join(','));
    const taken = holds.map(r => r.value).filter(Boolean);
    assert.equal(taken.length, 2, 'parallel holds cannot spend the same credit twice');
    assert.equal((await database.fandoghWallet(person)).balance, 10000);
    await Promise.all(taken.map(id => database.settleFandogh(person, id, 0)));
    assert.equal((await database.fandoghWallet(person)).balance, 50000, 'returned holds give the money back');

    // Fandogh top-up: the same request id sent five times at once moves It only once.
    await sql('INSERT IGNORE INTO wallets(user_id,balance_units) VALUES(?,0)', [person]);
    await sql('UPDATE wallets SET balance_units=? WHERE user_id=?', [100000, person]);
    const requestId = randomUUID().replace(/-/g, '');
    const tops = await Promise.allSettled(Array.from({ length: 5 }, () => database.topUpFandogh(person, 10, requestId)));
    assert(tops.some(r => r.status === 'fulfilled'));
    assert.equal(Number((await sql('SELECT balance_units FROM wallets WHERE user_id=?', [person]))[0].balance_units), 80000, 'one top-up, not five');

    // Support credit: an agent with a 1,000,000 toman daily cap sends six 200,000 credits at once to six people.
    await sql('INSERT INTO support_accounts(user_id) VALUES(?)', [agent]);
    const credits = await Promise.allSettled(people.map((id, i) => database.supportCredit(agent, id, { toman: 200000, reason: 'جبران پرداخت ' + i, requestId: randomUUID() })));
    assert.equal(credits.filter(r => r.status === 'fulfilled').length, 5, 'parallel credits stop at the daily cap: ' + credits.map(r => r.status === 'fulfilled' ? 'ok' : r.reason?.code || r.reason?.message).join(' | '));
    assert(credits.filter(r => r.status === 'rejected').every(r => r.reason.status === 403));

    // Promotional email: the audience is frozen at the start, only opted-in verified addresses are in it, and an opt-out stops that person at once.
    for (const [i, id] of people.slice(0, 3).entries()) { await database.notificationChannels(id); await sql('UPDATE notification_channels SET email=?,email_verified=TRUE WHERE user_id=?', ['p' + i + '@example.com', id]); }
    await database.saveMarketingConsent(people[0], true, 'settings'); await database.saveMarketingConsent(people[1], true, 'prompt');
    assert.equal((await database.marketingStats()).audience, 2);
    const campaign = await database.createMarketingCampaign(agent, { title: 'قالب تازه', body: 'چند قالب جدید اضافه شد.', cta: 'ببین', url: '/dashboard/' });
    assert.equal(await database.startMarketingCampaign(campaign), 2);
    await assert.rejects(database.startMarketingCampaign(campaign), /قبلاً/);
    await database.saveMarketingConsent(people[1], false, 'link');
    const batch = await database.marketingBatch(10); assert.deepEqual(batch.map(r => r.user_id), [people[0]], 'an opt-out is skipped immediately');
    await database.finishMarketingSend(campaign, people[0], true); await database.skipUnsubscribedMarketing();
    const done = await database.marketingCampaign(campaign); assert.equal(done.status, 'done'); assert.equal(Number(done.sent), 1);

    console.log('PASS MySQL races: parallel Fandogh credits, holds and repeated top-ups and an agent\'s parallel wallet credits all hold under real row locks, without deadlocks.');
  } finally {
    if (database) await database.close();
    await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end();
  }
})().catch(error => { console.error('MySQL races check failed:', error.code === 'ERR_ASSERTION' ? error.stack : [error.code || error.name, error.sql || '', error.message || ''].join(' ')); process.exitCode = 1; });
