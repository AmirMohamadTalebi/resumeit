/* استودیوی رزومه: همهٔ بخش‌ها در یک صفحه، ویرایش درجا، پیش‌نمایش زنده و دستیار هوشمند.
   ورودی‌ها پیش‌فرض درست‌اند؛ فقط شکل‌شان مرتب می‌شود و هیچ‌وقت جلوی ذخیره را نمی‌گیرند. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  const META = {
    profile: ['معرفی', 'user'], contacts: ['راه‌های تماس', 'phone'], socials: ['شبکه‌های اجتماعی', 'globe'], skills: ['مهارت‌ها', 'sparkle'],
    experience: ['تجربهٔ کاری', 'briefcase'], education: ['تحصیلات', 'book'], projects: ['پروژه‌ها و نمونه‌کارها', 'code'],
    certs: ['دوره‌ها و افتخارات', 'award'], languages: ['زبان‌ها', 'language'], template: ['محتوای اختصاصی قالب', 'palette'], settings: ['چیدمان و امضا', 'sliders'],
  };
  const LEADS = {
    profile: 'اولین چیزی که خواننده می‌بیند؛ نام، عنوان و یک معرفی کوتاه.',
    contacts: 'هر راه تماس را جدا عمومی یا پنهان کن؛ پنهان‌ها هیچ‌وقت منتشر نمی‌شوند.',
    socials: 'نام کاربری یا آدرس کامل را بچسبان؛ شبکه خودش تشخیص داده می‌شود.',
    skills: 'بنویس و Enter بزن؛ با ویرگول چند مهارت را یک‌جا اضافه کن. سطح را با نقطه‌ها انتخاب کن.',
    experience: 'کار، کارآموزی، فریلنس و همکاری داوطلبانه همه تجربه‌اند.',
    education: 'مقطع، رشته و محل تحصیل؛ معدل یا افتخار را در توضیح بیاور.',
    projects: 'یک پروژهٔ خوب با تصویر و لینک از ده خط توضیح گویاتر است.',
    certs: 'دوره‌های معتبر، گواهی‌ها و رتبه‌ها.',
    languages: 'زبان‌هایی که با آن‌ها کار می‌کنی و سطح هرکدام.',
    template: 'متن‌ها و تنظیمات مخصوص قالبی که انتخاب کرده‌ای.',
    settings: 'ترتیب بخش‌ها را با کشیدن یا فلش‌ها عوض کن و هر بخش را پنهان یا آشکار کن؛ پنهان‌کردن چیزی را پاک نمی‌کند.',
  };
  const ITEMS = {
    experience: { add: 'افزودن تجربه', main: 'role', fields: [['role', 'عنوان شغلی', 'مثلاً توسعه‌دهندهٔ فرانت‌اند', 60], ['org', 'محل کار یا مجموعه', 'مثلاً استارتاپ رزومیت', 60], ['from', 'شروع', '۱۴۰۲/۰۶', 12, 'date'], ['to', 'پایان', '۱۴۰۳/۰۱', 12, 'date'], ['current', 'هنوز ادامه دارد', '', 0, 'current'], ['desc', 'چه کردی و چه نتیجه‌ای داشت؟', 'مثلاً صفحهٔ پرداخت را بازطراحی کردم و خطای کاربران کمتر شد', 300, 'textarea']],
      title: x => x.role || x.org, sub: x => [x.org !== x.role && x.org, period(x)].filter(Boolean).join(' · ') },
    education: { add: 'افزودن مقطع', main: 'degree', fields: [['degree', 'مقطع و رشته', 'مثلاً کارشناسی مهندسی کامپیوتر', 80], ['school', 'دانشگاه یا مدرسه', 'مثلاً دانشگاه تهران', 80], ['from', 'شروع', '۱۳۹۹', 12, 'date'], ['to', 'پایان', '۱۴۰۳', 12, 'date'], ['current', 'در حال تحصیل', '', 0, 'current'], ['desc', 'توضیح', 'معدل، پایان‌نامه یا افتخار', 240, 'textarea']],
      title: x => x.degree || x.school, sub: x => [x.school !== x.degree && x.school, period(x)].filter(Boolean).join(' · ') },
    projects: { add: 'افزودن پروژه', main: 'title', fields: [['title', 'نام پروژه', 'مثلاً اپ رزرو نوبت', 60], ['desc', 'مسئله، کار تو و نتیجه', 'در دو سه جمله بگو چه ساختی و چرا', 280, 'textarea'], ['url', 'لینک پروژه', 'github.com/you/project', 2048, 'url'], ['image', 'تصویر پروژه', '', 0, 'image']],
      title: x => x.title, sub: x => x.url || (x.desc || '').slice(0, 70) },
    certs: { add: 'افزودن مورد', main: 'title', fields: [['title', 'عنوان دوره یا افتخار', 'مثلاً دورهٔ تحلیل داده', 80], ['issuer', 'برگزارکننده', 'مثلاً مکتب‌خونه', 60], ['year', 'سال', '۱۴۰۲', 8, 'date']],
      title: x => x.title, sub: x => [x.issuer, x.year].filter(Boolean).join(' · ') },
  };
  const HINTS = { desc: 'شرح کوتاه و واقعی از کار، نتیجه یا سابقهٔ خودت؛ از ادعاهای ساختگی پرهیز کن.', from: 'زمان شروع؛ می‌توانی سال یا سال و ماه بنویسی.', to: 'زمان پایان؛ اگر هنوز ادامه دارد این مقدار نمایش داده نمی‌شود.', current: 'اگر روشن باشد به‌جای تاریخ پایان، ادامه‌داشتن این سابقه نشان داده می‌شود.', url: 'نشانی مقصد پروژه؛ بازدیدکننده از این لینک به پروژه می‌رود.', image: 'تصویر معرفی پروژه، در بخش نمونه‌کارها و پنجرهٔ توضیح پروژه.' };
  const CONTACT_ICON = { email: 'mail', phone: 'phone', website: 'globe' };
  const SOCIAL_HOSTS = [[/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i, 'github'], [/^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#\s]+)/i, 'linkedin'], [/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([^/?#\s]+)/i, 'telegram'], [/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)/i, 'instagram'], [/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([^/?#\s]+)/i, 'twitter'], [/^(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([^/?#\s]+)/i, 'youtube']];
  const latinDigits = s => String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  function period(x) { return (x.from || '') + (x.current ? ' تا اکنون' : x.to ? ' تا ' + x.to : ''); }
  // Shape-only tidy-up: never rejects, never blocks saving.
  const tidy = { email: v => latinDigits(v).trim().toLowerCase(), phone: v => latinDigits(v).trim(), website: v => v.trim(), url: v => v.trim(), date: v => v.trim() };

  RI.registerPage('resume', {
    title: 'ساخت و ویرایش رزومه',
    render() {
      const c = RI.C();
      return RI.pageHead({ title: 'رزومهٔ من', desc: 'قالب: <b>' + esc(RI.findTemplate('resume', c.theme.resume).name) + '</b> · همه‌چیز خودکار ذخیره می‌شود',
        actions: '<button type="button" class="btn btn--soft btn--sm show-sm" data-live>' + RI.icon('eye') + 'پیش‌نمایش</button><a class="btn btn--soft btn--sm" href="/dashboard/themes/" data-go="themes">' + RI.icon('palette') + 'ظاهر و قالب</a><button type="button" class="btn btn--ghost btn--sm hide-sm" data-detach-preview aria-pressed="false">' + RI.icon('external') + 'پیش‌نمایش در پنجرهٔ جدا</button><button type="button" class="btn btn--ghost btn--sm" data-reset-page="resume">' + RI.icon('trash') + 'شروع از صفر</button>' }) +
        '<div class="rs" id="resume-studio"><nav class="rs-nav" aria-label="بخش‌های رزومه"><div id="rs-nav"></div></nav>' +
        '<div class="rs-canvas"><div id="rs-ready"></div><details class="rs-assist-m" id="rs-assist-mobile"><summary>' + RI.icon('sparkle') + '<span>دستیار رزومه</span><span class="rs-badge" data-assist-count hidden></span>' + RI.icon('chevD') + '</summary></details><div id="rs-cards"></div></div>' +
        '<aside class="rs-side editor__side" aria-label="پیش‌نمایش و دستیار"><div class="sticky"><div class="segmented rs-side__tabs" role="tablist" aria-label="نمای کنار"><button type="button" role="tab" id="rs-tab-preview" data-side="preview" aria-selected="true" aria-controls="rs-side-preview">' + RI.icon('eye') + 'پیش‌نمایش</button><button type="button" role="tab" id="rs-tab-assist" data-side="assist" aria-selected="false" aria-controls="rs-side-assist">' + RI.icon('sparkle') + 'دستیار<span class="rs-badge" data-assist-count hidden></span></button></div>' +
        '<div id="rs-side-preview" role="tabpanel" aria-labelledby="rs-tab-preview"><div id="rpv"></div></div><div id="rs-side-assist" role="tabpanel" aria-labelledby="rs-tab-assist" hidden><div id="resume-advisor"></div></div></div></aside></div>';
    },
    mount(root, ctx) {
      const owner = RI.ownerId, slot = RI.workspaceSlot, alive = () => root.isConnected && RI.ownerId === owner && RI.workspaceSlot === slot;
      const templateId = RI.C().theme.resume, imported = ['vista', 'satiar'].includes(templateId);
      let templateReady = !imported || (!!RI.IMPORTED_TEMPLATES[templateId] && !!RI.mountImportedEditor), templateFailed = false, templateLoading = false;
      let spec = RI.resumeSpec(templateId), templateGroup = 'general', advisorCleanup = null, advisorCounts = {}, publishing = false, undo = null, undoTimer = 0, sideTab = 'preview';
      const open = new Set(), drafts = new Map(), cardsHost = RI.$('#rs-cards', root), navHost = RI.$('#rs-nav', root), readyHost = RI.$('#rs-ready', root);
      RI.bindBranding(root);

      /* ---------- preview ---------- */
      const previewHost = RI.$('#rpv', root);
      let preview = null, previewPage = 'home', previewSection = null;
      const pv = { refresh: () => preview?.refresh(false), setTemplatePage: id => { previewPage = id; preview?.setTemplatePage(id); }, setTemplateSection: (key, label) => { previewSection = [key, label]; preview?.setTemplateSection(key, label); }, destroy: () => preview?.destroy() };
      const detachCleanup = RI.detachPreviewToggle(root, root.querySelector('.rs-side'), root.querySelector('[data-detach-preview]'));
      const loading = label => '<div data-resume-template-loading>' + RI.sectionLoading(label) + '</div>';
      const failed = (attr = 'data-resume-template-retry') => '<div class="section-loading"><p role="alert">قالب دریافت نشد؛ اطلاعات اصلی همچنان قابل ویرایش است.</p><button type="button" class="btn btn--soft" ' + attr + '>تلاش دوباره</button></div>';
      function startPreview() { if (!alive() || RI.C().theme.resume !== templateId) return; preview?.destroy(); preview = new RI.Preview(previewHost, { kind: 'resume', device: 'mobile', fitHeight: 200 }); preview.setTemplatePage(previewPage); if (previewSection) preview.setTemplateSection(...previewSection); }
      async function loadTemplateParts() {
        if (templateLoading || !alive()) return; templateLoading = true; templateFailed = false; previewHost.innerHTML = loading('در حال دریافت قالب…');
        try {
          await Promise.all([RI.loadTemplates([templateId]), RI.loadResumeEditor()]);
          if (!alive() || RI.C().theme.resume !== templateId) return;
          templateReady = true; spec = RI.resumeSpec(templateId);
          if (wantedGroup && groupExists(wantedGroup) && templateGroup !== wantedGroup) { templateGroup = wantedGroup; requestAnimationFrame(() => goto('template')); }
          reconcile(); requestAnimationFrame(() => requestAnimationFrame(startPreview)); startAdvisor();
        } catch { if (!alive()) return; templateFailed = true; previewHost.innerHTML = failed(); paintCard('template'); }
        finally { templateLoading = false; }
      }

      /* ---------- section order ---------- */
      const hasTemplateCard = () => imported || spec.fields.length > 0 || spec.settings.length > 0;
      const bodyKeys = () => RI.C().sections.map(s => s.key).filter(k => spec.sections.includes(k));
      const order = () => ['profile', ...bodyKeys(), ...(hasTemplateCard() ? ['template'] : []), 'settings'];
      const visible = key => key === 'profile' || key === 'template' || key === 'settings' || !!RI.C().sections.find(s => s.key === key)?.visible;
      const count = key => { const c = RI.C(); return key === 'contacts' ? c.contacts.filter(x => x.value.trim()).length : Array.isArray(c[key]) ? c[key].length : 0; };
      function status(key) {
        const c = RI.C(), p = c.profile;
        if (key === 'profile') return p.name.trim() && p.title.trim() ? ['done', 'کامل'] : p.name.trim() || p.title.trim() ? ['part', 'نیمه‌کاره'] : ['empty', 'خالی'];
        if (key === 'contacts') { const pub = c.contacts.filter(x => x.public && x.value.trim()).length; return pub ? ['done', RI.fa(pub) + ' عمومی'] : count(key) ? ['part', 'همه پنهان'] : ['empty', 'خالی']; }
        if (key === 'template') return imported ? (RI.resumeValues(c).settings.reviewed ? ['done', 'بررسی‌شده'] : ['part', 'نیازمند مرور']) : ['done', 'تنظیمات'];
        if (key === 'settings') return ['done', ''];
        const n = count(key); return n ? ['done', RI.fa(n) + ' مورد'] : ['empty', 'خالی'];
      }

      /* ---------- navigation rail ---------- */
      function navHtml() {
        const pct = RI.completion().pct, label = pct >= 90 ? 'درخشان' : pct >= 70 ? 'قوی' : pct >= 40 ? 'در حال رشد' : 'تازه شروع شده';
        const ring = '<svg class="rs-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" class="rs-ring__bg"></circle><circle cx="22" cy="22" r="19" class="rs-ring__fg" pathLength="100" style="stroke-dasharray:' + pct + ' 100"></circle></svg>';
        return '<div class="rs-score" role="status" aria-label="قدرت رزومه ' + RI.fa(pct) + ' درصد، ' + label + '">' + ring + '<div><b>' + RI.fa(pct) + '٪</b><span>' + label + '</span></div></div><ol class="rs-nav__list" id="rs-nav-list">' + order().map(key => {
          const [state, text] = status(key), m = META[key], badge = advisorCounts[key] || 0;
          return '<li class="rs-nav__item' + (visible(key) ? '' : ' is-off') + '" data-key="' + key + '"><button type="button" class="rs-nav__go" data-goto="' + key + '" id="resume-step-' + key + '" title="' + esc(m[0] + (text ? ' · ' + text : '')) + '"><span class="rs-nav__dot is-' + state + '" aria-hidden="true"></span>' + RI.icon(m[1]) + '<span class="rs-nav__txt">' + m[0] + '</span>' + (badge ? '<span class="rs-badge" aria-label="' + RI.fa(badge) + ' پیشنهاد">' + RI.fa(badge) + '</span>' : '') + '<span class="sr-only">' + esc(text) + '</span></button></li>';
        }).join('') + '</ol>';
      }
      function paintNav() {
        const active = navHost.querySelector('[aria-current="true"]')?.dataset.goto, scroll = navHost.querySelector('.rs-nav__list')?.scrollLeft || 0, focused = navHost.contains(document.activeElement) ? document.activeElement.id : '';
        navHost.innerHTML = navHtml();
        if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
        if (active) navHost.querySelector('[data-goto="' + active + '"]')?.setAttribute('aria-current', 'true');
        const list = navHost.querySelector('.rs-nav__list'); if (list && scroll && list.scrollLeft !== scroll) list.scrollLeft = scroll;
      }
      function layoutRows() {
        const c = RI.C(), keys = bodyKeys();
        return '<ol class="rs-layout" id="rs-layout">' + keys.map((key, i) => '<li class="rs-layout__row' + (visible(key) ? '' : ' is-off') + '" data-id="' + key + '"><span class="rs-item__grip" data-lgrip aria-hidden="true">' + RI.icon('grip') + '</span><span class="rs-layout__ico">' + RI.icon(META[key][1]) + '</span><span class="rs-layout__txt"><b>' + META[key][0] + '</b><small>' + esc(status(key)[1]) + '</small></span>' +
          '<button type="button" class="btn btn--icon btn--ghost btn--sm" data-lmove="-1" aria-label="بالا بردن ' + META[key][0] + '"' + (!i ? ' disabled' : '') + '>' + RI.icon('up') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-lmove="1" aria-label="پایین بردن ' + META[key][0] + '"' + (i === keys.length - 1 ? ' disabled' : '') + '>' + RI.icon('down') + '</button>' +
          RI.switchHtml({ checked: visible(key), label: 'نمایش ' + META[key][0] + ' در رزومه' }).replace('<input', '<input data-svis="' + key + '"') + '</li>').join('') + '</ol>';
      }
      function moveSection(key, to) {
        const secs = RI.C().sections, shown = secs.filter(s => spec.sections.includes(s.key)), from = shown.findIndex(s => s.key === key);
        if (from < 0 || to < 0 || to >= shown.length || from === to) return;
        RI.move(secs, secs.indexOf(shown[from]), secs.indexOf(shown[to])); RI.touch('sections'); paintAll();
        RI.$('#rs-layout [data-id="' + key + '"] [data-lmove]:not(:disabled)', root)?.focus({ preventScroll: true });
      }

      /* ---------- readiness & publish ---------- */
      function readyHtml() {
        const c = RI.C(), items = RI.readiness().resume.filter(x => x.req), missing = items.filter(x => !x.done), live = RI.state.pub.resume.status === 'published';
        const reviewNeeded = imported && templateReady && !RI.resumeValues(c, c.theme.resume).settings.reviewed;
        const blocked = missing.length || reviewNeeded;
        const action = x => /^(account-first|account-last)$/.test(x.id) ? '<button type="button" class="btn btn--soft btn--sm" data-names>تکمیل نام حساب</button>' : x.id === 'account-phone' ? '<button type="button" class="btn btn--soft btn--sm" data-account-phone>تأیید شماره</button>' : x.id === 'slug' ? '<button type="button" class="btn btn--soft btn--sm" data-ready-slug>انتخاب آدرس</button>' : x.route === 'resume' ? '<button type="button" class="btn btn--soft btn--sm" data-goto="' + esc(x.step === 'template' ? 'template' : order().includes(x.step) ? x.step : 'profile') + '">رفتن</button>' : '<a class="btn btn--soft btn--sm" href="' + esc(RI.routeUrl(x.route, { step: x.step, anchor: x.anchor })) + '">رفتن</a>';
        return '<details class="rs-ready' + (blocked ? '' : ' is-ready') + '"' + (blocked && c.profile.name.trim() ? ' open' : '') + '><summary><span class="rs-ready__icon">' + RI.icon(blocked ? 'flag' : 'rocket') + '</span><span class="rs-ready__text"><b>' + (blocked ? (missing.length ? RI.fa(missing.length + (reviewNeeded ? 1 : 0)) + ' قدم تا انتشار' : 'یک مرور تا انتشار') : live ? (RI.pubDirty('resume') ? 'تغییرات تازه هنوز منتشر نشده' : 'رزومه منتشر و به‌روز است') : 'رزومه آمادهٔ انتشار است') + '</b><small>' + (blocked ? 'بقیهٔ بخش‌ها به انتخاب توست؛ ویرایش هیچ‌وقت قفل نمی‌شود.' : esc(c.slug ? RI.urls().resume : '')) + '</small></span>' +
          '<span class="rs-ready__actions"><button type="button" class="btn btn--soft btn--sm" data-live>' + RI.icon('eye') + 'دیدن</button><button type="button" class="btn btn--primary btn--sm" data-publish ' + (blocked ? 'disabled' : '') + '>' + RI.icon('rocket') + (live ? 'به‌روزرسانی' : 'انتشار') + '</button></span></summary>' +
          (blocked ? '<ul class="rs-ready__list">' + missing.map(x => '<li><span>' + RI.icon('edit') + esc(x.label) + '</span>' + action(x) + '</li>').join('') + (reviewNeeded ? '<li><label class="rs-check"><input type="checkbox" class="checkbox" data-reviewed>متن‌ها، عکس‌ها و اطلاعات نمونهٔ قالب را با اطلاعات واقعی خودم بررسی کرده‌ام.</label></li>' : '') + '</ul>' : '') + '<p class="rs-ready__state" role="status" data-publish-state></p></details>';
      }
      const paintReady = () => {
        const wasOpen = readyHost.querySelector('details')?.open, focused = readyHost.contains(document.activeElement) ? document.activeElement : null;
        const key = focused && ['data-names', 'data-account-phone', 'data-ready-slug', 'data-publish', 'data-live', 'data-goto'].find(a => focused.hasAttribute(a));
        readyHost.innerHTML = readyHtml();
        if (wasOpen !== undefined) readyHost.querySelector('details').open = wasOpen && !readyHost.querySelector('.is-ready');
        if (focused) (readyHost.querySelector(key ? '[' + key + ']' : 'summary') || readyHost.querySelector('summary')).focus({ preventScroll: true });
      };

      /* ---------- cards ---------- */
      const card = (key, body, extra = '') => { const [state, text] = status(key), m = META[key];
        return '<section class="rs-card' + (visible(key) ? '' : ' is-off') + '" id="rs-sec-' + key + '" data-section="' + key + '" aria-labelledby="rs-h-' + key + '"><header class="rs-card__head"><span class="rs-card__ico">' + RI.icon(m[1]) + '</span><div><h2 id="rs-h-' + key + '" tabindex="-1">' + m[0] + '</h2><p>' + LEADS[key] + '</p></div><span class="rs-pill is-' + state + '">' + esc(text) + '</span>' + extra + '</header>' + (visible(key) ? '' : '<p class="rs-note">' + RI.icon('eyeOff') + 'این بخش در رزومه نمایش داده نمی‌شود؛ از کارت «چیدمان و امضا» روشنش کن.</p>') + body + '</section>'; };
      // Every field can explain itself: what it is, where it shows and its default (shared help dialog).
      const help = (label, what, where, def) => RI.fieldHelpHtml({ label, what, where, defaultValue: def });
      const field = (id, label, input, cls = '', tip = '') => '<div class="rs-field ' + cls + '"><div class="rs-field__label"><label for="' + id + '">' + label + '</label>' + tip + '</div>' + input + '</div>';
      const text = (attrs, value, o = {}) => '<input class="input" ' + attrs + ' value="' + esc(value || '') + '"' + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.ltr ? ' dir="ltr"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + ' autocomplete="off">';

      function profileCard() {
        const p = RI.C().profile;
        return card('profile', '<div class="rs-media"><div class="rs-media__item"><span class="rs-field__label">عکس پروفایل' + help('عکس پروفایل', 'چهره یا تصویر معرفی خودت؛ بارگذاری عکس اختیاری است.', 'سربرگ رزومه', '') + '</span>' + RI.imageFieldHtml('avatar', { value: p.avatar, round: true, label: 'عکس پروفایل' }) + '</div><div class="rs-media__item rs-media__item--wide"><span class="rs-field__label">تصویر کاور' + help('تصویر کاور', 'تصویر بالای رزومه؛ جای آن به قالب انتخابی بستگی دارد.', 'سربرگ رزومه', '') + '</span>' + RI.imageFieldHtml('cover', { value: p.cover, wide: true, label: 'کاور' }) + '</div></div>' +
          '<div class="rs-grid" id="pform">' + field('p_name', 'نام و نام خانوادگی', text('id="p_name" data-p="name"', p.name, { max: 50, ph: 'مثلاً نیلوفر رضایی' }), '', help('نام و نام خانوادگی', 'نامی که می‌خواهی روی رزومه دیده شود.', 'بخش معرفی در بالای رزومه', '')) + field('p_loc', 'شهر', text('id="p_loc" data-p="location"', p.location, { max: 30, ph: 'مثلاً تهران' }), '', help('شهر', 'شهر محل سکونت یا فعالیت؛ نشانی دقیق لازم نیست.', 'بخش معرفی در بالای رزومه', '')) +
          field('p_title', 'عنوان حرفه‌ای یا تحصیلی', text('id="p_title" data-p="title"', p.title, { max: 90, ph: 'مثلاً طراح رابط کاربری | دانشجوی کامپیوتر' }) + '<div class="rs-ideas" data-title-ideas></div>', 'rs-field--full', help('عنوان حرفه‌ای یا تحصیلی', 'حوزهٔ کاری یا رشتهٔ اصلی خودت را در یک خط بنویس.', 'بخش معرفی در بالای رزومه', '')) +
          field('p_bio', 'معرفی کوتاه <span class="rs-count" id="bioCount"></span>', '<textarea class="textarea" id="p_bio" data-p="bio" maxlength="300" rows="4" placeholder="دو سه جمله: چه کاری می‌کنی، در چه زمینه‌ای، و دنبال چه فرصتی هستی">' + esc(p.bio) + '</textarea>', 'rs-field--full', help('معرفی کوتاه', 'دو یا سه جمله دربارهٔ تخصص، تجربه و هدف واقعی خودت.', 'بخش معرفی در بالای رزومه', '')) + '</div>');
      }
      function contactsCard() {
        return card('contacts', '<div class="rs-contacts">' + RI.C().contacts.map(x => '<div class="rs-contact" data-cid="' + x.id + '"><span class="rs-contact__ico">' + RI.icon(CONTACT_ICON[x.type] || 'link') + '</span><div class="rs-field"><div class="rs-field__label"><label for="c_' + x.id + '">' + esc(x.label) + '</label>' + help(x.label, 'راه ارتباط با تو؛ فقط اگر کلید عمومی آن روشن باشد به بازدیدکننده نشان داده می‌شود.', 'بخش اطلاعات تماس رزومه', '') + '</div>' +
          text('id="c_' + x.id + '" data-c="' + x.id + '"', x.value, { ltr: true, mode: x.type === 'email' ? 'email' : x.type === 'phone' ? 'tel' : 'url', ph: x.type === 'email' ? 'you@example.com' : x.type === 'phone' ? '0912 345 6789' : 'example.com' }) + '</div><div class="rs-pub">' + RI.switchHtml({ checked: x.public, label: 'نمایش عمومی ' + x.label }).replace('<input', '<input data-cpub="' + x.id + '"') + '<span>' + (x.public ? RI.icon('eye') + 'عمومی' : RI.icon('eyeOff') + 'پنهان') + '</span></div></div>').join('') + '</div>');
      }
      function socialRow(x, draft) {
        return '<div class="rs-social" data-item="' + x.id + '" data-list="socials"' + (draft ? ' data-draft' : '') + '><span class="rs-social__ico" aria-hidden="true">' + RI.icon(x.platform) + '</span><label class="sr-only" for="s-' + x.id + '-platform">شبکه</label><select class="select input" id="s-' + x.id + '-platform" data-field="platform">' + RI.SOCIALS.map(s => '<option value="' + s[0] + '"' + (s[0] === x.platform ? ' selected' : '') + '>' + esc(s[1]) + '</option>').join('') + '</select><label class="sr-only" for="s-' + x.id + '-handle">نام کاربری یا آدرس</label>' + text('id="s-' + x.id + '-handle" data-field="handle"', x.handle, { ltr: true, max: 2048, ph: 'username یا آدرس کامل' }) + '<button type="button" class="btn btn--icon btn--ghost btn--sm" data-del-item aria-label="حذف ' + esc((RI.SOCIALS.find(s => s[0] === x.platform) || [0, ''])[1]) + '">' + RI.icon('x') + '</button></div>';
      }
      function socialsCard() {
        const list = RI.C().socials, used = new Set(list.map(x => x.platform));
        return card('socials', '<div class="rs-socials" data-items="socials">' + list.map(x => socialRow(x)).join('') + [...drafts.values()].filter(d => d.list === 'socials').map(d => socialRow(d.item, true)).join('') + '</div><div class="rs-quick">' + RI.SOCIALS.filter(s => !used.has(s[0])).slice(0, 6).map(s => '<button type="button" class="rs-chipbtn" data-add-social="' + s[0] + '">' + RI.icon(s[0]) + esc(s[1]) + '</button>').join('') + '</div>' + undoBar('socials'));
      }
      function chipsCard(key) {
        const list = RI.C()[key], skills = key === 'skills', levels = skills ? RI.SKILL_LEVELS : RI.LANG_LEVELS;
        const chip = x => '<span class="rs-chip" data-item="' + x.id + '" data-list="' + key + '"><input class="rs-chip__name" data-field="name" value="' + esc(x.name) + '" maxlength="' + (skills ? 40 : 30) + '" aria-label="' + (skills ? 'نام مهارت' : 'نام زبان') + '" size="' + Math.max(3, [...x.name].length) + '">' +
          '<span class="rs-dots" role="radiogroup" aria-label="سطح ' + esc(x.name) + '">' + [1, 2, 3, 4, 5].map(n => '<button type="button" role="radio" data-level="' + n + '" aria-checked="' + (n === x.level) + '" aria-label="' + esc(levels[n - 1]) + '" title="' + esc(levels[n - 1]) + '" class="' + (n <= x.level ? 'on' : '') + '"></button>').join('') + '</span><span class="rs-chip__lvl">' + esc(levels[(x.level || 3) - 1]) + '</span><button type="button" class="rs-chip__del" data-del-item aria-label="حذف ' + esc(x.name) + '">' + RI.icon('x') + '</button></span>';
        return card(key, '<div class="rs-chips" data-items="' + key + '">' + (list.length ? list.map(chip).join('') : '<p class="rs-empty">' + (skills ? 'هنوز مهارتی ننوشته‌ای؛ با مهارت‌هایی شروع کن که واقعاً به آن‌ها مسلطی.' : 'زبانی اضافه نشده.') + '</p>') + '</div>' +
          '<div class="rs-chipadd"><label class="sr-only" for="rs-add-' + key + '">' + (skills ? 'مهارت تازه' : 'زبان تازه') + '</label><input class="input" id="rs-add-' + key + '" data-chip-input="' + key + '" maxlength="200" placeholder="' + (skills ? 'مثلاً Figma، تحلیل داده، SQL' : 'مثلاً انگلیسی، عربی') + '" ' + (list.length >= RI.MAX_LIST_ITEMS ? 'disabled' : '') + '><button type="button" class="btn btn--primary btn--sm" data-chip-add="' + key + '" ' + (list.length >= RI.MAX_LIST_ITEMS ? 'disabled' : '') + '>' + RI.icon('plus') + 'افزودن</button></div>' +
          '<div class="rs-ideas" data-chip-ideas="' + key + '"></div>' + undoBar(key));
      }
      function itemCard(key, x, draft) {
        const L = ITEMS[key], isOpen = draft || open.has(x.id), title = L.title(x), sub = L.sub(x), list = RI.C()[key], i = list.indexOf(x);
        const fields = L.fields.map(([f, label, ph, max, type]) => {
          const id = 'i-' + x.id + '-' + f, tip = help(label, HINTS[f] || 'مقدار «' + label + '» برای همین مورد از بخش ' + META[key][0] + '.', 'بخش ' + META[key][0] + ' در رزومه', type === 'current' ? false : '');
          if (type === 'current') return '<div class="rs-field--full rs-checkrow"><label class="rs-check"><input type="checkbox" class="checkbox" id="' + id + '" data-field="current"' + (x.current ? ' checked' : '') + '>' + label + '</label>' + tip + '</div>';
          if (type === 'image') return '<div class="rs-field rs-field--full"><span class="rs-field__label">' + label + tip + '</span>' + RI.imageFieldHtml('project-' + x.id, { value: x.image, wide: true, label }) + '</div>';
          if (type === 'textarea') return field(id, label, '<textarea class="textarea" id="' + id + '" data-field="' + f + '" maxlength="' + max + '" rows="3" placeholder="' + esc(ph) + '">' + esc(x[f] || '') + '</textarea>', 'rs-field--full', tip);
          return field(id, label, text('id="' + id + '" data-field="' + f + '"', x[f], { max, ph, ltr: type === 'url', mode: type === 'url' ? 'url' : '' }), (type === 'date' ? 'rs-field--third' : type === 'url' ? 'rs-field--full' : '') + (f === 'to' && x.current ? ' is-hidden' : ''), tip);
        }).join('');
        return '<article class="rs-item' + (isOpen ? ' is-open' : '') + '" data-item="' + x.id + '" data-list="' + key + '"' + (draft ? ' data-draft' : '') + '><header class="rs-item__head"><span class="rs-item__grip" data-grip aria-hidden="true">' + RI.icon('grip') + '</span>' +
          '<button type="button" class="rs-item__toggle" data-toggle-item aria-expanded="' + isOpen + '" aria-controls="ib-' + x.id + '"><span class="rs-item__title" data-item-title>' + esc(title || (draft ? 'مورد تازه' : 'بدون عنوان')) + '</span><span class="rs-item__sub" data-item-sub>' + esc(sub || (draft ? 'شروع به نوشتن کن؛ خودکار ذخیره می‌شود' : '')) + '</span>' + RI.icon('chevD') + '</button>' +
          (draft ? '' : tools(title, i, list.length)) +
          '</header><div class="rs-item__body rs-grid" id="ib-' + x.id + '"' + (isOpen ? '' : ' hidden') + '>' + fields + '</div></article>';
      }
      function tools(title, i, total) {
        const name = esc(title || 'این مورد');
        return '<div class="rs-item__tools"><button type="button" class="btn btn--icon btn--ghost btn--sm" data-move-item="-1" aria-label="بالا بردن ' + name + '"' + (i <= 0 ? ' disabled' : '') + '>' + RI.icon('up') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-move-item="1" aria-label="پایین بردن ' + name + '"' + (i === total - 1 ? ' disabled' : '') + '>' + RI.icon('down') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-dup-item aria-label="تکثیر ' + name + '">' + RI.icon('copy') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-del-item aria-label="حذف ' + name + '">' + RI.icon('trash') + '</button></div>';
      }
      function itemsCard(key) {
        const list = RI.C()[key], pending = [...drafts.values()].filter(d => d.list === key), full = list.length >= RI.MAX_LIST_ITEMS;
        return card(key, '<div class="rs-items" data-items="' + key + '">' + list.map(x => itemCard(key, x)).join('') + pending.map(d => itemCard(key, d.item, true)).join('') + '</div>' + (list.length || pending.length ? '' : '<p class="rs-empty">' + RI.icon(META[key][1]) + 'هنوز موردی نیست؛ یکی کافی است تا این بخش جان بگیرد.</p>') +
          '<button type="button" class="btn btn--soft rs-add" data-add-item="' + key + '"' + (full ? ' disabled' : '') + '>' + RI.icon('plus') + ITEMS[key].add + '</button>' + (full ? '<p class="rs-note">حداکثر ' + RI.fa(RI.MAX_LIST_ITEMS) + ' مورد؛ ویرایش و حذف همچنان ممکن است.</p>' : '') + undoBar(key));
      }
      function templateCard() {
        if (!templateReady) return card('template', '<div data-template-pending-panel>' + (templateFailed ? failed('data-template-card-retry') : loading('در حال دریافت بخش‌های اختصاصی قالب…')) + '</div>');
        if (imported) {
          const groups = [...RI.templateEditorGroups(RI.C()).map(g => [g.key, g.label]), ...(RI.IMPORTED_TEMPLATES[templateId]?.groups.some(g => g.key === 'home:contact') ? [['home:contact', 'تماس در قالب']] : []), ['general', 'منو، رنگ و تنظیمات کلی'], ['home:compose', 'فرم پیام']];
          if (!groups.some(g => g[0] === templateGroup)) templateGroup = 'general';
          return card('template', '<div class="rs-groups" role="tablist" aria-label="بخش‌های قالب">' + groups.map(([key, label]) => '<button type="button" role="tab" class="rs-chipbtn" data-tgroup-pick="' + esc(key) + '" aria-selected="' + (key === templateGroup) + '">' + esc(label) + '</button>').join('') + '</div><div class="rs-template-host" data-template-host></div>');
        }
        const t = RI.findTemplate('resume', RI.C().theme.resume), values = RI.resumeValues(RI.C());
        return card('template', '<p class="rs-note">اطلاعات «' + esc(t.name) + '» جدا ذخیره می‌شود و با عوض‌کردن قالب از بین نمی‌رود.</p><div class="rs-grid">' + ['fields', 'settings'].map(group => spec[group].map(f => {
          const value = RI.resumeValue(values[group] || {}, f), id = 'template-' + group + '-' + f.key, attrs = ' id="' + esc(id) + '" data-template-group="' + group + '" data-template-key="' + esc(f.key) + '"';
          const control = f.type === 'checkbox' ? '<input class="checkbox" type="checkbox"' + attrs + (value ? ' checked' : '') + '>' : f.type === 'select' ? '<select class="select input"' + attrs + '><option value="">انتخاب کن</option>' + f.options.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>' : f.type === 'textarea' ? '<textarea class="textarea input"' + attrs + ' maxlength="' + (f.max || 1000) + '">' + esc(value) + '</textarea>' : '<input class="input" type="text"' + attrs + ' maxlength="' + (f.max || 1000) + '" value="' + esc(value) + '">';
          return field(id, esc(f.label) + RI.templateFieldHelp(f, spec), control, f.type === 'textarea' ? 'rs-field--full' : '');
        }).join('')).join('') + '</div>');
      }
      // Imported templates order their own sections; changing the order never deletes content.
      function templateOrderRows() {
        if (!imported || !templateReady) return '';
        const groups = RI.templateEditorGroups(RI.C());
        return '<h3 class="rs-sub">ترتیب بخش‌های قالب</h3><ol class="rs-layout">' + groups.map((g, i) => '<li class="rs-layout__row" data-id="' + esc(g.key) + '"><span class="rs-layout__ico">' + RI.icon('section') + '</span><span class="rs-layout__txt"><b>' + esc(g.label) + '</b></span><button type="button" class="btn btn--icon btn--ghost btn--sm" data-template-shift="' + esc(g.key) + '" data-direction="-1" aria-label="' + esc('انتقال ' + g.label + ' به بالا') + '"' + (!i ? ' disabled' : '') + '>' + RI.icon('up') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-template-shift="' + esc(g.key) + '" data-direction="1" aria-label="' + esc('انتقال ' + g.label + ' به پایین') + '"' + (i === groups.length - 1 ? ' disabled' : '') + '>' + RI.icon('down') + '</button></li>').join('') + '</ol>';
      }
      const settingsCard = () => card('settings', (bodyKeys().length ? '<h3 class="rs-sub">ترتیب و نمایش بخش‌ها</h3>' + layoutRows() : '') + templateOrderRows() + RI.brandingHtml('resume'));
      function undoBar(key) { return undo && undo.list === key ? '<div class="rs-undo" role="status">«' + esc(undo.label || 'مورد') + '» حذف شد<button type="button" class="textlink" data-undo>بازگردانی</button></div>' : ''; }
      const render = key => key === 'profile' ? profileCard() : key === 'contacts' ? contactsCard() : key === 'socials' ? socialsCard() : key === 'skills' || key === 'languages' ? chipsCard(key) : ITEMS[key] ? itemsCard(key) : key === 'template' ? templateCard() : settingsCard();

      function bindCard(key) {
        const el = RI.$('#rs-sec-' + key, cardsHost); if (!el) return;
        const c = RI.C();
        if (key === 'profile') { for (const name of ['avatar', 'cover']) RI.bindImageField(el, name, { set: v => { if (!alive()) return; c.profile[name] = v; RI.touch(name); paintNav(); } }); bioCount(); }
        if (key === 'projects') for (const x of [...c.projects, ...[...drafts.values()].filter(d => d.list === 'projects').map(d => d.item)]) RI.bindImageField(el, 'project-' + x.id, { set: v => { if (!alive()) return; x.image = v; commitDraft(x); RI.touch('projects'); } });
        const layout = el.querySelector('#rs-layout');
        if (layout) RI.sortable(layout, { itemSel: '.rs-layout__row', handle: '[data-lgrip]', onReorder: (from, to) => moveSection(bodyKeys()[from], to) });
        const items = el.querySelector('.rs-items');
        if (items) RI.sortable(items, { itemSel: '.rs-item:not([data-draft])', handle: '[data-grip]', onReorder: (from, to) => RI.flip(items, () => { RI.move(RI.C()[key], from, to); RI.touch(key); paintCard(key); }, '[data-item]') });
        if (key === 'template' && imported && templateReady) {
          const host = el.querySelector('[data-template-host]'); if (!host) return;
          host.innerHTML = RI.importedEditorHtml({ section: true, title: el.querySelector('[data-tgroup-pick][aria-selected="true"]')?.textContent || 'تنظیمات قالب' });
          RI.mountImportedEditor(host, pv, { group: templateGroup, legacy: templateGroup === 'home:contact' });
        }
        ideas();
      }
      function paintCard(key) {
        const el = RI.$('#rs-sec-' + key, cardsHost); if (!el) return paintAll();
        const focus = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : '';
        el.outerHTML = render(key); bindCard(key); paintNav(); paintReady();
        if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
      }
      // Late template data must not replace what the user is typing: keep the profile card and any focused card.
      function reconcile() {
        spec = RI.resumeSpec(templateId);
        // A card still showing the pending placeholder holds nothing to protect, even when it has focus.
        const held = k => { const el = RI.$('#rs-sec-' + k, cardsHost); return !!el && !el.querySelector('[data-template-pending-panel]') && (k === 'profile' || el.contains(document.activeElement)); };
        const keys = order(), keep = new Set(keys.filter(held));
        for (const el of [...cardsHost.children]) if (!keys.includes(el.dataset.section)) el.remove();
        let prev = null;
        for (const key of keys) {
          let el = RI.$('#rs-sec-' + key, cardsHost);
          if (!el || !keep.has(key)) { const holder = document.createElement('div'); holder.innerHTML = render(key); const fresh = holder.firstElementChild; if (el) el.replaceWith(fresh); el = fresh; }
          if (prev ? prev.nextElementSibling !== el : cardsHost.firstElementChild !== el) prev ? prev.after(el) : cardsHost.prepend(el);
          if (!keep.has(key)) bindCard(key);
          prev = el;
        }
        paintNav(); paintReady(); spy();
      }
      function paintAll() {
        spec = RI.resumeSpec(templateId);
        cardsHost.innerHTML = order().map(render).join('');
        order().forEach(bindCard); paintNav(); paintReady(); spy();
      }
      const bioCount = () => { const e = RI.$('#bioCount', root); if (e) e.textContent = RI.fa(RI.C().profile.bio.length) + '/۳۰۰'; };

      /* ---------- smart ideas (titles & skills) ---------- */
      const TITLE_IDEAS = { development: ['توسعه‌دهندهٔ فرانت‌اند', 'توسعه‌دهندهٔ بک‌اند', 'برنامه‌نویس فول‌استک'], design: ['طراح رابط و تجربهٔ کاربری', 'طراح گرافیک', 'طراح محصول'], data: ['تحلیل‌گر داده', 'کارشناس هوش تجاری', 'دانشمند داده'], marketing: ['کارشناس بازاریابی دیجیتال', 'کارشناس سئو', 'مدیر شبکه‌های اجتماعی'], sales: ['کارشناس فروش', 'کارشناس توسعهٔ بازار'], support: ['کارشناس پشتیبانی مشتریان', 'کارشناس خدمات مشتری'], accounting: ['حسابدار', 'کارشناس مالی'], teaching: ['مدرس', 'معلم'], content: ['تولیدکنندهٔ محتوا', 'نویسنده و ویراستار'], management: ['مدیر پروژه', 'مدیر محصول'] };
      function ideas() {
        const core = window.ResumeAdvisor, goal = RI.advisorGoal?.() || '', role = core?.goalRole(goal), c = RI.C();
        const titleHost = RI.$('[data-title-ideas]', root);
        if (titleHost) titleHost.innerHTML = role && !c.profile.title.trim() ? '<span>پیشنهاد عنوان:</span>' + TITLE_IDEAS[role].map(t => '<button type="button" class="rs-chipbtn" data-title-idea="' + esc(t) + '">' + RI.icon('plus') + esc(t) + '</button>').join('') : '';
        const skillHost = RI.$('[data-chip-ideas="skills"]', root);
        if (skillHost) {
          const have = new Set(c.skills.map(x => x.name.trim().toLowerCase())), list = (core ? core.roleSkills(role) : []).filter(s => !have.has(s.toLowerCase())).slice(0, 6);
          skillHost.innerHTML = list.length ? '<span>معمول برای هدفت:</span>' + list.map(s => '<button type="button" class="rs-chipbtn" data-skill-idea="' + esc(s) + '">' + RI.icon('plus') + esc(s) + '</button>').join('') : '';
        }
      }

      /* ---------- model helpers ---------- */
      const findItem = el => { const box = el.closest('[data-item]'); if (!box) return null; const key = box.dataset.list, id = box.dataset.item; return { box, key, id, item: RI.C()[key].find(x => x.id === id) || drafts.get(id)?.item, draft: drafts.has(id) }; };
      function commitDraft(item) {
        const d = drafts.get(item.id); if (!d) return false;
        const list = RI.C()[d.list]; if (list.length >= RI.MAX_LIST_ITEMS) { RI.toast('سقف این فهرست ' + RI.fa(RI.MAX_LIST_ITEMS) + ' مورد است', { kind: 'info' }); return false; }
        drafts.delete(item.id); list.push(item); open.add(item.id);
        const box = RI.$('[data-item="' + item.id + '"]', cardsHost);
        if (box) {
          box.removeAttribute('data-draft');
          // The previous last item can now move down; the new one gets its own tools in place, keeping focus.
          if (ITEMS[d.list]) { box.querySelector('.rs-item__head').insertAdjacentHTML('beforeend', tools(ITEMS[d.list].title(item), list.length - 1, list.length)); const prev = list[list.length - 2]; if (prev) RI.$('[data-item="' + prev.id + '"] [data-move-item="1"]', cardsHost)?.removeAttribute('disabled'); }
        }
        return true;
      }
      function addChips(key, raw) {
        const list = RI.C()[key], have = new Set(list.map(x => x.name.trim().toLowerCase())), added = [];
        for (const name of String(raw).split(/[,،؛\n]/).map(s => s.trim()).filter(Boolean)) {
          if (have.has(name.toLowerCase()) || list.length >= RI.MAX_LIST_ITEMS) continue;
          list.push({ id: RI.uid(), name: name.slice(0, key === 'skills' ? 40 : 30), level: 3 }); have.add(name.toLowerCase()); added.push(name);
        }
        if (added.length) { RI.touch(key); paintCard(key); RI.$('#rs-add-' + key, root)?.focus(); }
        else if (raw.trim()) RI.toast('این مورد از قبل در فهرست هست', { kind: 'info' });
        return added;
      }
      RI.resumeStudioAddSkill = name => addChips('skills', name).length > 0;
      function removeItem(info) {
        const { key, id, item, draft } = info;
        if (draft) { drafts.delete(id); paintCard(key); return; }
        const list = RI.C()[key], index = list.findIndex(x => x.id === id); if (index < 0) return;
        list.splice(index, 1); open.delete(id); clearTimeout(undoTimer);
        undo = { list: key, item, index, label: ITEMS[key]?.title(item) || item.name || (RI.SOCIALS.find(s => s[0] === item.platform) || [0, ''])[1] };
        undoTimer = setTimeout(() => { if (undo?.item === item) { undo = null; if (alive()) RI.$('#rs-sec-' + key + ' .rs-undo', cardsHost)?.remove(); } }, 9000);
        RI.touch(key); paintCard(key); RI.$('#rs-sec-' + key + ' [data-undo]', cardsHost)?.focus({ preventScroll: true });
      }
      function goto(key, focusField) {
        const el = RI.$('#rs-sec-' + key, cardsHost); if (!el) return;
        el.scrollIntoView({ block: 'start', behavior: RI.reduceMotion() ? 'auto' : 'smooth' });
        const target = focusField ? el.querySelector(focusField) : el.querySelector('h2');
        target?.focus({ preventScroll: true }); RI.setRouteStep(key);
        // The section the user picked is the current one until they scroll elsewhere.
        navHost.querySelectorAll('[data-goto]').forEach(b => b.setAttribute('aria-current', String(b.dataset.goto === key))); spyHold = Date.now() + 900;
        if (!RI.reduceMotion()) el.animate([{ boxShadow: '0 0 0 0 rgba(189,142,100,.0)' }, { boxShadow: '0 0 0 6px rgba(189,142,100,.35)' }, { boxShadow: '0 0 0 0 rgba(189,142,100,0)' }], { duration: 900, easing: 'ease-out' });
      }
      let observer, spyHold = 0;
      function spy() {
        observer?.disconnect(); if (!('IntersectionObserver' in window)) return;
        observer = new IntersectionObserver(entries => { if (Date.now() < spyHold) return; const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (!top) return; navHost.querySelectorAll('[data-goto]').forEach(b => b.setAttribute('aria-current', String(b.dataset.goto === top.target.dataset.section))); }, { rootMargin: '-20% 0px -60% 0px' });
        cardsHost.querySelectorAll('.rs-card').forEach(el => observer.observe(el));
      }

      /* ---------- events ---------- */
      root.addEventListener('input', e => {
        const el = e.target, c = RI.C();
        if (el.dataset.p) { c.profile[el.dataset.p] = el.value; RI.touch('profile'); if (el.dataset.p === 'bio') bioCount(); if (el.dataset.p === 'title') ideas(); return; }
        if (el.dataset.c) { const x = c.contacts.find(k => k.id === el.dataset.c); if (x) { x.value = el.value; RI.touch('contacts'); } return; }
        if (el.dataset.templateKey) { c.resumeTemplates ||= {}; const values = c.resumeTemplates[c.theme.resume] ||= { fields: {}, settings: {} }; values[el.dataset.templateGroup][el.dataset.templateKey] = el.type === 'checkbox' ? el.checked : el.value; RI.touch('resumeTemplates'); return; }
        if (el.dataset.field && el.type !== 'checkbox' && el.tagName !== 'SELECT') {
          const info = findItem(el); if (!info?.item) return;
          let value = el.value;
          if (info.key === 'socials' && el.dataset.field === 'handle') { for (const [re, platform] of SOCIAL_HOSTS) { const m = re.exec(value.trim()); if (m) { info.item.platform = platform; value = m[1]; el.value = value; const sel = info.box.querySelector('[data-field="platform"]'); if (sel) sel.value = platform; info.box.querySelector('.rs-social__ico').innerHTML = RI.icon(platform); break; } } }
          info.item[el.dataset.field] = value;
          if (info.draft && !commitDraft(info.item)) return;
          if (el.classList.contains('rs-chip__name')) el.size = Math.max(3, [...value].length);
          const L = ITEMS[info.key]; if (L) { const t = info.box.querySelector('[data-item-title]'), s = info.box.querySelector('[data-item-sub]'); if (t) t.textContent = L.title(info.item) || 'بدون عنوان'; if (s) s.textContent = L.sub(info.item); }
          RI.touch(info.key);
        }
      });
      root.addEventListener('change', e => {
        const el = e.target, c = RI.C();
        if (el.dataset.c) { const x = c.contacts.find(k => k.id === el.dataset.c); if (x) { const v = tidy[x.type] ? tidy[x.type](el.value) : el.value; if (v !== x.value) { x.value = v; el.value = v; RI.touch('contacts'); } paintNav(); paintReady(); } return; }
        if (el.dataset.cpub) { const x = c.contacts.find(k => k.id === el.dataset.cpub); if (el.checked && !x.value.trim()) { el.checked = false; RI.toast('اول مقدارش را بنویس، بعد عمومی‌اش کن', { kind: 'info' }); RI.$('#c_' + x.id, root)?.focus(); return; } x.public = el.checked; RI.touch('contacts'); paintCard('contacts'); return; }
        if (el.dataset.svis) { const s = c.sections.find(k => k.key === el.dataset.svis); s.visible = el.checked; RI.touch('sections'); el.closest('.rs-layout__row')?.classList.toggle('is-off', !el.checked); paintCard(s.key); return; }
        if (el.hasAttribute('data-reviewed')) { const values = (c.resumeTemplates ||= {})[c.theme.resume] ||= { fields: {}, settings: {}, collections: {} }; values.settings.reviewed = el.checked; RI.touch('resumeTemplates'); paintReady(); paintNav(); return; }
        if (el.dataset.field) {
          const info = findItem(el); if (!info?.item) return;
          if (el.dataset.field === 'current') { info.item.current = el.checked; if (info.draft) commitDraft(info.item); info.box.querySelector('[data-field="to"]')?.closest('.rs-field')?.classList.toggle('is-hidden', el.checked); RI.touch(info.key); return; }
          if (el.tagName === 'SELECT') { info.item[el.dataset.field] = el.dataset.field === 'level' ? Number(el.value) : el.value; if (info.draft) commitDraft(info.item); if (info.key === 'socials') info.box.querySelector('.rs-social__ico').innerHTML = RI.icon(el.value); RI.touch(info.key); return; }
          const kind = ITEMS[info.key]?.fields.find(f => f[0] === el.dataset.field)?.[4];
          if (tidy[kind]) { const v = tidy[kind](el.value); if (v !== info.item[el.dataset.field]) { info.item[el.dataset.field] = v; el.value = v; RI.touch(info.key); } }
          if (el.classList.contains('rs-chip__name') && !el.value.trim()) removeItem(info);
        }
      });
      root.addEventListener('focusout', e => {
        const box = e.target.closest?.('.rs-item:not([data-draft]),.rs-social:not([data-draft])'); if (!box || box.contains(e.relatedTarget)) return;
        const info = findItem(box); if (!info?.item) return;
        const keys = info.key === 'socials' ? ['handle'] : ITEMS[info.key].fields.filter(f => !['current', 'image'].includes(f[4])).map(f => f[0]);
        if (keys.every(k => !String(info.item[k] || '').trim()) && !info.item.image) removeItem(info);
      });
      root.addEventListener('keydown', e => {
        const input = e.target.closest?.('[data-chip-input]');
        if (input && (e.key === 'Enter' || e.key === ',' || e.key === '،')) { e.preventDefault(); if (addChips(input.dataset.chipInput, input.value).length || !input.value.trim()) input.value = ''; return; }
        if (input && e.key === 'Backspace' && !input.value) { const last = RI.C()[input.dataset.chipInput].at(-1); if (last) RI.$('[data-item="' + last.id + '"] .rs-chip__name', root)?.focus(); return; }
        const dots = e.target.closest?.('.rs-dots');
        if (dots && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); const info = findItem(dots); if (!info?.item) return; info.item.level = Math.min(5, Math.max(1, info.item.level + (e.key === 'ArrowLeft' ? 1 : -1))); RI.touch(info.key); paintCard(info.key); RI.$('[data-item="' + info.id + '"] [data-level="' + info.item.level + '"]', root)?.focus(); }
      });
      RI.delegate(root, 'click', '[data-goto]', (e, b) => goto(b.dataset.goto));
      RI.delegate(root, 'click', '[data-template-shift]', (e, b) => {
        const c = RI.C(), groups = RI.templateEditorGroups(c).map(g => g.key), from = groups.indexOf(b.dataset.templateShift), to = from + Number(b.dataset.direction);
        if (from < 0 || to < 0 || to >= groups.length) return;
        RI.move(groups, from, to); const values = (c.resumeTemplates ||= {})[c.theme.resume] ||= { fields: {}, settings: {}, collections: {} };
        values.settings.section_order = groups.join(','); values.settings.reviewed = false; RI.touch('resumeTemplates'); paintCard('settings'); paintCard('template');
        RI.$('[data-template-shift="' + CSS.escape(b.dataset.templateShift) + '"][data-direction="' + b.dataset.direction + '"]:not(:disabled)', root)?.focus({ preventScroll: true });
      });
      RI.delegate(root, 'click', '[data-lmove]', (e, b) => { const key = b.closest('[data-id]').dataset.id; moveSection(key, bodyKeys().indexOf(key) + Number(b.dataset.lmove)); });
      RI.delegate(root, 'click', '[data-chip-add]', (e, b) => { const input = RI.$('#rs-add-' + b.dataset.chipAdd, root); if (addChips(b.dataset.chipAdd, input.value).length) input.value = ''; else input.focus(); });
      RI.delegate(root, 'click', '[data-level]', (e, b) => { const info = findItem(b); if (!info?.item) return; info.item.level = Number(b.dataset.level); RI.touch(info.key); paintCard(info.key); RI.$('[data-item="' + info.id + '"] [data-level="' + info.item.level + '"]', root)?.focus(); });
      RI.delegate(root, 'click', '[data-skill-idea]', (e, b) => addChips('skills', b.dataset.skillIdea));
      RI.delegate(root, 'click', '[data-title-idea]', (e, b) => { const input = RI.$('#p_title', root); input.value = b.dataset.titleIdea; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); });
      RI.delegate(root, 'click', '[data-add-item]', (e, b) => { const key = b.dataset.addItem, item = { id: RI.uid() }; for (const [f, , , , type] of ITEMS[key].fields) item[f] = type === 'current' ? false : type === 'image' ? null : ''; drafts.set(item.id, { list: key, item }); paintCard(key); RI.$('#i-' + item.id + '-' + ITEMS[key].main, root)?.focus(); });
      RI.delegate(root, 'click', '[data-add-social]', (e, b) => { const item = { id: RI.uid(), platform: b.dataset.addSocial, handle: '' }; drafts.set(item.id, { list: 'socials', item }); paintCard('socials'); RI.$('#s-' + item.id + '-handle', root)?.focus(); });
      RI.delegate(root, 'click', '[data-toggle-item]', (e, b) => { const info = findItem(b); if (!info) return; const body = info.box.querySelector('.rs-item__body'), next = body.hidden; body.hidden = !next; info.box.classList.toggle('is-open', next); b.setAttribute('aria-expanded', String(next)); if (next) { open.add(info.id); body.querySelector('input,textarea')?.focus({ preventScroll: true }); } else open.delete(info.id); });
      RI.delegate(root, 'click', '[data-del-item]', (e, b) => { const info = findItem(b); if (info) removeItem(info); });
      RI.delegate(root, 'click', '[data-dup-item]', (e, b) => { const info = findItem(b); if (!info?.item) return; const list = RI.C()[info.key]; if (list.length >= RI.MAX_LIST_ITEMS) return RI.toast('سقف این فهرست پر است', { kind: 'info' }); const copy = Object.assign(RI.clone(info.item), { id: RI.uid() }); list.splice(list.indexOf(info.item) + 1, 0, copy); open.add(copy.id); RI.touch(info.key); paintCard(info.key); RI.$('#i-' + copy.id + '-' + ITEMS[info.key].main, root)?.focus(); });
      RI.delegate(root, 'click', '[data-move-item]', (e, b) => { const info = findItem(b); if (!info?.item) return; const list = RI.C()[info.key], i = list.indexOf(info.item), j = i + Number(b.dataset.moveItem); if (j < 0 || j >= list.length) return; const box = RI.$('#rs-sec-' + info.key + ' .rs-items', cardsHost); RI.flip(box, () => { RI.move(list, i, j); RI.touch(info.key); paintCard(info.key); }, '[data-item]'); RI.$('[data-item="' + info.id + '"] [data-move-item="' + b.dataset.moveItem + '"]:not(:disabled)', root)?.focus(); });
      RI.delegate(root, 'click', '[data-undo]', () => { if (!undo) return; const { list, item, index } = undo; RI.C()[list].splice(Math.min(index, RI.C()[list].length), 0, item); undo = null; RI.touch(list); paintCard(list); RI.toast('بازگردانده شد'); });
      RI.delegate(root, 'click', '[data-tgroup-pick]', (e, b) => { templateGroup = b.dataset.tgroupPick; RI.setRouteStep('template-' + templateGroup.replace(/:/g, '-')); paintCard('template'); RI.$('[data-tgroup-pick="' + CSS.escape(templateGroup) + '"]', root)?.focus(); });
      RI.delegate(root, 'click', '[data-template-source]', (e, b) => goto('profile', '[data-p="' + b.dataset.templateSource + '"]'));
      RI.delegate(root, 'click', '[data-resume-template-retry],[data-template-card-retry]', () => loadTemplateParts());
      // A detached preview window still reaches this page.
      previewHost.addEventListener('click', e => { if (e.target.closest('[data-resume-template-retry]') && !root.contains(previewHost)) loadTemplateParts(); });
      RI.delegate(root, 'click', '[data-live]', (e, b) => { if (b.closest('summary')) e.preventDefault(); RI.openPreview('resume'); });
      RI.delegate(root, 'click', '[data-account-phone]', () => RI.phoneDialog());
      RI.delegate(root, 'click', '[data-names]', () => names());
      RI.delegate(root, 'click', '[data-side]', (e, b) => setSide(b.dataset.side));
      RI.delegate(root, 'click', '[data-publish]', async (e, button) => {
        if (button.closest('summary')) e.preventDefault();
        if (publishing) return; publishing = true; button.disabled = true; button.setAttribute('aria-busy', 'true');
        const state = () => RI.$('[data-publish-state]', root);
        try { const ok = await RI.publish('resume'); if (alive() && ok !== false) { RI.toast('رزومه منتشر شد'); paintReady(); const s = state(); if (s) s.textContent = 'نسخهٔ عمومی رزومه به‌روز است.'; } }
        catch (error) { if (alive()) { const message = error.message === 'account-incomplete' ? 'نام حساب و شمارهٔ تأییدشده را کامل کن.' : error.message, s = state(); if (s) { s.setAttribute('role', 'alert'); s.textContent = message; } RI.toast(message, { kind: 'error' }); } }
        finally { publishing = false; if (button.isConnected) { button.disabled = false; button.removeAttribute('aria-busy'); } }
      });
      RI.resumePublicationReview = () => { if (!alive()) return false; const items = RI.readiness().resume.filter(x => x.req && !x.done); if (!items.length) return false; const d = readyHost.querySelector('details'); if (d) d.open = true; readyHost.scrollIntoView({ block: 'start', behavior: 'auto' }); readyHost.querySelector('summary')?.focus(); return true; };

      function names() {
        const a = RI.state.account, me = RI.ownerId;
        return RI.modal({ title: 'نام صاحب حساب', body: ['firstName', 'lastName'].map((key, i) => '<div class="field"><label class="field__label" for="rs-' + key + '">' + (i ? 'نام خانوادگی' : 'نام') + '</label><input class="input" id="rs-' + key + '" maxlength="39" autocomplete="' + (i ? 'family-name' : 'given-name') + '" value="' + esc(a[key] || '') + '"></div>').join('') + '<p role="alert" data-name-error></p>',
          actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'ذخیرهٔ نام حساب', kind: 'primary', keepOpen: true, onClick: async (modal, event, button) => {
            if (button.disabled || me !== RI.ownerId) return;
            const values = Object.fromEntries(['firstName', 'lastName'].map(key => [key, modal.body.querySelector('#rs-' + key).value.trim()])), error = modal.body.querySelector('[data-name-error]');
            if (!values.firstName || !values.lastName) { error.textContent = 'نام و نام خانوادگی را کامل کن.'; return; }
            button.disabled = true; try { await RI.accountRequest('account/names', values); if (me !== RI.ownerId) return; await RI.reloadAccount(); modal.close(); RI.toast('نام حساب ذخیره شد'); paintReady(); } catch (err) { error.textContent = err.message; } finally { button.disabled = false; } } }] });
      }

      /* ---------- side panel: preview / assistant ---------- */
      const assistHost = RI.$('#resume-advisor', root);
      function setSide(tab) {
        sideTab = tab;
        root.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.side === tab)));
        RI.$('#rs-side-preview', root).hidden = tab !== 'preview'; RI.$('#rs-side-assist', root).hidden = tab !== 'assist';
        if (tab === 'preview') pv.refresh();
      }
      function placeAssistant() {
        const target = studio.dataset.wide === 'true' ? RI.$('#rs-side-assist', root) : RI.$('#rs-assist-mobile', root);
        if (assistHost.parentElement !== target) target.append(assistHost);
      }
      // Layout follows the space the studio really has, not the window width.
      const studio = RI.$('#resume-studio', root), sizer = new ResizeObserver(() => { const wide = String(studio.clientWidth >= 760); if (studio.dataset.wide !== wide) { studio.dataset.wide = wide; placeAssistant(); } });
      studio.dataset.wide = String(studio.clientWidth >= 760); sizer.observe(studio); placeAssistant();
      function startAdvisor() {
        if (advisorCleanup || !alive()) return;
        if (!RI.advisorScripts) RI.advisorScripts = (async () => { for (const name of ['advisor-core', 'advisor-ui']) await new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = '/dashboard/js/' + name + '.js?v=' + encodeURIComponent(document.documentElement.dataset.assetVersion || ''); s.onload = resolve; s.onerror = reject; document.head.append(s); }); })().catch(error => { RI.advisorScripts = null; throw error; });
        RI.advisorScripts.then(() => {
          if (!alive()) return;
          advisorCleanup = RI.mountAdvisor(assistHost, {
            focus: target => {
              if (target.section === 'template') {
                // Open the template group that owns this field before asking the editor to focus it.
                const group = imported && RI.effectiveTemplateSpec(templateId).fields.find(x => x.key === target.field)?.group;
                if (group && group !== templateGroup && RI.$('[data-tgroup-pick="' + CSS.escape(group) + '"]', root)) { templateGroup = group; paintCard('template'); }
                goto('template'); RI.$('#rs-sec-template [data-template-host]', root)?.dispatchEvent(new CustomEvent('ri:template-focus', { detail: target, bubbles: true })); return;
              }
              if (target.section === 'profile') return goto('profile', '[data-p="' + target.field + '"]');
              if (target.section === 'skills') return goto('skills', '#rs-add-skills');
              if (ITEMS[target.section]) { open.add(target.itemId); paintCard(target.section); return goto(target.section, '#i-' + target.itemId + '-' + target.field); }
              goto(target.section);
            },
            counts: map => { advisorCounts = map; paintNav(); const total = Object.values(map).reduce((a, b) => a + b, 0); root.querySelectorAll('[data-assist-count]').forEach(badge => { badge.hidden = !total; badge.textContent = RI.fa(total); }); },
            goal: () => ideas(),
          });
          ideas();
        }).catch(() => { if (alive()) assistHost.textContent = 'دستیار رزومه دریافت نشد؛ ویرایش و انتشار همچنان در دسترس‌اند.'; });
      }

      /* ---------- live updates ---------- */
      let raf = 0;
      const updatePills = () => cardsHost.querySelectorAll('.rs-card').forEach(el => { const pill = el.querySelector('.rs-pill'), [state, label] = status(el.dataset.section); if (pill) { pill.className = 'rs-pill is-' + state; pill.textContent = label; } });
      const off = RI.on('change', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!alive()) return; pv.refresh(); if (!navHost.contains(document.activeElement)) paintNav(); updatePills(); paintReadySoft(); }); });
      let readyTimer = 0; const paintReadySoft = () => { clearTimeout(readyTimer); readyTimer = setTimeout(() => { if (alive()) paintReady(); }, 500); };
      const offSave = RI.on('save', () => {});

      // Unknown steps fall back to the top; a template group is honoured only once it is known to exist.
      const step = ctx.opts && ctx.opts.step, wantedGroup = step && step.startsWith('template-') ? step.slice(9).replace('-', ':') : '';
      const groupExists = g => imported && templateReady && (g === 'general' || g === 'home:compose' || RI.templateEditorGroups(RI.C()).some(x => x.key === g));
      let initial = step && META[step] ? step : step === 'template' ? 'template' : null;
      if (wantedGroup && groupExists(wantedGroup)) { templateGroup = wantedGroup; initial = 'template'; }
      previewHost.innerHTML = loading('در حال آماده‌سازی پیش‌نمایش…');
      paintAll();
      if (templateReady) { requestAnimationFrame(() => requestAnimationFrame(startPreview)); startAdvisor(); } else { loadTemplateParts(); assistHost.innerHTML = RI.sectionLoading('دستیار پس از دریافت قالب آماده می‌شود…'); }
      if (initial && initial !== 'profile') requestAnimationFrame(() => goto(initial));

      return () => { if (RI.resumePublicationReview) delete RI.resumePublicationReview; delete RI.resumeStudioAddSkill; observer?.disconnect(); clearTimeout(undoTimer); clearTimeout(readyTimer); advisorCleanup?.(); cancelAnimationFrame(raf); off(); offSave(); detachCleanup(); pv.destroy(); sizer.disconnect(); };
    },
  });
})();
