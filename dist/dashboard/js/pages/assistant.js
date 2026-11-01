/* تنظیمات فندق: the default model (grouped by maker, with what a typical message costs and the plan that opens it),
   the assistant's name, tone and answer length, how resume edits land, the Fandogh wallet (balance in toman and
   tokens, It top-up, recent charges), the three Fandogh plans («آرش»، «رستم»، «کوروش») and the person's own key. */
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc, F = RI.Fandogh;
  let data = null;
  const seg = (name, value, options) => '<div class="fset-seg" role="radiogroup">' + options.map(([v, t, icon]) => '<label><input type="radio" name="' + name + '" value="' + v + '"' + (value === v ? ' checked' : '') + '><span>' + (icon ? RI.icon(icon) : '') + t + '</span></label>').join('') + '</div>';
  const costBadge = m => '<em class="fset-cost' + (m.cost ? '' : ' is-free') + '">' + F.cost(m) + '</em>';

  function body() {
    if (!data) return '<div class="fset-wait"><span class="loading loading-dots"></span><p>در حال آوردن تنظیمات فندق…</p></div>';
    const s = data.settings, own = s.own, st = F.status || {}, provider = id => data.providers.find(p => p.id === id);
    let n = 0;
    const models = F.groups(data.models || []).map(([group, items]) => '<div class="fset-group"><h3>' + esc(group) + '</h3><div class="fset-models">' + items.map(m => { const off = !m.available || m.locked; return '<label class="fset-model' + (off ? ' is-off' : '') + (m.locked ? ' is-locked' : '') + '" style="--i:' + (n++) + '"><input type="radio" name="engine" value="' + m.id + '"' + (s.engine === m.id ? ' checked' : '') + (off ? ' disabled' : '') + '><span class="fset-model__body"><b>' + esc(m.label) + costBadge(m) + '</b><small>' + esc(m.note || '') + (m.million ? '<br><span class="fset-rate">' + F.rate(m) + '</span>' : '') + '</small><span class="fset-tags">' + (m.tags || []).map(t => '<i>' + esc(t) + '</i>').join('') + (m.locked ? '<i class="is-lock">' + RI.icon('lock') + 'اشتراک ' + esc(F.tier(m.tier)) + '</i>' : m.available ? '' : '<i class="is-off">الان در دسترس نیست</i>') + '</span></span></label>'; }).join('') + '</div></div>').join('');
    const w = st.wallet || { toman: 0, tokens: 0, ledger: [] }, b = st.billing || {};
    const kinds = { topup: ['plus', 'شارژ'], starter: ['gift', 'اعتبار اشتراک'], welcome: ['gift', 'هدیه'], usage: ['sparkle', 'پیام'] };
    const ledger = (w.ledger || []).map((x, i) => '<li class="fset-ledger__row is-' + x.kind + '" style="--i:' + i + '"><i>' + RI.icon((kinds[x.kind] || kinds.usage)[0]) + '</i><span><b>' + esc(x.label || (kinds[x.kind] || kinds.usage)[1]) + '</b><small>' + esc(new Date(x.at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })) + (x.kind === 'usage' && (x.input || x.output) ? ' · ' + RI.fa(x.input + x.output) + ' توکن مصرف' : '') + '</small></span><em class="' + (x.delta < 0 ? 'is-minus' : 'is-plus') + '"><bdi>' + (x.delta < 0 ? '−' : '+') + '</bdi> ' + F.money(Math.abs(x.toman)) + '<small>' + F.tokens(Math.abs(x.tokens)) + '</small></em></li>').join('');
    const topups = (b.topups || [5, 10, 25, 50, 100]).map((its, i) => '<button type="button" class="fset-topup" data-set-topup="' + its + '" style="--i:' + i + '"><b>' + RI.fa(its) + ' It</b><small>' + esc(RI.priceToman(its * RI.IT_RATE)) + ' · ' + F.tokens(Math.floor(its * RI.IT_RATE * (RI.commerce?.rate || 2000) / 2000 / (w.tokenToman || 0.03))) + '</small></button>').join('');
    const plans = (st.plans || []).map((p, i) => '<article class="fset-plan fset-plan--' + p.id + (st.plan === p.id ? ' is-current' : '') + '" style="--i:' + i + '"><span class="fset-plan__crest" aria-hidden="true">' + RI.icon(['zap', 'award', 'crown'][i] || 'crown') + '</span><h3>' + esc(p.name) + '<small>' + esc(p.title || '') + '</small></h3><p class="fset-plan__price"><b>' + esc(RI.priceToman(p.price)) + '</b><span>' + esc(p.period) + ' · ' + esc(RI.it(p.price)) + '</span></p><ul><li>' + RI.icon('check') + 'مدل‌های سطح «' + esc(p.name) + '» و پایین‌تر</li><li>' + RI.icon('gift') + F.money(p.credit) + ' اعتبار اولیه در کیف پول فندق (' + F.tokens(Math.floor(p.credit / (w.tokenToman || 0.03))) + ')</li><li>' + RI.icon('check') + esc(p.desc || '') + '</li></ul>' + (st.plan === p.id ? '<span class="fset-plan__badge">' + RI.icon('check') + 'اشتراک فعلی تو</span>' : '') + '<button type="button" class="btn ' + (i === 2 ? 'btn--primary' : 'btn--soft') + '" data-set-buy="' + p.id + '"' + (p.paused ? ' disabled' : '') + '>' + (p.paused ? 'فروش متوقف است' : st.plan === p.id ? 'تمدید یک ماه' : 'فعال کردن') + '</button></article>').join('');
    return '<form class="fset" data-fset novalidate>' +
      '<section class="fset-card fset-card--wide" style="--i:0"><header><h2>' + RI.icon('sparkle') + 'مدل پیش‌فرض</h2><p>فندق محلی رایگان است. بقیهٔ مدل‌ها از کیف پول فندق پرداخت می‌شوند: برچسب هر مدل قیمت تقریبی یک پیام معمولی (۱۰٬۰۰۰ توکن) است و زیرش قیمت هر ۱۰۰۰ توکن همان مدل. مدل‌های قفل‌دار با اشتراک فندق یا اشتراک رزومیت باز می‌شوند. در صفحهٔ گفت‌وگو هم برای هر پیام می‌توانی مدل را عوض کنی.</p></header>' + models + '</section>' +
      '<section class="fset-card" style="--i:1"><header><h2>' + RI.icon('user') + 'شخصیت دستیار</h2></header>' +
      '<label class="fset-field"><span>اسمی که صدایش می‌کنی</span><input class="input" name="name" maxlength="20" value="' + esc(s.name) + '" autocomplete="off"></label>' +
      '<div class="fset-field"><span>لحن</span>' + seg('tone', s.tone, [['friendly', 'صمیمی'], ['formal', 'رسمی']]) + '</div>' +
      '<div class="fset-field"><span>طول جواب</span>' + seg('answer', s.length, [['short', 'کوتاه'], ['detailed', 'مفصل']]) + '</div>' +
      '<div class="fset-field"><span>وقتی فندق رزومه را تغییر می‌دهد</span>' + seg('edits', F.editMode(), [['ask', 'اول نشانم بده', 'eye'], ['auto', 'خودش انجام بدهد', 'zap']]) + '</div></section>' +
      '<section class="fset-card fset-wallet" id="fset-wallet" style="--i:2"><header><h2>' + RI.icon('card') + 'کیف پول فندق</h2><p>اشتراک تو: <b>' + esc(st.planName || 'رایگان') + '</b>' + (st.until ? ' تا ' + esc(new Date(st.until).toLocaleDateString('fa-IR')) : '') + '</p></header>' +
      '<div class="fset-balance"><span class="fset-balance__orb" aria-hidden="true">' + RI.icon('card') + '</span><div><b data-count="' + Math.floor(w.toman) + '">' + F.money(w.toman) + '</b><span>' + F.tokens(w.tokens) + '</span></div></div>' +
      '<p class="fset-note">هر جواب به اندازهٔ توکن‌هایی که واقعاً مصرف کرده با قیمت همان مدل' + (b.markup ? ' (به‌اضافهٔ ' + RI.fa(b.markup) + '٪ هزینهٔ خدمات)' : '') + ' از این کیف پول کم می‌شود: هر ۱٬۰۰۰ توکن مصرفی ' + RI.fa(1000 * (1 + (b.markup || 0) / 100)) + ' توکن حساب می‌شود و هر توکن به قیمت همان مدل است. موجودی بالا به توکن GPT-6 Luna است. فندق محلی و کلید خودت رایگان‌اند.</p>' +
      '<div class="fset-topups" role="group" aria-label="شارژ با It">' + topups + '</div><p class="fset-status" data-set-topup-status role="status"></p>' +
      '<details class="fset-rates"><summary>' + RI.icon('chart') + 'هر ۱۰٬۰۰۰ تومان از هر مدل چند توکن می‌شود؟</summary><table><thead><tr><th>مدل</th><th>توکن</th><th>قیمت</th></tr></thead><tbody>' + (data.models || []).filter(m => m.million && m.cost).map(m => '<tr' + (m.locked ? ' class="is-locked"' : '') + '><td>' + esc(m.label) + '</td><td>' + F.tokens(F.buys(m, 10000)) + '</td><td>' + F.rate(m) + '</td></tr>').join('') + '</tbody></table></details>' +
      (ledger ? '<h3 class="fset-sub">آخرین تراکنش‌ها</h3><ol class="fset-ledger">' + ledger + '</ol>' : '') + '</section>' +
      '<section class="fset-card fset-card--wide fset-plans" id="fset-plans" style="--i:3"><header><h2>' + RI.icon('crown') + 'اشتراک‌های فندق</h2><p>اشتراک‌ها مدل‌ها را باز می‌کنند و هر کدام اعتبار اولیه‌ای هم به کیف پول فندق می‌دهند؛ استفاده از مدل‌ها از کیف پول فندق پرداخت می‌شود. قوی‌ترین مدل‌ها (Claude Fable و Opus، GPT-6 Astra و Sol، Gemini 4 Argon) فقط در «کوروش» و اشتراک رزومیت هستند. پرداخت از کیف پول It است.</p></header><div class="fset-plan-grid">' + plans + '</div></section>' +
      '<section class="fset-card fset-card--wide" style="--i:4"><header><h2>' + RI.icon('key') + 'هوش مصنوعی خودت <em class="fset-cost is-free">رایگان</em></h2><p>با کلید خودت، پیام‌ها از سهمیهٔ روزانه کم نمی‌شوند و دستیار از حساب خودت جواب می‌دهد؛ هزینهٔ سرویس با خودت است. کلید رمزگذاری‌شده نگه داشته می‌شود و دوباره نمایش داده نمی‌شود.</p></header>' +
      '<label class="fset-switch"><input type="checkbox" name="own"' + (own.enabled ? ' checked' : '') + '><span></span>از کلید خودم استفاده کن</label>' +
      '<div class="fset-own"' + (own.enabled ? '' : ' hidden') + '>' +
      '<label class="fset-field"><span>سرویس</span><select class="input" name="provider">' + data.providers.map(p => '<option value="' + p.id + '"' + (p.id === own.provider ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') + '</select></label>' +
      '<label class="fset-field"><span>مدل <small>(خالی یعنی پیش‌فرض)</small></span><input class="input" name="model" dir="ltr" maxlength="80" value="' + esc(own.model) + '" list="fset-models" placeholder="' + esc(provider(own.provider)?.model || '') + '"><datalist id="fset-models">' + (provider(own.provider)?.models || []).map(m => '<option value="' + esc(m) + '">').join('') + '</datalist></label>' +
      '<label class="fset-field" data-own-url' + (own.provider === 'custom' ? '' : ' hidden') + '><span>نشانی سرویس</span><input class="input" name="url" dir="ltr" maxlength="200" value="' + esc(own.url) + '" placeholder="https://"></label>' +
      '<label class="fset-field"><span>کلید API ' + (data.key.set ? '<small>ذخیره‌شده ' + esc(data.key.hint) + '</small>' : '') + '</span><input class="input" name="key" type="password" dir="ltr" autocomplete="off" placeholder="' + (data.key.set ? 'برای عوض کردن، کلید تازه را بنویس' : 'sk-…') + '"></label>' +
      '<div class="fset-row"><button type="button" class="btn btn--soft btn--sm" data-set-test>' + RI.icon('zap') + 'آزمون اتصال</button>' + (data.key.set ? '<button type="button" class="btn btn--ghost btn--sm" data-set-forget>' + RI.icon('trash') + 'حذف کلید</button>' : '') + '<p class="fset-status" data-set-test-status role="status"></p></div></div></section>' +
      '<div class="fset-save"><button type="submit" class="btn btn--primary">' + RI.icon('check') + 'ذخیرهٔ تنظیمات</button><a class="btn btn--soft" href="' + RI.routeUrl('fandogh') + '" data-go="fandogh">' + RI.icon('sparkle') + 'گفت‌وگو با فندق</a><p class="fset-status" data-set-status role="status"></p></div></form>';
  }

  RI.registerPage('assistant', {
    title: 'تنظیمات فندق',
    render() {
      return '<div class="nv fset-page"><header class="nv-head fset-head"><div><h1 id="page-title" tabindex="-1">تنظیمات فندق</h1><p>مدل، شخصیت و سهمیهٔ دستیار رزومه‌ات؛ همه برای همین حساب.</p></div><img class="fset-cat" src="/brand/fandogh/full.webp" alt="" width="518" height="900" decoding="async"></header><div data-fset-host>' + body() + '</div></div>';
    },
    mount(view) {
      const host = view.querySelector('[data-fset-host]');
      let alive = true;
      const paint = () => { if (!alive) return; host.innerHTML = body(); wire(); };
      Promise.all([RI.dashboardRequest('assistant/me'), F.refresh()]).then(([me]) => { data = me; paint(); if ((RI.routeOpts?.tab || new URL(location.href).searchParams.get('tab')) === 'plans' || (RI.routeOpts?.tab || new URL(location.href).searchParams.get('tab')) === 'wallet') host.querySelector((RI.routeOpts?.tab || new URL(location.href).searchParams.get('tab')) === 'wallet' ? '#fset-wallet' : '#fset-plans')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }).catch(e => { host.innerHTML = '<p class="fset-wait">' + esc(e.message || 'تنظیمات دریافت نشد') + '</p>'; });
      function wire() {
        const form = host.querySelector('[data-fset]'); if (!form) return;
        const field = n => form.elements[n], key = () => field('key').value.trim();
        const draft = () => ({ name: field('name').value.trim(), tone: field('tone').value, length: field('answer').value, engine: field('engine').value || 'local', own: { enabled: field('own').checked, provider: field('provider').value, model: field('model').value.trim(), url: field('url').value.trim() } });
        const note = (sel, text, kind) => { const el = form.querySelector(sel); el.textContent = text; el.dataset.kind = kind || ''; };
        form.addEventListener('change', e => {
          if (e.target.name === 'own') { form.querySelector('.fset-own').hidden = !e.target.checked; }
          if (e.target.name === 'provider') { const p = data.providers.find(x => x.id === e.target.value); form.querySelector('[data-own-url]').hidden = e.target.value !== 'custom'; field('model').placeholder = p?.model || ''; form.querySelector('#fset-models').innerHTML = (p?.models || []).map(m => '<option value="' + esc(m) + '">').join(''); }
          if (e.target.name === 'edits') F.setEditMode(e.target.value);
        });
        form.addEventListener('submit', async e => {
          e.preventDefault(); note('[data-set-status]', 'در حال ذخیره…');
          const d = draft(); if (d.own.enabled && (key() || data.key.set) && d.engine === 'local') d.engine = 'own';
          try { data = await RI.dashboardRequest('assistant/me', { settings: d, ...(key() ? { key: key() } : {}) }); await F.refresh(); paint(); RI.toast((data.settings.name || 'فندق') + ' تنظیماتت را یاد گرفت', { kind: 'success' }); RI.pet?.cat?.play('celebrate'); }
          catch (err) { note('[data-set-status]', err.message, 'error'); }
        });
        form.querySelector('[data-set-test]')?.addEventListener('click', async () => {
          note('[data-set-test-status]', 'در حال آزمون…');
          try { const r = await RI.dashboardRequest('assistant/me/test', { own: draft().own, ...(key() ? { key: key() } : {}) }); note('[data-set-test-status]', r.ok ? 'وصل شد: «' + r.reply + '»' : r.error, r.ok ? 'ok' : 'error'); }
          catch (err) { note('[data-set-test-status]', err.message, 'error'); }
        });
        form.querySelectorAll('[data-set-topup]').forEach(btn => btn.addEventListener('click', async () => {
          const its = Number(btn.dataset.setTopup); if (!confirm(RI.fa(its) + ' It از کیف پول اصلی برای شارژ کیف پول فندق برداشته شود؟')) return;
          form.querySelectorAll('[data-set-topup]').forEach(x => x.disabled = true); note('[data-set-topup-status]', 'در حال شارژ…');
          try { await F.topup(its); data = await RI.dashboardRequest('assistant/me'); paint(); host.querySelector('.fset-balance')?.classList.add('is-filled'); RI.toast('کیف پول فندق شارژ شد', { kind: 'success' }); RI.pet?.cat?.play('celebrate'); }
          catch (err) { note('[data-set-topup-status]', err.message, 'error'); form.querySelectorAll('[data-set-topup]').forEach(x => x.disabled = false); }
        }));
        form.querySelectorAll('[data-set-buy]').forEach(b => b.addEventListener('click', async () => {
          const p = (F.status?.plans || []).find(x => x.id === b.dataset.setBuy); if (!p) return;
          b.disabled = true;
          try { if (await RI.walletPurchase('assistant:' + p.id, 'اشتراک فندق «' + p.name + '»', p.price)) { await F.refresh(); data = await RI.dashboardRequest('assistant/me'); paint(); RI.toast('اشتراک «' + p.name + '» فعال شد', { kind: 'success' }); RI.pet?.cat?.play('celebrate'); } }
          finally { b.disabled = false; }
        }));
        form.querySelector('[data-set-forget]')?.addEventListener('click', async () => {
          try { const d = draft(); d.own.enabled = false; if (d.engine === 'own') d.engine = 'local'; data = await RI.dashboardRequest('assistant/me', { settings: d, key: null }); await F.refresh(); paint(); RI.toast('کلیدت حذف شد', { kind: 'info' }); }
          catch (err) { note('[data-set-test-status]', err.message, 'error'); }
        });
      }
      return () => { alive = false; };
    }
  });
})();
