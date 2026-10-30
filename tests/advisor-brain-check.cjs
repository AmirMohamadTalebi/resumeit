const assert=require('node:assert/strict'),B=require('../dist/dashboard/js/advisor-brain.js');
const empty={profile:{name:'',title:'',bio:'',avatar:''},skills:[],experience:[],education:[],projects:[],contacts:[],socials:[],languages:[]};
const dev={profile:{name:'نیلوفر کریمی',title:'توسعه‌دهندهٔ فرانت‌اند',bio:'',avatar:''},skills:[{name:'HTML و CSS',level:5},{name:'JavaScript',level:4},{name:'React',level:3}],experience:[{role:'کارآموز فرانت‌اند',org:'استودیوی نمونه',from:'۱۴۰۱/۰۴',to:'',current:true,desc:'مسئول پیاده‌سازی صفحه‌ها با TypeScript'}],education:[],projects:[{title:'فروشگاه آنلاین',desc:'ساخت سبد خرید و پرداخت'}],contacts:[{type:'email',value:'a@b.ir',public:true}],socials:[],languages:[]};
// Intents survive typos, colloquial spelling and Arabic letters.
for(const [q,id] of [['سلام','greet'],['امتیاذ رزومم چنده؟','score'],['يه معرفي برام بنويس','bio'],['چه مهارت هایی اضافه کنم','skills'],['تجربه هام خوبه؟','experience'],['قدم بعدی چیه','next'],['میخوام منتشرش کنم','publish'],['عکس بذارم؟','photo'],['قالبمو عوض کنم','template'],['آگهی استخدام دارم','job'],['ممنون','thanks']])assert.equal(B.intent(q),id,q);
assert.equal(B.intent('بلبلبل'),null);
// Score: bounded, five dimensions, every weak dimension explains itself.
const s0=B.score(empty),s1=B.score(dev);
assert(s0.total<30&&s1.total>s0.total,'more content scores higher');assert.equal(s1.dims.length,5);
for(const d of s0.dims){assert(d.value>=0&&d.value<=100);if(d.value<60)assert(d.reasons.length,d.id+' explains a low value');}
assert.equal(s1.role.id,'frontend');assert.equal(B.detectRole(empty),null);
assert.equal(B.detectRole({...empty,profile:{...empty.profile,title:'حسابدار ارشد'},skills:[{name:'سپیدار'}]}).id,'accounting');
// Skills: suggestions exclude what the user has; those already mentioned in the text come first.
const miss=B.missingSkills(dev,'frontend');assert(!miss.some(m=>/react|javascript/i.test(m.name)));assert.equal(miss[0].name,'TypeScript');assert(miss[0].seen);
// Drafts reuse only the user's facts: no invented numbers, organisations or skills.
const bio=B.bioDraft(dev);assert(bio.includes('توسعه‌دهندهٔ فرانت‌اند')&&bio.includes('استودیوی نمونه')&&bio.includes('فروشگاه آنلاین'));
const facts=JSON.stringify(dev);for(const word of bio.match(/[A-Za-z]{3,}/g)||[])assert(facts.includes(word),'draft word from the resume: '+word);
assert.equal(B.bioDraft(empty),null,'no draft without a title or role');
assert(B.bulletHelp('مسئول پیاده‌سازی صفحه‌ها').length>=2);assert.equal(B.bulletHelp('سرعت بارگذاری صفحه را با بهینه‌سازی تصاویر ۴۰٪ کمتر کردم و تجربهٔ کاربر بهتر شد.'),null);
// Replies: personalised, with actions that point at real places, and a fallback for unknown questions.
const r=B.reply('یه معرفی برام بنویس',dev);assert.equal(r.intent,'bio');assert(r.actions.some(a=>a.kind==='bio'&&a.value===bio));
assert(B.reply('یه معرفی برام بنویس',empty).actions.some(a=>a.kind==='go'&&a.field==='title'));
assert(B.reply('چه مهارت هایی اضافه کنم',dev).actions.some(a=>a.kind==='skill'&&a.value==='TypeScript'));
assert(B.reply('امتیاز',dev).text.includes(String(s1.total).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d])));
const unknown=B.reply('بلبلبل',dev);assert.equal(unknown.intent,'unknown');assert(unknown.follow.length>=3);
assert(B.opening(dev).text.includes('نیلوفر'));
console.log('PASS assistant brain: typo-tolerant Persian intents, five-dimension score with reasons, role detection, ordered skill gaps, fact-only drafts and personalised replies with actions.');
