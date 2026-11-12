N3-a (بزرگ) — نسخهٔ نهایی

هر چهار اصلاح را قبول دارم. Maryam: خروجی اطلاعات در settings.js:64 فقط از RI.C() ساخته می‌شود، پس دکمهٔ خروجی یک fetch از `/api/dashboard/applications` هم می‌کند و ردیف‌ها را کنار JSON می‌گذارد. Reza: حالت خالی آموزشی («اولین درخواستی که فرستادی را اضافه کن؛ روز پیگیری را یادت می‌اندازیم»)، برچسب‌ها پیش‌نویس، فرستادم، مصاحبه، رد شد، پیشنهاد کاری؛ آیتم منو در گروه ابزارها کنار «آمار» و نه یک ردیف جدید در منوی موبایل؛ تست check:ui در ۳۹۰ برای فرم و کارت‌ها. Elham: یادآوری پیگیری از همان تابع مشترک «reference یکتا در user_notifications» در notifications/service.cjs می‌رود که C2-b اول می‌سازد؛ حلقهٔ جدا نمی‌نویسم. ترتیب NAV در app.js: R2-a، C3-b، بعد من.
شکل نهایی فاز ۱: src/database/applications.cjs (جدول با CASCADE)، src/dashboard/applications.cjs و مسیر در http.cjs، pages/applications.js، لینک فقط http/https با rel="noopener noreferrer"، سقف ۲۰۰ ردیف، متن آگهی ذخیره نمی‌شود. تست: tests/applications-check.cjs با MySQL واقعی (javascript: رد می‌شود، جدایی کاربران، حذف حساب، یک اعلان برای دو tick، ردیف‌ها در export). فاز ۲ دکمهٔ فندق در دسکتاپ؛ فاز ۳ بعد از C3-a.

N3-b — نسخهٔ نهایی

قبول: بی‌صدا نمی‌رود. تابع `interviewQuestions(content)` در advisor-brain.js جای متن ثابت خط ۳۱۷ می‌نشیند: تا ۵ سؤال از experience و projects، مقدارها escape، رزومهٔ خالی ۳ سؤال عمومی، بدون نمره، بدون ذخیره یا ارسال. یک خط در src/releases.json می‌آید («فندق حالا برای مصاحبه سؤال‌هایی از رزومهٔ خودت می‌پرسد»). تست در tests/advisor-brain-check.cjs: رزومهٔ خالی ۳ سؤال بدهد، نام شرکت escape شود و هیچ fetch صدا زده نشود. حدود ۸۰ خط، همراه R2-c و N3-c در یک ریلیز مشکلی ندارد.

N3-c — نسخهٔ نهایی

بدون اصلاح؛ می‌ماند: وابسته به N3-a فاز ۱ و فقط بعد از آن. `coverDraft(content, jobText)` در advisor-brain.js، همگام و بدون Worker، فقط مهارت‌های رزومه که در words(jobText) هستند و نقل مستقیم یک جمله از desc تجربه. هیچ عدد یا سالی ساخته نمی‌شود. متن آگهی در حافظهٔ صفحه می‌ماند و ذخیره نمی‌شود. دکمه در pages/applications.js با برچسب «پیش‌نویس». تست در tests/advisor-brain-check.cjs: رزومهٔ بدون عدد و آگهی پر از عدد و سال؛ هر عددِ خروجی باید عیناً در رزومه باشد. حدود ۱۰۰ خط.
