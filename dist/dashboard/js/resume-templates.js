/* قرارداد مشترک قالب‌ها برای ویرایشگر و سرور؛ فقط کد مورد اعتماد پروژه. */
(function () {
  'use strict';
  const RI = window.RI;
  const sections = ['contacts', 'socials', 'skills', 'experience', 'education', 'projects', 'certs', 'languages'];
  RI.RESUME_RENDERERS = Object.create(null);
  RI.resumeSpec = (id) => {
    const t = RI.RESUME_TEMPLATES.find(x => x.id === id);
    if (!t) throw new Error('قالب رزومه شناخته‌شده نیست');
    return Object.assign({ sections, requiredSections: [], bodySections: ['skills', 'experience', 'education', 'projects'], fields: [], settings: [] }, (RI.importedSpec && RI.importedSpec(id)) || t.editor || {});
  };
  RI.resumeValues = (c, id) => (c.resumeTemplates || {})[id || c.theme.resume] || { fields: {}, settings: {} };
  RI.resumeValue = (values, f) => values[f.key] === undefined ? (f.default === undefined ? (f.type === 'checkbox' ? false : '') : f.default) : values[f.key];
  RI.validateResumeValues = function (input) {
    const bad = () => { throw Object.assign(new Error('اطلاعات یا تنظیمات قالب معتبر نیست'), { status: 400 }); };
    if (!input || typeof input !== 'object' || Array.isArray(input)) return bad();
    const out = {};
    for (const [id, entry] of Object.entries(input)) {
      if (!RI.RESUME_TEMPLATES.some(t => t.id === id) || !entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(k => !['fields', 'settings', 'collections'].includes(k))) return bad();
      const spec = RI.resumeSpec(id), clean = { fields: {}, settings: {} };
      for (const group of ['fields', 'settings']) {
        const values = entry[group] || {};
        if (typeof values !== 'object' || Array.isArray(values) || Object.keys(values).some(k => !spec[group].some(f => f.key === k))) return bad();
        for (const f of spec[group]) {
          if (!Object.hasOwn(values, f.key)) continue;
          const v = values[f.key];
          if (RI.IMPORTED_TEMPLATES && RI.IMPORTED_TEMPLATES[id]) { if (!RI.templateFieldValid(f, v)) return bad(); }
          else if (f.type === 'checkbox') { if (typeof v !== 'boolean') return bad(); }
          else if (typeof v !== 'string' || v.length > (f.max || 1000) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v) || (f.type === 'select' && v && !f.options.some(o => o[0] === v))) return bad();
          clean[group][f.key] = v;
        }
      }
      if (entry.collections !== undefined) {
        const collections = entry.collections;
        if (!collections || typeof collections !== 'object' || Array.isArray(collections) || Object.keys(collections).some(k => !(spec.collections || []).some(x => x.key === k))) return bad();
        if (Object.values(collections).reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 301), 0) > 300) return bad();
        clean.collections = {};
        for (const [key, rows] of Object.entries(collections)) {
          if (!Array.isArray(rows) || rows.length > 30 || new Set(rows.map(x => x && x.id)).size !== rows.length) return bad();
          const def = spec.collections.find(x => x.key === key), allowed = new Set();
          const visit = n => { if (!n || typeof n !== 'object') return; if (n.field) allowed.add(n.field); if (n.icon) allowed.add(n.icon); if (n.progress) allowed.add(n.progress); if (n.original) visit(n.original); if (n.attrs) Object.values(n.attrs).forEach(visit); if (n.children) n.children.forEach(visit); };
          visit(def.node);
          clean.collections[key] = rows.map(row => {
            if (!row || typeof row !== 'object' || Object.keys(row).some(k => !['id', 'fields'].includes(k)) || !/^[a-z0-9_-]{1,64}$/i.test(row.id) || !row.fields || typeof row.fields !== 'object' || Array.isArray(row.fields)) return bad();
            for (const [field, value] of Object.entries(row.fields)) { const f = spec.fields.find(x => x.key === field); if (!allowed.has(field) || !f || !RI.templateFieldValid(f, value)) return bad(); }
            return { id: row.id, fields: Object.assign({}, row.fields) };
          });
        }
      }
      for (const values of [clean.fields, ...Object.values(clean.collections || {}).flat().map(row => row.fields)]) for (const [key, value] of Object.entries(values)) {
        const f = spec.fields.find(x => x.key === key), match = f && f.type === 'link' && /^\/?\?page=([a-z0-9]+)/.exec(value);
        if (match && (!spec.pages || !Object.hasOwn(spec.pages, match[1])) && !(spec.legacyPages||[]).includes(match[1])) return bad();
      }
      out[id] = clean;
    }
    return out;
  };
  RI.resumeRequirements = function (c) {
    const spec = RI.resumeSpec(c.theme.resume), values = RI.resumeValues(c), visible = key => spec.sections.includes(key) && c.sections.some(s => s.key === key && s.visible);
    return [
      { id: 'name', req: true, label: 'نام نمایشی رزومه', done: !!c.profile.name.trim(), step: 'profile' },
      { id: 'title', req: true, label: 'عنوان حرفه‌ای یا تحصیلی', done: !!c.profile.title.trim(), step: 'profile' },
      ...(spec.sections.includes('contacts') ? [{ id: 'contact', req: true, label: 'دست‌کم یک راه تماس عمومی و نمایان', done: visible('contacts') && c.contacts.some(x => x.public && x.value.trim()), step: 'contacts' }] : []),
      ...(spec.bodySections.length ? [{ id: 'body', req: true, label: 'افزودن محتوای رزومه و نمایش آن', done: spec.bodySections.some(k => visible(k) && c[k].length), step: spec.bodySections[0] }] : []),
      ...spec.requiredSections.map(k => ({ id: 'section-' + k, req: true, label: 'بخش ضروری قالب: ' + k, done: visible(k) && c[k].length > 0, step: k })),
      ...['fields', 'settings'].flatMap(group => spec[group].filter(f => f.required).map(f => ({ id: 'template-' + group + '-' + f.key, req: true, label: f.label, done: f.type === 'checkbox' ? RI.resumeValue(values[group] || {}, f) === true : !!RI.resumeValue(values[group] || {}, f).trim(), step: 'template' }))),
    ].map(x => Object.assign({ route: 'resume' }, x));
  };
})();
