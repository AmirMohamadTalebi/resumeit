/* تنظیمات فندق: the default model (grouped by maker, with what each question costs and the plan that opens it), the
   assistant's name, tone and answer length, how resume edits land, the 5-hour and weekly allowance, the three Fandogh
   plans («آرش»، «رستم»، «کوروش») and the person's own model key (free). */
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc, F = RI.Fandogh;
  let data = null;
  const seg = (name, value, options) => '<div class="fset-seg" role="radiogroup">' + options.map(([v, t, icon]) => '<label><input type="radio" name="' + name + '" value="' + v + '"' + (value === v ? ' checked' : '') + '><span>' + (icon ? RI.icon(icon) : '') + t + '</span></label>').join('') + '</div>';
  const costBadge = m => '<em class="fset-cost' + (m.cost ? '' : ' is-free') + '">' + (m.cost ? RI.fa(m.cost) + ' پیام' : 'رایگان') + '</em>';

  function body() {
    if (!data) return '<div class="fset-wait"><span class="loading loading-dots"></span><p>در حال آوردن تنظیمات فندق…</p></div>';
    const s = data.settings, own = s.own, st = F.status || {}, provider = id => data.providers.find(p => p.id === id);
    let n = 0;
    const models = F.groups(data.models || []).map(([group, items]) => '<div class="fset-group"><h3>' + esc(group) + '</h3><div class="fset-models">' + items.map(m => { const off = !m.available || m.locked; return '<label class="fset-model' + (off ? ' is-off' : '') + (m.locked ? ' is-locked' : '') + '" style="--i:' + (n++) + '"><input type="radio" name="engine" value="' + m.id + '"' + (s.engine === m.id ? ' checked' : '') + (off ? ' disabled' : '') + '><span class="fset-model__body"><b>' + esc(m.label) + costBadge(m) + '</b><small>' + esc(m.note || '') + '</small><span class="fset-tags">' + (m.tags || []).map(t => '<i>' + esc(t) + '</i>').join('') + (m.locked ? '<i class="is-lock">' + RI.icon('lock') + 'اشتراک ' + esc(F.tier(m.tier)) + '</i>' : m.available ? '' : '<i class="is-off">الان در دسترس نیست</i>') + '</span></span></label>'; }).join('') + '</div></div>').join('');
    const ring = (w, label, i) => { const left = Math.max(0, w.limit - w.used), pct = w.limit ? Math.min(100, Math.round(left / w.limit * 100)) : 0; return '<div class="fset-ring" style="--i:' + i + '"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="42" pathLength="100" style="--v:' + pct + '"/></svg><div><b>' + RI.fa(left) + '</b><span>از ' + RI.fa(w.limit) + ' · ' + label + '</span>' + (w.resetAt && w.used ? '<small>جا باز می‌شود ' + esc(F.reset(w.resetAt)) + '</small>' : '') + '</div></div>'; };
    const win = st.window || { used: st.used || 0, limit: st.limit || 0 }, week = st.week || win;
    const plans = (st.plans || []).map((p, i) => '<article class="fset-plan fset-plan--' + p.id + (st.plan === p.id ? ' is-current' : '') + '" style="--i:' + i + '"><span class="fset-plan__crest" aria-hidden="true">' + RI.icon(['zap', 'award', 'crown'][i] || 'crown') + '</span><h3>' + esc(p.name) + '<small>' + esc(p.title || '') + '</small></h3><p class="fset-plan__price"><b>' + esc(RI.priceToman(p.price)) + '</b><span>' + esc(p.period) + ' · ' + esc(RI.it(p.price)) + '</span></p><ul><li>' + RI.icon('check') + RI.fa(p.window) + ' پیام در هر ۵ ساعت</li><li>' + RI.icon('check') + RI.fa(p.week) + ' پیام در هفته</li><li>' + RI.icon('check') + esc(p.desc || '') + '</li></ul>' + (st.plan === p.id ? '<span class="fset-plan__badge">' + RI.icon('check') + 'اشتراک فعلی تو</span>' : '') + '<button type="button" class="btn ' + (i === 2 ? 'btn--primary' : 'btn--soft') + '" data-set-buy="' + p.id + '"' + (p.paused ? ' disabled' : '') + '>' + (p.paused ? 'فروش متوقف است' : st.plan === p.id ? 'تمدید یک ماه' : 'فعال کردن') + '</button></article>').join('');
    return '<form class="fset" data-fset novalidate>' +
      '<section class="fset-card fset-card--wide" style="--i:0"><header><h2>' + RI.icon('sparkle') + 'مدل پیش‌فرض</h2><p>فندق محلی رایگان است و از سهمیه کم نمی‌کند. بقیهٔ مدل‌ها برای هر پیام به اندازهٔ برچسبشان از سهمیه برمی‌دارند؛ «GPT-6 Luna» برابر یک پیام است و بقیه از دو پیام شروع می‌شوند. مدل‌های قفل‌دار با اشتراک فندق یا اشتراک رزومیت باز می‌شوند. در صفحهٔ گفت‌وگو هم برای هر پیام می‌توانی مدل را عوض کنی.</p></header>' + models + '</section>' +
      '<section class="fset-card" style="--i:1"><header><h2>' + RI.icon('user') + 'شخصیت دستیار</h2></header>' +
      '<label class="fset-field"><span>اسمی که صدایش می‌کنی</span><input class="input" name="name" maxlength="20" value="' + esc(s.name) + '" autocomplete="off"></label>' +
      '<div class="fset-field"><span>لحن</span>' + seg('tone', s.tone, [['friendly', 'صمیمی'], ['formal', 'رسمی']]) + '</div>' +
      '<div class="fset-field"><span>طول جواب</span>' + seg('answer', s.length, [['short', 'کوتاه'], ['detailed', 'مفصل']]) + '</div>' +
      '<div class="fset-field"><span>وقتی فندق رزومه را تغییر می‌دهد</span>' + seg('edits', F.editMode(), [['ask', 'اول نشانم بده', 'eye'], ['auto', 'خودش انجام بدهد', 'zap']]) + '</div></section>' +
      '<section class="fset-card" style="--i:2"><header><h2>' + RI.icon('chart') + 'سهمیهٔ پیام</h2><p>اشتراک تو: <b>' + esc(st.planName || 'رایگان') + '</b>' + (st.until ? ' تا ' + esc(new Date(st.until).toLocaleDateString('fa-IR')) : '') + '</p></header><div class="fset-quota">' + ring(win, '۵ ساعت اخیر', 0) + ring(week, 'هفتهٔ اخیر', 1) + '</div><p class="fset-note">هر پیام به اندازهٔ هزینهٔ مدلش از هر دو بازه کم می‌شود و ۵ ساعت یا ۷ روز بعد دوباره جا باز می‌کند. فندق محلی و کلید خودت هیچ‌وقت از سهمیه کم نمی‌کنند.' + (st.plan === 'free' ? ' اشتراک رزومیت ' + RI.fa(st.site?.window || 10) + ' پیام در ۵ ساعت و ' + RI.fa(st.site?.week || 40) + ' پیام در هفته با همهٔ مدل‌ها می‌دهد.' : '') + '</p></section>' +
      '<section class="fset-card fset-card--wide fset-plans" id="fset-plans" style="--i:3"><header><h2>' + RI.icon('crown') + 'اشتراک‌های فندق</h2><p>فرق اشتراک‌ها در حجم پیام و مدل‌هایی است که باز می‌کنند؛ قوی‌ترین مدل‌ها (Claude Fable و Opus، GPT-6 Astra و Sol، Gemini 4 Argon) فقط در «کوروش» و اشتراک رزومیت هستند. پرداخت از کیف پول It است.</p></header><div class="fset-plan-grid">' + plans + '</div></section>' +
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
      Promise.all([RI.dashboardRequest('assistant/me'), F.refresh()]).then(([me]) => { data = me; paint(); if ((RI.routeOpts?.tab || new URL(location.href).searchParams.get('tab')) === 'plans') host.querySelector('#fset-plans')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }).catch(e => { host.innerHTML = '<p class="fset-wait">' + esc(e.message || 'تنظیمات دریافت نشد') + '</p>'; });
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
