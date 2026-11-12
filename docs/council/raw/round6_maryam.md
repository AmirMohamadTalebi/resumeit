# دور ۶ · مریم: رأی دو مورد تازه + بازبینی جزئیات

## ۱) رأی

R1-d — ✅ — بزرگ: خیر. کار درستی است و رندر و شناسه‌ها دست نمی‌خورند (data.js:29-33 تأیید شد: هر سه free و stack)، ولی کاربر فقط دو کارت کمتر در گالری می‌بیند. «به‌روزرسانی بزرگ» نیست؛ مثل یک کوچکِ خوب است.
R2-d — ✅ — ده نام را با grep -w روی dist، src، tests و scripts چک کردم: هر کدام فقط همان خط تعریف را دارند و `BADGES` دو خط. `groups` و `preference` در coral.js فقط داخل `polishShellLegacy` به کار رفته‌اند. پس ادعای «تأییدنشده» درست است.

## ۲) بازبینی جزئیات

N1-a — ⚠️ اصلاح لازم: `account_access` ستون reference ندارد (schema.cjs:18)، پس «ردیف account_access با همان reference» شدنی نیست. یکتایی پاداش قالب یا اشتراک باید با یک ردیف `wallet_credit_claims` از نوع `referral-tier:<inviterId>:<n>` با delta صفر، در همان تراکنش، تضمین شود. هدیهٔ یک ماه اشتراک هم باید منطق `purchaseWithWallet` را تکرار کند، یعنی پایان را از `max(now, expires_at)` تمدید کند. `ON DUPLICATE KEY UPDATE` فعلی `price_units` و `created_at` را بازنویسی می‌کند و روزهای باقی‌مانده یا سابقهٔ خرید را خراب می‌کند.
N1-b — ⚠️ اصلاح لازم: با R1-d دو صفحهٔ نمونه حذف می‌شوند و عدد ۱۲ است، نه ۱۴. تست seo-check باید از `RI.RESUME_TEMPLATES/LINK_TEMPLATES` فهرست بگیرد، نه عدد ثابت.
N1-c — ⚠️ اصلاح لازم: صفحهٔ `/demo/` باندل RI ویرایشگر را ندارد؛ برای سه فیلد آن را بار نکنید، `textContent` کافی است. هنگام اعمال در resume.js مقدار از همان مسیر ذخیرهٔ عادی برود تا `model.content` سرور حد طول را اعمال کند.
N2-a — ⚠️ اصلاح لازم (حیاتی): طرح iframe کار نمی‌کند. صفحهٔ عمومی روی `slug.resumeit.ir` است و داشبورد روی `resumeit.ir`، پس `contentWindow.print()` با خطای cross-origin رد می‌شود؛ تازه پاسخ‌ها هم `X-Frame-Options: DENY` و `frame-ancestors 'none'` دارند (security.cjs:21-23). چاپ را از همان `RI.Preview` داخل داشبورد بگیرید (هم‌مبدأ است و همان قالب را رندر می‌کند)، یا لینک صفحهٔ عمومی را در تب تازه باز کنید که کاربر خودش چاپ کند. `print.css` باید به نقشهٔ `publicAssets` در static.cjs:9 اضافه شود، وگرنه روی زیردامنه سرو نمی‌شود. خروجی `?format=ats` هم باید `noindex` و canonical بدون پارامتر داشته باشد. هشدار: `model.publicContent` (model.cjs:76) contactهای خصوصی را حذف نمی‌کند، پس فیلتر `public&&value` در `atsHtml` الزامی است و تست (۲) باید دقیقاً همین را بگیرد.
N2-b2 — ✅ قبول. فقط فهرست فیلدهای مستثنا روی نام فیلد بماند، نه روی نوع input، و فیلد `handle` شبکه‌های اجتماعی هم در آن باشد که هست.
N2-c — ✅ قبول، با همان هشدار: `publicContent` contact خصوصی را حذف نمی‌کند، پس فیلتر `public:true` در `vcard()` تنها سد است و تستش اجباری است، که در طرح هست.
N3-a — ⚠️ اصلاح لازم: خروجی اطلاعات در settings.js:64 فقط از `RI.C()` سمت کلاینت ساخته می‌شود، پس ردیف‌های `job_applications` خودبه‌خود در آن نمی‌آیند. یک fetch از `/api/dashboard/applications` به همان دکمه اضافه شود. بقیه درست است: `javascript:` رد می‌شود و CASCADE و reference یکتای اعلان سر جایشان‌اند.
N3-b — ✅ قبول.
N3-c — ✅ قبول.
C1-a — ⚠️ اصلاح لازم: (۱) بازگردانی باید از همان مسیر store در media.cjs بگذرد تا `orphaned_at` تصویرهای برگشته NULL شود (media.cjs:25)؛ وگرنه تصویری که پیش از بازگردانی orphan خورده، بعد از مهلت پاک می‌شود. تست (۱) هم همین را بگیرد. (۲) شما نسخه را پیش از «شروع از صفر» نگه می‌دارید، ولی کاربری که برای پاک کردن داده‌اش reset می‌زند، انتظار دارد داده برود. متن تأیید reset باید بگوید «یک نسخه نگه داشته می‌شود»، و در صفحهٔ نسخه‌ها یک «حذف همهٔ نسخه‌ها» باشد. چون خروجی نسخه‌ها را حذف کرده‌اید، این حداقلِ حریم خصوصی است.
C1-b2 — ⚠️ اصلاح لازم: canonical روی زیردامنهٔ کاربر است (http.cjs:70)، و `/assets/share-default-*.png` در `publicAssets` نیست، پس ممکن است روی زیردامنه سرو نشود. یا آدرس را از ریشه بسازید (`https://resumeit.ir/assets/...`) یا فایل را به `publicAssets` اضافه کنید. تست باید همان آدرس og را روی host زیردامنه بزند، نه روی ریشه.
C1-c — ✅ قبول.
C2-a — ⚠️ اصلاح لازم: reference درست است و تأیید شد (`'payment:'+provider+':'+id` در payments.cjs:72). اما مبلغ اعتبار در کد فعلی `credit_units ?? amount_toman` است، نه `amount_toman`. settleReview باید همین فرمول را عیناً به کار ببرد، وگرنه سفارش‌های دارای بونوس کم شارژ می‌شوند. ترتیب قفل (اول users، بعد payment_orders) با completePayment (payments.cjs:67-68) یکی است؛ همین بماند. claimPayment فقط pending و verifying برمی‌دارد (خط ۸۸)، پس ادعای «reconcile سفارش review را نمی‌گیرد» درست است.
C2-b — ⚠️ اصلاح لازم: ممکن است یک کاربر چند ردیف `subscription:*` داشته باشد. یادآوری فقط وقتی برود که بیشترین `expires_at` میان همهٔ ردیف‌های اشتراکش در پنجره است، همان منطق `billing()` در wallet.cjs:8؛ وگرنه کسی که پلن بلندتری دارد اخطار غلط می‌گیرد. تمدید از `max(now, expires_at)` حساب می‌شود (wallet.cjs) و idempotency با `purchase:<requestId>` موجود است؛ تأیید شد.
C2-c — ✅ قبول.
C3-a — ✅ قبول. ادعای canonical درست است: از origin و مسیر ساخته می‌شود و query ندارد. برای نقشهٔ `google.*` باید regex لنگرشده روی hostname باشد (`/(^|\.)google\.[a-z.]+$/`)، نه `includes`.
C3-b — ✅ قبول.
C3-c — ✅ قبول.
R1-d — ⚠️ اصلاح لازم: (۱) ریدایرکت در static.cjs شاید هیچ‌وقت اجرا نشود. dashboard/http.cjs:20 مسیر `/resumemono/` را چون `mono` هنوز در `RESUME_TEMPLATES` است sampleRoute می‌داند و اگر workspace نمونه‌ای با این نام در دیتابیس باشد، همان را سرو می‌کند. پس ریدایرکت باید در dashboard/http.cjs پیش از خط ۲۰ بنشیند و تست آن را با نمونهٔ دیتابیسی هم بزند. (۲) کوئری گیت فقط `draft` جدول `dashboard_documents` را می‌خواند. باید `published` را هم بخواند، و `dashboard_workspaces` را هم.
R1-a — ✅ قبول، با همان ترتیب.
R1-bc — ✅ قبول.
R2-a — ⚠️ اصلاح لازم: هدایت `billing/index.html` نباید اسکریپت inline باشد، چون `script-src` فقط self و hash است (security.cjs:21). باید داخل app.js و با شرط `data-page==='billing'` باشد، که ظاهراً منظور همین است؛ صریحش کنید.
R2-c — ✅ قبول.
R2-d — ✅ قبول، بعد از R2-a فاز ۱.
R3-a2 — ✅ قبول. محدودهٔ ۱۵ فایل درست است و fandogh.css و charts.css واقعاً در publicAssets هستند (static.cjs:18-19).
R3-b — ✅ قبول.
R3-d — ✅ قبول. ادعای «بی‌ارجاع» را برای همهٔ ۲۹ سند چک کردم. تنها برخوردها نام پوشهٔ `artifacts/` در تست‌هاست (`all-template-refinement`، `vista-refinement`، `three-pass-review`)، نه خواندن سند، و ارجاع سندهای حذفی به هم.
