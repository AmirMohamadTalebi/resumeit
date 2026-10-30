/* The assistant's conversational layer: reads the resume the user already wrote and answers in Persian.
   It scores the resume on five dimensions, infers the role from the user's own words, suggests skills for that
   role, drafts a bio and sharper bullet openings from facts already present, and answers free questions by
   matching intent (typo-tolerant). It never invents facts: drafts only reuse what the resume says. Pure and
   synchronous so Node tests and the browser share it. */
(function (root) {
  'use strict';
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const fa = n => String(n).replace(/\d/g, d => FA_DIGITS[d]);
  const norm = v => String(v || '').normalize('NFC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[ًٌٍَُِّْ]/g, '').replace(/[۰-۹]/g, c => FA_DIGITS.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[‌\s]+/g, ' ').trim().toLowerCase();
  const words = v => norm(v).replace(/[^\p{L}\p{N}+#.\s]/gu, ' ').split(' ').filter(Boolean);
  const list = v => Array.isArray(v) ? v : [];
  const text = v => String(v || '').trim();

  // Edit distance with an early exit, for typo-tolerant intent matching ("امتیاذ" → "امتیاز").
  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
      if (best > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  }
  const near = (w, k) => w === k || (k.length >= 4 && w.length >= 3 && (w.startsWith(k) || k.startsWith(w) && w.length >= k.length - 1 || distance(w, k, k.length >= 6 ? 2 : 1) <= (k.length >= 6 ? 2 : 1)));

  /* ---------- Roles ---------- */
  const ROLES = {
    frontend: { label: 'توسعه‌دهندهٔ فرانت‌اند', keys: ['فرانت', 'frontend', 'front-end', 'react', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html', 'next.js', 'رابط وب'], skills: ['JavaScript', 'TypeScript', 'React', 'HTML و CSS', 'Git', 'Tailwind CSS', 'تست‌نویسی', 'دسترس‌پذیری وب', 'بهینه‌سازی سرعت'] },
    backend: { label: 'توسعه‌دهندهٔ بک‌اند', keys: ['بک', 'backend', 'back-end', 'node', 'django', 'laravel', 'php', 'golang', 'java', 'sql', 'api', 'سرور', 'دیتابیس'], skills: ['Node.js', 'SQL', 'طراحی API', 'Docker', 'Git', 'Redis', 'تست‌نویسی', 'لینوکس', 'امنیت وب'] },
    mobile: { label: 'توسعه‌دهندهٔ موبایل', keys: ['موبایل', 'اندروید', 'android', 'ios', 'flutter', 'فلاتر', 'kotlin', 'swift', 'react native'], skills: ['Flutter', 'Kotlin', 'Swift', 'Git', 'طراحی API', 'انتشار در مارکت‌ها', 'Firebase'] },
    design: { label: 'طراح رابط و تجربهٔ کاربری', keys: ['طراح', 'ui', 'ux', 'figma', 'فیگما', 'رابط کاربری', 'تجربه کاربری', 'گرافیک', 'illustrator', 'photoshop'], skills: ['Figma', 'طراحی رابط کاربری', 'تحقیق کاربر', 'پروتوتایپ', 'سیستم طراحی', 'Photoshop', 'Illustrator', 'تست کاربردپذیری'] },
    data: { label: 'تحلیل‌گر داده', keys: ['داده', 'data', 'تحلیل', 'python', 'پایتون', 'power bi', 'tableau', 'excel', 'اکسل', 'آمار', 'sql', 'machine learning', 'یادگیری ماشین'], skills: ['Python', 'SQL', 'Excel', 'Power BI', 'آمار', 'Pandas', 'مصورسازی داده', 'یادگیری ماشین'] },
    marketing: { label: 'کارشناس بازاریابی دیجیتال', keys: ['بازاریابی', 'مارکتینگ', 'marketing', 'سئو', 'seo', 'تبلیغات', 'کمپین', 'شبکه های اجتماعی', 'سوشال', 'برند'], skills: ['سئو', 'بازاریابی محتوا', 'Google Analytics', 'مدیریت کمپین', 'شبکه‌های اجتماعی', 'ایمیل مارکتینگ', 'کپی‌رایتینگ'] },
    content: { label: 'تولیدکنندهٔ محتوا', keys: ['محتوا', 'نویسنده', 'نویسندگی', 'کپی رایت', 'ویراستار', 'ترجمه', 'مترجم', 'content', 'ادمین'], skills: ['کپی‌رایتینگ', 'ویراستاری', 'سئو', 'تولید محتوای ویدیویی', 'ترجمه', 'مدیریت شبکه‌های اجتماعی'] },
    sales: { label: 'کارشناس فروش', keys: ['فروش', 'sales', 'بازرگانی', 'crm', 'مذاکره', 'مشتری', 'ویزیتور'], skills: ['مذاکره', 'CRM', 'فروش تلفنی', 'مدیریت مشتری', 'پیگیری سرنخ', 'ارائه محصول'] },
    support: { label: 'کارشناس پشتیبانی مشتری', keys: ['پشتیبانی', 'support', 'پاسخگویی', 'خدمات مشتری', 'تیکت', 'call center'], skills: ['ارتباط با مشتری', 'حل مسئله', 'تیکتینگ', 'CRM', 'صبر و همدلی', 'مستندسازی'] },
    accounting: { label: 'حسابدار', keys: ['حسابدار', 'حسابداری', 'accounting', 'مالی', 'مالیات', 'سپیدار', 'همکاران سیستم', 'حسابرسی', 'بیمه'], skills: ['حسابداری مالی', 'Excel', 'نرم‌افزار سپیدار', 'قوانین مالیاتی', 'تهیهٔ صورت‌های مالی', 'بیمه و حقوق'] },
    teaching: { label: 'مدرس', keys: ['مدرس', 'معلم', 'تدریس', 'آموزش', 'teacher', 'teaching', 'کلاس'], skills: ['طراحی درس', 'ارزشیابی', 'مدیریت کلاس', 'آموزش آنلاین', 'روان‌شناسی یادگیری'] },
    management: { label: 'مدیر پروژه', keys: ['مدیر', 'مدیریت', 'manager', 'project', 'پروژه', 'اسکرام', 'scrum', 'agile', 'جیرا', 'jira', 'محصول', 'product'], skills: ['مدیریت پروژه', 'اسکرام', 'Jira', 'برنامه‌ریزی', 'مدیریت ریسک', 'رهبری تیم', 'ارتباط با ذی‌نفعان'] },
  };
  function detectRole(c, goal) {
    const p = c.profile || {}, scores = {};
    const sources = [[goal, 4], [p.title, 3], [list(c.skills).map(s => s.name).join(' '), 2], [list(c.experience).map(e => (e.role || '') + ' ' + (e.desc || '')).join(' '), 1], [list(c.projects).map(x => (x.title || x.name || '') + ' ' + (x.desc || '')).join(' '), 1], [p.bio, 1]];
    for (const [id, role] of Object.entries(ROLES)) {
      let s = 0;
      for (const [src, weight] of sources) { const n = norm(src); if (!n) continue; for (const k of role.keys) if (n.includes(norm(k))) s += weight; }
      if (s) scores[id] = s;
    }
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return null;
    const [id, top] = ranked[0], second = ranked[1]?.[1] || 0;
    return { id, label: ROLES[id].label, confidence: top >= 6 && top >= second * 1.4 ? 'high' : top >= 3 ? 'medium' : 'low', alternatives: ranked.slice(1, 3).map(([r]) => r) };
  }
  function missingSkills(c, roleId) {
    const role = ROLES[roleId]; if (!role) return [];
    const have = list(c.skills).map(s => norm(s.name)), all = norm(JSON.stringify([c.profile, c.experience, c.projects]));
    return role.skills.filter(s => !have.some(h => h.includes(norm(s)) || norm(s).includes(h))).map(s => ({ name: s, seen: all.includes(norm(s).split(' ')[0]) }))
      .sort((a, b) => Number(b.seen) - Number(a.seen)).slice(0, 6);
  }

  /* ---------- Dates and years of experience ---------- */
  function year(v) { const m = /(\d{4})/.exec(norm(v)); if (!m) return null; const y = Number(m[1]); return y > 1300 && y < 1500 ? y + 621 : y > 1900 && y < 2100 ? y : null; }
  function years(c) {
    const now = new Date().getFullYear(); let total = 0;
    for (const e of list(c.experience)) { const a = year(e.from), b = e.current || !text(e.to) ? now : year(e.to); if (a && b && b >= a) total += Math.max(0.5, b - a); }
    return Math.round(total);
  }

  /* ---------- Score ---------- */
  const OPENERS = [[/^(?:مسئول|مسئولیت)\s+/, ''], [/^(?:وظیفه|وظایف)(?:\s+من)?\s+/, ''], [/^(?:انجام امور|انجام کارهای)\s+/, ''], [/^(?:کار با|فعالیت در)\s+/, '']];
  const IMPACT = /افزایش|کاهش|بهبود|رساندم|رسید|صرفه|سریع|بیشتر|کمتر|راه اندازی|راه‌اندازی|ساختم|طراحی کردم|پیاده سازی|پیاده‌سازی|توسعه دادم|مدیریت کردم|improv|increas|reduc|launch|built|led|grew|saved/;
  function score(c, opts = {}) {
    const p = c.profile || {}, exp = list(c.experience), proj = list(c.projects), skills = list(c.skills), contacts = list(c.contacts), bio = text(p.bio);
    const dims = [];
    const add = (id, label, points, max, reasons) => dims.push({ id, label, value: Math.round(Math.max(0, Math.min(max, points)) / max * 100), reasons: reasons.filter(Boolean) });
    let a = 0; const ar = [];
    if (text(p.name)) a += 15; else ar.push('نامت را بنویس');
    if (text(p.title)) a += 15; else ar.push('یک عنوان شغلی کوتاه بگذار');
    if (bio) a += 15; else ar.push('معرفی کوتاه ننوشته‌ای');
    if (exp.length || list(c.education).length) a += 20; else ar.push('تجربه یا تحصیلات خالی است');
    if (skills.length >= 3) a += 15; else ar.push('کمتر از سه مهارت داری');
    if (proj.length) a += 10; else ar.push('پروژه یا نمونه‌کاری نیامده');
    if (p.avatar) a += 10; else ar.push('عکس پروفایل نداری');
    add('complete', 'کامل‌بودن', a, 100, ar);
    let b = 0; const br = [];
    const t = text(p.title).length; if (t >= 8 && t <= 60) b += 30; else br.push(t ? 'عنوان را بین ۸ تا ۶۰ حرف نگه دار' : '');
    if (bio.length >= 120 && bio.length <= 500) b += 40; else if (bio.length >= 40) { b += 22; br.push(bio.length < 120 ? 'معرفی را کمی کامل‌تر کن (حدود ۲ تا ۳ جمله)' : 'معرفی طولانی است؛ کوتاه‌ترش کن'); } else br.push(bio ? 'معرفی خیلی کوتاه است' : 'معرفی بنویس تا خواننده در چند ثانیه بفهمد چه کاره‌ای');
    const long = [bio, ...exp.map(e => e.desc)].filter(x => text(x).length > 260 && !/[.؟!?؛\n]/.test(x)).length; if (!long) b += 30; else br.push('بعضی توضیح‌ها یک جملهٔ خیلی بلندند');
    add('clarity', 'وضوح', b, 100, br);
    const described = exp.filter(e => text(e.desc).length >= 25), withImpact = described.filter(e => /\d/.test(norm(e.desc)) || IMPACT.test(norm(e.desc)) && !OPENERS.some(([re]) => re.test(norm(e.desc))));
    let d = 0; const dr = [];
    if (!exp.length) { d = proj.some(x => text(x.desc).length >= 25) ? 55 : 25; dr.push('با تجربه یا پروژهٔ توضیح‌دار، اثرت را نشان بده'); }
    else { d += described.length / exp.length * 50; d += (withImpact.length / exp.length) * 50; if (described.length < exp.length) dr.push(fa(exp.length - described.length) + ' تجربه توضیح کافی ندارد'); if (withImpact.length < described.length) dr.push('نتیجهٔ کارت را با فعل یا عدد نشان بده'); }
    add('impact', 'اثرگذاری', d, 100, dr);
    const role = detectRole(c, opts.goal), miss = role ? missingSkills(c, role.id).filter(s => s.seen).length : 0;
    let s = Math.min(60, skills.length * 12) + (role ? 25 : 10) - miss * 5 + (skills.some(k => Number(k.level) > 0) ? 15 : 0); const sr = [];
    if (skills.length < 5) sr.push('پنج تا هشت مهارت اصلی بنویس'); if (miss) sr.push(fa(miss) + ' مهارتی که در متنت آمده در فهرست نیست');
    add('skills', 'مهارت‌ها', s, 100, sr);
    let e = 0; const er = [];
    if (contacts.some(x => x.public && text(x.value))) e += 40; else er.push('یک راه تماس عمومی بگذار');
    if (list(c.socials).length || proj.some(x => text(x.url))) e += 25; else er.push('لینک گیت‌هاب، لینکدین یا نمونه‌کار اضافه کن');
    if (!exp.some(x => { const a1 = year(x.from), b1 = year(x.to); return a1 && b1 && b1 < a1; })) e += 20; else er.push('یکی از تاریخ‌ها برعکس است');
    if (p.avatar) e += 15;
    add('trust', 'اعتماد', e, 100, er);
    const weights = { complete: .3, clarity: .2, impact: .2, skills: .15, trust: .15 };
    const total = Math.round(dims.reduce((sum, x) => sum + x.value * weights[x.id], 0));
    return { total, label: total >= 85 ? 'درخشان' : total >= 70 ? 'قوی' : total >= 50 ? 'خوب، با جای رشد' : total >= 30 ? 'در حال شکل‌گیری' : 'تازه شروع شده', dims, role };
  }

  /* ---------- Drafts from the user's own facts ---------- */
  function bioDraft(c, goal) {
    const p = c.profile || {}, role = detectRole(c, goal), y = years(c), exp = list(c.experience), latest = exp.find(e => e.current) || exp[0];
    const title = text(p.title) || role?.label; if (!title) return null;
    const top = list(c.skills).slice().sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0)).map(s => text(s.name)).filter(Boolean).slice(0, 3);
    const parts = [];
    parts.push(title + (y >= 1 ? ' با ' + fa(y) + ' سال تجربه' : '') + (top.length ? ' در ' + top.join('، ').replace(/، ([^،]+)$/, ' و $1') : '') + '.');
    if (latest && text(latest.org)) parts.push((latest.current ? 'الان در ' : 'آخرین بار در ') + text(latest.org) + (text(latest.role) ? ' به‌عنوان ' + text(latest.role) : '') + (latest.current ? ' کار می‌کنم.' : ' کار کردم.'));
    const proj = list(c.projects).find(x => text(x.title || x.name)); if (proj) parts.push('از کارهایم می‌توانم به «' + text(proj.title || proj.name) + '» اشاره کنم.');
    if (goal) parts.push('دنبال فرصتی به‌عنوان ' + text(goal) + ' هستم.');
    return parts.join(' ');
  }
  const VERBS = ['طراحی کردم', 'پیاده‌سازی کردم', 'راه‌اندازی کردم', 'بهبود دادم', 'مدیریت کردم', 'ساختم', 'تحلیل کردم', 'آموزش دادم'];
  function bulletHelp(desc) {
    const raw = text(desc); if (!raw) return null; const n = norm(raw);
    const tips = [];
    if (OPENERS.some(([re]) => re.test(n))) tips.push('جمله را با کاری که خودت کردی شروع کن، نه با «مسئول» یا «وظایف»؛ مثلاً «… را ' + VERBS[0] + '».');
    if (!IMPACT.test(n) && !/\d/.test(n)) tips.push('نتیجه را بگو: چه چیزی بهتر، سریع‌تر یا بیشتر شد؟ اگر عدد داری (درصد، تعداد، زمان) بنویس؛ اگر نه، خروجی واقعی کافی است.');
    if (raw.length < 40) tips.push('یک جمله کوتاه است؛ بگو با چه ابزاری و برای چه کسی کار کردی.');
    if (raw.length > 280) tips.push('توضیح بلند است؛ آن را به ۲ یا ۳ جملهٔ کوتاه بشکن.');
    return tips.length ? tips : null;
  }

  /* ---------- Conversation ---------- */
  const INTENTS = [
    ['greet', ['سلام', 'درود', 'hello', 'hi', 'وقت بخیر', 'خسته نباشی']],
    ['thanks', ['ممنون', 'مرسی', 'متشکرم', 'دمت گرم', 'thanks', 'سپاس']],
    ['help', ['چیکار میکنی', 'چه کاری', 'کمک', 'راهنما', 'توانایی', 'بلدی', 'help']],
    ['score', ['امتیاز', 'نمره', 'چقدر خوب', 'چطوره', 'ارزیابی', 'کیفیت', 'درصد', 'قوی', 'score']],
    ['next', ['قدم بعد', 'چیکار کنم', 'چه کنم', 'از کجا', 'شروع', 'بعدش', 'اولویت', 'next']],
    ['bio', ['معرفی', 'درباره من', 'بیو', 'خلاصه', 'about', 'bio', 'معرفینامه']],
    ['title', ['عنوان', 'تیتر', 'سمت', 'هدلاین', 'headline', 'title']],
    ['skills', ['مهارت', 'مهارتها', 'skill', 'تخصص', 'ابزار', 'تکنولوژی']],
    ['experience', ['تجربه', 'سابقه', 'سوابق', 'شغل قبلی', 'کار قبلی', 'experience']],
    ['impact', ['دستاورد', 'نتیجه', 'عدد', 'اثر', 'achievement', 'بولت', 'توضیح کار']],
    ['projects', ['پروژه', 'نمونه کار', 'پورتفولیو', 'portfolio', 'project']],
    ['photo', ['عکس', 'تصویر', 'آواتار', 'photo']],
    ['template', ['قالب', 'تم', 'رنگ', 'فونت', 'ظاهر', 'template', 'design']],
    ['publish', ['انتشار', 'منتشر', 'آدرس', 'لینک صفحه', 'دامنه', 'publish']],
    ['job', ['آگهی', 'استخدام', 'کارفرما', 'رزومه بفرستم', 'اپلای', 'apply', 'موقعیت شغلی']],
    ['role', ['نقش', 'حوزه', 'رشته', 'کدوم شغل', 'چه شغلی', 'role']],
    ['length', ['طولانی', 'کوتاه', 'چند صفحه', 'طول رزومه', 'length']],
    ['privacy', ['شماره', 'حریم', 'خصوصی', 'امنیت', 'privacy', 'نشانی خانه']],
    ['language', ['زبان', 'انگلیسی', 'english', 'ielts', 'تافل']],
  ];
  function intent(question) {
    const q = norm(question), ws = words(question); let best = null;
    for (const [id, keys] of INTENTS) {
      let s = 0;
      for (const k of keys) { const nk = norm(k); if (nk.includes(' ')) { if (q.includes(nk)) s += 3; } else if (ws.some(w => near(w, nk))) s += nk.length >= 4 ? 2 : 1; }
      if (s && (!best || s > best.s)) best = { id, s };
    }
    return best?.id || null;
  }
  const go = (label, section, field) => ({ kind: 'go', label, section, field });
  function reply(question, c, ctx = {}) {
    const id = intent(question), sc = score(c, ctx), role = sc.role, p = c.profile || {}, weak = sc.dims.slice().sort((a, b) => a.value - b.value);
    const follow = ['امتیاز رزومه‌ام چند است؟', 'قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده', 'چه مهارت‌هایی اضافه کنم؟'];
    const out = (textValue, actions = [], next = follow) => ({ intent: id || 'unknown', text: textValue, actions, follow: next.filter(f => norm(f) !== norm(question)).slice(0, 3) });
    switch (id) {
      case 'greet': return out('سلام' + (text(p.name) ? ' ' + text(p.name).split(' ')[0] : '') + '! رزومه‌ات را خوانده‌ام. الان ' + fa(sc.total) + ' از ۱۰۰ است (' + sc.label + '). می‌خواهی از کجا شروع کنیم؟');
      case 'thanks': return out('خواهش می‌کنم! هر وقت متن را عوض کنی، دوباره بررسی می‌کنم.');
      case 'help': return out('رزومه‌ات را می‌خوانم و: ۱) امتیازش را در پنج بعد می‌گویم، ۲) قدم بعدی را پیشنهاد می‌دهم، ۳) از اطلاعات خودت پیش‌نویس معرفی می‌سازم، ۴) مهارت‌های مناسب نقشت را پیشنهاد می‌دهم، ۵) توضیح تجربه‌ها را قوی‌تر می‌کنم. چیزی از خودم اضافه نمی‌کنم؛ هر تغییر با تأیید تو اعمال می‌شود.');
      case 'score': return out('امتیاز رزومه‌ات ' + fa(sc.total) + ' از ۱۰۰ است (' + sc.label + '). ' + sc.dims.map(d => d.label + ' ' + fa(d.value)).join('، ') + '. ضعیف‌ترین بخش «' + weak[0].label + '» است' + (weak[0].reasons[0] ? ': ' + weak[0].reasons[0] + '.' : '.'), [{ kind: 'tab', label: 'جزئیات امتیاز', tab: 'score' }], ['چطور «' + weak[0].label + '» را بهتر کنم؟', 'قدم بعدی چیه؟']);
      case 'next': {
        const r = weak.flatMap(d => d.reasons.map(x => ({ d, x }))).slice(0, 3);
        return out(r.length ? 'سه کار که بیشترین اثر را دارند:\n' + r.map((v, i) => fa(i + 1) + '. ' + v.x + ' (' + v.d.label + ')').join('\n') : 'رزومه‌ات کامل است! حالا آمادگی انتشار را بررسی کن و صفحه را منتشر کن.', r.length ? [] : [{ kind: 'route', label: 'آمادگی انتشار', route: 'studio' }]);
      }
      case 'bio': {
        const draft = bioDraft(c, ctx.goal);
        if (!draft) return out('برای نوشتن پیش‌نویس، اول عنوان شغلی‌ات را بنویس؛ بقیه را از تجربه و مهارت‌هایت برمی‌دارم.', [go('نوشتن عنوان', 'profile', 'title')]);
        return out((text(p.bio) ? 'معرفی فعلی‌ات ' + fa(text(p.bio).length) + ' حرف است. ' : '') + 'این پیش‌نویس فقط از اطلاعات خودت ساخته شده؛ هر جا لازم است ویرایشش کن:\n«' + draft + '»', [{ kind: 'bio', label: text(p.bio) ? 'جایگزین معرفی فعلی' : 'گذاشتن در معرفی', value: draft }, go('ویرایش معرفی', 'profile', 'bio')]);
      }
      case 'title': {
        const t = text(p.title);
        return out(t ? 'عنوانت «' + t + '» است (' + fa(t.length) + ' حرف). ' + (t.length > 60 ? 'طولانی است؛ یک خط کوتاه بهتر دیده می‌شود.' : t.length < 8 ? 'خیلی کلی است؛ حوزه‌ات را دقیق بگو.' : 'طولش خوب است.') + (role && !norm(t).includes(norm(role.label).split(' ')[0]) ? ' از متنت به نظر می‌رسد «' + role.label + '» هستی.' : '') : 'هنوز عنوان نداری. ' + (role ? 'از متنت پیداست «' + role.label + '» هستی؛ می‌خواهی همین را بگذاری؟' : 'یک عنوان کوتاه مثل «طراح رابط کاربری» بنویس.'), role && !t ? [{ kind: 'title', label: 'گذاشتن «' + role.label + '»', value: role.label }] : [go('ویرایش عنوان', 'profile', 'title')]);
      }
      case 'skills': {
        if (!role) return out('نقشت را از متن پیدا نکردم. در کادر «هدف شغلی» بنویس دنبال چه کاری هستی تا مهارت‌های مناسب را پیشنهاد بدهم.', [{ kind: 'tab', label: 'تعیین هدف', tab: 'review' }]);
        const miss = missingSkills(c, role.id);
        return out(miss.length ? 'برای «' + role.label + '» این مهارت‌ها رایج‌اند و در فهرستت نیستند' + (miss.some(m => m.seen) ? ' (آن‌هایی که ستاره دارند در متنت آمده‌اند)' : '') + '. فقط آن‌هایی را بزن که واقعاً بلدی:' : 'مهارت‌هایت برای «' + role.label + '» کامل به نظر می‌رسد. برای هر کدام سطح بگذار تا خواننده بهتر بفهمد.', miss.map(m => ({ kind: 'skill', label: (m.seen ? '★ ' : '') + m.name, value: m.name })));
      }
      case 'experience': case 'impact': {
        const exp = list(c.experience); if (!exp.length) return out('هنوز تجربه‌ای ننوشته‌ای. حتی کارآموزی، پروژهٔ دانشگاهی یا کار آزاد هم تجربه است.', [go('افزودن تجربه', 'experience')]);
        const weakOne = exp.find(e => bulletHelp(e.desc)); if (!weakOne) return out('توضیح تجربه‌هایت با فعل و نتیجه نوشته شده؛ عالی است.');
        return out('در «' + (text(weakOne.role) || text(weakOne.org) || 'یکی از تجربه‌ها') + '»:\n' + bulletHelp(weakOne.desc).map(x => '• ' + x).join('\n'), [go('رفتن به این تجربه', 'experience', 'desc')]);
      }
      case 'projects': return out(list(c.projects).length ? fa(list(c.projects).length) + ' پروژه داری. برای هرکدام بگو مسئله چه بود، تو چه کردی و لینکش کجاست؛ پروژهٔ بدون لینک کمتر باور می‌شود.' : 'یک پروژه، حتی تمرینی یا دانشگاهی، رزومه را باورپذیر می‌کند. عنوان، نقش خودت و لینک کافی است.', [go('پروژه‌ها', 'projects')]);
      case 'photo': return out(p.avatar ? 'عکس داری. عکس روشن با پس‌زمینهٔ ساده و صورت واضح بهترین است.' : 'عکس اختیاری است ولی اعتماد را بیشتر می‌کند؛ یک عکس روشن و ساده کافی است.', [go('عکس پروفایل', 'profile', 'avatar')]);
      case 'template': return out('قالب، رنگ و فونت را در «ظاهر و قالب» عوض می‌کنی؛ محتوا با تغییر قالب حفظ می‌شود. برای ' + (role ? role.label : 'بیشتر شغل‌ها') + ' قالب خوانا با رنگ آرام بهتر جواب می‌دهد.', [{ kind: 'route', label: 'ظاهر و قالب', route: 'themes' }]);
      case 'publish': return out('اول در «آمادگی انتشار» ببین چیزی کم نیست، بعد در «آدرس و انتشار» یک آدرس بگیر و منتشر کن. بعد از انتشار هر تغییر را با یک کلیک به‌روز می‌کنی.', [{ kind: 'route', label: 'آمادگی انتشار', route: 'studio' }, { kind: 'route', label: 'آدرس و انتشار', route: 'publish' }]);
      case 'job': return out('متن آگهی را در تب «بررسی» بگذار؛ می‌گویم کدام مهارت‌های آگهی در رزومه‌ات دیده می‌شود و کدام نه. برای هر آگهی، عنوان و معرفی را کمی به همان شغل نزدیک کن.', [{ kind: 'tab', label: 'مقایسه با آگهی', tab: 'review' }]);
      case 'role': return out(role ? 'از متنت پیداست «' + role.label + '» هستی' + (role.confidence === 'high' ? '.' : '؛ ولی مطمئن نیستم. اگر هدفت چیز دیگری است، در «هدف شغلی» بنویس.') + (role.alternatives.length ? ' نزدیک‌ترین گزینه‌های بعدی: ' + role.alternatives.map(r => ROLES[r].label).join('، ') + '.' : '') : 'نقشت را از متن تشخیص ندادم؛ عنوان و چند مهارت بنویس.', [], ['چه مهارت‌هایی اضافه کنم؟', 'یک معرفی برایم پیشنهاد بده']);
      case 'length': return out('رزومهٔ آنلاین محدودیت صفحه ندارد ولی خواننده معمولاً فقط چند ثانیه نگاه می‌کند: معرفی ۲ تا ۳ جمله، هر تجربه ۲ تا ۴ خط، و مهم‌ترین‌ها بالا.');
      case 'privacy': return out('شمارهٔ موبایل و ایمیل را فقط اگر می‌خواهی عمومی کن؛ در تنظیمات حساب، بخش حریم خصوصی، نمایش هر راه تماس جدا روشن یا خاموش می‌شود. نشانی دقیق خانه لازم نیست؛ شهر کافی است.', [{ kind: 'route', label: 'حریم خصوصی', route: 'settings', tab: 'privacy' }]);
      case 'language': return out(list(c.languages).length ? 'برای هر زبان سطح واقعی‌ات را بگذار؛ اگر مدرک داری (مثل IELTS) نمره‌اش را بنویس.' : 'اگر زبان دیگری بلدی، با سطح واقعی‌اش اضافه کن؛ برای خیلی از کارفرماها مهم است.', [go('زبان‌ها', 'languages')]);
      default: {
        const guess = INTENTS.find(([iid]) => iid !== 'greet' && iid !== 'thanks' && words(question).some(w => INTENTS.find(x => x[0] === iid)[1].some(k => w.length >= 3 && norm(k).includes(w))));
        return out('مطمئن نیستم منظورت را درست فهمیده باشم' + (guess ? '؛ دربارهٔ «' + guess[1][0] + '» می‌پرسی؟' : '.') + ' می‌توانی یکی از این‌ها را بپرسی:', [], ['امتیاز رزومه‌ام چند است؟', 'قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده', 'چه مهارت‌هایی اضافه کنم؟']);
      }
    }
  }
  function opening(c, ctx = {}) {
    const sc = score(c, ctx), p = c.profile || {}, weak = sc.dims.slice().sort((a, b) => a.value - b.value)[0];
    return { intent: 'opening', text: (text(p.name) ? 'سلام ' + text(p.name).split(' ')[0] + '! ' : 'سلام! ') + 'رزومه‌ات ' + fa(sc.total) + ' از ۱۰۰ است (' + sc.label + ')' + (sc.role ? ' و به نظرم «' + sc.role.label + '» هستی' : '') + '. ' + (weak.value < 70 && weak.reasons[0] ? 'بیشترین اثر را «' + weak.label + '» دارد: ' + weak.reasons[0] + '.' : 'وضعیتش خوب است؛ بپرس تا دقیق‌تر کمک کنم.'), actions: [], follow: ['قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده', 'چه مهارت‌هایی اضافه کنم؟'] };
  }

  const api = { version: '1.0.0', ROLES, normalize: norm, detectRole, missingSkills, years, score, bioDraft, bulletHelp, intent, reply, opening };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ResumeBrain = api;
})(typeof self !== 'undefined' ? self : this);
