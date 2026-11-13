// Invite rewards on real MySQL (council N1-a, docs/council/ACTIVATION.md): codes, sign-up attach, publish + 7 days,
// It-only rewards, per-inviter monthly cap, monthly budget, 24-hour brake, kill switch, shared mailbox, parallel passes.
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { randomBytes } = require('node:crypto');
const { openDatabase } = require('../src/database/database.cjs');

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
process.env.OWNER_PHONE = '09120000777';
(async () => {
  const options = { host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD };
  const name = 'resumeit_referral_' + randomBytes(6).toString('hex'), admin = await mysql.createConnection(options);
  let database;
  try {
    await admin.query('CREATE DATABASE `' + name + '`');
    database = await openDatabase({ ...options, database: name, connectionLimit: 12 });
    await admin.query('USE `' + name + '`');
    const sql = async (q, p) => (await admin.query(q, p))[0];
    const hash = 'scrypt$' + randomBytes(16).toString('hex') + '$' + randomBytes(64).toString('hex');
    let n = 0; const phone = () => '0912' + String(1000000 + (n++)).padStart(7, '0');
    const user = () => database.provisionAccount(phone(), hash);
    const units = async id => Number((await sql('SELECT balance_units FROM wallets WHERE user_id=?', [id]))[0]?.balance_units || 0);
    const publish = (id, status = 'published') => sql('INSERT INTO dashboard_documents(user_id,draft,preferences,pub,published) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE pub=VALUES(pub)', [id, '{}', '{}', JSON.stringify({ resume: { status } }), '{}']);
    const verify = id => sql('UPDATE users SET phone_verified=TRUE WHERE id=?', [id]);
    const IT = 2000, DAY = 864e5, t0 = Date.UTC(2026, 10, 10, 12);
    // A friend signs up through a real new-account path (Google/GitHub identity) carrying the inviter's code.
    const friend = async (inviter, code) => (await database.socialAccount('google', String(100000 + (n++)), 'دوست', null, code)).id;
    const invite = async inviter => { const code = await database.referralCode(inviter); const id = await friend(inviter, code); await verify(id); await publish(id); return id; };

    // 1. Codes: eight characters, stable, and 20 parallel first calls agree on one code.
    const a = await user(); const codes = await Promise.all(Array.from({ length: 20 }, () => database.referralCode(a)));
    assert.equal(new Set(codes).size, 1); assert.match(codes[0], /^[a-z0-9]{8}$/); assert.equal(await database.referralCode(a), codes[0]);

    // 2. Attach: a good code links the friend; garbage, unknown and own codes are ignored without failing the sign-up.
    const f1 = await friend(a, codes[0]);
    assert.equal((await sql('SELECT inviter_id FROM referrals WHERE invitee_id=?', [f1]))[0].inviter_id, a);
    for (const bad of ['', 'nope', 'ZZZZZZZZ', 'abcd2345', "a'; DROP", null, undefined]) { const id = await friend(a, bad); assert.equal((await sql('SELECT 1 FROM referrals WHERE invitee_id=?', [id])).length, 0, 'ignored: ' + bad); }
    assert.equal((await sql('SELECT 1 FROM referrals WHERE inviter_id=invitee_id')).length, 0, 'never self');

    // 2b. The phone sign-up path attaches the cookie's code too (registerVerified inside its own transaction).
    const phoneSignup = async (code, number) => { const grant = randomBytes(32).toString('hex'), { digest } = require('../src/auth/auth.cjs'); await sql("INSERT INTO otp_challenges(phone,challenge_id,purpose,code_hash,status,sent_at,expires_at,registration_token) VALUES(?,UUID(),'register','x','verified',?,?,?)", [number, Date.now(), Date.now() + 6e5, digest(grant)]); return database.registerVerified(digest(grant), hash, Date.now(), code); };
    const viaPhone = await phoneSignup(codes[0], '09131110001'); assert.equal((await sql('SELECT inviter_id FROM referrals WHERE invitee_id=?', [viaPhone.id]))[0].inviter_id, a, 'phone sign-up attached');
    const noCode = await phoneSignup(undefined, '09131110002'); assert.equal((await sql('SELECT 1 FROM referrals WHERE invitee_id=?', [noCode.id])).length, 0, 'no code, no row');
    const badCode = await phoneSignup('Not-A-Code', '09131110003'); assert(badCode.id, 'a bad code never blocks sign-up'); assert.equal((await sql('SELECT 1 FROM referrals WHERE invitee_id=?', [badCode.id])).length, 0);

    // 3. Nothing is paid before the friend publishes with a verified phone or email.
    let r = await database.processReferrals(t0); assert.equal(r.invitee, 0); assert.equal(await units(f1), 0);
    await publish(f1); r = await database.processReferrals(t0); assert.equal(r.invitee, 0, 'published but not verified');
    await verify(f1); r = await database.processReferrals(t0); assert.equal(r.invitee, 1); assert.equal(await units(f1), 1 * IT);
    assert.equal((await sql("SELECT COUNT(*) n FROM user_notifications WHERE user_id=? AND reference LIKE 'referral-note:%'", [f1]))[0].n, 1);

    // 4. Passes again, even 10 in parallel, pay the friend once; nothing counts before 7 days.
    await Promise.all(Array.from({ length: 10 }, () => database.processReferrals(t0 + 1000)));
    assert.equal(await units(f1), 1 * IT); assert.equal(Number((await sql('SELECT COUNT(*) n FROM referrals WHERE counted_at IS NOT NULL'))[0].n), 0);
    await database.processReferrals(t0 + 6 * DAY); assert.equal(Number((await sql('SELECT COUNT(*) n FROM referrals WHERE counted_at IS NOT NULL'))[0].n), 0, 'day 6');
    await database.processReferrals(t0 + 7 * DAY); assert.equal(Number((await sql('SELECT COUNT(*) n FROM referrals WHERE counted_at IS NOT NULL'))[0].n), 1, 'day 7');

    // 5. An unpublished friend is not counted; three counted friends pay the inviter 25 It once.
    const f2 = await invite(a), f3 = await invite(a);
    await database.processReferrals(t0 + 8 * DAY);                      // f2, f3 publish "now" (t0+8d)
    assert.equal(await units(a), 0, 'two counted friends are not enough');
    await publish(f3, 'draft');                                         // f3 takes the page down before the settle day
    await database.processReferrals(t0 + 15 * DAY);
    assert.equal(await units(a), 0, 'an unpublished friend does not count');
    await publish(f3); await database.processReferrals(t0 + 16 * DAY); await database.processReferrals(t0 + 23 * DAY);
    assert.equal(await units(a), 25 * IT, 'the third success pays 25 It');
    await Promise.all(Array.from({ length: 6 }, () => database.processReferrals(t0 + 24 * DAY))); assert.equal(await units(a), 25 * IT, 'no double payment');
    assert.equal((await sql("SELECT COUNT(*) n FROM user_notifications WHERE user_id=? AND reference LIKE 'referral-tier-note:%'", [a]))[0].n, 1);
    const stats = await database.referralStats(a, t0 + 24 * DAY); assert.equal(stats.counted, 3); assert.equal(stats.earned, 25); assert.equal(stats.untilNext, 3);

    // 6. Monthly cap: nine counted friends are three tiers but only two are paid per month; the third waits for next month.
    const b = await user(); for (let i = 0; i < 9; i++) await invite(b);
    const T = Date.UTC(2027, 0, 5, 12);
    await database.processReferrals(T); await database.processReferrals(T + 7 * DAY + 1);   // all counted on Jan 12 (still January)
    assert.equal(await units(b), 2 * 25 * IT, 'two tiers in the month');
    await database.processReferrals(Date.UTC(2027, 1, 2)); assert.equal(await units(b), 3 * 25 * IT, 'the third tier next month');

    // 7. Shared mailbox: a friend whose verified email is the inviter's, or another rewarded friend's, gets nothing.
    const c = await user(), ce = 'shared@example.com';
    await sql('INSERT INTO notification_channels(user_id,email,email_verified,enabled_at) VALUES(?,?,TRUE,?)', [c, ce, T]);
    const same = await invite(c); await sql('INSERT INTO notification_channels(user_id,email,email_verified,enabled_at) VALUES(?,?,TRUE,?)', [same, ce, T]);
    await database.processReferrals(T + 40 * DAY); assert.equal(await units(same), 0, 'same mailbox as the inviter');
    const d = await user(), e1 = await invite(d), e2 = await invite(d);
    for (const [id, mail] of [[e1, 'twin@example.com'], [e2, 'twin@example.com']]) await sql('INSERT INTO notification_channels(user_id,email,email_verified,enabled_at) VALUES(?,?,TRUE,?)', [id, mail, T]);
    await database.processReferrals(T + 41 * DAY); assert.equal((await units(e1)) + (await units(e2)), 1 * IT, 'one reward per mailbox');

    // 8. Kill switch: with the programme off nothing is paid, and turning it on again resumes.
    const s = require('../src/owner/settings.cjs').defaults();
    const setting = value => sql('INSERT INTO commerce_settings(id,settings) VALUES(1,?) ON DUPLICATE KEY UPDATE settings=VALUES(settings)', [JSON.stringify({ ...s, referral: value })]);
    await setting({ on: false, monthlyBudget: 500 });
    const g = await user(), g1 = await invite(g); assert.equal((await database.processReferrals(T + 50 * DAY)).skipped, 'off'); assert.equal(await units(g1), 0);
    await setting({ on: true, monthlyBudget: 500 }); await database.processReferrals(T + 51 * DAY); assert.equal(await units(g1), 1 * IT);

    // 9. Budget: a 3 It month stops after three rewards, whoever is next.
    const budgetMonth = Date.UTC(2027, 5, 10, 12); await setting({ on: true, monthlyBudget: 3 });
    const h = await user(), hs = []; for (let i = 0; i < 5; i++) hs.push(await invite(h));
    await database.processReferrals(budgetMonth);
    const paid = (await Promise.all(hs.map(units))).filter(x => x === IT).length; assert.equal(paid, 3, 'budget of 3 It pays three friends');
    const spent = Number((await sql("SELECT COALESCE(SUM(delta_units),0) u FROM wallet_transactions WHERE reference LIKE 'referral%' AND created_at>=?", [Date.UTC(2027, 5, 1)]))[0].u);
    assert(spent <= 3 * IT, 'never above the budget');

    // 10. Brake: more than 10 inviter rewards in 24 hours switch the programme off and notify the admins.
    await setting({ on: true, monthlyBudget: 100000 });
    const boss = await user(); await sql('INSERT INTO admin_accounts(user_id) VALUES(?)', [boss]);
    const J = Date.UTC(2027, 8, 1, 12); const inviters = [];
    for (let i = 0; i < 12; i++) { const who = await user(); inviters.push(who); for (let k = 0; k < 3; k++) await invite(who); }
    await database.processReferrals(J); const run = await database.processReferrals(J + 7 * DAY + 1);
    assert.equal(run.braked, true, 'the brake fires'); const given = (await Promise.all(inviters.map(units))).filter(x => x >= 25 * IT).length; assert.equal(given, 10, 'ten rewards went out before the stop');
    assert.equal((await sql('SELECT settings FROM commerce_settings WHERE id=1'))[0].settings.referral.on, false, 'switched off');
    assert.equal((await sql("SELECT COUNT(*) n FROM user_notifications WHERE user_id=? AND reference LIKE 'referral-brake:%'", [boss]))[0].n, 1, 'admin told once');
    assert.equal((await database.processReferrals(J + 8 * DAY)).skipped, 'off');

    // 11. Deleting an account removes its invitations; the stats stay readable for people with none.
    await sql('DELETE FROM users WHERE id=?', [d]); assert.equal((await sql('SELECT COUNT(*) n FROM referrals WHERE inviter_id=?', [d]))[0].n, 0);
    assert.equal((await database.referralStats(await user())).invited, 0);
    console.log('PASS referrals (MySQL): code stability under 20 parallel calls, attach (bad/unknown/self ignored), pay only after publish + verified, once under parallel passes, 7-day settle, unpublished friends skipped, 25 It per 3, monthly cap of 2, shared mailbox, kill switch, monthly budget, 24h brake with admin notice, cascade on delete.');
  } finally {
    await database?.close?.(); await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end();
  }
})().catch(error => { console.error(error); process.exit(1); });
