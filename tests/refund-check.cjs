// Staff refunds on real MySQL (council decision, docs/council/ACTIVATION.md): window, in-use check, gifts, cap,
// owner override, kill switch, idempotency, parallel requests and a refund racing a save that selects the item.
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { randomBytes, randomUUID } = require('node:crypto');
const { openDatabase } = require('../src/database/database.cjs');

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
process.env.OWNER_PHONE = '09120000777';
(async () => {
  const options = { host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD };
  const name = 'resumeit_refund_' + randomBytes(6).toString('hex'), admin = await mysql.createConnection(options);
  let database;
  try {
    await admin.query('CREATE DATABASE `' + name + '`');
    database = await openDatabase({ ...options, database: name, connectionLimit: 16 });
    await admin.query('USE `' + name + '`');
    const sql = async (q, p) => (await admin.query(q, p))[0];
    const hash = 'scrypt$' + randomBytes(16).toString('hex') + '$' + randomBytes(64).toString('hex');
    const [user, agent, boss, other] = await Promise.all(['09120000301', '09120000302', '09120000303', '09120000304'].map(p => database.provisionAccount(p, hash)));
    await sql('INSERT INTO support_accounts(user_id) VALUES(?)', [agent]); await sql('INSERT INTO admin_accounts(user_id) VALUES(?)', [boss]);
    const units = async id => Number((await sql('SELECT balance_units FROM wallets WHERE user_id=?', [id]))[0]?.balance_units || 0);
    const owns = async (id, ref) => (await sql('SELECT 1 FROM account_access WHERE user_id=? AND ref=?', [id, ref])).length === 1;
    const ticket = async (id) => (await database.createTicket(id, { subject: 'بازگشت وجه', body: 'قالب را اشتباهی خریدم', category: 'payment', priority: 'normal', requestId: randomUUID(), attachments: [] })).id;
    const buy = (id, ref) => database.purchaseWithWallet(id, ref, randomUUID().replace(/-/g, ''));
    const refund = (actor, id, ticketId, ref, extra = {}, now) => database.supportRefund(actor, id, { ticketId, ref, reason: 'خرید اشتباهی بود', requestId: randomUUID(), ...extra }, now);
    await database.creditWallet(user, 2000 * 400, 'seed:user', 'شارژ آزمایشی');
    const t = await ticket(user);

    // 1. A normal refund: money back to the wallet only, access removed, note, notice and audit written.
    const before = await units(user); await buy(user, 'rt:terminal'); assert.equal(await units(user), before - 50000);
    const done = await refund(agent, user, t, 'rt:terminal'); assert.equal(done.amount, 25);
    assert.equal(await units(user), before); assert.equal(await owns(user, 'rt:terminal'), false);
    assert.equal((await sql("SELECT COUNT(*) n FROM support_messages WHERE ticket_id=? AND internal=TRUE AND body LIKE 'بازگشت وجه%'", [t]))[0].n, 1);
    assert.equal((await sql("SELECT COUNT(*) n FROM user_notifications WHERE user_id=? AND reference LIKE 'refund:%'", [user]))[0].n, 1);
    assert.equal((await sql("SELECT COUNT(*) n FROM admin_audit WHERE action='support-refund' AND target_id=?", [user]))[0].n, 1);

    // 2. Buying again after a refund works (the access row is gone, not just flagged).
    await buy(user, 'rt:terminal'); assert.equal(await owns(user, 'rt:terminal'), true);

    // 3. The same request id twice answers from the first result and pays once.
    const again = randomUUID(), b1 = await units(user);
    await database.supportRefund(agent, user, { ticketId: t, ref: 'rt:terminal', reason: 'تکرار درخواست', requestId: again });
    const repeat = await database.supportRefund(agent, user, { ticketId: t, ref: 'rt:terminal', reason: 'تکرار درخواست', requestId: again });
    assert.equal(repeat.repeated, true); assert.equal(await units(user), b1 + 50000);

    // 4. Two refunds in 90 days reached: support is stopped, an admin may pass with override, support's override is ignored.
    await buy(user, 'lt:midnight');
    await assert.rejects(refund(agent, user, t, 'lt:midnight'), /سقف|بار بازگشت/);
    await assert.rejects(refund(agent, user, t, 'lt:midnight', { override: true }), /بار بازگشت/);
    assert.equal((await refund(boss, user, t, 'lt:midnight', { override: true })).amount, 23);

    // 5. Window: a fresh customer, 71h59m passes, 72h01m is refused (clock injected).
    await database.creditWallet(other, 2000 * 400, 'seed:other', 'شارژ آزمایشی'); const t2 = await ticket(other);
    await buy(other, 'font:estedad'); await refund(agent, other, t2, 'font:estedad', {}, Date.now() + 72 * 36e5 - 60e3);
    await buy(other, 'font:naskh'); await assert.rejects(refund(agent, other, t2, 'font:naskh', {}, Date.now() + 72 * 36e5 + 60e3), /۷۲ ساعت/);

    // 6. In use anywhere (draft, a workspace's published page) is refused; switching away makes it refundable.
    await buy(other, 'pal:sand');
    const draft = { theme: { resume: 'glacier', links: 'frost', font: 'vazir', palette: 'sand', linksPalette: 'ice' }, resumeTemplates: {} };
    await sql('INSERT INTO dashboard_documents(user_id,draft,preferences,pub,published) VALUES(?,?,?,?,?)', [other, JSON.stringify(draft), '{}', '{}', '{}']);
    await assert.rejects(refund(boss, other, t2, 'pal:sand', { override: true }), /انتخاب شده/);
    await sql('UPDATE dashboard_documents SET draft=? WHERE user_id=?', [JSON.stringify({ ...draft, theme: { ...draft.theme, palette: 'ice' } }), other]);
    await sql('INSERT INTO dashboard_workspaces(user_id,slot,draft,preferences,pub,published) VALUES(?,2,?,?,?,?)', [other, '{}', '{}', '{}', JSON.stringify({ links: { theme: { links: 'frost', linksPalette: 'sand' } } })]);
    await assert.rejects(refund(boss, other, t2, 'pal:sand', { override: true }), /انتخاب شده/, 'a published page in another workspace counts');
    await sql('DELETE FROM dashboard_workspaces WHERE user_id=?', [other]);
    assert.equal((await refund(boss, other, t2, 'pal:sand', { override: true })).amount, 23);

    // 7. Gifts and owner grants (no purchase row) and subscriptions are never refundable; wrong ticket owner is refused.
    await sql('INSERT INTO account_access(user_id,ref,price_units,expires_at,created_at) VALUES(?,?,0,NULL,?)', [other, 'rt:vista', Date.now()]);
    await assert.rejects(refund(boss, other, t2, 'rt:vista', { override: true }), /هدیه/);
    await assert.rejects(refund(agent, other, t2, 'subscription:q'), /فقط قالب/);
    await buy(other, 'rt:spotlight'); await assert.rejects(refund(boss, other, t, 'rt:spotlight', { override: true }), /مال همین کاربر/);
    await assert.rejects(refund(user, other, t2, 'rt:spotlight'), /دسترسی پشتیبانی/, 'a customer cannot refund');

    // 8. Kill switch: the owner turns refunds off and every path is closed at once.
    const settings = require('../src/owner/settings.cjs').defaults(); settings.refund.on = false;
    await sql('INSERT INTO commerce_settings(id,settings) VALUES(1,?) ON DUPLICATE KEY UPDATE settings=VALUES(settings)', [JSON.stringify(settings)]);
    await assert.rejects(refund(boss, other, t2, 'rt:spotlight', { override: true }), /بسته است/);
    settings.refund.on = true; await sql('UPDATE commerce_settings SET settings=? WHERE id=1', [JSON.stringify(settings)]);

    // 9. Twenty parallel refunds of one purchase pay exactly once.
    const b2 = await units(other);
    const many = await Promise.allSettled(Array.from({ length: 20 }, () => refund(boss, other, t2, 'rt:spotlight', { override: true })));
    assert.equal(many.filter(r => r.status === 'fulfilled').length, 1, 'one refund wins');
    assert(many.filter(r => r.status === 'rejected').every(r => !/deadlock/i.test(r.reason.message)), 'no deadlocks');
    assert.equal(await units(other), b2 + 60000);

    // 10. A refund racing a dashboard save that selects the same item: both finish without deadlock, and the user never
    //     ends with the money back while the save recorded the item as newly bought.
    await buy(other, 'rt:spotlight'); const revision = Number((await sql('SELECT revision FROM dashboard_documents WHERE user_id=?', [other]))[0].revision);
    const [r1, r2] = await Promise.allSettled([refund(boss, other, t2, 'rt:spotlight', { override: true }), database.mutateDashboard(other, revision, doc => { doc.content.theme.resume = 'spotlight'; })]);
    for (const r of [r1, r2]) assert(r.status === 'fulfilled' || !/deadlock/i.test(r.reason.message), 'no deadlock: ' + (r.reason?.message || ''));
    if (r1.status === 'fulfilled') assert.equal(await owns(other, 'rt:spotlight'), false); else assert.match(r1.reason.message, /انتخاب شده/);
    console.log('PASS refunds (MySQL): wallet-only refund with note, notice and audit; re-purchase; idempotent request; 2-in-90-days cap with admin-only override; 72h window by clock; in-use in drafts and other workspaces; gifts, subscriptions, wrong ticket and customers refused; kill switch; 20 parallel requests pay once; refund vs save without deadlock.');
  } finally {
    await database?.close?.(); await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end();
  }
})().catch(error => { console.error(error); process.exit(1); });
