/* Pure, bounded text analysis shared by the worker and Node tests. */
(function (root) {
  'use strict';
  const VERSION = '3.0.0';
  const normalize = value => String(value || '').normalize('NFC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[۰-۹٠-٩]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c) >= 0 ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(c) : '٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s\u200c]+/g, ' ').trim().toLowerCase();
  // Non-security identity only; apply additionally checks exact source text and input SHA-256.
  function key(value) { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0).toString(36); }
  const lexicon = [
    ['sql', 'sql'], ['python', 'python|پایتون'], ['javascript', 'javascript|جاوااسکریپت|جاوا اسکریپت'], ['typescript', 'typescript|تایپ اسکریپت'],
    ['react', 'react|ری اکت|ری‌اکت'], ['node', 'node.js|nodejs'], ['c++', 'c++'], ['c#', 'c#'], ['.net', '.net'], ['ci/cd', 'ci/cd'],
    ['excel', 'excel|اکسل'], ['figma', 'figma|فیگما'], ['photoshop', 'photoshop|فتوشاپ'], ['git', 'git'], ['css', 'css'], ['html', 'html'],
    ['documentation', 'مستندسازی|مستندات|documentation'], ['teaching', 'تدریس|آموزش دادن|teaching'], ['sales', 'فروش|sales'],
    ['research', 'پژوهش|research'], ['analysis', 'تحلیل داده|data analysis'], ['design', 'طراحی محصول|طراحی رابط|product design'],
    ['support', 'پشتیبانی|customer support'], ['accounting', 'حسابداری|accounting'], ['operations', 'عملیات|operations'],
    ['java', 'java|جاوا'], ['php', 'php'], ['golang', 'golang'], ['kotlin', 'kotlin|کاتلین'], ['swift', 'swift'], ['flutter', 'flutter|فلاتر'],
    ['django', 'django|جنگو'], ['laravel', 'laravel|لاراول'], ['vue', 'vue|vue.js'], ['angular', 'angular|انگولار'], ['next', 'next.js|nextjs'], ['tailwind', 'tailwind|tailwindcss'],
    ['docker', 'docker|داکر'], ['kubernetes', 'kubernetes|k8s'], ['linux', 'linux|لینوکس'], ['aws', 'aws'], ['postgresql', 'postgresql|postgres'], ['mysql', 'mysql'], ['mongodb', 'mongodb'],
    ['powerbi', 'power bi|powerbi'], ['tableau', 'tableau'], ['illustrator', 'illustrator|ایلاستریتور'], ['aftereffects', 'after effects|افتر افکت'], ['premiere', 'premiere|پریمیر'],
    ['uiux', 'ui/ux|ux|تجربه کاربری|رابط کاربری'], ['seo', 'seo|سئو'], ['marketing', 'بازاریابی|مارکتینگ|marketing'], ['socialmedia', 'شبکه های اجتماعی|سوشال مدیا|social media'],
    ['content', 'تولید محتوا|محتوانویسی|کپی رایتینگ|copywriting|content writing'], ['projectmanagement', 'مدیریت پروژه|project management'], ['agile', 'اسکرام|اجایل|scrum|agile'], ['jira', 'jira|جیرا'],
    ['autocad', 'autocad|اتوکد'], ['solidworks', 'solidworks|سالیدورکس'], ['matlab', 'matlab|متلب'], ['ml', 'یادگیری ماشین|machine learning'], ['office', 'آفیس|word|powerpoint|پاورپوینت']
  ].map(([id, aliases]) => ({ id, aliases: aliases.split('|').map(normalize) }));
  // Display names for skills found in the user's own text; ids stay stable for evidence and feedback.
  const SKILL_LABELS={sql:'SQL',python:'Python',javascript:'JavaScript',typescript:'TypeScript',react:'React',node:'Node.js','c++':'C++','c#':'C#','.net':'.NET','ci/cd':'CI/CD',excel:'Excel',figma:'Figma',photoshop:'Photoshop',git:'Git',css:'CSS',html:'HTML',documentation:'مستندسازی',teaching:'تدریس',sales:'فروش',research:'پژوهش',analysis:'تحلیل داده',design:'طراحی محصول',support:'پشتیبانی مشتری',accounting:'حسابداری',operations:'مدیریت عملیات',java:'Java',php:'PHP',golang:'Go',kotlin:'Kotlin',swift:'Swift',flutter:'Flutter',django:'Django',laravel:'Laravel',vue:'Vue.js',angular:'Angular',next:'Next.js',tailwind:'Tailwind CSS',docker:'Docker',kubernetes:'Kubernetes',linux:'Linux',aws:'AWS',postgresql:'PostgreSQL',mysql:'MySQL',mongodb:'MongoDB',powerbi:'Power BI',tableau:'Tableau',illustrator:'Illustrator',aftereffects:'After Effects',premiere:'Premiere',uiux:'طراحی UI/UX',seo:'سئو',marketing:'بازاریابی',socialmedia:'مدیریت شبکه‌های اجتماعی',content:'تولید محتوا',projectmanagement:'مدیریت پروژه',agile:'Scrum / Agile',jira:'Jira',autocad:'AutoCAD',solidworks:'SolidWorks',matlab:'MATLAB',ml:'یادگیری ماشین',office:'Microsoft Office'};
  for(const skill of lexicon)skill.label=SKILL_LABELS[skill.id]||skill.id;
  const goalRoles=[
    {id:'teaching',aliases:['تدریس','معلم','مدرس','دبیر','آموزگار','teacher','teaching'],skills:['تدریس','طراحی درس','مدیریت کلاس','ارزشیابی آموزشی','Microsoft Office']},
    {id:'development',aliases:['برنامه نویس','برنامه نویسی','توسعه دهنده','توسعه نرم افزار','developer','programmer','software engineer'],skills:['Git','JavaScript','TypeScript','React','Node.js','SQL','Docker']},
    {id:'design',aliases:['طراح','طراحی گرافیک','طراحی رابط','گرافیست','designer','ui designer','ux designer','product designer'],skills:['Figma','طراحی UI/UX','Illustrator','Photoshop','طراحی سیستم طراحی','نمونه‌سازی']},
    {id:'data',aliases:['تحلیلگر داده','تحلیل گر داده','تحلیل داده','دانشمند داده','data analyst','data scientist','bi'],skills:['SQL','Python','Excel','Power BI','تحلیل داده','آمار']},
    {id:'marketing',aliases:['بازاریابی','مارکتینگ','دیجیتال مارکتینگ','سئو','marketing','digital marketing','seo'],skills:['بازاریابی','سئو','تولید محتوا','مدیریت شبکه‌های اجتماعی','Google Analytics','تبلیغات آنلاین']},
    {id:'sales',aliases:['فروش','کارشناس فروش','نماینده فروش','sales','account manager'],skills:['فروش','مذاکره','مدیریت ارتباط با مشتری','پیگیری مشتری','Excel']},
    {id:'support',aliases:['پشتیبانی','پشتیبان','خدمات مشتری','customer support','customer service','help desk'],skills:['پشتیبانی مشتری','حل مسئله','ارتباط مؤثر','Jira','مستندسازی']},
    {id:'accounting',aliases:['حسابدار','حسابداری','مالی','accountant','accounting','finance'],skills:['حسابداری','Excel','نرم‌افزار حسابداری','گزارش مالی','مالیات']},
    {id:'content',aliases:['تولید محتوا','نویسنده','محتوانویس','کپی رایتر','ویراستار','copywriter','content writer','editor'],skills:['تولید محتوا','ویراستاری','سئو','داستان‌گویی','پژوهش']},
    {id:'management',aliases:['مدیر پروژه','مدیر محصول','مدیریت پروژه','project manager','product manager','scrum master'],skills:['مدیریت پروژه','Scrum / Agile','Jira','برنامه‌ریزی','ارتباط با ذی‌نفعان']}
  ].map(role=>({...role,aliases:role.aliases.map(normalize)}));
  const roleSkills=id=>goalRoles.find(role=>role.id===id)?.skills||[];
  // Persian typography fixes that never change wording: Arabic letters, half-spaces, punctuation spacing.
  function typography(raw){
    if(typeof raw!=='string')return raw;
    return raw.replace(/ي/g,'ی').replace(/ك/g,'ک')
      .replace(/(^|[\s(«])(ن?می) +(?=[آ-ی])/g,'$1$2‌')
      .replace(/([آ-ی]) +(ها|های|هایی|هایم|هایت|هایش|هایمان|هایتان|هایشان)(?=$|[\s،.؛:!؟)»])/g,'$1‌$2')
      .replace(/([آ-ی]) +([،؛؟!:.])/g,'$1$2')
      .replace(/([،؛؟])(?=[آ-یA-Za-z0-9])/g,'$1 ')
      .replace(/([آ-ی]) *, *(?=[آ-ی])/g,'$1، ');
  }
  const goalRole=goal=>goalRoles.find(role=>mentions(normalize(goal),role))?.id||null;
  function mentions(text, skill) { return skill.aliases.some(alias => { let i = text.indexOf(alias); while (i >= 0) { const word = /[\p{L}\p{N}_]/u; if ((!i || !word.test(text[i - 1])) && (i + alias.length === text.length || !word.test(text[i + alias.length]))) return true; i = text.indexOf(alias, i + 1); } return false; }); }
  function clauses(raw) {
    const out = []; const expression = /[^؛;!?؟\n]+[؛;!?؟\n]?/g; let match;
    while ((match = expression.exec(raw))) {
      const separators=/\s+(?:و|اما|ولی|بلکه|but|and)\s+(?=(?:با\s|قصد\s|اکنون\s|می[\s‌]?خواهم|رابط\s|مدیر\s|نقش\s|من\s|I\s|we\s|used\s|built\s))/gi;let from=0,split;
      const push=(a,b)=>{const start=match.index+a,end=match.index+b;out.push({raw:raw.slice(start,end),start,end,text:normalize(raw.slice(start,end))});};
      while((split=separators.exec(match[0]))){push(from,split.index);from=split.index+split[0].length;}push(from,match[0].length);
    }
    return out;
  }
  function semantics(text) {
    const correlative = /نه تنها|not only/.test(text);
    const negative = (!correlative && /نکرد|نمی کن|نمی‌کن|نمی کنم|نمی‌کنم|نبود|نیستم|ندار|بلد نیست|استفاده نمی|\b(?:not|never|no experience)\b/.test(text));
    const intended = /قصد دار|می خواهم|می‌خواهم|خواهم|علاقه مند|علاقه‌مند|در حال یادگیری|\b(?:learning|plan to|want to|intend to)\b/.test(text);
    const third = /همکارم|دوستم|او |\b(?:he|she|colleague)\b/.test(text);
    const action = /ساختم|ساختیم|نوشتم|نوشتیم|استخراج کردم|طراحی کردم|تحلیل کردم|تدریس کردم|ارائه کردم|کار کردم|پیاده سازی کردم|\b(?:built|wrote|created|implemented|taught|analyzed|developed|used)\b/.test(text);
    const artifact = /نمودار|گزارش|راهنما|مستند|نمونه|محصول|سرویس|پژوهش|درس|دوره|کتابخانه|\b(?:chart|report|guide|prototype|service|library|lesson)\b/.test(text);
    const team = /تیم|همکاری|مشارکت|کمک|ساختیم|نوشتیم|\b(?:we|team|helped|contributed)\b/.test(text);
    return { status: negative ? 'negated' : intended ? 'intended-learning' : third ? 'third-party' : action ? 'practical-supported' : 'positive-mention', action, artifact, ownership: team ? 'collaborative' : 'individual', weight: negative || intended || third ? 0 : action ? artifact ? .8 : .65 : .15 };
  }
  const featureCache=new Map();let cacheBytes=0;
  function features(raw,role){
    const id=role+'\0'+raw;
    if(featureCache.has(id)){const entry=featureCache.get(id);featureCache.delete(id);featureCache.set(id,entry);return entry.value;}
    const value=clauses(raw).map(clause=>({...clause,relation:semantics(clause.text),skills:lexicon.filter(skill=>mentions(clause.text,skill))})),bytes=id.length*2+JSON.stringify(value).length*2;
    while(featureCache.size&&(cacheBytes+bytes>4*1024*1024||featureCache.size>=2000)){const oldest=featureCache.keys().next().value;cacheBytes-=featureCache.get(oldest).bytes;featureCache.delete(oldest);}
    if(bytes<=4*1024*1024){featureCache.set(id,{value,bytes});cacheBytes+=bytes;}
    return value;
  }
  function dateRange(raw) {
    const text = normalize(raw), match = /^(\d{4})(?:[/.\-](\d{1,2})(?:[/.\-](\d{1,2}))?)?$/.exec(text);
    if (!match) return null;
    const year = +match[1], month = match[2] ? +match[2] : null, day = match[3] ? +match[3] : null, calendar = year >= 1900 && year <= 2200 ? 'gregorian' : year >= 1300 && year <= 1600 ? 'jalali' : null;
    if (!calendar || month !== null && (month < 1 || month > 12)) return null;
    const days = month === null ? 31 : calendar === 'gregorian' ? new Date(Date.UTC(year, month, 0)).getUTCDate() : month <= 6 ? 31 : month < 12 ? 30 : 29;
    // Ambiguous Jalali leap-day is deliberately left unassessed.
    if (day !== null && (day < 1 || day > days)) return null;
    return { calendar, earliest: year * 10000 + (month || 1) * 100 + (day || 1), latest: year * 10000 + (month || 12) * 100 + (day || days) };
  }
  function priority(x) {
    const c = { high: 1, medium: .7, low: .4 }[x.confidence], cap = { high: 100, medium: 60, low: 30 }[x.confidence];
    return Math.round(Math.min(cap, 100 * (.45 * x.I + .25 * x.G + .20 * x.A + .10 * x.D) * c * (1 - .25 * x.E)) * 10) / 10;
  }
  const validSource = s => s.visibility === 'public' && ['user-authored', 'user-confirmed'].includes(s.provenance);
  function project(content, importedSpec) {
    const sources = [], add = (section, itemId, field, raw, visibility = 'public', provenance = 'user-authored', maxLength = 300, textRole) => {
      if (typeof raw === 'string' && raw.trim()) sources.push({ section, itemId, field, raw, visibility, provenance, maxLength, ...(textRole?{textRole}:{}) });
    };
    for(const [field,maxLength]of [['title',90],['bio',300]])sources.push({section:'profile',itemId:'profile',field,raw:typeof content.profile[field]==='string'?content.profile[field]:'',visibility:'public',provenance:'user-authored',maxLength});
    const visible = name => content.sections.some(s => s.key === name && s.visible);
    for (const name of ['skills', 'experience', 'education', 'projects', 'certs', 'languages']) for (const item of content[name] || []) {
      for (const field of ['name', 'role', 'org', 'degree', 'school', 'title', 'desc', 'from', 'to', 'url']) if (!(field === 'to' && item.current)) add(name, item.id, field, item[field], visible(name) ? 'public' : 'hidden', 'user-authored', name === 'projects' ? 280 : name === 'education' ? 240 : 300);
    }
    if (importedSpec) {
      // Common resume fields not rendered by this template cannot supply public evidence.
      for (const s of sources) if (s.section !== 'profile' && !importedSpec.sections.includes(s.section)) s.visibility = 'hidden';
      const values = content.resumeTemplates?.[content.theme.resume] || {};
      const fieldKeys=node=>{const keys=new Set();const walk=n=>{if(!n||typeof n!=='object')return;if(n.field)keys.add(n.field);if(n.icon)keys.add(n.icon);if(n.original)walk(n.original);if(n.attrs)Object.values(n.attrs).forEach(walk);if(n.children)n.children.forEach(walk);};walk(node);return keys;};
      const collections=(importedSpec.collections||[]).filter(c=>importedSpec.groups.some(g=>g.key===c.group)).map(c=>({...c,fieldKeys:fieldKeys(c.node)}));
      for (const field of importedSpec.fields) {
        if (field.bind || field.legacy || !importedSpec.groups.some(g=>g.key===field.group) || !['text', 'textarea', 'percent'].includes(field.type)) continue;
        const visibility = values.settings?.['show_' + String(field.group).replace(/:/g, '_')] === false ? 'hidden' : 'public';
        const raw = Object.hasOwn(values.fields || {}, field.key) ? values.fields[field.key] : field.default;
        const textRole=field.type==='textarea'?'description':'label';
        const owners=collections.filter(c=>c.group===field.group&&c.fieldKeys.has(field.key));
        if(!owners.length)add('template', content.theme.resume, field.key, raw, visibility, 'template-example', field.max || 1000,textRole);
        for (const collection of owners) for (const row of values.collections?.[collection.key] ?? [{id:'original',fields:{}}]) add('template', content.theme.resume + ':' + collection.key + ':' + row.id, field.key,Object.hasOwn(row.fields||{},field.key)?row.fields[field.key]:raw, visibility, 'template-example', field.max || 1000,textRole);
      }
    }
    return sources;
  }
  async function analyze(input, cancelled = () => false) {
    const sources = input.sources || [], context = input.context || {}, findings = [], assessed = [], skipped = [], evidence = {}, queryDigests = {};
    let size = 0, unsupported = 0;
    const seen = new Set(), yieldWork = () => new Promise(resolve => setTimeout(resolve, 0));
    const add = (ruleId, s, message, options = {}) => {
      const id = ruleId + ':' + key([s.section, s.itemId, s.field, options.memberKey || '', context.goal || '', input.jdDigest || ''].join('|'));
      if(findings.some(f=>f.id===id))return;
      const deps = options.dependencies || [s.raw, s.visibility, s.provenance];
      const finding = { id, ruleId, ruleVersion: 1, target: { section: s.section, itemId: s.itemId, field: s.field }, message, type: options.type || 'question', confidence: options.confidence || 'high', dependencyDigest: key(JSON.stringify(deps)), evidence: options.private ? [] : [{ raw: s.raw.slice(0, 200), start: 0, end: Math.min(200, s.raw.length) }], ...options };
      finding.priority = priority({ I: options.impact || .6, G: context.goal ? 1 : .5, A: .9, D: .9, E: .1, confidence: finding.confidence });
      findings.push(finding);
    };
    for (let i = 0; i < sources.length; i++) {
      if (cancelled()) return null;
      const s = sources[i];
      if (s.visibility !== 'public') continue;
      if (!validSource(s)) { unsupported++; continue; }
      if(s.deferred){skipped.push(s);continue;}
      if (size + s.raw.length > 100000) { skipped.push(s); continue; }
      size += s.raw.length; assessed.push(s);
      const text = normalize(s.raw), sourceGroup = s.field==='desc'?s.section+':text:'+key(text):s.section + ':' + s.itemId;
      for (const clause of ['org','school'].includes(s.field)?[]:features(s.raw,s.section+':'+s.field)) for (const skill of clause.skills) {
        const relation = {...clause.relation};
        if(relation.status==='negated'&&clause.skills.length>1&&/اما|ولی|\bbut\b/.test(clause.text)){relation.status='unknown';relation.weight=0;}
        if(relation.weight>0&&/تیم|team/.test(clause.text)&&skill.id!=='documentation'&&/مستند|documentation/.test(clause.text)&&!skill.aliases.some(alias=>clause.text.includes('با '+alias)||clause.text.includes('using '+alias))){relation.weight=.45;relation.action=false;relation.status='related-context';}
        (evidence[skill.id] ||= []).push({ sourceGroup, s, ...clause, ...relation });
      }
      if (s.field === 'url' && s.raw && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(/^https?:/.test(s.raw) ? s.raw : 'https://' + s.raw)) add('URL-SYNTAX', s, 'این آدرس را با نام دامنهٔ کامل بررسی کن.', { type: 'issue' });
      if(s.field==='url'){try{const host=new URL(/^https?:/.test(s.raw)?s.raw:'https://'+s.raw).hostname;if(/^(?:localhost|127\.|10\.|192\.168\.|\[?::1\]?$)|\.(?:local|internal)$/.test(host))add('URL-SYNTAX',s,'این آدرس محلی است و احتمالاً برای بازدیدکنندهٔ رزومه در دسترس نیست؛ آدرس عمومی را جایگزین کن.',{type:'question'});}catch{}}
      if(s.section==='profile'&&s.field==='title'&&/^(?:رزومه|رزومه من|نمونه کار|متخصص|professional|my resume)$/.test(text))add('HEADLINE-CLARITY',s,'این عنوان حوزهٔ کارت را روشن نمی‌کند؛ یک عنوان واقعی حرفه‌ای یا تحصیلی انتخاب کن.',{confidence:'medium'});
      if (['bio', 'desc'].includes(s.field)||s.section==='template'&&s.textRole==='description') {
        const after = s.raw.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
        if (after !== s.raw) add('TEXT-READABILITY', s, 'فاصله‌های اضافه را می‌توان مرتب کرد؛ متن و معنای جمله حفظ می‌شود.', { type: s.section==='template'?'question':'rewrite', before: s.raw, after });
        if (s.raw.length > 220 && !/[؛;.!?؟\n]/.test(s.raw)) add('TEXT-READABILITY', s, 'این جمله را در محل تغییر موضوع به دو جمله تقسیم کن.', { confidence: 'medium' });
      }
      if (s.field === 'desc' && s.section === 'experience' && /(?:تیم|team)/.test(text) && !/(?:نقش من|مسئول|کمک|همکاری|my role|responsible|contributed)/.test(text)) add('ROLE-OWNERSHIP', s, 'سهم خودت در این همکاری چه بود؟ همان نقش واقعی را در یک جمله اضافه کن.', { confidence: 'medium' });
      const workOutput = s.field === 'desc' && ['experience', 'projects'].includes(s.section) && !semantics(text).artifact && /^(?:کار با|فعالیت در|مسئول امور|worked on)\s+.{1,60}$/.test(text);
      if (workOutput) add('WORK-OUTPUT', s, 'چه چیزی ساختی، ارائه کردی یا به پایان رساندی؟ یک خروجی واقعی کافی است؛ عدد لازم نیست.', { confidence: 'medium' });
      if (s.section !== 'template' && ['bio', 'desc', 'title'].includes(s.field)) {
        const fixed = typography(s.raw);
        if (fixed !== s.raw && fixed.length <= s.maxLength) add('PERSIAN-TYPOGRAPHY', s, 'نگارش فارسی این متن را مرتب کن: نیم‌فاصله، حروف عربی و فاصلهٔ علائم. کلمه‌ها همان می‌مانند.', { type: 'rewrite', before: s.raw, after: fixed, impact: .45 });
      }
      if (s.field === 'desc' && ['experience', 'projects'].includes(s.section)) {
        if (s.raw.trim().length < 25) add('DESC-DEPTH', s, 'این توضیح خیلی کوتاه است؛ یک جمله دربارهٔ کاری که کردی و نتیجه‌اش اضافه کن.', { confidence: 'medium', impact: .55 });
        else if (!workOutput && /^(?:مسئول|مسئولیت|وظیفه|وظایف|انجام امور|انجام کارهای|responsible for|duties)/.test(text)) add('ACTION-OPENER', s, 'جمله را با کاری که خودت انجام دادی شروع کن؛ مثل «طراحی کردم»، «راه‌اندازی کردم» یا «پشتیبانی کردم». فهرست وظیفه کمتر از کار انجام‌شده می‌گوید.', { confidence: 'medium', impact: .6 });
        if (s.section === 'experience' && s.raw.trim().length >= 40 && !/\d/.test(text) && !/افزایش|کاهش|بهبود|رسید|رساندم|صرفه جویی|سریع تر|بیشتر|کمتر|improv|increas|reduc|grew|saved/.test(text)) add('IMPACT-EVIDENCE', s, 'اگر نتیجهٔ قابل‌اندازه‌گیری داری (عدد، درصد یا تعداد کاربر)، بنویسش؛ اگر نه، خروجی کار را روشن کن. چیزی را که واقعاً نبوده اضافه نکن.', { confidence: 'medium', impact: .5 });
      }
      if (s.section === 'profile' && s.field === 'bio' && s.raw.trim() && s.raw.trim().length < 40) add('BIO-DEPTH', s, 'معرفی کوتاه است؛ در دو یا سه جمله بگو چه کاری می‌کنی، در چه زمینه‌ای و دنبال چه فرصتی هستی.', { confidence: 'medium', impact: .55 });
      if (s.section === 'profile' && s.field === 'title' && s.raw.trim().length > 70) add('HEADLINE-LENGTH', s, 'عنوان طولانی است؛ آن را در یک خط کوتاه، حدود ۶۰ حرف، خلاصه کن تا بالای رزومه کامل دیده شود.', { confidence: 'medium', impact: .45 });
      if (s.raw.length >= 60 && s.field === 'desc') {
        const prior = assessed.slice(0, -1).find(x => x.section === s.section && x.field === s.field && normalize(x.raw) === text);
        if (prior) add('TEXT-REDUNDANCY', s, 'این توضیح با یک مورد دیگر یکسان است؛ تفاوت واقعی دو تجربه را مشخص کن.', { confidence: 'medium', dependencies: [prior.raw, s.raw, prior.itemId, s.itemId], comparisonTarget: prior.itemId });
      }
      if (i % 8 === 7) await yieldWork();
    }
    const eligible = sources.filter(s => s.visibility === 'public'), complete = !skipped.length;
    for (const s of assessed.filter(s => s.field === 'from')) {
      const end = assessed.find(x => x.section === s.section && x.itemId === s.itemId && x.field === 'to'), start = dateRange(s.raw), finish = end && dateRange(end.raw);
      if (start && finish && start.calendar === finish.calendar && finish.latest < start.earliest) add('DATE-ORDER', end, 'پایان این بازه پیش از شروع آن است؛ تاریخ‌ها را بررسی کن.', { type: 'issue', dependencies: [s.raw, end.raw] });
    }
    const records=new Map();
    for(const s of assessed.filter(s=>['experience','education'].includes(s.section))){const k=s.section+':'+s.itemId;(records.get(k)||records.set(k,[]).get(k)).push(s);}
    const priorRecords=new Map();
    for(const fields of records.values()){
      const signature=JSON.stringify(fields.map(s=>[s.field,normalize(s.raw)]).sort((a,b)=>a[0].localeCompare(b[0])));
      if(fields.some(s=>s.field==='from')&&fields.some(s=>s.field==='to')&&priorRecords.has(signature))add('DUP-RECORD',fields[0],'این مورد با یک سابقهٔ دیگر، از جمله تاریخ‌هایش، یکسان است؛ قبل از حذف، هر دو را مقایسه کن.',{confidence:'medium',dependencies:[signature,priorRecords.get(signature),fields[0].itemId]});
      else priorRecords.set(signature,fields[0].itemId);
    }
    const goal = normalize(context.goal || ''), job = normalize(context.job || '');
    const role=goalRole(goal),intro=assessed.filter(s=>s.section==='profile').map(s=>s.raw).join(' '),publicText=assessed.filter(s=>['profile','experience','projects'].includes(s.section)).map(s=>s.raw).join(' '),normalizedIntro=normalize(intro);
    const guide=(field,id,message)=>{const target=assessed.find(s=>s.section==='profile'&&s.field===field);if(target)add(id,target,message,{basis:'goal',type:'question',confidence:'medium',evidence:[],dependencies:[goal,intro,publicText,unsupported,skipped.length]});};
    if(role==='teaching'){
      if(!/ریاضی|فیزیک|شیمی|زبان|زیست|ادبیات|فارسی|ابتدایی|متوسطه|دانشگاه|پایه [\p{L}\d]+|mathematics|physics|english|primary|secondary/u.test(normalizedIntro))guide('title','GOAL-CLARITY','برای هدف تدریس، چه درس یا مهارتی و برای چه گروهی آموزش می‌دهی؟ اگر هنوز ننوشته‌ای، حوزه و مخاطب واقعی‌ات را در عنوان مشخص کن.');
      if(!/طرح درس|جزوه|کاربرگ|ویدیوی آموزشی|ویدئوی آموزشی|نمونه تدریس|lesson plan|teaching sample/.test(normalize(publicText)))guide('bio','GOAL-EXAMPLE','یک نمونهٔ واقعی مثل طرح درس، تمرین یا توضیح روش تدریست داری؟ اگر مناسب است، آن را در معرفی یا پروژه‌ها بیاور؛ لازم نیست سابقه یا نتیجه‌ای بسازی.');
    }else if(role==='development'){
      if(!/فرانت|بک اند|فول استک|وب|موبایل|داده|سیستم|frontend|backend|full stack|web|mobile|data/.test(normalizedIntro)&&!lexicon.some(skill=>['python','javascript','typescript','react','node','c++','c#','.net'].includes(skill.id)&&mentions(normalizedIntro,skill)))guide('title','GOAL-CLARITY','برای هدف برنامه‌نویسی، بیشتر روی چه شاخه‌ای کار می‌کنی؟ اگر هنوز روشن نیست، زمینهٔ واقعی مثل وب، موبایل یا داده را در عنوانت مشخص کن.');
      if(!semantics(normalize(publicText)).action||!semantics(normalize(publicText)).artifact)guide('bio','GOAL-EXAMPLE','یک پروژهٔ واقعی یا تمرینی انتخاب کن و بگو چه ساختی، از چه ابزاری استفاده کردی و سهم خودت چه بود؛ اگر هنوز ننوشته‌ای، معرفی یا پروژه‌ها جای مناسبی است.');
    }else if(role){
      const domains={design:/طراح|رابط|گرافیک|برند|محصول|ui|ux|graphic|brand|product/,data:/داده|تحلیل|گزارش|داشبورد|آمار|data|analy|dashboard|report/,marketing:/بازاریابی|سئو|محتوا|کمپین|تبلیغ|marketing|seo|campaign|content/,sales:/فروش|مشتری|بازار|sales|client|customer/,support:/پشتیبانی|مشتری|خدمات|support|service|customer/,accounting:/حساب|مالی|مالیات|بودجه|account|finance|tax|budget/,content:/محتوا|نویس|ویراست|مقاله|content|writ|edit|article/,management:/پروژه|محصول|تیم|برنامه ریزی|project|product|team|planning/};
      const examples={design:'یک نمونه‌کار واقعی (لینک یا تصویر) با توضیح مسئله‌ای که حل کردی',data:'یک تحلیل یا داشبورد واقعی و سؤالی که با آن جواب دادی',marketing:'یک کمپین یا محتوای واقعی و کانالی که در آن اجرا شد',sales:'یک تجربهٔ واقعی فروش یا پیگیری مشتری و نقش خودت در آن',support:'یک نمونهٔ واقعی از مشکلی که برای مشتری حل کردی',accounting:'یک کار واقعی مثل بستن دفاتر، گزارش ماهانه یا کار با نرم‌افزار حسابداری',content:'یک نمونه‌متن یا مقالهٔ منتشرشده با لینک',management:'یک پروژهٔ واقعی که هماهنگ کردی و سهم خودت در آن'};
      if(!domains[role].test(normalizedIntro))guide('title','GOAL-CLARITY','عنوانت هنوز حوزهٔ هدفت را روشن نمی‌کند؛ تخصص یا زمینهٔ واقعی خودت را در یک خط بنویس تا خواننده فوراً بفهمد دنبال چه کاری هستی.');
      if(!semantics(normalize(publicText)).action)guide('bio','GOAL-EXAMPLE','برای این هدف، '+examples[role]+' اضافه کن؛ در معرفی یا پروژه‌ها. فقط چیزی که واقعاً انجام داده‌ای.');
    }
    for (const skill of lexicon) {
      const rows = evidence[skill.id] || [], positive = rows.filter(x => x.weight > 0), groups = new Map();
      for (const row of positive) groups.set(row.sourceGroup, Math.max(groups.get(row.sourceGroup) || 0, row.weight));
      const weights = [...groups.values()].sort((a, b) => b - a), score = weights.length ? Math.min(1, weights[0] + .2 * (weights[1] || 0)) : 0;
      const dependencies = rows.map(x => [x.sourceGroup, normalize(x.raw), x.s.provenance, x.s.visibility]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      queryDigests[skill.id] = key(JSON.stringify(dependencies));
      const negative = rows.some(x => x.status === 'negated'), practical = positive.some(x => x.action);
      const conflict = negative && practical && rows.some(x => x.status === 'negated' && !/اکنون|امروز|now|currently/.test(x.text));
      if (conflict) add('FACT-CONFLICT', positive[0].s, 'در متن هم کاربرد و هم نفی این مهارت دیده می‌شود؛ زمان یا محدودهٔ هرکدام را روشن کن.', { memberKey: skill.id, dependencies, confidence: 'medium' });
      if (complete && positive.length && !negative && score < .2 && (mentions(goal, skill) || mentions(job, skill))) add('CLAIM-CONTEXT', positive[0].s, 'برای «' + skill.id + '» یک نمونهٔ واقعی از کاربردت داری؟ پروژهٔ تمرینی هم مناسب است.', { memberKey: skill.id, dependencies });
      if (job && mentions(job, skill) && !seen.has(skill.id)) { seen.add(skill.id); }
      evidence[skill.id] = { score: rows.length ? score : null, status: conflict ? 'conflict' : practical ? 'practical-supported' : negative ? 'negated' : rows.some(x=>x.status==='related-context')?'related-context':positive.length ? 'positive-mention' : rows[0]?.status || 'absent', sources: [...groups.keys()] };
    }
    for(const s of assessed.filter(s=>s.section==='skills'&&s.field==='name'))if(!lexicon.some(skill=>mentions(normalize(s.raw),skill)))evidence[normalize(s.raw)]={score:null,status:'unknown',sources:[]};
    // Skills the user already demonstrated in experience/projects text but never listed: offer a one-click add.
    const listed=assessed.filter(s=>s.section==='skills'&&s.field==='name').map(s=>normalize(s.raw));
    const skillsTarget={section:'skills',itemId:'skills',field:'name',raw:'',visibility:'public',provenance:'user-authored',maxLength:40};
    if(input.skillsListed!==false)for(const skill of lexicon){
      const e=evidence[skill.id];if(!e||e.status!=='practical-supported'||listed.some(name=>mentions(name,skill)))continue;
      const from=assessed.find(s=>e.sources.includes(s.field==='desc'?s.section+':text:'+key(normalize(s.raw)):s.section+':'+s.itemId)&&['experience','projects'].includes(s.section));
      if(!from)continue;
      add('SKILL-FROM-TEXT',skillsTarget,'«'+skill.label+'» را در متن رزومه‌ات به کار برده‌ای ولی در فهرست مهارت‌ها نیست. اضافه‌اش کنی؟',{type:'add-skill',skill:skill.label,memberKey:skill.id,evidence:[{raw:from.raw.slice(0,200),start:0,end:Math.min(200,from.raw.length)}],dependencies:[skill.id,listed,e.sources],impact:.5,confidence:'medium'});
    }
    for (const contact of input.privateContacts || []) {
      if (contact.length < 5) continue;
      const s = assessed.find(s => normalize(s.raw).includes(normalize(contact)));
      if (s) add('PRIV-EXPOSE', s, 'یک راه تماس که پنهان کرده‌ای در متن عمومی دیده می‌شود؛ مقدار را از این متن بردار.', { type: 'issue', private: true, impact: 1 });
    }
    if (cancelled()) return null;
    // Privacy first: a field that leaks a hidden contact only gets the privacy finding, never quoted elsewhere.
    const leaked=new Set(findings.filter(f=>f.ruleId==='PRIV-EXPOSE').map(f=>f.target.section+'|'+f.target.itemId+'|'+f.target.field));
    for(let i=findings.length-1;i>=0;i--)if(findings[i].ruleId!=='PRIV-EXPOSE'&&leaked.has(findings[i].target.section+'|'+findings[i].target.itemId+'|'+findings[i].target.field))findings.splice(i,1);
    const ordered = findings.sort((a, b) => (b.ruleId === 'PRIV-EXPOSE') - (a.ruleId === 'PRIV-EXPOSE') || b.priority - a.priority || a.id.localeCompare(b.id));
    const topIds = [], sections = new Map(), causes = new Set();
    for (const f of ordered) if (topIds.length < 3 && f.confidence !== 'low' && !causes.has(f.ruleId + ':' + f.target.itemId) && (sections.get(f.target.section) || 0) < 2) { topIds.push(f.id); causes.add(f.ruleId + ':' + f.target.itemId); sections.set(f.target.section, (sections.get(f.target.section) || 0) + 1); }
    return { schemaVersion: 2, engineVersion: VERSION, status: complete ? 'complete' : 'partial', coverage: { eligible: eligible.length, assessed: assessed.length, unsupported, deferred: skipped.length }, findings: ordered, topIds, skills: evidence, queryDigests, jobMatches: [...seen].map(id => ({ id, status: !complete ? 'unknown' : evidence[id].status === 'practical-supported' ? 'supported' : evidence[id].status === 'negated' ? 'contradicted' : evidence[id].status === 'positive-mention' ? 'partial' : 'unknown' })), skippedRules: skipped.length ? ['global-absence'] : [], analysisDate: input.analysisDate };
  }
  function safeRewrite(before, after, maxLength) {
    return typeof before === 'string' && typeof after === 'string' && after.length <= maxLength && before.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim() === after;
  }
  // A rule rewrite is applied only when the stored suggestion equals what the same rule produces now.
  function safeApply(finding, maxLength) {
    if (!finding || typeof finding.before !== 'string' || typeof finding.after !== 'string' || finding.after.length > maxLength) return false;
    if (finding.ruleId === 'PERSIAN-TYPOGRAPHY') return typography(finding.before) === finding.after && finding.after !== finding.before;
    return safeRewrite(finding.before, finding.after, maxLength);
  }
  const roles = goalRoles.map(role => role.id);
  const api = { VERSION, normalize, key, semantics, dateRange, priority, lexicon, mentions, goalRole, roleSkills, roles, typography, project, analyze, safeRewrite, safeApply };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ResumeAdvisor = api;
})(typeof self !== 'undefined' ? self : globalThis);
