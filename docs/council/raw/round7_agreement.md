# دور ۷ · نسخه‌های نهایی توافق‌شده

## arman

N1-a (بزرگ) — نسخهٔ نهایی
موافقم: reference پاداش قالب/اشتراک با ردیف wallet_credit_claims صفر‌دلتا به شکل referral-tier:<inviterId>:<n> در همان تراکنش (account_access ستون reference ندارد). موافقم: اشتراک هدیه از max(now, expires_at) تمدید شود و از همان تابع اعطای دسترسی مسیر خرید در wallet.cjs برود، بدون INSERT تازه و بدون بازنویسی price_units/created_at. موافقم: جملهٔ کوکی در privacy.
ارسال: فاز ۱ (ریلیز جدا): جدول referrals، users.referral_code، ?ref در brandFoot، کوکی ۳۰ روزهٔ ref با regex ^[a-z0-9]{8}$، ref_code در oauth_states، ستون عدد «ثبت‌نام با دعوت» در traffic ادمین، و در همان ریلیز در dist/privacy/index.html: «کد دعوت فقط برای شمارش ثبت‌نام است، بدون ردیابی دیگر». فاز ۲ (بعد از دیدن داده): referralReward در wallet.cjs، پاداش ۱ It به دعوت‌شده و قالب دلخواه یا یک ماه اشتراک به دعوت‌کننده بعد از ۳ دعوت، reference یکتا referral:<inviteeId>، FOR UPDATE، سقف ماهانه، تأخیر ۲۴ ساعته، کلید خاموش در owner settings. تست: referral-check.cjs و یک بلوک جدا در mysql-races-check.cjs (۱۰ درخواست موازی، سقف، تمدید اشتراک). فاز ۳ اختیاری: صفحهٔ دعوت؛ کاربرِ custom/hidden لینکش را از داشبورد می‌گیرد.

N1-b (کوچک) — نسخهٔ نهایی
موافقم: عدد ثابت نیست. og:title/description/url و og:image مطلق https (زیر ۱۰۰KB، در dist/brand/og/) برای هر صفحهٔ نمونه‌ای که RI.RESUME_TEMPLATES و RI.LINK_TEMPLATES فهرست می‌کنند (امروز ۱۴، بعد از R1-d احتمالاً ۱۲)؛ noindex,nofollow دست نمی‌خورد، sitemap هم نه. tests/seo-check.cjs فهرست را از همان آرایه‌ها می‌گیرد و برای هر کدام og کامل، https بودن، وجود فایل و حجم و noindex را همزمان می‌سنجد. اگر قالبی حذف شود، تصویرش هم حذف می‌شود و تست بی‌صدا رد نمی‌شود. نمی‌کنم: اسکریپت تولیدی، og پویا برای صفحه‌های کاربران.

N1-c (کوچک) — نسخهٔ نهایی
موافقم با همهٔ اصلاح‌ها: normalize را از نام نمی‌آورم (demo.js بسته RI داشبورد را بار نمی‌کند و لازم هم نیست)؛ سه فیلد فقط با textContent و حد طول ساده در demo.js، و بار دوم سرور حد را اعمال می‌کند چون اعمال در resume.js از همان مسیر ذخیرهٔ عادی (model.content) می‌گذرد. شمارندهٔ «ثبت‌نام با دمو» حذف شد (ستونی ندارد). کلید localStorage ri_demo_draft با انقضای ۷ روز و try/catch. کنار «ذخیره و ساخت صفحه‌ام» یک لینک کوچک «حساب دارم، ورود». در resume.js فقط روی پیش‌نویس خالی می‌پرسد: «متنی که در صفحهٔ نمونه نوشتی را در رزومه‌ات بگذاریم؟» با دکمه‌های «بگذار» و «نه، پاکش کن». تست Playwright demo-draft-check.cjs: ورودی <img onerror> فقط متن، انقضا، پرسش فقط روی پیش‌نویس خالی، لینک ورود. نمی‌کنم: ارسال داده به سرور قبل از ثبت‌نام.

## shida

N2-a (نسخهٔ نهایی)

هر سه ایراد قاضی‌ها را می‌پذیرم؛ iframe روی آدرس عمومی واقعاً کار نمی‌کند (cross-origin و `frame-ancestors 'none'` در `src/http/security.cjs:21-23`)، پس هدر عمومی شل نمی‌شود. چه چیزی ریلیز می‌شود: چاپ از پیش‌نمایش هم‌مبدأ داشبورد: همان مسیر ساخت `srcdoc` در `RI.Preview` (`dist/dashboard/js/preview.js:224`) در یک iframe پنهان داشبورد با `print.css` اضافه، و `print()` فقط با کلیک صاحب حساب. دکمه «ذخیره به‌صورت PDF» با زیرنویس «در پنجرهٔ چاپ، مقصد را ذخیره به‌عنوان PDF بگذار» در `publish.js`. روی موبایل یا اگر print خطا داد: صفحهٔ عمومی در زبانهٔ تازه باز می‌شود با کادر «منوی مرورگر ← اشتراک یا چاپ ← ذخیره به PDF» (تست Playwright با viewport موبایل). دکمهٔ جدای «نسخهٔ ساده برای سامانه‌های استخدام» همیشه دیده می‌شود و رایگان است. `?format=ats` از `atsHtml(c)` در `render.cjs` با `noindex`، canonical بدون پارامتر و فقط contactهایی با `public&&value`: چون `publicContent` contact خصوصی را حذف نمی‌کند، همین فیلتر تنها سد است و تست دارد. `print.css` به `publicAssets` در `src/http/static.cjs:9` اضافه می‌شود تا روی زیردامنه سرو شود؛ Satiar/Shabtab/Vista با پیش‌نمایش خودشان جدا تست می‌شوند. تست‌ها: `tests/resume-print-check.cjs` (نبود print خودکار در صفحهٔ عمومی، contact خصوصی و `<script` در ATS نیامدن، noindex، ATS برای رایگان باز، سرو `print.css` روی زیردامنه). فازها ۱ چاپ، ۲ ATS، ۳ چاپ قالب پولی (از همان `publicContent`)، ۴ اختیاری. نمی‌کنیم: شمارش دانلود، PDF سمت سرور، قفل ATS.

N2-b2 (نسخهٔ نهایی)

پذیرفتم: لیست مستثنا روی نام فیلد است نه نوع input (`url, email, phone, slug, handle, id`، که `handle` هست). پذیرفتم: toast فقط اولین اصلاح هر نشست می‌آید (پرچم `sessionStorage` داخل try/catch)، بعد از آن اصلاح بی‌صدا ولی واگرد آخرین اصلاح با Ctrl+Z یا همان toast در دسترس است. شیپ می‌شود: `RI.fixFa` در `dist/dashboard/js/state.js` (ي→ی، ك→ک، فاصلهٔ دوتایی و فاصلهٔ پیش از `،.؟!:`؛ ZWNJ و ارقام دست‌نخورده) روی blur و paste در `resume.js` فقط برای `input/textarea` دارای `data-field` مجاز، از مسیر ذخیرهٔ معمول تا draft و سرور یکی بمانند و پرچم منتشرنشده تکراری روشن نشود. سرور دست‌نخورده. تست `tests/persian-fix-check.cjs`: تبدیل درست، ZWNJ سالم، ایمیل/URL بی‌تغییر، toast دوم نیامدن و undo. یک ریلیز، بدون فاز.

N2-c (نسخهٔ نهایی)

پذیرفتم و متن سوئیچ را می‌گذارم: «بازدیدکننده بتواند اطلاعات تماس عمومی‌ات را با یک لمس در مخاطبینش ذخیره کند». شیپ می‌شود: `inbox.vcard:false` در `data.js:237` و `model.cjs`، سوئیچ در `messages.js`، مسیر `/contact.vcf` در `src/dashboard/http.cjs` کنار `share-image` که بدون روشن‌بودن گزینه ۴۰۴ می‌دهد. خروجی فقط contactهای `public&&value` (چون `publicContent` خصوصی‌ها را نمی‌برد، همین فیلتر تنها سد است) با escape RFC 6350 و حذف `\r\n`، `Content-Disposition: attachment`. تست در `tests/dashboard-api-check.cjs`: پیش‌فرض ۴۰۴، پس از روشن‌شدن ۲۰۰، contact خصوصی و تزریق `x\nTEL:999` در خروجی نیست. یک ریلیز، حدود ۹۰ خط.

## pouya

N3-a (بزرگ) — نسخهٔ نهایی

هر چهار اصلاح را قبول دارم. Maryam: خروجی اطلاعات در settings.js:64 فقط از RI.C() ساخته می‌شود، پس دکمهٔ خروجی یک fetch از `/api/dashboard/applications` هم می‌کند و ردیف‌ها را کنار JSON می‌گذارد. Reza: حالت خالی آموزشی («اولین درخواستی که فرستادی را اضافه کن؛ روز پیگیری را یادت می‌اندازیم»)، برچسب‌ها پیش‌نویس، فرستادم، مصاحبه، رد شد، پیشنهاد کاری؛ آیتم منو در گروه ابزارها کنار «آمار» و نه یک ردیف جدید در منوی موبایل؛ تست check:ui در ۳۹۰ برای فرم و کارت‌ها. Elham: یادآوری پیگیری از همان تابع مشترک «reference یکتا در user_notifications» در notifications/service.cjs می‌رود که C2-b اول می‌سازد؛ حلقهٔ جدا نمی‌نویسم. ترتیب NAV در app.js: R2-a، C3-b، بعد من.
شکل نهایی فاز ۱: src/database/applications.cjs (جدول با CASCADE)، src/dashboard/applications.cjs و مسیر در http.cjs، pages/applications.js، لینک فقط http/https با rel="noopener noreferrer"، سقف ۲۰۰ ردیف، متن آگهی ذخیره نمی‌شود. تست: tests/applications-check.cjs با MySQL واقعی (javascript: رد می‌شود، جدایی کاربران، حذف حساب، یک اعلان برای دو tick، ردیف‌ها در export). فاز ۲ دکمهٔ فندق در دسکتاپ؛ فاز ۳ بعد از C3-a.

N3-b — نسخهٔ نهایی

قبول: بی‌صدا نمی‌رود. تابع `interviewQuestions(content)` در advisor-brain.js جای متن ثابت خط ۳۱۷ می‌نشیند: تا ۵ سؤال از experience و projects، مقدارها escape، رزومهٔ خالی ۳ سؤال عمومی، بدون نمره، بدون ذخیره یا ارسال. یک خط در src/releases.json می‌آید («فندق حالا برای مصاحبه سؤال‌هایی از رزومهٔ خودت می‌پرسد»). تست در tests/advisor-brain-check.cjs: رزومهٔ خالی ۳ سؤال بدهد، نام شرکت escape شود و هیچ fetch صدا زده نشود. حدود ۸۰ خط، همراه R2-c و N3-c در یک ریلیز مشکلی ندارد.

N3-c — نسخهٔ نهایی

بدون اصلاح؛ می‌ماند: وابسته به N3-a فاز ۱ و فقط بعد از آن. `coverDraft(content, jobText)` در advisor-brain.js، همگام و بدون Worker، فقط مهارت‌های رزومه که در words(jobText) هستند و نقل مستقیم یک جمله از desc تجربه. هیچ عدد یا سالی ساخته نمی‌شود. متن آگهی در حافظهٔ صفحه می‌ماند و ذخیره نمی‌شود. دکمه در pages/applications.js با برچسب «پیش‌نویس». تست در tests/advisor-brain-check.cjs: رزومهٔ بدون عدد و آگهی پر از عدد و سال؛ هر عددِ خروجی باید عیناً در رزومه باشد. حدود ۱۰۰ خط.

## niloufar

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

## bardia

C2-a (بزرگ): نسخهٔ نهایی

همهٔ اصلاح‌ها پذیرفته شد. مریم: مبلغ اعتبار در settleReview دقیقاً همان فرمول completePayment است: Number(current.credit_units ?? current.amount_toman)، نه amount_toman؛ ترتیب قفل users سپس payment_orders بدون تغییر. رضا: هر تسویهٔ مالک (paid یا بازگشت وجه) در همان تراکنش یک اعلان تراکنشی در user_notifications با reference یکتای 'settle:'+همان reference پرداخت می‌نویسد («پرداختت بررسی و تأیید شد، N It به کیف پولت اضافه شد»)، بدون ایمیل تبلیغاتی.
چه می‌شود: فاز ۱ (۳.۳.۲): صف «در بازبینی» در dist/admin/payments و admin.js؛ database/payments.cjs: reviewPayments() و settleReview(); zibal.cjs: inquire() فقط خواندنی، فقط Zibal؛ مسیر POST /api/admin/payments/:id/settle فقط روی شاخهٔ ownerPanel در src/admin/http.cjs؛ مدرک (RRN یا trace) و یادداشت اجباری؛ INSERT در wallet_credit_claims با 'payment:'+provider+':'+id پیش از تغییر موجودی؛ audit با request_id. فاز ۱.۵: فقط گزینهٔ «بازگشت وجه» در TOPICS و شمارش. فاز ۲ فقط با دادهٔ تقاضا: refunded_at، سیاست ۷۲ ساعته در صفحهٔ شرایط، refundPurchase با reference 'refund:'+ref. فاز ۳: کارت درآمد فقط‌خواندنی.
تست: بلوک جدا در tests/mysql-races-check.cjs (۲۰ settle موازی، settle در برابر completePayment، سفارش دارای بونوس با مبلغ درست) و payments-database-check.cjs (status 2 زیبال اعتبار نمی‌دهد؛ اعلان یکتا).

C2-b: نسخهٔ نهایی

پذیرفته شد. مریم: dueSubscriptionReminders فقط کاربری را برمی‌دارد که max(expires_at) میان همهٔ ردیف‌های subscription:* او (منطق billing() در wallet.cjs) در پنجرهٔ ۷ یا ۱ روز باشد. الهام: تابع کمکی مشترک «ثبت اعلان با reference یکتا» (notifyOnce) در notifications/service.cjs ساخته می‌شود و N3-a و C3-a از همان استفاده می‌کنند؛ reference='sub-end:'+ref+':'+end+':'+stage، بدون migration. رضا: نوار در زبانهٔ plans در dist/dashboard/js/pages/wallet.js و در home.js می‌آید (نه billing.js)؛ برای هر مرحله با کلید localStorage بسته می‌شود؛ متن می‌گوید دقیقاً چه چیز به رایگان برمی‌گردد و «رزومه‌ات منتشر می‌ماند»، بدون شمارش معکوس. دکمهٔ تمدید همان خرید با requestId است و تا پاسخ disabled می‌ماند. کار روی tick موجود و notification_preferences رعایت می‌شود. تست: دو tick یک اعلان؛ کاربر با دو اشتراک و پلن بلندتر اخطار نگیرد؛ دو خرید موازی یک کسر (wallet-check.cjs)؛ نوار فقط در پنجره و بستنش ماندگار (UI). ترتیب: اول C2-b، بعد R2-a.

C2-c: نسخهٔ نهایی

پذیرفته شد. آبجکت ثابت CANNED[department] و waitingTickets(now) در src/database/support-desk.cjs؛ منوی «درج پاسخ آماده» فقط متن را در فیلد می‌گذارد و ارسال نمی‌کند؛ نشان «۲۴ ساعت+» فقط برای تیکتی که آخرین پیام غیرداخلی از مشتری است و یادداشت internal و ارجاع حساب نمی‌شوند (قاعدهٔ 3.2.8). بدون ستون، بدون میانگین هفته. تست: support-desk-check.cjs (یادداشت داخلی تیکت را «پاسخ‌داده‌شده» نمی‌کند، پاسخ staff برمی‌دارد) و support-desk-ui-check.cjs (درج بدون ارسال). حدود ۱۰۰ خط.

## taraneh

C3-a (نسخهٔ نهایی): هر اصلاح را قبول دارم. سطل‌های ثابت: telegram، instagram، linkedin، whatsapp، jobsite، irmsg، google، other، direct. jobsite در لینک‌ساز «سایت کاریابی (جابینجا، جاب‌ویژن، ایران‌تلنت)» و Referer برای jobinja.ir، jobvision.ir، irantalent.com، e-estekhdam.com. پیام‌رسان داخلی سطل جدا شد، irmsg با برچسب «پیام‌رسان داخلی (بله، ایتا، روبیکا)» و Referer برای bale.ai، eitaa.com، rubika.ir؛ در متن صفحه هم می‌نویسیم هر مبدأ ناشناخته در «سایر» می‌رود. ستون src را VARCHAR(12) می‌گیرم (بلندترین سطل ۹ حرف است). نقشهٔ google فقط با regex لنگرشده روی hostname، نه includes، و تست دارد. ثبت داخل همان if(!seen&&countable) در http.cjs:87 با transaction؛ جدول dashboard_sources با slot و CASCADE؛ جمع منبع‌ها = جمع بازدیدها (تست MySQL واقعی، slot ۱ و ۲). فایل‌ها: src/dashboard/sources.cjs، workspaces.cjs، database/dashboard.cjs، http.cjs، stats.js، publish.js، privacy/index.html. ترتیب publish.js: بعد از C1-c و C1-b2، با C3-c. فاز ۳ (گزارش هفتگی opt-in) از همان تابع کمکی مشترک اعلان که C2-b می‌سازد در notifications/service.cjs استفاده می‌کند، نه حلقهٔ جدا. فاز ۱ و ۲ در ۳.۳.۲، فاز ۳ بعد.

C3-b (نسخهٔ نهایی): پذیرفته شد بدون تغییر. prefetch(id) کنار loadScript در app.js با .catch(()=>{})، فقط وقتی RI.pages[id] نیست، با شرط saveData/2g، روی pointerenter/focusin/touchstart و idle برای resume، links، publish. ترتیب app.js: بعد از R2-a و قبل از N3-a. تست Playwright: درخواست قبل از کلیک، عدم درخواست با saveData، و سقف ۶۰KB گزیپ.

C3-c (نسخهٔ نهایی): پذیرفته شد بدون تغییر. RI.compareSeries(rows,n,event) در api.js با حالت‌های up/down/same/new و بدون ∞، مشترک بین کاشی‌های home، صفحهٔ بینش و جملهٔ خودکار؛ حالت صفر از همان لینک‌ساز C3-a. همراه C3-a ریلیز می‌شود. تست: صفر، «جدید»، افت، slot ۲.

## kaveh

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

## yasaman

R2-a (بزرگ): نسخهٔ نهایی

هر چهار اصلاح را می‌پذیرم. مریم: هدایت `billing/index.html` اسکریپت inline نیست؛ فقط داخل `app.js` است، با شرط `document.body.dataset.page==='billing'` و `location.replace('/dashboard/wallet/?ptab=plans')` پیش از رندر (`script-src` فقط self و hash است). رضا: زبانه «اشتراک» نام می‌گیرد و در فاز ۲ دو کارت `hb-acc` در `home.js` (تابع `account()`) یک کارت «حساب مالی» می‌شوند (نوع اشتراک و موجودی It، لینک به wallet). الهام: `RI.historyFilters` (استفادهٔ `wallet.js:84`) می‌ماند؛ فقط `RI.mountHistory` پاک می‌شود. ترتیب: فاز ۱ ← R2-d؛ فاز ۲ ← بعد C2-b با نوار تمدیدش در زبانهٔ `plans` در `wallet.js` و `home.js` (نه billing.js). متن نهایی: فاز ۱ حذف خالص `RI.mountHistory` و دو زبانهٔ تاریخچهٔ billing با یک لینک به تاریخچهٔ wallet؛ فاز ۲ انتقال بدنهٔ اشتراک (`status/compare/assets/plans`، هندلر `data-sub`، `load()`) به ptab «اشتراک» در `RI.sectionTabs('wallet')` با `ptab` ورودی، حذف `billing.js` و آیتم `NAV`، یک خط نگاشت `billing→wallet` در `navigate()` و `RI.loadPage`، ادغام کارت خانه. `RI.subscribeFlow`، endpoint و `payments/*` دست نمی‌خورند. تست‌ها: به‌روزرسانی `ui-interactions-check:18` و `workspace-revision-ui-check:30-33`، و تست تازه (مسیر قدیمی billing، درخواست `purchase` با `ref`/`requestId`/`expectedPrice`، بازگشت `?payment=test` به تب بانک).

R2-c (کوچک): نسخهٔ نهایی

بدون اصلاح لازم؛ همان را تأیید می‌کنم. حذف تب `privacy`، تابع `privacy()`، کلید `panels`، هندلر `dataset.cpub`، بخش «خروج» و `[data-logout]` از `settings.js`، یک خط راهنما در تب profile با `data-go="resume" data-step="contacts"`، و action فندق در `advisor-brain.js:314` به `{route:'resume', step:'contacts'}` با متن تازه. `?tab=privacy` به profile می‌افتد. تست‌ها: assertion تازه در `advisor-brain-check.cjs` و حلقهٔ settings در `workspace-revision-ui-check.cjs`. حدود ۱۴ خط حذف، ۲ اضافه. ترتیب با R2-a فرقی ندارد؛ در `advisor-brain.js` با N3-b/N3-c مستقل است.

R2-d (کوچک): نسخهٔ نهایی

اصلاح الهام را می‌پذیرم: `RI.historyFilters` حذف نمی‌شود (استفاده در `wallet.js:84`)؛ فقط `RI.historyRows` پاک می‌شود. فهرست نهایی حذف: `polishShellLegacy` با `groups` و `preference` در `coral.js`، `receiptModal`، `sampleSeries`، `passStrength`، `badgeState` با `BADGES`، `activitySummary`، `historyRows`، `socialHandleValid`، `petSay`. ترتیب: بعد از R2-a فاز ۱ (هم‌فایل `workspace-tools.js`)؛ در `state.js` و `data.js` با C1-c، N2-b2، N2-c، C1-b2 و R1-d مستقل است. تست: `npm test`، `check:ui` و `site-content-check` (که `data.js` را در `vm` بارگذاری می‌کند). نمی‌کنم: `RI.polishShell`، `RI.iconNames`، `RI.validateField` و هیچ CSS؛ فهرست CSS مرده را R3-a2 بعد از ریلیز این سه می‌سازد.

## omid

R3-a2 (بزرگ): نسخهٔ نهایی توافق‌شده

همهٔ اصلاح‌ها قبول. فقط یک توضیح برای حالت شب: توی داشبورد تم تاریک جدا (data-theme یا prefers-color-scheme) نیست، night.css یه لایهٔ همیشه‌روشنه (grep روی dist/dashboard فقط تو کد قالب‌های vista/imported پیداش می‌کنه)، پس دامپ روی همون لایه اجرا می‌شه و برای اطمینان یک دور هم با colorScheme تاریک. متن نهایی: محدودهٔ پاکسازی ۱۵ فایل داشبورد (shell، components، pages، abgoon، performance، resume-studio، liquid، nova، pet، fandogh-studio، night، hub، hub-publish، notice-center، quick-access)؛ tokens، base، preview، fandogh و charts که در publicAssets (static.cjs:9-19) به صفحه‌های عمومی هم می‌رسن دست‌نخورده می‌مونن. فاز ۱ فقط بعد از ریلیز R2-a، R2-c و R2-d شروع می‌شه و فهرست سلکتورهای مرده قبل از هر ریلیز دوباره grep می‌شه؛ سلکتورهای ساخته‌شده با الحاق رشته (is-، coral-hide-، rs-، ptab- و ...) و data-*/@keyframes فقط دستی. مسیرهای تأیید در لحظه از NAV (app.js:7) خوانده می‌شن، نه فهرست ثابت. دامپ computed-style فقط برای عنصرهای دارای class، با reducedMotion و ساعت ثابت، عرض‌های ۳۹۰/۷۶۸/۱۲۸۰، هر اختلاف = توقف. ریلیز ۱: حذف مرده‌های تأییدشده؛ ۲: تا کردن تکرارهای هم‌سلکتور و حذف abgoon.css؛ ۳ (theme.css) فقط اگه ۱ و ۲ صفر اختلاف داشتن. بدون تغییر ظاهر و بدون ابزار جدید.

R3-b (کوچک): نسخهٔ نهایی

بدون اصلاح تازه. محتوای glass.css و بعد navigation.css عین ترتیب فعلی جای دو خط @import بالای dist/admin/admin.css می‌شینه و دو فایل حذف می‌شن؛ liquid.css و night.css ادمین جدا می‌مونن. تأیید با admin-ui-check، admin-workflow-ui-check، check:ui-layout و دامپ computed-style (فقط عنصرهای کلاس‌دار، reducedMotion) روی /admin/، /admin/users/، /admin/health/ در ۱۲۸۰ و ۳۹۰. همراه ریلیز اول، چون به R2-a/c/d وابسته نیست.

R3-d (کوچک): نسخهٔ نهایی

بدون اصلاح تازه؛ مریم و الهام هم ۲۹ سند رو بی‌ارجاع تأیید کردن. حذف ۲۹ سند docs (فهرست کامل تو r5_omid.md)، شش تست یتیم (_peek، checkout-response-check، coral-release-check، email-login-ui-check، rail-glass-hover-ui-check، workspace-preview)، scripts/refine-satiar.cjs و refine-vista.cjs، و خط test:serial از package.json. نگه‌داشتن: HOSTING، AUTH-SETUP، SMSIR، DASHBOARD-IMPLEMENTATION، REVIEW-21.1 و بقیهٔ اسناد زنده. README: خط «docs/» اصلاح و یک جمله «RI_JOBS=1 npm test». یک grep نهایی از نام هر فایل قبل از commit. حذف ≈۲٬۲۵۰ خط، اضافه ≈۳.
