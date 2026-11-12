R3-a (بزرگ): پاکسازی گزارش‌های تاریخی و تست‌ها/اسکریپت‌های یتیم

بچه‌ها، تو docs/ شصت‌وپنج فایل داریم و حدود ۳۲تاش گزارش یک‌بارمصرفِ دوره‌ایه: AUDIT.fa.md، WORKSPACE-AUDIT-21-24/25/26-30، EDITOR-PUBLICATION-AUDIT-16-20-FIXES، DASHBOARD-LOADING-COUNCIL-FIXES، user-request-audit-2026-10-15، advisor-release-report، چک‌لیست‌های vista/all-template و ... (کل‌شان ≈۲٬۲۰۰ خط). هیچ‌کدوم از src، tests یا CI ارجاع نمی‌خوره (grep کردم)؛ فقط README به REVIEW-21.1.fa.md لینک داده که نگهش می‌داریم. هرچی لازم بوده الان توی releases.json و تست‌ها هست؛ بقیه‌اش تو تاریخچهٔ git می‌مونه.

کنارش چیزایی که هیچ جا صدا زده نمی‌شن: tests/_peek.cjs، checkout-response-check، coral-release-check، email-login-ui-check، rail-glass-hover-ui-check، workspace-preview (نه در package.json، نه full-ui-suite، نه CI) و scripts/refine-satiar.cjs و refine-vista.cjs (صفر ارجاع، کارِ یک‌باره‌شون انجام شده).

جایگزین: خط «docs/ = راه‌اندازی، طراحی و گزارش‌ها» در README اصلاح می‌شه، و docs فقط می‌شه راهنمای زنده: HOSTING، AUTH-SETUP، PAYMENTS، SEP، SMSIR، notification-delivery-setup، roles و ... (حدود ۳۳ فایل).

حذف ≈۲٬۳۵۰ خط، اضافه ≈۳ خط. 

ریسک: رفتار محصول صفر، چون dist و src دست نمی‌خورن. CI: تست‌های حذفی در هیچ job نیستن، پس سبز می‌مونه؛ قبلش یک grep نهایی برای نام هر فایل و یک اجرای npm test. دیپلوی: بی‌اثر. تنها هزینه: پیدا کردن گزارش قدیمی باید با git log باشه.

R3-b (کوچک): ادغام @import های admin.css

dist/admin/admin.css خط ۱ و ۲ با @import دو فایل glass.css (۴ خط) و navigation.css (۸ خط) رو می‌کشه؛ یعنی مرورگر اول admin.css رو می‌گیره بعد دو درخواست پشت‌سرهم (آبشار) و تا رسیدنشون منوی ادمین بدون استایل می‌پره (FOUC). فقط همین دو @import توی dist/admin هستن (grep). پیشنهاد: محتوای این دو فایل رو عین ترتیب فعلی (بالای admin.css، چون @import همیشه اول می‌نشینه) تو خود admin.css بچسبونیم و دو فایل رو پاک کنیم؛ هیچ نام‌گذاری یا سلکتور عوض نمی‌شه.

حذف ≈۱۴ خط (۲ فایل + ۲ import)، اضافه ≈۱۲ خط جابه‌جاشده. خروجی: دو درخواست و دو فایل کمتر در هر صفحهٔ ادمین.

ریسک: ترتیب cascade باید دست‌نخورده بمونه (همون جایگاه اول). تست‌های admin-ui-check و admin-workflow-ui-check و check:ui-layout همین رو می‌گیرن. دیپلوی: assetRevision خودش hash می‌گیره، کش مشکلی نداره.

R3-c (کوچک): حذف test:serial تکراری از package.json

اسکریپت test:serial یک کپیِ دستی و ≈۱٫۳ کیلوبایتی از لیست اسکریپت test هست (۳۵ تا نام، دو بار نوشته). هر وقت تست جدید می‌آد باید دوجا ویرایش بشه و تا حالا هم یکی‌شون جا مونده می‌شه (مثلاً test شامل seo-check هست ولی serial نه). run-parallel.cjs از قبل RI_JOBS=1 رو می‌فهمه که یعنی دقیقاً همون اجرای پشت‌سرهم. هیچ جا (README، docs، CI، tests) به test:serial ارجاع نیست. پیشنهاد: حذفش، و یک خط در README: «اجرای ترتیبی = RI_JOBS=1 npm test».

حذف ۱ خط بلند package.json (≈۱٬۲۸۰ کاراکتر)، اضافه ۱ جمله در README.

ریسک: کسی اگر لوکال با test:serial عادت داشته باید دستور جدید رو بزنه؛ CI و دیپلوی تأثیری ندارن چون فقط npm test و check:* استفاده می‌شن.
