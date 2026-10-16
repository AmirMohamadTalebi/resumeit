const {RI}=require('../dashboard/render.cjs');
const {fail}=require('../dashboard/model.cjs');
const BASE_UNITS=2000;
const defaults=()=>({rate:2000,prices:{},paused:[],products:{},imageFree:409600,imagePaid:2097152});
function product(ref){if(typeof ref!=='string'||!/^(rt|lt|font|pal|subscription):[a-z0-9-]+$/.test(ref))return;const [kind,id]=ref.split(':');return kind==='subscription'?RI.PLANS[id]:({rt:RI.RESUME_TEMPLATES,lt:RI.LINK_TEMPLATES,font:RI.FONTS,pal:RI.PALETTES}[kind]||[]).find(x=>x.id===id);}
function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('تنظیمات فروش معتبر نیست');
 const result=defaults();for(const key of ['rate','imageFree','imagePaid']){if(!Number.isSafeInteger(input[key])||input[key]<=0)fail('نرخ و محدودیت تصویر باید عدد صحیح مثبت باشند');result[key]=input[key];}
 if(result.rate<100||result.rate>10000000||result.imagePaid>2097152||result.imageFree>Math.floor(result.imagePaid/5))fail('سقف عکس رایگان حداکثر یک‌پنجم اشتراکی و سقف اشتراکی حداکثر ۲ مگابایت است');
 if(!input.prices||typeof input.prices!=='object'||Array.isArray(input.prices)||!Array.isArray(input.paused)||input.paused.length>300)fail('فهرست قیمت معتبر نیست');
 for(const [ref,price]of Object.entries(input.prices)){const p=product(ref);if(!p||!(p.price>0)||!Number.isSafeInteger(price)||price<BASE_UNITS||price>100000000||price%BASE_UNITS)fail('قیمت باید تعداد صحیح It برای محصول پولی موجود باشد');result.prices[ref]=price;}
 for(const ref of input.paused)if(!product(ref)?.price||result.paused.includes(ref))fail('توقف فروش فقط برای محصول پولی موجود مجاز است');else result.paused.push(ref);
 if(input.products!==undefined){if(!input.products||typeof input.products!=='object'||Array.isArray(input.products)||Object.keys(input.products).length>300)fail('مشخصات محصولات معتبر نیست');for(const [ref,value]of Object.entries(input.products)){if(!product(ref)||!value||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||typeof value.desc!=='string'||value.desc.length>500||/[\x00-\x1f\x7f<>]/.test(value.name+value.desc)||!Number.isSafeInteger(value.updated_at)||value.updated_at<0)fail('نام و توضیح محصول معتبر نیست');result.products[ref]={name:value.name.trim(),desc:value.desc.trim(),updated_at:value.updated_at};}}
 return result;
}
const quote=(amount,rate=2000)=>{const units=Math.floor(amount*BASE_UNITS/rate);if(!Number.isSafeInteger(units)||units<1)fail('مبلغ برای نرخ فعلی کافی نیست');return {it_rate:rate,credit_units:units};};
const validSlot=slot=>Number.isSafeInteger(slot)&&slot>=1&&slot<=2147483647;
const workspaceLimit=(billing={},owner={})=>Object.hasOwn(owner,'subdomainLimit')?owner.subdomainLimit:(billing.plan&&billing.plan.end>Date.now()?2:1)+(owner.extraSubdomain?1:0);
const workspaceAllowed=(slot,billing={},owner={})=>validSlot(slot)&&(slot===3?!!(billing.plan&&billing.plan.end>Date.now()):workspaceLimit(billing,owner)===null||(slot<3?slot:slot-1)<=workspaceLimit(billing,owner));
module.exports={defaults,validate,product,quote,workspaceAllowed,workspaceLimit,validSlot,BASE_UNITS};
