/* قرارداد مشترک قالب‌ها برای ویرایشگر و سرور؛ فقط کد مورد اعتماد پروژه. */
(function () {
  'use strict';
  const RI = window.RI;
  const sections = ['contacts', 'socials', 'skills', 'experience', 'education', 'projects', 'certs', 'languages'];
  RI.RESUME_RENDERERS = Object.create(null);
  RI.resumeSpec = (id) => {
    const t = RI.RESUME_TEMPLATES.find(x => x.id === id);
    if (!t) throw new Error('قالب رزومه شناخته‌شده نیست');
    return Object.assign({ sections, requiredSections: [], bodySections: ['skills', 'experience', 'education', 'projects'], fields: [], settings: [] }, t.editor || {});
  };
  RI.resumeValues = (c, id) => (c.resumeTemplates || {})[id || c.theme.resume] || { fields: {}, settings: {} };
  RI.resumeValue = (values, f) => values[f.key] === undefined ? (f.default === undefined ? (f.type === 'checkbox' ? false : '') : f.default) : values[f.key];
  RI.validateResumeValues = function (input) {
    const bad = () => { throw Object.assign(new Error('اطلاعات یا تنظیمات قالب معتبر نیست'), { status: 400 }); };
    if (!input || typeof input !== 'object' || Array.isArray(input)) return bad();
    const out = {};
    for (const [id, entry] of Object.entries(input)) {
      if (!RI.RESUME_TEMPLATES.some(t => t.id === id) || !entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(k => !['fields', 'settings'].includes(k))) return bad();
      const spec = RI.resumeSpec(id), clean = { fields: {}, settings: {} };
      for (const group of ['fields', 'settings']) {
        const values = entry[group] || {};
        if (typeof values !== 'object' || Array.isArray(values) || Object.keys(values).some(k => !spec[group].some(f => f.key === k))) return bad();
        for (const f of spec[group]) {
          if (!Object.hasOwn(values, f.key)) continue;
          const v = values[f.key];
          if (f.type === 'checkbox') { if (typeof v !== 'boolean') return bad(); }
          else if (typeof v !== 'string' || v.length > (f.max || 1000) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v) || (f.type === 'select' && v && !f.options.some(o => o[0] === v))) return bad();
          clean[group][f.key] = v;
        }
      }
      out[id] = clean;
    }
    return out;
  };
  RI.resumeRequirements = function (c) {
    const spec = RI.resumeSpec(c.theme.resume), values = RI.resumeValues(c), visible = key => spec.sections.includes(key) && c.sections.some(s => s.key === key && s.visible);
    return [
      { id: 'name', req: true, label: 'نام و عنوان حرفه‌ای وارد شده', done: !!(c.profile.name.trim() && c.profile.title.trim()), step: 'profile' },
      ...(spec.sections.includes('contacts') ? [{ id: 'contact', req: true, label: 'دست‌کم یک راه تماس عمومی و نمایان', done: visible('contacts') && c.contacts.some(x => x.public && x.value.trim()), step: 'contacts' }] : []),
      ...(spec.bodySections.length ? [{ id: 'body', req: true, label: 'حداقل یک بخش محتوایی نمایان پر شده', done: spec.bodySections.some(k => visible(k) && c[k].length), step: spec.bodySections[0] }] : []),
      ...spec.requiredSections.map(k => ({ id: 'section-' + k, req: true, label: 'بخش ضروری قالب: ' + k, done: visible(k) && c[k].length > 0, step: k })),
      ...['fields', 'settings'].flatMap(group => spec[group].filter(f => f.required).map(f => ({ id: 'template-' + group + '-' + f.key, req: true, label: f.label, done: f.type === 'checkbox' ? RI.resumeValue(values[group] || {}, f) === true : !!RI.resumeValue(values[group] || {}, f).trim(), step: 'template' }))),
    ].map(x => Object.assign({ route: 'resume' }, x));
  };
})();
