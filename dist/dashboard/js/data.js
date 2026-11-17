/* داده‌های نمونه، فهرست قالب‌ها، پلن‌ها و مبلغ‌های نمایشی. هیچ‌کدام واقعی نیستند. */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});

  RI.DOMAIN = 'resumeit.ir';
  RI.TAKEN_SLUGS = ['www','admin','api','app','dashboard','auth','login','register','support','mail','smtp','ftp','cdn','assets','static','cname','blog','status','links','resume','demo','about','contact','privacy','terms','payments','changes','brand','fonts','templates','u','logout','reset','verify','forgot-password','auth-ui','public-assets','signature','sitemap','robots','favicon'];
  RI.PAGE_PATH_RESERVED=['out','share-image','api','admin','dashboard','assets','templates','fonts','brand','payments','login','register','auth'];
  RI.pagePathValid=value=>typeof value==='string'&&value.length>=1&&value.length<=24&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&!RI.PAGE_PATH_RESERVED.includes(value);

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
    { id: 'vista', name: 'ویستا', cats: ['dev', 'creator'], access: 'buy', subscription: true, price: 118000, layout: 'hero', desc: 'رزومهٔ تک‌صفحه‌ای با مهارت‌ها، سوابق و پنجرهٔ جزئیات پروژه.', v: { bg: '#0c1117', surface: '#131b25', ink: '#f5f7fa', muted: '#a2adbb', accent: '#9bf27d', accent2: '#85d3ef', hero: '#131b25', line: '#25303f' } },
    { id: 'satiar', name: 'ساتیار', cats: ['creator', 'dev'], access: 'buy', subscription: true, price: 118000, layout: 'hero', desc: 'رزومهٔ تصویری تک‌صفحه‌ای با معرفی، سوابق، مهارت‌ها و پروژه‌ها.', v: { bg: '#001035', surface: '#142b56', ink: '#ffffff', muted: '#adb8d0', accent: '#fe8b45', accent2: '#905bf5', hero: '#142b56', line: '#304365' } },
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
    { id: 'shabtab', name: 'شب‌تاب', cats: ['dev', 'creator', 'student'], access: 'sub', layout: 'hero', desc: 'آسمان شب صفحهٔ اصلی رزومیت: نام طلایی، عکس در مدار و حرکت‌های زنده؛ ویژهٔ اشتراک.',
      v: { bg: '#0b141b', surface: '#14222d', ink: '#eef4f7', muted: '#a9bdc9', accent: '#f0bd52', accent2: '#8ec5d6', hero: 'linear-gradient(135deg,#1b3242,#0b141b)', line: '#2a3e50' } },
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
  RI.priceToman=units=>RI.toman(Math.round(units*(RI.commerce?.rate||2000)/2000));
  RI.applyCommerce=policy=>{RI.commerce=policy||{rate:2000,prices:{},paused:[],imageFree:409600,imagePaid:2097152};for(const [kind,list]of Object.entries({rt:RI.RESUME_TEMPLATES,lt:RI.LINK_TEMPLATES,font:RI.FONTS,pal:RI.PALETTES,subscription:Object.values(RI.PLANS),assistant:Object.values(RI.ASSISTANT_PLANS)}))for(const item of list){if(item.defaultPrice===undefined){item.defaultPrice=item.price;item.defaultName=item.name;item.defaultDesc=item.desc||item.description||'';}const ref=kind+':'+item.id,metadata=RI.commerce.products?.[ref];item.price=RI.commerce.prices[ref]??item.defaultPrice;item.name=metadata?.name??item.defaultName;item.desc=metadata?.desc??item.defaultDesc;item.paused=RI.commerce.paused.includes(ref);}};
  RI.imageLimit=()=>{const p=RI.commerce||{imageFree:409600,imagePaid:2097152};return RI.hasSub?.()?p.imagePaid:p.imageFree;};
  RI.workspaceLimit=()=>Object.hasOwn(RI.ownerSettings||{},'subdomainLimit')?RI.ownerSettings.subdomainLimit:(RI.hasSub()?2:1)+(RI.ownerSettings?.extraSubdomain?1:0);
  RI.canWorkspace=slot=>Number.isSafeInteger(slot)&&slot>=1&&slot<=2147483647&&(slot===3?RI.hasSub():RI.workspaceLimit()===null||(slot<3?slot:slot-1)<=RI.workspaceLimit());
  RI.shareCard=(c,kind='resume')=>{const header=kind==='links'&&!c.links.header.sync?c.links.header:c.profile;return {title:c.share.title.trim()||header.name||'صفحهٔ شخصی',desc:c.share.desc.trim()||header.bio||'',image:c.share.image||c.profile.cover||c.profile.avatar||null,isDefault:!(c.share.image||c.profile.cover||c.profile.avatar)};};
  RI.publicationData=(k,c)=>k==='resume'?{routing:c.routing,slug:c.slug,profile:c.profile,contacts:c.contacts,skills:c.skills,experience:c.experience,education:c.education,projects:c.projects,certs:c.certs,languages:c.languages,socials:c.socials,sections:c.sections,resumeTemplates:c.resumeTemplates,theme:{resume:c.theme.resume,font:c.theme.font,palette:c.theme.palette,custom:c.theme.custom,radius:c.theme.radius},inbox:c.inbox,share:c.share,branding:c.branding?.resume}:{routing:c.routing,slug:c.slug,links:c.links,name:c.profile.name,bio:c.profile.bio,avatar:c.profile.avatar,theme:{links:c.theme.links,font:c.theme.font,linksPalette:c.theme.linksPalette,custom:c.theme.custom,radius:c.theme.radius,resume:c.links.style.matchResume?c.theme.resume:undefined},share:c.share,branding:c.branding?.links};
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

  // [accent, second accent]. They are seeds, not final colors: RI.harmonize adapts them to each template's background.
  RI.PALETTE_GROUPS = [['calm', 'آرام و رسمی'], ['warm', 'گرم'], ['bold', 'پررنگ و زنده']];
  RI.PALETTES = [
    { id: 'default', name: 'پیش‌فرض قالب', access: 'free', colors: null },
    { id: 'ice', group: 'calm', name: 'آبی یخی', access: 'free', colors: ['#52788d', '#a47248'] },
    { id: 'slate', group: 'calm', name: 'سنگی', access: 'free', colors: ['#56687a', '#b07d52'] },
    { id: 'stone', group: 'calm', name: 'خاکستری گرم', access: 'free', colors: ['#7a6e62', '#4f7a8a'] },
    { id: 'sage', group: 'calm', name: 'سبز مات', access: 'sub', colors: ['#5e8b7e', '#b08457'] },
    { id: 'mist', group: 'calm', name: 'آبی مه', access: 'sub', colors: ['#5f84aa', '#c39a72'] },
    { id: 'olive', group: 'calm', name: 'زیتونی', access: 'sub', colors: ['#6e7b4c', '#a8704c'] },
    { id: 'cocoa', group: 'warm', name: 'قهوه‌ای گرم', access: 'free', colors: ['#875a36', '#52788d'] },
    { id: 'terracotta', group: 'warm', name: 'آجری', access: 'free', colors: ['#b3573a', '#3f6e7a'] },
    { id: 'sand', group: 'warm', name: 'شنی', access: 'buy', price: 46000, colors: ['#b08457', '#5b7482'] },
    { id: 'amber', group: 'warm', name: 'کهربایی', access: 'sub', colors: ['#b8862b', '#3d5c6f'] },
    { id: 'rose', group: 'warm', name: 'گلبهی', access: 'sub', colors: ['#b05470', '#557a8c'] },
    { id: 'copper', group: 'warm', name: 'مسی', access: 'sub', colors: ['#a8613a', '#2f6475'] },
    { id: 'emerald', group: 'bold', name: 'زمردی', access: 'free', colors: ['#1f8a63', '#c9853f'] },
    { id: 'ocean', group: 'bold', name: 'اقیانوسی', access: 'free', colors: ['#1d6fb8', '#e0a04f'] },
    { id: 'navy', group: 'bold', name: 'سرمه‌ای', access: 'sub', colors: ['#34508a', '#c79a6b'] },
    { id: 'teal', group: 'bold', name: 'فیروزه‌ای', access: 'sub', colors: ['#157a86', '#d08a54'] },
    { id: 'indigo', group: 'bold', name: 'نیلی', access: 'sub', colors: ['#4b4fb5', '#d9a25a'] },
    { id: 'plum', group: 'bold', name: 'آلویی', access: 'sub', colors: ['#7b3f8c', '#cf9a62'] },
    { id: 'crimson', group: 'bold', name: 'زرشکی', access: 'sub', colors: ['#a8263c', '#2f6b8a'] },
    { id: 'custom', group: 'custom', name: 'رنگ دلخواه', access: 'sub', colors: null },
  ];

  /* ---------- هماهنگی رنگ ----------
     A palette gives two seed colors; every template derives its own readable set from them, so one color choice
     changes the whole page consistently and never puts dark text on a dark background or the reverse. */
  const hexRgb = (h) => { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgbHex = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const isHex = (h) => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);
  function lum(h) { return hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(a, b, t) { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); }
  function toHsl(h) { const [r, g, b] = hexRgb(h).map((v) => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(hue * 60 + 360) % 360, s, l]; }
  function fromHsl(h, s, l) { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2, [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return rgbHex([r, g, b].map((v) => (v + m) * 255)); }
  // Moves only lightness (dark on light backgrounds, light on dark ones) until every background reaches the ratio.
  function readable(color, backgrounds, ratio) {
    if (!isHex(color)) return color;
    const ok = (c) => backgrounds.every((b) => !isHex(b) || contrast(c, b) >= ratio);
    if (ok(color)) return color;
    const [h, s, l] = toHsl(color), dark = backgrounds.filter(isHex).reduce((n, b) => n + lum(b), 0) / Math.max(1, backgrounds.filter(isHex).length) < 0.25;
    for (let i = 1; i <= 40; i++) { const c = fromHsl(h, dark ? Math.min(s, 0.75) : s, dark ? l + (1 - l) * i / 40 : l * (1 - i / 40)); if (ok(c)) return c; }
    return dark ? '#ffffff' : '#000000';
  }
  const onColor = (c) => contrast(c, '#ffffff') >= contrast(c, '#111111') ? '#ffffff' : '#111111';
  RI.color = { lum, contrast, mix, readable, onColor, isHex, toHsl, fromHsl };
  // A pleasant second color for a custom accent: a calm complementary tone.
  RI.secondColor = (c) => { const [h, s] = toHsl(c); return fromHsl((h + 150) % 360, Math.min(0.42, s * 0.6 + 0.12), 0.48); };
  RI.paletteColors = (theme, key = 'palette') => {
    const id = theme && theme[key];
    if (id === 'custom') return isHex(theme.custom) ? [theme.custom.toLowerCase(), RI.secondColor(theme.custom)] : null;
    const p = RI.PALETTES.find((x) => x.id === id);
    return p && p.colors ? p.colors : null;
  };
  // Template variables (bg, surface, ink, muted, accent, accent2, hero, line) re-derived from two seed colors.
  RI.harmonize = (v, colors) => {
    if (!colors) return v;
    const dark = lum(v.bg) < 0.2, base = dark ? v.surface : v.bg;
    const accent = readable(colors[0], [v.bg, v.surface], 4.5), accent2 = readable(colors[1], [v.bg], 3);
    return Object.assign({}, v, {
      accent, accent2,
      muted: readable(mix(v.muted, accent, 0.14), [v.bg, v.surface], 4.5),
      line: mix(v.line, colors[0], dark ? 0.24 : 0.18),
      hero: 'linear-gradient(135deg,' + mix(base, colors[0], dark ? 0.36 : 0.24) + ',' + mix(v.bg, colors[1], dark ? 0.08 : 0.06) + ')',
    });
  };
  // A gradient background is judged by the average of its colour stops.
  const solid = (bg) => { if (isHex(bg)) return bg; const stops = String(bg || '').match(/#[0-9a-f]{6}/gi) || []; return stops.length ? stops.reduce((acc, c, i) => mix(acc, c, 1 / (i + 1))) : '#ffffff'; };
  RI.color.solid = solid;
  // Link pages: filled buttons in the accent with readable text, borders and highlights from the same color.
  RI.harmonizeLinks = (v, colors) => {
    if (!colors) return v;
    const page = solid(v.bg);
    let btn = colors[0]; if (Math.max(contrast(btn, '#ffffff'), contrast(btn, '#111111')) < 4.5) btn = readable(btn, ['#ffffff'], 4.5);
    return Object.assign({}, v, { btnBg: btn, btnInk: onColor(btn), btnBd: mix(btn, page, 0.35), accent: readable(colors[0], [page], 3) });
  };
  // Imported templates carry many raw colors; those close in hue to the template's own accents follow the palette
  // (same lightness, so hover and gradient steps keep their order) and keep at least their original contrast.
  RI.remapAccent = (raw, sources, colors, bg) => {
    if (!colors || !isHex(raw)) return raw;
    // Backgrounds (very dark), tints (very light), greys and brand colours further away in hue keep their value.
    const [h, s, l] = toHsl(raw); if (s < 0.35 || l < 0.2 || l > 0.85) return raw;
    const dist = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    let best = -1, gap = 14;
    sources.forEach((src, i) => { const d = dist(h, toHsl(src)[0]); if (d < gap) { gap = d; best = i; } });
    if (best < 0) return raw;
    const [th, ts] = toHsl(colors[best]), next = fromHsl(th, Math.max(0.2, Math.min(1, ts * (s / Math.max(0.2, toHsl(sources[best])[1])))), l);
    return isHex(bg) ? readable(next, [bg], Math.min(4.5, contrast(raw, bg))) : next;
  };

  /* ---------- پلن‌ها (خرید با It، شارژ آنلاین غیرفعال) ---------- */
  /* Fandogh. Using a model is paid from the person's Fandogh wallet, topped up with It: each answer costs the tokens
     it really used at the model's API price, plus the owner's margin (75% by default), kept and shown in toman (and,
     for reading, in GPT-6 Luna tokens). The plans open models and come with starter credit: level 0 is free, «آرش»
     opens the fast models, «رستم» the strong ones and «کوروش» everything, Fable, Opus, Astra and Sol included; a
     ResumeIt subscription opens every model too. Local Fandogh and a person's own key stay free. */
  RI.ASSISTANT_TIERS = ['رایگان', 'آرش', 'رستم', 'کوروش'];
  RI.ASSISTANT_PLANS = {
    arash: { id: 'arash', name: 'آرش', title: 'آرش کمانگیر', period: 'یک‌ماهه', months: 1, level: 1, credit: 30000, price: 210000, desc: 'مدل‌های سریع گوگل و Moonshot کنار مدل‌های سبک.' },
    rostam: { id: 'rostam', name: 'رستم', title: 'رستم دستان', period: 'یک‌ماهه', months: 1, level: 2, credit: 60000, price: 360000, desc: 'مدل‌های قوی مثل Claude Sonnet، Gemini Pro و Kimi K3.' },
    kourosh: { id: 'kourosh', name: 'کوروش', title: 'کوروش بزرگ', period: 'یک‌ماهه', months: 1, level: 3, credit: 100000, price: 510000, desc: 'همهٔ مدل‌ها، از جمله Claude Fable و Opus و GPT-6 Astra و Sol.' },
  };
  // Earlier monthly assistant purchases keep working at the first level.
  RI.ASSISTANT_LEGACY = { m1: 'arash', m3: 'arash', m6: 'arash' };
  // A ResumeIt subscription opens every model and adds starter credit; new accounts get a little to try with.
  RI.ASSISTANT_SITE = { level: 3, credit: 20000 };
  RI.ASSISTANT_WELCOME = 5000;
  // Top-up amounts offered in It.
  RI.FANDOGH_TOPUPS = [5, 10, 25, 50, 100];
  RI.PLANS = {
    q: { id: 'q', name: 'رخش', period: 'سه‌ماهه', months: 3, price: 288000 },
    h: { id: 'h', name: 'سیمرغ', period: 'شش‌ماهه', months: 6, price: 510000 },
    y: { id: 'y', name: 'هما', period: 'سالانه', months: 12, price: 900000 },
  };
  RI.PLAN_FEATURES = [
    ['تعداد رزومهٔ مستقل', '۱', '۲'],
    ['تعداد صفحهٔ لینک مستقل', '۱', '۳'],
    ['قالب‌ها و فونت‌های استارتی', true, true],
    ['بارگذاری تصویر در ویرایشگر', 'تا ۴۰۰ کیلوبایت برای هر تصویر', 'تا ۲ مگابایت برای هر تصویر'],
    ['قالب‌های اشتراکی و ویژه', false, true],
    ['حذف نشان رزومیت و امضای اختصاصی در هر صفحه', false, true],
    ['بلوک متن و تصویر در صفحهٔ لینک', false, true],
    ['خروجی CSV آمار بازدید و کلیک', false, true],
    ['فونت‌های پولی', 'خرید یک‌باره', 'خرید یک‌باره'],
    ['انتشار روی زیردامنهٔ resumeit.ir', true, true],
    ['اتصال دامنهٔ مستقل', 'فعلاً غیرفعال', 'فعلاً غیرفعال'],
  ];

  /* ---------- نمونهٔ کاربر ---------- */
  function blank() {
    return {
      slug: '',
      routing: { resume: '', links: 'link' },
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
        style: { align: 'center', ring: true, bgOverride: null, matchResume: false },
      },
      theme: { resume: 'glacier', links: 'frost', font: 'vazir', palette: 'default', linksPalette: 'default', custom: '', radius: 'soft' },
      inbox: { enabled: true },
      share: { title: '', desc: '', image: null },
      branding: { resume: { mode: 'resumeit', text: '' }, links: { mode: 'resumeit', text: '' } },
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
  RI.TAKEN_SLUGS.push('staff',...RI.RESUME_TEMPLATES.map(t=>'resume'+t.id),...RI.LINK_TEMPLATES.map(t=>'link'+t.id));
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
