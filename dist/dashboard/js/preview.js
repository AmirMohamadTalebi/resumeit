/* پیش‌نمایش زندهٔ صفحهٔ رزومه و لینک + قاب دستگاه (موبایل/دسکتاپ) */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});
  const esc = RI.esc;
  const socialUrl=s=>RI.isUrl(s.handle)?RI.normUrl(s.handle):({github:'https://github.com/',linkedin:'https://linkedin.com/in/',telegram:'https://t.me/',instagram:'https://instagram.com/',twitter:'https://x.com/',youtube:'https://youtube.com/@'}[s.platform]||'https://resumeit.ir/')+encodeURIComponent(s.handle.replace(/^@/,''));

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
  const onColor = (hex) => (lum(hex) > 0.42 ? '#10181e' : '#ffffff');

  function palColors(palId) {
    const p = RI.PALETTES.find((x) => x.id === palId);
    return p && p.colors ? p.colors : null;
  }

  /* مقدارهای CSS برای یک قالب رزومه */
  RI.resumeVars = function (t, theme) {
    const v = Object.assign({}, t.v), pc = palColors(theme.palette);
    if (pc) { v.accent = pc[0]; v.accent2 = pc[1]; }
    const f = RI.FONTS.find((x) => x.id === theme.font) || RI.FONTS[0];
    const r = (RI.RADII[theme.radius] || RI.RADII.soft)[1];
    return '--pv-bg:' + v.bg + ';--pv-surface:' + v.surface + ';--pv-ink:' + v.ink + ';--pv-muted:' + v.muted + ';--pv-accent:' + v.accent + ';--pv-accent2:' + v.accent2 +
      ';--pv-on:' + onColor(v.accent) + ';--pv-hero:' + v.hero + ';--pv-line:' + v.line + ';--pv-r:' + r + ';--pv-font:' + (t.mono && f.id === 'vazir' ? "'Vazirmatn', ui-monospace, Consolas, monospace" : f.stack) +
      ';--pv-hw:' + f.hw + ';--pv-ls:' + (f.spacing || '0') + ';--pv-hfont:' + (t.serif ? "'Noto Naskh Arabic','Times New Roman',serif" : 'inherit');
  };
  RI.linksVars = function (t, theme, style) {
    const v = Object.assign({}, t.v), pc = palColors(theme.linksPalette);
    if (pc) { v.accent = pc[0]; }
    const bgo = RI.LINK_BGS.find((b) => b.id === (style && style.bgOverride));
    if (bgo && bgo.bg) { v.bg = bgo.bg; v.ink = bgo.ink; v.muted = bgo.muted; }
    const f = RI.FONTS.find((x) => x.id === theme.font) || RI.FONTS[0];
    const r = (RI.RADII[theme.radius] || RI.RADII.soft)[1];
    return '--lv-bg:' + v.bg + ';--lv-ink:' + v.ink + ';--lv-muted:' + v.muted + ';--lv-btn:' + v.btnBg + ';--lv-btn-ink:' + v.btnInk + ';--lv-btn-bd:' + v.btnBd + ';--lv-accent:' + v.accent + ';--lv-r:' + r + ';--pv-font:' + f.stack + ';--pv-hw:' + f.hw + ';--pv-ls:' + (f.spacing || '0');
  };

  const LV = (n) => (RI.LANG_LEVELS[(n || 3) - 1] || '');
  const dots = (n) => '<span class="pv-dots" aria-hidden="true">' + [1, 2, 3, 4, 5].map((i) => '<i' + (i <= n ? ' class="on"' : '') + '></i>').join('') + '</span>';
  const when = (x) => (x.from || '') + (x.from ? ' — ' : '') + (x.current ? 'اکنون' : (x.to || ''));

  function brandFoot() {
    if (!RI.state.account.brand) return '';
    return '<footer class="pv-foot"><span>ساخته‌شده با</span> <span class="ri-logo"><img src="/brand/resumeit-logo-v1.png" alt="ResumeIt" width="2172" height="724"></span></footer>';
  }
  function nav(c, active, base) {
    const nm = c.profile.name.trim() || 'نام شما';
    return '<nav class="pv-nav" aria-label="منوی صفحه"><span class="pv-nav__brand">' + esc(nm) + '</span><span class="pv-nav__links"><a href="' + esc(base === undefined ? '#' : base + '/') + '" data-pv-go="resume" class="' + (active === 'resume' ? 'is-on' : '') + '">رزومه</a><a href="' + esc(base === undefined ? '#' : base + '/links') + '" data-pv-go="links" class="' + (active === 'links' ? 'is-on' : '') + '">لینک‌ها</a></span></nav>';
  }

  const SEC_TITLES = { skills: ['مهارت‌ها', 'sparkle'], experience: ['تجربه‌های کاری', 'briefcase'], education: ['تحصیلات', 'book'], projects: ['پروژه‌ها و نمونه‌کارها', 'code'], certs: ['دوره‌ها، گواهی‌ها و افتخارات', 'award'], languages: ['زبان‌ها', 'language'] };

  function bodySection(key, c) {
    const items = c[key];
    if (!items || !items.length) return '';
    let inner = '';
    if (key === 'skills') inner = '<ul class="pv-chips">' + items.map((s) => '<li>' + esc(s.name) + dots(s.level) + '</li>').join('') + '</ul>';
    if (key === 'experience') inner = '<ol class="pv-tl">' + items.map((x) => '<li><b>' + esc(x.role) + '</b><span class="pv-sub">' + esc(x.org) + ' · ' + esc(when(x)) + '</span>' + (x.desc ? '<p>' + esc(x.desc) + '</p>' : '') + '</li>').join('') + '</ol>';
    if (key === 'education') inner = '<ol class="pv-tl">' + items.map((x) => '<li><b>' + esc(x.degree) + '</b><span class="pv-sub">' + esc(x.school) + ' · ' + esc(when(x)) + '</span>' + (x.desc ? '<p>' + esc(x.desc) + '</p>' : '') + '</li>').join('') + '</ol>';
    if (key === 'projects') inner = '<div class="pv-proj">' + items.map((x) => '<article><div class="pv-proj__img" style="' + esc(RI.bg(x.image) || 'background:var(--pv-line)') + '"></div><div class="pv-proj__body"><b>' + esc(x.title) + '</b><p>' + esc(x.desc) + '</p>' + (x.url ? '<a class="pv-url ltr" data-pv-link="1" href="'+esc(RI.isUrl(x.url)?RI.normUrl(x.url):'#')+'" rel="noopener noreferrer">' + esc(x.url) + '</a>' : '') + '</div></article>').join('') + '</div>';
    if (key === 'certs') inner = '<ul class="pv-list">' + items.map((x) => '<li><b>' + esc(x.title) + '</b><span class="pv-sub">' + esc(x.issuer) + (x.year ? ' · ' + esc(x.year) : '') + '</span></li>').join('') + '</ul>';
    if (key === 'languages') inner = '<ul class="pv-list pv-list--inline">' + items.map((x) => '<li><b>' + esc(x.name) + '</b><span class="pv-sub">' + LV(x.level) + '</span></li>').join('') + '</ul>';
    return '<section class="pv-sec pv-sec--' + key + '"><h3>' + esc(SEC_TITLES[key][0]) + '</h3>' + inner + '</section>';
  }

  RI.resumeHtml = function (c, o) {
    o = o || {};
    const theme = Object.assign({}, c.theme, o.theme || {});
    const t = RI.findTemplate('resume', theme.resume);
    const spec = RI.resumeSpec(theme.resume), templateValues = RI.resumeValues(c, theme.resume);
    if (RI.RESUME_RENDERERS[theme.resume]) return RI.RESUME_RENDERERS[theme.resume](c, { theme, spec, values: templateValues, publicBase: o.publicBase });
    const p = c.profile;
    const vis = (k) => { const s = c.sections.find((x) => x.key === k); return spec.sections.includes(k) && (!s || s.visible); };
    const contacts = vis('contacts') ? c.contacts.filter((x) => x.public && x.value.trim()) : [];
    const socials = vis('socials') ? c.socials : [];
    const ICON = { email: 'mail', phone: 'phone', website: 'globe' };
    const idBlock =
      '<div class="pv-id"><img class="pv-avatar" src="' + esc(RI.avatarOf(p)) + '" alt="">' +
      '<h1 class="pv-name">' + (p.name.trim() ? esc(p.name) : '<span class="pv-ph">نام شما</span>') + '</h1>' +
      '<p class="pv-title">' + (p.title.trim() ? esc(p.title) : '<span class="pv-ph">عنوان حرفه‌ای یا تحصیلی</span>') + '</p>' +
      (p.location ? '<p class="pv-loc">' + RI.icon('pin') + esc(p.location) + '</p>' : '') +
      (contacts.length ? '<ul class="pv-contacts">' + contacts.map((x) => '<li>' + RI.icon(ICON[x.type] || 'link') + '<a class="ltr" data-pv-link="1" href="' + esc(x.type==='email'&&RI.isEmail(x.value)?'mailto:'+x.value:x.type==='phone'?'tel:'+x.value.replace(/[^+0-9]/g,''):RI.isUrl(x.value)?RI.normUrl(x.value):'#') + '" rel="noopener noreferrer">' + esc(x.value) + '</a></li>').join('') + '</ul>' : '') +
      (socials.length ? '<ul class="pv-socials">' + socials.map((s) => '<li title="' + esc(s.platform) + '"><a data-pv-link="1" href="'+esc(socialUrl(s))+'" rel="noopener noreferrer">' + RI.icon(s.platform) + '<span class="ltr">' + esc(s.handle) + '</span></a></li>').join('') + '</ul>' : '') + '</div>';
    const order = c.sections.map((s) => s.key).filter((k) => SEC_TITLES[k] && vis(k));
    const extras = spec.fields.filter(f => f.public === true && RI.resumeValue(templateValues.fields || {}, f)).map(f => '<section class="pv-sec"><h2>' + esc(f.label) + '</h2><p>' + esc(f.type === 'checkbox' ? 'بله' : RI.resumeValue(templateValues.fields || {}, f)) + '</p></section>').join('');
    const body = order.map((k) => bodySection(k, c)).join('') + extras;
    const bio = p.bio.trim() ? '<section class="pv-sec pv-about"><p>' + esc(p.bio) + '</p></section>' : '';
    const empty = !body && !bio ? '<section class="pv-sec pv-empty"><p>هنوز محتوایی اضافه نشده است. از بخش «رزومه» شروع کنید؛ این‌جا همان لحظه ساخته می‌شود.</p></section>' : '';
    const cover = '<div class="pv-cover" style="' + esc(RI.bg(p.cover) || 'background:var(--pv-hero)') + '"></div>';
    return '<div class="pv pv--' + t.layout + (t.mono ? ' pv--mono' : '') + '" style="' + esc(RI.resumeVars(t, theme)) + '">' + nav(c, 'resume', o.publicBase) + cover +
      '<div class="pv-wrap">' + idBlock + '<main class="pv-main">' + bio + body + empty + '</main></div>' + brandFoot() + '</div>';
  };

  RI.linksHtml = function (c, o) {
    o = o || {};
    const theme = Object.assign({}, c.theme, o.theme || {});
    const t = RI.findTemplate('links', theme.links);
    const h = c.links.header, p = c.profile, st = c.links.style;
    const name = (h.sync ? p.name : h.name).trim(), bio = (h.sync ? p.bio : h.bio).trim();
    const items = c.links.items.filter((i) => i.type === 'divider' || i.active);
    const list = items.map((i) => {
      if (i.type === 'divider') return '<li class="lv-div"><span>' + esc(i.title) + '</span></li>';
      const feat = i.featured ? ' lv-btn--feat' : '';
      return '<li><a href="' + esc(o.publicBase === undefined ? RI.normUrl(i.url) : o.publicBase + '/out/' + i.id) + '" rel="noopener noreferrer" class="lv-btn lv-btn--' + t.btn + feat + '" data-pv-link="1">' +
        (i.image ? '<span class="lv-btn__img" style="' + esc(RI.bg(i.image)) + '"></span>' : '<span class="lv-btn__ico">' + RI.icon(i.icon || 'link') + '</span>') +
        '<span class="lv-btn__txt"><b>' + esc(i.title) + '</b>' + (i.featured ? '<small class="ltr">' + esc(RI.hostOf(i.url || '')) + '</small>' : '') + '</span>' + (i.featured ? '<span class="lv-btn__star">' + RI.icon('star') + '</span>' : '') + '</a></li>';
    }).join('');
    const socials = c.socials.length ? '<ul class="lv-soc">' + c.socials.map((s) => '<li title="' + esc(s.platform) + '"><a data-pv-link="1" href="'+esc(socialUrl(s))+'" rel="noopener noreferrer" aria-label="'+esc(s.platform)+'">' + RI.icon(s.platform) + '</a></li>').join('') + '</ul>' : '';
    const empty = !items.length ? '<li class="lv-empty">لینکی برای نمایش نیست؛ از «لینک‌ها» یک لینک فعال اضافه کنید.</li>' : '';
    return '<div class="lv lv--' + (st.align === 'start' ? 'start' : 'center') + '" style="' + esc(RI.linksVars(t, theme, st)) + '">' + nav(c, 'links', o.publicBase) +
      '<div class="lv-head"><img class="lv-avatar' + (st.ring ? ' lv-avatar--ring' : '') + '" src="' + esc(RI.avatarOf(p)) + '" alt="">' +
      '<h1>' + (name ? esc(name) : '<span class="pv-ph">نام شما</span>') + '</h1>' + (bio ? '<p>' + esc(bio) + '</p>' : '') + '</div>' +
      '<ul class="lv-list">' + list + empty + '</ul>' + socials + brandFoot() + '</div>';
  };

  /* ---------- قاب دستگاه ---------- */
  const NAT = { mobile: [390, 780], desktop: [1120, 700] };

  RI.Preview = function (host, o) {
    const st = { kind: o.kind || 'resume', device: o.device || 'mobile' };
    host.classList.add('pvhost');
    host.innerHTML =
      '<div class="pvhost__bar">' + (o.toolbar === false ? '' :
        '<div class="segmented" role="group" aria-label="نوع دستگاه">' +
        '<button type="button" data-dev="mobile" aria-pressed="' + (st.device === 'mobile') + '">' + RI.icon('phone') + 'موبایل</button>' +
        '<button type="button" data-dev="desktop" aria-pressed="' + (st.device === 'desktop') + '">' + RI.icon('monitor') + 'دسکتاپ</button></div>') +
      (o.switchKind ? '<div class="segmented" role="group" aria-label="صفحه"><button type="button" data-kind="resume" aria-pressed="' + (st.kind === 'resume') + '">رزومه</button><button type="button" data-kind="links" aria-pressed="' + (st.kind === 'links') + '">لینک‌ها</button></div>' : '') +
      '</div><div class="pvhost__stage"><div class="device device--' + st.device + '"><div class="device__bar"><span class="device__dots"><i></i><i></i><i></i></span><span class="device__url ltr"></span></div>' +
      '<div class="device__box"><div class="device__scaler"><div class="device__vp"></div></div></div></div></div>';
    const stage = RI.$('.pvhost__stage', host), dev = RI.$('.device', host), box = RI.$('.device__box', host);
    const scaler = RI.$('.device__scaler', host), vp = RI.$('.device__vp', host), urlEl = RI.$('.device__url', host);

    function fit() {
      const nat = NAT[st.device];
      const w = stage.clientWidth || host.clientWidth || 360;
      let k = Math.min(1, (w - (st.device === 'mobile' ? 16 : 2)) / nat[0]);
      if (o.fitHeight) k = Math.min(k, Math.max(0.3, (window.innerHeight - o.fitHeight) / (nat[1] + 40)));
      if (o.maxScale) k = Math.min(k, o.maxScale);
      scaler.style.width = nat[0] + 'px'; scaler.style.height = nat[1] + 'px';
      scaler.style.transform = 'scale(' + k + ')';
      box.style.width = nat[0] * k + 'px'; box.style.height = nat[1] * k + 'px';
    }
    function render(anim) {
      const c = o.content ? o.content() : RI.C();
      const top = vp.scrollTop;
      const theme = o.theme ? o.theme() : null;
      vp.innerHTML = st.kind === 'resume' ? RI.resumeHtml(c, { theme: theme }) : RI.linksHtml(c, { theme: theme });
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
      destroy() { ro.disconnect(); },
    };
    const ro = new ResizeObserver(() => fit());
    ro.observe(stage);
    fit(); render(false);
    return api;
  };

  /* ---------- بندانگشتی قالب‌ها برای گالری ---------- */
  let demoC = null;
  RI.demoContent = function () { if (!demoC) demoC = RI.seed('full'); return demoC; };
  RI.thumbHtml = function (kind, tplId, theme) {
    const c = RI.demoContent();
    const html = kind === 'resume' ? RI.resumeHtml(c, { theme: Object.assign({ resume: tplId }, theme || {}) }) : RI.linksHtml(c, { theme: Object.assign({ links: tplId }, theme || {}) });
    return '<div class="thumb thumb--' + kind + '" aria-hidden="true"><div class="thumb__scaler">' + html + '</div></div>';
  };
  RI.fitThumbs = function (root) {
    RI.$$('.thumb', root).forEach((t) => {
      const sc = RI.$('.thumb__scaler', t), nat = t.classList.contains('thumb--links') ? 390 : 1120;
      const k = t.clientWidth / nat;
      sc.style.width = nat + 'px'; sc.style.transform = 'scale(' + k + ')';
    });
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
