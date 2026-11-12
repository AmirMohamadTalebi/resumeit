C1-a (نهایی، بزرگ) — همهٔ اصلاح‌ها را می‌پذیرم.

الهام: dashboard_versions داخل آرایهٔ tables در media.cjs نمی‌رود. در store، بعد از حلقهٔ موجود، یک کوئری جدا SELECT content FROM dashboard_versions WHERE user_id=? می‌زند و hashهای آن را به مجموعهٔ still اضافه می‌کند؛ releaseVersionImages حذف شد (حذف نسخهٔ قدیمی فقط ردیف را پاک می‌کند و تصویر در sweep بعدی خودش بی‌ارجاع می‌شود). مریم: بازگردانی از همان mutateDashboard و مسیر media.store می‌رود، پس added و پاک‌شدن orphaned_at خودکار است؛ ردیف نسخه فقط با revision درست خوانده می‌شود. اگر reset نسخه نگه دارد، پیام بعد از پاک‌سازی می‌گوید «یک نسخهٔ پشتیبان ماند، از زبانهٔ نسخه‌ها برگردان»، و دکمهٔ «حذف همهٔ نسخه‌ها» (DELETE با تأیید، فقط همین جایگاه) هست. رضا و مریم: نسخه‌ها در خروجی اطلاعات می‌آیند، چون خروجی settings.js سمت کلاینت است، دکمهٔ export ‏GET /api/dashboard/versions?full=1 را هم می‌خواند.

شامل: جدول با slot، ثبت نسخه در publish و reset و restore، سقف ۲۰، POST /restore با revision و model.content (دسترسی قالب و فونت دوباره چک)، زبانهٔ «نسخه‌ها» با RI.pubDiff. پیام پس از بازگردانی: «فقط پیش‌نویس برگشت؛ صفحهٔ عمومی تا انتشار عوض نمی‌شود»، و اگر قالب یا فونت پولی به پیش‌فرض افتاد، توضیح آرام با لینک خرید یا تمدید.
تست‌ها: mysql-races-check (sweep با ساعت جلو، دو restore هم‌زمان، قالب نخریده، سقف، deleteAccount، حذف همه)، dashboard-api-check (export و slot).
فاز ۱: جدول، ثبت، sweep، تست‌ها. فاز ۲: UI، restore، export.
نمی‌کنم: نسخهٔ ساعتی، بازگردانی تک‌بخش، انتشار خودکار.

C1-b2 (نهایی) — می‌پذیرم.
origin در http.cjs:73 زیردامنهٔ کاربر است، پس آدرس از origin ریشه ساخته می‌شود (همان مقدار دامنهٔ اصلی که سرور برای canonicalهای عمومی دارد؛ در پیاده‌سازی با RI.DOMAIN/پیکربندی تأیید می‌شود) و دو PNG در publicAssets (src/http/static.cjs:9) ثبت می‌شوند، تا از زیردامنه هم خوانده شوند. تصویر dist/assets/share-default-resume.png و share-default-links.png، ۱۲۰۰×۶۳۰. RI.shareCard.isDefault برای «سلامت کارت» و برچسب «افزودن تصویر خودت» حفظ می‌شود. تست در seo-check و dashboard-public-ui-check: صفحهٔ بدون تصویر og:image مطلق https روی دامنهٔ ریشه دارد و همان نشانی هم از ریشه و هم از زیردامنه ۲۰۰ و image/png می‌دهد. ~۵۰ خط. تک‌فاز.

C1-c (نهایی) — بدون اصلاح تازه.
RI.pubDiff یک‌بار در state.js کنار pubDirty، با نقشهٔ نام بخش، فقط فیلدهای قابل‌فهم، برچسب‌ها با esc، بدون API. در publish.js زیر چیپ «تغییرات منتشرنشده» فهرست کوتاه با «رفتن به بخش»، و C1-a از همان استفاده می‌کند. تست در dashboard-check (یک مهارت = یک ردیف، متن img onerror escape). ~۸۰ خط. تک‌فاز، اول ساخته می‌شود تا C1-a روی آن سوار شود.
