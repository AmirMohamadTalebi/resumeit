/* Fandogh's resume edits. The model proposes edits as a JSON list; this module turns them into a small, checked set
   of changes against the resume the user actually has (only known fields, known item ids, sane lengths, https links),
   labels each one in Persian with its before and after, applies them, and can put everything back. Pure and shared:
   the server checks what the model sent, the dashboard applies it and undoes it. */
(function (root) {
  'use strict';
  const PROFILE = { title: ['عنوان', 80], bio: ['معرفی', 900], location: ['شهر', 60], name: ['نام', 60] };
  const SECTIONS = {
    experience: { label: 'تجربهٔ کاری', fields: { role: 120, org: 120, from: 20, to: 20, desc: 900, current: 0 }, head: x => x.role || x.org },
    education: { label: 'تحصیلات', fields: { degree: 120, school: 120, from: 20, to: 20, desc: 900, current: 0 }, head: x => x.degree || x.school },
    projects: { label: 'پروژه', fields: { title: 120, desc: 900, url: 300 }, head: x => x.title },
    certs: { label: 'گواهی', fields: { title: 120, issuer: 120, year: 10 }, head: x => x.title },
    languages: { label: 'زبان', fields: { name: 40, level: 0 }, head: x => x.name },
  };
  const FIELD = { role: 'سمت', org: 'شرکت', from: 'از', to: 'تا', desc: 'توضیح', current: 'هنوز ادامه دارد', degree: 'مدرک', school: 'دانشگاه', title: 'عنوان', url: 'آدرس', issuer: 'صادرکننده', year: 'سال', name: 'نام', level: 'سطح' };
  const MAX = 12;
  const text = (v, n) => typeof v === 'string' ? v.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').replace(/\s+\n/g, '\n').trim().slice(0, n) : '';
  const level = v => Math.max(1, Math.min(5, Math.round(Number(v)) || 3));
  const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const short = s => { s = String(s || ''); return s.length > 70 ? s.slice(0, 68) + '…' : s; };
  const value = (field, v, n) => field === 'current' ? !!v : field === 'level' ? level(v) : field === 'url' ? (/^https:\/\/[^\s"'<>]+$/i.test(text(v, n)) ? text(v, n) : '') : text(v, n);
  const list = raw => { if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { return []; } } return Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : []; };
  const findSkill = (c, e) => (c.skills || []).find(s => (e.id && s.id === e.id) || (e.name && same(s.name, e.name)));

  // Raw edits from the model → checked edits with {op, …, label, before, after}. Unknown or empty ones are dropped.
  function normalize(raw, content) {
    const c = content && typeof content === 'object' ? content : {}, out = [];
    for (const e of list(raw).slice(0, MAX * 2)) {
      if (!e || typeof e !== 'object' || out.length >= MAX) continue;
      if (e.op === 'set' && PROFILE[e.field]) {
        const [label, n] = PROFILE[e.field], after = text(e.value, n), before = (c.profile || {})[e.field] || '';
        if (after && after !== before) out.push({ op: 'set', field: e.field, value: after, label: label, before, after });
      } else if (e.op === 'add_skill') {
        const name = text(e.name, 40);
        if (name && !findSkill(c, { name }) && !out.some(x => x.op === 'add_skill' && same(x.value, name))) out.push({ op: 'add_skill', value: name, level: level(e.level), label: 'مهارت تازه', before: '', after: name });
      } else if (e.op === 'remove_skill') {
        const s = findSkill(c, e); if (s) out.push({ op: 'remove_skill', id: s.id, label: 'حذف مهارت', before: s.name, after: '' });
      } else if (e.op === 'skill_level') {
        const s = findSkill(c, e), n = level(e.level); if (s && n !== s.level) out.push({ op: 'skill_level', id: s.id, value: n, label: 'سطح «' + short(s.name) + '»', before: s.level + ' از ۵', after: n + ' از ۵' });
      } else if (e.op === 'edit' && SECTIONS[e.section]) {
        const sec = SECTIONS[e.section], item = (c[e.section] || []).find(x => x.id === e.id);
        if (!item || !Object.hasOwn(sec.fields, e.field)) continue;
        const after = value(e.field, e.value, sec.fields[e.field]);
        if (after === '' || after === item[e.field]) continue;
        out.push({ op: 'edit', section: e.section, id: item.id, field: e.field, value: after, label: FIELD[e.field] + ' در ' + sec.label + ' «' + short(sec.head(item)) + '»', before: String(item[e.field] ?? ''), after: String(after) });
      } else if (e.op === 'add' && SECTIONS[e.section] && e.fields && typeof e.fields === 'object') {
        const sec = SECTIONS[e.section], fields = {};
        for (const [k, n] of Object.entries(sec.fields)) if (e.fields[k] !== undefined) { const v = value(k, e.fields[k], n); if (v !== '') fields[k] = v; }
        const head = sec.head(fields); if (!head) continue;
        out.push({ op: 'add', section: e.section, fields, label: sec.label + ' تازه', before: '', after: [head, fields.org || fields.school || fields.issuer].filter(Boolean).join(' · ') });
      } else if (e.op === 'remove' && SECTIONS[e.section]) {
        const item = (c[e.section] || []).find(x => x.id === e.id); if (item) out.push({ op: 'remove', section: e.section, id: item.id, label: 'حذف ' + SECTIONS[e.section].label, before: SECTIONS[e.section].head(item) || '', after: '' });
      } else if (e.op === 'replace') {
        const wrong = text(e.wrong, 60), right = text(e.right, 60);
        if (wrong && right && wrong !== right && JSON.stringify([c.profile, c.experience, c.education, c.projects, c.certs]).includes(wrong)) out.push({ op: 'replace', wrong, right, label: 'غلط تایپی', before: wrong, after: right });
      }
    }
    return out;
  }

  const id = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const swapIn = (obj, keys, wrong, right) => { for (const k of keys) if (typeof obj[k] === 'string' && obj[k].includes(wrong)) obj[k] = obj[k].split(wrong).join(right); };
  const KEYS = ['profile', 'skills', 'experience', 'education', 'projects', 'certs', 'languages'];
  // A copy of everything an edit can touch, so «برگردان» puts it back exactly.
  const snapshot = c => JSON.parse(JSON.stringify(Object.fromEntries(KEYS.map(k => [k, c[k]]))));
  function restore(c, snap) {
    Object.assign(c.profile, snap.profile);
    for (const k of KEYS.slice(1)) if (Array.isArray(c[k])) c[k].splice(0, c[k].length, ...snap[k]);
    return KEYS.slice();
  }
  // Applies checked edits in place; returns the scopes that changed. Edits whose target vanished are skipped.
  function apply(c, edits) {
    const scopes = new Set();
    for (const e of edits) {
      if (e.op === 'set') { c.profile[e.field] = e.value; scopes.add('profile'); }
      else if (e.op === 'add_skill') { if (!findSkill(c, { name: e.value })) { c.skills.push({ id: id(), name: e.value, level: e.level || 3 }); scopes.add('skills'); } }
      else if (e.op === 'remove_skill') { const i = c.skills.findIndex(s => s.id === e.id); if (i >= 0) { c.skills.splice(i, 1); scopes.add('skills'); } }
      else if (e.op === 'skill_level') { const s = c.skills.find(x => x.id === e.id); if (s) { s.level = e.value; scopes.add('skills'); } }
      else if (e.op === 'edit') { const item = (c[e.section] || []).find(x => x.id === e.id); if (item) { item[e.field] = e.value; scopes.add(e.section); } }
      else if (e.op === 'add') { const blank = { experience: { role: '', org: '', from: '', to: '', current: false, desc: '' }, education: { degree: '', school: '', from: '', to: '', current: false, desc: '' }, projects: { title: '', desc: '', url: '', image: null }, certs: { title: '', issuer: '', year: '' }, languages: { name: '', level: 3 } }[e.section]; c[e.section].push(Object.assign({ id: id() }, blank, e.fields)); scopes.add(e.section); }
      else if (e.op === 'remove') { const i = (c[e.section] || []).findIndex(x => x.id === e.id); if (i >= 0) { c[e.section].splice(i, 1); scopes.add(e.section); } }
      else if (e.op === 'replace') {
        swapIn(c.profile, ['title', 'bio'], e.wrong, e.right);
        for (const k of ['experience', 'education', 'projects', 'certs']) for (const item of c[k] || []) swapIn(item, ['role', 'org', 'desc', 'degree', 'school', 'title', 'issuer'], e.wrong, e.right);
        scopes.add('profile');
      }
    }
    return [...scopes];
  }

  const PROTOCOL = 'اگر کاربر خواست چیزی در رزومه عوض شود، یا تغییری واقعاً لازم است، تغییرها را فقط داخل <<EDITS>>…<</EDITS>> به‌صورت یک آرایهٔ JSON بنویس (حداکثر ' + MAX + ' مورد). انواع مجاز:\n' +
    '{"op":"set","field":"title|bio|location|name","value":"…"}\n{"op":"add_skill","name":"…","level":1-5}\n{"op":"remove_skill","id":"…"}\n{"op":"skill_level","id":"…","level":1-5}\n' +
    '{"op":"edit","section":"experience|education|projects|certs|languages","id":"…","field":"…","value":"…"}\n{"op":"add","section":"…","fields":{…}}\n{"op":"remove","section":"…","id":"…"}\n{"op":"replace","wrong":"غلط","right":"درست"}\n' +
    'فیلدها: experience: role, org, from, to, current, desc | education: degree, school, from, to, current, desc | projects: title, desc, url | certs: title, issuer, year | languages: name, level.\n' +
    'برای مورد موجود، id همان مورد را از JSON رزومه بردار. هیچ واقعیتی (شرکت، تاریخ، عدد، مدرک) نساز؛ فقط از رزومه و حرف‌های کاربر استفاده کن و اگر چیزی لازم است بپرس. تغییرها در یک کارت جدا با «قبل/بعد» نمایش داده می‌شوند؛ در متن جوابت آن‌ها را تکرار نکن، فقط در یک یا دو جمله بگو چرا.';
  const api = { normalize, apply, snapshot, restore, PROTOCOL, MAX, SECTIONS, PROFILE };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FandoghEdits = api;
})(typeof self !== 'undefined' ? self : this);
