# تنظیم ورود اجتماعی و جایگذاری پیامک

ورود گوگل و گیت‌هاب هنوز در سرور پیاده نشده و تا دریافت تنظیمات، دکمهٔ ورود فعال نشان داده نمی‌شود
آدرس‌های زیر قرارداد مرحلهٔ اتصال هستند و فعلاً endpoint فعال نیستند

## گوگل

در https://console.cloud.google.com/ پروژه‌ای با نام ResumeIt بساز
در Google Auth Platform بخش Branding نام برنامه و ایمیل پشتیبانی را وارد کن
در Audience نوع External را انتخاب کن و در حالت Testing، ایمیل خودت را به Test users اضافه کن
در Clients یک OAuth Client از نوع Web application بساز

- Authorized JavaScript origins: `https://mintra.ir`
- Authorized redirect URIs: `https://mintra.ir/api/auth/google/callback`
- اطلاعات مورد نیاز برای ورود: `openid email profile`

Client ID و Client Secret را در متغیرهای محیطی هاست با نام‌های `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` بگذار
Secret را در چت یا گیت‌هاب قرار نده

## گیت‌هاب

در https://github.com/settings/developers بخش OAuth Apps، گزینهٔ New OAuth App را بزن

- Application name: `ResumeIt`
- Homepage URL: `https://mintra.ir`
- Authorization callback URL: `https://mintra.ir/api/auth/github/callback`

Client ID و Client Secret را در متغیرهای محیطی هاست با نام‌های `GITHUB_CLIENT_ID` و `GITHUB_CLIENT_SECRET` بگذار
بعد از تنظیم این چهار متغیر خبر بده تا مسیرهای واقعی ورود و ارتباط با حساب‌ها تکمیل و بررسی شوند
هنگام تغییر دامنه به resumeit.ir آدرس‌های برگشت و تنظیمات دامنه هم باید تغییر کنند

منابع: https://developers.google.com/identity/protocols/oauth2/web-server و https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app

## قالب پیامک

برای WebOTP و پیشنهاد کد در مرورگر، خط آخر قالب تأییدشدهٔ SMS.ir باید با دامنهٔ صفحه یکی باشد
متن پیشنهادی قالب فعلی:

```text
کد ورودت به ResumeIt:
#CODE#
تا ۲ دقیقه معتبره
این کد رو به کسی نده
@mintra.ir ##CODE#
```

در خط آخر، اولین # علامت فرمت مرورگر است و #CODE# متغیر قالب SMS.ir است
برای نمونه، با کد 123456 باید خروجی دقیقاً `@mintra.ir #123456` باشد
پیش از استفاده، پیش‌نمایش پنل را بررسی کن که این خروجی را بسازد و خط آخر را عوض نکند
اگر پنل این ترکیب را نپذیرفت، باید قالب را با متغیر جداگانهٔ مورد تأیید پشتیبانی SMS.ir تنظیم کنیم
بعد از ویرایش قالب، تأیید دوبارهٔ پنل لازم است و تا آن زمان جایگذاری دستی کار می‌کند
اگر قالب جدید شناسهٔ دیگری گرفت، `SMSIR_TEMPLATE_ID` هاست را تغییر بده
برای دامنهٔ نهایی خط آخر باید `@resumeit.ir ##CODE#` باشد
WebOTP نیازمند HTTPS معتبر، مرورگر پشتیبانی‌شده و اجازهٔ کاربر است
سایت بعد از جایگذاری کد منتظر فشردن دکمهٔ تأیید می‌ماند

منابع: https://developer.chrome.com/docs/identity/web-apis/web-otp و https://developer.apple.com/documentation/security/enabling-autofill-for-domain-bound-sms-codes
