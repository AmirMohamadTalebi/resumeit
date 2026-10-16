const {normalize}=require('./filters.cjs'),{fail}=require('../dashboard/model.cjs');
const aliases={role:'role','نقش':'role',status:'status','وضعیت':'status',provider:'provider','درگاه':'provider',plan:'plan','اشتراک':'plan',direction:'direction','جهت':'direction',ref:'ref','محصول':'ref',date:'date','تاریخ':'date',min:'min','حداقل':'min',max:'max','حداکثر':'max',priority:'priority','اولویت':'priority',category:'category','دسته':'category'};
const values={role:{'مالک':'owner','ادمین':'admin','ساپورت':'support','کاربر':'user'},status:{'فعال':'active','معلق':'suspended','تعلیق':'suspended','موفق':'paid','ناموفق':'failed','باز':'open','بسته':'closed','پاسخ':'answered'},provider:{'زیبال':'zibal','سامان':'sep'},plan:{'فعال':'paid','رایگان':'free','هما':'y',homa:'y','رخش':'q',rakhsh:'q','سیمرغ':'h',simorgh:'h'},direction:{'افزایش':'credit','کاهش':'debit'},priority:{'بالا':'high','عادی':'normal'},category:{'حساب':'account','پرداخت':'payment','ویرایشگر':'editor','انتشار':'publication','سایر':'other'}};
const persian=new Intl.DateTimeFormat('en-US-u-ca-persian',{timeZone:'UTC',year:'numeric',month:'numeric',day:'numeric'});
function dateRange(text){
 const m=/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text);if(!m)fail('تاریخ جست‌وجو معتبر نیست');const [year,month,day]=m.slice(1).map(Number);let time;
 if(year>=1700&&year<=2300){time=Date.UTC(year,month-1,day);const d=new Date(time);if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)fail('تاریخ وجود ندارد');}
 else if(year>=1200&&year<=1600){let lo=Date.UTC(year+621,0,1)/86400000,hi=Date.UTC(year+622,11,31)/86400000;const wanted=year*10000+month*100+day;while(lo<=hi){const mid=Math.floor((lo+hi)/2),parts=Object.fromEntries(persian.formatToParts(mid*86400000).map(p=>[p.type,p.value])),value=Number(parts.year)*10000+Number(parts.month)*100+Number(parts.day);if(value===wanted){time=mid*86400000;break;}if(value<wanted)lo=mid+1;else hi=mid-1;}if(time===undefined)fail('تاریخ شمسی وجود ندارد');}
 else fail('سال جست‌وجو خارج از بازه است');
 return {after:time-12600000,before:time+86400000-12600000-1};
}
function search(q){
 const result={words:[],fields:{}};for(const token of normalize(q).split(/\s+/).filter(Boolean).slice(0,12)){
  const match=/^([^:]+):(.+)$/.exec(token),field=match&&aliases[match[1].toLowerCase()];
  if(field==='date'||!field&&/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(token)){if(result.after!==undefined)fail('فقط یک تاریخ در عبارت جست‌وجو بنویس');Object.assign(result,dateRange(field?match[2]:token));}
  else if(match&&['id','شناسه','name','نام'].includes(match[1].toLowerCase()))result.words.push(match[2]);
  else if(field){let value=match[2].toLowerCase();if(['min','max'].includes(field))value=value.replace(/[٬,]/g,'');result.fields[field]=values[field]?.[value]||value;}
  else result.words.push(token);
 }return result;
}
module.exports={search,dateRange};
