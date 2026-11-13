// Subscription end reminders on real MySQL: right window, latest plan wins, one notice per stage even with parallel ticks.
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { randomBytes } = require('node:crypto');
const { openDatabase } = require('../src/database/database.cjs');
const notifications = require('../src/notifications/service.cjs');

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
process.env.OWNER_PHONE = '09120000777';
(async () => {
  const options = { host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD };
  const name = 'resumeit_check_' + randomBytes(6).toString('hex'), admin = await mysql.createConnection(options);
  let database, raw;
  try {
    await admin.query('CREATE DATABASE `' + name + '`');
    database = await openDatabase({ ...options, database: name, connectionLimit: 8 });
    raw = await mysql.createConnection({ ...options, database: name });
    const hash = 'scrypt$' + randomBytes(16).toString('hex') + '$' + randomBytes(64).toString('hex');
    const user = phone => database.provisionAccount(phone, hash);
    const [a, b, c, d] = [await user('09120000101'), await user('09120000102'), await user('09120000103'), await user('09120000104')];
    const day = 864e5, now = Date.now();
    const grant = (id, ref, end) => raw.execute('INSERT INTO account_access(user_id,ref,price_units,expires_at,created_at) VALUES(?,?,0,?,?) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at)', [id, ref, end, now]);
    await grant(a, 'subscription:m3', now + 5 * day);                                             // in the 7-day window
    await grant(b, 'subscription:m3', now + 2 * day); await grant(b, 'subscription:m12', now + 30 * day); // a longer plan still runs
    await grant(c, 'subscription:m6', now + 20 * 36e5);                                           // ends tomorrow
    await grant(d, 'subscription:m3', now - day); await grant(d, 'rt:vista', null);               // already over; a bought template is not a plan
    const notes = async id => (await raw.execute("SELECT title,kind,reference FROM user_notifications WHERE user_id=? AND reference LIKE 'sub-end:%' ORDER BY created_at", [id]))[0];
    const service = () => notifications(database, { provider: { available: {}, publicKey: '' } });

    const due = await database.dueSubscriptionReminders(now);
    assert.deepEqual(due.map(r => [r.userId, r.stage]).sort(), [[a, 7], [c, 1]].sort(), 'only users whose latest plan ends within 7 days');

    // Ten services racing on the same hour still leave one notice per user and stage.
    await Promise.all(Array.from({ length: 10 }, () => service().subscriptionReminders(now)));
    assert.equal((await notes(a)).length, 1); assert.match((await notes(a))[0].title, /یک هفته/); assert.equal((await notes(a))[0].kind, 'payments');
    assert.equal((await notes(c)).length, 1); assert.match((await notes(c))[0].title, /فردا/);
    assert.equal((await notes(b)).length, 0, 'a user with a longer running plan is not warned');
    assert.equal((await notes(d)).length, 0, 'an expired plan is not warned');

    // The same service waits an hour between passes; a later pass on the same stage adds nothing.
    const s = service(); await s.subscriptionReminders(now); await s.subscriptionReminders(now + 1000);
    await s.subscriptionReminders(now + 2 * 36e5); assert.equal((await notes(a)).length, 1);

    // Six days later A reaches the last day and gets the second notice.
    await service().subscriptionReminders(now + 4.5 * day);
    assert.deepEqual((await notes(a)).map(n => n.reference.split(':').pop()), ['7', '1']);

    // Renewing moves the end, so the next cycle warns again.
    await grant(a, 'subscription:m3', now + 40 * day);
    assert.equal((await database.dueSubscriptionReminders(now + 4.5 * day)).some(r => r.userId === a), false, 'renewed plan is out of the window');
    await service().subscriptionReminders(now + 34 * day);
    assert.equal((await notes(a)).length, 3, 'a fresh reminder for the renewed period');
    console.log('PASS subscription reminders (MySQL): 7-day and 1-day stages, latest plan wins, expired and bought items skipped, 10 parallel passes make one notice, hourly throttle, renewal starts a new cycle.');
  } finally {
    await raw?.end(); await database?.close?.(); await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end();
  }
})().catch(error => { console.error(error); process.exit(1); });
