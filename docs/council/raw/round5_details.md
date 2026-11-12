# دور ۵ · جزئیات پیاده‌سازی

## arman

N1-a (بزرگ): دعوت دوست، جزئیات

فاز ۱ (ریلیز جدا، حدود ۱۵۰ خط). Schema در src/database/schema.cjs: جدول referrals(invitee_id PK, inviter_id, code, created_at) و ستون referral_code روی users (یکتا، تصادفی ۸ کاراکتری، ساخته‌شده تنبل). لینک فوتر در brandFoot (dist/dashboard/js/preview.js) می‌شود https://resumeit.ir/?ref=code؛ فقط وقتی mode پیش‌فرض است، نه custom/hidden. dist/app.js کد را با regex ^[a-z0-9]{8}$ در کوکی ۳۰ روزه SameSite=Lax می‌گذارد (بدون ردیابی دیگر). ثبت‌نام پیامکی کد را همراه درخواست می‌فرستد و OAuth آن را در oauth_states (ستون جدید ref_code در accounts.cjs) نگه می‌دارد تا گوگل/گیت‌هاب هم بشمارند. خوددعوتی (inviter==invitee) رد می‌شود. ادمین: یک ستون «ثبت‌نام با دعوت» در traffic، فقط یک عدد (شرط الهام).

فاز ۲ (فقط بعد از دیدن دادهٔ فاز ۱؛ در spec می‌ماند، شرط «بزرگ بودن»). تابع referralReward در src/database/wallet.cjs، صدا زده می‌شود هنگام اولین انتشار دعوت‌شده؛ شرط: شمارهٔ تأییدشده یا ایمیل تأییدشده. پاداش دعوت‌شده ۱ It؛ دعوت‌کننده بعد از ۳ دعوت موفق یک قالب پولی دلخواه یا یک ماه اشتراک. همه داخل transaction با FOR UPDATE روی users، reference یکتا referral:<inviteeId> در wallet_credit_claims (مثل creditWallet) و برای قالب/اشتراک ردیف account_access با همان reference. سقف ماهانه برای هر دعوت‌کننده، یک پاداش برای هر شماره/ایمیل، تأخیر ۲۴ ساعته با job سبک، و کلید خاموش/روشن در owner settings.

تست: tests/referral-check.cjs (منطق، regex کد، خوددعوتی) و افزودن به tests/mysql-races-check.cjs: ۱۰ درخواست موازی برای یک دعوت‌شده فقط یک ردیف claim و یک تراکنش بسازد؛ سقف ماهانه حتی با درخواست موازی رعایت شود. بدون این تست فاز ۲ ریلیز نمی‌شود. tests/oauth-check.cjs: کد از مسیر callback می‌ماند.

نمی‌کنم: ایمیل تبلیغاتی به دعوت‌شده، پاداش پولی نقدی، لیدربورد عمومی، ردیابی بین‌سایتی، صفحهٔ «دعوت دوستان» با موشن (فاز ۳، اختیاری و بعداً).

N1-b (کوچک): og برای ۱۴ نمونه

فایل‌ها: هر dist/resume*/index.html و dist/link*/index.html (۱۴ صفحه). ‌به head اضافه می‌شود: og:title، og:description، og:url، og:image با آدرس مطلق https://resumeit.ir/brand/og/<template>.jpg و twitter:card. noindex,nofollow دست نمی‌خورد. تصاویر ۱۲۰۰×۶۳۰ از یک قالب ثابت طراحی (لوگو، نام قالب، رنگ آن)، هرکدام زیر ۱۰۰KB، در dist/brand/og/. تست: گسترش tests/seo-check.cjs: برای هر صفحهٔ نمونه، وجود هر چهار og، مطلق و https بودن og:image، وجود همزمان noindex، وجود فایل تصویر و حجم کمتر از ۱۰۰KB. CSP تصویر برای کراولر لازم نیست چون صفحه‌ای که تصویر را نمایش دهد نیست. نمی‌کنم: تغییر sitemap، برداشتن noindex، اسکریپت تولیدی، og پویا برای صفحه‌های کاربران.

N1-c (کوچک): ساخت پیش از ثبت‌نام

dist/demo/demo.js: یک نوار سه‌فیلدی (نام، عنوان، خلاصه) که قبل از رندر از همان توابع normalize/escape ویرایشگر (RI در render/model مشترک) می‌گذرد؛ مقدار فقط با textContent در DOM می‌نشیند و هیچ innerHTML روی ورودی کاربر نمی‌رود. ذخیره در یک کلید localStorage ri_demo_draft با expires ۷ روز و try/catch. دکمهٔ «ذخیره و ساخت صفحه‌ام» به /register/. در dist/dashboard/js/pages/resume.js: اگر کلید هست و پیش‌نویس سرور خالی است، پرسش «این را اعمال کنم؟»؛ تأیید یعنی اعمال و پاک‌کردن، رد یعنی پاک‌کردن؛ پیش‌نویس غیرخالی هرگز لمس نمی‌شود. شمارندهٔ ادمین: یک عدد «ثبت‌نام با پیش‌نویس دمو» (یک فیلد در رویداد ثبت‌نام). تست Playwright tests/demo-draft-check.cjs: ورودی <img onerror> متن عادی دیده شود و اجرا نشود؛ انقضا؛ پرسش فقط روی پیش‌نویس خالی. نمی‌کنم: ارسال دادهٔ دمو به سرور پیش از ثبت‌نام، اعتبارسنجی تکراری، گزارش تازه.

## shida

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

## pouya

سؤال باز اول، با خواندن کد: jdDigest در advisor-core.js فقط یک رشتهٔ کلید در خط ۱۲۶ است و تطابق واقعی با آگهی `context.job` و `mentions(job, skill)` در خطوط ۱۸۹ تا ۲۱۴ است. هیچ‌کدام به Worker وابسته نیستند: advisor-core.js یک اسکریپت ساده است که advisor-ui.js همان را با `window.ResumeAdvisor` می‌خواند و Worker فقط برای سرعت است. پس صفحهٔ موبایل می‌تواند advisor-brain.js (UMD، همگام، ۴۷۰ خط، با norm/words) را بارگذاری کند و بدون Worker تطابق ساده بگیرد.

N3-a (بزرگ): جزئیات

فاز ۱ (تعهد، حدود ۳۰۰ خط، بدون فندق، موبایل‌محور):
- src/database/applications.cjs با `initialize`، الگوی advisor.cjs: `job_applications(id CHAR(36) PK, user_id, company VARCHAR(120), title VARCHAR(120), status ENUM('draft','sent','interview','rejected','offer'), job_url VARCHAR(500) NULL, note VARCHAR(1000), follow_up_at BIGINT NULL, created_at, updated_at, INDEX(user_id,updated_at), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`. شرط CASCADE برقرار است و deleteAccount (dashboard.cjs:33) با `DELETE FROM users` همه را پاک می‌کند.
- src/dashboard/applications.cjs: list/create/update/delete با سقف ۲۰۰ ردیف برای هر کاربر و اعتبارسنجی طول؛ مسیر در src/dashboard/http.cjs کنار بقیه. `job_url` فقط با `new URL` و پروتکل http یا https پذیرفته می‌شود (شرط Maryam)؛ در UI با `esc` و `rel="noopener noreferrer" target="_blank"`.
- dist/dashboard/js/pages/applications.js و یک مدخل در منو: کارت‌ها، تغییر وضعیت، تاریخ پیگیری.
- یادآوری: tick موجود اعلان‌ها یک ردیف user_notifications با reference یکتای `app-followup:<id>:<follow_up_at>` می‌سازد (UNIQUE جلوی تکرار را می‌گیرد) و از همان preferences و کانال‌های موجود می‌گذرد؛ ایمیل جدید نه.
- حریم خصوصی: متن آگهی هیچ‌جا ذخیره نمی‌شود، فقط لینک و یادداشت خود کاربر. ردیف‌ها در خروجی داده‌های کاربر (export) می‌آیند، طبق شرط.
- تست: tests/applications-check.cjs روی MySQL واقعی (مثل check:database): ایجاد، `javascript:alert(1)` رد می‌شود، کاربر B ردیف A را نمی‌بیند، deleteAccount ردیف‌ها را پاک می‌کند، دو بار tick یک اعلان می‌سازد.
فاز ۲ (دسکتاپ): در fandogh.js دکمهٔ «ذخیره به‌عنوان درخواست» کنار نتیجهٔ تطابق؛ فقط عنوان/شرکت/درصد، نه متن.
فاز ۳ (بعد از C3-a): لینک `?src=`؛ متن فقط «این لینک N بار باز شد».
نمی‌کنیم: ذخیرهٔ متن آگهی، کپی workspace، ادعای «شرکت دید»، ایمیل جدید، فاز ۳ قبل از C3-a.

N3-b (ساده‌شده): جایگزین case 'interview'

بدون ذخیره و بدون ارسال به سرور. در advisor-brain.js تابع `interviewQuestions(content)`: تا ۵ سؤال از experience/projects با قالب ثابت («در نقش X چه نتیجه‌ای گرفتی؟»)، مقدارها escape شود. اگر رزومه خالی بود ۳ سؤال عمومی. خروجی جای متن ثابت خط ۳۱۷ می‌نشیند؛ دکمهٔ «سؤال بعدی» همان‌جا. تست: در tests/advisor-brain-check.cjs رزومهٔ خالی ۳ سؤال بدهد، سؤال شامل نام شرکت escape‌شده باشد، و هیچ fetch فراخوانی نشود. حدود ۸۰ خط. نمره و ذخیره نمی‌کنیم. Reza گفت یک بهبود کوچک است؛ همین را بی‌صدا داخل ریلیز بعدی می‌گذارم.

N3-c: نامهٔ همراه

وابسته به فاز ۱ و فقط بعد از آن. تابع `coverDraft(content, jobText)` در advisor-brain.js، همگام و بدون Worker: مهارت‌هایی از رزومه که `words(jobText)` آنها را دارد، به‌علاوهٔ نقل مستقیم یک جمله از `desc` تجربه؛ هیچ عدد یا سال از خود تابع تولید نمی‌شود. متن آگهی فقط در حافظهٔ صفحه می‌ماند (textarea) و ذخیره نمی‌شود. دکمه در صفحهٔ درخواست‌ها با برچسب «پیش‌نویس». تست: tests/advisor-brain-check.cjs با رزومه‌ای بدون عدد و آگهی‌ای پر از عدد/سال؛ regex `\d` روی خروجی فقط اعدادی را قبول می‌کند که عیناً در رزومه هست. حدود ۱۰۰ خط. نمی‌کنیم: LLM، ذخیرهٔ نامه، ارسال خودکار.

## niloufar

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

## bardia

C2-a (بزرگ): جزئیات پیاده‌سازی مرکز مالی

بررسی Zibal: بله، /v1/inquiry واقعی است (zibal.cjs، تابع verify دو بار صدایش می‌زند). پس «استعلام» فقط برای Zibal باشد؛ SEP فقط verify دارد و برایش فقط «ثبت دستی» می‌ماند. تابع تازهٔ inquire(order) در zibal.cjs فقط inquiry را می‌زند و verify را نه؛ نتیجه فقط وقتی معتبر است که status===1 و orderId و amount با سفارش بخواند (همان شرط verifiedProof).

فاز ۱ (صف review):
- database/payments.cjs: reviewPayments() و تابع واحد settleReview(actor,id,{kind,evidence,requestId}) با kind از این سه: paid، reversed، unchanged.
- مسیر paid دقیقاً مثل completePayment عمل می‌کند و همان reference را می‌نویسد: 'payment:'+provider+':'+id در wallet_credit_claims (شرط حیاتی مریم). ترتیب: قفل users، قفل payment_orders FOR UPDATE، شرط status==='review'، INSERT در claims (PK، پس هر دوبارِ بعدی ER_DUP_ENTRY می‌شود و fail 409 می‌دهد)، بعد wallet و wallet_transactions، بعد status='paid'. reconcile بعدی هم claimPayment فقط pending/verifying برمی‌دارد و هم اگر برسد INSERT claims می‌شکند؛ دوبار شارژ ممکن نیست.
- ثبت دستی فقط مالک: همان شاخهٔ ownerPanel در src/admin/http.cjs (POST /api/admin/payments/:id/settle). نقش پشتیبانی هیچ مسیری ندارد. شرط ورودی: RRN یا trace و یادداشت حداقل ۱۰ حرف، سقف طول؛ مبلغ از خود سفارش خوانده می‌شود، نه از ورودی.
- همین تراکنش ردیف admin_audit با request_id (الگوی repeated() در support-desk.cjs) می‌نویسد.
- UI: بخش «در بازبینی» در dist/admin/payments و admin.js.
- تست: tests/mysql-races-check.cjs: ۲۰ settleReview موازی روی یک سفارش، یک ردیف claims و یک تراکنش؛ و settleReview همزمان با completePayment، موجودی فقط یک بار زیاد شود. در tests/payments-database-check.cjs: stub زیبال status 2 هرگز اعتبار نمی‌دهد.

فاز ۲ (بازپرداخت، فقط با دادهٔ تقاضا): اول فقط گزینهٔ «بازگشت وجه» به TOPICS در dist/dashboard/js/pages/support.js و شمارش در پنل. فاز ۲ بعد از دیدن عدد: ستون refunded_at روی account_access (migration در همان schema.cjs با الگوی information_schema فعلی)، بدون حذف ردیف؛ شرایط: ≤۷۲ ساعت، قالب یا فونت، در رزومهٔ منتشرشده فعال نیست، اشتراک نه. wallet.cjs تابع refundPurchase با قفل کیف پول مثل خرید و reference یکتای 'refund:'+reference. سیاست مکتوب: بند تازه در dist/terms (صفحهٔ شرایط) پیش از انتشار فاز. تست: ۲۰ بازپرداخت موازی یک بار برگرداند.

فاز ۳: کارت درآمد و تعداد review در ادمین، فقط خواندنی از جدول‌های موجود، بدون ایمیل.

انتشار: ۳.۳.۲ فاز ۱؛ ۳.۳.۳ شمارش تقاضا؛ فاز ۲ بعد.

نمی‌کنیم: بازگشت پول خودکار به بانک، تطبیق ایمیلی، بازپرداخت اشتراک، حذف ردیف خرید، هر مسیر برای نقش پشتیبانی.

C2-b: جزئیات یادآوری پایان اشتراک

- notifications/service.cjs: داخل tick موجود، دیتابیس تابع dueSubscriptionReminders(now) را می‌دهد؛ از account_access ردیف ref LIKE 'subscription:%' با expires_at در ۷ روز یا ۱ روز آینده. هر یادآوری با reference='sub-end:'+ref+':'+end+':'+stage درج می‌شود؛ ستون reference در user_notifications UNIQUE است، پس بدون migration تکرار نمی‌شود و بعد از تمدید چون end نو است ریست لازم نیست.
- notification_preferences و ایمیل/Push تأییدشده رعایت می‌شود؛ نوع تراکنشی است.
- dist/dashboard/js/pages/billing.js و home.js: اگر billing.plan.end کمتر از ۷ روز مانده، نوار با «تمدید» می‌آید؛ این برای کاربر بدون ایمیل است و ارسال لازم ندارد. دکمه همان خرید فعلی را با requestId تازه صدا می‌زند و دکمه تا پاسخ disabled است.
- تست tests/wallet-check.cjs: دو خرید موازی با یک requestId یک بار کسر کند؛ در tests/notification-delivery-check.cjs: دو tick پشت‌سرهم یک اعلان بسازد، و بعد از تمدید اعلان تازه بیاید. تست UI: نوار فقط زیر ۷ روز.
- نمی‌کنیم: تمدید خودکار، ستون تازه، تایمر تازه.

C2-c: جزئیات پاسخ آماده و ۲۴ ساعت+

- src/database/support-desk.cjs: آبجکت ثابت CANNED[department] با ۸ پاسخ و export supportCanned(). تابع تازهٔ waitingTickets(now): تیکت باز که آخرین پیام غیرداخلی از مشتری است و گذشته از ۲۴ ساعت؛ پیام‌های internal=TRUE و ارجاع حساب نمی‌شوند (قاعدهٔ 3.2.8).
- پنل: منوی «درج پاسخ آماده» فقط متن را در فیلد می‌گذارد؛ نشان «۲۴ ساعت+» در فهرست.
- تست tests/support-desk-check.cjs: تیکتی که فقط یادداشت داخلی جدید دارد هنوز «منتظر» است؛ پاسخ staff آن را برمی‌دارد؛ تست UI در support-desk-ui-check.cjs که درج، فیلد را پر کند و ارسال نکند.
- نمی‌کنیم: ارسال خودکار، ذخیره در دیتابیس، میانگین هفته.

## taraneh

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

## kaveh

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

## yasaman

R2-a (بزرگ): یک صفحهٔ مالی؛ جزئیات اجرا

فاز ۱ (حذف خالص، ریلیز مستقل): در `workspace-tools.js` تابع `RI.mountHistory` پاک می‌شود. در `pages/billing.js` دو زبانهٔ `purchases` و `payments` از `TABS` و شاخهٔ `mountHistory` در `paint()` برداشته می‌شود؛ به‌جایش در `assets()` یک لینک `data-go="wallet" data-tab="purchases"` به تاریخچهٔ wallet می‌آید (دو خط اضافه، حدود ۲۵ خط حذف). تاریخچهٔ `history()` داخل wallet.js می‌ماند.

فاز ۲ (کم‌کردن خالص): بدنهٔ اشتراک (`status()`، `compare()`، `assets()`، `plans()`، هندلر `data-sub` و `load()`) از billing.js به یک ptab سوم به نام `plans` («اشتراک») در `RI.sectionTabs('wallet', …)` در wallet.js جابه‌جا می‌شود؛ زبانهٔ داخلی «اشتراک من / دوره‌ها» یک اسکرول می‌شود. `billing.js` پاک می‌شود، آیتم `billing` از `NAV` در app.js هم. `RI.subscribeFlow` در commerce.js:27 دست نمی‌خورد و دکمه همان `data-sub` را صدا می‌زند. نگاشت: در `app.js` اول `navigate()` و `RI.loadPage` یک خط `if(id==='billing'){id='wallet';opts={...opts,ptab:'plans'}}`؛ دوازده فراخوانی `RI.go('billing')` عوض نمی‌شوند. `billing/index.html` می‌ماند و در شروع صفحه (`data-page==='billing'`) با `location.replace('/dashboard/wallet/?ptab=plans')` هدایت می‌شود؛ پس `return-to.cjs` و `static.cjs` دست نمی‌خورند. wallet.js مقدار `ptab` را به `initial` همان sectionTabs می‌دهد. بازگشت از درگاه همین الان به `/dashboard/wallet/` می‌رود (`payments/pages.cjs`) و `?payment=` تب `bank` را باز می‌کند؛ بدون تغییر.

تست‌ها (به‌روز): `ui-interactions-check.cjs:18` (ردیف billing حذف یا به wallet منتقل)، `workspace-revision-ui-check.cjs:30-33` (شمارش `.nv-plan` روی `/dashboard/wallet/?ptab=plans`).
تست تازه در `ui-interactions-check.cjs`: ۱) `goto('/dashboard/billing/')` ← آدرس نهایی `/dashboard/wallet/` و `[data-ptab=plans][aria-selected=true]`؛ ۲) کلیک `[data-sub]` ← درخواست `/api/dashboard/wallet/purchase` با `ref=subscription:<id>` و `requestId` و `expectedPrice` عیناً مثل قبل؛ ۳) `goto('/dashboard/wallet/?payment=test')` ← تب بانک باز است و `/payments/result?id=` پاسخ ۲۰۰ می‌دهد.

نمی‌کنم: انتقال پنل‌های کیف پول و اشتراک فندق؛ دست‌زدن به endpoint، `database` یا `payments/*`؛ تغییر `RI.walletPurchase`.

R2-c (کوچک): حذف تب «حریم خصوصی» و بخش «خروج» تکراری از تنظیمات

همه در `dist/dashboard/js/pages/settings.js`: ردیف `privacy` از `SECTIONS` (خط ۵)، تابع `privacy()` (خط ۲۰ تا ۲۶)، کلید `privacy` در `panels` (خط ۳۷)، هندلر `change` برای `dataset.cpub` (خط ۶۲)، بخش «خروج» در `data()` (خط ۲۸) و هندلر `[data-logout]` (خط ۶۷). «خروج همهٔ دستگاه‌ها» می‌ماند. منوی پروفایل (`app.js:259`) همان `RI.logout` را دارد. به تب `profile` یک خط راهنما می‌آید: «نمایش عمومی راه‌های تماس را در مرحلهٔ تماس رزومه تعیین کن» با `data-go="resume" data-step="contacts"`. `?tab=privacy` قدیمی به `profile` می‌افتد (کد خط ۳۶).
فندق: در `advisor-brain.js:314` action می‌شود `{kind:'route', label:'راه‌های تماس', route:'resume', step:'contacts'}` و متن «در مرحلهٔ تماس رزومه، هر راه تماس جدا روشن یا خاموش می‌شود».
تست‌ها: `advisor-brain-check.cjs` (فعلاً چیزی دربارهٔ privacy ندارد) یک assertion تازه: جواب سؤال حریم خصوصی action با `route==='resume'` و `step==='contacts'` و بدون `tab:'privacy'` دارد. در `workspace-revision-ui-check.cjs` (حلقهٔ مسیر settings): `?tab=privacy` باز می‌شود، `#set-panel-profile` دیده می‌شود و لینک راهنما `data-step=contacts` دارد. تست `resume-studio-ui-check.cjs:28` که سوئیچ‌های ادیتور را می‌سنجد دست نمی‌خورد.
حجم: حدود ۱۴ خط حذف، ۲ اضافه.
نمی‌کنم: تغییر `contacts[].public` یا اعتبارسنجی ادیتور؛ حذف «خروج همهٔ دستگاه‌ها».

R2-d (کوچک): پاک‌سازی توابع مردهٔ داشبورد

بعد از R2-a فاز ۱ (هم‌فایل `workspace-tools.js`). دوباره با `grep -rnw` روی `dist src tests scripts server.cjs package.json` چک شد: هر ده نام فقط یک خط دارند (تعریف؛ `BADGES` دو خط: تعریف و `badgeState`). دسترسی پویا هم گشتم: `RI[…]` و `Object.keys(RI)` در هیچ‌جای `dist/src/tests` نیست؛ تنها `site-content-check.cjs:11` فایل `data.js` را در `vm` اجرا می‌کند ولی به `sampleSeries` اشاره‌ای ندارد.
حذف: `RI.polishShellLegacy` + ثابت `groups` + `preference` در `coral.js`؛ `RI.receiptModal` (`commerce.js:29`)؛ `RI.sampleSeries` (`data.js:324`)؛ `RI.passStrength` (`ui.js:307`)؛ `RI.badgeState` و `RI.BADGES` (`state.js:276-286`)؛ `RI.activitySummary` و `RI.historyRows` (`workspace-tools.js:12,39`)؛ `RI.socialHandleValid` (`core.js:36`)؛ `RI.petSay` (`assistant-pet.js:254`). حدود ۶۰ خط حذف، ۰ اضافه (تخمین).
تست: هیچ تستی این نام‌ها را ندارد؛ `npm test` و `check:ui` باید سبز بماند، و `site-content-check` (که `data.js` را بارگذاری می‌کند) حتماً اجرا شود.
فاز: یک کامیت. 
نمی‌کنم: `RI.polishShell` (no-op ولی `app.js` صدایش می‌زند)، `RI.iconNames` (در `auth-ui/js/icons.js` هم هست)، `RI.validateField`، و هیچ CSS (`.receipt`، `.coral-rail` با R3-a2 بررسی می‌شود).

## omid

R3-a2 (بزرگ): جزئیات پیاده‌سازی، یک استایل‌شیت واحد برای داشبورد

شرط مریم: tokens.css، base.css، preview.css (و fandogh.css و charts.css که آن‌ها هم در publicAssets تو static.cjs:9-19 هستن) روی صفحه‌های منتشرشده سرو می‌شن. تصمیم: این پنج فایل از کل پاکسازی بیرونن، دست نمی‌خورن. محدوده فقط ۱۵ فایل داشبوردیه: shell، components، pages، abgoon، performance، resume-studio، liquid، nova، pet، fandogh-studio، night، hub، hub-publish، notice-center، quick-access (ترتیب باندل تو static.cjs:33 ثابت می‌مونه).

روش فهرست مرده (فاز ۱): اسکریپت یک‌بارمصرف تو scratch، نه commit. هر سلکتور کلاسی از ۱۵ فایل رو می‌خونه و در dist/dashboard (html/js)، src/*.cjs، templates/vista-runtime.js جست‌وجو می‌کنه. کلاس‌هایی که با الحاق رشته ساخته می‌شن معاف: پیشوندهای واقعی که تو grep پیدا کردم: is-، template-، ri-pet-goal-، ri-pet-edits-، ri-vista-، ri-satiar-، ri-mtab-، project-، coral-hide-، set-tab-/set-panel-، fset-tab-/fset-panel-، rs-، rs-h-، rs-add-، ra-help-، ptab-/ppanel-، ib-، tf-، site-، s- و هر چیز با ${ تو template string. سلکتورهای با data-*، :is/:not، @keyframes و @media معاف از حذف خودکارن (فقط دستی). خروجی: CSV (فایل، سلکتور، دلیل) که من و یه نفر دیگه خط‌به‌خط تأیید می‌کنیم؛ تأیید نشده = نمی‌مونه تو حذف. عدد ۵۳۰ فقط حدس اولیه‌ست؛ عدد نهایی بعد تأیید اعلام می‌شه.

تأیید رفتار: اسکریپت Playwright (check:ui) روی ۱۵ مسیر داشبورد (home, resume, studio, themes, links, publish, stats, messages, notifications, wallet, billing, support, settings, fandogh, assistant) در عرض‌های ۳۹۰، ۷۶۸، ۱۲۸۰؛ با reducedMotion. به‌جای پیکسل، getComputedStyle ده ویژگی اصلی (رنگ، پس‌زمینه، اندازه، فاصله، display، border، radius، shadow) برای همهٔ عنصرهای مرئی قبل/بعد دامپ و مقایسه می‌شه؛ هر اختلاف یعنی توقف. دو مسیر عمومی رو هم برای اطمینان می‌گیرم: یک رزومهٔ منتشرشده و یک لینک‌پیج (هرچند فایل‌هاشون دست نمی‌خورن).

ریلیزها: ۳.۳.۲ فقط فاز ۱ (حذف مرده‌های تأییدشده). ۳.۳.۳ فاز ۲ (۴۳۵ تکرار هم‌سلکتور تا شن تو فایل اصلی، و حذف abgoon.css بعد از اینکه دامپ نشون داد پالتش هیچ‌جا اثر نداره). فاز ۳ (theme.css) فقط اگه ۱ و ۲ صفر اختلاف داشتن؛ وگرنه کنار می‌ره.

نخواهیم کرد: تغییر ظاهر یا رنگ، بازنویسی سلکتورها، دست‌زدن به قالب‌ها و CSS صفحه‌های عمومی، !important ها رو تو این دور کم کنیم (فقط وقتی مجبوریم)، ابزار build/minify تازه.

R3-b (کوچک): جزئیات

فقط dist/admin/admin.css و دو فایل کنارش. admin.css خط ۱ و ۲ @import دارن (glass.css و navigation.css). محتوای glass.css (۴ خط) و بعد navigation.css (۸ خط) عین همین ترتیب جایگزین دو خط @import می‌شه (بالای فایل، چون @import همیشه اول می‌شینه)، بعد هر دو فایل حذف می‌شن. هیچ ارجاع دیگه‌ای بهشون نیست (grep کردم: فقط همین دو @import تو dist/src/tests). صفحه‌های ادمین چیز دیگه‌ای نمی‌کشن؛ liquid.css و night.css جدا لینک شدن و می‌مونن. تأیید: admin-ui-check، admin-workflow-ui-check، check:ui-layout و دامپ computed-style روی /admin/، /admin/users/، /admin/health/ در ۱۲۸۰ و ۳۹۰. ریلیز همراه ۳.۳.۲. نخواهیم کرد: ادغام liquid/night ادمین یا تغییر سلکتور.

R3-d (کوچک): پاکسازی docs و تست‌های یتیم + حذف test:serial

بمانن (لینک‌شده یا زنده): HOSTING، AUTH-SETUP، SMSIR، DASHBOARD-IMPLEMENTATION، REVIEW-21.1، PAYMENTS، SEP-PAYMENTS، SEP-CONNECTION-CHECK، SECURITY-REVIEW، ADMIN، AUTH-DESIGN، DASHBOARD، DASHBOARD-SAVING، DASHBOARD-LOADING، DASHBOARD-PERFORMANCE، LOADING، RESUME-TEMPLATES، IMPORTED-RESUME-TEMPLATES، WALLET-AND-FONTS، editorial-images، account-roles، account-status، admin-identifiers، multipage-workspaces، notification-delivery-setup، owner-controls، support-role، user-workspace-revision، font-licenses/، template-*-import.json، council/.
تست‌ها: tests/_peek.cjs، checkout-response-check، coral-release-check، email-login-ui-check، rail-glass-hover-ui-check، workspace-preview. اسکریپت‌ها: scripts/refine-satiar.cjs، refine-vista.cjs. package.json: حذف test:serial، و README: «اجرای ترتیبی: RI_JOBS=1 npm test» + اصلاح خط «docs/». پیش از حذف دوباره grep اسم هر فایل. حذف ≈۲٬۲۵۰ خط، اضافه ≈۳.
نخواهیم کرد: دست‌زدن به releases.json یا تست‌های کاربردی.

فهرست حذف docs (۲۹ فایل، ۲٬۰۷۱ خط، بی‌ارجاع تو src/tests/dist/README/اسناد نگه‌داشته‌شده):
ACCOUNT-DASHBOARD-AUDIT.fa.md, AUDIT.fa.md, AUTH-FIXES.fa.md, BROWSER-AUDIT.fa.md, DASHBOARD-LOADING-COUNCIL-FIXES.fa.md, DASHBOARD-LOADING-REVIEW.fa.md, DASHBOARD-PERFORMANCE-2026-10-27.fa.md, EDITOR-APPEARANCE-AUDIT-16-18.fa.md, EDITOR-PUBLICATION-AUDIT-16-20-FIXES.fa.md, PUBLIC-AUDIT-0.24.5.fa.md, REQUEST-CHECKLIST.md, REVIEW-21.1.2.fa.md, SECTION-LOADING-PREVIEW-ALIGNMENT.fa.md, SITE-AUDIT-CHECKLIST.fa.md, TEMPLATE-EDITOR-REVIEW.fa.md, WORKSPACE-AUDIT-21-24.fa.md, WORKSPACE-AUDIT-25.fa.md, WORKSPACE-AUDIT-26-30.fa.md, admin-release-2026-10-16.md, advisor-release-checklist.md, advisor-release-report.fa.md, all-template-refinement-checklist.fa.md, performance-2026-10-15.md, resume-journey-checklist.fa.md, three-pass-review.fa.md, ui-audit-2026-10-15.md, user-request-audit-2026-10-15.md, vista-publication-response-review.fa.md, vista-refinement-checklist.fa.md

## پیوست: پیشنهادهای جایگزین دور ۴ب

### kaveh
R1-d (بزرگ، جایگزین): سه قالب رزومهٔ رایگانِ هم‌شکل («پردیس»، «تک‌رنگ»، «دفترچه») می‌شوند یک قالب «ساده» با سه لحن، و گالری تمیزتر

رأی‌ها را دیدم و قبول دارم: R1-a را کاربر حس نمی‌کند. این یکی را کاربر روی گالری و ویرایشگر می‌بیند.

شواهد: در `dist/dashboard/js/data.js` هر سه قالب `access:'free'` و `layout:'stack'` هستند و فقط رنگ (`v`) و یک پرچم (`serif:true` برای دفترچه) فرق دارند؛ `src/dashboard/render.cjs` هیچ شاخهٔ مخصوص `campus`/`mono`/`journal` ندارد (grep در src فقط data.js و app.js را می‌دهد). یعنی سه کارت، سه تصویر بندانگشتی (`dist/brand/template-thumbs/resume-*.jpg`)، سه صفحهٔ نمونهٔ ایستا (`dist/resumecampus|mono|journal/index.html`، ۱۴٫۹KB هر کدام) برای یک ساختار.

پیشنهاد: یک کارت «ساده» با انتخاب لحن (کرم، خاکستری، دفترچه‌ای). شناسه‌های `campus`، `mono`، `journal` برای همیشه معتبر می‌مانند و در `data.js` به‌صورت alias به همان قالب با لحن مربوط رندر می‌شوند، پس رزومهٔ منتشرشدهٔ هیچ‌کس تغییر نمی‌کند و ستون `theme.resume` در دیتابیس دست نمی‌خورد. نشانی‌های `/resumemono/` و `/resumejournal/` به نمونهٔ `/resumecampus/` با `?tone=` ریدایرکت می‌شوند. چون سه‌تا رایگان‌اند، هیچ خریدی لمس نمی‌شود؛ قیمت‌گذاری ادمین (`pal:`/`rt:` در `applyCommerce`) فقط یک کلید کمتر می‌بیند.

حذف: دو صفحهٔ نمونه و دو تصویر، دو ورودی `data.js`، حدود ۳۰KB؛ اضافه: alias و ریدایرکت و تست حدود ۴۰ خط. خالص حذف کوچک‌تر از R1-a است، پس بزرگ بودنش از اثر محصولی است: گالری از ۱۱ به ۹ قالب و انتخاب روشن‌تر.

ریسک: شاید برخی کاربران عاشق نام «دفترچه» باشند؛ نام در لحن می‌ماند. باید قبل از اجرا شمار استفادهٔ این سه را از صفحهٔ کاتالوگ ادمین ببینیم؛ اگر استفاده بالاست، فقط ادغام در گالری (نه حذف صفحه‌ها).

ترکیب نهایی سه‌تایی: R1-d بزرگ؛ R1-a می‌ماند به‌عنوان کار نگهداری (برچسب «بزرگ» را برمی‌دارم)؛ R1-b و R1-c یکی می‌شوند، «حذف فایل‌های یتیم و کپی‌های تکراری»: سه CSS، PNG، signature، فونت و favicon تکراری.

### yasaman
R2-d (جایگزین): پاک‌سازی توابع مردهٔ داشبورد (ردپای شل‌های قدیمی)

چند تابع در `dist/dashboard/js` تعریف شده‌اند ولی هیچ‌جا صدا زده نمی‌شوند. با `grep -w` روی `dist`، `src`، `tests`، `scripts` و `server.cjs` فقط خود تعریف پیدا شد (رشته‌ای مثل `RI[...]` هم در داشبورد نیست):
- `RI.polishShellLegacy` در `coral.js` (ریل قدیمی دو ستونه؛ خود فایل می‌گوید «رفته است») همراه ثابت `groups` و تابع `preference` که فقط همین مصرف می‌کند
- `RI.receiptModal` در `commerce.js`
- `RI.sampleSeries` در `data.js`
- `RI.passStrength` در `ui.js`
- `RI.badgeState` و آرایهٔ `RI.BADGES` در `state.js`
- `RI.activitySummary` و `RI.historyRows` در `workspace-tools.js`
- `RI.socialHandleValid` در `core.js` و `RI.petSay` در `assistant-pet.js`

ارزش: هر کس کد را می‌خواند یا فندق/مدل‌ها را به آن می‌سپاریم، دیگر به یک «شل قدیمی» و یک مودال رسید برنمی‌خورد که زنده به نظر می‌رسند. حدود ۶۰ خط (بیشترشان بلند) حذف، ۰ اضافه؛ بایت JS کمتر برای همهٔ کاربران.
ریسک: پایین. به CSS دست نمی‌زنم (`.receipt`، `.coral-rail` را R3-a2 با عکس‌مقایسه می‌سنجد). `RI.polishShell` (no-op) می‌ماند چون `app.js` صدایش می‌زند. فقط با `workspace-tools.js` در R2-a فاز ۱ هم‌فایل است؛ ترتیب: R2-d بعد از آن.
تست‌ها: هیچ تستی این نام‌ها را ندارد (grep روی `tests/`). اجرای `npm test` و `check:ui` کافی است.
