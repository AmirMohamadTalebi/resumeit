const {fail}=require('../dashboard/model.cjs');
function filters(input={}){
 const f={};
 for(const [key,values] of Object.entries({role:['','owner','admin','support','user'],verified:['','yes','no'],plan:['','paid','free','q','h','y'],provider:['','sep','zibal'],direction:['','credit','debit'],access:['','active','expired','permanent'],archive:['','archived','all'],sort:['newest','oldest','name','highest','lowest']})){
  f[key]=input[key]|| (key==='sort'?'newest':'');if(!values.includes(f[key]))fail('فیلتر '+key+' معتبر نیست');
 }
 f.pageSize=Number(input.pageSize||25);if(![10,25,50,100].includes(f.pageSize))fail('تعداد ردیف معتبر نیست');
 for(const key of ['after','before','min','max']){const value=input[key];f[key]=value===undefined||value===null||value===''?null:Number(value);if(f[key]!==null&&(!Number.isFinite(f[key])||f[key]<0||f[key]> (['after','before'].includes(key)?4102444800000:100000000000)||['after','before'].includes(key)&&!Number.isSafeInteger(f[key])||['min','max'].includes(key)&&!Number.isSafeInteger(f[key]*2000)))fail('بازهٔ فیلتر معتبر نیست');}
 if(f.after!==null&&f.before!==null&&f.after>f.before||f.min!==null&&f.max!==null&&f.min>f.max)fail('ابتدای بازه نمی‌تواند از انتها بیشتر باشد');
 f.ref=input.ref||'';if(typeof f.ref!=='string'||f.ref.length>100||/[\x00-\x1f\x7f<>]/.test(f.ref))fail('شناسهٔ محصول معتبر نیست');
 return f;
}
const normalize=value=>String(value||'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).trim();
module.exports={filters,normalize};
