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
  // Same as distance, but swapping two neighbouring letters («مهرات» ← «مهارت») is one slip, not two.
  function slips(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      let best = Infinity;
      for (let j = 1; j <= b.length; j++) {
        let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
        d[i][j] = v; best = Math.min(best, v);
      }
      if (best > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  const near = (w, k) => w === k || (k.length >= 4 && w.length >= 3 && (w.startsWith(k) || k.startsWith(w) && w.length >= k.length - 1 || slips(w, k, k.length >= 6 ? 2 : 1) <= (k.length >= 6 ? 2 : 1)));

  /* ---------- Spelling: resume vocabulary and the usual one-letter slips ---------- */
  // A word is flagged only when it is not a known word (or a known word plus a common suffix) and is exactly one
  // letter away from a known word of five letters or more, so names and rare words are left alone.
  const VOCAB = new Set(('دانشجو دانشجوی دانشجویی دانشجویان دانش آموز دانش‌آموز فارغ التحصیل کارشناسی کارشناس ارشد دکتری دکترا کاردانی دیپلم مهندسی مهندس کامپیوتر نرم افزار سخت افزار برنامه نویس برنامه‌نویس برنامه نویسی توسعه دهنده توسعه‌دهنده طراح طراحی گرافیک گرافیست رابط کاربری کاربر تجربه تحقیق تحلیل تحلیلگر داده مدیر مدیریت پروژه محصول بازاریابی فروش پشتیبانی مشتری مشتریان حسابداری حسابدار مالی منابع انسانی مدرس معلم تدریس آموزش دانشگاه دانشکده مدرسه دبیرستان هنرستان رشته گرایش علاقه علاقه‌مند علاقمند مسلط آشنا تسلط مهارت تخصص متخصص سابقه همکاری گروهی مستقل خلاق خلاقیت دقیق منظم مسئولیت مسئولیت‌پذیر یادگیری سریع ارتباط ارتباطات مذاکره رهبری برنامه‌ریزی سازماندهی مسئله تفکر وبسایت اپلیکیشن موبایل اندروید فرانت بک‌اند فرانت‌اند فول‌استک پایتون جاوااسکریپت فریلنسر فریلنس استارتاپ شرکت سازمان کارآموز کارآموزی کارمند همکار مشاور مشاوره پژوهش پژوهشگر مقاله کنفرانس گواهینامه مدرک دوره زبان انگلیسی آلمانی فرانسوی عربی ترکی فارسی مادری متوسط پیشرفته مقدماتی عکاسی عکاس ویدیو تدوین محتوا تولید نویسنده نویسندگی ترجمه مترجم ویراستار ویراستاری شبکه امنیت هوش مصنوعی ماشین بهبود افزایش کاهش توسعه پیاده سازی پیاده‌سازی راه اندازی راه‌اندازی ساختم کردم انجام تجارب دستاورد نتیجه کیفیت سرعت عملکرد بهینه سازی بهینه‌سازی تست آزمون مستندسازی اسکرام چابک تیم تیمی رهبر سرپرست سرپرستی کارشناسی‌ارشد مهندسی‌کامپیوتر نرم‌افزار سخت‌افزار برنامه‌نویسی توسعه‌دهندهٔ علاقه‌مندم هستم').split(' '));
  const SLIPS = { 'دانشجوری': 'دانشجوی', 'دانشجوئی': 'دانشجویی', 'مهندسى': 'مهندسی', 'مسئولیت پزیر': 'مسئولیت‌پذیر', 'برنامه نویسى': 'برنامه‌نویسی', 'علاقمند': 'علاقه‌مند' };
  // Persian letters only: punctuation such as «،» and «؟» sits in the same Unicode block and must not join a word.
  const LETTERS = /^[ء-غف-يپچژکگیۀ]+$/;
  const SUFFIX = /(?:های|ها|هایی|ان|ات|یی|ی|م|ت|ش|مان|تان|شان|ای|ام|اید|ند)$/;
  const known = w => VOCAB.has(w) || [...VOCAB].some(v => w.startsWith(v) && SUFFIX.test(w.slice(v.length)) && w.length - v.length <= 3);
  function suggest(word) {
    const w = norm(word); if (SLIPS[w]) return SLIPS[w];
    if (w.length < 5 || !LETTERS.test(w) || known(w)) return null;
    let best = null; for (const v of VOCAB) if (v.length >= 5 && !v.includes(' ') && distance(w, v, 1) === 1) { if (best) return null; best = v; }
    return best;
  }
  // Possible typos in the parts of the resume people read first: title, bio, roles and descriptions.
  function spelling(c) {
    const p = c.profile || {}, out = [], seen = new Set();
    const scan = (value, where) => { for (const raw of String(value || '').split(/[\s،,.؛:!؟?()«»"]+/)) { const right = suggest(raw); if (right && !seen.has(raw)) { seen.add(raw); out.push({ where, wrong: raw, right }); } } };
    scan(p.title, 'عنوان'); scan(p.bio, 'معرفی');
    for (const e of list(c.experience)) { scan(e.role, 'تجربه'); scan(e.desc, 'تجربه'); }
    for (const e of list(c.education)) scan(e.degree, 'تحصیلات');
    for (const x of list(c.projects)) scan(x.desc, 'پروژه‌ها');
    return out.slice(0, 8);
  }
  const fixText = value => String(value || '').replace(/[ء-غف-يپچژکگیۀ‌]+/g, w => suggest(w) || w);

  /* ---------- Roles ---------- */
  const ROLES = {
    fullstack: { label: 'توسعه‌دهندهٔ فول‌استک', keys: ['فول استک', 'فول‌استک', 'فولاستک', 'fullstack', 'full stack', 'full-stack', 'mern', 'mean'], skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'طراحی API', 'Docker', 'Git', 'تست‌نویسی'] },
    developer: { label: 'توسعه‌دهندهٔ نرم‌افزار', keys: ['دولوپر', 'دیولوپر', 'دِوِلوپر', 'developer', 'programmer', 'برنامه نویس', 'برنامه‌نویس', 'کدنویس', 'توسعه دهنده', 'مهندس نرم افزار', 'software engineer', 'نرم افزار', 'کامپیوتر'], skills: ['Git', 'الگوریتم و ساختار داده', 'SQL', 'تست‌نویسی', 'طراحی API', 'لینوکس', 'Docker'] },
    frontend: { label: 'توسعه‌دهندهٔ فرانت‌اند', keys: ['فرانت', 'frontend', 'front-end', 'react', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html', 'next.js', 'رابط وب'], skills: ['JavaScript', 'TypeScript', 'React', 'HTML و CSS', 'Git', 'Tailwind CSS', 'تست‌نویسی', 'دسترس‌پذیری وب', 'بهینه‌سازی سرعت'] },
    backend: { label: 'توسعه‌دهندهٔ بک‌اند', keys: ['بک', 'backend', 'back-end', 'node', 'django', 'laravel', 'php', 'golang', 'java', 'sql', 'api', 'سرور', 'دیتابیس'], skills: ['Node.js', 'SQL', 'طراحی API', 'Docker', 'Git', 'Redis', 'تست‌نویسی', 'لینوکس', 'امنیت وب'] },
    mobile: { label: 'توسعه‌دهندهٔ موبایل', keys: ['موبایل', 'اندروید', 'android', 'ios', 'flutter', 'فلاتر', 'kotlin', 'swift', 'react native'], skills: ['Flutter', 'Kotlin', 'Swift', 'Git', 'طراحی API', 'انتشار در مارکت‌ها', 'Firebase'] },
    design: { label: 'طراح رابط و تجربهٔ کاربری', keys: ['طراح', 'دیزاینر', 'designer', 'گرافیست', 'ui', 'ux', 'figma', 'فیگما', 'رابط کاربری', 'تجربه کاربری', 'گرافیک', 'illustrator', 'photoshop'], skills: ['Figma', 'طراحی رابط کاربری', 'تحقیق کاربر', 'پروتوتایپ', 'سیستم طراحی', 'Photoshop', 'Illustrator', 'تست کاربردپذیری'] },
    data: { label: 'تحلیل‌گر داده', keys: ['داده', 'دیتا', 'data', 'آنالیست', 'analyst', 'تحلیل', 'python', 'پایتون', 'power bi', 'tableau', 'excel', 'اکسل', 'آمار', 'sql', 'machine learning', 'یادگیری ماشین'], skills: ['Python', 'SQL', 'Excel', 'Power BI', 'آمار', 'Pandas', 'مصورسازی داده', 'یادگیری ماشین'] },
    marketing: { label: 'کارشناس بازاریابی دیجیتال', keys: ['بازاریابی', 'مارکتینگ', 'مارکتر', 'marketer', 'marketing', 'سئو', 'seo', 'تبلیغات', 'کمپین', 'شبکه های اجتماعی', 'سوشال', 'برند'], skills: ['سئو', 'بازاریابی محتوا', 'Google Analytics', 'مدیریت کمپین', 'شبکه‌های اجتماعی', 'ایمیل مارکتینگ', 'کپی‌رایتینگ'] },
    content: { label: 'تولیدکنندهٔ محتوا', keys: ['محتوا', 'نویسنده', 'نویسندگی', 'کپی رایت', 'کپی رایتر', 'بلاگر', 'یوتیوبر', 'تدوینگر', 'ادیتور', 'ویراستار', 'ترجمه', 'مترجم', 'content', 'ادمین'], skills: ['کپی‌رایتینگ', 'ویراستاری', 'سئو', 'تولید محتوای ویدیویی', 'ترجمه', 'مدیریت شبکه‌های اجتماعی'] },
    sales: { label: 'کارشناس فروش', keys: ['فروش', 'sales', 'بازرگانی', 'crm', 'مذاکره', 'مشتری', 'ویزیتور'], skills: ['مذاکره', 'CRM', 'فروش تلفنی', 'مدیریت مشتری', 'پیگیری سرنخ', 'ارائه محصول'] },
    hr: { label: 'کارشناس منابع انسانی', keys: ['منابع انسانی', 'hr', 'کارگزینی', 'جذب و استخدام', 'استخدام و جذب', 'human resources', 'ریکروتر', 'recruiter', 'کارمندیابی'], skills: ['جذب و استخدام', 'مصاحبهٔ شغلی', 'قانون کار', 'حقوق و دستمزد', 'ارزیابی عملکرد', 'آموزش کارکنان', 'Excel', 'ارتباط مؤثر'] },
    support: { label: 'کارشناس پشتیبانی مشتری', keys: ['پشتیبانی', 'support', 'پاسخگویی', 'خدمات مشتری', 'تیکت', 'call center'], skills: ['ارتباط با مشتری', 'حل مسئله', 'تیکتینگ', 'CRM', 'صبر و همدلی', 'مستندسازی'] },
    accounting: { label: 'حسابدار', keys: ['حسابدار', 'حسابداری', 'accounting', 'مالی', 'مالیات', 'سپیدار', 'همکاران سیستم', 'حسابرسی', 'بیمه'], skills: ['حسابداری مالی', 'Excel', 'نرم‌افزار سپیدار', 'قوانین مالیاتی', 'تهیهٔ صورت‌های مالی', 'بیمه و حقوق'] },
    teaching: { label: 'مدرس', keys: ['مدرس', 'معلم', 'تدریس', 'آموزش', 'teacher', 'teaching', 'کلاس'], skills: ['طراحی درس', 'ارزشیابی', 'مدیریت کلاس', 'آموزش آنلاین', 'روان‌شناسی یادگیری'] },
    management: { label: 'مدیر پروژه', keys: ['مدیر', 'مدیریت', 'manager', 'پروداکت', 'پروجکت منیجر', 'مدیر محصول', 'project', 'پروژه', 'اسکرام', 'scrum', 'agile', 'جیرا', 'jira', 'محصول', 'product'], skills: ['مدیریت پروژه', 'اسکرام', 'Jira', 'برنامه‌ریزی', 'مدیریت ریسک', 'رهبری تیم', 'ارتباط با ذی‌نفعان'] },
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

  const SOFT = ['حل مسئله', 'کار تیمی', 'ارتباط مؤثر', 'مدیریت زمان', 'تفکر تحلیلی', 'یادگیری مستمر', 'مسئولیت‌پذیری', 'زبان انگلیسی'];
  function moreSkills(c, role) {
    const have = list(c.skills).map(s => norm(s.name)), owned = s => have.some(h => h.includes(norm(s)) || norm(s).includes(h)), out = [];
    for (const name of [...list(role && role.alternatives).flatMap(id => (ROLES[id] && ROLES[id].skills) || []), ...SOFT]) if (!owned(name) && !out.some(x => norm(x.name) === norm(name))) out.push({ name, seen: false });
    return out;
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
    const typos = spelling(c); if (typos.length) { b -= Math.min(30, typos.length * 12); br.unshift('غلط املایی احتمالی: «' + typos[0].wrong + '» ← «' + typos[0].right + '»' + (typos.length > 1 ? ' و ' + fa(typos.length - 1) + ' مورد دیگر' : '')); }
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
    const title = fixText(text(p.title)) || role?.label; if (!title) return null;
    const top = list(c.skills).slice().sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0)).map(s => text(s.name)).filter(Boolean).slice(0, 3);
    const parts = [];
    const joined = top.join('، ').replace(/، ([^،]+)$/, ' و $1');
    parts.push(title + (y >= 1 ? ' با ' + fa(y) + ' سال تجربه' + (top.length ? ' در ' + joined : '') : top.length ? '، علاقه‌مند به ' + joined : '') + '.');
    if (latest && text(latest.org)) parts.push((latest.current ? 'الان در ' : 'آخرین بار در ') + text(latest.org) + (text(latest.role) ? ' به‌عنوان ' + text(latest.role) : '') + (latest.current ? ' کار می‌کنم.' : ' کار کردم.'));
    const proj = list(c.projects).find(x => text(x.title || x.name)); if (proj) parts.push('از کارهایم می‌توانم به «' + text(proj.title || proj.name) + '» اشاره کنم.');
    if (goal) parts.push('دنبال فرصتی به‌عنوان ' + text(goal) + ' هستم.');
    return fixText(parts.join(' '));
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
    ['spelling', ['غلط', 'املا', 'املایی', 'تایپی', 'اشتباه', 'نگارش', 'typo']],
    ['tips', ['نکات رزومه', 'نکته رزومه', 'رزومه خوب', 'رزومه حرفه ای', 'رزومه عالی', 'چطور رزومه', 'رزومه بنویسم', 'رزومه نویسی', 'اصول رزومه', 'رزومه قوی', 'resume tips', 'نکته', 'نکات', 'توصیه']],
    ['interview', ['مصاحبه', 'interview', 'مصاحبه کاری', 'مصاحبه شغلی']],
    ['noexp', ['سابقه ندارم', 'تجربه ندارم', 'سابقه کار ندارم', 'تجربه کاری ندارم', 'بدون سابقه', 'بدون تجربه', 'بی تجربه', 'تازه کار', 'تازه فارغ التحصیل', 'کارآموزی', 'اولین کار']],
    ['gap', ['وقفه', 'فاصله کاری', 'بیکار بودم', 'سربازی', 'خدمت سربازی', 'گپ', 'gap']],
    ['change', ['تغییر شغل', 'تغییر مسیر', 'تغییر رشته', 'شغلم رو عوض', 'شغلم را عوض', 'مسیر شغلی', 'career change']],
    ['cover', ['کاور لتر', 'کاورلتر', 'نامه همراه', 'cover letter', 'انگیزه نامه', 'نامه درخواست']],
    ['linkedin', ['لینکدین', 'linkedin', 'لینکداین']],
    ['education', ['تحصیلات', 'مدرک', 'دانشگاه', 'معدل', 'رشته تحصیلی', 'education']],
    ['salary', ['حقوق', 'دستمزد', 'حقوق درخواستی', 'salary']],
  ];
  // Statements about oneself: «من فول‌استک دولوپر هستم»، «می‌خوام طراح رابط کاربری بشم».
  function understand(question) {
    const q = norm(question).replace(/[.!؟?،,]+$/g, '').trim();
    let m = /(?:^|\s)(?:من|بنده)\s+(?:یک |یه )?(.{2,60}?)\s*(?:هستم|هستش|هست|ام|میباشم|می باشم)$/.exec(q);
    if (m && !/^(خوب|خسته|اینجا|آماده|مطمئن)/.test(m[1])) return { kind: 'identity', phrase: m[1].trim() };
    m = /(?:می ?خوام|می ?خواهم|دوست دارم|هدفم|دنبال|قصد دارم)\s+(?:اینه که |این است که |اینکه )?(?:به عنوان |بعنوان )?(?:یک |یه )?(?:کار |شغل )?(.{2,60}?)\s*(?:بشم|بشوم|شوم|بشه|باشم|کار کنم|استخدام بشم|هستم|است)?$/.exec(q);
    if (m && !/^(بدونم|ببینم|بپرسم|امتیاز|معرفی|مهارت|رزومه|قالب|منتشر|بنویس)/.test(m[1])) return { kind: 'goal', phrase: m[1].trim() };
    return null;
  }
  function intent(question) {
    const q = norm(question), ws = words(question); let best = null;
    for (const [id, keys] of INTENTS) {
      let s = 0;
      for (const k of keys) { const nk = norm(k); if (nk.includes(' ')) { if (q.includes(nk)) s += 3; } else if (ws.some(w => near(w, nk))) s += nk.length >= 4 ? 2 : 1; }
      if (s && (!best || s > best.s || (s === best.s && (best.id === 'greet' || best.id === 'thanks')))) best = { id, s };
      if (s && best && (best.id === 'greet' || best.id === 'thanks') && id !== 'greet' && id !== 'thanks') best = { id, s };
    }
    return best?.id || null;
  }
  const go = (label, section, field) => ({ kind: 'go', label, section, field });
  // «بیشتر»، «دیگه»، «بقیه» continue the last topic: «مهارت‌های دیگه» pages on, «دیگه چی؟» stays on the subject.
  const MORE = /(?:^| )(?:دیگه|دیگر|دیگری|دیگه ای|بیشتر|بازم|باز هم|بقیه|یکی دیگه|جدید|جدیدتر)(?: |$)/;
  const lastOf = (ctx, role) => text((list(ctx && ctx.history).filter(h => h && h.role === role).pop() || {}).text);
  function topicOf(question, ctx) {
    const id = intent(question); if (id) return id;
    if (MORE.test(norm(question))) { const prev = list(ctx.history).filter(h => h && h.role === 'user').map(h => intent(h.text)).filter(x => x && x !== 'greet' && x !== 'thanks').pop(); if (prev) return prev; }
    return null;
  }
  function reply(question, c, ctx = {}) {
    const said = talk(question), lastBot = lastOf(ctx, 'assistant');
    // «آره»، «بریم»، «شروع کنیم» right after an offer to start: go straight to the next step.
    if (!said.rest.length && (said.topics.includes('go') || said.topics.includes('yes') && /قدم|شروع|برداریم|ادامه بدیم|ببینیم|بنویسیم/.test(lastBot.slice(-140)))) return answer('قدم بعدی چیه', c, ctx);
    if (said.topics.includes('model')) return chat(question, c, Object.assign({}, ctx, { force: true }));
    const small = chat(question, c, ctx); if (small) return small;
    const r = answer(question, c, ctx);
    if (said.topics.includes('greet') && r.intent !== 'statement') { const first = text((c.profile || {}).name).split(' ')[0]; r.text = 'سلام' + (first ? ' ' + first : '') + '! ' + r.text; }
    return r;
  }
  function answer(question, c, ctx = {}) {
    const said = understand(question), id = said ? 'statement' : topicOf(question, ctx), sc = score(c, ctx), role = sc.role, p = c.profile || {}, weak = sc.dims.slice().sort((a, b) => a.value - b.value), typos = spelling(c);
    const follow = ['امتیاز رزومه‌ام چند است؟', 'قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده', 'چه مهارت‌هایی اضافه کنم؟'];
    const out = (textValue, actions = [], next = follow) => ({ intent: id || 'unknown', text: textValue, actions, follow: next.filter(f => norm(f) !== norm(question)).slice(0, 3) });
    const fixes = () => typos.slice(0, 4).map(t => ({ kind: 'fix', label: '«' + t.wrong + '» ← «' + t.right + '»', wrong: t.wrong, value: t.right }));
    switch (id) {
      case 'statement': {
        const r = detectRole({ profile: { title: said.phrase } }, said.phrase), name = r ? r.label : fixText(said.phrase), title = text(p.title);
        const sameTitle = r && norm(fixText(title)).includes(norm(r.label).split(' ').slice(-1)[0]);
        const miss = r ? missingSkills(c, r.id).slice(0, 4) : [];
        const lines = [(said.kind === 'identity' ? 'پس «' + name + '» هستی' : 'هدفت «' + name + '» است') + (r ? '.' : '؛ این حوزه را در فهرستم ندارم ولی پیشنهادهایم را با آن هماهنگ می‌کنم.')];
        if (title && !sameTitle) lines.push('عنوانت الان «' + title + '» است' + (typos.some(t => title.includes(t.wrong)) ? ' و غلط املایی دارد' : '') + '؛ اگر می‌خواهی با همین شغل دیده شوی، عنوان را به آن نزدیک کن.');
        else if (!title) lines.push('هنوز عنوان نداری؛ می‌توانم «' + name + '» را بگذارم.');
        if (miss.length) lines.push('برای این نقش، این مهارت‌ها در فهرستت نیستند؛ فقط آن‌هایی را بزن که بلدی:');
        return out(lines.join(' '), [{ kind: 'goal', label: 'هدف: ' + name, value: name }, ...(!sameTitle ? [{ kind: 'title', label: 'عنوان را «' + name + '» کن', value: name }] : []), ...miss.map(m => ({ kind: 'skill', label: (m.seen ? '★ ' : '') + m.name, value: m.name }))], ['یک معرفی برایم پیشنهاد بده', 'قدم بعدی چیه؟', 'امتیاز رزومه‌ام چند است؟']);
      }
      case 'spelling': return out(typos.length ? 'این‌ها احتمالاً غلط تایپی‌اند؛ روی هر کدام بزنی همه‌جای رزومه درست می‌شود:\n' + typos.slice(0, 4).map(t => '• ' + t.where + ': «' + t.wrong + '» ← «' + t.right + '»').join('\n') : 'در عنوان، معرفی و توضیح‌هایت غلط املایی واضحی ندیدم.', fixes());
      case 'greet': return out('سلام' + (text(p.name) ? ' ' + text(p.name).split(' ')[0] : '') + '! رزومه‌ات را خوانده‌ام. الان ' + fa(sc.total) + ' از ۱۰۰ است (' + sc.label + '). می‌خواهی از کجا شروع کنیم؟');
      case 'thanks': return out('خواهش می‌کنم! هر وقت متن را عوض کنی، دوباره بررسی می‌کنم.');
      case 'help': return out('رزومه‌ات را می‌خوانم و: ۱) امتیازش را در پنج بعد می‌گویم، ۲) قدم بعدی را پیشنهاد می‌دهم، ۳) از اطلاعات خودت پیش‌نویس معرفی می‌سازم، ۴) مهارت‌های مناسب نقشت را پیشنهاد می‌دهم، ۵) توضیح تجربه‌ها را قوی‌تر می‌کنم. چیزی از خودم اضافه نمی‌کنم؛ هر تغییر با تأیید تو اعمال می‌شود.');
      case 'score': return out('امتیاز رزومه‌ات ' + fa(sc.total) + ' از ۱۰۰ است (' + sc.label + '). ' + sc.dims.map(d => d.label + ' ' + fa(d.value)).join('، ') + '. ضعیف‌ترین بخش «' + weak[0].label + '» است' + (weak[0].reasons[0] ? ': ' + weak[0].reasons[0] + '.' : '.'), [{ kind: 'tab', label: 'جزئیات امتیاز', tab: 'score' }], ['چطور «' + weak[0].label + '» را بهتر کنم؟', 'قدم بعدی چیه؟']);
      case 'next': {
        const r = weak.flatMap(d => d.reasons.map(x => ({ d, x }))).slice(0, 3);
        return out(r.length ? 'سه کار که بیشترین اثر را دارند:\n' + r.map((v, i) => fa(i + 1) + '. ' + v.x + ' (' + v.d.label + ')').join('\n') : 'رزومه‌ات کامل است! حالا آمادگی انتشار را بررسی کن و صفحه را منتشر کن.', r.length ? fixes() : [{ kind: 'route', label: 'آمادگی انتشار', route: 'studio' }]);
      }
      case 'bio': {
        const draft = bioDraft(c, ctx.goal);
        if (!draft) return out('برای نوشتن پیش‌نویس، اول عنوان شغلی‌ات را بنویس؛ بقیه را از تجربه و مهارت‌هایت برمی‌دارم.', [go('نوشتن عنوان', 'profile', 'title')]);
        const slip = typos.find(t => t.where === 'عنوان' || t.where === 'معرفی');
        return out((slip ? 'اول اینکه «' + slip.wrong + '» احتمالاً «' + slip.right + '» است؛ در پیش‌نویس درستش کردم. ' : '') + (text(p.bio) ? 'معرفی فعلی‌ات ' + fa(text(p.bio).length) + ' حرف است. ' : '') + 'این پیش‌نویس فقط از اطلاعات خودت ساخته شده؛ هر جا لازم است ویرایشش کن:\n«' + draft + '»', [{ kind: 'bio', label: text(p.bio) ? 'جایگزین معرفی فعلی' : 'گذاشتن در معرفی', value: draft }, ...(slip ? fixes().slice(0, 2) : []), go('ویرایش معرفی', 'profile', 'bio')]);
      }
      case 'title': {
        const t = text(p.title);
        return out(t ? 'عنوانت «' + t + '» است (' + fa(t.length) + ' حرف). ' + (t.length > 60 ? 'طولانی است؛ یک خط کوتاه بهتر دیده می‌شود.' : t.length < 8 ? 'خیلی کلی است؛ حوزه‌ات را دقیق بگو.' : 'طولش خوب است.') + (role && !norm(t).includes(norm(role.label).split(' ')[0]) ? ' از متنت به نظر می‌رسد «' + role.label + '» هستی.' : '') : 'هنوز عنوان نداری. ' + (role ? 'از متنت پیداست «' + role.label + '» هستی؛ می‌خواهی همین را بگذاری؟' : 'یک عنوان کوتاه مثل «طراح رابط کاربری» بنویس.'), role && !t ? [{ kind: 'title', label: 'گذاشتن «' + role.label + '»', value: role.label }] : [go('ویرایش عنوان', 'profile', 'title')]);
      }
      case 'skills': {
        const named = detectRole({ profile: { title: question } }, question), target = named && (!role || named.id !== role.id) ? named : role;
        if (!target) return out('نقشت را از متن پیدا نکردم. بگو چه کاری می‌کنی؛ مثلاً «من طراح رابط کاربری هستم» یا «می‌خوام برنامه‌نویس بک‌اند بشم».', [], ['من برنامه‌نویس فرانت‌اند هستم', 'من طراح رابط کاربری هستم', 'من حسابدار هستم']);
        const first = missingSkills(c, target.id), all = [...first, ...moreSkills(c, target).filter(x => !first.some(f => norm(f.name) === norm(x.name)))], page = MORE.test(norm(question)) ? list(ctx.history).filter(h => h && h.role === 'user' && intent(h.text) === 'skills').length : 0, miss = all.slice(page * 6, page * 6 + 6);
        if (!miss.length && all.length) return out('همهٔ مهارت‌های رایج «' + target.label + '» را که در فهرستت نبود پیشنهاد داده‌ام. اگر ابزار یا مهارت دیگری بلدی، خودت در بخش مهارت‌ها اضافه کن و برای هر کدام سطح بگذار.', [go('افزودن مهارت', 'skills')], ['قدم بعدی چیه؟', 'امتیاز رزومه‌ام چند است؟']);
        return out(miss.length ? (page ? 'چند پیشنهاد دیگر برای «' + target.label + '»، از نقش‌های نزدیک و مهارت‌هایی که بیشتر کارفرماها می‌خواهند' : 'برای «' + target.label + '» این مهارت‌ها رایج‌اند و در فهرستت نیستند') + (miss.some(m => m.seen) ? ' (آن‌هایی که ستاره دارند در متنت آمده‌اند)' : '') + '. فقط آن‌هایی را بزن که واقعاً بلدی:' : 'مهارت‌هایت برای «' + target.label + '» کامل به نظر می‌رسد. برای هر کدام سطح بگذار تا خواننده بهتر بفهمد.', miss.map(m => ({ kind: 'skill', label: (m.seen ? '★ ' : '') + m.name, value: m.name })));
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
      case 'tips': return out('چند اصل که هر رزومه‌ای را بهتر می‌کند:\n' + ['عنوان یک‌خطی و دقیق: دقیقاً بگو چه کاره‌ای.', 'معرفی ۲ تا ۳ جمله: تخصص، تجربه و چیزی که دنبالش هستی.', 'هر تجربه با فعل و نتیجه: «… را ساختم و … بهتر شد».', 'فقط مهارت‌هایی که واقعاً بلدی، با سطح واقعی.', 'یک پروژه یا نمونه‌کار با لینک، باورپذیری را چند برابر می‌کند.'].map((x, i) => fa(i + 1) + '. ' + x).join('\n') + '\nدر رزومهٔ خودت، بیشترین اثر را «' + weak[0].label + '» دارد' + (weak[0].reasons[0] ? ': ' + weak[0].reasons[0] + '.' : '.'), [{ kind: 'tab', label: 'جزئیات امتیاز', tab: 'score' }], ['قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده']);
      case 'interview': return out('برای مصاحبه: ۱) دربارهٔ هر تجربه‌ای که در رزومه نوشتی یک داستان کوتاه آماده کن (مسئله، کاری که کردی، نتیجه). ۲) دربارهٔ شرکت و آگهی بخوان و بگو چرا همین‌جا. ۳) یک یا دو سؤال برای کارفرما آماده کن. ۴) هر چه در رزومه آمده باید بتوانی توضیح بدهی؛ چیزی ننویس که نتوانی از آن دفاع کنی.' + (role ? ' برای «' + role.label + '» معمولاً دربارهٔ ' + (ROLES[role.id].skills || []).slice(0, 3).join('، ') + ' هم می‌پرسند.' : ''), [], ['قدم بعدی چیه؟', 'امتیاز رزومه‌ام چند است؟']);
      case 'noexp': return out('سابقهٔ رسمی نداشتن یعنی باید چیزهای دیگر را نشان بدهی: پروژه‌های دانشگاهی یا شخصی، کارآموزی، کار داوطلبانه، دوره‌ها و مدرک‌ها، و مهارت‌هایی که واقعاً بلدی. معرفی را روی «چه بلدم و دنبال چه هستم» بنویس و بخش پروژه‌ها را پررنگ کن.', [go('افزودن پروژه', 'projects'), go('نوشتن معرفی', 'profile', 'bio')], ['یک معرفی برایم پیشنهاد بده', 'چه مهارت‌هایی اضافه کنم؟']);
      case 'gap': return out('فاصلهٔ کاری (مثل سربازی، تحصیل یا مراقبت از خانواده) عیب نیست؛ پنهانش نکن. یک خط کوتاه و صادقانه کافی است و اگر در آن مدت دوره دیدی یا پروژه‌ای ساختی، همان را بنویس.', [go('تجربه‌ها', 'experience')]);
      case 'change': return out('برای تغییر مسیر: عنوان و معرفی را به شغل جدید نزدیک کن، مهارت‌های قابل‌انتقال را بالا بیاور (مثل ارتباط، مدیریت پروژه، تحلیل) و یکی دو پروژه در حوزهٔ جدید بساز. بگو هدفت چیست تا مهارت‌های همان نقش را پیشنهاد بدهم؛ مثلاً «می‌خوام تحلیلگر داده بشم».', [], ['من برنامه‌نویس فرانت‌اند هستم', 'چه مهارت‌هایی اضافه کنم؟']);
      case 'cover': return out('نامهٔ همراه را برای هر آگهی جدا بنویس: یک جمله که چرا همین شغل، دو سه جمله از مرتبط‌ترین تجربه یا پروژه‌ات با نتیجه‌اش، و یک جملهٔ پایانی برای گفت‌وگو. کوتاه بماند؛ کمتر از ۱۵۰ کلمه.', [{ kind: 'tab', label: 'مقایسه با آگهی', tab: 'review' }]);
      case 'linkedin': return out('عنوان و معرفی لینکدین را با رزومه‌ات هماهنگ کن و لینک پروفایلت را در راه‌های ارتباطی بگذار؛ کارفرما معمولاً هر دو را می‌بیند.', [go('راه‌های ارتباطی', 'contacts')]);
      case 'education': return out(list(c.education).length ? 'برای تحصیلات، رشته، دانشگاه و سال‌ها کافی است؛ معدل را فقط اگر خوب است بنویس. پروژهٔ پایانی یا درس‌های مرتبط با شغل هدف را هم می‌توانی در توضیح بیاوری.' : 'هنوز تحصیلاتی ننوشته‌ای. رشته، دانشگاه و سال‌ها را اضافه کن؛ اگر دانشجویی، «در حال تحصیل» بزن.', [go('تحصیلات', 'education')]);
      case 'salary': return out('حقوق درخواستی را در رزومه ننویس؛ آن را برای فرم درخواست یا مصاحبه نگه دار. قبلش آگهی‌های مشابه را ببین تا بازهٔ واقعی بازار دستت بیاید.');
      default: {
        const guess = INTENTS.find(([iid]) => iid !== 'greet' && iid !== 'thanks' && words(question).some(w => INTENTS.find(x => x[0] === iid)[1].some(k => w.length >= 4 && norm(k).includes(w))));
        const r = detectRole({ profile: { title: question } }, question);
        if (r) return answer('من ' + r.label + ' هستم', c, ctx);
        const tip = weak.flatMap(d => d.reasons).find(Boolean);
        return out('این یکی را دقیق نفهمیدم 🙈' + (guess ? ' دربارهٔ «' + guess[1][0] + '» می‌پرسی؟' : ' اگر دربارهٔ رزومه است، ساده‌تر بپرس؛ مثلاً با کلمه‌هایی مثل «مهارت»، «معرفی» یا «تجربه».') + (tip ? ' تا آن موقع، مهم‌ترین کار رزومه‌ات این است: «' + tip + '».' : '') + ' یا یکی از این‌ها را بزن:', [], ['امتیاز رزومه‌ام چند است؟', 'قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده', 'نکات یک رزومهٔ خوب']);
      }
    }
  }
  /* ---------- Small talk: greetings, how-are-you, date and time, and a little personality ----------
     Answered before resume intents, and only when the whole message is small talk, so «سلام، امتیازم چنده؟» still
     reaches the score. Dates and times are Tehran's: Persian calendar first, Gregorian and lunar on request. */
  const TZ = 'Asia/Tehran';
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function clock(at) {
    const d = at ? new Date(at) : new Date();
    const parts = (locale, o) => { try { return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: TZ }, o)).formatToParts(d); } catch { return []; } };
    const get = (p, type) => (p.find(x => x.type === type) || {}).value || '';
    const day = { day: 'numeric', month: 'long', year: 'numeric' };
    const pd = parts('fa-IR-u-ca-persian-nu-arabext', Object.assign({ weekday: 'long' }, day)), gd = parts('fa-IR-u-ca-gregory-nu-arabext', day), hd = parts('fa-IR-u-ca-islamic-umalqura-nu-arabext', day);
    const tm = parts('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }), hour = Number(get(tm, 'hour')) % 24;
    const join = p => [get(p, 'day'), get(p, 'month'), get(p, 'year')].filter(Boolean).join(' ');
    return { weekday: get(pd, 'weekday'), persian: join(pd), gregorian: join(gd), lunar: join(hd), hour, time: fa(String(hour).padStart(2, '0') + ':' + get(tm, 'minute')), part: hour < 5 ? 'نیمه‌شب' : hour < 12 ? 'صبح' : hour < 15 ? 'ظهر' : hour < 18 ? 'بعدازظهر' : hour < 21 ? 'عصر' : 'شب' };
  }
  // Phrases per conversational act. Written as people type them: colloquial, without half-spaces, with and without
  // «تو»/«شما». Matching is longest phrase first, and words of five letters or more forgive one slip or swap.
  const LEX = {
    greet: ['سلام', 'سلام علیکم', 'علیک سلام', 'سلام سلام', 'درود', 'درود بر تو', 'هی', 'hello', 'hi', 'hey', 'salam', 'صبح بخیر', 'صبحت بخیر', 'صبح ها بخیر', 'صبح شما بخیر', 'ظهر بخیر', 'عصر بخیر', 'عصرت بخیر', 'وقت بخیر', 'وقتت بخیر', 'وقتتون بخیر', 'وقت شما بخیر', 'روز بخیر', 'روزت بخیر', 'خسته نباشی', 'خسته نباشید', 'چاکرم', 'مخلصم', 'good morning'],
    howareyou: ['خوبی', 'خوبین', 'خوبید', 'خوب هستی', 'خوب هستید', 'چطوری', 'چطورین', 'چطورید', 'چه طوری', 'چطوری تو', 'حالت چطوره', 'حالت چطور است', 'حالت خوبه', 'حالتون چطوره', 'حالتون خوبه', 'حال شما', 'حال تو', 'حالت', 'احوالت', 'احوال شما', 'چه خبر', 'چه خبرا', 'چخبر', 'خبرا', 'اوضاع چطوره', 'اوضاع خوبه', 'اوضاع', 'روبراهی', 'سرحالی', 'how are you', 'how r u', 'whats up', 'what s up', 'sup', 'how is it going'],
    moodgood: ['خوبم', 'عالیم', 'عالی ام', 'خیلی خوبم', 'بد نیستم', 'ای بد نیستم', 'روبراهم', 'سرحالم', 'فدات خوبم', 'شکر خوبم', 'خداروشکر', 'خدا رو شکر', 'شکر', 'منم خوبم', 'من هم خوبم', 'من خوبم', 'همه چی خوبه', 'خوب', 'im fine', 'i m fine', 'im good', 'i m good', 'fine'],
    moodbad: ['خوب نیستم', 'بدم', 'حالم بده', 'حالم خوب نیست', 'ناراحتم', 'غمگینم', 'خسته ام', 'خستم', 'خیلی خسته ام', 'خیلی خستم', 'حوصله ندارم', 'بی حوصله ام', 'حوصلم سر رفته', 'کلافه ام', 'استرس دارم', 'نگرانم', 'بیکارم', 'کار پیدا نمیکنم', 'کار پیدا نمی کنم', 'کار پیدا نکردم', 'ناامیدم', 'نا امیدم', 'داغونم', 'افسرده ام'],
    time: ['ساعت چنده', 'ساعت چند است', 'ساعت چند', 'ساعت چن', 'چه ساعتیه', 'چه ساعتی است', 'ساعت رو بگو', 'ساعت را بگو', 'ساعت', 'what time is it', 'what time', 'time'],
    date: ['چندمه', 'چندم است', 'چندمیه', 'تاریخ امروز', 'تاریخ چنده', 'تاریخ', 'چه تاریخیه', 'چه تاریخی است', 'چه روزیه', 'چه روزی است', 'چه روزی', 'چند شنبه است', 'چندشنبه است', 'چندشنبست', 'چند شنبست', 'چندشنبه', 'چند شنبه', 'روز هفته', 'تاریخ میلادی', 'تاریخ قمری', 'تاریخ شمسی', 'میلادی', 'قمری', 'شمسی', 'امسال چه سالیه', 'چه سالیه', 'سال چنده', 'چه ماهیه', 'ماه چیه', 'what s the date', 'whats the date', 'what day is it', 'what day is today', 'today s date', 'date'],
    location: ['کجایی', 'کجا هستی', 'کجا هستید', 'کجا زندگی میکنی', 'کجا زندگی می کنی', 'اهل کجایی', 'خونت کجاست', 'where are you'],
    name: ['اسمت چیه', 'اسمت چیست', 'اسم تو چیه', 'اسم شما چیه', 'اسمت', 'کی هستی', 'کی هستین', 'خودتو معرفی کن', 'خودت را معرفی کن', 'معرفی کن خودتو', 'who are you', 'whats your name', 'what s your name', 'your name'],
    model: ['کلاد', 'کلود', 'claude', 'chatgpt', 'chat gpt', 'gpt', 'چت جی پی تی', 'چت جیپیتی', 'جی پی تی', 'openai', 'open ai', 'اوپن ای آی', 'anthropic', 'انتروپیک', 'آنتروپیک', 'gemini', 'جمینای', 'جمنای', 'deepseek', 'دیپ سیک', 'llama', 'لاما', 'grok', 'گراک', 'mistral', 'میسترال', 'copilot', 'کوپایلت', 'چه مدلی هستی', 'کدوم مدلی', 'مدلت چیه', 'چه مدلی', 'از چه هوش مصنوعی', 'کدوم هوش مصنوعی', 'چه هوش مصنوعی', 'which model', 'what model', 'مدل زبانی'],
    bot: ['ربات', 'رباتی', 'بات', 'آدم', 'آدمی', 'انسان', 'انسانی', 'هوش مصنوعی', 'هوش مصنوعی هستی', 'واقعی', 'زنده', 'گربه واقعی', 'are you a bot', 'are you human', 'are you real', 'are you ai'],
    age: ['چند سالته', 'چند سالتونه', 'چند سالت است', 'سنت چنده', 'سنت چقدره', 'how old are you'],
    maker: ['کی ساختت', 'کی تو رو ساخته', 'کی تو را ساخته', 'کی ساخته تو رو', 'سازندت کیه', 'سازنده ات کیه', 'سازنده ات کیست', 'who made you', 'who built you'],
    likes: ['چی دوست داری', 'چه چیزی دوست داری', 'به چی علاقه داری', 'غذای مورد علاقت چیه', 'غذای مورد علاقه ات چیه', 'علاقت چیه', 'what do you like'],
    joke: ['جوک', 'جوک بگو', 'یه جوک بگو', 'لطیفه', 'یه چیز خنده دار', 'منو بخندون', 'بخندونم', 'یکی دیگه بگو', 'یه دونه دیگه', 'joke'],
    love: ['دوستت دارم', 'عاشقتم', 'خیلی خوبی', 'عالی هستی', 'عالی ای', 'باهوشی', 'خیلی باهوشی', 'بامزه ای', 'نازی', 'خیلی نازی', 'خوشگلی', 'گلی', 'ایول', 'آفرین', 'دمت گرم', 'love you', 'i love you', 'you re great', 'you re smart', 'you re cute'],
    rude: ['خنگ', 'خنگی', 'خیلی خنگی', 'احمق', 'بی مصرف', 'بیمصرف', 'بی شعور', 'بیشعور', 'مسخره', 'چرت میگی', 'چرت می گی', 'بدرد نخور', 'به درد نخور', 'نفهمیدی', 'نمیفهمی', 'نمی فهمی', 'stupid', 'dumb', 'useless', 'idiot'],
    thanks: ['ممنون', 'ممنونم', 'مرسی', 'متشکرم', 'تشکر', 'سپاس', 'سپاسگزارم', 'thanks', 'thank you', 'thx', 'tnx', 'ممنون ازت', 'مرسی ازت', 'خیلی ممنون', 'خیلی مرسی'],
    goodnight: ['شب بخیر', 'شبت بخیر', 'شب خوش', 'good night'],
    bye: ['خداحافظ', 'خدانگهدار', 'خدا نگهدار', 'بای', 'بای بای', 'میرم', 'می رم', 'من رفتم', 'bye', 'goodbye', 'see you'],
    yes: ['باشه', 'اوکی', 'ok', 'okay', 'حله', 'آره', 'اره', 'بله', 'اوهوم', 'اهوم', 'اکی', 'اوکیه', 'عالیه', 'خوبه', 'باشه مرسی', 'قبوله', 'موافقم'],
    no: ['نه', 'نخیر', 'نه ممنون', 'نه مرسی', 'no', 'nope', 'بیخیال', 'ولش کن', 'لازم نیست'],
    go: ['بریم', 'بزن بریم', 'شروع کنیم', 'بیا شروع کنیم', 'بریم سراغش', 'بریم شروع کنیم', 'شروع کن', 'lets go', 'let s go'],
    defer: ['فردا', 'از فردا', 'فردا شروع کنیم', 'فردا شروع میکنم', 'از فردا شروع میکنم', 'فردا ادامه بدیم', 'فردا ادامه میدیم', 'بعدا', 'بعدا ادامه بدیم', 'بعدا میام', 'یه وقت دیگه', 'یه روز دیگه', 'الان وقت ندارم', 'وقت ندارم', 'بعدا انجام میدم', 'later', 'tomorrow'],
    sorry: ['ببخشید', 'شرمنده', 'معذرت میخوام', 'عذر میخوام', 'sorry'],
    weather: ['هوا', 'هوا چطوره', 'وضع هوا', 'هوا سرده', 'هوا گرمه', 'weather', 'how s the weather'],
  };
  // Words that carry no meaning on their own here: «ساعت چنده اونجا»، «حالا امروز چندمه»، «فندق جان خوبی؟».
  const FILLER = new Set(['اونجا', 'آنجا', 'اینجا', 'الان', 'الآن', 'حالا', 'اکنون', 'امروز', 'پس', 'خب', 'فعلا', 'فعلن', 'لطفا', 'خواهشا', 'راستی', 'دیگه', 'دیگر', 'واقعا', 'جدی', 'اصلا', 'آخه', 'اخه', 'هان', 'ها', 'تو', 'شما', 'تون', 'خودت', 'فندق', 'فندقی', 'پیشی', 'گربه', 'جان', 'جون', 'عزیزم', 'عزیز', 'رفیق', 'داداش', 'دوست', 'من', 'هم', 'بگو', 'بگید', 'ببینم', 'بدونم', 'میشه', 'میتونی', 'یه', 'یک', 'سوال', 'هستی', 'هستید', 'هستین', 'ای', 'آیا', 'ایا', 'آقا', 'اقا', 'please', 'pls', 'plz', 'و', 'که', 'به', 'از', 'رو', 'را', 'با']);
  const CALLS = new Set(['فندق', 'فندقی', 'پیشی', 'گربه', 'جان', 'جون', 'عزیزم', 'رفیق']);
  const PHRASES = Object.entries(LEX).flatMap(([topic, all]) => all.map(p => ({ topic, toks: norm(p).split(' ') }))).sort((a, b) => b.toks.length - a.toks.length);
  const BRAND = /^(?:کلاد|کلود|claude|chatgpt|gpt|جیپیتی|gemini|جمینا|جمنا|openai|anthropic|انتروپیک|آنتروپیک|deepseek|دیپسیک|llama|grok|گراک|mistral|میسترال|copilot|کوپایلت|bard|بارد)/;
  const LAUGH = /^(?:خ{2,}|ه{2,}|(?:ها){2,}|(?:هه)+|lol|(?:ha){2,}h?|ج{3,})$/;
  const same = (w, k) => w === k || (k.length >= 5 && w.length >= 4 && slips(w, k, 1) <= 1);
  // Reads a message into conversational acts plus whatever is left over (the resume question, if any).
  function talk(question) {
    const raw = String(question || ''), emoji = (raw.match(/\p{Extended_Pictographic}/gu) || []).join('');
    const toks = norm(raw).replace(/\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}️‍]/gu, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(' ').filter(Boolean);
    const topics = [], rest = []; let called = false;
    for (let i = 0; i < toks.length;) {
      let hit = null;
      for (const p of PHRASES) if (p.toks.length <= toks.length - i && p.toks.every((k, j) => same(toks[i + j], k))) { hit = p; break; }
      if (hit) { if (!topics.includes(hit.topic)) topics.push(hit.topic); i += hit.toks.length; continue; }
      if (BRAND.test(toks[i])) { if (!topics.includes('model')) topics.push('model'); i++; continue; }
      if (LAUGH.test(toks[i])) { if (!topics.includes('laugh')) topics.push('laugh'); }
      else if (CALLS.has(toks[i])) called = true;
      else if (!FILLER.has(toks[i])) rest.push(toks[i]);
      i++;
    }
    // «فندق؟» or «فندق جان» on its own is a call; «خوب» on its own is an answer, not a filler.
    if (!topics.length && !rest.length && called) topics.push('call');
    return { topics, rest, emoji, tokens: toks };
  }
  const choose = (a, avoid) => { const fresh = a.filter(x => !avoid || !avoid.includes(x.slice(0, 24))); const from = fresh.length ? fresh : a; return from[Math.floor(Math.random() * from.length)]; };
  function chat(question, c, ctx = {}) {
    const a = talk(question); if (a.rest.length && !ctx.force) return null;
    let topics = a.topics.slice(); if (!topics.length) { if (!a.emoji) return null; topics = ['emoji']; }
    if (topics.includes('date') && topics.includes('time')) topics = topics.filter(t => t !== 'time').map(t => t === 'date' ? 'datetime' : t);
    // A message about the AI behind Fandogh is always about identity, whatever else it says.
    if (topics.includes('model')) topics = ['model'];
    const p = (c && c.profile) || {}, first = text(p.name).split(' ')[0], n = first ? ' ' + first : '', t = clock(ctx.now), flat = a.tokens.join(' ');
    const said = list(ctx.history).filter(h => h && h.role === 'assistant').map(h => text(h.text)).join('\n'), greetedBefore = /(^|\n)(?:میو! )?سلام/.test(said);
    const sc = score(c || {}, ctx), weak = sc.dims.slice().sort((x, y) => x.value - y.value), step = weak.flatMap(d => d.reasons).find(Boolean);
    const resumeFollow = ['امتیاز رزومه‌ام چند است؟', 'قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده'];
    const datePhrase = () => 'امروز ' + t.weekday + ' ' + t.persian + (/میلادی/.test(flat) ? '؛ به میلادی ' + t.gregorian : ' (' + t.gregorian + ')') + (/قمری/.test(flat) ? '؛ به قمری ' + t.lunar : '');
    const has = x => topics.includes(x), lines = [];
    let follow = resumeFollow;
    for (const topic of topics) {
      switch (topic) {
        case 'greet':
          if (topics.length > 1) lines.push('سلام' + n + '!');
          else if (greetedBefore) { lines.push('سلام دوباره' + n + '! 😺 بگو چه کاری برایت انجام بدهم.'); follow = ['قدم بعدی چیه؟', 'امتیاز رزومه‌ام چند است؟']; }
          else { lines.push('سلام' + n + '! ' + (t.part === 'صبح' ? 'صبحت بخیر ☀️ ' : t.part === 'شب' || t.part === 'نیمه‌شب' ? 'شبت بخیر 🌙 ' : '') + 'من فندقم، دستیار رزومه‌ات 🐾 حالت چطوره؟'); follow = ['خوبم، تو چطوری؟', 'قدم بعدی چیه؟', 'امتیاز رزومه‌ام چند است؟']; }
          break;
        case 'howareyou':
          lines.push(has('moodgood') ? choose(['خوشحالم که خوبی! منم خوبم، مرسی 😺', 'چه خوب! منم سرحالم 😺']) : choose(['خوبم، مرسی که پرسیدی 😺 تو چطوری؟', 'عالی‌ام! تازه یک چرت گربه‌ای زدم 😸 تو چطوری؟', 'میو! خوبم و آماده‌ام کمکت کنم. حال تو چطوره؟'], said));
          follow = has('moodgood') ? resumeFollow : ['خوبم', 'خسته‌ام', 'قدم بعدی چیه؟'];
          break;
        case 'moodgood': if (!has('howareyou')) lines.push(choose(['خوشحالم' + n + '! 🌼', 'چه خوب! 😺', 'عالیه' + n + '!']) + ' می‌خواهی با هم یک قدم کوچک برای رزومه‌ات برداریم؟'); follow = ['بریم', 'امتیاز رزومه‌ام چند است؟', 'فعلاً نه']; break;
        case 'moodbad': lines.push('ای وای' + n + '، خسته نباشی 💙 لازم نیست امروز همه‌چیز را تمام کنی. یک کار دو دقیقه‌ای انتخاب می‌کنیم؛ اگر هم حوصله نداری، بعداً با هم ادامه می‌دهیم.'); follow = ['قدم بعدی چیه؟', 'یک جوک بگو', 'بعداً ادامه بدیم']; break;
        case 'datetime': lines.push(datePhrase() + ' و ساعت ' + t.time + ' به وقت تهران است.'); follow = ['قدم بعدی چیه؟']; break;
        case 'date': lines.push(datePhrase() + '.'); follow = ['ساعت چنده؟', 'قدم بعدی چیه؟']; break;
        case 'time': lines.push((has('location') || /اونجا|آنجا/.test(flat) ? 'من به وقت تهران زندگی می‌کنم؛ ' : '') + 'الان ساعت ' + t.time + (has('location') || /اونجا|آنجا/.test(flat) ? ' است' : ' به وقت تهران است') + (t.part === 'نیمه‌شب' ? '؛ دیروقت است، کمی هم استراحت کن 😴' : t.part === 'صبح' ? '؛ صبح، بهترین وقت برای یک قدم تازه است ☀️' : '.')); follow = ['امروز چندمه؟', 'قدم بعدی چیه؟']; break;
        case 'location': if (!has('time')) lines.push('من توی رزومیت زندگی می‌کنم، همین گوشهٔ صفحهٔ تو 🐾 ساعتم هم به وقت تهران است.'); break;
        case 'name': lines.push('من فندقم 🐾 گربهٔ سفید رزومیت و دستیار رزومه‌ات. رزومه‌ات را می‌خوانم، غلط‌ها را می‌گیرم، معرفی و مهارت پیشنهاد می‌دهم و قدم بعدی را نشانت می‌دهم.'); follow = ['چه کارهایی بلدی؟', 'امتیاز رزومه‌ام چند است؟']; break;
        case 'model': lines.push('من فندقم 🐾 دستیار رزومهٔ رزومیت. اینکه پشت صحنه با چه ابزاری فکر می‌کنم یک راز گربه‌ای است 😼 مهم این است که هر چه می‌گویم از روی رزومهٔ خودت است و چیزی از خودم نمی‌سازم.'); follow = ['چه کارهایی بلدی؟', 'قدم بعدی چیه؟']; break;
        case 'bot': lines.push('من یک دستیار هوشمندم، نه آدم؛ ولی گربه‌بودنم واقعی است! 😺 از روی رزومهٔ خودت جواب می‌دهم و چیزی از خودم نمی‌سازم.'); follow = ['چه کارهایی بلدی؟']; break;
        case 'age': lines.push('گربه‌ها سنشان را نمی‌گویند! 😼 فقط می‌دانم تازه به رزومیت آمده‌ام و کلی انرژی دارم.'); break;
        case 'maker': lines.push('تیم رزومیت مرا ساخته تا کنار تو باشم و رزومه‌ات را بهتر کنیم 💙'); break;
        case 'likes': lines.push('رزومه‌های مرتب، معرفی‌های کوتاه و یک گوشهٔ گرم کنار صفحه! 🐾 «فندق» هم اسمم است، نه غذایم 😹'); break;
        case 'joke': lines.push(choose(['چرا رزومهٔ گربه‌ها همیشه کوتاه است؟ چون فقط «میو» می‌نویسند! 😹', 'به کارفرما گفتم مهارتم «کار تیمی» است. پرسید با کی؟ گفتم با کیبورد و موس! 😸', 'رزومهٔ بی‌غلط مثل کیبوردی است که گربه رویش راه نرفته؛ کمیاب، ولی شدنی! 😼', 'از گربه پرسیدند نقطهٔ قوتت چیست؟ گفت «تمرکز»؛ بعد یک پروانه رد شد 🦋😹', 'رزومهٔ من فقط یک خط دارد: «خواب، بازی، دوباره خواب» 😴'], said)); follow = ['یکی دیگه بگو', 'قدم بعدی چیه؟']; break;
        case 'love': lines.push('میو! 💙 تو هم خیلی خوبی' + n + '. بیا رزومه‌ات را هم مثل خودت خوب کنیم.'); break;
        case 'rude': lines.push('حق داری اگر جوابم به دردت نخورد 🙏 هنوز دارم یاد می‌گیرم. سؤالت را با کلمه‌های ساده‌تر بگو؛ مثلاً «امتیاز رزومه‌ام چنده؟»، «یه معرفی برام بنویس» یا «چه مهارت‌هایی اضافه کنم؟».'); follow = ['قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده', 'چه مهارت‌هایی اضافه کنم؟']; break;
        case 'thanks': lines.push(choose(['خواهش می‌کنم! 🐾 هر وقت لازم بود همین‌جام.', 'قابلی نداشت' + n + '! هر وقت متن را عوض کنی دوباره نگاه می‌کنم.'])); break;
        case 'goodnight': lines.push('شب بخیر' + n + '! 🌙 خواب‌های قشنگ ببینی؛ من هم یک چرت گربه‌ای می‌زنم.'); follow = []; break;
        case 'bye': lines.push('خداحافظ' + n + '! 👋 هر وقت برگشتی همین‌جا منتظرم.'); follow = []; break;
        case 'laugh': lines.push('😹 خوشحالم که خندیدی!'); follow = ['یک جوک بگو', 'قدم بعدی چیه؟']; break;
        case 'yes': lines.push('حله! 👌 بگو از کجا شروع کنیم:'); break;
        case 'no': lines.push('باشه، هر وقت خواستی بگو؛ همین‌جام 🐾'); break;
        case 'go': lines.push('بریم! 💪'); break;
        case 'defer': lines.push('قبول' + n + '! 🐾 هر وقت برگشتی، ' + (step ? 'از همین شروع می‌کنیم: «' + step + '»؛ کمتر از پنج دقیقه وقت می‌گیرد.' : 'از همین‌جا ادامه می‌دهیم.') + ' من همین‌جا منتظرم.'); follow = ['همین الان شروع کنیم', 'امتیاز رزومه‌ام چند است؟']; break;
        case 'sorry': lines.push('اشکالی ندارد! 😺'); break;
        case 'weather': lines.push('از پشت این صفحه پنجره‌ای نمی‌بینم ☁️ ولی هوای رزومه‌ات را می‌توانم بگویم! امتیازش را ببینیم؟'); follow = ['امتیاز رزومه‌ام چند است؟']; break;
        case 'call': lines.push(choose(['جانم' + n + '؟ 🐾 بگو چه کمکی از دستم برمی‌آید.', 'میو؟ 😺 همین‌جام؛ بپرس.'])); break;
        case 'emoji': lines.push(/[❤💙💜💚🧡💛🤍😍🥰😘]/u.test(a.emoji) ? 'میو! 💙' : /[😂🤣😹😆😄]/u.test(a.emoji) ? '😹' : /[👍👌✌]/u.test(a.emoji) ? '👌 حله!' : '🐾'); break;
      }
    }
    if (!lines.length) return null;
    const topic = topics.length === 1 ? topics[0] : topics.includes('greet') ? 'greet' : topics[topics.length - 1];
    return { intent: 'smalltalk', topic, topics, text: lines.join(' '), actions: [], follow };
  }

  function opening(c, ctx = {}) {
    const sc = score(c, ctx), p = c.profile || {}, weak = sc.dims.slice().sort((a, b) => a.value - b.value)[0], typos = spelling(c);
    return { intent: 'opening', text: (text(p.name) ? 'سلام ' + text(p.name).split(' ')[0] + '! ' : 'سلام! ') + 'رزومه‌ات ' + fa(sc.total) + ' از ۱۰۰ است (' + sc.label + ')' + (sc.role ? ' و به نظرم «' + sc.role.label + '» هستی' : '') + '. ' + (typos.length ? 'یک چیز کوچک: «' + typos[0].wrong + '» در ' + typos[0].where + ' احتمالاً «' + typos[0].right + '» است.' : weak.value < 70 && weak.reasons[0] ? 'بیشترین اثر را «' + weak.label + '» دارد: ' + weak.reasons[0] + '.' : 'وضعیتش خوب است؛ بپرس تا دقیق‌تر کمک کنم.'), actions: typos.slice(0, 2).map(t => ({ kind: 'fix', label: '«' + t.wrong + '» ← «' + t.right + '»', wrong: t.wrong, value: t.right })), follow: ['قدم بعدی چیه؟', 'یک معرفی برایم پیشنهاد بده', sc.role ? 'چه مهارت‌هایی اضافه کنم؟' : 'من برنامه‌نویس هستم'] };
  }

  const api = { version: '3.0.0', ROLES, normalize: norm, chat, talk, clock, detectRole, missingSkills, years, score, bioDraft, bulletHelp, intent, understand, spelling, fixText, reply, opening };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ResumeBrain = api;
})(typeof self !== 'undefined' ? self : this);
