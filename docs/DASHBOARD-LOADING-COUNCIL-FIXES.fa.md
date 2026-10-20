# اصلاح یافته‌های شورای زندهٔ بارگذاری

۲۰ اکتبر ۲۰۲۶. نتیجه: سه عضو زنده پس از اصلاح و آزمون، نقص مشخص دیگری در محدودهٔ بررسی پیدا نکردند. این نتیجه تضمین نبود همهٔ باگ‌ها یا افزایش سرعت تولید نیست.

## اصلاح‌ها

- [x] statsLoading فقط هنگام شروع درخواست واقعی فعال می‌شود؛ statsError حالت خطا را از هنوز شروع‌نشده جدا می‌کند. خروج قبل از callback و بازگشت به خانه دیگر انتظار بی‌درخواست نمی‌سازد.
- [x] آماده‌سازی قالب، ناوبری تازه را صف نمی‌کند. epoch، مالک و فضای کاری قبل از اعمال نتیجه بررسی می‌شوند؛ success/error/finally قدیمی نمی‌توانند مسیر، پیام یا inert مسیر تازه را دستکاری کنند.
- [x] فقط تصمیم leaveGuard مشترک است؛ پنجرهٔ ذخیره تکرار نمی‌شود و «ماندن» ویرایش را حفظ می‌کند.
- [x] refresh دستی آمار همان loadStats مشترک را مصرف می‌کند؛ پاسخ قدیمی یا پاسخ متعلق به حساب/فضای کاری قبلی اعمال نمی‌شود. loadDashboard نیز نسل درخواست قبلی را باطل می‌کند.
- [x] ایراد تازهٔ دور اول: callback اولیه بعد از refresh دستی درخواست اضافه می‌ساخت. اکنون تنها در نبود داده، درخواست فعال و خطای قبلی اجرا می‌شود؛ نتیجهٔ ناموفق دستی با retry خودکار پنهان نمی‌شود.
- [x] شمارندهٔ لینک هنگام انتظار «…» و هنگام ناموجودبودن آمار «—» با توضیح متناسب دارد.

## Evidence / Steps

آزمون جدید tests/dashboard-loading-races-check.cjs به check:staged-loading موجود و بنابراین CI اضافه شد. PASS مستقل آدا و بازاجرای ریشه:

۱. callback اولیه نگه‌داشته، خانه→قالب‌ها→خانه: دقیقاً یک درخواست و پایان انتظار.
۲. refresh دستی قبل از callback: چهار حالت هنگام/پس از پایان درخواست × موفق/ناموفق؛ دقیقاً یک درخواست و خطای درست.
۳. خانه→رزومه با دریافت قالب نگه‌داشته→قالب‌ها: مقصد جدید قبل از اتمام درخواست قبلی؛ پاسخ موفق/خطای دیررس بی‌اثر.
۴. پاسخ جدید refresh با مقدار۲۲۲ قبل از پاسخ قدیمی۱۱۱ می‌رسد؛ مقدار جدید حفظ می‌شود. پاسخ پس از تغییر مالک/فضای کاری کنار گذاشته می‌شود.
۵. ویرایش واقعی نام رزومه، دو مقصد هنگام modal مشترک، انتخاب «ماندن»: داده و dirty حفظ، یک modal، بدون loader/inert باقی‌مانده.

Torvalds نیز بازتولید مستقل نقص اول را دوباره اجرا کرد: پیش از اصلاح صفر درخواست و انتظار دائمی؛ پس از اصلاح یک درخواست و پایان انتظار.

سایر PASSها: npm test و posttest، dashboard-check، dashboard-loading-check، dashboard-staged-loading-check، dashboard-save-check و resume-journey-ui. git diff --check پاک. تصاویر محلی در artifacts/dashboard-loading تازه شدند.

## Selected Panel

full سه‌دوره‌ای زنده: Rams با subtractive-essentialism و وزن UI۱٫۵ قفل‌شده پیش از تحلیل؛ Torvalds با empirical-reduction-to-practice وزن۱؛ Ada با formal-stepwise-verification وزن۱. نقش‌های تحلیلی‌اند، نه اشخاص واقعی. آدا فایل آزمون جدید را ساخت و اجرا کرد؛ کد محصول توسط ریشه تغییر کرد. رأی آدا بنابراین در آزمونِ نویسندهٔ خودش مشارکت دارد؛ بررسی کد دو عضو دیگر و بازاجرای ریشه نیز انجام شد.

## Chairman

ریشه، جدا از اعضای رأی‌دهنده؛ OpenAI، شناسهٔ دقیق مدل میزبان اعلام‌نشده. یک ارائه‌دهنده و نقش‌های مستقل؛ تنوع مدل/ارائه‌دهنده ادعا نمی‌شود.

## Acceptable Compromises

درخواست فایل قدیمی عمداً abort نمی‌شود؛ نتیجه‌اش کنار گذاشته می‌شود و کاربر دیگر منتظرش نمی‌ماند. سند ضروری قبل از ویرایش معتبر دریافت می‌شود؛ API سند به بخش‌های جدید تقسیم نشد. اندازه‌گیری تولید از آزمون محلی استنتاج نمی‌شود.

## Kill Criteria

If در بازاجرای 2026-10-20 انتظار آمار بدون درخواست یا درخواست تکراری callback مشاهده شود، invalidated → بازگشت به اصلاح و آزمون.

If در بازاجرای 2026-10-20 قالب کند جلوی مقصد جدید را بگیرد، پاسخ کهنه داده را بپوشاند یا «ماندن» ویرایش را از بین ببرد، invalidated → توقف تأیید و بازبینی مجدد.

## Concrete Next Step

تولید کامیت اصلاحات و گزارش شورای زنده برای پوشِ مجاز گیت‌هاب.

## Unresolved Questions

شاخه‌های همزمان save/discard در تست تازهٔ modal اضافه نشده‌اند؛ آزمون‌های ذخیرهٔ موجود پاس شدند. دستگاه ضعیف، صفحه‌خوان انسانی و سرعت سایت زنده سنجیده نشده‌اند.

## Key Agreements

انتظار باید به lifecycle واقعی متصل باشد؛ آخرین مقصد و آخرین پاسخ معتبر غالب باشند؛ محافظ تغییرات حفظ شود. هیچ درصد یا تأخیر نمایشی و هیچ زیرساخت لغو عمومی تازه لازم نیست.

## Key Disagreements

R1: Torvalds ضدنمونهٔ refresh پیش از callback اولیه را یافت که تحلیل اولیهٔ Ada پوشش نداده بود؛ اصلاح و چهار تست قطعی اضافه شد. Rams شاهد تعامل واقعی «ماندن» و تفکیک وضعیت شمارندهٔ لینک را خواست؛ اجرا و آزمون شدند. R2 با ماسک A=Rams/B=Torvalds/C=Ada و دستور ضدهمرنگی انجام شد؛ هر عضو دو دیدگاه را نقد کرد. R3 با نام‌های بازگردانده‌شده و رأی ساختاری بود؛ دور اضافه برای تحمیل اجماع ایجاد نشد.

دستور R2 عیناً ارسال شد:
> Anti-conformity directive. If your Round 1 position was correct, defend it. Do not update merely because peers disagree, because consensus is forming, or because a position is repeated by multiple members. Update only when presented with sound, validity-aligned reasoning that exposes a specific flaw in your earlier argument. Naming that flaw is required when you update; if you cannot name it, you should not update.

## Vote Tally

scoped-loading-fixed — ۳٫۵ از۳٫۵: Rams۱٫۵، Torvalds۱، Ada۱؛ همگی CONFIDENCE:high و DEALBREAKER:no. آستانه۲٫۳۳۳؛ عبور کرد. needs-fix صفر در رأی نهایی. هر سه عبارت «نقص مشخص دیگری در دامنه پیدا نکردم» را با محدودیت محیط محلی بیان کردند؛ تأیید مطلق نبود.

## Decision Options

۱. تأیید نسخهٔ قبلی صرفاً با تست معمول: رد شد؛ ضدنمونه بازتولید شده داشت.
۲. اصلاح محدود lifecycle/ناوبری/refresh با تست race: انتخاب و تأیید شد.
۳. بازنویسی loader و افزودن لغو همهٔ درخواست‌ها: شاهد ضرورت ندارد؛ انتخاب نشد.

## Recommended Next Steps

در بازبینی جداگانهٔ عملکرد تولید، waterfall و زمان تعامل روی دستگاه و اینترنت هدف ثبت شود؛ تنها عامل غالب اندازه‌گیری‌شده بهینه شود.

## Confidence

بالا برای رفتار آزموده‌شده و رفع ضدنمونه‌ها؛ سرعت تولید نامعلوم.

## Execution Reliability

سه عضو زنده؛ صفر simulated، صفر degraded، بدون timeout، fallback یا re-prompt اجباری. ایراد تازه در حین همان سه دور رفع شد؛ رأی نهایی پس از شواهد تست بود.

## Session Metadata
---
schema_version: 1
mode: full
panel_size: 3
rounds_run: 3
enforcement_calls: 0
enforcement_breakdown: none
tools_used: live collaboration agents, code inspection, Node tests, Playwright, screenshots
provider_count: 1
fallbacks_triggered: none
input_tokens_estimate: ~unknown
output_tokens_estimate: ~unknown
duration_seconds: ~unknown
---
