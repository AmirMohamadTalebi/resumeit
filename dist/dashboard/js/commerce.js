/* تعرفه‌های خرید و اشتراک؛ پرداخت تا اتصال به درگاه غیرفعال است. */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});
  const esc = RI.esc;

  // shortcut: connect a payment gateway before enabling purchases or subscriptions.
  RI.purchaseFlow = function (it) {
    return new Promise(resolve => RI.modal({
      title: 'خرید «' + it.name + '»', size: 'sm',
      body: '<dl class="kv"><dt>مورد</dt><dd>' + esc(it.name) + '</dd><dt>نوع خرید</dt><dd>یک‌بار برای همیشه</dd><dt>مبلغ</dt><dd class="num">' + RI.toman(it.price) + '</dd></dl><p>پرداخت هنوز فعال نیست. برای راهنمایی با پشتیبانی تماس بگیرید.</p>',
      actions: [{ label: 'بستن', kind: 'ghost' }, { label: 'پشتیبانی', kind: 'soft', onClick: () => location.assign('/contact/') }],
      onClose: () => resolve(false),
    }));
  };
  RI.subscribeFlow = function (planId) {
    const plan = RI.PLANS[planId];
    return new Promise(resolve => RI.modal({
      title: 'اشتراک ' + plan.name, size: 'sm',
      body: '<dl class="kv"><dt>دوره</dt><dd>' + RI.fa(plan.months) + ' ماه</dd><dt>ماهانه</dt><dd class="num">' + RI.toman(plan.price / plan.months) + '</dd><dt>مبلغ کل دوره</dt><dd class="num">' + RI.toman(plan.price) + '</dd></dl><p>پرداخت هنوز فعال نیست. برای راهنمایی با پشتیبانی تماس بگیرید.</p>',
      actions: [{ label: 'بستن', kind: 'ghost' }, { label: 'پشتیبانی', kind: 'soft', onClick: () => location.assign('/contact/') }],
      onClose: () => resolve(false),
    }));
  };

  RI.receiptModal = function (pay) {
    const no = 'RI-' + String(pay.id).replace(/\D/g, '').padEnd(6, '7').slice(0, 6);
    RI.modal({
      title: 'رسید نمونه', size: 'sm',
      body: '<div class="receipt"><div class="receipt__mark" aria-hidden="true">نمونه</div><div class="receipt__head"><b class="ltr-inline">ResumeIt</b><span>رسید پرداخت نمایشی</span></div>' +
        '<dl class="kv"><dt>شمارهٔ رسید</dt><dd class="ltr-inline mono">' + no + '</dd><dt>شرح</dt><dd>' + esc(pay.title) + '</dd><dt>تاریخ</dt><dd>' + RI.date(pay.at) + '</dd><dt>روش</dt><dd>درگاه نمایشی</dd><dt>وضعیت</dt><dd>' + (pay.status === 'ok' ? 'موفق' : 'ناموفق') + '</dd></dl>' +
        '<div class="receipt__total"><span>مبلغ (نمایشی)</span><b class="num">' + RI.toman(pay.amount) + '</b></div></div>',
      actions: [
        { label: 'دانلود رسید نمونه', kind: 'soft', icon: 'download', keepOpen: true, onClick: () => {
          const txt = 'رسید نمونه ResumeIt\nشماره: ' + no + '\nشرح: ' + pay.title + '\nمبلغ نمایشی: ' + pay.amount + ' تومان\nتاریخ: ' + RI.date(pay.at) + '\n\nاین فایل صرفاً نمونه است.';
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' })); a.download = 'resumeit-sample-receipt.txt'; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 500);
        } },
        { label: 'بستن', kind: 'ghost', push: true },
      ],
    });
  };

  /* توضیح روشن برای موردی که قفل است */
  RI.lockedExplain = async function (it) {
    if (it.access === 'buy') return RI.purchaseFlow(it);
    const c = await RI.choice({
      title: '«' + it.name + '» با اشتراک باز می‌شود',
      text: 'این مورد جزو مجموعهٔ اشتراکی است. با هر اشتراک (سه‌ماهه، شش‌ماهه یا سالانه) تمام مجموعهٔ قالب‌ها و فونت‌های اشتراکی در دسترس شما قرار می‌گیرد. استفاده از موارد رایگان بدون محدودیت ادامه دارد.',
      options: [{ label: 'مشاهدهٔ اشتراک‌ها', kind: 'primary', icon: 'crown', value: 'plans' }, { label: 'فعلاً نه', kind: 'ghost', value: null }],
    });
    if (c === 'plans') RI.go('billing');
    return false;
  };

  RI.accessBadge = function (ref, it) {
    const a = RI.accessOf(ref, it);
    if (a === 'free') return '<span class="chip chip--ok">رایگان</span>';
    if (a === 'owned') return '<span class="chip chip--ok">' + RI.icon('check') + 'خریده‌اید</span>';
    if (a === 'sub-ok') return '<span class="chip chip--brown">' + RI.icon('crown') + 'با اشتراک شما</span>';
    if (a === 'locked-buy') return '<span class="chip chip--brown">' + RI.icon('lock') + 'خرید یک‌بار · ' + RI.fa(it.price) + ' تومان</span>';
    return '<span class="chip chip--brown">' + RI.icon('lock') + 'با اشتراک</span>';
  };
})();
