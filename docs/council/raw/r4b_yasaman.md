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
