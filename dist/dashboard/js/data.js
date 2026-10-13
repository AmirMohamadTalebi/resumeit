/* داده‌های نمونه، فهرست قالب‌ها، پلن‌ها و مبلغ‌های نمایشی. هیچ‌کدام واقعی نیستند. */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});

  RI.DOMAIN = 'resumeit.ir';
  RI.TAKEN_SLUGS = ['www','admin','api','app','dashboard','auth','login','register','support','mail','smtp','ftp','cdn','assets','static','cname','blog','status','links','resume','demo'];

  /* ---------- شبکه‌های اجتماعی و آیکن لینک ---------- */
  RI.SOCIALS = [
    ['github', 'گیت‌هاب', 'github'], ['linkedin', 'لینکدین', 'linkedin'], ['telegram', 'تلگرام', 'telegram'],
    ['instagram', 'اینستاگرام', 'instagram'], ['twitter', 'ایکس (توییتر)', 'twitter'], ['youtube', 'یوتیوب', 'youtube'],
  ];
  RI.LINK_ICONS = ['link', 'github', 'instagram', 'telegram', 'linkedin', 'youtube', 'mail', 'globe', 'resume', 'code', 'star', 'gift', 'image', 'phone'];
  RI.LINK_ICON_NAMES = { link: 'لینک', github: 'گیت‌هاب', instagram: 'اینستاگرام', telegram: 'تلگرام', linkedin: 'لینکدین', youtube: 'یوتیوب', mail: 'ایمیل', globe: 'وب‌سایت', resume: 'رزومه', code: 'کد', star: 'ستاره', gift: 'هدیه', image: 'تصویر', phone: 'تماس' };

  RI.SKILL_LEVELS = ['مقدماتی', 'پایه', 'متوسط', 'پیشرفته', 'متخصص'];
  RI.LANG_LEVELS = ['مقدماتی', 'محاوره‌ای', 'حرفه‌ای', 'مسلط', 'زبان مادری'];

  /* ---------- قالب‌ها ---------- */
  /* access: free | buy (خرید یک‌باره) | sub (با اشتراک) */
  RI.RESUME_TEMPLATES = [
    { id: 'vista', name: 'ویستا', cats: ['dev', 'creator'], access: 'buy', subscription: true, price: 118000, layout: 'hero', desc: 'قالب ویستای ارسالی؛ رزومه، نمونه‌کار، مقاله و صفحات اختصاصی قابل ویرایش.', v: { bg: '#0c1117', surface: '#131b25', ink: '#f5f7fa', muted: '#a2adbb', accent: '#9bf27d', accent2: '#85d3ef', hero: '#131b25', line: '#25303f' } },
    { id: 'satiar', name: 'ساتیار', cats: ['creator', 'dev'], access: 'buy', subscription: true, price: 118000, layout: 'hero', desc: 'قالب ساتیار ارسالی؛ معرفی، خدمات، رزومه، تعرفه‌ها و بخش‌های قابل شخصی‌سازی.', v: { bg: '#001035', surface: '#142b56', ink: '#ffffff', muted: '#adb8d0', accent: '#fe8b45', accent2: '#905bf5', hero: '#142b56', line: '#304365' } },
    { id: 'glacier', name: 'یخچال', cats: ['student', 'dev', 'creator'], access: 'free', layout: 'side', desc: 'دو ستونی، روشن و منظم؛ انتخاب امن برای شروع.',
      v: { bg: '#eef4f7', surface: '#ffffff', ink: '#1d2c36', muted: '#5a7080', accent: '#52788d', accent2: '#a47248', hero: 'linear-gradient(135deg,#cfe0e8,#eef4f7)', line: '#d5e3ea' } },
    { id: 'campus', name: 'پردیس', cats: ['student'], access: 'free', layout: 'stack', desc: 'تک‌ستونی و گرم، مناسب دانشجو و دانش‌آموز.',
      v: { bg: '#faf4ee', surface: '#ffffff', ink: '#3b2a1d', muted: '#7a6552', accent: '#875a36', accent2: '#52788d', hero: 'linear-gradient(135deg,#f2e6da,#faf4ee)', line: '#ead8c6' } },
    { id: 'mono', name: 'تک‌رنگ', cats: ['dev'], access: 'free', layout: 'stack', desc: 'مینیمال با تأکید روی پروژه‌ها و مهارت‌ها.',
      v: { bg: '#f5f6f7', surface: '#ffffff', ink: '#111417', muted: '#5d6670', accent: '#111417', accent2: '#52788d', hero: 'linear-gradient(135deg,#e8ebee,#f5f6f7)', line: '#dde1e5' } },
    { id: 'journal', name: 'دفترچه', cats: ['student', 'creator'], access: 'free', layout: 'stack', serif: true, desc: 'حال‌وهوای نوشتاری برای بلاگرها و دانشجویان.',
      v: { bg: '#f7f3ec', surface: '#fffdf9', ink: '#2e2a24', muted: '#756c5f', accent: '#8a5f3c', accent2: '#3d5c6f', hero: 'linear-gradient(135deg,#eadfce,#f7f3ec)', line: '#e5dac7' } },
    { id: 'terminal', name: 'ترمینال', cats: ['dev'], access: 'buy', price: 50000, layout: 'side', mono: true, desc: 'تیره با حال‌وهوای خط فرمان برای برنامه‌نویس‌ها.',
      v: { bg: '#10181e', surface: '#17232b', ink: '#e6eef2', muted: '#8fa6b3', accent: '#7fd1b9', accent2: '#d2ae89', hero: 'linear-gradient(135deg,#17232b,#10181e)', line: '#25353f' } },
    { id: 'spotlight', name: 'نورافکن', cats: ['creator'], access: 'buy', price: 60000, layout: 'hero', desc: 'جلوهٔ تصویری بزرگ برای اینفلوئنسر و تولیدکنندهٔ محتوا.',
      v: { bg: '#1f1710', surface: '#2b2016', ink: '#fbf1e6', muted: '#c9b49c', accent: '#e0a56f', accent2: '#97b5c5', hero: 'linear-gradient(135deg,#6b4629,#1f1710)', line: '#3d2e20' } },
    { id: 'blueprint', name: 'نقشه', cats: ['dev', 'student'], access: 'sub', layout: 'hero', mono: true, desc: 'آبی فنی با شبکهٔ ظریف؛ ویژهٔ اشتراک.',
      v: { bg: '#16304a', surface: '#1d3d5c', ink: '#eaf3fb', muted: '#9fbad2', accent: '#8fd0ff', accent2: '#f2c48d', hero: 'linear-gradient(135deg,#1d3d5c,#16304a)', line: '#2c5174' } },
    { id: 'sunroom', name: 'آفتاب‌گیر', cats: ['creator', 'student'], access: 'sub', layout: 'hero', desc: 'روشن و پرجزئیات؛ ویژهٔ اشتراک.',
      v: { bg: '#fdf6ec', surface: '#ffffff', ink: '#3b2a1d', muted: '#82705d', accent: '#c07a3d', accent2: '#52788d', hero: 'linear-gradient(135deg,#f6dcb8,#fdf6ec)', line: '#f0e0c8' } },
  ];

  RI.LINK_TEMPLATES = [
    { id: 'frost', name: 'شبنم', cats: ['student', 'dev', 'creator'], access: 'free', desc: 'دکمه‌های شیشه‌ای روی زمینهٔ آبی یخی.', btn: 'glass',
      v: { bg: 'linear-gradient(160deg,#d9e9f0,#f4f9fb 60%,#f2e6da)', ink: '#1d2c36', muted: '#5a7080', btnBg: 'rgba(255,255,255,.75)', btnInk: '#1d2c36', btnBd: 'rgba(255,255,255,.9)', accent: '#875a36' } },
    { id: 'cocoa', name: 'کاکائو', cats: ['creator', 'student'], access: 'free', desc: 'گرم و نرم با دکمه‌های تو‌پر قهوه‌ای.', btn: 'solid',
      v: { bg: 'linear-gradient(160deg,#f2e6da,#faf4ee)', ink: '#3b2a1d', muted: '#7a6552', btnBg: '#875a36', btnInk: '#ffffff', btnBd: 'transparent', accent: '#52788d' } },
    { id: 'graphite', name: 'گرافیت', cats: ['dev'], access: 'free', desc: 'ساده و خطی برای صفحهٔ کاری.', btn: 'outline',
      v: { bg: '#f3f5f6', ink: '#111417', muted: '#5d6670', btnBg: 'transparent', btnInk: '#111417', btnBd: '#111417', accent: '#52788d' } },
    { id: 'midnight', name: 'نیمه‌شب', cats: ['dev', 'creator'], access: 'buy', price: 46000, desc: 'تیره با درخشش ملایم آبی.', btn: 'glass',
      v: { bg: 'linear-gradient(160deg,#10181e,#1d3d5c)', ink: '#eaf3fb', muted: '#9fbad2', btnBg: 'rgba(255,255,255,.1)', btnInk: '#eaf3fb', btnBd: 'rgba(255,255,255,.22)', accent: '#8fd0ff' } },
    { id: 'paper', name: 'کاغذ', cats: ['student', 'creator'], access: 'sub', desc: 'برگه‌ای با سایهٔ نرم؛ ویژهٔ اشتراک.', btn: 'paper',
      v: { bg: '#f7f3ec', ink: '#2e2a24', muted: '#756c5f', btnBg: '#ffffff', btnInk: '#2e2a24', btnBd: '#e5dac7', accent: '#8a5f3c' } },
    { id: 'sunset', name: 'غروب', cats: ['creator'], access: 'sub', desc: 'گرادیان گرم و دکمه‌های گرد؛ ویژهٔ اشتراک.', btn: 'solid',
      v: { bg: 'linear-gradient(160deg,#f6dcb8,#e4cdb6 50%,#97b5c5)', ink: '#3b2a1d', muted: '#6b5842', btnBg: 'rgba(59,42,29,.88)', btnInk: '#fff7ee', btnBd: 'transparent', accent: '#fff7ee' } },
  ];

  RI.IT_RATE = 2000;
  RI.it = amount => RI.fa(amount / RI.IT_RATE) + ' It';
  RI.allowed = (ref, item, billing = {}, now = Date.now()) => item.access === 'free' ||
    (item.access === 'buy' && (billing.purchases || []).some(p => p.ref === ref)) ||
    ((item.access === 'sub' || item.subscription) && billing.plan && billing.plan.end > now);
  RI.FONTS = [
    { id: 'vazir', name: 'وزیرمتن', access: 'free', stack: "'Vazirmatn', Tahoma, sans-serif", hw: 800, note: 'انتخاب پیشنهادی؛ خوانا و متعادل برای بیشتر رزومه‌ها' },
    { id: 'sahel', name: 'ساحل', access: 'free', stack: "'Sahel', Tahoma, sans-serif", hw: 700, note: 'نرم و دوستانه؛ مناسب معرفی شخصی و متن‌های طولانی' },
    { id: 'estedad', name: 'استعداد', access: 'buy', price: 46000, stack: "'Estedad', Tahoma, sans-serif", hw: 800, note: 'هندسی و محکم؛ مناسب رزومهٔ فنی و حرفه‌ای' },
    { id: 'naskh', name: 'نسخ', access: 'buy', price: 52000, stack: "'Noto Naskh Arabic', Tahoma, serif", hw: 700, note: 'کلاسیک و نوشتاری؛ مناسب مقاله و رزومهٔ رسمی' },
    { id: 'lalezar', name: 'لاله‌زار', access: 'buy', price: 60000, stack: "'Vazirmatn', Tahoma, sans-serif", heading: "'Lalezar', Tahoma, sans-serif", hw: 400, note: 'تیترهای نمایشی و پررنگ؛ متن اصلی با وزیرمتن خوانا می‌ماند' },
    { id: 'system', name: 'سیستمی', access: 'free', stack: "Tahoma, 'Segoe UI', system-ui, sans-serif", hw: 700, note: 'بدون دانلود فونت؛ مناسب سرعت و سادگی' },
  ];

  RI.PALETTES = [
    { id: 'default', name: 'پیش‌فرض قالب', access: 'free', colors: null },
    { id: 'ice', name: 'آبی یخی', access: 'free', colors: ['#52788d', '#a47248'] },
    { id: 'cocoa', name: 'قهوه‌ای گرم', access: 'free', colors: ['#875a36', '#52788d'] },
    { id: 'sage', name: 'سبز مات', access: 'sub', colors: ['#5e8b7e', '#b08457'] },
    { id: 'navy', name: 'سرمه‌ای', access: 'sub', colors: ['#34508a', '#c79a6b'] },
    { id: 'sand', name: 'شنی', access: 'buy', price: 46000, colors: ['#b08457', '#5b7482'] },
  ];

  /* ---------- پلن‌ها (خرید با It، شارژ آنلاین غیرفعال) ---------- */
  RI.PLANS = {
    q: { id: 'q', name: 'سه‌ماهه', months: 3, price: 288000 },
    h: { id: 'h', name: 'شش‌ماهه', months: 6, price: 510000, badge: 'محبوب' },
    y: { id: 'y', name: 'سالانه', months: 12, price: 900000, badge: 'دامنهٔ ir رایگان' },
  };
  RI.PLAN_FEATURES = [
    ['یک رزومه و یک صفحهٔ لینک', true, true],
    ['قالب‌ها و فونت‌های استارتی', true, true],
    ['بارگذاری تصویر در ویرایشگر', 'تا ۲ مگابایت برای هر تصویر', 'تا ۲ مگابایت برای هر تصویر'],
    ['قالب‌های اشتراکی و ویژه', false, true],
    ['فونت‌های پولی', 'خرید یک‌باره', 'خرید یک‌باره'],
    ['انتشار روی زیردامنهٔ resumeit.ir', true, true],
    ['اتصال دامنهٔ مستقل', 'فعلاً غیرفعال', 'فعلاً غیرفعال'],
  ];

  /* ---------- نمونهٔ کاربر ---------- */
  function blank() {
    return {
      slug: '',
      resumeTemplates: {},
      profile: { name: '', title: '', bio: '', location: '', avatar: null, cover: null },
      contacts: [
        { id: 'c1', type: 'email', label: 'ایمیل', value: '', public: false },
        { id: 'c2', type: 'phone', label: 'شمارهٔ تماس', value: '', public: false },
        { id: 'c3', type: 'website', label: 'وب‌سایت', value: '', public: false },
      ],
      skills: [], experience: [], education: [], projects: [], certs: [], languages: [], socials: [],
      sections: [
        { key: 'contacts', visible: true }, { key: 'socials', visible: true },
        { key: 'skills', visible: true }, { key: 'experience', visible: true }, { key: 'education', visible: true },
        { key: 'projects', visible: true }, { key: 'certs', visible: true }, { key: 'languages', visible: true },
      ],
      links: {
        header: { sync: true, name: '', bio: '' },
        items: [],
        style: { align: 'center', ring: true, bgOverride: null },
      },
      theme: { resume: 'glacier', links: 'frost', font: 'vazir', palette: 'default', linksPalette: 'default', radius: 'soft' },
      share: { title: '', desc: '', image: null },
      domain: { value: '', status: 'none' },
    };
  }

  RI.seed = function (kind) {
    const s = blank();
    if (kind === 'empty') return s;

    s.slug = 'niloofar';
    s.profile = {
      name: 'نیلوفر کاظمی', title: 'دانشجوی مهندسی کامپیوتر | توسعه‌دهندهٔ فرانت‌اند',
      bio: 'عاشق ساختن رابط‌هایی که استفاده‌شان ساده و دیدنشان لذت‌بخش است. این‌جا نمونه‌کارها و مسیر یادگیری‌ام را جمع کرده‌ام.',
      location: 'تهران', avatar: null, cover: 'grad:#cfe0e8,#97b5c5',
    };
    s.contacts[0].value = 'niloofar@example.com'; s.contacts[0].public = true;
    s.contacts[1].value = '09120000000';
    s.socials = [{ id: 's1', platform: 'github', handle: 'niloofar-k' }, { id: 's2', platform: 'telegram', handle: 'niloofar_k' }];
    s.skills = [
      { id: 'k1', name: 'HTML و CSS', level: 5 }, { id: 'k2', name: 'JavaScript', level: 4 }, { id: 'k3', name: 'React', level: 3 },
      { id: 'k4', name: 'طراحی رابط کاربری', level: 3 }, { id: 'k5', name: 'Git', level: 4 },
    ];
    s.experience = [{ id: 'e1', role: 'کارآموز فرانت‌اند', org: 'استودیوی نمونه', from: '۱۴۰۳/۰۴', to: '', current: true, desc: 'پیاده‌سازی صفحه‌های واکنش‌گرا و همکاری با تیم طراحی روی سیستم طراحی.' }];
    s.education = [{ id: 'd1', degree: 'کارشناسی مهندسی کامپیوتر', school: 'دانشگاه نمونه', from: '۱۴۰۱', to: '', current: true, desc: 'معدل ۱۸٫۲ | عضو انجمن علمی' }];
    s.links.header = { sync: true, name: '', bio: '' };
    s.links.items = [
      { id: 'l1', type: 'link', title: 'رزومهٔ آنلاین من', url: 'niloofar.ResumeIt.ir', icon: 'resume', active: true, featured: true, clicks: 482 },
      { id: 'l2', type: 'divider', title: 'شبکه‌ها' },
      { id: 'l3', type: 'link', title: 'گیت‌هاب', url: 'github.com/niloofar-k', icon: 'github', active: true, featured: false, clicks: 231 },
      { id: 'l4', type: 'link', title: 'کانال تلگرام', url: 't.me/niloofar_k', icon: 'telegram', active: true, featured: false, clicks: 144 },
      { id: 'l5', type: 'link', title: 'لینکدین', url: 'linkedin.com/in/niloofar-k', icon: 'linkedin', active: false, featured: false, clicks: 37 },
    ];
    s.share = { title: 'نیلوفر کاظمی | توسعه‌دهندهٔ فرانت‌اند', desc: 'نمونه‌کارها و رزومهٔ نیلوفر؛ دانشجوی کامپیوتر و علاقه‌مند به طراحی رابط.', image: null };

    if (kind === 'full') {
      s.profile.avatar = RI.avatarSvg(s.profile.name, 'warm');
      s.theme.palette = 'ice';
      s.projects.push({ id: 'p1', title: 'ResumeIt داشبورد', desc: 'نمونهٔ آزمایشی داشبورد ساخت رزومه و صفحهٔ لینک با HTML و CSS و JavaScript خالص.', url: 'github.com/niloofar-k/dashboard', image: 'grad:#e4cdb6,#52788d' });
      s.contacts[2].value = 'niloofar.example.com'; s.contacts[2].public = true;
      s.profile.avatar = null;
      s.skills.push({ id: 'k6', name: 'TypeScript', level: 3 }, { id: 'k7', name: 'دسترس‌پذیری وب', level: 4 });
      s.education.push({ id: 'd2', degree: 'دیپلم ریاضی و فیزیک', school: 'دبیرستان نمونه', from: '۱۳۹۷', to: '۱۴۰۰', current: false, desc: '' });
      s.projects.push(
        { id: 'p2', title: 'اپ مدیریت وظایف', desc: 'برنامهٔ ساده برای مدیریت کارهای روزانه با ذخیره‌سازی محلی.', url: 'github.com/niloofar-k/tasks', image: 'grad:#97b5c5,#3d5c6f' },
        { id: 'p3', title: 'وبلاگ شخصی', desc: 'یادداشت‌هایی دربارهٔ یادگیری وب و طراحی.', url: 'niloofar.example.com', image: 'grad:#f2e6da,#bd8e64' },
      );
      s.certs = [{ id: 'g1', title: 'دورهٔ جاوااسکریپت پیشرفته', issuer: 'آموزشگاه نمونه', year: '۱۴۰۳' }, { id: 'g2', title: 'رتبهٔ برتر مسابقهٔ طراحی وب دانشگاه', issuer: 'دانشگاه نمونه', year: '۱۴۰۲' }];
      s.languages = [{ id: 'n1', name: 'فارسی', level: 5 }, { id: 'n2', name: 'انگلیسی', level: 4 }];
      s.socials.push({ id: 's3', platform: 'linkedin', handle: 'niloofar-k' });
      s.links.items[4].active = true;
    }
    return s;
  };

  /* ---------- پرداخت‌ها و خریدهای نمونه ---------- */
  RI.seedBilling = function (kind) {
    const b = { plan: null, purchases: [], payments: [] };
    if (kind === 'sub') {
      b.plan = { id: 'y', start: RI.daysFromNow(-48).getTime(), end: RI.daysFromNow(317).getTime(), autoRenew: false };
      b.purchases = [{ id: 'pu1', kind: 'template', ref: 'rt:terminal', name: 'قالب ترمینال', price: 50000, at: RI.daysFromNow(-30).getTime() }];
      b.payments = [
        { id: 'r2', title: 'اشتراک سالانه', amount: 289000, at: RI.daysFromNow(-48).getTime(), status: 'ok' },
        { id: 'r1', title: 'قالب ترمینال', amount: 49000, at: RI.daysFromNow(-30).getTime(), status: 'ok' },
      ];
    } else {
      b.purchases = [];
      b.payments = [];
    }
    return b;
  };

  RI.seedAccount = function () {
    return {
      name: 'نیلوفر کاظمی', mobile: '09120000000', mobileVerified: true,
      google: true, github: false,
      notify: { sms_publish: true, sms_security: true, email_tips: false, email_stats: true, push_milestones: true },
      indexing: true, brand: true,
    };
  };
})();

(function(){const RI=window.RI;
  /* تولید ثابت و تکرارپذیر (بدون Math.random) */
  function rng(seed) { let s = seed >>> 0 || 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  RI.sampleSeries = function (n, seed) {
    const r = rng(typeof seed === 'string' ? seed.length * 97 + n : seed), views = [], linkViews = [], clicks = [];
    for (let i = 0; i < n; i++) {
      const wave = 1 + 0.35 * Math.sin(i / 2.4) + i / (n * 2.5);
      const v = Math.round((14 + r() * 16) * wave), lv = Math.round((9 + r() * 12) * wave);
      views.push(v); linkViews.push(lv); clicks.push(Math.round(lv * (0.38 + r() * 0.25)));
    }
    return { views: views, linkViews: linkViews, clicks: clicks };
  };

})();
