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
