/* اشتراک و خریدها */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc;

  RI.registerPage('billing', {
    title: 'اشتراک و خریدها',
    skeleton: () => '<div class="skeleton" style="height:56px;width:50%;margin-bottom:24px"></div><div class="skeleton" style="height:220px;margin-bottom:20px"></div><div class="skeleton" style="height:320px"></div>',
    render() {
      const b = RI.state.billing, sub = RI.hasSub();
      if (RI.state.ui.sim.netError) return RI.pageHead({ eyebrow: 'حساب', title: 'اشتراک و خریدها' }) + '<div class="panel">' + RI.empty({ icon: 'wifi', title: 'اطلاعات اشتراک بارگذاری نشد', text: 'اتصال برقرار نشد دوباره تلاش کن', action: '<button type="button" class="btn btn--primary" data-retry>' + RI.icon('refresh') + 'تلاش دوباره</button>' }) + '</div>';
      const plan = b.plan && b.plan.end > Date.now() ? b.plan : null;
      const left = plan ? Math.max(0, Math.ceil((plan.end - Date.now()) / 864e5)) : 0;
      const total = plan ? RI.PLANS[plan.id].months * 30 : 1;
      return RI.pageHead({ eyebrow: 'حساب', eyebrowIcon: 'card', title: 'اشتراک و خریدها', desc: 'خرید تکی از ۴۶٬۰۰۰ تومان؛ اشتراک سه‌ماهه ماهی ۹۶٬۰۰۰، شش‌ماهه ماهی ۸۵٬۰۰۰ و سالانه ماهی ۷۵٬۰۰۰ تومان. خرید با It فعال است؛ شارژ آنلاین هنوز فعال نیست.' }) +
        '<section class="planhero ' + (plan ? 'is-sub' : '') + '"><div class="planhero__main"><span class="eyebrow">' + RI.icon(plan ? 'crown' : 'user') + 'پلن فعلی</span><h2>' + (plan ? 'اشتراک ' + RI.PLANS[plan.id].name : 'رایگان') + '</h2>' +
        (plan ? '<p>تا <b>' + RI.date(plan.end) + '</b> </p><div class="bar" style="max-width:360px"><i data-w="' + Math.round(Math.min(100, (1 - left / total) * 100)) + '" style="width:0"></i></div><small>' + RI.fa(left) + ' روز باقی‌مانده</small>' : '<p>یک رزومه و یک صفحهٔ لینک با قالب‌ها و فونت‌های استارتی برای دسترسی دوره‌ای به قالب‌های ویژه، اشتراک را بررسی کن</p>') + '</div>' +
        '<div class="planhero__side">' + (plan ? '<button type="button" class="btn btn--primary" data-sub="' + plan.id + '">' + RI.icon('refresh') + 'تمدید همین پلن</button><p>تمدید با خرید مجدد انجام می‌شود.</p>' : '<a class="btn btn--primary" href="#plans" data-scroll="plans">' + RI.icon('crown') + 'مشاهدهٔ اشتراک‌ها</a>') + '</div></section>' +
        '<section class="block" id="plans"><div class="block__head"><h2>مقایسهٔ پلن‌ها</h2><p>دوره را انتخاب کن؛ قالب‌های دارای دسترسی اشتراکی تا پایان دوره فعال‌اند. پرداخت بانکی غیرفعال است.</p></div>' +
        '<div class="plans">' + Object.keys(RI.PLANS).map((k) => { const p = RI.PLANS[k], cur = plan && plan.id === k, per = Math.round(p.price / p.months);
          return '<article class="plan' + (k === 'h' ? ' is-pop' : '') + (cur ? ' is-cur' : '') + '">' + (p.badge ? '<span class="plan__badge">' + p.badge + '</span>' : '') + '<h3>' + p.name + '</h3><div class="plan__price"><b class="num">' + RI.fa(p.price) + '</b><span>تومان</span></div><p class="plan__per">' + RI.fa(per) + ' تومان در ماه</p>' +
            '<ul class="plan__list"><li>' + RI.icon('check') + 'قالب‌های اشتراکی و ویژه</li><li>' + RI.icon('check') + 'رزومه و صفحهٔ لینک روی زیردامنه</li><li class="is-no">' + RI.icon('x') + 'ثبت دامنهٔ مستقل فعلاً ارائه نمی‌شود</li></ul>' +
            (cur ? '<button type="button" class="btn btn--soft" data-sub="' + k + '">' + RI.icon('refresh') + 'تمدید</button>' : '<button type="button" class="btn ' + (k === 'h' ? 'btn--primary' : 'btn--ice') + '" data-sub="' + k + '">' + (plan ? 'تغییر به این پلن' : 'انتخاب') + '</button>') + '</article>'; }).join('') + '</div></section>' +
        '<section class="block"><div class="block__head"><h2>امکانات و محدودیت‌ها</h2></div><div class="panel nopad"><div class="table-wrap"><table class="table"><thead><tr><th>امکان</th><th>رایگان</th><th>اشتراک</th></tr></thead><tbody>' +
        RI.PLAN_FEATURES.map((r) => '<tr><td>' + r[0] + '</td>' + [r[1], r[2]].map((v) => '<td>' + (v === true ? '<span class="yes">' + RI.icon('check') + '</span>' : v === false ? '<span class="no">' + RI.icon('x') + '</span>' : esc(v)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></div></section>' +
        '<section class="block"><div class="block__head"><h2>خریدهای یک‌باره با It</h2><p>قالب‌هایی که با خرید یک‌باره برای همیشه باز می‌مانند</p></div><div class="panel">' + (b.purchases.length ? '<ul class="rows">' + b.purchases.map((p) => '<li class="row"><span class="row__ico">' + RI.icon(p.kind === 'font' ? 'type' : p.kind === 'pal' ? 'palette' : 'layers') + '</span><div class="row__main"><div class="row__title">' + esc(p.name) + '</div><div class="row__sub">' + RI.date(p.at) + '</div></div><span class="num">' + RI.toman(p.price) + '</span></li>').join('') + '</ul>' : RI.empty({ icon: 'gift', title: 'هنوز خرید یک‌باره‌ای نداری', text: 'قالب‌های ویژه را می‌شود بدون اشتراک و با اعتبار It یک‌بار خرید', action: '<a class="btn btn--soft" href="/dashboard/themes/" data-go="themes">' + RI.icon('palette') + 'دیدن قالب‌ها' + '</a>' })) + '</div></section>' +
        '<section class="block"><div class="block__head"><h2>پرداخت‌های درگاه</h2></div><div class="panel nopad">' + (b.payments.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>شرح</th><th>تاریخ</th><th>مبلغ</th><th>وضعیت</th><th></th></tr></thead><tbody>' + b.payments.map((p, i) => '<tr><td>' + esc(p.title) + '</td><td>' + RI.date(p.at) + '</td><td class="num">' + RI.toman(p.amount) + ' <span class="chip chip--sample">نمونه</span></td><td><span class="chip chip--ok">موفق</span></td><td><button type="button" class="btn btn--ghost btn--sm" data-rc="' + i + '">' + RI.icon('receipt') + 'رسید</button></td></tr>').join('') + '</tbody></table></div>' : RI.empty({ icon: 'receipt', title: 'پرداختی ثبت نشده', text: 'تراکنش‌های خرید با It در تاریخچهٔ کیف پول ثبت می‌شوند؛ پرداخت درگاهی هنوز فعال نیست' })) + '</div></section>';
    },
    mount(root) {
      RI.delegate(root, 'click', '[data-retry]', () => { RI.state.ui.sim.netError = false; RI.rerender(); });
      RI.delegate(root, 'click', '[data-sub]', async (e, b) => { if (await RI.subscribeFlow(b.dataset.sub)) RI.rerender(); });
      RI.delegate(root, 'click', '[data-rc]', (e, b) => RI.receiptModal(RI.state.billing.payments[+b.dataset.rc]));
      RI.delegate(root, 'click', '[data-scroll]', (e, b) => { e.preventDefault(); RI.$('#plans', root).scrollIntoView({ behavior: RI.reduceMotion() ? 'auto' : 'smooth' }); });
    },
  });
})();
