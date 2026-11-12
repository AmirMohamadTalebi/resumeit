R1-e (بزرگ، نهایی): بازسازی سایت عمومی — بدون daisyUI، یک پوسته، یک استایل‌شیت

شواهد تازه (با اسکریپت روی کد): ۱۴ صفحهٔ info/blog/demo، `assets/daisyui.css` را لود می‌کنند؛ ۱٫۱MB خام و حدود ۹۹KB فشرده. از ۷۰۹ کلاسی که این فایل تعریف می‌کند، در HTML و JS این صفحه‌ها فقط `btn` و `link` پیدا شد، و `.btn` را `style.css` و `info.css` خودشان تعریف می‌کنند. یعنی هر خواننده، پیش از دیدن اولین مقاله، یک کتابخانهٔ تقریباً بی‌مصرف را دانلود و پارس می‌کند. این را کاربر موبایل در ایران حس می‌کند.

فازها، هر کدام مستقل:
۱) برداشتن لینک `daisyui.css` از ۱۴ صفحهٔ عمومی (نه از login/register تا چک جدا)، با انتقال حدود ۲۰ خط `.btn`/`.link` لازم به `info.css`. حذف: حدود ۹۹KB فشرده از هر صفحه.
۲) همان پوستهٔ R1-a: `src/http/partials/{head,header,footer}.html` و `inject()` در `static.cjs` قبل از `?v=` و کش `rewrittenBodies`. حذف حدود ۴۵۰ خط و ۸۵KB HTML تکراری.
۳) بعد از ریلیز R1-bc: ادغام قاعده‌های زندهٔ `style.css`/`frozen.css` در `info.css` (فهرست سلکتورها ضمیمهٔ spec)، حذف دو فایل و `assets/vazirmatn.woff2`: ۴۲KB خام حذف، حدود ۱۲KB منتقل.
۴) اگر `check:ui` روی ورود، ثبت‌نام و فراموشی رمز بدون daisy سالم بود، `daisyui.css` کلاً حذف می‌شود (۱٫۱MB).

مجموع: حدود ۱٫۲MB خام و ۱۲۰–۱۳۰KB فشرده کمتر برای هر صفحه؛ اضافه حدود ۹۰ خط کد/partial و ۸۰ خط CSS. `/resume-builder/` و `/resume-website/` را ادغام نمی‌کنم: عنوان و کلیدواژهٔ جدا دارند و `tests/seo-check.cjs` هر دو را assert می‌کند.

ریسک: پسرفت بصری دکمه و لینک؛ پوشش: عکس‌مقایسهٔ `check:ui` در ۱۴۴۰/۳۹۰/۳۲۰ برای ۱۴ صفحه، و هر فاز جدا ریلیز. ریسک دوم: صفحه‌های auth شاید کلاس daisy واقعاً بخواهند؛ تا اثبات نشده فاز ۴ نمی‌رود. سرعت واقعی را هنوز با Lighthouse اندازه نگرفته‌ام. به رزومه‌ها، خریدها و URLها ربطی ندارد.

R1-d (نهایی): یک کارت «ساده» با سه لحن

شناسه‌های `campus|mono|journal` و رندر دست‌نخورده می‌مانند (بایت‌به‌بایت، تست هش `render()` در `resume-templates-check.cjs`). فیلد `group:'plain'`؛ `gallery()` در `pages/themes.js` یک کارت نشان می‌دهد، با سه دکمهٔ لحن که رنگ‌نمونهٔ `v.bg`/`v.accent` هر عضو را دارند و لحن فعلی کاربر (`th().resume`) را انتخاب‌شده نشان می‌دهند؛ کلیک از handler موجود `data-use` رد می‌شود. فیلتر دسته‌ها اجتماع دسته‌های اعضاست (دفترچه `creator` دارد). ریدایرکت `/resumemono/` و `/resumejournal/` در `src/dashboard/http.cjs` پیش از خط ۲۰ می‌نشیند (چون sampleRoute اول نمونه‌های DB را سرو می‌کند و ریدایرکت در `static.cjs` هرگز اجرا نمی‌شود) و ۳۰۸ به `/resumecampus/?tone=mono` می‌دهد؛ صفحه `tone` را می‌خواند و لحن درست را باز می‌کند. دو صفحه، دو تصویر و دو کارت لندینگ حذف (حدود ۳۵KB)، اضافه حدود ۴۰ خط. گیت: مالک اجرا کند `SELECT t,COUNT(*) FROM (SELECT JSON_UNQUOTE(JSON_EXTRACT(draft,'$.theme.resume')) t FROM dashboard_documents UNION ALL SELECT JSON_UNQUOTE(JSON_EXTRACT(published,'$.theme.resume')) FROM dashboard_documents UNION ALL SELECT JSON_UNQUOTE(JSON_EXTRACT(draft,'$.theme.resume')) FROM dashboard_workspaces) x GROUP BY t`؛ اگر `mono` یا `journal` هرکدام بیش از ۱۵٪ بود، فقط کارت یکی می‌شود و صفحه‌ها می‌مانند. تست‌ها: هش رندر، ریدایرکت ۳۰۸ در `public-audit-migration-check:41`، کلیک لحن در `dashboard-public-ui-check`. نمی‌کنیم: alias شناسه، مهاجرت DB، لمس قالب‌های پولی.

R1-bc (نهایی): فایل‌های یتیم و کپی‌های تکراری

حذف `dist/refined.css`، `experience.css`، `performance.css`، `brand/it-cat-coin-v1.png`، `dist/signature/`، سه favicon بی‌ارجاع، `auth-ui/assets/fonts/Vazirmatn.woff2` (با تغییر `auth-ui/css/tokens.css` خط ۶ به `/assets/fonts/Vazirmatn.woff2`). چهار تست (`browser-audit-check:43`، `full-ui-audit:17`، `site-interaction-contrast-check:19`، `site-content-check`) مسیر `/signature/` را برمی‌دارند و `signature` در `TAKEN_SLUGS` می‌ماند. تست فونت ۲۰۰ در `static-cache-check` و `check:ui` روی سه صفحهٔ auth. حدود ۳۵۰ خط و ۳۶۰KB حذف، یک خط ویرایش. `assets/vazirmatn.woff2` تا فاز ۳ R1-e می‌ماند.
