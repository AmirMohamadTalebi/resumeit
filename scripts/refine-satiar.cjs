const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),root=path.resolve(__dirname,'..'),file=path.join(root,'dist/dashboard/js/template-satiar.js'),ctx=vm.createContext({window:{RI:{IMPORTED_TEMPLATES:{}}}});
vm.runInContext(fs.readFileSync(file,'utf8'),ctx);const t=ctx.window.RI.IMPORTED_TEMPLATES.satiar;
// Stable keys preserve saved user overrides; these are illustrative defaults only.
const updates={f50:'',f51:'',f54:'ارتباط با من',f55:'ارتباط با من',f57:'پروژه‌های من',f58:'پروژه‌های من',f60:'طراحی وب',f61:'ساخت رابط‌های خوانا و واکنش‌گرا',f63:'توسعهٔ رابط',f64:'تبدیل طرح به تجربهٔ قابل استفاده',f66:'یادگیری',f67:'تمرین و بهبود مداوم مهارت‌ها',f81:'',f82:'دربارهٔ من',f83:'مسیر حرفه‌ای من',f84:'در این بخش می‌توانید دربارهٔ شیوهٔ کار، علاقه‌ها و مسیر یادگیری خود بنویسید.',f87:'ارتباط با من',f88:'ارتباط با من',f91:'پروژه‌های من',f92:'پروژه‌های من',f111:'',f112:'',f262:'',f263:'سوابق و مهارت‌ها',f288:'',f289:'تجربه‌های کاری',f290:'توسعه‌دهندهٔ وب · تیم نمونه',f291:'از ۱۴۰۲ تا اکنون',f292:'پیاده‌سازی رابط‌های واکنش‌گرا و همکاری با تیم طراحی.',f293:'کارآموز فرانت‌اند · استودیوی نمونه',f294:'از ۱۴۰۱ تا ۱۴۰۲',f295:'ساخت اجزای رابط و آشنایی با تست و دسترس‌پذیری.',f296:'پروژه‌های مستقل',f297:'از ۱۴۰۰ تا ۱۴۰۱',f298:'تمرین طراحی و توسعهٔ وب با پروژه‌های کوچک.',f299:'',f300:'مهارت‌ها'};
Object.assign(updates,{f53:'mail',f59:'code',f62:'image',f65:'resume'});
for(const f of t.fields)if(Object.hasOwn(updates,f.key))f.default=updates[f.key];
fs.writeFileSync(file,'/* Compact resume; defaults refined by scripts/refine-satiar.cjs. */\nwindow.RI.IMPORTED_TEMPLATES["satiar"]='+JSON.stringify(t)+';\n');
const css=t.pages.home.css.map(url=>fs.readFileSync(path.join(root,'dist',url),'utf8')).join('\n');
fs.writeFileSync(path.join(root,'dist/templates/satiar/core.css'),'/* Original layout with duplicate font registrations removed. */\n'+css.replace(/@font-face\s*\{[^}]*\}/g,''));
console.log('Satiar defaults refined; saved field and collection keys preserved.');
