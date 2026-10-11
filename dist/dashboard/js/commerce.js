/* جریان‌های نمایشی خرید، اشتراک و رسید. هیچ پرداخت یا درگاه واقعی وجود ندارد.
   نقطهٔ اتصال بک‌اند: RI.commerce.charge() */
(function () {
  'use strict';
  const RI = (window.RI = window.RI || {});
  const esc = RI.esc;

  const demoChip = '<span class="chip chip--sample">مبلغ نمایشی</span>';
  RI.demoPrice = (n) => '<span class="num">' + RI.toman(n) + '</span> ' + demoChip;

  RI.commerce = {
    /* جایگزین‌شدنی با درگاه واقعی؛ اینجا فقط تأخیر و خطای شبیه‌سازی‌شده دارد */
    async charge(amount, title) {
      await RI.sleep(RI.state.ui.sim.slow ? 2200 : 1100);
      if (RI.state.ui.sim.failNext) { RI.state.ui.sim.failNext = false; throw new Error('declined'); }
      return { id: 'r' + RI.uid(), title: title, amount: amount, at: Date.now(), status: 'ok' };
    },
  };

  function payingView(m, o) {
    m.setBody('<div class="pay-state"><span class="spinner"></span><b>' + esc(o.busy || 'در حال اتصال به درگاه نمایشی…') + '</b><p>این مرحله فقط شبیه‌سازی است و مبلغی کسر نمی‌شود.</p></div>');
    m.setActions([]);
  }

  async function runPayment(m, o) {
    payingView(m, o);
    try {
      const pay = await RI.commerce.charge(o.price, o.title);
      o.onSuccess(pay);
      RI.state.billing.payments.unshift(pay);
      RI.emit('billing');
      m.setTitle('پرداخت نمایشی موفق بود');
      m.setBody('<div class="pay-state pay-state--ok"><div class="empty__art">' + RI.icon('check') + '</div><b>' + esc(o.successTitle) + '</b><p>' + esc(o.successText || '') + '</p></div>');
      m.setActions([{ label: 'رسید نمونه', kind: 'ghost', icon: 'receipt', keepOpen: true, onClick: () => RI.receiptModal(pay) }, { label: o.doneLabel || 'تمام', kind: 'primary', value: true, push: true }]);
    } catch (e) {
      m.setTitle('پرداخت انجام نشد');
      m.setBody('<div class="banner banner--err" role="alert">' + RI.icon('alert') + '<div class="banner__body"><b>پرداخت نمایشی ناموفق بود</b>اتصال به درگاه برقرار نشد. چیزی از شما کسر نشده؛ می‌توانید دوباره تلاش کنید.</div></div>');
      m.setActions([{ label: 'بستن', kind: 'ghost' }, { label: 'تلاش دوباره', kind: 'primary', icon: 'refresh', keepOpen: true, onClick: () => { m.setTitle(o.title); runPayment(m, o); } }]);
    }
  }

  /* خرید یک‌بارهٔ قالب، فونت یا رنگ‌بندی؛ true اگر موفق بود */
  RI.purchaseFlow = function (it) {
    return new Promise((resolve) => {
      let ok = false;
      const ref = it.kind + ':' + it.id;
      const typeLabel = { rt: 'قالب رزومه', lt: 'قالب صفحهٔ لینک', font: 'فونت', pal: 'ترکیب رنگ' }[it.kind];
      const o = {
        title: 'خرید ' + typeLabel + ' «' + it.name + '»', price: it.price, busy: 'در حال ثبت خرید نمایشی…',
        successTitle: '«' + it.name + '» حالا مال شماست', successText: 'این مورد برای همیشه در حساب شما می‌ماند و در بخش «ظاهر» قابل انتخاب است.',
        doneLabel: 'استفاده از آن',
        onSuccess: (pay) => { ok = true; RI.state.billing.purchases.push({ id: 'pu' + RI.uid(), kind: it.kind, ref: ref, name: it.name, typeLabel: typeLabel, price: it.price, at: pay.at }); },
      };
      const m = RI.modal({
        title: o.title, size: 'sm',
        body: '<dl class="kv"><dt>مورد</dt><dd>' + esc(it.name) + '</dd><dt>نوع</dt><dd>' + typeLabel + '</dd><dt>نوع خرید</dt><dd>یک‌بار برای همیشه</dd><dt>مبلغ</dt><dd>' + RI.demoPrice(it.price) + '</dd></dl>' +
          '<div class="banner" style="margin-top:16px">' + RI.icon('info') + '<div class="banner__body">این یک جریان نمایشی است؛ پرداخت واقعی توسط تیم شما به درگاه متصل می‌شود. هیچ اطلاعات کارت در این رابط گرفته نمی‌شود.</div></div>',
        actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'پرداخت نمایشی', kind: 'primary', icon: 'card', keepOpen: true, onClick: () => runPayment(m, o) }],
        onClose: () => resolve(ok),
      });
    });
  };

  RI.subscribeFlow = function (planId) {
    return new Promise((resolve) => {
      const plan = RI.PLANS[planId];
      let ok = false;
      const cur = RI.state.billing.plan;
      const renew = !!(cur && cur.end > Date.now());
      const startFrom = renew ? cur.end : Date.now();
      const end = startFrom + plan.months * 30 * 864e5;
      const o = {
        title: (renew ? 'تمدید یا تغییر به ' : 'اشتراک ') + plan.name, price: plan.price, busy: 'در حال فعال‌سازی اشتراک نمایشی…',
        successTitle: 'اشتراک ' + plan.name + ' فعال شد',
        successText: plan.id === 'y' ? 'مجموعه‌های اشتراکی باز شدند و می‌توانید درخواست دامنهٔ .ir رایگان را در بخش «آدرس و انتشار» ببینید.' : 'مجموعه‌های اشتراکی قالب و فونت از همین حالا قابل استفاده‌اند.',
        doneLabel: 'تمام',
        onSuccess: () => { ok = true; RI.state.billing.plan = { id: plan.id, start: renew ? cur.start : Date.now(), end: end, autoRenew: false }; },
      };
      const m = RI.modal({
        title: o.title, size: 'sm',
        body: '<dl class="kv"><dt>پلن</dt><dd>' + plan.name + ' (' + RI.fa(plan.months) + ' ماه)</dd><dt>شروع</dt><dd>' + RI.date(startFrom) + '</dd><dt>پایان</dt><dd>' + RI.date(end) + ' <span class="chip chip--sample">تاریخ نمونه</span></dd><dt>مبلغ</dt><dd>' + RI.demoPrice(plan.price) + '</dd></dl>' +
          (plan.id === 'y' ? '<div class="banner banner--brown" style="margin-top:16px">' + RI.icon('globe') + '<div class="banner__body"><b>دامنهٔ .ir رایگان</b>اشتراک سالانه امکان دریافت یک دامنهٔ .ir بدون هزینهٔ جداگانه را دارد.</div></div>' : '') +
          '<div class="banner" style="margin-top:12px">' + RI.icon('info') + '<div class="banner__body">جریان نمایشی؛ هیچ پرداخت واقعی انجام نمی‌شود.</div></div>',
        actions: [{ label: 'انصراف', kind: 'ghost' }, { label: 'پرداخت نمایشی', kind: 'primary', icon: 'card', keepOpen: true, onClick: () => runPayment(m, o) }],
        onClose: () => resolve(ok),
      });
    });
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
    if (a === 'locked-buy') return '<span class="chip chip--brown">' + RI.icon('lock') + 'خرید یک‌بار · ' + RI.fa(it.price) + ' تومان نمایشی</span>';
    return '<span class="chip chip--brown">' + RI.icon('lock') + 'با اشتراک</span>';
  };
})();
