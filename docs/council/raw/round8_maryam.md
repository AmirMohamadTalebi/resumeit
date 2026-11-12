# دور ۸ · امضای مریم

## ۱) رأی R1-e

R1-e — ✅ — بزرگ: بله، از نظر سرعت؛ حدود ۹۹KB فشرده و ۱٫۱MB خام کمتر روی هر صفحهٔ عمومی، روی موبایل ایران محسوس است.

ادعا را در کد چک کردم. `assets/daisyui.css` (۱٬۱۳۸٬۵۷۱ بایت، ۷۰۹ کلاس) را ۲۰ صفحه لود می‌کنند. ۱۵ تا صفحهٔ info، blog، demo و changes هستند؛ بقیه login، register، forgot-password، account-status و signature‌اند. در HTML آن ۱۵ صفحه فقط `btn` و `link` (و `lg` که پیشوند کلاس‌های خودشان است) با daisy مشترک است. `notifications.js` و `info.js` هم کلاس daisy نمی‌سازند و هیچ CSS عمومی‌ای از `--color-base-*` استفاده نمی‌کند. پس ادعا درست است.

دو شرط، که مانع نیستند:
- فاز ۴ باید `/account-status/` را هم بسنجد؛ `account-status.js` کلاس `btn` و `input` دارد و Kaveh فقط سه صفحهٔ auth را نام برده.
- daisy چند قاعدهٔ `:root` دارد (`color-scheme`، `scrollbar-color`، `overflow`) که در عکس‌مقایسه دیده نمی‌شوند. اگر لازم بودند، دو خطشان به `info.css` برود.

## ۲) امضا

N1-a — ✅ امضا
N1-b — ✅ امضا
N1-c — ✅ امضا
N2-a — ✅ امضا
N2-b2 — ✅ امضا
N2-c — ✅ امضا
N3-a — ✅ امضا
N3-b — ✅ امضا
N3-c — ✅ امضا
C1-a — ✅ امضا
C1-b2 — ✅ امضا
C1-c — ✅ امضا
C2-a — ✅ امضا
C2-b — ✅ امضا
C2-c — ✅ امضا
C3-a — ✅ امضا
C3-b — ✅ امضا
C3-c — ✅ امضا
R1-e — ✅ امضا
R1-d — ✅ امضا
R1-bc — ✅ امضا
R2-a — ✅ امضا
R2-c — ✅ امضا
R2-d — ✅ امضا
R3-a2 — ✅ امضا
R3-b — ✅ امضا
R3-d — ✅ امضا

یادداشت‌های غیرمانع:
- **N2-a:** iframe پیش‌نمایش فعلی `sandbox="allow-same-origin"` دارد (preview.js:221) و بدون `allow-modals` تابع `print()` بی‌صدا بی‌اثر می‌شود. iframe چاپ باید `sandbox="allow-same-origin allow-modals"` بگیرد، بدون `allow-scripts`، و تست بسنجد که دیالوگ واقعاً باز می‌شود؛ مسیر جایگزین «تب تازه» هم بماند.
- **C1-a:** کوئری `SELECT content FROM dashboard_versions` را در `store` فقط وقتی بزنید که `removed` خالی نیست. وگرنه هر ذخیرهٔ خودکار تا ۲۰ JSON را می‌خواند و parse می‌کند.
- **R1-e:** شمارش «۱۴ صفحه» در واقع ۱۵ است، چون `changes` را هم دارد؛ فهرست از روی grep ساخته شود.
