/* Pure, bounded text analysis shared by the worker and Node tests. */
(function (root) {
  'use strict';
  const VERSION = '2.1.0';
  const normalize = value => String(value || '').normalize('NFC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[۰-۹٠-٩]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c) >= 0 ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(c) : '٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s\u200c]+/g, ' ').trim().toLowerCase();
  // Non-security identity only; apply additionally checks exact source text and input SHA-256.
  function key(value) { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0).toString(36); }
  const lexicon = [
    ['sql', 'sql'], ['python', 'python|پایتون'], ['javascript', 'javascript|جاوااسکریپت|جاوا اسکریپت'], ['typescript', 'typescript|تایپ اسکریپت'],
    ['react', 'react|ری اکت|ری‌اکت'], ['node', 'node.js|nodejs'], ['c++', 'c++'], ['c#', 'c#'], ['.net', '.net'], ['ci/cd', 'ci/cd'],
    ['excel', 'excel|اکسل'], ['figma', 'figma|فیگما'], ['photoshop', 'photoshop|فتوشاپ'], ['git', 'git'], ['css', 'css'], ['html', 'html'],
    ['documentation', 'مستندسازی|مستندات|documentation'], ['teaching', 'تدریس|آموزش دادن|teaching'], ['sales', 'فروش|sales'],
    ['research', 'پژوهش|research'], ['analysis', 'تحلیل داده|data analysis'], ['design', 'طراحی محصول|طراحی رابط|product design'],
    ['support', 'پشتیبانی|customer support'], ['accounting', 'حسابداری|accounting'], ['operations', 'عملیات|operations']
  ].map(([id, aliases]) => ({ id, aliases: aliases.split('|').map(normalize) }));
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
    const sources = [], add = (section, itemId, field, raw, visibility = 'public', provenance = 'user-authored', maxLength = 300) => {
      if (typeof raw === 'string' && raw.trim()) sources.push({ section, itemId, field, raw, visibility, provenance, maxLength });
    };
    add('profile', 'profile', 'title', content.profile.title, 'public', 'user-authored', 90); add('profile', 'profile', 'bio', content.profile.bio, 'public', 'user-authored', 300);
    const visible = name => content.sections.some(s => s.key === name && s.visible);
    for (const name of ['skills', 'experience', 'education', 'projects', 'certs', 'languages']) for (const item of content[name] || []) {
      for (const field of ['name', 'role', 'org', 'degree', 'school', 'title', 'desc', 'from', 'to', 'url']) if (!(field === 'to' && item.current)) add(name, item.id, field, item[field], visible(name) ? 'public' : 'hidden', 'user-authored', name === 'projects' ? 280 : name === 'education' ? 240 : 300);
    }
    if (importedSpec) {
      // Common resume fields not rendered by this template cannot supply public evidence.
      for (const s of sources) if (s.section !== 'profile' && !importedSpec.sections.includes(s.section)) s.visibility = 'hidden';
      const values = content.resumeTemplates?.[content.theme.resume] || {};
      for (const field of importedSpec.fields) {
        if (field.bind || field.legacy || !importedSpec.groups.some(g=>g.key===field.group) || !['text', 'textarea', 'percent'].includes(field.type)) continue;
        const visibility = values.settings?.['show_' + String(field.group).replace(/:/g, '_')] === false ? 'hidden' : 'public';
        const raw = Object.hasOwn(values.fields || {}, field.key) ? values.fields[field.key] : field.default;
        add('template', content.theme.resume, field.key, raw, visibility, 'template-example', field.max || 1000);
        for (const collection of importedSpec.collections || []) for (const row of values.collections?.[collection.key] || []) if (Object.hasOwn(row.fields || {}, field.key)) add('template', content.theme.resume + ':' + collection.key + ':' + row.id, field.key, row.fields[field.key], visibility, 'template-example', field.max || 1000);
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
      if (['bio', 'desc'].includes(s.field)) {
        const after = s.raw.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
        if (after !== s.raw) add('TEXT-READABILITY', s, 'فاصله‌های اضافه را می‌توان مرتب کرد؛ متن و معنای جمله حفظ می‌شود.', { type: 'rewrite', before: s.raw, after });
        if (s.raw.length > 220 && !/[؛;.!?؟\n]/.test(s.raw)) add('TEXT-READABILITY', s, 'این جمله را در محل تغییر موضوع به دو جمله تقسیم کن.', { confidence: 'medium' });
      }
      if (s.field === 'desc' && s.section === 'experience' && /(?:تیم|team)/.test(text) && !/(?:نقش من|مسئول|کمک|همکاری|my role|responsible|contributed)/.test(text)) add('ROLE-OWNERSHIP', s, 'سهم خودت در این همکاری چه بود؟ همان نقش واقعی را در یک جمله اضافه کن.', { confidence: 'medium' });
      if (s.field === 'desc' && ['experience', 'projects'].includes(s.section) && !semantics(text).artifact && /^(?:کار با|فعالیت در|مسئول امور|worked on)\s+.{1,60}$/.test(text)) add('WORK-OUTPUT', s, 'چه چیزی ساختی، ارائه کردی یا به پایان رساندی؟ یک خروجی واقعی کافی است؛ عدد لازم نیست.', { confidence: 'medium' });
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
    for (const contact of input.privateContacts || []) {
      if (contact.length < 5) continue;
      const s = assessed.find(s => normalize(s.raw).includes(normalize(contact)));
      if (s) add('PRIV-EXPOSE', s, 'یک راه تماس که پنهان کرده‌ای در متن عمومی دیده می‌شود؛ مقدار را از این متن بردار.', { type: 'issue', private: true, impact: 1 });
    }
    if (cancelled()) return null;
    const ordered = findings.sort((a, b) => (b.ruleId === 'PRIV-EXPOSE') - (a.ruleId === 'PRIV-EXPOSE') || b.priority - a.priority || a.id.localeCompare(b.id));
    const topIds = [], sections = new Map(), causes = new Set();
    for (const f of ordered) if (topIds.length < 3 && f.confidence !== 'low' && !causes.has(f.ruleId + ':' + f.target.itemId) && (sections.get(f.target.section) || 0) < 2) { topIds.push(f.id); causes.add(f.ruleId + ':' + f.target.itemId); sections.set(f.target.section, (sections.get(f.target.section) || 0) + 1); }
    return { schemaVersion: 2, engineVersion: VERSION, status: complete ? 'complete' : 'partial', coverage: { eligible: eligible.length, assessed: assessed.length, unsupported, deferred: skipped.length }, findings: ordered, topIds, skills: evidence, queryDigests, jobMatches: [...seen].map(id => ({ id, status: !complete ? 'unknown' : evidence[id].status === 'practical-supported' ? 'supported' : evidence[id].status === 'negated' ? 'contradicted' : evidence[id].status === 'positive-mention' ? 'partial' : 'unknown' })), skippedRules: skipped.length ? ['global-absence'] : [], analysisDate: input.analysisDate };
  }
  function safeRewrite(before, after, maxLength) {
    return typeof before === 'string' && typeof after === 'string' && after.length <= maxLength && before.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim() === after;
  }
  const api = { VERSION, normalize, key, semantics, dateRange, priority, lexicon, mentions, project, analyze, safeRewrite };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ResumeAdvisor = api;
})(typeof self !== 'undefined' ? self : globalThis);
