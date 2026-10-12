/* ذخیرهٔ حساب روی سرور، پشتیبان تب و انتشار مستقل صفحه‌ها */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});

  RI.state = {
    content: RI.seed('empty'),
    billing: RI.seedBilling('free'),
    account: RI.seedAccount(),
    pub: {
      resume: { status: 'draft', version: 0, at: null, snap: null },
      links: { status: 'draft', version: 0, at: null, snap: null },
    },
    ui: { dirty: false, saving: false, saveError: false, savedAt: Date.now(), sim: { slow: false, failNext: false, nodata: false, netError: false }, profile: 'partial', plan: 'free', pubDemo: 'draft' },
  };
  RI.saved = JSON.stringify(RI.state.content);
  RI.S = () => RI.state;
  RI.C = () => RI.state.content;

  // Keep a tab backup for migration; MySQL is authoritative once the account has a saved revision.
  let draftKey;
  function validateDraft(value, sample, key = '') {
    if (sample === null) {
      if (key === 'at' && typeof value === 'number' && Number.isFinite(value)) return value;
      if (value !== null && (typeof value !== 'string' || value.length > 3 * 1024 * 1024)) throw new Error('Invalid image or snapshot');
      return value;
    }
    if (Array.isArray(sample)) {
      if (!Array.isArray(value) || value.length > 100 || (!sample.length && value.length)) throw new Error('Invalid list');
      return value.map(item => validateDraft(item, sample.find(s => s.type && s.type === item?.type) || sample[0]));
    }
    if (typeof sample === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object');
      return Object.fromEntries(Object.keys(sample).map(k => [k, validateDraft(value[k] === undefined ? sample[k] : value[k], sample[k], k)]));
    }
    if (typeof value !== typeof sample || (typeof value === 'number' && !Number.isFinite(value)) || (typeof value === 'string' && value.length > 10000)) throw new Error('Invalid field');
    if (key === 'id' && !/^[a-z0-9_-]{1,64}$/i.test(value)) throw new Error('Invalid identifier');
    return value;
  }
  RI.restoreDraft = function (owner) {
    draftKey = 'resumeit-draft-v1:' + owner;
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey));
      if (draft && draft.content && draft.content.profile && draft.pub) {
        const content = validateDraft(draft.content, RI.seed('full'));
        content.resumeTemplates = RI.validateResumeValues ? RI.validateResumeValues(draft.content.resumeTemplates || {}) : {};
        const publication = validateDraft(draft.pub, RI.state.pub);
        if (content.sections.some(s => !RI.seed('empty').sections.some(known => known.key === s.key))) throw new Error('Invalid section');
        RI.state.content = content; RI.state.pub = publication;
        RI.saved = JSON.stringify(content); RI.savedSlug = content.slug;
      }
    } catch { RI.toast('پیش‌نویس موقت قابل بازیابی نبود.', { kind: 'error' }); }
  };
  RI.keepDraft = function () {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ content: JSON.parse(RI.saved), pub: RI.state.pub }));
      return true;
    } catch { if(RI.revision)return true;RI.toast('ذخیرهٔ پشتیبان این تب انجام نشد؛ اطلاعات را روی حساب ذخیره کن.', { kind: 'error' }); return false; }
  };
  RI.clearDraft = () => { try { sessionStorage.removeItem(draftKey); } catch {} };

  /* ---------- تغییر و ذخیره ---------- */
  RI.touch = function (scope) {
    RI.state.ui.dirty = true;
    RI.state.ui.saveError = false;
    RI.emit('change', { scope: scope });
    RI.emit('save');
  };

  RI.save = async function () {
    const ui = RI.state.ui;
    if (ui.saving) return false;
    ui.saving = true; ui.saveError = false; RI.emit('save');
    const snapshot=JSON.stringify(RI.C()),indexing=RI.state.account.indexing;
    try {
      const doc=await RI.dashboardRequest('save',{revision:RI.revision,content:JSON.parse(snapshot),preferences:RI.state.account});
      RI.revision=doc.revision;RI.saved=JSON.stringify(doc.content);RI.savedSlug=doc.slug||'';
      if(snapshot===JSON.stringify(RI.C())&&indexing===RI.state.account.indexing){RI.state.content=doc.content;Object.assign(RI.state.account,doc.preferences);ui.dirty=false;}
      ui.savedAt=Date.now();RI.keepDraft();return true;
    }catch(e){ui.saveError=true;RI.toast(e.message,{kind:'error'});return false;}
    finally{ui.saving=false;RI.emit('save');}
  };

  RI.revert = function () {
    RI.state.content = JSON.parse(RI.saved);
    RI.state.ui.dirty = false; RI.state.ui.saveError = false;
    RI.emit('save');
  };

  /* قبل از ترک صفحه یا تعویض حالت: اگر ذخیره‌نشده داریم از کاربر بپرس */
  RI.leaveGuard = async function () {
    if (!RI.state.ui.dirty) return true;
    const c = await RI.choice({
      title: 'تغییرات ذخیره‌نشده دارید',
      text: 'اگر بدون ذخیره خارج شوید، ویرایش‌های اخیرتان از بین می‌رود.',
      options: [
        { label: 'ذخیره و ادامه', kind: 'primary', icon: 'save', value: 'save' },
        { label: 'دور انداختن تغییرات', kind: 'danger', value: 'discard' },
        { label: 'ماندن در صفحه', kind: 'ghost', value: 'stay' },
      ],
    });
    if (c === 'save') return await RI.save();
    if (c === 'discard') { RI.revert(); return true; }
    return false;
  };

  /* ---------- دسترسی و خرید ---------- */
  RI.hasSub = () => { const p = RI.state.billing.plan; return !!(p && p.end > Date.now()); };
  RI.owns = (ref) => RI.state.billing.purchases.some((p) => p.ref === ref);
  /* ref: rt:id | lt:id | font:id | pal:id */
  RI.accessOf = function (ref, item) {
    if (item.access === 'free') return 'free';
    if (item.access === 'buy') return RI.owns(ref) ? 'owned' : 'locked-buy';
    return RI.hasSub() ? 'sub-ok' : 'locked-sub';
  };
  RI.canUse = (ref, item) => ['free', 'owned', 'sub-ok'].indexOf(RI.accessOf(ref, item)) > -1;
  RI.findTemplate = (kind, id) => (kind === 'links' ? RI.LINK_TEMPLATES : RI.RESUME_TEMPLATES).find((t) => t.id === id) || (kind === 'links' ? RI.LINK_TEMPLATES[0] : RI.RESUME_TEMPLATES[0]);

  /* ---------- نام صفحه ---------- */
  RI.slugCheck = function (v) {
    const s = (v || '').trim();
    if (!s) return { state: 'empty', msg: 'نام صفحه را وارد کنید.' };
    if (s.length < 3) return { state: 'invalid', msg: 'نام صفحه دست‌کم ۳ نویسه باید باشد.' };
    if (s.length > 24) return { state: 'invalid', msg: 'نام صفحه حداکثر ۲۴ نویسه می‌تواند باشد.' };
    if (/[A-Z]/.test(s)) return { state: 'invalid', msg: 'فقط حروف کوچک انگلیسی مجاز است.' };
    if (!/^[a-z0-9-]+$/.test(s)) return { state: 'invalid', msg: 'فقط حروف انگلیسی، عدد و خط تیره مجاز است (بدون فاصله و فارسی).' };
    if (/^-|-$/.test(s)) return { state: 'invalid', msg: 'نام صفحه نباید با خط تیره شروع یا تمام شود.' };
    if (/--/.test(s)) return { state: 'invalid', msg: 'دو خط تیرهٔ پشت‌سرهم مجاز نیست.' };
    const own = (RI.savedSlug || '');
    if (RI.TAKEN_SLUGS.indexOf(s) > -1 && s !== own) return { state: 'taken', msg: 'این نام رزرو شده است.' };
    return { state: 'ok', msg: 'نام معتبر است؛ آزاد بودن آن هنگام ذخیره بررسی می‌شود.' };
  };
  RI.savedSlug = RI.state.content.slug;
  RI.suggestSlugs = (s) => [s + '-dev', s + '-' + (new Date().getFullYear() % 100), 'the-' + s].filter((x) => RI.slugCheck(x).state === 'ok');
  RI.urls = function () {
    const sl = RI.C().slug || 'username';
    const host = 'https://' + sl + '.' + RI.DOMAIN.toLowerCase();
    return { resume: host, links: host + '/links', base: sl + '.' + RI.DOMAIN, fallbackResume:location.origin+'/u/'+sl+'/',fallbackLinks:location.origin+'/u/'+sl+'/links' };
  };

  /* ---------- پیشرفت و چک‌لیست ---------- */
  RI.completion = function () {
    const c = RI.C(), p = c.profile;
    const items = [
      { id: 'name', label: 'نام و عنوان حرفه‌ای', w: 15, done: !!(p.name.trim() && p.title.trim()), route: 'resume', step: 'profile' },
      { id: 'bio', label: 'معرفی کوتاه (حداقل ۴۰ نویسه)', w: 10, done: p.bio.trim().length >= 40, route: 'resume', step: 'profile' },
      { id: 'avatar', label: 'عکس پروفایل', w: 10, done: !!p.avatar, route: 'resume', step: 'profile' },
      { id: 'contact', label: 'یک راه تماس عمومی', w: 10, done: c.contacts.some((x) => x.public && x.value.trim()), route: 'resume', step: 'contacts' },
      { id: 'skills', label: 'حداقل سه مهارت', w: 10, done: c.skills.length >= 3, route: 'resume', step: 'skills' },
      { id: 'history', label: 'یک تجربه یا سابقهٔ تحصیلی', w: 10, done: c.experience.length + c.education.length >= 1, route: 'resume', step: 'experience' },
      { id: 'projects', label: 'یک پروژه یا نمونه‌کار', w: 10, done: c.projects.length >= 1, route: 'resume', step: 'projects' },
      { id: 'links', label: 'حداقل دو لینک فعال', w: 10, done: c.links.items.filter((i) => i.type === 'link' && i.active).length >= 2, route: 'links' },
      { id: 'look', label: 'شخصی‌سازی ظاهر', w: 5, done: c.theme.resume !== 'glacier' || c.theme.font !== 'vazir' || c.theme.palette !== 'default' || c.theme.links !== 'frost', route: 'themes' },
      { id: 'slug', label: 'انتخاب نام صفحه', w: 5, done: RI.slugCheck(c.slug).state === 'ok', route: 'publish' },
      { id: 'publish', label: 'انتشار صفحه', w: 5, done: RI.state.pub.resume.status === 'published', route: 'publish' },
    ];
    const pct = items.reduce((a, i) => a + (i.done ? i.w : 0), 0);
    return { items: items, pct: pct, next: items.find((i) => !i.done) || null };
  };

  RI.BADGES = [
    { id: 'start', label: 'شروع‌کننده', at: 15, icon: 'flag' },
    { id: 'alive', label: 'پروفایل جان‌دار', at: 50, icon: 'sparkle' },
    { id: 'serious', label: 'رزومهٔ جدی', at: 75, icon: 'award' },
    { id: 'ready', label: 'آمادهٔ انتشار', at: 90, icon: 'rocket' },
    { id: 'live', label: 'منتشر شد', at: 101, icon: 'trophy' },
  ];
  RI.badgeState = function () {
    const comp = RI.completion(), live = RI.state.pub.resume.status === 'published';
    return RI.BADGES.map((b) => ({ id: b.id, label: b.label, icon: b.icon, at: b.at, got: b.id === 'live' ? live : comp.pct >= b.at }));
  };

  RI.readiness = function () {
    const c = RI.C(), p = c.profile, slug = RI.slugCheck(c.slug);
    const hasBody = c.skills.length + c.experience.length + c.education.length + c.projects.length > 0;
    const resume = [
      {id:'account-first',req:true,label:'نام حساب کامل شده',done:!!RI.state.account.firstName,route:'settings'},
      {id:'account-last',req:true,label:'نام خانوادگی کامل شده',done:!!RI.state.account.lastName,route:'settings'},
      {id:'account-phone',req:true,label:'شماره موبایل تأیید شده',done:RI.state.account.mobileVerified&&!!RI.state.account.mobile,route:'settings'},
      ...RI.resumeRequirements(c),
      { id: 'slug', req: true, label: 'نام صفحهٔ معتبر و آزاد', done: slug.state === 'ok', route: 'publish', anchor: 'slug' },
      { id: 'avatar', req: false, label: 'عکس پروفایل', done: !!p.avatar, route: 'resume', step: 'profile' },
      { id: 'bio', req: false, label: 'معرفی کوتاه', done: p.bio.trim().length >= 40, route: 'resume', step: 'profile' },
      { id: 'proj', req: false, label: 'حداقل یک پروژه', done: c.projects.length > 0, route: 'resume', step: 'projects' },
      { id: 'share', req: false, label: 'عنوان و توضیح اشتراک‌گذاری', done: !!(c.share.title.trim() && c.share.desc.trim()), route: 'publish', anchor: 'share' },
    ];
    const links = [
      {id:'account-first',req:true,label:'نام حساب کامل شده',done:!!RI.state.account.firstName,route:'settings'},
      {id:'account-last',req:true,label:'نام خانوادگی کامل شده',done:!!RI.state.account.lastName,route:'settings'},
      {id:'account-phone',req:true,label:'شماره موبایل تأیید شده',done:RI.state.account.mobileVerified&&!!RI.state.account.mobile,route:'settings'},
      { id: 'lslug', req: true, label: 'نام صفحهٔ معتبر و آزاد', done: slug.state === 'ok', route: 'publish', anchor: 'slug' },
      { id: 'litem', req: true, label: 'حداقل یک لینک فعال', done: c.links.items.some((i) => i.type === 'link' && i.active), route: 'links' },
      { id: 'lname', req: true, label: 'نام نمایشی بالای صفحه', done: !!((c.links.header.sync ? p.name : c.links.header.name).trim()), route: 'links', tab: 'header' },
      { id: 'lbio', req: false, label: 'معرفی کوتاه بالای صفحه', done: !!((c.links.header.sync ? p.bio : c.links.header.bio).trim()), route: 'links', tab: 'header' },
    ];
    return { resume: resume, links: links, resumeOk: resume.filter((i) => i.req).every((i) => i.done), linksOk: links.filter((i) => i.req).every((i) => i.done) };
  };

  /* ---------- نسخهٔ منتشرشده ---------- */
  RI.pubData = function (k) {
    const c = RI.C();
    if (k === 'resume') return { slug: c.slug, profile: c.profile, contacts: c.contacts, skills: c.skills, experience: c.experience, education: c.education, projects: c.projects, certs: c.certs, languages: c.languages, socials: c.socials, sections: c.sections, resumeTemplates: c.resumeTemplates, theme: { resume: c.theme.resume, font: c.theme.font, palette: c.theme.palette, radius: c.theme.radius }, share: c.share };
    return { slug: c.slug, links: c.links, name: c.profile.name, bio: c.profile.bio, avatar: c.profile.avatar, theme: { links: c.theme.links, font: c.theme.font, linksPalette: c.theme.linksPalette } };
  };
  RI.pubDirty = function (k) { const s = RI.state.pub[k]; return s.status === 'published' && JSON.stringify(RI.pubData(k)) !== s.snap; };

  /* انتشار آخرین محتوای ذخیره‌شده روی سرور */
  RI.publish = async function (k, onStep) {
    const eligibility=await RI.accountRequest('publication-check');
    if(!eligibility.canPublish){RI.toast('قبل از انتشار '+eligibility.missing.join('، ')+' رو در تنظیمات کامل کن',{kind:'error'});throw new Error('account-incomplete');}
    const steps = ['بررسی اطلاعات صفحه', 'ساخت نسخهٔ جدید', 'آماده‌سازی آدرس عمومی'];
    onStep && onStep(0,steps);
    if(RI.state.ui.dirty||!RI.revision){if(!await RI.save())throw new Error('ابتدا تغییرات را ذخیره کن');}
    onStep && onStep(1,steps);
    const doc=await RI.dashboardRequest('publish',{revision:RI.revision,kind:k});
    RI.revision=doc.revision;RI.state.pub=doc.pub;RI.savedSlug=doc.slug;
    onStep && onStep(steps.length, steps);
    RI.emit('pub');
  };
  RI.unpublish = async function (k) {const doc=await RI.dashboardRequest('unpublish',{revision:RI.revision,kind:k});RI.revision=doc.revision;RI.state.pub=doc.pub;RI.emit('pub');};

})();
