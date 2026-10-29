// Wallet: balance with recent movement, pending bank payments, top-up with a live summary, and the full history
// (wallet ledger, bank payments, purchases) grouped by day. Credit is added only after the bank confirms.
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const PRESETS = [100000, 300000, 600000, 1000000], MIN = 2000, MAX = 100000000;
  const TABS = [['ledger', 'گردش کیف پول'], ['bank', 'پرداخت‌های بانکی'], ['purchases', 'خریدها']];
  const WAITING = ['creating', 'pending', 'verifying'];
  const rate = () => RI.wallet?.rate || RI.commerce?.rate || 2000;
  const itFor = toman => Math.floor(Number(toman) * 2000 / rate()) / 2000;
  const digits = v => String(v).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const ago = at => { const s = (Date.now() - at) / 1000; return s < 3600 ? RI.fa(Math.max(1, Math.round(s / 60))) + ' دقیقه پیش' : s < 86400 ? RI.fa(Math.round(s / 3600)) + ' ساعت پیش' : s < 2592000 ? RI.fa(Math.round(s / 86400)) + ' روز پیش' : RI.date(at); };
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + RI.fa(Math.abs(n)) + ' It';

  function spark(transactions) {
    const points = transactions.slice(0, 24).reverse().map(t => t.balance);
    if (points.length < 2) return '';
    const max = Math.max(...points), min = Math.min(...points), span = max - min || 1, w = 220, h = 56;
    const xy = points.map((v, i) => [Math.round(i / (points.length - 1) * w), Math.round(h - 6 - (v - min) / span * (h - 12))]);
    const line = xy.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ');
    return '<svg class="wl-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path class="wl-spark__area" d="' + line + ' L' + w + ' ' + h + ' L0 ' + h + 'Z"/><path class="wl-spark__line" d="' + line + '"/></svg>';
  }

  RI.registerPage('wallet', {
    title: 'کیف پول It',
    render() {
      return RI.pageHead({ eyebrow: 'حساب', eyebrowIcon: 'card', title: 'کیف پول It', desc: 'اعتبار It برای خرید اشتراک، قالب و فونت است؛ شارژ با درگاه بانکی انجام می‌شود و همهٔ تراکنش‌ها این‌جا ثبت می‌شوند.', actions: '<a class="btn btn--soft btn--sm" data-go="billing" href="/dashboard/billing/">' + RI.icon('crown') + 'اشتراک و خریدها</a>' }) +
        '<div class="wl-top"><section class="wl-balance" id="wallet-balance" aria-live="polite">' + RI.sectionLoading('در حال دریافت موجودی…') + '</section><section class="wl-stats" id="wallet-stats" aria-label="خلاصهٔ تراکنش‌های اخیر"></section></div>' +
        '<div id="wallet-pending" aria-live="polite"></div>' +
        '<section class="wl-topup" aria-labelledby="topup-title"><div class="wl-topup__head"><div><h2 id="topup-title">افزایش اعتبار</h2><p>مبلغ را انتخاب کن؛ پیش‌فاکتور را می‌بینی و بعد در صفحهٔ بانک پرداخت می‌کنی.</p></div><ol class="wl-flow" aria-label="مراحل شارژ"><li class="is-on"><span>۱</span>مبلغ</li><li><span>۲</span>پیش‌فاکتور</li><li><span>۳</span>درگاه بانک</li></ol></div><form id="wallet-payment" novalidate><div class="wl-topup__grid"><div class="wl-amounts"><div class="wl-presets" role="group" aria-label="مبلغ‌های پیشنهادی"></div><div class="field wl-custom"><label class="field__label" for="wallet-topup">مبلغ دلخواه (تومان)</label><input class="input ltr" id="wallet-topup" type="number" inputmode="numeric" min="' + MIN + '" max="' + MAX + '" step="2000" required><p class="field__hint" id="wallet-amount-words">حداقل ' + RI.toman(MIN) + ' و مضربی از ۲٬۰۰۰ تومان</p></div></div><aside class="wl-summary" aria-labelledby="summary-title"><h3 id="summary-title">خلاصهٔ شارژ</h3><dl><div><dt>مبلغ پرداخت</dt><dd id="wallet-sum-toman">—</dd></div><div class="wl-summary__get"><dt>دریافت می‌کنی</dt><dd id="wallet-conversion" role="status">—</dd></div><div><dt>موجودی پس از شارژ</dt><dd id="wallet-after">—</dd></div></dl><p class="wl-gateways" id="gateway-note" role="status">در حال دریافت وضعیت درگاه‌ها…</p><p class="field__error" id="payment-error" role="alert" hidden></p><button class="btn btn--primary wl-pay" id="wallet-pay" type="submit">' + RI.icon('receipt') + 'مشاهدهٔ پیش‌فاکتور و پرداخت</button></aside></div></form>' +
        '<ul class="wl-trust"><li>' + RI.icon('check') + 'اعتبار فقط بعد از تأیید بانک اضافه می‌شود.</li><li>' + RI.icon('lock') + 'اطلاعات کارت را فقط در صفحهٔ بانک وارد می‌کنی.</li><li>' + RI.icon('refresh') + 'کلیک دوباره روی پرداخت، دوبار شارژ یا کسر نمی‌کند.</li></ul></section>' +
        '<section class="wl-activity" aria-labelledby="activity-title"><div class="wl-activity__head"><h2 id="activity-title">گردش و سوابق</h2></div>' + RI.tabsHtml(TABS, 'ledger') + '<div id="wallet-body"></div></section>' +
        '<section class="wl-help" aria-labelledby="help-title"><h2 id="help-title">پرسش‌های رایج</h2>' +
        '<details><summary>It چیست و کجا استفاده می‌شود؟</summary><p>It اعتبار داخلی ResumeIt برای خرید اشتراک، قالب و فونت است. ارز دیجیتال یا وسیلهٔ سرمایه‌گذاری نیست و انتقال به کاربر دیگر یا برداشت نقدی ندارد.</p></details>' +
        '<details><summary>مبلغ از کارتم کم شد ولی اعتبار نیامد؟</summary><p>وضعیت را در «پرداخت‌های بانکی» ببین؛ پرداخت‌هایی که هنوز تأیید نشده‌اند خودکار دوباره بررسی می‌شوند. اگر مشکل ماند، شمارهٔ فاکتور یا کد رهگیری را برای <a href="/dashboard/support/" data-go="support">پشتیبانی</a> بفرست.</p></details>' +
        '<details><summary>لغو یا بازگشت اعتبار ممکن است؟</summary><p>درخواست لغو یا بازگشت اعتبار از مسیر پشتیبانی بررسی می‌شود. جزئیات در <a href="/terms/#wallet">شرایط استفاده</a> آمده است.</p></details></section>';
    },
    mount(root) {
      const params = new URLSearchParams(location.search), initial = params.get('tab');
      let tab = TABS.some(([id]) => id === initial) ? initial : params.has('payment') ? 'bank' : 'ledger';
      let alive = true, paying = false, amount = '100000', requestId = crypto.randomUUID(), historyOff = null;
      const $ = s => root.querySelector(s), input = $('#wallet-topup');
      input.value = amount;

      function paintPresets() {
        $('.wl-presets').innerHTML = PRESETS.map(v => '<button type="button" class="wl-preset" data-amount="' + v + '" aria-pressed="' + (String(v) === amount) + '"><b>' + RI.toman(v) + '</b><span>' + RI.fa(itFor(v)) + ' It</span></button>').join('');
      }
      function paintSummary() {
        const valid = input.validity.valid && Number(amount) >= MIN, it = valid ? itFor(amount) : 0;
        $('#wallet-sum-toman').textContent = valid ? RI.toman(Number(amount)) : '—';
        $('#wallet-conversion').textContent = valid ? RI.fa(it) + ' It به کیف پولت اضافه می‌شود' : 'مبلغ را مضربی از ۲٬۰۰۰ تومان و حداقل ' + RI.toman(MIN) + ' وارد کن';
        $('#wallet-after').textContent = valid && RI.wallet ? RI.fa(RI.wallet.balance + it) + ' It' : '—';
        $('#wallet-amount-words').textContent = valid ? RI.toman(Number(amount)) + ' · هر It برابر ' + RI.toman(rate()) : 'حداقل ' + RI.toman(MIN) + ' و مضربی از ۲٬۰۰۰ تومان';
        root.querySelectorAll('[data-amount]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.amount === amount)));
      }

      async function balance() {
        const host = $('#wallet-balance');
        try {
          const wallet = await RI.dashboardRequest('wallet'); if (!alive) return; RI.wallet = wallet;
          const tx = wallet.transactions || [], month = Date.now() - 30 * 86400000, recent = tx.filter(t => t.at >= month);
          const into = recent.filter(t => t.amount > 0).reduce((n, t) => n + t.amount, 0), out = recent.filter(t => t.amount < 0).reduce((n, t) => n - t.amount, 0), last = tx[0];
          host.innerHTML = '<div class="wl-balance__main"><img src="/brand/it-cat-coin-v1.png" width="92" height="92" alt="سکهٔ It با نشان گربهٔ طلایی"><div><small>اعتبار قابل استفاده</small><h2 class="ltr-inline">' + RI.fa(wallet.balance) + ' It</h2><p>معادل ' + RI.toman(wallet.balance * wallet.rate) + '</p></div></div>' + spark(tx) +
            '<div class="wl-balance__foot"><span class="chip">' + RI.icon('info') + 'هر It = ' + RI.toman(wallet.rate) + '</span><button type="button" class="btn btn--primary btn--sm" data-focus-topup>' + RI.icon('plus') + 'افزایش اعتبار</button></div>';
          $('#wallet-stats').innerHTML = [['down', 'واریز در ۳۰ روز اخیر', into ? '+' + RI.fa(into) + ' It' : '—', 'in'], ['up', 'خرج در ۳۰ روز اخیر', out ? '−' + RI.fa(out) + ' It' : '—', 'out'], ['clock', 'آخرین تراکنش', last ? esc(last.label) : 'هنوز تراکنشی نیست', 'last', last ? ago(last.at) : '']].map(([ico, label, value, kind, sub]) => '<div class="wl-stat wl-stat--' + kind + '"><span class="wl-stat__ico">' + RI.icon(ico) + '</span><div><small>' + label + '</small><b>' + value + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div></div>').join('') + (tx.length >= 50 ? '<p class="wl-stats__note">بر اساس ۵۰ تراکنش اخیر</p>' : '');
          paintSummary();
        } catch (e) { if (alive) host.innerHTML = '<p role="alert">' + esc(e.message) + '</p><button class="btn btn--soft btn--sm" type="button" data-balance-retry>' + RI.icon('refresh') + 'تلاش دوباره</button>'; }
      }

      async function payments() {
        try {
          const config = await RI.paymentRequest('options'); if (!alive) return;
          const ready = config.gateways.filter(g => g.enabled);
          $('#gateway-note').innerHTML = ready.length ? RI.icon('shield') + '<span>درگاه‌های آماده: ' + ready.map(g => '<b>' + esc(g.name) + '</b>').join('، ') + '؛ انتخاب در پیش‌فاکتور.</span>' : RI.icon('info') + '<span>درگاه فعالی تنظیم نشده؛ پیش‌فاکتور قابل مشاهده است ولی پرداخت بانکی فعلاً انجام نمی‌شود.</span>';
          $('#gateway-note').classList.toggle('is-off', !ready.length);
          const waiting = (config.orders || []).filter(o => WAITING.includes(o.status));
          $('#wallet-pending').innerHTML = waiting.length ? '<section class="wl-pending" aria-label="پرداخت‌های در انتظار">' + RI.icon('clock') + '<div><b>' + RI.fa(waiting.length) + ' پرداخت بانکی هنوز تأیید نشده است</b><p>وضعیت خودکار بررسی می‌شود؛ تا تأیید بانک، اعتباری اضافه یا کسر نمی‌شود.</p><ul>' + waiting.slice(0, 3).map(o => '<li><a href="/payments/result?id=' + esc(o.id) + '">' + RI.toman(o.amount) + ' · ' + esc(RI.paymentStatuses[o.status] || o.status) + ' · ' + esc(ago(o.at)) + '</a></li>').join('') + '</ul></div></section>' : '';
        } catch { if (alive) $('#gateway-note').textContent = 'وضعیت درگاه دریافت نشد؛ پیش از پرداخت دوباره، «پرداخت‌های بانکی» را بررسی کن.'; }
      }

      // History: same API as before, drawn as day groups with signed amounts and bank status badges.
      function history(type) {
        const host = $('#wallet-body'), filter = { q: '', status: '', from: '', to: '' }, listeners = new AbortController();
        let page = 1, serial = 0, timer, live = true;
        host.innerHTML = '<div class="wl-filters">' + RI.historyFilters('', '', type === 'bank' ? Object.entries(RI.paymentStatuses) : type === 'ledger' ? [['in', 'واریز اعتبار'], ['out', 'خرید و برداشت']] : []) + '</div><div class="wl-history" data-history-results aria-live="polite"></div>';
        const results = host.querySelector('[data-history-results]');
        const row = r => {
          if (type === 'bank') return '<article class="history-row wl-row wl-row--bank"><span class="wl-row__ico">' + RI.icon('card') + '</span><div class="wl-row__text"><b>' + RI.toman(r.amount) + ' · ' + RI.fa(r.it) + ' It</b><p>' + esc(r.provider === 'sep' ? 'سپ' : 'زیبال') + ' · ' + RI.date(r.at, { hour: '2-digit', minute: '2-digit' }) + '</p><small class="ltr-inline">' + esc(r.rrn || r.id) + '</small></div><span class="wl-badge wl-badge--' + esc(r.status) + '">' + esc(RI.paymentStatuses[r.status] || r.status) + '</span><a class="btn btn--soft btn--sm" href="/payments/result?id=' + esc(r.id) + '">فاکتور و وضعیت</a></article>';
          const value = type === 'purchases' ? -Math.abs(r.price / 2000) : r.amount;
          return '<article class="history-row wl-row wl-row--' + (value > 0 ? 'in' : 'out') + '"><span class="wl-row__ico">' + RI.icon(type === 'purchases' ? 'gift' : value > 0 ? 'down' : 'up') + '</span><div class="wl-row__text"><b>' + esc(r.label) + '</b><p>' + RI.date(r.at, { hour: '2-digit', minute: '2-digit' }) + (type === 'ledger' ? ' · موجودی پس از آن: ' + RI.fa(r.balance) + ' It' : '') + '</p><small class="ltr-inline">' + esc(r.id) + '</small></div><strong class="wl-amount ltr-inline">' + signed(value) + '</strong></article>';
        };
        async function load() {
          const id = ++serial; results.setAttribute('aria-busy', 'true'); if (!results.children.length) results.innerHTML = RI.sectionLoading('در حال دریافت تاریخچه…');
          try {
            const data = await RI.dashboardRequest('history?' + new URLSearchParams({ type, page, ...filter })); if (!live || id !== serial) return;
            if (!data.rows.length) { results.innerHTML = RI.empty({ icon: 'receipt', title: filter.q || filter.status || filter.from || filter.to ? 'نتیجه‌ای برای این فیلتر نیست' : type === 'bank' ? 'هنوز پرداخت بانکی ثبت نشده' : type === 'purchases' ? 'هنوز خریدی ثبت نشده' : 'هنوز تراکنشی ثبت نشده' }); return; }
            const groups = []; for (const r of data.rows) { const day = RI.date(r.at); if (groups.at(-1)?.day !== day) groups.push({ day, rows: [] }); groups.at(-1).rows.push(r); }
            results.innerHTML = groups.map(g => '<div class="wl-day"><h3>' + esc(g.day) + '</h3>' + g.rows.map(row).join('') + '</div>').join('') + RI.pagination(page, data.total);
          } catch (e) { if (live && id === serial) results.innerHTML = '<p role="alert">' + esc(e.message) + '</p><button class="btn btn--soft btn--sm" type="button" data-history-retry>' + RI.icon('refresh') + 'تلاش دوباره</button>'; }
          finally { if (live && id === serial) results.setAttribute('aria-busy', 'false'); }
        }
        const update = e => { const key = { 'history-q': 'q', 'history-status': 'status', 'history-from': 'from', 'history-to': 'to' }[e.target.id]; if (!key) return; filter[key] = e.target.value; page = 1; clearTimeout(timer); timer = setTimeout(load, key === 'q' ? 300 : 0); };
        host.addEventListener('input', update, { signal: listeners.signal }); host.addEventListener('change', update, { signal: listeners.signal });
        host.addEventListener('click', e => { const b = e.target.closest('[data-page],[data-history-retry]'); if (!b || !host.contains(b) || b.disabled) return; if (b.dataset.page) page = Number(b.dataset.page); load(); }, { signal: listeners.signal });
        load(); return () => { live = false; listeners.abort(); clearTimeout(timer); };
      }
      function paintTab() { historyOff?.(); root.querySelectorAll('[data-workspace-tab]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.workspaceTab === tab))); historyOff = history(tab); }

      RI.delegate(root, 'click', '[data-workspace-tab]', (e, b) => { tab = b.dataset.workspaceTab; RI.setRouteTab(tab, 'ledger'); paintTab(); });
      RI.delegate(root, 'click', '[data-balance-retry]', balance);
      RI.delegate(root, 'click', '[data-focus-topup]', () => { $('.wl-topup').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); input.focus({ preventScroll: true }); });
      RI.delegate(root, 'click', '[data-amount]', (e, b) => { input.value = b.dataset.amount; input.dispatchEvent(new Event('input', { bubbles: true })); });
      root.addEventListener('input', e => {
        if (e.target !== input) return;
        const clean = digits(input.value); if (clean !== input.value) input.value = clean;
        amount = input.value; requestId = crypto.randomUUID(); paintSummary();
      });
      $('#wallet-payment').addEventListener('submit', async e => {
        e.preventDefault(); if (paying) return;
        const error = $('#payment-error'), button = $('#wallet-pay');
        if (!input.reportValidity() || Number(amount) < MIN) { error.textContent = 'مبلغ را مضربی از ۲٬۰۰۰ تومان و حداقل ' + RI.toman(MIN) + ' وارد کن.'; error.hidden = false; input.focus(); return; }
        paying = true; button.disabled = true; error.hidden = true; root.querySelectorAll('.wl-flow li')[1]?.classList.add('is-on');
        try { const result = await RI.paymentRequest('invoices', { amount: Number(amount), requestId }); if (alive) location.assign(result.url); }
        catch (ex) { if (alive) { error.textContent = ex.message; error.hidden = false; button.disabled = false; root.querySelectorAll('.wl-flow li')[1]?.classList.remove('is-on'); } paying = false; }
      });
      paintPresets(); paintSummary(); balance(); payments(); paintTab();
      return () => { alive = false; historyOff?.(); };
    },
  });
})();
