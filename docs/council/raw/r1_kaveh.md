R1-a (بزرگ): یک «پوستهٔ عمومی» به‌جای ۱۴ کپی هدر/فوتر و دو استایل‌شیتِ قدیمیِ نیمه‌مرده

بچه‌ها، هدر (حدود ۲٫۲KB) و فوتر (حدود ۳٫۹KB) در about، contact، privacy، terms، resume-builder، resume-website، blog و شش مقاله در `dist/*/index.html` بایت‌به‌بایت کپی هستند (md5 هدر هر ۹ صفحهٔ بررسی‌شده یکی است؛ فقط changes و مقاله‌ها کمی فرق دارند). هر تغییر لینک یا نماد اعتماد یعنی ویرایش ۱۴ فایل. روی همین صفحه‌ها `style.css` و `frozen.css` (جمعاً ۴۲KB، میراث لندینگ قدیمی) هم لود می‌شود؛ با اسکریپتی که انجام دادم از ۲۳۶ سلکتورِ این دو فایل حدود ۷۰٪ در هیچ‌کدام از صفحه‌های info/blog/demo استفاده نشده.

پیشنهاد، سه فاز مستقل: (۱) فوتر و هدر می‌شوند دو فایل partial و `src/http/static.cjs` که همین الان روی HTML کار می‌کند (خط ۱۳۵) به‌جای مارکر `<!--site-footer-->` آن را موقع بوت یک بار می‌خواند و جای‌گذاری می‌کند؛ خروجی برای ربات‌ها و کاربر همان HTML قبلی است، پس SEO دست‌نخورده می‌ماند. (۲) فقط قاعده‌های زندهٔ `style.css`/`frozen.css` به `info.css` می‌روند و دو فایل با `assets/vazirmatn.woff2` قدیمی (۵۰KB، فقط همین دو و signature مصرفش می‌کنند) حذف می‌شوند. (۳) یک تست که وجود هدر/فوتر را روی همهٔ مسیرها چک کند.

حذف: حدود ۸۵KB HTML تکراری + ۳۰KB CSS + ۵۰KB فونت؛ اضافه: حدود ۶۰ خط (static.cjs، دو partial، تست). URLها، رزومه‌های منتشرشده و خریدها دست نمی‌خورند، چون فقط صفحه‌های عمومی عوض می‌شوند. ریسک واقعی: پسرفت بصری بعد از ادغام CSS؛ با `site-content-check` و `check:ui` در ۱۴۴۰/۳۹۰/۳۲۰ پوشش می‌دهیم و فاز ۲ جدا از ۱ ریلیز می‌شود. ریسک دوم: کش استاتیک؛ تست `static-cache-check` باید آپدیت شود.

R1-b (کوچک): حذف فایل‌های یتیمِ سایت عمومی (signature، سه CSS بدون مصرف‌کننده، سکهٔ PNG قدیمی)

در `dist` سه فایل `refined.css`، `experience.css`، `performance.css` را grep کردم: هیچ HTML، JS، تست، سرور یا اسکریپتی به آن‌ها اشاره نمی‌کند (حتی `docs/AUDIT.fa.md` هم قاعده‌های مرده‌اش را ذکر کرده). `dist/brand/it-cat-coin-v1.png` (۲۰۰KB) هم صفر ارجاع دارد. `dist/signature/` صفحهٔ هیرو برای ZIP جدا بوده (README خودش می‌گوید «delivered ZIP»)، `noindex`، در sitemap نیست و هیچ صفحه‌ای لینکش نمی‌کند؛ فقط سه تست `browser-audit-check`، `full-ui-audit`، `site-interaction-contrast-check` آدرس `/signature/` را در لیست مسیرها دارند.

کار: حذف این فایل‌ها و برداشتن `/signature/` از آن سه لیست. حذف حدود ۳۰۰ خط و ۲۵۰KB، اضافه صفر خط جز ویرایش سه آرایه. `/signature/` به ۴۰۴ استاندارد می‌رسد، که برای صفحه‌ای بدون لینک و ایندکس قابل قبول است. ریسک تقریباً صفر؛ فقط قبل از حذف یک بار `npm test` برای اطمینان از اینکه مسیر دیگری رجوع نمی‌کند.

R1-c (کوچک): یک Vazirmatn و یک favicon؛ حذف کپی‌های بایت‌به‌بایت

`dist/auth-ui/assets/fonts/Vazirmatn.woff2` و `dist/dashboard/assets/fonts/Vazirmatn.woff2` هر دو ۱۱۱KB و md5 یکسان‌اند. سرور هم‌اکنون `/assets/fonts/Vazirmatn.woff2` را از کپی داشبورد سرو می‌کند (`static.cjs` خط ۹، تست در `static-cache-check`). `dist/auth-ui/css/tokens.css` خط ۶ هنوز به مسیر نسبیِ کپی خودش اشاره می‌کند. همچنین سه `favicon.svg` در `dist/assets`، `dist/auth-ui/assets` و `dist/dashboard/assets` هیچ ارجاعی ندارند (همه‌جا `/brand/favicon.svg` استفاده می‌شود).

کار: آدرس فونت در `auth-ui/css/tokens.css` را به `/assets/fonts/Vazirmatn.woff2` ببریم، کپی فونت auth-ui و سه favicon یتیم را حذف کنیم. حدود ۱۱۱KB حذف و یک خط ویرایش. ریسک: صفحه‌های ورود/ثبت‌نام اگر فونت را نگیرند به Tahoma می‌افتند؛ با `check:ui` روی `/login/` و `/register/` و یک چک هدر `200` برای فونت پوشش داده می‌شود. به رزومه‌ها، خریدها و URLها ربطی ندارد.
