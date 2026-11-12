R1-d (بزرگ): یک کارت «ساده» با سه لحن به‌جای سه قالب رایگانِ هم‌شکل در گالری

بررسی کد، و یک اصلاح مهم نسبت به پیام قبل: شناسه‌ها را نباید alias کرد. `theme.resume` یک رشته است (`campus|mono|journal`) و تنظیمات هر قالب با همان شناسه در `c.resumeTemplates[id]` ذخیره می‌شود (`resume-templates.js:19`)، `checkAccess` در `model.cjs:78` شناسهٔ ناشناخته را به اولین قالب رایگان برمی‌گرداند، و مسیرهای نمونه از `RI.RESUME_TEMPLATES` ساخته می‌شوند (`dashboard/http.cjs:20`). پس سه ورودی در `data.js` و رندر (`preview.js:98`، فقط `t.v`، `t.layout`، `t.serif`) بدون تغییر می‌مانند؛ هر رزومهٔ منتشرشده بایت‌به‌بایت همان است، چون هیچ خطی از رندر لمس نمی‌شود.

کاری که می‌کنیم: فیلد `group:'plain'` روی سه ورودی؛ `gallery()` در `pages/themes.js` اعضای هم‌گروه را یک کارت «ساده» نشان می‌دهد با سه دکمهٔ لحن (کرم، خاکستری، دفترچه‌ای) که همان handler موجود `data-use` را صدا می‌زنند و `theme.resume` را عوض می‌کنند. کاتالوگ ادمین (`admin/http.cjs:72`) و قیمت‌گذاری (`rt:` ref) دست‌نخورده‌اند؛ هر سه رایگان‌اند و هیچ خریدی لمس نمی‌شود. تصویر کارت: `resume-campus.jpg`؛ دو تصویر دیگر در `brand/template-thumbs` و دو کارت `dist/index.html` خط ۱۰۹ و ۱۱۰ حذف می‌شوند. صفحه‌های نمونهٔ `/resumemono/` و `/resumejournal/` حذف و در `static.cjs` (کنار ریدایرکت ۳۰۸ خط ۱۰۷) با یک جدول کوچک `SAMPLE_ALIASES` به `/resumecampus/` برده می‌شوند.

فازها: ۰) گیت: مالک این کوئری را اجرا کند: `SELECT JSON_UNQUOTE(JSON_EXTRACT(draft,'$.theme.resume')) t,COUNT(*) FROM dashboard_documents GROUP BY t`. اگر `mono` یا `journal` هر کدام بیش از ۱۵٪ رزومه‌ها باشند، فقط فاز ۱ (کارت یکی) می‌رود و صفحه‌ها می‌مانند. ۱) گالری و لندینگ. ۲) حذف دو صفحهٔ نمونه و ریدایرکت.

تست‌ها: `tests/resume-templates-check.cjs`، هش `sha256` خروجی `render()` برای هر سه شناسه با `blank()` برابر مقدار ثبت‌شدهٔ قبل از تغییر. `tests/dashboard-public-ui-check.cjs`، گالری یک کارت `plain` دارد و کلیک «دفترچه‌ای» `RI.C().theme.resume==='journal'` می‌کند. `tests/public-audit-migration-check.cjs:41`، `/resumejournal/` پاسخ ۳۰۸ به `/resumecampus/` می‌دهد. 

حذف حدود ۳۵KB (دو صفحه، دو تصویر، دو کارت)؛ اضافه حدود ۴۰ خط. اندازهٔ بایتی خالص منفی است، تعداد خط تقریباً برابر؛ وزنش در سادگی انتخاب قالب است (۱۱ کارت به ۹).

نمی‌کنیم: حذف شناسه، مهاجرت دیتابیس، دست‌بردن به قالب‌های پولی، تغییر `render` یا `preview.js`.

R1-a (نگهداری): پوستهٔ عمومی، جزئیات

فایل‌ها: `src/http/partials/{head,header,footer}.html` و تابع `inject(html)` در `static.cjs` که مارکرهای `<!--site-footer-->` و ... را قبل از بازنویسی `?v=` و کش `rewrittenBodies` جایگزین می‌کند (ترتیب شرط مریم). صفحه‌ها: about، contact، privacy، terms، resume-builder، resume-website، blog و شش مقاله (`changes` به‌خاطر تفاوت هدر در فاز بعد). تست‌ها: `tests/static-cache-check.cjs`، `/about/` دقیقاً یک `.ln-foot` دارد و `?v=` روی لینک‌های partial هم اعمال شده؛ `tests/site-content-check.cjs`، همین ادعا روی ۱۴ مسیر در ۳ عرض. فاز ۴ (ادغام `style.css`/`frozen.css` در `info.css`، حذف `assets/vazirmatn.woff2`) فقط بعد از ریلیز R1-bc و با فهرست سلکتورها ضمیمهٔ spec و عکس‌مقایسهٔ `check:ui`. خط‌ها: حذف حدود ۴۵۰، اضافه حدود ۹۰ کد و ۴۰ خط CSS منتقل‌شده. نمی‌کنیم: دست‌زدن به landing.css، تغییر ظاهر، لمس `changes` پیش از فاز ۱ تا ۳.

R1-bc (کوچک): فایل‌های یتیم و کپی‌های تکراری

حذف: `dist/refined.css`، `experience.css`، `performance.css`، `dist/brand/it-cat-coin-v1.png`، `dist/signature/`، سه `favicon.svg` یتیم (`dist/assets`، `dist/auth-ui/assets`، `dist/dashboard/assets`) و `dist/auth-ui/assets/fonts/Vazirmatn.woff2`. ویرایش: `dist/auth-ui/css/tokens.css` خط ۶ به `/assets/fonts/Vazirmatn.woff2`. چهار تست مسیر `/signature/` را از لیست برمی‌دارند: `browser-audit-check:43`، `full-ui-audit:17`، `site-interaction-contrast-check:19`، `site-content-check` (assertion ۲۰۰ حذف می‌شود)؛ `signature` در `TAKEN_SLUGS` می‌ماند. تست جدید در `static-cache-check`: `GET /assets/fonts/Vazirmatn.woff2` وضعیت ۲۰۰ و `font/woff2`؛ `check:ui` روی `/login/`، `/register/`، `/forgot-password/`. حدود ۳۵۰ خط و ۳۶۰KB حذف، یک خط ویرایش. نمی‌کنیم: حذف `dist/assets/vazirmatn.woff2` (تا فاز ۴ R1-a)، حذف `docs`.
