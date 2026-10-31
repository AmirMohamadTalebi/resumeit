// Optional language model behind the resume assistant. The owner picks the provider and key in the admin panel
// (src/ai/providers.cjs); the older ASSISTANT_AI_URL and ASSISTANT_AI_KEY variables still work as a fallback. The model sees a trimmed
// copy of the resume (no contact values) plus the local analysis, and answers in Persian. Suggested replacement
// text comes back in tagged blocks so the dashboard can offer one-click actions; nothing is applied server-side.
const config=(env=process.env)=>{
  const url=String(env.ASSISTANT_AI_URL||'').trim().replace(/\/+$/,''),key=String(env.ASSISTANT_AI_KEY||'').trim();
  return {enabled:/^https:\/\/[^\s/]+/.test(url)&&key.length>=8,url,key,model:String(env.ASSISTANT_AI_MODEL||'gpt-4o-mini').trim(),timeout:Math.min(60000,Math.max(5000,Number(env.ASSISTANT_AI_TIMEOUT)||25000))};
};

const providers=require('./providers.cjs');
const SYSTEM=`تو «فندق» هستی، گربهٔ سفید و مهربان رزومیت و دستیار رزومهٔ کاربر؛ یک مشاور رزومهٔ باتجربه که فقط فارسی جواب می‌دهد.
قواعد:
- فقط بر اساس رزومهٔ کاربر (JSON زیر) و حرف‌های خودش جواب بده. هیچ عدد، شرکت، مدرک، تاریخ یا دستاوردی از خودت نساز؛ اگر لازم است، از کاربر بپرس.
- غلط‌های املایی و تایپی متن کاربر را ببین و صریح بگو (مثلاً «دانشجوری» ← «دانشجوی»). در متن پیشنهادی هرگز غلط را تکرار نکن.
- شغل و حوزهٔ کاربر را بفهم؛ اگر کاربر دربارهٔ خودش چیزی گفت (مثل «من فول‌استک دولوپر هستم») آن را مبنای پیشنهادها بگذار.
- کوتاه و کاربردی: معمولاً ۲ تا ۵ جمله یا یک فهرست کوتاه. لحن صمیمی ولی حرفه‌ای.
- اگر متن جایگزین برای «معرفی» پیشنهاد می‌دهی، آن را فقط داخل <<BIO>>…<</BIO>> بگذار (۲ تا ۴ جمله، اول‌شخص).
- اگر عنوان شغلی پیشنهاد می‌دهی، داخل <<TITLE>>…<</TITLE>> بگذار (حداکثر ۶۰ حرف).
- اگر مهارت پیشنهاد می‌دهی، نام‌ها را داخل <<SKILLS>>نام۱|نام۲|نام۳<</SKILLS>> بگذار (حداکثر ۶ تا، فقط مهارت‌هایی که از متن یا نقش کاربر برمی‌آید).
- به سلام، احوالپرسی و گپ کوتاه گرم و کوتاه جواب بده و اگر مناسب بود به رزومه برگرد. تاریخ و ساعت را از خط «زمان» بگو.
- دربارهٔ چیزهای بی‌ربط به رزومه، کار، شغل‌یابی یا خود سایت رزومیت مؤدبانه بگو که کمکی از دستت برنمی‌آید.`;

// Contact values and image data stay out of the prompt; the model only needs the story.
function trim(content){
  const c=content&&typeof content==='object'?content:{},pick=(list,keys,n)=>(Array.isArray(list)?list:[]).slice(0,n).map(x=>Object.fromEntries(keys.filter(k=>x?.[k]!==undefined&&x[k]!=='').map(k=>[k,typeof x[k]==='string'?x[k].slice(0,600):x[k]])));
  const p=c.profile||{};
  return {profile:{name:String(p.name||'').slice(0,80),title:String(p.title||'').slice(0,120),bio:String(p.bio||'').slice(0,800),city:String(p.city||'').slice(0,60),avatar:p.avatar?'1':''},
    skills:pick(c.skills,['name','level'],30),experience:pick(c.experience,['role','org','from','to','current','desc'],12),education:pick(c.education,['degree','school','from','to','current','desc'],8),
    projects:pick(c.projects,['title','name','desc','url'],10),certs:pick(c.certs,['name','title','org','year'],10),languages:pick(c.languages,['name','level'],8),
    contacts:(Array.isArray(c.contacts)?c.contacts:[]).map(x=>({type:x?.type,public:!!x?.public,filled:!!String(x?.value||'').trim()})),socials:(Array.isArray(c.socials)?c.socials:[]).map(x=>x?.platform).filter(Boolean)};
}
function parse(text){
  const actions=[];let out=String(text||'');
  const take=(tag,fn)=>{out=out.replace(new RegExp('<<'+tag+'>>([\\s\\S]*?)<</'+tag+'>>','g'),(m,body)=>{const v=body.trim();if(v)fn(v);return tag==='SKILLS'?'':'«'+v+'»';});};
  take('BIO',v=>actions.push({kind:'bio',label:'گذاشتن در معرفی',value:v.slice(0,300)}));
  take('TITLE',v=>actions.push({kind:'title',label:'گذاشتن «'+v.slice(0,40)+'» به‌عنوان عنوان',value:v.slice(0,60)}));
  take('SKILLS',v=>v.split('|').map(s=>s.trim()).filter(Boolean).slice(0,6).forEach(s=>actions.push({kind:'skill',label:s.slice(0,40),value:s.slice(0,40)})));
  return {text:out.replace(/\n{3,}/g,'\n\n').trim().slice(0,2400),actions};
}

// The provider settings from the owner panel, or the older ASSISTANT_AI_* variables as a plain OpenAI-style service.
const resolve=source=>source&&source.provider?source:(cfg=>cfg.enabled?{provider:'custom',url:cfg.url,key:cfg.key,model:cfg.model,timeout:cfg.timeout,temperature:.4,maxTokens:700}:null)(config(source||process.env));
// Returns {text, actions, usage} or null; with `report`, failures come back as {error} for the owner's usage log.
async function answer({question,content,goal,history,analysis},source=process.env,fetcher=fetch,report=false){
  const cfg=resolve(source);if(!cfg)return null;
  const facts={resume:trim(content),goal:String(goal||'').slice(0,160),analysis};
  const t=require('../../dist/dashboard/js/advisor-brain.js').clock(),system=[SYSTEM,providers.IDENTITY,'زمان: امروز '+t.weekday+' '+t.persian+' ('+t.gregorian+')، ساعت '+t.time+' به وقت تهران.','رزومه و تحلیل محلی (JSON):\n'+JSON.stringify(facts)].join('\n\n'),messages=[];
  for(const h of (Array.isArray(history)?history:[]).slice(-6))if(h&&['user','assistant'].includes(h.role)&&typeof h.text==='string')messages.push({role:h.role,content:h.text.slice(0,1200)});
  messages.push({role:'user',content:String(question).slice(0,500)});
  try{
    const out=await providers.chat(cfg,{system,messages},fetcher);
    if(!out.text.trim())return report?{error:'پاسخ خالی',usage:out}:null;
    return {...parse(providers.guard(out.text)),usage:{input:out.input,output:out.output},provider:cfg.provider};
  }catch(error){return report?{error:error.message,usage:{input:0,output:0}}:null;}
}
module.exports={config,answer,parse,trim,resolve};
