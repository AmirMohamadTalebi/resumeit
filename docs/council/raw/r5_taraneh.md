C3-a (بزرگ): بینش با منبع بازدید، جزئیات اجرا

کد را خواندم؛ دو نکتهٔ مفید: canonical در src/dashboard/http.cjs فقط از origin+base+مسیر ساخته می‌شود، پس ?src هیچ‌وقت در canonical و og:url نمی‌آید (شرط «حذف ?src» با ساختار برقرار است و فقط تستش را می‌نویسیم). و کوکی ri_seen_ روی خط ۸۷ فقط برای بازدید است، پس منبع هم فقط برای بازدید (resume و links) ثبت می‌شود؛ کلیک‌ها دست‌نخورده.

فاز ۱، ثبت. فایل جدید src/dashboard/sources.cjs با sourceOf(req,url): اول ?src اگر در فهرست ثابت telegram|instagram|linkedin|whatsapp|other بود؛ اگر نبود، hostname سرآیند Referer با نقشهٔ ثابت (t.me، instagram.com، linkedin.com، google.*، wa.me)؛ در غیر این صورت direct. هیچ رشتهٔ خام ذخیره نمی‌شود. device: mobile|desktop با یک regex روی همان User-Agent. مهاجرت در workspaces.cjs کنار dashboard_workspace_metrics: CREATE TABLE IF NOT EXISTS dashboard_sources(user_id, slot, day, event, src VARCHAR(10), device VARCHAR(7), total) با کلید اصلی کامل و FOREIGN KEY ... ON DELETE CASCADE. در src/database/dashboard.cjs تابع recordMetric یک آرگومان اختیاری source بگیرد و دو INSERT را داخل transaction بزند؛ پس جمع منبع‌ها همیشه برابر کل بازدیدهاست. فراخوانی فقط داخل همان if(!seen&&metrics.countable(...)) در http.cjs:87، یعنی همان گیت و همان کوکی و بعد از فیلتر ربات.

فاز ۲، نمایش. dashboardStats یک جفت‌تابع dashboardSources(id,days,slot) و مسیر /api/dashboard/sources بگیرد. در stats.js کارت «بازدید از کجا آمد» با RI.charts.placeholder (جدول دسترس‌پذیر خودکار)، تفکیک موبایل/دسکتاپ و جملهٔ خودکار. لینک‌ساز «برای تلگرام کپی کن» در publish.js کنار data-copy. جمله در متن صفحه: «در ۲۴ ساعت اولین منبع حساب می‌شود». متن حریم خصوصی: dist/privacy/index.html یک بند «فقط نام مبدأ، بدون آدرس و بدون هویت».

فاز ۳، گزارش هفتگی. یک گزینهٔ جدا و پیش‌فرض خاموش در تنظیمات اعلان‌ها (kind تازه stats)؛ ارسال با src/notifications/service.cjs فقط برای روشن‌کنندگان، با لینک لغو یک‌کلیکی مثل marketing.cjs.

تست‌ها: tests/database-check.cjs روی MySQL واقعی: چند بازدید با منبع‌های مختلف و کوکی؛ assert جمع dashboard_sources برابر dashboard_metrics برای همان روز، همین برای slot ۲، و پاک‌شدن با حذف حساب. tests/sources-check.cjs: نقشهٔ Referer، ربات ثبت نمی‌شود، ?src نامعتبر به other/direct می‌رود، og:url و canonical بدون ?src.

ریلیز: ۳.۳.۲ فاز ۱ و ۲ با C3-c؛ ۳.۳.۳ فاز ۳.

نمی‌کنم: ذخیرهٔ URL یا IP، تگ‌های آزاد، منبع روی کلیک، ایمیل هفتگی برای همه، جدول پیکربندی ادمین.

C3-b (کوچک): پیش‌دریافت

در dist/dashboard/js/app.js زیر loadScript (خط ۱۱۰) تابع prefetch(id)=>{ if(RI.pages[id]) return; loadScript('/dashboard/js/pages/'+id+'.js').catch(()=>{}); } (شرط .catch). پس pageLoads دوبار درخواست نمی‌دهد. شرط saveData: const lean=navigator.connection&&(navigator.connection.saveData||/2g/.test(navigator.connection.effectiveType)); اگر lean بود هیچ کاری نمی‌کنیم. رویدادها: pointerenter، focusin و touchstart روی [data-route] در ناوبری (delegate)، و بعد از اولین رندر requestIdleCallback برای resume، links، publish. تست tests/dashboard-prefetch-check.cjs (Playwright): قبل از کلیک درخواست pages/links.js دیده شود؛ با saveData شبیه‌سازی‌شده نشود؛ و assert که gzip مجموع سه فایل زیر ۶۰KB است (سقف). نمی‌کنم: پیش‌دریافت template-editor، API، یا تصویر.

C3-c (کوچک): RI.compareSeries

در dist/dashboard/js/api.js کنار metricSeries (خط ۳۸): RI.compareSeries(rows,n,event) پنجرهٔ فعلی و n روز قبل از آن را جمع می‌زند و {now,prev,pct,state} می‌دهد؛ prev=0 و now>0 یعنی «new»، هر دو صفر یعنی «same»، هرگز ∞. کاشی‌های home.js:62-66 و stats.js و جملهٔ خودکار فاز ۲ همه همین را می‌خوانند؛ هیچ مقایسهٔ دوم نوشته نمی‌شود. حالت صفر: کارت «لینکت را برای اولین نفر بفرست» با همان لینک‌ساز فاز ۱. فلش همیشه با متن. تست tests/compare-series-check.cjs: صفر، «جدید»، افت، و ردیف‌های slot ۲ (از dashboardStats با slot). نمی‌کنم: نمودار دوم، رنگ بدون متن، تغییر API سرور.
