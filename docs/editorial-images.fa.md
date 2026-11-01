# تصاویر تحریریهٔ رزومیت

تاریخ: ۱۴۰۵/۰۸/۱۰. تولید با ابزار داخلی image_gen؛ فایل‌های نهایی در `dist/brand/editorial/`.

## محدوده

۶ مقاله: کاور فهرست، ابتدای مقاله و مقاله‌های مرتبط. ۳ صفحهٔ معرفی: رزومه‌ساز، وبسایت رزومه و دربارهٔ ما. پیش‌نمایش واقعی قالب‌ها، نشان برند، فندق و صفحات عملیاتی حفظ شدند. تصویر دربارهٔ ما مفهومی است و عکس دفتر یا اعضای واقعی نیست.

## دستور تولید

پوستر افقی ۳:۲ با تیتر فارسی درشت و متصل در سمت راست، تصویر مفهومی سه‌بعدی در چپ، رنگ‌های سرمه‌ای/آبی یخی/طلایی، بافت کاغذ، کنتراست بالا و حاشیهٔ امن. بدون آمار ساختگی یا نوشته‌های ریز ساختگی. تیترها و ایده‌های هر تصویر:

- `resume-importance`: «رزومه‌ات درها را باز می‌کند» — An ivory resume becoming an open architectural doorway with amber light and paper steps.
- `resume-for-immigration`: «رزومه‌ات را جهانی کن» — A sculptural passport and resume unfold into a globe with a brass orbit; midnight teal and icy blue
- `resume-without-experience`: «اولین شغل، اولین رزومه» — A paper resume transforms into an ascending stairway, a small graduation cap at its base; icy blue, midnight and gold
- `ats-resume`: «از فیلتر ATS عبور کن» — An ivory resume breaks through a dramatic translucent scanner gate; a crisp green approval mark; midnight teal, ice and warm gold
- `online-resume-vs-pdf`: «یک رزومه، دو راه معرفی» — A sculptural split composition, paper resume on one side and a sleek digital portfolio on the other linked by a brass arc; midnight and icy blue
- `resume-mistakes`: «این اشتباه‌ها فرصتت را می‌گیرند» — A crumpled rejected resume with terracotta corrections contrasts with a crisp immaculate resume in a beam of gold light; midnight teal and warm terracotta
- `resume-builder`: «رزومه‌ای بساز که دیده شود» — A single sculptural ivory resume is assembled from elegant paper layers, spotlighted like a precious editorial artifact; midnight blue, warm gold and ice
- `resume-website`: «یک لینک برای تمامِ تو» — A dramatic elegant portfolio browser window and phone connected by one sculptural gold ribbon in a dark spatial composition; midnight teal, icy blue
- `about`: «فرصت‌ها از معرفی تو شروع می‌شوند» — An open architectural doorway shaped like a resume page with golden light and an elegant pathway of paper leading into it; deep teal, pale blue and brass

## بهینه‌سازی و بررسی

WebP با quality=80 و method=6، دو عرض ۶۴۰ و ۱۲۰۰ با نسبت ۳:۲، srcset و sizes، ابعاد صریح برای جلوگیری از جابه‌جایی چیدمان، lazy loading و async decoding. object-fit:contain برای حفظ تیتر کامل. کاور اشتراک‌گذاری مقاله و Article.image نیز به‌روزرسانی شد.

آزمون پایدار: `node tests/editorial-images-check.cjs`. هر فایل سقف ۱۸۰ کیلوبایت دارد. تست سئو: `node tests/seo-check.cjs`. گزارش مرورگر محلی و اسکرین‌شات‌ها در `artifacts/editorial-*` نگهداری می‌شوند (خارج از گیت).

## نتیجهٔ تحویل ۳.۲.۲ بتا

۱۸ فایل در مجموع ۱٬۳۴۴٬۰۲۶ بایت؛ کوچک‌ترین فایل ۳۰٬۱۸۸ و بزرگ‌ترین ۱۲۱٬۹۹۸ بایت. هر ۱۸ فایل بازخوانی و ابعادشان بررسی شد. هر ۹ تصویر از نظر تیتر فارسی و نسخهٔ فشرده بررسی بصری شد. سه دور مرورگر، هر بار ۶۶ محل نمایش در عرض‌های ۳۹۰ و ۱۴۴۰ پیکسل، بارگذاری و جاگرفتن تصویر داخل قاب را تأیید کرد. بازطراحی فهرست و مقاله در عرض‌های ۳۲۰، ۳۹۰ و ۱۴۴۰ پیکسل بدون اسکرول افقی بررسی شد؛ فهرست مطالب و کاهش حرکت پاس شدند. تست سئو، متن جایگزین تصاویر و سازگاری نسخه با API نیز پاس شد. این نتایج مربوط به محیط محلی هستند.

