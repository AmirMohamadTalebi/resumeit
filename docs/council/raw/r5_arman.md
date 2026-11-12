N1-a (بزرگ): دعوت دوست، جزئیات

فاز ۱ (ریلیز جدا، حدود ۱۵۰ خط). Schema در src/database/schema.cjs: جدول referrals(invitee_id PK, inviter_id, code, created_at) و ستون referral_code روی users (یکتا، تصادفی ۸ کاراکتری، ساخته‌شده تنبل). لینک فوتر در brandFoot (dist/dashboard/js/preview.js) می‌شود https://resumeit.ir/?ref=code؛ فقط وقتی mode پیش‌فرض است، نه custom/hidden. dist/app.js کد را با regex ^[a-z0-9]{8}$ در کوکی ۳۰ روزه SameSite=Lax می‌گذارد (بدون ردیابی دیگر). ثبت‌نام پیامکی کد را همراه درخواست می‌فرستد و OAuth آن را در oauth_states (ستون جدید ref_code در accounts.cjs) نگه می‌دارد تا گوگل/گیت‌هاب هم بشمارند. خوددعوتی (inviter==invitee) رد می‌شود. ادمین: یک ستون «ثبت‌نام با دعوت» در traffic، فقط یک عدد (شرط الهام).

فاز ۲ (فقط بعد از دیدن دادهٔ فاز ۱؛ در spec می‌ماند، شرط «بزرگ بودن»). تابع referralReward در src/database/wallet.cjs، صدا زده می‌شود هنگام اولین انتشار دعوت‌شده؛ شرط: شمارهٔ تأییدشده یا ایمیل تأییدشده. پاداش دعوت‌شده ۱ It؛ دعوت‌کننده بعد از ۳ دعوت موفق یک قالب پولی دلخواه یا یک ماه اشتراک. همه داخل transaction با FOR UPDATE روی users، reference یکتا referral:<inviteeId> در wallet_credit_claims (مثل creditWallet) و برای قالب/اشتراک ردیف account_access با همان reference. سقف ماهانه برای هر دعوت‌کننده، یک پاداش برای هر شماره/ایمیل، تأخیر ۲۴ ساعته با job سبک، و کلید خاموش/روشن در owner settings.

تست: tests/referral-check.cjs (منطق، regex کد، خوددعوتی) و افزودن به tests/mysql-races-check.cjs: ۱۰ درخواست موازی برای یک دعوت‌شده فقط یک ردیف claim و یک تراکنش بسازد؛ سقف ماهانه حتی با درخواست موازی رعایت شود. بدون این تست فاز ۲ ریلیز نمی‌شود. tests/oauth-check.cjs: کد از مسیر callback می‌ماند.

نمی‌کنم: ایمیل تبلیغاتی به دعوت‌شده، پاداش پولی نقدی، لیدربورد عمومی، ردیابی بین‌سایتی، صفحهٔ «دعوت دوستان» با موشن (فاز ۳، اختیاری و بعداً).

N1-b (کوچک): og برای ۱۴ نمونه

فایل‌ها: هر dist/resume*/index.html و dist/link*/index.html (۱۴ صفحه). ‌به head اضافه می‌شود: og:title، og:description، og:url، og:image با آدرس مطلق https://resumeit.ir/brand/og/<template>.jpg و twitter:card. noindex,nofollow دست نمی‌خورد. تصاویر ۱۲۰۰×۶۳۰ از یک قالب ثابت طراحی (لوگو، نام قالب، رنگ آن)، هرکدام زیر ۱۰۰KB، در dist/brand/og/. تست: گسترش tests/seo-check.cjs: برای هر صفحهٔ نمونه، وجود هر چهار og، مطلق و https بودن og:image، وجود همزمان noindex، وجود فایل تصویر و حجم کمتر از ۱۰۰KB. CSP تصویر برای کراولر لازم نیست چون صفحه‌ای که تصویر را نمایش دهد نیست. نمی‌کنم: تغییر sitemap، برداشتن noindex، اسکریپت تولیدی، og پویا برای صفحه‌های کاربران.

N1-c (کوچک): ساخت پیش از ثبت‌نام

dist/demo/demo.js: یک نوار سه‌فیلدی (نام، عنوان، خلاصه) که قبل از رندر از همان توابع normalize/escape ویرایشگر (RI در render/model مشترک) می‌گذرد؛ مقدار فقط با textContent در DOM می‌نشیند و هیچ innerHTML روی ورودی کاربر نمی‌رود. ذخیره در یک کلید localStorage ri_demo_draft با expires ۷ روز و try/catch. دکمهٔ «ذخیره و ساخت صفحه‌ام» به /register/. در dist/dashboard/js/pages/resume.js: اگر کلید هست و پیش‌نویس سرور خالی است، پرسش «این را اعمال کنم؟»؛ تأیید یعنی اعمال و پاک‌کردن، رد یعنی پاک‌کردن؛ پیش‌نویس غیرخالی هرگز لمس نمی‌شود. شمارندهٔ ادمین: یک عدد «ثبت‌نام با پیش‌نویس دمو» (یک فیلد در رویداد ثبت‌نام). تست Playwright tests/demo-draft-check.cjs: ورودی <img onerror> متن عادی دیده شود و اجرا نشود؛ انقضا؛ پرسش فقط روی پیش‌نویس خالی. نمی‌کنم: ارسال دادهٔ دمو به سرور پیش از ثبت‌نام، اعتبارسنجی تکراری، گزارش تازه.
