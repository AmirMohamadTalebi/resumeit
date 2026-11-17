// This period against the one before it (council C3-c): up, down, same, new, none and na; never infinity or NaN; chips and the
// stats page sentence use the same comparison; the empty state points to the link builder.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = { window: {}, Intl, URL, document: { addEventListener() {}, querySelector() { return null; } }, location: { pathname: '/dashboard/', search: '' }, fetch: async () => ({ ok: true, json: async () => ({}) }), setTimeout, clearTimeout, console }; vm.createContext(context);
for (const f of ['core', 'ui', 'data', 'state', 'api']) vm.runInContext(fs.readFileSync('dist/dashboard/js/' + f + '.js', 'utf8'), context);
const RI = context.window.RI, TODAY = 20000, row = (day, event, total) => ({ day, event, total });
const cmp = (rows, n = 7, event = 'resume') => JSON.parse(JSON.stringify(RI.compareSeries(rows, n, event, TODAY)));
// 7-day windows: this = days 19994..20000, before = 19987..19993.
assert.deepEqual(cmp([row(19999, 'resume', 12), row(19990, 'resume', 8)]), { state: 'up', now: 12, before: 8, pct: 50 });
assert.deepEqual(cmp([row(19999, 'resume', 3), row(19990, 'resume', 12)]), { state: 'down', now: 3, before: 12, pct: 75 });
assert.equal(cmp([row(19999, 'resume', 5), row(19990, 'resume', 5)]).state, 'same');
assert.deepEqual(cmp([row(20000, 'resume', 4)]), { state: 'new', now: 4, before: 0 }, 'nothing before is "new", not infinity');
assert.equal(cmp([]).state, 'none'); assert.equal(cmp(null).state, 'none'); assert.equal(cmp([row(19999, 'links', 9)]).state, 'none', 'another event is not counted');
assert.deepEqual(cmp([row(19990, 'resume', 6)]), { state: 'down', now: 0, before: 6, pct: 100 }, 'a quiet week after a busy one is down 100%');
// Edges: the first and last day of each window, and string totals from the server.
assert.equal(cmp([row(19994, 'resume', 1), row(19993, 'resume', 1)]).state, 'same', 'day 19994 is this week, 19993 the week before');
assert.equal(cmp([row(19986, 'resume', 9), row(20000, 'resume', 1)]).state, 'new', 'older than two windows is ignored');
assert.equal(cmp([row(20000, 'resume', '7'), row(19993, 'resume', '7')]).state, 'same');
assert.equal(cmp([row(20001, 'resume', 9)]).state, 'none', 'a future day is not counted');
// 30 days is comparable; 90 days has no stored earlier half, so no comparison is claimed.
assert.equal(cmp([row(19980, 'resume', 2), row(19950, 'resume', 1)], 30).state, 'up'); assert.equal(cmp([row(20000, 'resume', 9)], 90).state, 'na'); assert.equal(cmp([row(20000, 'resume', 9)], 46).state, 'na');
for (const rows of [[], [row(1, 'resume', 0)], [row(19999, 'resume', 0)], [row(19999, 'resume', 1), row(19990, 'resume', 0)]]) { const c = cmp(rows); assert(Number.isFinite(c.now) && Number.isFinite(c.before) && (c.pct === undefined || Number.isFinite(c.pct))); }
// Chips: Persian text and the arrow; nothing for "none" and "na".
RI.statsRows = [row(Math.floor((Date.now() + 12600000) / 86400000), 'resume', 6)];
assert.match(RI.compareChip('resume', 7), /cmp--new[^>]*>جدید؛ ۷ روز قبل بازدیدی نبود/); assert.equal(RI.compareChip('links', 7), ''); assert.equal(RI.compareChip('resume', 90), '');
const today = Math.floor((Date.now() + 12600000) / 86400000); RI.statsRows = [row(today, 'resume', 9), row(today - 8, 'resume', 6)];
assert.match(RI.compareChip('resume', 7), /cmp--up[^>]*>▲ ۵۰٪ بیشتر از ۷ روز قبل/); RI.statsRows = [row(today, 'resume', 3), row(today - 8, 'resume', 6)]; assert.match(RI.compareChip('resume', 7), /cmp--down[^>]*>▼ ۵۰٪ کمتر/);
console.log('PASS compare series: up, down, same, new, none and na; edges of both windows; no infinity or NaN; chips in Persian.');
