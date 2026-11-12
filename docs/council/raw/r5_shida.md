N2-a (بزرگ): جزئیات پیاده‌سازی «خروجی رزومه»

چهار فاز، هر کدام مستقل ریلیز می‌شود. هیچ جدول و schema تازه‌ای لازم نیست.

فاز ۱ (چاپ A4): فایل تازهٔ `dist/public-assets/print.css` که `preview.css` و قالب‌های داخلی را پوشش می‌دهد: `@page{size:A4;margin:14mm}`، حذف انیمیشن، فرم پیام، دکمه‌ها و پاورقی برند، `break-inside:avoid` روی کارت تجربه/تحصیلات. شرط داوران: ادغام نه موازی با چاپ موجود. پس `core.css` و `22fd…css` در `dist/templates/satiar/` و `shabtab.css` را دست نمی‌زنیم؛ print.css فقط برای صفحه‌هایی لینک می‌شود که `imported` نیستند (شرط `imported?'':...` در `src/dashboard/http.cjs:77`)، و تست Playwright چاپ Satiar/Shabtab/Vista را جداگانه می‌گیرد. دکمهٔ «دانلود PDF» فقط در داشبورد (`dist/dashboard/js/pages/publish.js`، کنار `data-native-share`): iframe پنهان همان آدرس عمومی را بار می‌کند و `contentWindow.print()` را صدا می‌زند. شرط مریم و رضا: هیچ `?print=1` و هیچ print خودکار در صفحهٔ عمومی نیست؛ فقط کلیک صاحب حساب. مسیر عمومی دست نمی‌خورد.

فاز ۲ (ATS رایگان): قالب `ats` فقط در حالت چاپ: تابع `atsHtml(c)` در `src/dashboard/render.cjs`، تک‌ستونی، بی‌عکس، بی‌رنگ، متن سادهٔ Vazirmatn، عنوان بخش‌ها استاندارد. ورودی فقط `model.publicContent(...)` و فقط contactهایی با `public:true`؛ هرگز contact خصوصی. از مسیر `?format=ats` روی همان صفحهٔ منتشرشده (فقط HTML، بدون ذخیره). شرط داوران: ATS هیچ‌وقت قفل نمی‌شود و `RI.allowed` رویش اجرا نمی‌شود. اخطار بخش خالی از `RI.resumeRequirements` موجود می‌آید.

فاز ۳ (چاپ با قالب پولی): همین چاپ، قالب انتخاب‌شده را نگه می‌دارد. خریدار قالب پولی خروجی همان قالب را می‌گیرد؛ دیگران همان `publicContent` را می‌گیرند که قالب پولی را به رایگان برمی‌گرداند (کد موجود در `model.cjs:76`)، پس مسیر پولی جدید نداریم و پول دست نمی‌خورد.

فاز ۴ (اختیاری): خط‌کش «شکست صفحه» در پیش‌نمایش `resume.js`. جلوی ۱ تا ۳ را نمی‌گیرد؛ فقط اگر آن‌ها تمیز بودند.

تست: `tests/resume-print-check.cjs` در `package.json` زیر `check:templates`: (۱) پاسخ صفحهٔ عمومی `print(` و `?print` ندارد؛ (۲) خروجی ATS شمارهٔ `public:false` و رشتهٔ `<script` را نمی‌آورد؛ (۳) emulateMedia print روی هر قالب، عرض محتوا از A4 بیرون نمی‌زند؛ (۴) کاربر رایگان با قالب پولی: ATS باز است.

نمی‌کنیم: شمارش دانلود، vCard، تولید PDF سمت سرور (بدون Puppeteer)، `window.print` خودکار، قفل ATS، بازنویسی CSS قالب‌های وارداتی.

N2-b2: پاک‌سازی نگارشی فارسی

فقط سمت کلاینت. مریم و داوران درست گفتند که save سمت سرور با undo کلاینت تناقض دارد (draft با سرور فرق می‌کند و پرچم «تغییر منتشرنشده» بی‌دلیل روشن می‌شود). پس سرور را دست نمی‌زنیم؛ فقط اگر روزی لازم شد، سرور نسخهٔ نرمال‌شده را برگرداند.
فایل‌ها: تابع `RI.fixFa(value)` در `dist/dashboard/js/state.js`: ي→ی، ك→ک، فاصلهٔ دوتایی→یکی، فاصلهٔ پیش از `،.؟!:` حذف. ZWNJ (U+200C) و ارقام هرگز دست نمی‌خورند. در `resume.js` در listener `change` موجود (خط ۳۷۳ به بعد) روی blur و یک `paste` تازه: فقط `<input>`/`<textarea>` با `data-field` غیر از `url|email|phone|slug|handle|id` و فقط وقتی مقدار تغییر می‌کند؛ مقدار قبلی در حافظهٔ محلی نگه داشته می‌شود و toast «نگارش اصلاح شد · واگرد» با `RI.toast` عمل undo می‌دهد، و از همان مسیر ذخیرهٔ معمول (`input` event) می‌رود تا draft و سرور یکی بمانند.
تست: `tests/persian-fix-check.cjs`: `fixFa('كيان  ،')==='کیان،'`؛ رشتهٔ حاوی ZWNJ بدون تغییر؛ ایمیل و URL عربی‌نما دست نمی‌خورد؛ Playwright: paste «ي» و فشردن undo متن اصلی را برمی‌گرداند و پرچم تغییر منتشرنشده فقط یک بار روشن می‌شود. ~۹۰ خط.
نمی‌کنیم: تبدیل ارقام، دست‌زدن به سرور، اصلاح کد/لینک.

N2-c: vCard

گزینهٔ تازهٔ `inbox.vcard:false` کنار `inbox.enabled` (`dist/dashboard/js/data.js:237`)، اعتبارسنجی در `src/dashboard/model.cjs` مثل `enabled`، و سوئیچ در `messages.js` کنار سوئیچ فرم پیام. در `src/dashboard/http.cjs` پس از `share-image` مسیر `/contact.vcf`: اگر `vcard!==true` یا صفحه عمومی نیست، ۴۰۴. خروجی فقط از `model.publicContent` و contactهای `public:true` ساخته می‌شود؛ تابع `vcard(c)` با escape RFC 6350 (`\\`، `;`، `,`، خط‌شکن→`\\n`) و حذف `\r\n` از فیلدها؛ `Content-Disposition: attachment; filename=contact.vcf`، `text/vcard; charset=utf-8`. دکمه در صفحه فقط اگر روشن باشد.
تست در `tests/dashboard-api-check.cjs`: پیش‌فرض ۴۰۴؛ بعد از روشن‌کردن ۲۰۰؛ contact خصوصی و ورودی `x\nTEL:999` در خروجی نمی‌آید؛ هر خط جدید با `BEGIN/FN/END` است. ~۹۰ خط.
نمی‌کنیم: عکس در vCard، خودکار روشن، شمارندهٔ دانلود.
