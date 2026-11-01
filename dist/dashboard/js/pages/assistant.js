/* تنظیمات فندق: the default model (grouped by maker, with what a typical message costs and the plan that opens it),
   the assistant's name, tone and answer length, how resume edits land, the Fandogh wallet (balance in toman and
   tokens, It top-up, recent charges), the three Fandogh plans («آرش»، «رستم»، «کوروش») and the person's own key. */
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc, F = RI.Fandogh;
  let data = null, tab = null, maker = null;
  const TABS = [['model', 'مدل‌ها', 'sparkle'], ['persona', 'شخصیت و رفتار', 'user'], ['wallet', 'کیف پول', 'card'], ['plans', 'اشتراک‌ها', 'crown'], ['key', 'کلید خودت', 'key']];
  const SAVES = { model: 1, persona: 1, key: 1 };
  const seg = (name, value, options) => '<div class="fset-seg" role="radiogroup">' + options.map(([v, t, icon]) => '<label><input type="radio" name="' + name + '" value="' + v + '"' + (value === v ? ' checked' : '') + '><span>' + (icon ? RI.icon(icon) : '') + t + '</span></label>').join('') + '</div>';
  const costBadge = m => '<em class="fset-cost' + (m.cost ? '' : ' is-free') + '">' + F.cost(m) + '</em>';

  function body() {
    if (!data) return '<div class="fset-wait"><span class="loading loading-dots"></span><p>در حال آوردن تنظیمات فندق…</p></div>';
    const s = data.settings, own = s.own, st = F.status || {}, provider = id => data.providers.find(p => p.id === id);
    if (!tab) { const q = RI.routeOpts?.tab || new URL(location.href).searchParams.get('tab'); tab = TABS.some(t => t[0] === q) ? q : 'model'; }
    const groups = F.groups(data.models || []), mine = groups.find(([, items]) => items.some(m => m.id === s.engine));
    if (!maker || !groups.some(([g]) => g === maker)) maker = (mine || groups[0] || [''])[0];
    const makers = '<div class="fset-makers" role="tablist" aria-label="سازندهٔ مدل"><i class="fset-makers__ink" aria-hidden="true"></i>' + groups.map(([group, items]) => '<button type="button" role="tab" data-fset-maker="' + esc(group) + '" aria-selected="' + (group === maker) + '">' + esc(group) + '<small>' + RI.fa(items.length) + '</small>' + (items.some(m => m.id === s.engine) ? '<i class="fset-makers__dot" title="مدل فعلی"></i>' : '') + '</button>').join('') + '</div>';
    const models = groups.map(([group, items]) => '<div class="fset-group" data-fset-group="' + esc(group) + '"' + (group === maker ? '' : ' hidden') + '><h3>' + esc(group) + '</h3><div class="fset-models">' + items.map((m, k) => { const off = !m.available || m.locked; return '<label class="fset-model' + (off ? ' is-off' : '') + (m.locked ? ' is-locked' : '') + '" style="--i:' + k + '"><input type="radio" name="engine" value="' + m.id + '"' + (s.engine === m.id ? ' checked' : '') + (off ? ' disabled' : '') + '><span class="fset-model__body"><b>' + esc(m.label) + costBadge(m) + '</b><small>' + esc(m.note || '') + (m.million ? '<br><span class="fset-rate">' + F.rate(m) + '</span>' : '') + '</small><span class="fset-tags">' + (m.tags || []).map(t => '<i>' + esc(t) + '</i>').join('') + (m.locked ? '<i class="is-lock">' + RI.icon('lock') + 'اشتراک ' + esc(F.tier(m.tier)) + '</i>' : m.available ? '' : '<i class="is-off">الان در دسترس نیست</i>') + '</span></span></label>'; }).join('') + '</div></div>').join('');
    const w = st.wallet || { toman: 0, tokens: 0, ledger: [] }, b = st.billing || {};
    const kinds = { topup: ['plus', 'شارژ'], starter: ['gift', 'اعتبار اشتراک'], welcome: ['gift', 'هدیه'], usage: ['sparkle', 'پیام'] };
    // Spending is shown per day (bars scaled to the busiest day); credits stay as single rows.
    const daily = w.daily || [], peak = Math.max(1, ...daily.map(d => Math.abs(d.toman)));
    const days = daily.map((d, i) => '<li class="fset-day" style="--i:' + i + ';--w:' + (Math.abs(d.toman) / peak).toFixed(3) + '"><span class="fset-day__date"><b>' + esc(new Date(d.at + 43200000).toLocaleDateString('fa-IR', { weekday: 'long' })) + '</b><small>' + esc(new Date(d.at + 43200000).toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' })) + '</small></span><span class="fset-day__bar"><i></i></span><em><bdi>−</bdi> ' + F.money(Math.abs(d.toman)) + '<small>' + RI.fa(d.count) + ' پیام · ' + F.tokens(Math.abs(d.tokens)) + '</small></em></li>').join('');
    const ledger = (w.ledger || []).map((x, i) => '<li class="fset-ledger__row is-' + x.kind + '" style="--i:' + i + '"><i>' + RI.icon((kinds[x.kind] || kinds.usage)[0]) + '</i><span><b>' + esc(x.label || (kinds[x.kind] || kinds.usage)[1]) + '</b><small>' + esc(new Date(x.at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })) + (x.kind === 'usage' && (x.input || x.output) ? ' · ' + RI.fa(x.input + x.output) + ' توکن مصرف' : '') + '</small></span><em class="' + (x.delta < 0 ? 'is-minus' : 'is-plus') + '"><bdi>' + (x.delta < 0 ? '−' : '+') + '</bdi> ' + F.money(Math.abs(x.toman)) + '<small>' + F.tokens(Math.abs(x.tokens)) + '</small></em></li>').join('');
    const topups = (b.topups || [5, 10, 25, 50, 100]).map((its, i) => '<button type="button" class="fset-topup" data-set-topup="' + its + '" style="--i:' + i + '"><b>' + RI.fa(its) + ' It</b><small>' + esc(RI.priceToman(its * RI.IT_RATE)) + ' · ' + F.tokens(Math.floor(its * RI.IT_RATE * (RI.commerce?.rate || 2000) / 2000 / (w.tokenToman || 0.03))) + '</small></button>').join('');
    const plans = (st.plans || []).map((p, i) => '<article class="fset-plan fset-plan--' + p.id + (st.plan === p.id ? ' is-current' : '') + '" style="--i:' + i + '"><span class="fset-plan__crest" aria-hidden="true">' + RI.icon(['zap', 'award', 'crown'][i] || 'crown') + '</span><h3>' + esc(p.name) + '<small>' + esc(p.title || '') + '</small></h3><p class="fset-plan__price"><b>' + esc(RI.priceToman(p.price)) + '</b><span>' + esc(p.period) + ' · ' + esc(RI.it(p.price)) + '</span></p><ul><li>' + RI.icon('check') + 'مدل‌های سطح «' + esc(p.name) + '» و پایین‌تر</li><li>' + RI.icon('gift') + F.money(p.credit) + ' اعتبار اولیه در کیف پول فندق (' + F.tokens(Math.floor(p.credit / (w.tokenToman || 0.03))) + ')</li><li>' + RI.icon('check') + esc(p.desc || '') + '</li></ul>' + (st.plan === p.id ? '<span class="fset-plan__badge">' + RI.icon('check') + 'اشتراک فعلی تو</span>' : '') + '<button type="button" class="btn ' + (i === 2 ? 'btn--primary' : 'btn--soft') + '" data-set-buy="' + p.id + '"' + (p.paused ? ' disabled' : '') + '>' + (p.paused ? 'فروش متوقف است' : st.plan === p.id ? 'تمدید یک ماه' : 'فعال کردن') + '</button></article>').join('');
    const engine = (data.models || []).find(m => m.id === s.engine), hints = { model: engine ? engine.label : 'فندق محلی', persona: (s.name || 'فندق') + ' · ' + (s.tone === 'formal' ? 'رسمی' : 'صمیمی'), wallet: F.money(w.toman), plans: st.planName || 'رایگان', key: own.enabled ? 'روشن' : 'خاموش' };
    const open = id => '<section class="fset-panel" role="tabpanel" id="fset-panel-' + id + '" aria-labelledby="fset-tab-' + id + '" data-fset-panel="' + id + '"' + (id === tab ? '' : ' hidden') + '>', close = '</section>';
    const tabs = '<nav class="fset-tabs" role="tablist" aria-label="بخش‌های تنظیمات فندق" aria-orientation="vertical"><i class="fset-tabs__ink" aria-hidden="true"></i>' + TABS.map(([id, label, icon], i) => '<button type="button" role="tab" id="fset-tab-' + id + '" aria-controls="fset-panel-' + id + '" data-fset-tab="' + id + '" aria-selected="' + (id === tab) + '" tabindex="' + (id === tab ? 0 : -1) + '" style="--i:' + i + '"><span class="fset-tabs__ico">' + RI.icon(icon) + '</span><span class="fset-tabs__txt"><b>' + label + '</b><small>' + esc(hints[id]) + '</small></span></button>').join('') + '</nav>';
    return '<form class="fset" data-fset data-tab="' + tab + '" novalidate>' + tabs + '<div class="fset-panels">' +
      open('model') + '<section class="fset-card fset-card--wide" style="--i:0"><header><h2>' + RI.icon('sparkle') + 'مدل پیش‌فرض</h2><p>فندق محلی رایگان است. بقیهٔ مدل‌ها از کیف پول فندق پرداخت می‌شوند: برچسب هر مدل قیمت تقریبی یک پیام معمولی (۱۰٬۰۰۰ توکن) است و زیرش قیمت هر ۱۰۰۰ توکن همان مدل. مدل‌های قفل‌دار با اشتراک فندق یا اشتراک رزومیت باز می‌شوند. در صفحهٔ گفت‌وگو هم برای هر پیام می‌توانی مدل را عوض کنی.</p></header>' + makers + models + '</section>' + close +
      open('persona') + '<section class="fset-card fset-card--wide fset-persona" style="--i:0"><header><h2>' + RI.icon('user') + 'شخصیت دستیار</h2><p>اسم، لحن و طول جواب‌های فندق و این‌که تغییرهای رزومه را چطور اعمال کند.</p></header>' +
      '<label class="fset-field"><span>اسمی که صدایش می‌کنی</span><input class="input" name="name" maxlength="20" value="' + esc(s.name) + '" autocomplete="off"></label>' +
      '<div class="fset-field"><span>لحن</span>' + seg('tone', s.tone, [['friendly', 'صمیمی'], ['formal', 'رسمی']]) + '</div>' +
      '<div class="fset-field"><span>طول جواب</span>' + seg('answer', s.length, [['short', 'کوتاه'], ['detailed', 'مفصل']]) + '</div>' +
      '<div class="fset-field"><span>وقتی فندق رزومه را تغییر می‌دهد</span>' + seg('edits', F.editMode(), [['ask', 'اول نشانم بده', 'eye'], ['auto', 'خودش انجام بدهد', 'zap']]) + '</div>' +
      '<label class="fset-switch"><input type="checkbox" name="suggest"' + (s.suggest !== false ? ' checked' : '') + '><span></span>پیشنهادهای بعدی بالای جعبهٔ پیام</label></section>' + close +
      open('wallet') + '<section class="fset-card fset-wallet" id="fset-wallet" style="--i:0"><header><h2>' + RI.icon('card') + 'کیف پول فندق</h2><p>اشتراک تو: <b>' + esc(st.planName || 'رایگان') + '</b>' + (st.until ? ' تا ' + esc(new Date(st.until).toLocaleDateString('fa-IR')) : '') + '</p></header>' +
      '<div class="fset-balance"><span class="fset-balance__orb" aria-hidden="true">' + RI.icon('card') + '</span><div><b data-count="' + Math.floor(w.toman) + '">' + F.money(w.toman) + '</b><span>' + F.tokens(w.tokens) + '</span></div></div>' +
      '<p class="fset-note">هر جواب به اندازهٔ توکن‌هایی که واقعاً مصرف کرده با قیمت همان مدل' + (b.markup ? ' (به‌اضافهٔ ' + RI.fa(b.markup) + '٪ هزینهٔ خدمات)' : '') + ' از این کیف پول کم می‌شود: هر ۱٬۰۰۰ توکن مصرفی ' + RI.fa(1000 * (1 + (b.markup || 0) / 100)) + ' توکن حساب می‌شود و هر توکن به قیمت همان مدل است. موجودی بالا به توکن GPT-6 Luna است. فندق محلی و کلید خودت رایگان‌اند.</p>' +
      '<div class="fset-topups" role="group" aria-label="شارژ با It">' + topups + '</div><p class="fset-status" data-set-topup-status role="status"></p>' +
      '</section><section class="fset-card fset-history" style="--i:1"><header><h2>' + RI.icon('chart') + 'مصرف و شارژها</h2><p>مصرف هر روز جمع زده می‌شود؛ شارژها، هدیه‌ها و اعتبار اشتراک جدا ثبت می‌شوند.</p></header><details class="fset-rates"><summary>' + RI.icon('chart') + 'هر ۱۰٬۰۰۰ تومان از هر مدل چند توکن می‌شود؟</summary><table><thead><tr><th>مدل</th><th>توکن</th><th>قیمت</th></tr></thead><tbody>' + (data.models || []).filter(m => m.million && m.cost).map(m => '<tr' + (m.locked ? ' class="is-locked"' : '') + '><td>' + esc(m.label) + '</td><td>' + F.tokens(F.buys(m, 10000)) + '</td><td>' + F.rate(m) + '</td></tr>').join('') + '</tbody></table></details>' +
      (days ? '<h3 class="fset-sub">مصرف روزانه <small>دو هفتهٔ اخیر</small></h3><ol class="fset-days">' + days + '</ol>' : '') + (ledger ? '<h3 class="fset-sub">شارژها و هدیه‌ها</h3><ol class="fset-ledger">' + ledger + '</ol>' : days ? '' : '<p class="fset-empty">' + RI.icon('sparkle') + 'هنوز تراکنشی نیست.</p>') + '</section>' + close +
      open('plans') + '<section class="fset-card fset-card--wide fset-plans" id="fset-plans" style="--i:0"><header><h2>' + RI.icon('crown') + 'اشتراک‌های فندق</h2><p>اشتراک‌ها مدل‌ها را باز می‌کنند و هر کدام اعتبار اولیه‌ای هم به کیف پول فندق می‌دهند؛ استفاده از مدل‌ها از کیف پول فندق پرداخت می‌شود. قوی‌ترین مدل‌ها (Claude Fable و Opus، GPT-6 Astra و Sol، Gemini 4 Argon) فقط در «کوروش» و اشتراک رزومیت هستند. پرداخت از کیف پول It است.</p></header><div class="fset-plan-grid">' + plans + '</div></section>' + close +
      open('key') + '<section class="fset-card fset-card--wide" style="--i:0"><header><h2>' + RI.icon('key') + 'هوش مصنوعی خودت <em class="fset-cost is-free">رایگان</em></h2><p>با کلید خودت، پیام‌ها از سهمیهٔ روزانه کم نمی‌شوند و دستیار از حساب خودت جواب می‌دهد؛ هزینهٔ سرویس با خودت است. کلید رمزگذاری‌شده نگه داشته می‌شود و دوباره نمایش داده نمی‌شود.</p></header>' +
      '<label class="fset-switch"><input type="checkbox" name="own"' + (own.enabled ? ' checked' : '') + '><span></span>از کلید خودم استفاده کن</label>' +
      '<div class="fset-own"' + (own.enabled ? '' : ' hidden') + '>' +
      '<label class="fset-field"><span>سرویس</span><select class="input" name="provider">' + data.providers.map(p => '<option value="' + p.id + '"' + (p.id === own.provider ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') + '</select></label>' +
      '<label class="fset-field"><span>مدل <small>(خالی یعنی پیش‌فرض)</small></span><input class="input" name="model" dir="ltr" maxlength="80" autocomplete="off" data-lpignore="true" data-1p-ignore value="' + esc(own.model) + '" list="fset-models" placeholder="' + esc(provider(own.provider)?.model || '') + '"><datalist id="fset-models">' + (provider(own.provider)?.models || []).map(m => '<option value="' + esc(m) + '">').join('') + '</datalist></label>' +
      '<label class="fset-field" data-own-url' + (own.provider === 'custom' ? '' : ' hidden') + '><span>نشانی سرویس</span><input class="input" name="url" type="url" inputmode="url" dir="ltr" maxlength="200" autocomplete="off" data-lpignore="true" data-1p-ignore value="' + esc(own.url) + '" placeholder="https://"></label>' +
      '<label class="fset-field"><span>کلید API ' + (data.key.set ? '<small>ذخیره‌شده ' + esc(data.key.hint) + '</small>' : '') + '</span><input class="input" name="key" type="password" dir="ltr" autocomplete="new-password" data-lpignore="true" data-1p-ignore placeholder="' + (data.key.set ? 'برای عوض کردن، کلید تازه را بنویس' : 'sk-…') + '"></label>' +
      '<div class="fset-row"><button type="button" class="btn btn--soft btn--sm" data-set-test>' + RI.icon('zap') + 'آزمون اتصال</button>' + (data.key.set ? '<button type="button" class="btn btn--ghost btn--sm" data-set-forget>' + RI.icon('trash') + 'حذف کلید</button>' : '') + '<p class="fset-status" data-set-test-status role="status"></p></div></div></section>' + close +
      '<div class="fset-save" data-fset-save' + (SAVES[tab] ? '' : ' hidden') + '><button type="submit" class="btn btn--primary">' + RI.icon('check') + 'ذخیرهٔ تنظیمات</button><a class="btn btn--soft" href="' + RI.routeUrl('fandogh') + '" data-go="fandogh">' + RI.icon('sparkle') + 'گفت‌وگو با فندق</a><p class="fset-status" data-set-status role="status"></p></div></div></form>';
  }

  RI.registerPage('assistant', {
    title: 'تنظیمات فندق',
    render() {
      return '<div class="nv fset-page"><header class="nv-head fset-head"><div><h1 id="page-title" tabindex="-1">تنظیمات فندق</h1><p>مدل، شخصیت، کیف پول و اشتراک دستیار رزومه‌ات؛ هر بخش در زبانهٔ خودش.</p></div><img class="fset-cat" src="/brand/fandogh/full.webp" alt="" width="518" height="900" decoding="async"></header><div data-fset-host>' + body() + '</div></div>';
    },
    mount(view) {
      const host = view.querySelector('[data-fset-host]');
      let alive = true;
      const paint = () => { if (!alive) return; host.innerHTML = body(); wire(); };
      tab = null; maker = null;
      const inks = () => host.querySelectorAll('.fset-tabs,.fset-makers').forEach(bar => { const i = bar.querySelector(':scope>i'), b = bar.querySelector('[aria-selected=true]'); if (!i || !b) return; i.style.width = b.offsetWidth + 'px'; i.style.height = b.offsetHeight + 'px'; i.style.transform = 'translate(' + b.offsetLeft + 'px,' + b.offsetTop + 'px)'; });
      addEventListener('resize', inks, { passive: true });
      Promise.all([RI.dashboardRequest('assistant/me'), F.refresh()]).then(([me]) => { data = me; paint(); }).catch(e => { host.innerHTML = '<p class="fset-wait">' + esc(e.message || 'تنظیمات دریافت نشد') + '</p>'; });
      function wire() {
        const form = host.querySelector('[data-fset]'); if (!form) return;
        requestAnimationFrame(() => { inks(); requestAnimationFrame(() => form.classList.add('is-ready')); });
        const pick = (id, focus) => {
          tab = id; form.dataset.tab = id; RI.setRouteTab(id, 'model');
          form.querySelectorAll('[data-fset-tab]').forEach(t => { const on = t.dataset.fsetTab === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
          form.querySelectorAll('[data-fset-panel]').forEach(p => { p.hidden = p.dataset.fsetPanel !== id; });
          form.querySelector('[data-fset-save]').hidden = !SAVES[id]; inks();
          if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        };
        form.addEventListener('click', e => {
          const t = e.target.closest('[data-fset-tab]'); if (t) { pick(t.dataset.fsetTab); return; }
          const m = e.target.closest('[data-fset-maker]'); if (!m) return;
          maker = m.dataset.fsetMaker;
          form.querySelectorAll('[data-fset-maker]').forEach(x => x.setAttribute('aria-selected', String(x === m)));
          form.querySelectorAll('[data-fset-group]').forEach(g => { g.hidden = g.dataset.fsetGroup !== maker; }); inks();
        });
        form.querySelector('.fset-tabs').addEventListener('keydown', e => {
          const all = [...form.querySelectorAll('[data-fset-tab]')], at = all.indexOf(document.activeElement); if (at < 0) return;
          const step = { ArrowDown: 1, ArrowUp: -1, ArrowLeft: 1, ArrowRight: -1 }[e.key]; if (!step) return;
          e.preventDefault(); pick(all[(at + step + all.length) % all.length].dataset.fsetTab, true);
        });
        const field = n => form.elements[n], key = () => field('own').checked ? field('key').value.trim() : '';
        const draft = () => ({ name: field('name').value.trim(), tone: field('tone').value, length: field('answer').value, suggest: field('suggest').checked, engine: field('engine').value || 'local', own: { enabled: field('own').checked, provider: field('provider').value, model: field('model').value.trim(), url: field('provider').value === 'custom' ? field('url').value.trim() : '' } });
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
      return () => { alive = false; removeEventListener('resize', inks); };
    }
  });
})();
