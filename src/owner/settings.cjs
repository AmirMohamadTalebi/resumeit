const {RI}=require('../dashboard/render.cjs');
const {fail}=require('../dashboard/model.cjs');
const BASE_UNITS=2000;
const defaults=()=>({rate:2000,prices:{},paused:[],imageFree:409600,imagePaid:2097152});
function product(ref){if(typeof ref!=='string'||!/^(rt|lt|font|pal|subscription):[a-z0-9-]+$/.test(ref))return;const [kind,id]=ref.split(':');return kind==='subscription'?RI.PLANS[id]:({rt:RI.RESUME_TEMPLATES,lt:RI.LINK_TEMPLATES,font:RI.FONTS,pal:RI.PALETTES}[kind]||[]).find(x=>x.id===id);}
function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('تنظیمات فروش معتبر نیست');
 const result=defaults();for(const key of ['rate','imageFree','imagePaid']){if(!Number.isSafeInteger(input[key])||input[key]<=0)fail('نرخ و محدودیت تصویر باید عدد صحیح مثبت باشند');result[key]=input[key];}
 if(result.rate<100||result.rate>10000000||result.imagePaid>2097152||result.imageFree>Math.floor(result.imagePaid/5))fail('سقف عکس رایگان حداکثر یک‌پنجم اشتراکی و سقف اشتراکی حداکثر ۲ مگابایت است');
 if(!input.prices||typeof input.prices!=='object'||Array.isArray(input.prices)||!Array.isArray(input.paused)||input.paused.length>300)fail('فهرست قیمت معتبر نیست');
 for(const [ref,price]of Object.entries(input.prices)){const p=product(ref);if(!p||!(p.price>0)||!Number.isSafeInteger(price)||price<BASE_UNITS||price>100000000||price%BASE_UNITS)fail('قیمت باید تعداد صحیح It برای محصول پولی موجود باشد');result.prices[ref]=price;}
 for(const ref of input.paused)if(!product(ref)?.price||result.paused.includes(ref))fail('توقف فروش فقط برای محصول پولی موجود مجاز است');else result.paused.push(ref);
 return result;
}
const quote=(amount,rate=2000)=>{const units=Math.floor(amount*BASE_UNITS/rate);if(!Number.isSafeInteger(units)||units<1)fail('مبلغ برای نرخ فعلی کافی نیست');return {it_rate:rate,credit_units:units};};
const workspaceAllowed=(slot,billing={},owner={})=>slot===1||slot===2&&!!owner.extraSubdomain||!!(billing.plan&&billing.plan.end>Date.now())&&([2,3].includes(slot)||slot===4&&!!owner.extraSubdomain);
module.exports={defaults,validate,product,quote,workspaceAllowed,BASE_UNITS};
