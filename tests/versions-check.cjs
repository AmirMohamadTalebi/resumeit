// Résumé versions on real MySQL (council C1-a): a copy at publish, a backup at reset and restore, no duplicate copies, cap of 20,
// restore changes only the draft, paid things fall back, parallel restores, images kept past the sweep, isolation, cascade.
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { randomBytes } = require('node:crypto');
const { openDatabase } = require('../src/database/database.cjs');
const model = require('../src/dashboard/model.cjs');

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
process.env.OWNER_PHONE = '09120000777';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
(async () => {
  const options = { host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD };
  const name = 'resumeit_versions_' + randomBytes(6).toString('hex'), admin = await mysql.createConnection(options); let database;
  try {
    await admin.query('CREATE DATABASE `' + name + '`'); database = await openDatabase({ ...options, database: name, connectionLimit: 12 }); await admin.query('USE `' + name + '`');
    const sql = async (q, p) => (await admin.query(q, p))[0], hash = 'scrypt$' + randomBytes(16).toString('hex') + '$' + randomBytes(64).toString('hex');
    const user = await database.provisionAccount('09120000601', hash), other = await database.provisionAccount('09120000602', hash);
    let revision = 0;
    // Edits go through the same function the routes use; "publish" asks for a version like the publish route does.
    const edit = async (change, version, slot = 1) => { const doc = await database.mutateDashboard(user, slot === 1 ? revision : (await database.loadDashboard(user, slot)).revision, d => { change(d.content, d); }, { workspace: slot, version }); if (slot === 1) revision = doc.revision; return doc; };
    const versions = (slot = 1) => database.listVersions(user, slot);
    const initial = () => model.initial().content;
    await edit(c => { Object.assign(c, initial()); c.slug = 'amir'; c.profile.name = 'نسخهٔ یک'; });

    // 1. A publish keeps a copy; the same content again keeps none; a change keeps another. Saving a draft keeps nothing.
    await edit(c => { c.profile.title = 'پیش‌نویس'; }); assert.equal((await versions()).length, 0, 'autosave makes no version');
    await edit(() => {}, 'publish'); assert.deepEqual((await versions()).map(v => v.reason), ['publish']);
    await edit(() => {}, 'publish'); assert.equal((await versions()).length, 1, 'unchanged content is not stored twice');
    await edit(c => { c.profile.name = 'نسخهٔ دو'; }, 'publish'); const list = await versions(); assert.equal(list.length, 2); assert(list[0].at >= list[1].at, 'newest first');
    const full = await database.listVersions(user, 1, true); assert.equal(full[0].content.profile.name, 'نسخهٔ دو'); assert.equal(full[1].content.profile.name, 'نسخهٔ یک'); assert(!('content' in list[0]));

    // 2. A reset keeps what it wipes (the content before), and so does a restore.
    await edit(c => { c.profile.name = 'پیش از پاک‌سازی'; c.skills = [{ id: 's1', name: 'JS', level: 3 }]; });
    await edit(c => { c.profile.name = ''; c.skills = []; }, 'reset'); const afterReset = (await database.listVersions(user, 1, true))[0];
    assert.equal(afterReset.reason, 'reset'); assert.equal(afterReset.content.profile.name, 'پیش از پاک‌سازی'); assert.equal(afterReset.content.skills.length, 1);

    // 3. Restore: only the draft changes; address, domain and routes stay current; a backup of what it replaces is kept.
    const back = (await versions()).find(v => v.reason === 'reset'); await edit(c => { c.slug = 'amir-new'; c.profile.title = 'عنوان فعلی'; });
    const before = await sql('SELECT published,pub FROM dashboard_documents WHERE user_id=?', [user]);
    const restored = await database.restoreVersion(user, 1, back.id, revision, { plan: null, purchases: [] }); revision = restored.revision;
    assert.equal(restored.content.profile.name, 'پیش از پاک‌سازی'); assert.equal(restored.content.slug, 'amir-new', 'the current address stays'); assert.deepEqual(restored.downgraded, []);
    const after = await sql('SELECT published,pub FROM dashboard_documents WHERE user_id=?', [user]); assert.deepEqual(after[0].published, before[0].published); assert.deepEqual(after[0].pub, before[0].pub);
    const backup = (await database.listVersions(user, 1, true))[0]; assert.equal(backup.reason, 'restore'); assert.equal(backup.content.profile.title, 'عنوان فعلی', 'the draft it replaced can be brought back');
    await assert.rejects(database.restoreVersion(user, 1, back.id, revision - 1, {}), /نسخهٔ جدیدتری/, 'a stale page cannot restore');

    // 4. Paid template, font or colour not owned fall back to a free one and are named; owned ones and ones already in the draft stay.
    await edit(c => { c.theme.resume = 'vista'; c.theme.font = 'estedad'; c.theme.palette = 'sand'; }, 'publish');
    await edit(c => { c.theme.resume = 'glacier'; c.theme.font = 'vazir'; c.theme.palette = 'default'; });
    const paid = (await database.listVersions(user, 1, true)).find(x => x.content.theme.resume === 'vista');
    let r = await database.restoreVersion(user, 1, paid.id, revision, { plan: null, purchases: [] }); revision = r.revision;
    assert.equal(r.content.theme.resume, 'glacier'); assert.equal(r.content.theme.font, 'vazir'); assert.equal(r.content.theme.palette, 'default'); assert.equal(r.downgraded.length, 3, 'three paid choices fell back: ' + r.downgraded);
    await edit(c => { c.theme.resume = 'glacier'; c.theme.font = 'vazir'; c.theme.palette = 'default'; });
    r = await database.restoreVersion(user, 1, paid.id, revision, { plan: null, purchases: [{ ref: 'rt:vista' }, { ref: 'font:estedad' }, { ref: 'pal:sand' }] }); revision = r.revision;
    assert.deepEqual([r.content.theme.resume, r.content.theme.font, r.content.theme.palette], ['vista', 'estedad', 'sand']); assert.deepEqual(r.downgraded, [], 'owned items come back');
    r = await database.restoreVersion(user, 1, paid.id, revision, { plan: null, purchases: [] }); revision = r.revision;
    assert.equal(r.content.theme.resume, 'vista', 'what the draft already had is not taken away'); assert.deepEqual(r.downgraded, []);

    // 5. Two restores at once with the same page revision: one wins, the other is a conflict; no deadlock.
    const one = (await versions())[0].id, two = (await versions())[1].id;
    const both = await Promise.allSettled([database.restoreVersion(user, 1, one, revision, {}), database.restoreVersion(user, 1, two, revision, {})]);
    assert.equal(both.filter(x => x.status === 'fulfilled').length, 1); assert.match(both.find(x => x.status === 'rejected').reason.message, /نسخهٔ جدیدتری/); revision = (await database.loadDashboard(user, 1)).revision;

    // 6. At most 20 per page, newest kept; another page (slot) has its own list.
    for (let i = 0; i < 25; i++) await edit(c => { c.profile.name = 'انتشار ' + i; }, 'publish');
    const kept = await database.listVersions(user, 1, true); assert.equal(kept.length, 20); assert.equal(kept[0].content.profile.name, 'انتشار 24'); assert.equal(kept[19].content.profile.name, 'انتشار 5');
    await edit(c => { Object.assign(c, initial()); c.profile.name = 'صفحهٔ دوم'; }, 'publish', 2); assert.equal((await versions(2)).length, 1); assert.equal((await versions(1)).length, 20);

    // 7. Images: a copy keeps its image past the unused-image sweep, and a restore brings it back working.
    await edit(c => { c.profile.avatar = PNG; c.profile.name = 'با عکس'; }, 'publish'); const withPhoto = (await database.listVersions(user, 1, true))[0]; const ref = withPhoto.content.profile.avatar;
    assert.match(ref, /\/api\/dashboard\/media\/[a-f0-9]{32}$/, 'the copy holds a stored address, not the picture'); const hashOf = ref.split('/').pop();
    await edit(c => { c.profile.avatar = null; c.profile.name = 'بی عکس'; });
    assert.equal((await sql('SELECT orphaned_at FROM dashboard_media WHERE user_id=? AND hash=?', [user, hashOf]))[0].orphaned_at, null, 'not marked unused: a copy needs it');
    assert.equal(await database.sweepDashboardMedia(Date.now() + 5 * 864e5), 0, 'the sweep keeps it');
    r = await database.restoreVersion(user, 1, withPhoto.id, revision, {}); revision = r.revision; assert.equal(r.content.profile.avatar, ref); assert.notEqual(await database.dashboardMedia(user, hashOf), null);

    // 8. Another account cannot read or restore it; clearing removes only this page's copies; deleting the account removes them all.
    await assert.rejects(database.restoreVersion(other, 1, withPhoto.id, 0, {}), /پیدا نشد/); assert.equal((await database.listVersions(other, 1)).length, 0);
    assert((await database.clearVersions(user, 1)) > 0); assert.equal((await versions(1)).length, 0); assert.equal((await versions(2)).length, 1);
    await sql('DELETE FROM users WHERE id=?', [user]); assert.equal(Number((await sql('SELECT COUNT(*) n FROM dashboard_versions WHERE user_id=?', [user]))[0].n), 0);
    console.log('PASS versions (MySQL): copy at publish without duplicates, backup at reset and restore, restore changes only the draft and keeps the address, paid choices fall back and are named, parallel restores one winner, cap 20 per page, images survive the sweep, isolation, clear and cascade.');
  } finally { await database?.close?.(); await admin.query('DROP DATABASE IF EXISTS `' + name + '`'); await admin.end(); }
})().catch(error => { console.error(error); process.exit(1); });
