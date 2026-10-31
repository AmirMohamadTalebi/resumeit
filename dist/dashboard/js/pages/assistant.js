/* تنظیمات فندق: the default model (with what each question costs), the assistant's name, tone and answer length,
   how resume edits land, the person's own model key (free) and today's allowance. */
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc, F = RI.Fandogh;
  let data = null;
  const seg = (name, value, options) => '<div class="fset-seg" role="radiogroup">' + options.map(([v, t, icon]) => '<label><input type="radio" name="' + name + '" value="' + v + '"' + (value === v ? ' checked' : '') + '><span>' + (icon ? RI.icon(icon) : '') + t + '</span></label>').join('') + '</div>';
  const costBadge = m => '<em class="fset-cost' + (m.cost ? '' : ' is-free') + '">' + (m.cost ? RI.fa(m.cost) + ' پیام' : 'رایگان') + '</em>';

  function body() {
    if (!data) return '<div class="fset-wait"><span class="loading loading-dots"></span><p>در حال آوردن تنظیمات فندق…</p></div>';
    const s = data.settings, own = s.own, st = F.status || {}, provider = id => data.providers.find(p => p.id === id);
    const models = (data.models || []).map((m, i) => '<label class="fset-model' + (m.available ? '' : ' is-off') + '" style="--i:' + i + '"><input type="radio" name="engine" value="' + m.id + '"' + (s.engine === m.id ? ' checked' : '') + (m.available ? '' : ' disabled') + '><span class="fset-model__body"><b>' + esc(m.label) + costBadge(m) + '</b><small>' + esc(m.note || '') + '</small><span class="fset-tags">' + (m.tags || []).map(t => '<i>' + esc(t) + '</i>').join('') + (m.available ? '' : '<i class="is-off">الان در دسترس نیست</i>') + '</span></span></label>').join('');
    const used = st.used || 0, limit = st.limit || 0, pct = limit ? Math.min(100, Math.round(used / limit * 100)) : 0;
    return '<form class="fset" data-fset novalidate>' +
      '<section class="fset-card fset-card--wide" style="--i:0"><header><h2>' + RI.icon('sparkle') + 'مدل پیش‌فرض</h2><p>فندق محلی رایگان است و از سهمیه کم نمی‌کند. بقیهٔ مدل‌ها برای هر پیام به اندازهٔ برچسبشان از سهمیهٔ روزانه برمی‌دارند؛ «GPT Luna» برابر یک پیام است. در صفحهٔ گفت‌وگو هم برای هر پیام می‌توانی مدل را عوض کنی.</p></header><div class="fset-models">' + models + '</div></section>' +
      '<section class="fset-card" style="--i:1"><header><h2>' + RI.icon('user') + 'شخصیت دستیار</h2></header>' +
      '<label class="fset-field"><span>اسمی که صدایش می‌کنی</span><input class="input" name="name" maxlength="20" value="' + esc(s.name) + '" autocomplete="off"></label>' +
      '<div class="fset-field"><span>لحن</span>' + seg('tone', s.tone, [['friendly', 'صمیمی'], ['formal', 'رسمی']]) + '</div>' +
      '<div class="fset-field"><span>طول جواب</span>' + seg('answer', s.length, [['short', 'کوتاه'], ['detailed', 'مفصل']]) + '</div>' +
      '<div class="fset-field"><span>وقتی فندق رزومه را تغییر می‌دهد</span>' + seg('edits', F.editMode(), [['ask', 'اول نشانم بده', 'eye'], ['auto', 'خودش انجام بدهد', 'zap']]) + '</div></section>' +
      '<section class="fset-card" style="--i:2"><header><h2>' + RI.icon('chart') + 'سهمیهٔ امروز</h2></header><div class="fset-quota"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="42" pathLength="100" style="--v:' + pct + '"/></svg><div><b>' + RI.fa(Math.max(0, limit - used)) + '</b><span>پیام از ' + RI.fa(limit) + ' باقی مانده</span></div></div><p class="fset-note">' + (st.plan === 'free' ? 'حساب رایگان؛ با اشتراک یا خرید دستیار، سهمیهٔ روزانه بیشتر می‌شود.' : 'سهمیهٔ مشترک‌ها؛ هر روز نیمه‌شب به وقت تهران تازه می‌شود.') + ' فندق محلی و کلید خودت هیچ‌وقت از سهمیه کم نمی‌کنند.</p><a class="btn btn--soft btn--sm" href="' + RI.routeUrl('billing') + '" data-go="billing">' + RI.icon('crown') + 'اشتراک و دستیار</a></section>' +
      '<section class="fset-card fset-card--wide" style="--i:3"><header><h2>' + RI.icon('key') + 'هوش مصنوعی خودت <em class="fset-cost is-free">رایگان</em></h2><p>با کلید خودت، پیام‌ها از سهمیهٔ روزانه کم نمی‌شوند و دستیار از حساب خودت جواب می‌دهد؛ هزینهٔ سرویس با خودت است. کلید رمزگذاری‌شده نگه داشته می‌شود و دوباره نمایش داده نمی‌شود.</p></header>' +
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
      Promise.all([RI.dashboardRequest('assistant/me'), F.refresh()]).then(([me]) => { data = me; paint(); }).catch(e => { host.innerHTML = '<p class="fset-wait">' + esc(e.message || 'تنظیمات دریافت نشد') + '</p>'; });
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
        form.querySelector('[data-set-forget]')?.addEventListener('click', async () => {
          try { const d = draft(); d.own.enabled = false; if (d.engine === 'own') d.engine = 'local'; data = await RI.dashboardRequest('assistant/me', { settings: d, key: null }); await F.refresh(); paint(); RI.toast('کلیدت حذف شد', { kind: 'info' }); }
          catch (err) { note('[data-set-test-status]', err.message, 'error'); }
        });
      }
      return () => { alive = false; };
    }
  });
})();
