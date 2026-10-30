/* اشتراک و خرید: وضعیت دورهٔ فعلی، مقایسهٔ امکانات، انتخاب دوره، خریدهای یک‌باره و پرداخت‌ها */
(() => {
 'use strict';
 const RI = window.RI, esc = RI.esc;
 const TABS = [['current', 'اشتراک من', 'crown'], ['plans', 'دوره‌ها', 'sparkle'], ['purchases', 'خریدها', 'gift'], ['payments', 'پرداخت‌ها', 'receipt']];
 const toman = units => RI.fa(Math.round(units * (RI.commerce?.rate || 2000) / 2000));
 const current = () => { const b = RI.state.billing, plan = b.plan && b.plan.end > Date.now() ? b.plan : null; return { plan, p: plan && RI.PLANS[plan.id] }; };

 function status() {
  const { plan, p } = current();
  if (!plan) return '<section class="nv-card nv-plan-status is-free"><div class="nv-plan-status__main"><span class="nv-ico">' + RI.icon('user') + '</span><div><p class="nv-head__eyebrow">وضعیت فعلی</p><h2>حساب رایگان</h2><p>رزومه، صفحهٔ لینک و انتشار روی زیردامنه با قالب‌های رایگان در دسترس است. با اشتراک، قالب‌های ویژه، حذف نشان و امکانات بیشتر باز می‌شود.</p></div></div><button class="btn btn--primary" type="button" data-select-plans>' + RI.icon('crown') + 'دیدن دوره‌ها</button></section>';
  const total = p.months * 30 * 86400000, left = Math.max(0, plan.end - Date.now()), days = Math.ceil(left / 86400000), pct = Math.max(3, Math.min(100, Math.round(left / total * 100)));
  return '<section class="nv-card nv-plan-status"><div class="nv-plan-status__main"><span class="nv-ico">' + RI.icon('crown') + '</span><div><p class="nv-head__eyebrow">اشتراک فعال</p><h2>' + esc(p.name) + ' · ' + esc(p.period) + '</h2><p>' + RI.fa(days) + ' روز باقی مانده؛ تا ' + RI.date(plan.end) + '. تمدید و برداشت خودکار نداریم؛ هر وقت خواستی خودت تمدید کن.</p><div class="nv-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="زمان باقی‌ماندهٔ دوره"><span style="width:' + pct + '%"></span></div></div></div><button class="btn btn--primary" type="button" data-sub="' + plan.id + '">' + RI.icon('refresh') + 'تمدید همین دوره</button></section>';
 }
 function compare() {
  const cell = v => typeof v === 'boolean' ? '<span class="nv-yes-no ' + (v ? 'is-yes' : 'is-no') + '">' + RI.icon(v ? 'check' : 'x') + '<span class="sr-only">' + (v ? 'دارد' : 'ندارد') + '</span></span>' : '<span class="nv-compare__val">' + esc(v) + '</span>';
  return '<section class="nv-card"><div class="nv-card__head"><div><h2>' + RI.icon('layers') + 'رایگان در برابر اشتراک</h2><p>امکانات هر سه دوره یکسان است؛ تفاوت فقط در مدت و مبلغ است.</p></div></div><div class="nv-compare" role="table" aria-label="مقایسهٔ امکانات"><div class="nv-compare__row nv-compare__row--head" role="row"><span role="columnheader">امکان</span><span role="columnheader">رایگان</span><span role="columnheader">اشتراک</span></div>' +
   RI.PLAN_FEATURES.map(r => '<div class="nv-compare__row" role="row"><span role="cell">' + esc(r[0]) + '</span><span role="cell">' + cell(r[1]) + '</span><span role="cell">' + cell(r[2]) + '</span></div>').join('') + '</div></section>';
 }
 function assets() {
  const n = RI.state.billing.purchases.length;
  return '<section class="nv-card nv-card--flat"><div class="nv-row"><span class="nv-ico nv-ico--blue">' + RI.icon('gift') + '</span><span class="nv-row__main"><span class="nv-row__title">' + (n ? RI.fa(n) + ' خرید یک‌باره' : 'هنوز خرید یک‌باره‌ای نداری') + '</span><span class="nv-row__meta">قالب، فونت یا ترکیب رنگی که می‌خری با پایان اشتراک از دست نمی‌رود.</span></span><a class="btn btn--soft btn--sm" href="' + RI.routeUrl('themes') + '" data-go="themes">ظاهر و قالب</a></div></section>';
 }
 function plans() {
  const all = Object.values(RI.PLANS), base = all[0].price / all[0].months, { plan } = current();
  return '<section class="nv-plans">' + all.map(p => {
   const perMonth = p.price / p.months, save = Math.round((1 - perMonth / base) * 100), best = p.id === 'y';
   return '<article class="nv-card nv-plan' + (best ? ' is-best' : '') + '">' + (best ? '<span class="nv-plan__badge">' + RI.icon('star') + 'به‌صرفه‌ترین</span>' : '') + '<h3>' + esc(p.name) + '</h3><p class="nv-plan__period">' + esc(p.period) + ' · ' + RI.fa(p.months) + ' ماه</p>' +
    '<div class="nv-plan__price"><b>' + toman(p.price) + '</b><span>تومان</span></div><p class="nv-plan__per">ماهی ' + toman(Math.round(perMonth)) + ' تومان · ' + RI.it(p.price) + (save > 0 ? ' · <span class="nv-chip nv-chip--ok">' + RI.fa(save) + '٪ ارزان‌تر</span>' : '') + '</p>' +
    '<ul class="nv-plan__list"><li>' + RI.icon('check') + 'قالب‌های اشتراکی و ویژه</li><li>' + RI.icon('check') + 'حذف نشان یا امضای اختصاصی</li><li>' + RI.icon('check') + 'رزومهٔ دوم و صفحه‌های لینک بیشتر</li><li>' + RI.icon('check') + 'بلوک متن و تصویر در لینک‌ها</li><li>' + RI.icon('check') + 'خروجی CSV آمار</li></ul>' +
    '<button class="btn ' + (best ? 'btn--primary' : 'btn--soft') + '" type="button" data-sub="' + p.id + '">' + (plan && plan.id === p.id ? 'تمدید ' : 'انتخاب ') + esc(p.name) + '</button></article>';
  }).join('') + '</section><div class="nv-note">' + RI.icon('info') + '<span>خرید از اعتبار It کیف پول انجام می‌شود. بعد از پایان دوره، محتوایت حذف نمی‌شود؛ فقط ظاهر عمومی به امکانات رایگان برمی‌گردد و صفحه‌های اضافه تا تمدید نمایش داده نمی‌شوند.</span></div>';
 }

 RI.registerPage('billing', {
  title: 'اشتراک و خرید',
  render() {
   return '<div class="nv nv-billing"><header class="nv-head"><div><p class="nv-head__eyebrow">' + RI.icon('crown') + 'حساب</p><h1 id="page-title" tabindex="-1">اشتراک و خرید</h1><p>دورهٔ فعلی، انتخاب دوره و تاریخچهٔ خرید و پرداخت.</p></div><div class="nv-head__actions"><a class="btn btn--soft" href="' + RI.routeUrl('wallet') + '" data-go="wallet">' + RI.icon('card') + 'کیف پول</a></div></header>' +
    '<div data-billing-status class="nv-status" aria-live="polite"></div><div class="nv-seg nv-billing__tabs" role="tablist" aria-label="بخش‌ها">' + TABS.map(([id, label, glyph]) => '<button type="button" role="tab" data-workspace-tab="' + id + '">' + RI.icon(glyph) + label + '</button>').join('') + '</div><div id="billing-body" class="nv-stack"></div></div>';
  },
  mount(root, ctx) {
   const initial = ctx.opts?.tab || new URLSearchParams(location.search).get('tab');
   let tab = TABS.some(t => t[0] === initial) ? initial : 'current', alive = true, historyOff = null, request = 0;
   const body = root.querySelector('#billing-body');
   function paint() {
    historyOff?.(); historyOff = null;
    root.querySelectorAll('[data-workspace-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.workspaceTab === tab)));
    if (['purchases', 'payments'].includes(tab)) { body.innerHTML = '<section class="nv-card nv-billing__history"></section>'; historyOff = RI.mountHistory(body.firstChild, tab === 'payments' ? 'bank' : 'purchases'); return; }
    body.innerHTML = tab === 'plans' ? plans() : status() + compare() + assets();
    body.querySelectorAll('[data-sub]').forEach(b => { if (RI.commerce?.paused.includes('subscription:' + b.dataset.sub)) { b.disabled = true; b.textContent = 'فروش موقتاً متوقف'; } });
   }
   const go = id => { tab = id; RI.setRouteTab(tab, 'current'); paint(); };
   RI.delegate(root, 'click', '[data-workspace-tab]', (e, b) => go(b.dataset.workspaceTab));
   RI.delegate(root, 'click', '[data-select-plans]', () => go('plans'));
   RI.delegate(root, 'click', '[data-sub]', async (e, b) => { if (b.disabled) return; b.disabled = true; try { if (await RI.subscribeFlow(b.dataset.sub)) go('current'); } finally { b.disabled = false; } });
   async function load() {
    const id = ++request, before = RI.state.billing, s = root.querySelector('[data-billing-status]');
    try { const data = await RI.dashboardRequest('billing'); if (!alive || id !== request) return; if (RI.state.billing === before) RI.state.billing = Object.assign(RI.seedBilling('free'), data); s.textContent = ''; if (['current', 'plans'].includes(tab)) paint(); }
    catch (e) { if (alive && id === request) s.innerHTML = '<span data-kind="error">اطلاعات اشتراک به‌روز نشد؛ آخرین اطلاعات نشان داده می‌شود. ' + esc(e.message) + '</span> <button class="btn btn--soft btn--sm" type="button" data-load-billing>تلاش دوباره</button>'; }
   }
   RI.delegate(root, 'click', '[data-load-billing]', load); paint(); load();
   return () => { alive = false; historyOff?.(); };
  },
 });
})();
