/* قالب «شب‌تاب»: ادامهٔ آسمان شب صفحهٔ اصلی برای رزومه — شفق و ستاره و کف شبکه‌ای پشت صفحه، نامی که با نور طلایی نوشته
   می‌شود، عکس در مدار با یک ماه کوچک، آمارهایی که می‌شمارند، مهارت‌هایی که پر می‌شوند، خط زمانی که با اسکرول کشیده می‌شود
   و کارت‌های تماس. همهٔ حرکت‌ها CSS است (در پیش‌نمایش داشبورد هم کار می‌کند) و با «کاهش حرکت» خاموش می‌شود. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const TITLES = { skills: ['مهارت‌ها', 'sparkle'], experience: ['تجربه‌های کاری', 'briefcase'], education: ['تحصیلات', 'book'], projects: ['پروژه‌ها و نمونه‌کارها', 'code'], certs: ['دوره‌ها، گواهی‌ها و افتخارات', 'award'], languages: ['زبان‌ها', 'language'] };
  const ICON = { email: 'mail', phone: 'phone', website: 'globe' };
  const when = x => (x.from || '') + (x.from ? ' — ' : '') + (x.current ? 'اکنون' : (x.to || ''));
  const href = x => x.type === 'email' && RI.isEmail(x.value) ? 'mailto:' + x.value : x.type === 'phone' ? 'tel:' + x.value.replace(/[^+0-9]/g, '') : RI.isUrl(x.value) ? RI.normUrl(x.value) : '#';
  const level = n => Math.max(1, Math.min(5, Number(n) || 3));
  const head = key => '<h2 class="st-h"><i aria-hidden="true">' + RI.icon(TITLES[key][1]) + '</i><span>' + esc(TITLES[key][0]) + '</span></h2>';

  function section(key, c) {
    const items = c[key];
    if (!items || !items.length) return '';
    let inner = '';
    if (key === 'skills') inner = '<ul class="st-skills">' + items.map((s, i) => '<li style="--i:' + i + ';--v:' + level(s.level) / 5 + '"><span>' + esc(s.name) + '</span><i class="st-meter" aria-hidden="true"></i><small class="sr-only">' + level(s.level) + ' از ۵</small></li>').join('') + '</ul>';
    if (key === 'experience' || key === 'education') inner = '<ol class="st-tl">' + items.map(x => '<li><i class="st-tl__dot" aria-hidden="true"></i><div class="st-card"><b>' + esc(key === 'experience' ? x.role : x.degree) + '</b><span class="st-sub">' + esc(key === 'experience' ? x.org : x.school) + '<em>' + esc(when(x)) + '</em></span>' + (x.desc ? '<p>' + esc(x.desc) + '</p>' : '') + '</div></li>').join('') + '</ol>';
    if (key === 'projects') inner = RI.projectCards(c, { compact: true });
    if (key === 'certs') inner = '<ul class="st-grid">' + items.map(x => '<li class="st-card st-cert"><i aria-hidden="true">' + RI.icon('award') + '</i><b>' + esc(x.title) + '</b><span class="st-sub">' + esc(x.issuer) + (x.year ? '<em>' + esc(x.year) + '</em>' : '') + '</span></li>').join('') + '</ul>';
    if (key === 'languages') inner = '<ul class="st-langs">' + items.map(x => '<li style="--v:' + level(x.level) / 5 + '"><b>' + esc(x.name) + '</b><span class="st-sub">' + esc(RI.LANG_LEVELS[level(x.level) - 1] || '') + '</span><i class="st-meter" aria-hidden="true"></i></li>').join('') + '</ul>';
    return '<section class="st-sec st-sec--' + key + '" id="st-' + key + '">' + head(key) + inner + '</section>';
  }

  RI.RESUME_RENDERERS.shabtab = function (c, o) {
    const p = c.profile, spec = o.spec, values = o.values || {};
    const vis = k => { const s = c.sections.find(x => x.key === k); return spec.sections.includes(k) && (!s || s.visible); };
    const t = RI.findTemplate('resume', 'shabtab');
    const contacts = vis('contacts') ? c.contacts.filter(x => x.public && x.value.trim()) : [];
    const socials = vis('socials') ? c.socials : [];
    const order = c.sections.map(s => s.key).filter(k => TITLES[k] && vis(k));
    const count = k => order.includes(k) ? (c[k] || []).length : 0;
    const stats = [['skills', 'مهارت'], ['projects', 'پروژه'], ['experience', 'تجربهٔ کاری'], ['languages', 'زبان']].filter(([k]) => count(k)).slice(0, 3);
    const name = p.name.trim() ? esc(p.name) : '<span class="pv-ph">نام شما</span>';
    const sky = '<div class="st-sky" aria-hidden="true"><i class="st-aurora"><b></b><b></b><b></b><b></b></i><i class="st-stars"></i><i class="st-stars st-stars--far"></i><i class="st-floor"></i><i class="st-comet"></i><i class="st-comet st-comet--2"></i></div>';
    const orb = '<div class="st-orb" aria-hidden="true"><i class="st-orb__ring"></i><i class="st-orb__dash"></i><i class="st-orb__moon"></i><b class="st-orb__spark">✦</b><b class="st-orb__spark">✦</b></div>';
    const hero = '<header class="st-hero"><div class="st-hero__text">' +
      '<p class="st-pill"><b>رزومه</b>' + (p.location ? RI.icon('pin') + esc(p.location) : 'یک آدرس، برای تمامِ من') + '</p>' +
      '<h1 class="st-name">' + name + '</h1>' +
      '<p class="st-title">' + (p.title.trim() ? esc(p.title) : '<span class="pv-ph">عنوان حرفه‌ای یا تحصیلی</span>') + '</p>' +
      (p.bio.trim() ? '<p class="st-bio">' + esc(p.bio) + '</p>' : '') +
      '<div class="st-actions">' + ((contacts.length || socials.length || !(c.inbox && c.inbox.enabled === false)) ? '<a class="st-btn st-btn--gold" href="#st-contact">' + RI.icon('mail') + 'ارتباط با من</a>' : '') + (count('projects') ? '<a class="st-btn st-btn--glass" href="#st-projects">' + RI.icon('code') + 'نمونه‌کارها</a>' : '') + '</div>' +
      (stats.length ? '<ul class="st-stats">' + stats.map(([k, label], i) => '<li style="--n:' + count(k) + ';--i:' + i + '"><b class="st-count" aria-hidden="true"></b><span class="sr-only">' + count(k) + '</span><span>' + label + '</span></li>').join('') + '</ul>' : '') +
      '</div><div class="st-hero__art">' + orb + '<img class="st-avatar" src="' + esc(RI.avatarOf(p)) + '" alt="' + esc(p.name ? 'تصویر ' + p.name : 'تصویر پروفایل') + '" width="220" height="220"></div></header>';
    const extras = spec.fields.filter(f => f.public === true && RI.resumeValue(values.fields || {}, f)).map(f => '<section class="st-sec"><h2 class="st-h"><span>' + esc(f.label) + '</span></h2><p class="st-card">' + esc(f.type === 'checkbox' ? 'بله' : RI.resumeValue(values.fields || {}, f)) + '</p></section>').join('');
    const body = order.map(k => section(k, c)).join('') + extras;
    const form = RI.inboxForm(c, { publicBase: o.publicBase, idSuffix: 'st' });
    const reach = contacts.length || socials.length || form ? '<section class="st-sec st-contact" id="st-contact"><h2 class="st-h"><i aria-hidden="true">' + RI.icon('mail') + '</i><span>راه‌های ارتباط</span></h2><div class="st-contact__grid"><div class="st-contact__ways">' +
      (contacts.length ? '<div class="st-ways">' + contacts.map((x, i) => '<a class="st-way" style="--i:' + i + '" data-pv-link="1" href="' + esc(href(x)) + '" rel="noopener noreferrer"><i class="st-way__ico" aria-hidden="true">' + RI.icon(ICON[x.type] || 'link') + '</i><span class="st-way__text"><small>' + esc(x.label) + '</small><b dir="ltr">' + esc(x.value) + '</b></span><i class="st-way__go" aria-hidden="true">' + RI.icon('chevL') + '</i></a>').join('') + '</div>' : '') +
      (socials.length ? '<div class="st-socials">' + socials.map(s => '<a class="st-soc" data-platform="' + esc(s.platform) + '" data-pv-link="1" href="' + esc(RI.socialUrl(s)) + '" rel="noopener noreferrer">' + RI.icon(s.platform) + '<span>' + esc((RI.SOCIALS.find(x => x[0] === s.platform) || [])[1] || s.platform) + '</span></a>').join('') + '</div>' : '') +
      '</div>' + form + '</div></section>' : '';
    const empty = !body && !p.bio.trim() ? '<section class="st-sec"><p class="st-card">هنوز محتوایی برای نمایش اضافه نشده است.</p></section>' : '';
    return '<div class="pv st" style="' + esc(RI.resumeVars(t, o.theme || c.theme)) + '"><link rel="stylesheet" href="/templates/shabtab/shabtab.css">' + sky + RI.resumeNav(c, 'resume', o.publicBase) +
      '<div class="st-wrap">' + hero + '<main class="st-main">' + body + empty + reach + '</main></div>' + RI.brandFoot(c, 'resume') + '</div>';
  };
})();
