/* ساخت و ویرایش رزومه: مراحل بازی‌وار + چیدمان بخش‌ها + پیش‌نمایش زنده */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  const STEPS = [
    { id: 'profile', label: 'معرفی', icon: 'user', req: true },
    { id: 'contacts', label: 'تماس', icon: 'phone', req: true },
    { id: 'skills', label: 'مهارت‌ها', icon: 'sparkle' },
    { id: 'experience', label: 'تجربه', icon: 'briefcase' },
    { id: 'education', label: 'تحصیلات', icon: 'book' },
    { id: 'projects', label: 'پروژه‌ها', icon: 'code' },
    { id: 'certs', label: 'گواهی‌ها', icon: 'award' },
    { id: 'languages', label: 'زبان‌ها', icon: 'language' },
    { id: 'socials', label: 'شبکه‌ها', icon: 'globe' },
  ];
  const SECTION_META = { contacts: ['اطلاعات تماس', 'phone', true], socials: ['شبکه‌های اجتماعی', 'globe'], skills: ['مهارت‌ها', 'sparkle'], experience: ['تجربه‌های کاری', 'briefcase'], education: ['تحصیلات', 'book'], projects: ['پروژه‌ها و نمونه‌کارها', 'code'], certs: ['دوره‌ها، گواهی‌ها و افتخارات', 'award'], languages: ['زبان‌ها', 'language'] };

  const yearField = { type: 'text', max: 20 };
  const LISTS = {
    skills: { title: 'مهارت‌ها', add: 'افزودن مهارت', icon: 'sparkle', hint: 'سه مهارت کافی است تا بخش جان بگیرد؛ بعداً هر چقدر خواستی اضافه کن', empty: ['هنوز مهارتی ننوشته‌ای', 'مهارت‌هایی را که واقعاً به آن‌ها مسلطی بنویس؛ کارفرما اول از همین‌جا نگاه می‌کند'],
      fields: [{ key: 'name', label: 'نام مهارت', required: true, max: 40, placeholder: 'مثلاً JavaScript یا طراحی لوگو' }, { key: 'level', label: 'سطح مهارت', type: 'level', levels: RI.SKILL_LEVELS }],
      title_: (x) => x.name, sub: (x) => RI.SKILL_LEVELS[(x.level || 3) - 1], right: (x) => '<span class="dots" aria-hidden="true">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (i <= x.level ? 'on' : '') + '"></i>').join('') + '</span>', defaults: { level: 3 } },
    experience: { title: 'تجربه‌های کاری', add: 'افزودن تجربه', icon: 'briefcase', hint: 'کارآموزی، فریلنس و پروژهٔ داوطلبانه هم تجربه حساب می‌شود', empty: ['تجربهٔ کاری اضافه نشده', 'اگر هنوز سابقهٔ رسمی نداری، کارآموزی، همکاری با انجمن یا پروژهٔ مستقل را بنویس'],
      fields: [{ key: 'role', label: 'عنوان شغلی', required: true, max: 60 }, { key: 'org', label: 'محل کار یا مجموعه', required: true, max: 60 }, { key: 'from', label: 'شروع', placeholder: '۱۴۰۲/۰۶', max: 12, optional: true }, { key: 'to', label: 'پایان', placeholder: '۱۴۰۳/۰۱', max: 12, optional: true, showIf: (v) => !v.current }, { key: 'current', label: 'هنوز ادامه دارد', type: 'checkbox', span: true }, { key: 'desc', label: 'توضیح کوتاه', type: 'textarea', max: 300, optional: true, span: true, rows: 3 }],
      title_: (x) => x.role, sub: (x) => x.org + ' · ' + ((x.from || '') + (x.current ? ' تا اکنون' : x.to ? ' تا ' + x.to : '')) },
    education: { title: 'تحصیلات', add: 'افزودن مقطع', icon: 'book', hint: 'برای دانش‌آموز و دانشجو، همین بخش ستارهٔ رزومه است', empty: ['سابقهٔ تحصیلی اضافه نشده', 'مقطع، رشته و محل تحصیلت را بنویس'],
      fields: [{ key: 'degree', label: 'مقطع و رشته', required: true, max: 80 }, { key: 'school', label: 'دانشگاه یا مدرسه', required: true, max: 80 }, { key: 'from', label: 'شروع', max: 12, optional: true }, { key: 'to', label: 'پایان', max: 12, optional: true, showIf: (v) => !v.current }, { key: 'current', label: 'در حال تحصیل', type: 'checkbox', span: true }, { key: 'desc', label: 'توضیح (معدل، افتخار…)', type: 'textarea', max: 240, optional: true, span: true, rows: 2 }],
      title_: (x) => x.degree, sub: (x) => x.school + ' · ' + ((x.from || '') + (x.current ? ' تا اکنون' : x.to ? ' تا ' + x.to : '')) },
    projects: { title: 'پروژه‌ها و نمونه‌کارها', add: 'افزودن پروژه', icon: 'code', hint: 'یک پروژهٔ خوب با تصویر و لینک، از ده خط توضیح مؤثرتر است', empty: ['نمونه‌کاری اضافه نشده', 'پروژه، مقاله، طراحی یا محتوایی که دوست داری دیده شود را اضافه کن'],
      fields: [{ key: 'title', label: 'عنوان پروژه', required: true, max: 60, span: true }, { key: 'desc', label: 'توضیح', type: 'textarea', max: 280, required: true, span: true, rows: 3 }, { key: 'url', label: 'لینک پروژه', type: 'url', ltr: true, optional: true, placeholder: 'github.com/you/project', span: true }, { key: 'image', label: 'تصویر پروژه', type: 'image', wide: true, optional: true }],
      title_: (x) => x.title, sub: (x) => x.url || x.desc, thumb: (x) => x.image },
    certs: { title: 'دوره‌ها، گواهی‌ها و افتخارات', add: 'افزودن مورد', icon: 'award', hint: 'رتبه‌های مسابقه و دوره‌های معتبر را بنویس', empty: ['موردی اضافه نشده', 'دوره‌ها، گواهینامه‌ها و رتبه‌ها این‌جا می‌نشینند'],
      fields: [{ key: 'title', label: 'عنوان', required: true, max: 80, span: true }, { key: 'issuer', label: 'برگزارکننده', max: 60, optional: true }, { key: 'year', label: 'سال', max: 8, optional: true }],
      title_: (x) => x.title, sub: (x) => (x.issuer || '') + (x.year ? ' · ' + x.year : '') },
    languages: { title: 'زبان‌ها', add: 'افزودن زبان', icon: 'language', hint: 'زبان‌هایی که می‌توانی با آن‌ها کار کنی', empty: ['زبانی اضافه نشده', 'فارسی و انگلیسی؟ زبان‌های دیگر؟ همین‌جا بنویس'],
      fields: [{ key: 'name', label: 'زبان', required: true, max: 30 }, { key: 'level', label: 'سطح', type: 'level', levels: RI.LANG_LEVELS }],
      title_: (x) => x.name, sub: (x) => RI.LANG_LEVELS[(x.level || 3) - 1], defaults: { level: 3 } },
    socials: { title: 'شبکه‌های اجتماعی', add: 'افزودن شبکه', icon: 'globe', hint: 'فقط نام کاربری لازم است، نه کل آدرس', empty: ['شبکه‌ای اضافه نشده', 'گیت‌هاب، لینکدین، اینستاگرام و… را اضافه کن'],
      fields: [{ key: 'platform', label: 'شبکه', type: 'select', options: RI.SOCIALS.map((s) => [s[0], s[1]]), required: true }, { key: 'handle', label: 'نام کاربری', required: true, ltr: true, max: 40, placeholder: 'username' }],
      title_: (x) => (RI.SOCIALS.find((s) => s[0] === x.platform) || [0, x.platform])[1], sub: (x) => '@' + x.handle, iconOf: (x) => x.platform, defaults: { platform: 'github' } },
  };

  function stepDone(id) {
    const c = RI.C(), p = c.profile;
    if (id === 'profile') return !!(p.name.trim() && p.title.trim());
    if (id === 'contacts') return c.contacts.some((x) => x.public && x.value.trim());
    return c[id] && c[id].length > 0;
  }

  RI.registerPage('resume', {
    title: 'ساخت و ویرایش رزومه',
    render(ctx) {
      return RI.pageHead({ eyebrow: 'استودیو', eyebrowIcon: 'resume', title: 'رزومهٔ تو', desc: 'قدم‌به‌قدم پیش برو؛ هر تغییر همان لحظه در پیش‌نمایش سمت چپ دیده می‌شود',
        actions: '<button type="button" class="btn btn--soft btn--sm show-sm" data-live>' + RI.icon('eye') + 'پیش‌نمایش زنده</button><a class="btn btn--ghost btn--sm" href="#/themes" data-go="themes">' + RI.icon('palette') + 'ظاهر و قالب</a>' }) +
        '<div class="editor"><div class="editor__main"><div class="segmented" role="tablist" aria-label="حالت ویرایش" id="rtabs"><button type="button" role="tab" data-tab="content" aria-selected="true">' + RI.icon('edit') + 'محتوا</button><button type="button" role="tab" data-tab="layout" aria-selected="false">' + RI.icon('section') + 'چیدمان بخش‌ها</button></div><div id="rbody"></div></div>' +
        '<aside class="editor__side" aria-label="پیش‌نمایش زندهٔ رزومه"><div class="sticky"><div id="rpv"></div></div></aside></div>';
    },
    mount(root, ctx) {
      let tab = 'content', step = (ctx.opts && ctx.opts.step) || 'profile';
      if (!STEPS.some((s) => s.id === step)) step = 'profile';
      const body = RI.$('#rbody', root);
      const pv = new RI.Preview(RI.$('#rpv', root), { kind: 'resume', device: 'mobile', fitHeight: 200 });
      let raf = 0;
      const refresh = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => pv.refresh(false)); };
      const off = RI.on('change', refresh);

      function stepper() {
        const done = STEPS.filter((s) => stepDone(s.id)).length;
        return '<div class="stepper"><div class="stepper__top"><b>' + RI.fa(done) + ' از ' + RI.fa(STEPS.length) + ' بخش پر شده</b><span class="chip chip--brown">' + RI.fa(RI.completion().pct) + '٪ کامل</span></div><div class="bar" aria-hidden="true"><i style="width:' + done / STEPS.length * 100 + '%"></i></div>' +
          '<div class="stepper__chips" role="tablist" aria-label="بخش‌های رزومه">' + STEPS.map((s) => '<button type="button" role="tab" class="schip' + (stepDone(s.id) ? ' is-done' : '') + '" data-step="' + s.id + '" aria-selected="' + (s.id === step) + '">' + RI.icon(stepDone(s.id) ? 'check' : s.icon) + '<span>' + s.label + '</span>' + (s.req ? '<em title="ضروری">*</em>' : '') + '</button>').join('') + '</div></div>';
      }

      function profilePanel() {
        const p = RI.C().profile;
        return '<div class="panel"><div class="panel__head"><h2>خودت را معرفی کن</h2><p>اولین چیزی که بازدیدکننده می‌بیند <span class="field__req">ضروری</span> برای انتشار: نام و عنوان</p></div>' +
          '<div class="field"><div class="field__label">تصویر کاور<span class="field__opt">اختیاری</span></div>' + RI.imageFieldHtml('cover', { value: p.cover, wide: true, label: 'کاور' }) + '</div>' +
          '<div class="field"><div class="field__label">عکس پروفایل<span class="field__opt">اختیاری</span></div>' + RI.imageFieldHtml('avatar', { value: p.avatar, round: true, label: 'عکس پروفایل' }) + '</div><hr class="divider">' +
          '<div class="form-grid" id="pform"><div class="field" data-field="name"><label class="field__label" for="p_name">نام و نام خانوادگی<span class="field__req">ضروری</span></label><input class="input" id="p_name" data-p="name" value="' + esc(p.name) + '" maxlength="50" autocomplete="off"><div class="field__error" role="alert" hidden></div></div>' +
          '<div class="field" data-field="location"><label class="field__label" for="p_loc">شهر<span class="field__opt">اختیاری</span></label><input class="input" id="p_loc" data-p="location" value="' + esc(p.location) + '" maxlength="30"></div>' +
          '<div class="field span-2" data-field="title"><label class="field__label" for="p_title">عنوان حرفه‌ای یا تحصیلی<span class="field__req">ضروری</span></label><input class="input" id="p_title" data-p="title" value="' + esc(p.title) + '" maxlength="90" placeholder="مثلاً دانشجوی کامپیوتر | طراح رابط کاربری"><div class="field__hint">یک خط که بگوید کی هستی و چه می‌کنی</div><div class="field__error" role="alert" hidden></div></div>' +
          '<div class="field span-2" data-field="bio"><label class="field__label" for="p_bio">معرفی کوتاه<span class="field__opt">اختیاری</span><span class="field__count" id="bioCount"></span></label><textarea class="textarea" id="p_bio" data-p="bio" maxlength="300" rows="4" placeholder="دو سه جمله دربارهٔ آنچه دوست داری و می‌سازی">' + esc(p.bio) + '</textarea><div class="field__hint">با ۴۰ نویسه به بالا، نشان «پروفایل جان‌دار» نزدیک‌تر می‌شود</div></div></div></div>';
      }

      function contactsPanel() {
        const ic = { email: 'mail', phone: 'phone', website: 'globe' };
        const rows = RI.C().contacts.map((x) => '<div class="crow" data-id="' + x.id + '"><span class="row__ico">' + RI.icon(ic[x.type]) + '</span><div class="field" data-field="' + x.id + '"><label class="field__label" for="c_' + x.id + '">' + esc(x.label) + '</label><input class="input" id="c_' + x.id + '" data-c="' + x.id + '" dir="ltr" value="' + esc(x.value) + '" inputmode="' + (x.type === 'email' ? 'email' : x.type === 'phone' ? 'tel' : 'url') + '" placeholder="' + (x.type === 'email' ? 'you@example.com' : x.type === 'phone' ? '09123456789' : 'example.com') + '"><div class="field__error" role="alert" hidden></div></div>' +
          '<label class="crow__pub"><span>' + (x.public ? RI.icon('eye') + 'عمومی' : RI.icon('eyeOff') + 'پنهان') + '</span>' + RI.switchHtml({ checked: x.public, label: 'نمایش عمومی ' + x.label }).replace('<input', '<input data-cpub="' + x.id + '"') + '</label></div>').join('');
        return '<div class="panel"><div class="panel__head"><h2>اطلاعات تماس</h2><p>هر مورد را جدا برای نمایش عمومی انتخاب کن <span class="field__req">ضروری</span> برای انتشار: دست‌کم یک راه تماس عمومی</p></div>' + rows + '<div class="banner banner--brown">' + RI.icon('shield') + '<div class="banner__body">مورد پنهان هرگز روی صفحهٔ عمومی دیده نمی‌شود، حتی اگر پر باشد</div></div></div>';
      }

      function listPanel(id) {
        const L = LISTS[id], items = RI.C()[id];
        const rows = items.map((x, i) => '<li class="row" data-id="' + x.id + '"><span class="row__grip" title="کشیدن برای جابه‌جایی" aria-hidden="true">' + RI.icon('grip') + '</span>' +
          (L.thumb && L.thumb(x) ? '<span class="row__thumb" style="' + esc(RI.bg(L.thumb(x))) + '"></span>' : '<span class="row__ico">' + RI.icon(L.iconOf ? L.iconOf(x) : L.icon) + '</span>') +
          '<div class="row__main"><div class="row__title">' + esc(L.title_(x)) + '</div><div class="row__sub">' + esc(L.sub(x) || '') + '</div></div>' + (L.right ? L.right(x) : '') +
          '<div class="row__actions"><button type="button" class="btn btn--icon btn--ghost btn--sm" data-up="' + x.id + '" aria-label="بالا" ' + (i === 0 ? 'disabled' : '') + '>' + RI.icon('up') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-down="' + x.id + '" aria-label="پایین" ' + (i === items.length - 1 ? 'disabled' : '') + '>' + RI.icon('down') + '</button>' +
          '<button type="button" class="btn btn--icon btn--ghost btn--sm" data-edit="' + x.id + '" aria-label="ویرایش">' + RI.icon('edit') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-del="' + x.id + '" aria-label="حذف">' + RI.icon('trash') + '</button></div></li>').join('');
        return '<div class="panel"><div class="panel__head panel__head--row"><div><h2>' + L.title + '</h2><p>' + L.hint + ' <span class="field__opt">اختیاری</span></p></div><button type="button" class="btn btn--primary btn--sm" data-add>' + RI.icon('plus') + L.add + '</button></div>' +
          (items.length ? '<ul class="rows" id="rlist">' + rows + '</ul>' : RI.empty({ icon: L.icon, title: L.empty[0], text: L.empty[1], action: '<button type="button" class="btn btn--primary" data-add>' + RI.icon('plus') + L.add + '</button>' })) + '</div>';
      }

      function layoutPanel() {
        const c = RI.C();
        const rows = c.sections.map((s, i) => { const m = SECTION_META[s.key];
          return '<li class="row' + (s.visible ? '' : ' is-off') + '" data-id="' + s.key + '"><span class="row__grip" aria-hidden="true">' + RI.icon('grip') + '</span><span class="row__ico">' + RI.icon(m[1]) + '</span><div class="row__main"><div class="row__title">' + m[0] + '</div><div class="row__sub">' + (s.key === 'contacts' ? 'ضروری برای انتشار' : (c[s.key] && c[s.key].length ? RI.fa(c[s.key].length) + ' مورد' : 'خالی؛ تا پر نشود نمایش داده نمی‌شود')) + '</div></div>' +
            '<div class="row__actions"><button type="button" class="btn btn--icon btn--ghost btn--sm" data-sup="' + s.key + '" aria-label="بالا" ' + (i === 0 ? 'disabled' : '') + '>' + RI.icon('up') + '</button><button type="button" class="btn btn--icon btn--ghost btn--sm" data-sdown="' + s.key + '" aria-label="پایین" ' + (i === c.sections.length - 1 ? 'disabled' : '') + '>' + RI.icon('down') + '</button></div>' +
            RI.switchHtml({ checked: s.visible, label: 'نمایش ' + m[0] }).replace('<input', '<input data-svis="' + s.key + '"') + '</li>'; }).join('');
        return '<div class="panel"><div class="panel__head"><h2>چیدمان بخش‌ها</h2><p>ترتیب را بکش یا با فلش‌ها عوض کن؛ با کلید هر بخش را از رزومه پنهان کن</p></div><ul class="rows" id="slist">' + rows + '</ul></div>';
      }

      function paint(keepScroll) {
        if (tab === 'layout') body.innerHTML = layoutPanel();
        else {
          body.innerHTML = stepper() + '<div id="panel">' + (step === 'profile' ? profilePanel() : step === 'contacts' ? contactsPanel() : listPanel(step)) + '</div>' + navButtons();
          bindPanel();
          const ul = RI.$('#rlist', body);
          if (ul) { const L = RI.C()[step]; RI.sortable(ul, { onReorder: (f, t) => RI.flip(ul, () => { RI.move(L, f, t); RI.touch(step); paint(); }) }); }
        }
        RI.$$('#rtabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
        RI.animateBars(body);
        if (tab === 'layout') bindLayout();
      }
      function navButtons() {
        const i = STEPS.findIndex((s) => s.id === step), prev = STEPS[i - 1], next = STEPS[i + 1];
        return '<div class="stepnav">' + (prev ? '<button type="button" class="btn btn--ghost" data-step="' + prev.id + '">' + RI.icon('chevR') + prev.label + '</button>' : '<span></span>') + (next ? '<button type="button" class="btn btn--ice" data-step="' + next.id + '">' + next.label + RI.icon('chevL') + '</button>' : '<button type="button" class="btn btn--primary" data-go="publish">' + RI.icon('rocket') + 'به مرحلهٔ انتشار' + '</button>') + '</div>';
      }
      function setStep(s) { step = s; paint(); if (!RI.reduceMotion()) RI.$('#panel', root).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.22,.8,.28,1)' }); }

      function bindPanel() {
        const c = RI.C(), p = c.profile;
        if (step === 'profile') {
          const panel = RI.$('#panel', root);
          RI.bindImageField(panel, 'cover', { set: (v) => { p.cover = v; RI.touch('cover'); } });
          RI.bindImageField(panel, 'avatar', { set: (v) => { p.avatar = v; RI.touch('avatar'); } });
          const cnt = () => { const e = RI.$('#bioCount', panel); if (e) e.textContent = RI.fa(p.bio.length) + '/۳۰۰'; }; cnt();
          RI.$$('[data-p]', panel).forEach((el) => {
            el.addEventListener('input', () => { p[el.dataset.p] = el.value; RI.touch('profile'); if (el.dataset.p === 'bio') cnt(); if (el.value.trim()) RI.showFieldError(panel, el.dataset.p, ''); });
            el.addEventListener('blur', () => { if ((el.dataset.p === 'name' || el.dataset.p === 'title') && !el.value.trim()) RI.showFieldError(panel, el.dataset.p, 'این فیلد برای انتشار لازم است'); });
          });
        }
      }

      /* رویدادهای کلی بدنه */
      RI.delegate(body, 'click', '[data-step]', (e, b) => setStep(b.dataset.step));
      RI.delegate(body, 'click', '[data-add]', () => openForm(null));
      RI.delegate(body, 'click', '[data-edit]', (e, b) => openForm(b.dataset.edit));
      RI.delegate(body, 'click', '[data-del]', (e, b) => remove(b.dataset.del));
      RI.delegate(body, 'click', '[data-up],[data-down]', (e, b) => shift(b.dataset.up || b.dataset.down, b.dataset.up ? -1 : 1));
      body.addEventListener('input', (e) => {
        const id = e.target.dataset.c; if (!id) return;
        const x = RI.C().contacts.find((k) => k.id === id); x.value = e.target.value; RI.touch('contacts');
        let m = '';
        if (e.target.value.trim()) { if (x.type === 'email' && !RI.isEmail(e.target.value)) m = 'ایمیل معتبر نیست'; if (x.type === 'phone' && !RI.isMobile(e.target.value)) m = 'شمارهٔ موبایل را به شکل ۰۹۱۲۳۴۵۶۷۸۹ بنویس'; if (x.type === 'website' && !RI.isUrl(e.target.value)) m = 'آدرس وب‌سایت معتبر نیست'; }
        RI.showFieldError(body, id, m);
      });
      body.addEventListener('change', (e) => {
        if (e.target.dataset.cpub) { const x = RI.C().contacts.find((k) => k.id === e.target.dataset.cpub); if (e.target.checked && !x.value.trim()) { e.target.checked = false; RI.toast('اول مقدار را وارد کن، بعد می‌توانی عمومی‌اش کنی', { kind: 'info' }); return; } x.public = e.target.checked; RI.touch('contacts'); paint(); }
        if (e.target.dataset.svis) { const s = RI.C().sections.find((k) => k.key === e.target.dataset.svis); s.visible = e.target.checked; RI.touch('sections'); const li = e.target.closest('.row'); li.classList.toggle('is-off', !s.visible); }
      });

      function openForm(id) {
        const L = LISTS[step], list = RI.C()[step], cur = id ? list.find((x) => x.id === id) : null;
        RI.formModal({ title: (cur ? 'ویرایش ' : '') + L.add.replace('افزودن ', cur ? '' : 'افزودن '), size: step === 'projects' ? 'lg' : 'md', fields: L.fields, values: cur ? RI.clone(cur) : Object.assign({}, L.defaults || {}), submitLabel: cur ? 'ذخیرهٔ تغییر' : 'افزودن',
          onSubmit: (v) => { if (cur) Object.assign(cur, v); else list.push(Object.assign({ id: RI.uid() }, v)); RI.touch(step); paint(); RI.toast(cur ? 'تغییر اعمال شد' : 'اضافه شد' + (list.length === 1 ? ' — بخش جان گرفت!' : '')); } });
      }
      async function remove(id) {
        const L = LISTS[step], list = RI.C()[step], x = list.find((k) => k.id === id);
        const ok = await RI.confirm({ title: 'حذف «' + esc(L.title_(x)) + '»', text: 'این مورد از رزومه حذف می‌شود تا زمانی که ذخیره نکنی می‌توانی با «دور انداختن تغییرات» برش گردانی', danger: true, icon: 'trash', confirmLabel: 'حذف' });
        if (!ok) return;
        const el = RI.$('[data-id="' + id + '"]', body);
        if (el && !RI.reduceMotion()) await el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px)' }], { duration: 220, easing: 'ease-in' }).finished.catch(() => {});
        list.splice(list.findIndex((k) => k.id === id), 1); RI.touch(step); paint(); RI.toast('حذف شد', { kind: 'info' });
      }
      function shift(id, d) {
        const list = RI.C()[step], i = list.findIndex((k) => k.id === id), j = i + d; if (j < 0 || j >= list.length) return;
        RI.flip(RI.$('#rlist', body), () => { RI.move(list, i, j); RI.touch(step); paint(); });
      }
      function bindLayout() {
        const ul = RI.$('#slist', body); const secs = RI.C().sections;
        RI.delegate(ul, 'click', '[data-sup],[data-sdown]', (e, b) => { const k = b.dataset.sup || b.dataset.sdown, i = secs.findIndex((s) => s.key === k), j = i + (b.dataset.sup ? -1 : 1); if (j < 0 || j >= secs.length) return; RI.flip(ul, () => { RI.move(secs, i, j); RI.touch('sections'); paint(); }); });
        RI.sortable(ul, { onReorder: (f, t) => RI.flip(ul, () => { RI.move(secs, f, t); RI.touch('sections'); paint(); }) });
      }
      RI.delegate(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; paint(); });
      RI.delegate(root, 'click', '[data-live]', () => RI.openPreview('resume'));
      paint();
      if (ctx.opts && ctx.opts.step) { /* رفتن مستقیم به مرحلهٔ پیشنهادی */ }
      return () => { off(); pv.destroy(); };
    },
  });
})();
