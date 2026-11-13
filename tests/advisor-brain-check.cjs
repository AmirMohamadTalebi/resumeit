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
// Privacy answers point at the résumé contact step, not the removed settings tab.
const privacy=B.reply('حریم خصوصی شماره',dev);assert.equal(privacy.intent,'privacy');assert(privacy.actions.some(a=>a.kind==='route'&&a.route==='resume'&&a.step==='contact'&&!a.tab));
assert(B.opening(dev).text.includes('نیلوفر'));
// Spelling: one-letter slips in the words people read first, never names or punctuation.
const slip={...empty,profile:{...empty.profile,name:'امیرمحمد طالبی',title:'دانشجوری کامپیوتر',bio:'ساکن مراغه، علاقمند به طراحی.'}};
assert.deepEqual(B.spelling(slip).map(t=>t.wrong+'>'+t.right),['دانشجوری>دانشجوی','علاقمند>علاقه‌مند']);
assert.equal(B.fixText('دانشجوری کامپیوتر، عاشق کد'),'دانشجوی کامپیوتر، عاشق کد');
assert(B.score(slip).dims.find(d=>d.id==='clarity').reasons[0].includes('دانشجوری'));
assert(!B.bioDraft({...slip,skills:[{name:'Figma'}]}).includes('دانشجوری'),'drafts never repeat a typo');
assert(B.reply('غلط املایی دارم؟',slip).actions.some(a=>a.kind==='fix'&&a.wrong==='دانشجوری'&&a.value==='دانشجوی'));
// Statements about oneself, slang and transliterated job names.
for(const [q,role] of [['من فول استک دولوپر هستم','توسعه‌دهندهٔ فول‌استک'],['میخوام طراح رابط کاربری بشم','طراح رابط و تجربهٔ کاربری'],['من یه دیزاینر هستم','طراح رابط و تجربهٔ کاربری'],['من حسابدار هستم','حسابدار']]){const r=B.reply(q,slip);assert.equal(r.intent,'statement',q);assert(r.actions.some(a=>a.kind==='goal'&&a.value===role),q);}
assert.equal(B.understand('میخوام امتیاز رزومه رو بدونم'),null,'questions are not statements');
console.log('PASS assistant brain: typo-tolerant Persian intents, five-dimension score with reasons, role detection, ordered skill gaps, fact-only drafts and personalised replies with actions.');
// Small talk: greetings, how-are-you, Tehran date and time, and real questions still win over a greeting.
{const at={now:'2026-10-30T12:00:00Z'},p={profile:{name:'نیکا راد'}};
for(const [q,topic] of [['سلام','greet'],['سلام فندق جان!','greet'],['خوبی؟','howareyou'],['حالت چطوره','howareyou'],['خسته‌ام','moodbad'],['امروز چندمه؟','date'],['ساعت چنده؟','time'],['اسمت چیه','name'],['جوک بگو','joke'],['ممنون','thanks'],['خداحافظ','bye'],['❤️','emoji']])assert.equal(B.chat(q,p,at)?.topic,topic,q);
assert(B.chat('امروز چندمه؟',p,at).text.includes('جمعه ۸ آبان ۱۴۰۵'));assert(B.chat('ساعت چنده؟',p,at).text.includes('۱۵:۳۰'));assert(B.chat('تاریخ قمری',p,at).text.includes('قمری'));
for(const q of ['سلام، امتیاز رزومه‌ام چند است؟','رزومه‌ام چطوره؟','بلبلبل','من فول استک دولوپر هستم'])assert.equal(B.chat(q,p,at),null,q);
assert.equal(B.reply('سلام، امتیاز رزومه‌ام چند است؟',p).intent,'score');assert.equal(B.reply('ساعت چنده؟',p,at).topic,'time');
console.log('PASS small talk: greetings, mood, Tehran date and time (Persian, Gregorian, lunar), personality and greeting-plus-question.');}
// Conversations that used to fail: several acts in one message, filler words, swapped letters, follow-ups that lean
// on what was just said, identity questions about the model, and a role named in the question.
{const at={now:'2026-10-30T12:00:00Z'},me={...dev,profile:{...dev.profile,name:'امیرمحمد طالبی'}};
assert.equal(B.chat('چطوری خوبی',me,at)?.topic,'howareyou');assert.equal(B.reply('چطوری خوبی',me,at).intent,'smalltalk','how-are-you never turns into the resume score');
const both=B.chat('سلام فندق جان خوبی؟ ساعت چنده؟',me,at);assert.deepEqual(both.topics,['greet','howareyou','time']);assert(both.text.startsWith('سلام امیرمحمد!')&&both.text.includes('۱۵:۳۰'));
for(const [q,topic] of [['ساعت چنده اونجا','time'],['الان ساعت چنده','time'],['حالا امروز چندمه','date'],['از فردا','defer'],['فردا شروع کنیم','defer'],['خیلی خنگی','rude'],['فندق','call'],['فعلاً نه','no']])assert.equal(B.chat(q,me,at)?.topic,topic,q);
for(const q of ['تو کلادی؟','از چه هوش مصنوعی استفاده میکنی','تو جی پی تی هستی؟','chatgpt هستی؟'])assert.equal(B.reply(q,me,at).topic,'model',q);
assert.equal(B.chat('مهارت های دیگه',me,at),null,'«های» in «مهارت‌های» is not a greeting');
const offer=[{role:'user',text:'خوبم'},{role:'assistant',text:B.chat('خوبم',me,at).text}];assert.equal(B.reply('آره',me,{...at,history:offer}).intent,'next','yes after an offer starts the next step');
const first=B.reply('چه مهارت‌هایی اضافه کنم؟',me),more=B.reply('مهرات های دیگه ای پیشنهاد بده',me,{history:[{role:'user',text:'چه مهارت‌هایی اضافه کنم؟'},{role:'assistant',text:first.text}]});
assert.equal(more.intent,'skills','a swapped-letter typo still reaches skills');const names=a=>a.actions.filter(x=>x.kind==='skill').map(x=>x.value);assert(names(more).length&&!names(more).some(n=>names(first).includes(n)),'«more» shows new skills');
assert(names(B.reply('منابع انسانی چه مهارت هایی میخواد',me)).includes('جذب و استخدام'),'a role named in the question wins');
assert.equal(B.reply('نکات یک رزومه خوب',me).intent,'tips');assert.equal(B.reply('سابقه کار ندارم',me).intent,'noexp');assert.equal(B.reply('سلام امتیازم چنده',me).text.startsWith('سلام امیرمحمد!'),true);
console.log('PASS conversation: combined acts, fillers, swapped letters, follow-ups with context, identity questions, named roles and new resume topics.');}
