# تنظیم ورود اجتماعی و جایگذاری پیامک

مسیرهای ورود گوگل و گیت‌هاب پیاده شده‌اند و دکمه‌ها در ورود و ثبت‌نام نمایش داده می‌شوند؛ فعال‌شدن آن‌ها به تنظیمات کامل هاست وابسته است
برای تنظیمات OAuth، `PUBLIC_ORIGIN=https://resumeit.ir` هم باید روی هاست باشد
پس از استقرار، `/api/auth/providers` باید برای هر دو سرویس مقدار true نشان دهد

## گوگل

در https://console.cloud.google.com/ پروژه‌ای با نام ResumeIt بساز
در Google Auth Platform بخش Branding نام برنامه و ایمیل پشتیبانی را وارد کن
در Audience نوع External را انتخاب کن و در حالت Testing، ایمیل خودت را به Test users اضافه کن
در Clients یک OAuth Client از نوع Web application بساز

- Authorized JavaScript origins: `https://resumeit.ir`
- Authorized redirect URIs: `https://resumeit.ir/api/auth/google/callback`
- اطلاعات مورد نیاز برای ورود: `openid email profile`

Client ID و Client Secret را در متغیرهای محیطی هاست با نام‌های `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` بگذار
Secret را در چت یا گیت‌هاب قرار نده

## گیت‌هاب

در https://github.com/settings/developers بخش OAuth Apps، گزینهٔ New OAuth App را بزن

- Application name: `ResumeIt`
- Homepage URL: `https://resumeit.ir`
- Authorization callback URL: `https://resumeit.ir/api/auth/github/callback`

Client ID و Client Secret را در متغیرهای محیطی هاست با نام‌های `GITHUB_CLIENT_ID` و `GITHUB_CLIENT_SECRET` بگذار
با این چهار متغیر، دکمه‌های ورود واقعی فعال می‌شوند و callback به داشبورد برمی‌گردد
هنگام تغییر دامنه به resumeit.ir آدرس‌های برگشت و تنظیمات دامنه هم باید تغییر کنند

منابع: https://developers.google.com/identity/protocols/oauth2/web-server و https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app

## حساب و انتشار

ورود اجتماعی به شماره نیاز ندارد و حساب تازه‌ای با شناسهٔ ثابت همان سرویس ساخته می‌شود
از تنظیمات حساب می‌توان گوگل و گیت‌هاب را به حساب فعلی وصل کرد و بعد با هر روش به همان حساب برگشت
حساب اجتماعی متصل به شخص دیگر قابل اتصال نیست، تغییر یا شباهت ایمیل باعث ادغام حساب‌ها نمی‌شود
قطع آخرین روش ورود بدون روش جایگزین پذیرفته نمی‌شود
نام و نام خانوادگی جداگانه در دیتابیس ذخیره می‌شوند
شمارهٔ اضافه‌شده با پیامک واقعی تأیید می‌شود، کد به حساب درخواست‌کننده وابسته است و شمارهٔ تکراری قبل از ارسال کد رد می‌شود
انتشار حتی در پیش‌نمایش داشبورد به نام، نام خانوادگی و شمارهٔ تأییدشده نیاز دارد
شماره‌های قدیمی که سابقهٔ تأیید ذخیره‌شده ندارند باید یک بار در تنظیمات یا با ورود پیامکی تأیید شوند

در شروع سرور، جدول‌های social_identities و oauth_states و ستون‌های نام و شمارهٔ تأییدشده اضافه می‌شوند، هیچ دادهٔ قبلی حذف نمی‌شود
OAuth از PKCE، state تک‌مصرف با اعتبار ۱۰ دقیقه و کوکی HttpOnly استفاده می‌کند، توکن سرویس اجتماعی ذخیره نمی‌شود
تست محلی `npm run check:oauth` سرویس‌های خارجی را شبیه‌سازی می‌کند
تست واقعی MySQL و مهاجرت روی هاست با `npm run check:database` انجام می‌شود

## قالب پیامک

برای WebOTP و پیشنهاد کد در مرورگر، خط آخر قالب تأییدشدهٔ SMS.ir باید با دامنهٔ صفحه یکی باشد
متن پیشنهادی قالب فعلی:

```text
کد ورودت به ResumeIt:
#CODE#
تا ۲ دقیقه معتبره
این کد رو به کسی نده
@resumeit.ir ##CODE#
```

در خط آخر، اولین # علامت فرمت مرورگر است و #CODE# متغیر قالب SMS.ir است
برای نمونه، با کد 123456 باید خروجی دقیقاً `@resumeit.ir #123456` باشد
پیش از استفاده، پیش‌نمایش پنل را بررسی کن که این خروجی را بسازد و خط آخر را عوض نکند
اگر پنل این ترکیب را نپذیرفت، باید قالب را با متغیر جداگانهٔ مورد تأیید پشتیبانی SMS.ir تنظیم کنیم
بعد از ویرایش قالب، تأیید دوبارهٔ پنل لازم است و تا آن زمان جایگذاری دستی کار می‌کند
اگر قالب جدید شناسهٔ دیگری گرفت، `SMSIR_TEMPLATE_ID` هاست را تغییر بده
برای دامنهٔ نهایی خط آخر باید `@resumeit.ir ##CODE#` باشد
WebOTP نیازمند HTTPS معتبر، مرورگر پشتیبانی‌شده و اجازهٔ کاربر است
سایت بعد از جایگذاری کد منتظر فشردن دکمهٔ تأیید می‌ماند

منابع: https://developer.chrome.com/docs/identity/web-apis/web-otp و https://developer.apple.com/documentation/security/enabling-autofill-for-domain-bound-sms-codes
