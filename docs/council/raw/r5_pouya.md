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
