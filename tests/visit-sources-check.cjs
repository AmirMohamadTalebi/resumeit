// Visit sources (council C3-a): the bucket rules, and on real MySQL (when MYSQL_HOST is set) that the sources always
// add up to the views in slot 1 and slot 2, under parallel visits, never count clicks, and are removed with the account.
const assert = require('node:assert/strict');
const { bucket, SOURCES } = require('../src/dashboard/sources.cjs');

const ask = (url, referer, host = 'amir.resumeit.ir') => bucket({ url, headers: referer ? { referer } : {} }, host);
// 1. The page's own tag wins over the Referer; an unknown or direct tag is ignored.
assert.equal(ask('/?src=telegram', 'https://www.google.com/'), 'telegram');
assert.equal(ask('/?src=jobsite'), 'jobsite'); assert.equal(ask('/?src=irmsg'), 'irmsg');
assert.equal(ask('/?src=evil', 'https://t.me/x'), 'telegram', 'unknown tag falls back to the Referer');
assert.equal(ask('/?src=direct'), 'direct'); assert.equal(ask('/?src=TELEGRAM'), 'direct', 'tags are lower-case only');
// 2. Referer hosts are matched on the whole hostname, never by "contains".
for (const [from, want] of [['https://t.me/amir', 'telegram'], ['https://web.telegram.org/', 'telegram'], ['https://l.instagram.com/?u=x', 'instagram'], ['https://www.linkedin.com/in/a', 'linkedin'], ['https://lnkd.in/x', 'linkedin'],
  ['https://wa.me/98', 'whatsapp'], ['https://jobinja.ir/jobs', 'jobsite'], ['https://www.jobvision.ir/', 'jobsite'], ['https://irantalent.com/', 'jobsite'], ['https://bale.ai/', 'irmsg'], ['https://eitaa.com/x', 'irmsg'], ['https://rubika.ir/', 'irmsg'],
  ['https://www.google.com/', 'google'], ['https://google.ir/', 'google'], ['https://www.google.co.uk/', 'google'], ['https://google.de/', 'google'],
  ['https://google.com.evil.io/', 'other'], ['https://notgoogle.com/', 'other'], ['https://evil.example/?q=google.com', 'other'], ['https://t.me.evil.io/', 'other'], ['https://fakeinstagram.com/', 'other'], ['https://example.org/', 'other']])
  assert.equal(ask('/', from), want, from);
// 3. No Referer, a bad one, or a click inside the person's own pages is direct; the result is always one of the nine buckets.
for (const [from, host] of [[undefined, 'amir.resumeit.ir'], ['not a url', 'amir.resumeit.ir'], ['https://amir.resumeit.ir/links', 'amir.resumeit.ir'], ['https://amir.resumeit.ir/', 'amir.resumeit.ir:443']]) assert.equal(ask('/', from, host), 'direct', String(from));
assert.deepEqual(SOURCES.length, 9); assert(SOURCES.includes(ask('/?src=%00', 'https://x.example')));
console.log('PASS visit sources (rules): tag first, anchored Referer hosts, look-alike hosts are other, no Referer or own pages are direct.');

(async () => {
  if (!process.env.MYSQL_HOST) { console.log('(MySQL part skipped: no MYSQL_HOST)'); return; }
  const mysql = require('mysql2/promise'), { randomBytes } = require('node:crypto'), { openDatabase } = require('../src/database/database.cjs');
  try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const options = { host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD };
  const name = 'resumeit_sources_' + randomBytes(6).toString('hex'), admin = await mysql.createConnection(options); let database;
  try {
    await admin.query('CREATE DATABASE `' + name + '`'); database = await openDatabase({ ...options, database: name, connectionLimit: 16 }); await admin.query('USE `' + name + '`');
    const sql = async (q, p) => (await admin.query(q, p))[0], hash = 'scrypt$' + randomBytes(16).toString('hex') + '$' + randomBytes(64).toString('hex');
    const user = await database.provisionAccount('09120000501', hash), now = Date.UTC(2026, 10, 17, 9), day = Math.floor((now + 12600000) / 86400000);
    // 4. Sources and views are written together: after 60 parallel visits across both slots they match exactly.
    const picks = [...SOURCES, ...SOURCES, 'telegram'];
    const jobs = []; for (let i = 0; i < 60; i++) jobs.push(database.recordMetric(user, i % 3 ? 'resume' : 'links', '', now + i, i % 2 ? 1 : 2, picks[i % picks.length]));
    const results = await Promise.allSettled(jobs); assert.equal(results.filter(r => r.status === 'rejected').length, 0, 'no failure or deadlock: ' + results.find(r => r.status === 'rejected')?.reason?.message);
    for (const slot of [1, 2]) for (const event of ['resume', 'links']) {
      const views = Number(((await (slot === 1 ? sql('SELECT COALESCE(SUM(total),0) n FROM dashboard_metrics WHERE user_id=? AND event=?', [user, event]) : sql('SELECT COALESCE(SUM(total),0) n FROM dashboard_workspace_metrics WHERE user_id=? AND slot=? AND event=?', [user, slot, event])))[0]).n);
      const from = Number((await sql('SELECT COALESCE(SUM(total),0) n FROM dashboard_sources WHERE user_id=? AND slot=? AND event=?', [user, slot, event]))[0].n);
      assert.equal(from, views, `slot ${slot} ${event}: sources ${from} = views ${views}`);
    }
    // 5. A click (a link id) and a visit without a source add nothing to sources; reading returns day, event, group and total.
    const before = Number((await sql('SELECT COALESCE(SUM(total),0) n FROM dashboard_sources'))[0].n);
    await database.recordMetric(user, 'click', 'github', now, 1, 'telegram'); await database.recordMetric(user, 'resume', '', now, 1);
    assert.equal(Number((await sql('SELECT COALESCE(SUM(total),0) n FROM dashboard_sources'))[0].n), before, 'clicks and sourceless visits are not in sources');
    const rows = await database.dashboardSources(user, 90, 1); assert(rows.length > 0 && rows.every(r => SOURCES.includes(r.src) && Number(r.total) > 0 && r.day <= day + 1));
    assert.equal((await database.dashboardSources(user, 90, 3)).length, 0, 'another slot is separate');
    // 6. Deleting the account removes its sources.
    await sql('DELETE FROM users WHERE id=?', [user]); assert.equal(Number((await sql('SELECT COUNT(*) n FROM dashboard_sources'))[0].n), 0);
    console.log('PASS visit sources (MySQL): 60 parallel visits across slots 1 and 2 add up exactly, clicks and sourceless visits leave sources alone, slots are separate, cascade on delete.');
  } finally { await database?.close?.(); await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end(); }
})().catch(error => { console.error(error); process.exit(1); });
