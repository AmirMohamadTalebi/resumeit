// RI.pubDiff lists what changed since the last publish, section by section, with readable labels only.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = { window: {}, Intl, URL }; vm.createContext(context);
for (const f of ['core', 'ui', 'data', 'state']) vm.runInContext(fs.readFileSync('dist/dashboard/js/' + f + '.js', 'utf8'), context);
const RI = context.window.RI, c = RI.C();
c.skills = [{ id: 's1', name: 'HTML', level: 4 }, { id: 's2', name: 'CSS', level: 3 }];
c.experience = [{ id: 'e1', role: 'کارآموز', org: 'نمونه' }];
const publish = () => { RI.state.pub.resume = { status: 'published', version: 1, at: 1, snap: JSON.stringify(RI.pubData('resume')) }; };

publish();
assert.equal(RI.pubDiff('resume').length, 0, 'nothing changed right after publishing');
assert.equal(RI.pubDirty('resume'), false);

c.skills[0].level = 5;
let rows = RI.pubDiff('resume');
assert.equal(rows.length, 1, 'one skill edit is one row');
assert.equal(rows[0].label, 'مهارت‌ها'); assert.equal(rows[0].route, 'resume'); assert.equal(rows[0].step, 'skills');
assert.match(rows[0].change, /ویرایش/);

c.experience.push({ id: 'e2', role: '<img src=x onerror=alert(1)>', org: '' });
c.skills.reverse(); c.skills.forEach(s => { s.level = 3; });
publish(); c.skills.reverse();
rows = RI.pubDiff('resume');
assert.equal(rows.length, 1); assert.equal(rows[0].change, 'ترتیب عوض شد', 'pure reorder says so');

c.experience = c.experience.filter(x => x.id !== 'e1');
c.experience.push({ id: 'e3', role: 'توسعه‌دهنده', org: '' });
rows = RI.pubDiff('resume'); const exp = rows.find(r => r.key === 'experience');
assert.match(exp.change, /اضافه/); assert.match(exp.change, /حذف/);
assert(!rows.some(r => /id|onerror/.test(r.label)), 'labels never come from user text or technical keys');

c.theme.font = c.theme.font === 'x' ? 'y' : 'x';
rows = RI.pubDiff('resume'); assert(rows.some(r => r.label === 'قالب و ظاهر' && r.route === 'themes'));

RI.state.pub.resume = { status: 'draft', version: 0, at: null, snap: null };
assert.equal(RI.pubDiff('resume').length, 0, 'unpublished pages have no diff');
RI.state.pub.resume.snap = '{broken'; assert.equal(RI.pubDiff('resume').length, 0, 'a damaged snapshot is ignored');
console.log('PASS pubDiff: no rows after publish, edit/add/remove/reorder counts, readable labels and routes, theme changes, drafts and broken snapshots.');
