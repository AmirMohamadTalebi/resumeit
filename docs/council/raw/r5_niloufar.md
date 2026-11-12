C1-a (بزرگ) — جزئیات اجرا: ماشین زمان رزومه

اسکیما (در initialize فایل src/database/media.cjs یا schema.cjs، CREATE TABLE IF NOT EXISTS، بدون migration):
dashboard_versions(id BIGINT AUTO_INCREMENT PK, user_id CHAR(36), slot TINYINT, kind ENUM('publish','reset','restore'), page VARCHAR(8), content JSON, created_at BIGINT, INDEX(user_id,slot,id), FK users ON DELETE CASCADE). ستون slot الزامی مریم است. سقف ۲۰ نسخه برای هر (user,slot): بعد از هر درج، قدیمی‌ترها پاک می‌شوند.

شرط «sweep باید نسخه‌ها را بشمارد»: در media.cjs آرایهٔ tables برای محاسبهٔ still فقط جدول‌های سند را می‌خواند. جدول dashboard_versions را هم با content اضافه می‌کنم (media.documentHashes({content})). نتیجه: تصویری که فقط در نسخهٔ قدیمی هست orphan علامت نمی‌خورد و sweepDashboardMedia (خط ۴۸) دست نمی‌زند. وقتی نسخه‌ای با سقف ۲۰ حذف شود، همان تابع store-like یک تابع کوچک releaseVersionImages، hashهای آن را دوباره حساب و اگر جای دیگر نیست orphan می‌کند.

شرط «بازگردانی با mutateDashboard و revision»: مسیر تازهٔ POST /api/dashboard/restore در src/dashboard/http.cjs، با همان scoped و workspace؛ ورودی {versionId, revision}. داخل mutateDashboard(user.id,input.revision,doc=>…,{workspace,checkAccess:true}): اول نسخهٔ فعلی با kind=restore ذخیره می‌شود (همان تراکنش، پس بازگردانی خودش واگردپذیر است)، بعد doc.content=model.content(version.content,billing,doc.content,{known}). model.content همان checkAccess را اجرا می‌کند (model.cjs خط ۷۵ تا ۸۱): قالب، پالت و فونتی که کاربر نخریده یا اشتراکش تمام شده، به پیش‌فرض برمی‌گردد و بقیهٔ محتوا برمی‌گردد. چک دوبارهٔ دسترسی پولی همین است، نه کد جدید. هم‌زمانی با ذخیره: ناهمخوانی revision فوراً REVISION_CONFLICT (۴۰۹) می‌دهد. بازگردانی فقط پیش‌نویس را عوض می‌کند و منتشر نمی‌کند.

ثبت نسخه: درون همان action انتشار (http.cjs خط ۱۷۱) و در reset.cjs پیش از پاک‌سازی؛ بدون نسخهٔ خودکار ساعتی.

UI: زبانهٔ تازهٔ «نسخه‌ها» در publish.js (TABS)، لیست، پیش‌نمایش با RI.Preview و «چه فرقی دارد» از RI.pubDiff (C1-c). API فهرست GET /api/dashboard/versions بدون content سنگین.

تست‌ها: tests/mysql-races-check.cjs، واقعی MySQL: (۱) نسخه با تصویر X بساز، X را از پیش‌نویس بردار، ساعت را جلو ببر و sweepDashboardMedia بزن، تأیید کن X ماند و restore موفق است. (۲) دو restore هم‌زمان با یک revision، یکی ۴۰۹. (۳) restore روی قالب نخریده، قالب به پیش‌فرض برگردد. (۴) نسخهٔ بیست‌ویکم قدیمی‌ترین را حذف کند. (۵) deleteAccount همه را پاک کند. tests/dashboard-api-check.cjs: slot دیگر دیده نشود.

فازها: فاز ۱ جدول، ثبت، sweep، تست‌ها (بدون UI)؛ فاز ۲ UI و restore.

نمی‌کنم: نسخهٔ خودکار ساعتی، بازگردانی تک‌بخش، بازگردانی خودکار منتشرشده، صادرات نسخه‌ها به کاربر (فعلاً فقط حذف با حساب)، نگه‌داری تصویر پس از حذف حساب.

C1-b2 — جزئیات: تصویر پیش‌فرض اشتراک

فایل‌ها: dist/assets/share-default-resume.png و share-default-links.png (۱۲۰۰×۶۳۰). در src/dashboard/http.cjs خط ۷۳، به‌جای null: ogImage=origin+'/assets/share-default-'+kind+'.png' با origin مطلق https (همان canonical که آن‌جا حساب می‌شود). شرط مریم: https مطلق، نه مسیر نسبی. در data.js:68 فقط برای پیش‌نمایش داشبورد fallback اضافه می‌شود، و RI.shareCard.isDefault=true تا «سلامت کارت منتشرشده» (publish.js health) آن را تصویر خود کاربر نشمارد و هشدار «تصویر خودت را اضافه کن» را نگه دارد (شرط رضا). برچسب «افزودن تصویر خودت» کنار پیش‌نمایش کارت می‌آید. تست: tests/seo-check.cjs، صفحهٔ بدون تصویر og:image مطلق https دارد و همان نشانی با ۲۰۰ و image/png باز می‌شود. CSP/تصویر عمومی از /assets مجاز است. بزرگی ~۴۰ خط. نمی‌کنم: تولید پویا با نام کاربر.

C1-c — جزئیات: RI.pubDiff

یک تابع در dist/dashboard/js/state.js کنار pubDirty (خط ۳۱۸): RI.pubDiff(kind, other=snap منتشرشده) که JSON.parse(s.snap) را با RI.pubData(kind) بخش‌به‌بخش می‌سنجد و [{key, label, change}] می‌دهد. برچسب از META در resume.js یا یک نقشه کوچک در data.js (نه تکرار)، و در publish.js همه با esc رد می‌شود؛ فیلدهای فنی (id) نادیده. C1-a همین را صدا می‌زند. تست: tests/dashboard-check.cjs، تغییر یک مهارت یعنی یک ردیف «مهارت‌ها»، متن شامل <img onerror> escape شود. ~۸۰ خط. نمی‌کنم: diff سطح حرف، API جدید.
