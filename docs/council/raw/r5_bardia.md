C2-a (بزرگ): جزئیات پیاده‌سازی مرکز مالی

بررسی Zibal: بله، /v1/inquiry واقعی است (zibal.cjs، تابع verify دو بار صدایش می‌زند). پس «استعلام» فقط برای Zibal باشد؛ SEP فقط verify دارد و برایش فقط «ثبت دستی» می‌ماند. تابع تازهٔ inquire(order) در zibal.cjs فقط inquiry را می‌زند و verify را نه؛ نتیجه فقط وقتی معتبر است که status===1 و orderId و amount با سفارش بخواند (همان شرط verifiedProof).

فاز ۱ (صف review):
- database/payments.cjs: reviewPayments() و تابع واحد settleReview(actor,id,{kind,evidence,requestId}) با kind از این سه: paid، reversed، unchanged.
- مسیر paid دقیقاً مثل completePayment عمل می‌کند و همان reference را می‌نویسد: 'payment:'+provider+':'+id در wallet_credit_claims (شرط حیاتی مریم). ترتیب: قفل users، قفل payment_orders FOR UPDATE، شرط status==='review'، INSERT در claims (PK، پس هر دوبارِ بعدی ER_DUP_ENTRY می‌شود و fail 409 می‌دهد)، بعد wallet و wallet_transactions، بعد status='paid'. reconcile بعدی هم claimPayment فقط pending/verifying برمی‌دارد و هم اگر برسد INSERT claims می‌شکند؛ دوبار شارژ ممکن نیست.
- ثبت دستی فقط مالک: همان شاخهٔ ownerPanel در src/admin/http.cjs (POST /api/admin/payments/:id/settle). نقش پشتیبانی هیچ مسیری ندارد. شرط ورودی: RRN یا trace و یادداشت حداقل ۱۰ حرف، سقف طول؛ مبلغ از خود سفارش خوانده می‌شود، نه از ورودی.
- همین تراکنش ردیف admin_audit با request_id (الگوی repeated() در support-desk.cjs) می‌نویسد.
- UI: بخش «در بازبینی» در dist/admin/payments و admin.js.
- تست: tests/mysql-races-check.cjs: ۲۰ settleReview موازی روی یک سفارش، یک ردیف claims و یک تراکنش؛ و settleReview همزمان با completePayment، موجودی فقط یک بار زیاد شود. در tests/payments-database-check.cjs: stub زیبال status 2 هرگز اعتبار نمی‌دهد.

فاز ۲ (بازپرداخت، فقط با دادهٔ تقاضا): اول فقط گزینهٔ «بازگشت وجه» به TOPICS در dist/dashboard/js/pages/support.js و شمارش در پنل. فاز ۲ بعد از دیدن عدد: ستون refunded_at روی account_access (migration در همان schema.cjs با الگوی information_schema فعلی)، بدون حذف ردیف؛ شرایط: ≤۷۲ ساعت، قالب یا فونت، در رزومهٔ منتشرشده فعال نیست، اشتراک نه. wallet.cjs تابع refundPurchase با قفل کیف پول مثل خرید و reference یکتای 'refund:'+reference. سیاست مکتوب: بند تازه در dist/terms (صفحهٔ شرایط) پیش از انتشار فاز. تست: ۲۰ بازپرداخت موازی یک بار برگرداند.

فاز ۳: کارت درآمد و تعداد review در ادمین، فقط خواندنی از جدول‌های موجود، بدون ایمیل.

انتشار: ۳.۳.۲ فاز ۱؛ ۳.۳.۳ شمارش تقاضا؛ فاز ۲ بعد.

نمی‌کنیم: بازگشت پول خودکار به بانک، تطبیق ایمیلی، بازپرداخت اشتراک، حذف ردیف خرید، هر مسیر برای نقش پشتیبانی.

C2-b: جزئیات یادآوری پایان اشتراک

- notifications/service.cjs: داخل tick موجود، دیتابیس تابع dueSubscriptionReminders(now) را می‌دهد؛ از account_access ردیف ref LIKE 'subscription:%' با expires_at در ۷ روز یا ۱ روز آینده. هر یادآوری با reference='sub-end:'+ref+':'+end+':'+stage درج می‌شود؛ ستون reference در user_notifications UNIQUE است، پس بدون migration تکرار نمی‌شود و بعد از تمدید چون end نو است ریست لازم نیست.
- notification_preferences و ایمیل/Push تأییدشده رعایت می‌شود؛ نوع تراکنشی است.
- dist/dashboard/js/pages/billing.js و home.js: اگر billing.plan.end کمتر از ۷ روز مانده، نوار با «تمدید» می‌آید؛ این برای کاربر بدون ایمیل است و ارسال لازم ندارد. دکمه همان خرید فعلی را با requestId تازه صدا می‌زند و دکمه تا پاسخ disabled است.
- تست tests/wallet-check.cjs: دو خرید موازی با یک requestId یک بار کسر کند؛ در tests/notification-delivery-check.cjs: دو tick پشت‌سرهم یک اعلان بسازد، و بعد از تمدید اعلان تازه بیاید. تست UI: نوار فقط زیر ۷ روز.
- نمی‌کنیم: تمدید خودکار، ستون تازه، تایمر تازه.

C2-c: جزئیات پاسخ آماده و ۲۴ ساعت+

- src/database/support-desk.cjs: آبجکت ثابت CANNED[department] با ۸ پاسخ و export supportCanned(). تابع تازهٔ waitingTickets(now): تیکت باز که آخرین پیام غیرداخلی از مشتری است و گذشته از ۲۴ ساعت؛ پیام‌های internal=TRUE و ارجاع حساب نمی‌شوند (قاعدهٔ 3.2.8).
- پنل: منوی «درج پاسخ آماده» فقط متن را در فیلد می‌گذارد؛ نشان «۲۴ ساعت+» در فهرست.
- تست tests/support-desk-check.cjs: تیکتی که فقط یادداشت داخلی جدید دارد هنوز «منتظر» است؛ پاسخ staff آن را برمی‌دارد؛ تست UI در support-desk-ui-check.cjs که درج، فیلد را پر کند و ارسال نکند.
- نمی‌کنیم: ارسال خودکار، ذخیره در دیتابیس، میانگین هفته.
