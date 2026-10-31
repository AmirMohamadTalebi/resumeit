/* پیش‌نمایش زندهٔ صفحهٔ رزومه و لینک + قاب دستگاه (موبایل/دسکتاپ) */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});
  const esc = RI.esc;
  const socialUrl=RI.socialUrl;

  RI.LINK_BGS = [
    { id: 'tpl', name: 'طبق قالب' },
    { id: 'ice', name: 'یخی', bg: 'linear-gradient(160deg,#d9e9f0,#f4f9fb)', ink: '#1d2c36', muted: '#5a7080' },
    { id: 'sand', name: 'شنی', bg: 'linear-gradient(160deg,#f2e6da,#faf4ee)', ink: '#3b2a1d', muted: '#7a6552' },
    { id: 'dusk', name: 'گرگ‌ومیش', bg: 'linear-gradient(160deg,#3d5c6f,#875a36)', ink: '#ffffff', muted: '#e6dccf' },
    { id: 'plain', name: 'ساده', bg: '#eef4f7', ink: '#1d2c36', muted: '#5a7080' },
  ];
  RI.RADII = { sharp: ['تیز', '6px'], soft: ['نرم', '16px'], round: ['گرد', '28px'] };

  function lum(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 0.5;
    const n = parseInt(m[1], 16), f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
  }
  const onColor = (hex) => {const l=lum(hex);return (l+.05)/.05>=1.05/(l+.05)?'#000000':'#ffffff';};

  /* مقدارهای CSS برای یک قالب رزومه */
  RI.resumeVars = function (t, theme) {
    const v = RI.harmonize(Object.assign({}, t.v), RI.paletteColors(theme, 'palette'));
    const f = RI.FONTS.find((x) => x.id === theme.font) || RI.FONTS[0];
    const r = (RI.RADII[theme.radius] || RI.RADII.soft)[1];
    return '--pv-bg:' + v.bg + ';--pv-surface:' + v.surface + ';--pv-ink:' + v.ink + ';--pv-muted:' + v.muted + ';--pv-accent:' + v.accent + ';--pv-accent2:' + v.accent2 +
      ';--pv-on:' + onColor(v.accent) + ';--pv-hero:' + v.hero + ';--pv-line:' + v.line + ';--pv-r:' + r + ';--pv-font:' + (t.mono && f.id === 'vazir' ? "'Vazirmatn', ui-monospace, Consolas, monospace" : f.stack) +
      ';--pv-hw:' + f.hw + ';--pv-ls:' + (f.spacing || '0') + ';--pv-brand-filter:'+(lum(v.ink)>.5?'grayscale(1) brightness(0) invert(1)':'none')+';--pv-hfont:' + (f.heading || (t.serif ? "'Noto Naskh Arabic','Times New Roman',serif" : f.stack));
  };
  RI.linksVars = function (t, theme, style) {
    // The chosen page background comes first so the palette is made readable against the real background.
    const base = Object.assign({}, t.v), bgo = RI.LINK_BGS.find((b) => b.id === (style && style.bgOverride));
    if (bgo && bgo.bg) { base.bg = bgo.bg; base.ink = bgo.ink; base.muted = bgo.muted; }
    const v = RI.harmonizeLinks(base, RI.paletteColors(theme, 'linksPalette'));
    const f = RI.FONTS.find((x) => x.id === theme.font) || RI.FONTS[0];
    const r = (RI.RADII[theme.radius] || RI.RADII.soft)[1];
    return '--lv-bg:' + v.bg + ';--lv-ink:' + v.ink + ';--lv-muted:' + v.muted + ';--lv-btn:' + v.btnBg + ';--lv-btn-ink:' + v.btnInk + ';--lv-btn-bd:' + v.btnBd + ';--lv-accent:' + v.accent + ';--lv-r:' + r + ';--pv-font:' + f.stack + ';--pv-hw:' + f.hw + ';--pv-brand-filter:'+(lum(v.ink)>.5?'grayscale(1) brightness(0) invert(1)':'none')+';--pv-ls:' + (f.spacing || '0');
  };

  const LV = (n) => (RI.LANG_LEVELS[(n || 3) - 1] || '');
  const dots = (n) => '<span class="pv-dots" aria-hidden="true">' + [1, 2, 3, 4, 5].map((i) => '<i' + (i <= n ? ' class="on"' : '') + '></i>').join('') + '</span>';
  const when = (x) => (x.from || '') + (x.from ? ' — ' : '') + (x.current ? 'اکنون' : (x.to || ''));

  function brandFoot(c,kind) {
    const value=c.branding?.[kind];
    if(value?.mode==='hidden')return '';
    if(value?.mode==='custom')return '<footer class="pv-foot">'+esc(value.text)+'</footer>';
    return '<footer class="pv-foot"><span>ساخته‌شده با</span> <span class="ri-logo"><img src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="2172" height="724"></span></footer>';
  }
  RI.brandFoot=brandFoot;
  function nav(c, active, base) {
    const nm = c.profile.name.trim() || 'نام شما';
    if(c._linksOnly)return '<nav class="pv-nav" aria-label="صفحهٔ لینک"><span class="pv-nav__brand">'+esc(nm)+'</span></nav>';
    return '<nav class="pv-nav" aria-label="منوی صفحه"><span class="pv-nav__brand">' + esc(nm) + '</span><span class="pv-nav__links">'+(c._publicPages?.resume===false?'':'<a href="' + esc(base === undefined ? '#' : base + '/') + '" data-pv-go="resume" class="' + (active === 'resume' ? 'is-on' : '') + '">رزومه</a>')+(c._publicPages?.links===false?'':'<a href="' + esc(base === undefined ? '#' : base + '/links') + '" data-pv-go="links" class="' + (active === 'links' ? 'is-on' : '') + '">لینک‌ها</a>')+'</span></nav>';
  }

  const SEC_TITLES = { skills: ['مهارت‌ها', 'sparkle'], experience: ['تجربه‌های کاری', 'briefcase'], education: ['تحصیلات', 'book'], projects: ['پروژه‌ها و نمونه‌کارها', 'code'], certs: ['دوره‌ها، گواهی‌ها و افتخارات', 'award'], languages: ['زبان‌ها', 'language'] };

  RI.projectCards = (c,options={}) => '<link rel="stylesheet" href="/templates/projects.css"><div class="pv-proj">'+c.projects.map(x=>{const id='project-'+x.id,limit=options.compact?55:90,photo=x.image&&!x.image.startsWith('grad:'),url=x.url&&RI.isUrl(x.url)?RI.normUrl(x.url):'';return '<article><button type="button" class="project-trigger" data-project-open="'+esc(id)+'" aria-haspopup="dialog">'+(!options.compact||photo?'<span class="pv-proj__img" style="'+esc(RI.bg(x.image)||'background:var(--pv-line,#dfebf0)')+'"></span>':'')+'<span class="pv-proj__body"><b>'+esc(x.title)+'</b><span>'+esc(x.desc.slice(0,limit))+(x.desc.length>limit?'…':'')+'</span><small>دربارهٔ پروژه</small></span></button><dialog class="project-dialog" id="'+esc(id)+'" aria-labelledby="'+esc(id)+'-title"><button type="button" class="project-close" data-project-close aria-label="بستن جزئیات پروژه">'+RI.icon('x')+'</button><h2 id="'+esc(id)+'-title">'+esc(x.title)+'</h2>'+(photo?'<img loading="lazy" decoding="async" src="'+esc(x.image)+'" alt="'+esc('تصویر پروژهٔ '+x.title)+'">':'')+'<p>'+esc(x.desc)+'</p>'+(options.compact&&url?'<p class="project-address" dir="ltr">'+esc(new URL(url).hostname)+'</p>':'')+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" data-pv-link="1">دیدن پروژه</a>':'')+'</dialog></article>';}).join('')+'</div>';

  function bodySection(key, c) {
    const items = c[key];
    if (!items || !items.length) return '';
    let inner = '';
    if (key === 'skills') inner = '<ul class="pv-chips">' + items.map((s) => '<li>' + esc(s.name) + dots(s.level) + '</li>').join('') + '</ul>';
    if (key === 'experience') inner = '<ol class="pv-tl">' + items.map((x) => '<li><b>' + esc(x.role) + '</b><span class="pv-sub">' + esc(x.org) + ' · ' + esc(when(x)) + '</span>' + (x.desc ? '<p>' + esc(x.desc) + '</p>' : '') + '</li>').join('') + '</ol>';
    if (key === 'education') inner = '<ol class="pv-tl">' + items.map((x) => '<li><b>' + esc(x.degree) + '</b><span class="pv-sub">' + esc(x.school) + ' · ' + esc(when(x)) + '</span>' + (x.desc ? '<p>' + esc(x.desc) + '</p>' : '') + '</li>').join('') + '</ol>';
    if (key === 'projects') inner = RI.projectCards(c,{compact:true});
    if (key === 'certs') inner = '<ul class="pv-list">' + items.map((x) => '<li><b>' + esc(x.title) + '</b><span class="pv-sub">' + esc(x.issuer) + (x.year ? ' · ' + esc(x.year) : '') + '</span></li>').join('') + '</ul>';
    if (key === 'languages') inner = '<ul class="pv-list pv-list--inline">' + items.map((x) => '<li><b>' + esc(x.name) + '</b><span class="pv-sub">' + LV(x.level) + '</span></li>').join('') + '</ul>';
    return '<section class="pv-sec pv-sec--' + key + '"><h2>' + esc(SEC_TITLES[key][0]) + '</h2>' + inner + '</section>';
  }

  // «ارتباط با من»: a message form that delivers to the owner's dashboard. Outside a published page it only
  // explains itself. __RI_MAIN__ is replaced by the main site's origin when the public page is served.
  RI.inboxForm = function (c, o) {
    if (c.inbox && c.inbox.enabled === false) return '';
    o = o || {};
    const live = o.publicBase !== undefined, id = 'ri-inbox-' + (o.idSuffix || 'form');
    const field = (name, label, attrs, hint) => '<label class="ri-inbox__field" for="' + id + '-' + name + '"><span>' + label + '</span>' + attrs.replace('{id}', id + '-' + name) + (hint ? '<small>' + hint + '</small>' : '') + '</label>';
    return '<section class="ri-inbox" id="ri-message" aria-labelledby="' + id + '-title"><h2 id="' + id + '-title">ارتباط با من</h2><p class="ri-inbox__lead">پیامت مستقیم به ' + esc(c.profile.name.trim() || 'صاحب این رزومه') + ' می‌رسد؛ جواب را با شماره یا ایمیلی که می‌نویسی می‌گیری.</p>' +
      '<form class="ri-inbox__form" data-inbox-form data-endpoint="' + esc((o.publicBase || '') + '/message') + '" data-main="' + (live ? '__RI_MAIN__' : (typeof location !== 'undefined' ? location.origin : '')) + '"' + (live ? '' : ' data-preview="1"') + ' novalidate>' +
      '<div class="ri-inbox__row">' + field('name', 'نام شما', '<input id="{id}" name="name" required minlength="2" maxlength="80" autocomplete="name">') + field('contact', 'شماره موبایل یا ایمیل', '<input id="{id}" name="contact" required maxlength="120" dir="ltr" inputmode="email" autocomplete="email" placeholder="0912… یا name@mail.com">', 'برای دریافت جواب') + '</div>' +
      field('message', 'پیام', '<textarea id="{id}" name="message" required minlength="10" maxlength="2000" rows="4"></textarea>') +
      '<div class="ri-inbox__resume">' + field('resume', 'آدرس رزومهٔ تو (اختیاری)', '<input id="{id}" name="resumeUrl" type="url" maxlength="300" dir="ltr" placeholder="https://">') + '<button type="button" class="ri-inbox__attach" data-inbox-attach>' + RI.icon('resume') + 'الصاق رزومهٔ من در ResumeIt</button></div>' +
      '<input class="ri-inbox__trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="ri-inbox__foot"><button type="submit" class="ri-inbox__send">' + RI.icon('mail') + 'ارسال پیام</button><p class="ri-inbox__status" data-inbox-status role="status"></p></div></form></section>';
  };

  // In the dashboard preview the form only explains itself instead of submitting.
  if (typeof document !== 'undefined') document.addEventListener('submit', (e) => { if (!e.target.matches || !e.target.matches('[data-inbox-form][data-preview]')) return; e.preventDefault(); RI.toast && RI.toast('در نسخهٔ منتشرشده، پیام مستقیم به بخش «پیام‌های رزومه» داشبورد می‌رسد.', { kind: 'info' }); }, true);

  RI.resumeHtml = function (c, o) {
    o = o || {};
    const theme = Object.assign({}, c.theme, o.theme || {});
    const t = RI.findTemplate('resume', theme.resume);
    const spec = RI.resumeSpec(theme.resume), templateValues = RI.resumeValues(c, theme.resume);
    if (RI.IMPORTED_TEMPLATES && RI.IMPORTED_TEMPLATES[theme.resume]) return RI.importedHtml(c, { theme, spec, values: templateValues, publicBase: o.publicBase, page: o.page });
    if (RI.RESUME_RENDERERS[theme.resume]) return RI.RESUME_RENDERERS[theme.resume](c, { theme, spec, values: templateValues, publicBase: o.publicBase });
    const p = c.profile;
    const vis = (k) => { const s = c.sections.find((x) => x.key === k); return spec.sections.includes(k) && (!s || s.visible); };
    const contacts = vis('contacts') ? c.contacts.filter((x) => x.public && x.value.trim()) : [];
    const socials = vis('socials') ? c.socials : [];
    const ICON = { email: 'mail', phone: 'phone', website: 'globe' };
    const idBlock =
      '<div class="pv-id"><img class="pv-avatar" src="' + esc(RI.avatarOf(p)) + '" alt="'+esc(p.name?'تصویر '+p.name:'تصویر پروفایل')+'" width="112" height="112">' +
      '<h1 class="pv-name">' + (p.name.trim() ? esc(p.name) : '<span class="pv-ph">نام شما</span>') + '</h1>' +
      '<p class="pv-title">' + (p.title.trim() ? esc(p.title) : '<span class="pv-ph">عنوان حرفه‌ای یا تحصیلی</span>') + '</p>' +
      (p.location ? '<p class="pv-loc">' + RI.icon('pin') + esc(p.location) + '</p>' : '') +
      // Each way to reach the person is a small card: an icon tile, what it is, and the address itself.
      (contacts.length ? '<ul class="pv-contacts">' + contacts.map((x) => '<li><a class="pv-contact" data-pv-link="1" href="' + esc(x.type==='email'&&RI.isEmail(x.value)?'mailto:'+x.value:x.type==='phone'?'tel:'+x.value.replace(/[^+0-9]/g,''):RI.isUrl(x.value)?RI.normUrl(x.value):'#') + '" rel="noopener noreferrer"><i class="pv-contact__ico" aria-hidden="true">' + RI.icon(ICON[x.type] || 'link') + '</i><span class="pv-contact__text"><small>' + esc(x.label) + '</small><b class="ltr">' + esc(x.value) + '</b></span></a></li>').join('') + '</ul>' : '') +
      (socials.length ? '<ul class="pv-socials">' + socials.map((s) => '<li title="' + esc(RI.SOCIALS.find(x=>x[0]===s.platform)?.[1]||s.platform) + '"><a data-pv-link="1" data-platform="' + esc(s.platform) + '" href="'+esc(socialUrl(s))+'" rel="noopener noreferrer">' + RI.icon(s.platform) + '<span class="ltr">' + esc(s.handle) + '</span></a></li>').join('') + '</ul>' : '') + '</div>';
    const order = c.sections.map((s) => s.key).filter((k) => SEC_TITLES[k] && vis(k));
    const extras = spec.fields.filter(f => f.public === true && RI.resumeValue(templateValues.fields || {}, f)).map(f => '<section class="pv-sec"><h2>' + esc(f.label) + '</h2><p>' + esc(f.type === 'checkbox' ? 'بله' : RI.resumeValue(templateValues.fields || {}, f)) + '</p></section>').join('');
    const body = order.map((k) => bodySection(k, c)).join('') + extras;
    const bio = p.bio.trim() ? '<section class="pv-sec pv-about"><p>' + esc(p.bio) + '</p></section>' : '';
    const empty = !body && !bio ? '<section class="pv-sec pv-empty"><p>هنوز محتوایی برای نمایش اضافه نشده است.</p></section>' : '';
    const cover = '<div class="pv-cover" style="' + esc(RI.bg(p.cover) || 'background:var(--pv-hero)') + '"></div>';
    return '<div class="pv pv--' + t.layout + (t.mono ? ' pv--mono' : '') + '" style="' + esc(RI.resumeVars(t, theme)) + '">' + nav(c, 'resume', o.publicBase) + cover +
      '<div class="pv-wrap">' + idBlock + '<main class="pv-main">' + bio + body + empty + RI.inboxForm(c, { publicBase: o.publicBase }) + '</main></div>' + brandFoot(c,'resume') + '</div>';
  };

  RI.linksHtml = function (c, o) {
    o = o || {};
    const theme = Object.assign({}, c.theme, o.theme || {});
    let t = RI.findTemplate('links', theme.links);
    if(c.links.style.matchResume){const source=RI.findTemplate('resume',theme.resume);if(source){const v=source.v;t={...t,v:{...t.v,bg:v.bg,ink:v.ink,muted:v.muted,accent:v.accent,btnBg:v.surface,btnInk:v.ink,btnBd:v.line}};}}
    const h = c.links.header, p = c.profile, st = c.links.style;
    const name = (h.sync ? p.name : h.name).trim(), bio = (h.sync ? p.bio : h.bio).trim();
    const items = c.links.items.filter((i) => i.type === 'divider' || i.active);
    const list = items.map((i) => {
      if (i.type === 'divider') return '<li class="lv-div"><span>' + esc(i.title) + '</span></li>';
      if(i.type==='text')return '<li class="lv-text">'+esc(i.title)+'</li>';
      if(i.type==='image')return '<li class="lv-image"><img loading="lazy" src="'+esc(RI.safeImage(i.image))+'" alt="'+esc(i.title||'تصویر صفحهٔ لینک')+'" width="480" height="270">'+(i.title?'<p>'+esc(i.title)+'</p>':'')+'</li>';
      const feat = i.featured ? ' lv-btn--feat' : '';
      return '<li><a href="' + esc(o.publicBase === undefined ? RI.normUrl(i.url) : o.publicBase + '/out/' + i.id) + '" rel="noopener noreferrer" class="lv-btn lv-btn--' + t.btn + feat + '" data-pv-link="1">' +
        (i.image ? '<span class="lv-btn__img" style="' + esc(RI.bg(i.image)) + '"></span>' : '<span class="lv-btn__ico">' + RI.icon(i.icon || 'link') + '</span>') +
        '<span class="lv-btn__txt"><b>' + esc(i.title) + '</b>' + (i.featured ? '<small class="ltr">' + esc(RI.hostOf(i.url || '')) + '</small>' : '') + '</span>' + (i.featured ? '<span class="lv-btn__star">' + RI.icon('star') + '</span>' : '') + '</a></li>';
    }).join('');
    const socials = c.socials.length ? '<ul class="lv-soc">' + c.socials.map((s) => '<li title="' + esc(s.platform) + '"><a data-pv-link="1" href="'+esc(socialUrl(s))+'" rel="noopener noreferrer" aria-label="'+esc(RI.SOCIALS.find(x=>x[0]===s.platform)?.[1]||s.platform)+'">' + RI.icon(s.platform) + '</a></li>').join('') + '</ul>' : '';
    const empty = !items.length ? '<li class="lv-empty">هنوز لینکی منتشر نشده است.</li>' : '';
    return '<div class="lv lv--' + (['start','end'].includes(st.align)?st.align:'center') + '" style="' + esc(RI.linksVars(t, theme, st)) + '">' + nav(c, 'links', o.publicBase) +
      '<div class="lv-head"><img class="lv-avatar' + (st.ring ? ' lv-avatar--ring' : '') + '" src="' + esc(RI.avatarOf(p)) + '" alt="تصویر پروفایل '+esc(name)+'">' +
      '<h1>' + (name ? esc(name) : '<span class="pv-ph">نام شما</span>') + '</h1>' + (bio ? '<p>' + esc(bio) + '</p>' : '') + '</div>' +
      '<ul class="lv-list">' + list + empty + '</ul>' + socials + brandFoot(c,'links') + '</div>';
  };

  /* ---------- قاب دستگاه ---------- */
  const NAT = { mobile: [390, 780], desktop: [1120, 700] };

  RI.Preview = function (host, o) {
    const st = { kind: o.kind || 'resume', device: o.device || 'mobile', templatePage: 'home' };
    host.classList.add('pvhost');
    host.innerHTML =
      '<div class="pvhost__bar">' + (o.toolbar === false ? '' :
        '<div class="segmented" role="group" aria-label="نوع دستگاه">' +
        '<button type="button" data-dev="mobile" aria-pressed="' + (st.device === 'mobile') + '">' + RI.icon('phone') + 'موبایل</button>' +
        '<button type="button" data-dev="desktop" aria-pressed="' + (st.device === 'desktop') + '">' + RI.icon('monitor') + 'دسکتاپ</button></div>') +
      (o.switchKind ? '<div class="segmented" role="group" aria-label="صفحه"><button type="button" data-kind="resume" aria-pressed="' + (st.kind === 'resume') + '">رزومه</button><button type="button" data-kind="links" aria-pressed="' + (st.kind === 'links') + '">لینک‌ها</button></div>' : '') +
      '</div><p class="pvhost__focus" role="status" hidden></p><div class="pvhost__stage"><div class="device device--' + st.device + '"><div class="device__bar"><span class="device__dots"><i></i><i></i><i></i></span><span class="device__url ltr"></span></div>' +
      '<div class="device__box"><div class="device__scaler"><div class="device__vp"></div></div></div></div></div>';
    const stage = RI.$('.pvhost__stage', host), dev = RI.$('.device', host), box = RI.$('.device__box', host);
    const scaler = RI.$('.device__scaler', host), vp = RI.$('.device__vp', host), urlEl = RI.$('.device__url', host);
    const focusLabel=RI.$('.pvhost__focus',host);
    function revealTemplateSection(scroll){
      const doc=vp.querySelector('iframe')?.contentDocument;
      doc?.querySelectorAll('[data-ri-editing]').forEach(el=>el.removeAttribute('data-ri-editing'));
      const section=st.templateSection&&doc?.querySelector('[data-ri-section="'+st.templateSection+'"]');
      focusLabel.hidden=!section||!st.sectionLabel;focusLabel.textContent=section&&st.sectionLabel?'در پیش‌نمایش: '+st.sectionLabel:'';
      if(!section)return;
      for(let parent=section;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
      if(!doc.getElementById('ri-editor-focus')){const style=doc.createElement('style');style.id='ri-editor-focus';style.textContent='[data-ri-editing]{outline:3px solid #246e7d!important;outline-offset:-4px!important;box-shadow:inset 0 0 0 7px #e5f5f9!important}';doc.head.append(style);}
      section.setAttribute('data-ri-editing','true');
      if(scroll){const scroller=doc.scrollingElement;if(scroller)scroller.scrollTo({top:Math.max(0,section.getBoundingClientRect().top+scroller.scrollTop-84),behavior:RI.reduceMotion()?'instant':'smooth'});}
    }

    function fit() {
      const nat = NAT[st.device];
      const stageStyle=getComputedStyle(stage),frameStyle=getComputedStyle(dev);
      const horizontal=style=>['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((sum,key)=>sum+(parseFloat(style[key])||0),0);
      const w = Math.max(20,(stage.clientWidth || host.clientWidth || 360)-horizontal(stageStyle)-horizontal(frameStyle));
      let k = Math.min(1, w / nat[0]);
      // In the detached window the device itself grows: the phone to the window's height, the desktop to its width.
      const view = host.ownerDocument.defaultView, detached = host.ownerDocument !== document && view;
      if (detached) {
        const free = view.innerHeight - stage.getBoundingClientRect().top - 28 - Math.max(44, Math.min(120, dev.offsetHeight - box.offsetHeight));
        k = w / nat[0]; if (st.device === 'mobile') k = Math.min(k, free / nat[1]);
        k = Math.max(0.3, Math.min(2.4, k));
      } else {
        if (o.fitHeight) k = Math.min(k, Math.max(0.05, ((view?.innerHeight || window.innerHeight) - o.fitHeight) / (nat[1] + 40)));
        k = Math.max(0.05, k);
        if (o.maxScale) k = Math.min(k, o.maxScale);
      }
      scaler.style.width = nat[0] + 'px'; scaler.style.height = nat[1] + 'px';
      scaler.style.transform = 'scale(' + k + ')';
      box.style.width = nat[0] * k + 'px'; box.style.height = nat[1] * k + 'px';
    }
    function render(anim) {
      const c = o.content ? o.content() : RI.C();
      const top = vp.scrollTop;
      const theme = o.theme ? o.theme() : null;
      const html = st.kind === 'resume' ? RI.resumeHtml(c, { theme: theme, page: st.templatePage }) : RI.linksHtml(c, { theme: theme });
      const imported = st.kind === 'resume' && RI.IMPORTED_TEMPLATES && RI.IMPORTED_TEMPLATES[(theme || c.theme).resume];
      if (imported) {
        // Stylesheets live in the frame's head; while they stay the same an edit only swaps the body, so fonts,
        // CSS and images are not re-parsed on every keystroke and the preview keeps its scroll without flashing.
        const sheet = /<link rel="stylesheet"[^>]*>/g, sheets = (html.match(sheet) || []).join(''), body = html.replace(sheet, '');
        const current = vp.querySelector('iframe'), currentDoc = current?.contentDocument;
        const bind = (doc, frame) => { frame._binding?.abort(); frame._binding = new AbortController(); window.bindResumeProjects?.(doc); RI.bindImportedPage(doc, () => {}, frame._binding.signal); };
        if (current && current.dataset.ready === 'true' && current.dataset.sheets === sheets && currentDoc?.body) {
          const oldScroll = currentDoc.scrollingElement?.scrollTop;
          currentDoc.body.innerHTML = body; bind(currentDoc, current);
          revealTemplateSection(false); if (oldScroll != null && currentDoc.scrollingElement) currentDoc.scrollingElement.scrollTop = oldScroll;
        } else {
        const oldScroll=currentDoc?.scrollingElement?.scrollTop;
        const frame = document.createElement('iframe'); frame.title = 'پیش‌نمایش قالب رزومه'; frame.setAttribute('sandbox', 'allow-same-origin');
        frame.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#fff';
        frame.dataset.sheets = sheets;
        frame.srcdoc = '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + sheets + '</head><body style="margin:0">' + body + '</body></html>';
        frame.addEventListener('load', () => { const doc = frame.contentDocument; if (!doc||frame!==vp.querySelector('iframe')) return; frame.dataset.ready = 'true'; bind(doc, frame);revealTemplateSection(oldScroll==null);if(oldScroll!=null&&doc.scrollingElement)doc.scrollingElement.scrollTop=oldScroll; });
        vp.replaceChildren(frame);
        }
      } else {vp.innerHTML = html;focusLabel.hidden=true;}
      vp.scrollTop = top;
      const u = RI.urls();
      urlEl.textContent = st.kind === 'resume' ? u.resume : u.links;
      if (anim !== false && !RI.reduceMotion()) vp.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    }
    RI.delegate(host, 'click', '[data-dev]', (e, b) => api.setDevice(b.dataset.dev));
    RI.delegate(host, 'click', '[data-kind]', (e, b) => api.setKind(b.dataset.kind));
    host.addEventListener('click', (e) => {
      const a = e.target.closest('[data-pv-go],[data-pv-link]');
      if (!a) return;
      e.preventDefault();
      if (a.dataset.pvGo) api.setKind(a.dataset.pvGo);
      else RI.toast('در صفحهٔ واقعی این لینک در تب جدید باز می‌شود.', { kind: 'info' });
    });
    const api = {
      refresh: render,
      setTemplatePage(id) {if(st.templatePage===id)return; st.templatePage = id; render(false); },
      setTemplateSection(key,label) {const changed=st.templateSection!==key;st.templateSection=key;st.sectionLabel=label||'';revealTemplateSection(changed);},
      setDevice(d) {
        if (d === st.device) return;
        st.device = d;
        dev.className = 'device device--' + d;
        RI.$$('[data-dev]', host).forEach((b) => b.setAttribute('aria-pressed', b.dataset.dev === d));
        fit(); render(false);
        if (!RI.reduceMotion()) dev.animate([{ opacity: 0.4, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,.8,.28,1)' });
        o.onDevice && o.onDevice(d);
      },
      setKind(k) {
        if (k === st.kind) return;
        st.kind = k; vp.scrollTop = 0;
        RI.$$('[data-kind]', host).forEach((b) => b.setAttribute('aria-pressed', b.dataset.kind === k));
        render(); o.onKind && o.onKind(k);
      },
      get kind() { return st.kind; }, get device() { return st.device; },
      destroy() { ro.disconnect(); window.removeEventListener('resize', onResize); },
    };
    const ro = new ResizeObserver(() => fit());
    ro.observe(stage);
    // The detached window forwards its resizes here, since the observer may not see a frame in another document.
    const onResize = () => fit(); window.addEventListener('resize', onResize);
    fit(); render(false);
    return api;
  };

  /* ---------- بندانگشتی قالب‌ها برای گالری ---------- */
  // The marker takes the preview's exact place when it leaves, so elements added beside it meanwhile (the
  // resize divider) cannot end up on the wrong side; the page keeps its scroll position on the way back.
  RI.detachPreviewToggle = (root, side, button) => {
    const marker=document.createComment('preview-position'),editor=side.closest('.editor')||side.parentElement;
    let popup=null,disposed=false;
    const label=()=>{button.textContent=popup?'بازگرداندن پیش‌نمایش':'نمایش پیش‌نمایش در پنجرهٔ جدا';button.setAttribute('aria-pressed',String(!!popup));};
    const restore=()=>{
      const previous=popup;popup=null;
      if(previous){
        const y=window.scrollY;
        if(marker.isConnected)marker.replaceWith(side);else if(editor?.isConnected)editor.append(side);
        editor?.classList.remove('is-preview-detached');
        window.scrollTo({top:y,behavior:'instant'});
        if(!previous.closed){previous.removeEventListener('pagehide',restore);previous.close();}
        window.dispatchEvent(new Event('resize'));
      }
      label();
    };
    const toggle=()=>{
      if(disposed)return;
      if(popup){restore();return;}
      const tall=Math.max(700,Math.min((screen.availHeight||1000)-60,1400)),wide=Math.max(560,Math.min((screen.availWidth||1200)*.62,1500));
      const opened=window.open('about:blank','_blank','popup,width='+Math.round(wide)+',height='+Math.round(tall));
      if(!opened){RI.toast('مرورگر پنجرهٔ پیش‌نمایش را مسدود کرد؛ اجازهٔ بازشدن پنجره را بده و دوباره تلاش کن.',{kind:'info'});return;}
      try{
        const doc=opened.document;doc.title='پیش‌نمایش زندهٔ رزومه';doc.documentElement.lang='fa';doc.documentElement.dir='rtl';
        document.querySelectorAll('link[rel=stylesheet]').forEach(source=>{const link=doc.createElement('link');link.rel='stylesheet';link.href=source.href;doc.head.append(link);});
        const style=doc.createElement('style');style.textContent='html,body{height:100%}body{margin:0;padding:16px 20px;min-width:0;overflow:auto;background:linear-gradient(160deg,#eef4f7,#f7efe7)}.editor__side,.rs-side{display:block!important;position:static!important;width:100%!important;max-width:100%!important;padding:0!important}.editor__side .sticky,.rs-side .sticky{position:static!important;top:auto!important}.pvhost{width:100%}.pvhost__stage{justify-content:center;max-height:none!important;overflow:visible!important;background:transparent!important}.device{max-width:none!important}';doc.head.append(style);
        doc.body.classList.add('is-detached-preview');
        side.replaceWith(marker);doc.body.append(side);popup=opened;editor?.classList.add('is-preview-detached');label();opened.addEventListener('pagehide',restore);opened.focus();
        const relay=()=>window.dispatchEvent(new Event('resize'));opened.addEventListener('resize',relay);opened.addEventListener('load',relay);requestAnimationFrame(()=>{relay();setTimeout(relay,300);});
      }catch{if(marker.isConnected&&!side.isConnected)marker.replaceWith(side);opened.close();restore();RI.toast('پنجرهٔ پیش‌نمایش باز نشد؛ دوباره تلاش کن.',{kind:'error'});}
    };
    label();button.addEventListener('click',toggle);
    window.addEventListener('pagehide',restore);
    return ()=>{disposed=true;button.removeEventListener('click',toggle);window.removeEventListener('pagehide',restore);restore();marker.remove();};
  };

  RI.thumbHtml = function (kind, tplId, theme) {
    return '<img src="/brand/template-thumbs/'+kind+'-'+tplId+'.jpg" alt="نمای قالب '+esc(RI.findTemplate(kind,tplId)?.name||tplId)+'" loading="lazy" decoding="async" width="480" height="343" style="width:100%;height:100%;object-fit:cover;object-position:top">';
  };

  /* ---------- پیش‌نمایش تمام‌صفحه با نوار آدرس ---------- */
  RI.openPreview = function (kind, o) {
    o = o || {};
    let pv;
    const m = RI.modal({
      title: o.title || 'پیش‌نمایش صفحه', size: 'xl',
      body: '<div id="fullpv" class="pvhost--full"></div>',
      actions: o.actions || [{ label: 'بستن', kind: 'ghost' }],
      onClose: () => pv && pv.destroy(),
      onMount: (api) => {
        pv = new RI.Preview(RI.$('#fullpv', api.body), { kind: kind, device: o.device || 'desktop', switchKind: true, content: o.content, theme: o.theme, maxScale: 1 });
      },
    });
    return m;
  };
})();
