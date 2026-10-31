/* Owner panel for Fandogh: switch it on or off, set daily allowances and plan prices, read usage, and connect a
   language model with its key. A key is sent once and only ever comes back as its last four characters; Fandogh
   keeps introducing itself as Fandogh whichever provider answers. */
(() => {
  'use strict';
  const fa = n => Number(n || 0).toLocaleString('fa-IR'), $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = n => (window.RI && window.RI.icon ? window.RI.icon(n) : '');
  const day = d => { const s = String(d); return new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', timeZone: 'UTC' }); };
  const requestId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/-/g, '');
  let data = null, keys = {};

  function provider(p, s, k) {
    const own = s.providers[p.id] || {}, active = s.ai.provider === p.id, key = k[p.id] || {};
    return '<article class="fx-provider' + (active ? ' is-active' : '') + '" data-provider="' + p.id + '">' +
      '<label class="fx-pick"><input type="radio" name="fx-provider" value="' + p.id + '"' + (active ? ' checked' : '') + '><span class="fx-pick__dot" aria-hidden="true"></span><b>' + esc(p.label) + '</b><small class="fx-keystate' + (key.set ? ' is-set' : '') + '">' + (key.set ? icon('key') + 'کلید <bdi>' + esc(key.hint) + '</bdi>' : 'بدون کلید') + '</small></label>' +
      '<div class="fx-fields">' +
      '<label>کلید API<input class="input" type="password" autocomplete="off" spellcheck="false" dir="ltr" data-key placeholder="' + (key.set ? 'کلید ذخیره شده (' + esc(key.hint) + ')؛ برای عوض‌کردن، کلید تازه بنویس' : 'کلید را اینجا بچسبان') + '"></label>' +
      '<label>مدل<input class="input" dir="ltr" data-model list="fx-models-' + p.id + '" value="' + esc(own.model || '') + '" placeholder="' + esc(p.model || 'نام مدل') + '"><datalist id="fx-models-' + p.id + '">' + p.models.map(m => '<option value="' + esc(m) + '">').join('') + '</datalist></label>' +
      (p.needsUrl ? '<label class="fx-wide">نشانی سرویس (سازگار با OpenAI)<input class="input" dir="ltr" data-url value="' + esc(own.url || '') + '" placeholder="https://example.ir/v1"></label>' : '') +
      '<div class="fx-actions fx-wide"><button type="button" class="btn" data-test>' + icon('zap') + 'آزمایش اتصال</button>' + (key.set ? '<button type="button" class="btn fx-danger" data-remove-key>' + icon('trash') + 'حذف کلید</button>' : '') + '<span class="fx-result" data-test-result role="status"></span></div>' +
      '</div></article>';
  }

  function render(d) {
    data = d; keys = {};
    const s = d.settings, st = d.stats, t = st.today, max = Math.max(1, ...st.series.map(x => x.messages)), live = d.providers.find(p => p.id === s.ai.provider);
    const status = !s.enabled ? 'خاموش است؛ کاربران پیام «فندق در حال استراحت است» می‌بینند.' : d.live ? 'روشن است و با ' + esc(live.label) + ' · ' + esc((s.providers[s.ai.provider] || {}).model || live.model) + ' جواب می‌دهد.' : 'روشن است و با مغز داخلی خودش جواب می‌دهد' + (d.envFallback ? '؛ اتصال قدیمی متغیرهای سرور هم فعال است.' : '.');
    const kpi = (label, value, sub, glyph) => '<div class="fx-kpi">' + icon(glyph) + '<span>' + label + '</span><strong data-count="' + Number(value || 0) + '">' + fa(value) + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    return '<div class="fx" data-fx-root>' +
      '<section class="fx-hero"><img class="fx-hero__cat" src="/brand/fandogh/avatar.webp" alt="" width="76" height="76"><div class="fx-hero__text"><h2>فندق، دستیار رزومه</h2><p>' + status + '</p></div>' +
      '<label class="fx-master"><span>' + (s.enabled ? 'روشن' : 'خاموش') + '</span><input type="checkbox" class="toggle" data-fx-enabled' + (s.enabled ? ' checked' : '') + ' aria-label="روشن یا خاموش بودن فندق"></label></section>' +
      '<div class="fx-kpis">' +
      kpi('پیام‌های امروز', t.messages, fa(t.users) + ' کاربر', 'bell') +
      kpi('پاسخ هوش مصنوعی امروز', t.aiCalls, t.aiFailures ? fa(t.aiFailures) + ' خطا' : 'بدون خطا', 'sparkle') +
      kpi('توکن امروز', t.tokens, 'ورودی و خروجی', 'layers') +
      kpi('سقف روزانهٔ هوش مصنوعی', s.ai.dailyCalls, fa(Math.max(0, s.ai.dailyCalls - t.aiCalls)) + ' باقی‌مانده', 'sliders') +
      kpi('خریداران دستیار', st.buyers.assistant, 'اشتراک فعال جدا', 'crown') +
      kpi('مشترکان سایت', st.buyers.subscription, 'دستیار را دارند', 'star') +
      '</div>' +
      '<section class="panel fx-chart"><header><h2>' + icon('chart') + 'چهارده روز اخیر</h2><span class="fx-legend"><i class="is-msg"></i>پیام‌ها<i class="is-ai"></i>پاسخ هوش مصنوعی</span></header><div class="fx-bars">' +
      st.series.map((x, i) => '<div class="fx-bar" style="--h:' + (x.messages / max * 100).toFixed(1) + '%;--a:' + (x.messages ? Math.min(100, x.aiCalls / x.messages * 100) : 0).toFixed(1) + '%;--i:' + i + '" title="' + day(x.day) + ': ' + fa(x.messages) + ' پیام از ' + fa(x.users) + ' کاربر، ' + fa(x.aiCalls) + ' پاسخ هوش مصنوعی"><span><i></i></span><small>' + day(x.day) + '</small></div>').join('') +
      '</div></section>' +
      '<div class="fx-grid">' +
      '<section class="panel fx-limits"><h2>' + icon('sliders') + 'سهمیهٔ روزانه</h2><div class="fx-pair">' +
      '<label>کاربر رایگان<span class="fx-num"><input class="input" type="number" min="0" max="1000" step="1" data-fx-free value="' + s.freeDaily + '"><em>پیام در روز</em></span></label>' +
      '<label>مشترک یا خریدار دستیار<span class="fx-num"><input class="input" type="number" min="1" max="10000" step="1" data-fx-paid value="' + s.paidDaily + '"><em>پیام در روز</em></span></label></div>' +
      '<p class="fx-note">سهمیه هر شب ساعت ۰۰:۰۰ به وقت تهران تازه می‌شود. سهمیهٔ صفر یعنی کاربر رایگان فقط پیشنهاد خرید می‌بیند.</p>' +
      '<h3>' + icon('crown') + 'اشتراک دستیار</h3><div class="fx-plans">' +
      d.plans.map(p => '<div class="fx-plan" data-plan="' + p.ref + '"><b>' + esc(p.period) + '</b><label>قیمت<span class="fx-num"><input class="input" type="number" min="1" step="1" data-plan-price value="' + p.price / 2000 + '"><em>It</em></span></label><label class="fx-inline"><input type="checkbox" class="toggle" data-plan-paused' + (p.paused ? ' checked' : '') + '>توقف فروش</label><button type="button" class="btn" data-plan-save>ذخیره</button></div>').join('') +
      '</div><p class="fx-note">قیمت پایه: ' + d.plans.map(p => esc(p.period) + ' ' + fa(p.base / 2000) + ' It').join('، ') + '. هر اشتراک سایت هم دستیار را شامل می‌شود.</p></section>' +
      '<section class="panel fx-top"><h2>' + icon('trend') + 'پرمصرف‌های امروز</h2>' + (st.top.length ? '<ol>' + st.top.map(u => '<li><a href="/admin/users/?user=' + esc(u.id) + '" dir="ltr">' + esc(u.id.slice(0, 8)) + '…</a><span class="fx-meter" style="--w:' + (u.used / Math.max(1, st.top[0].used) * 100).toFixed(0) + '%"></span><b>' + fa(u.used) + '</b></li>').join('') + '</ol>' : '<p class="fx-empty">امروز هنوز کسی با فندق حرف نزده.</p>') +
      (Object.keys(st.providers).length ? '<h3>' + icon('sparkle') + 'مصرف سرویس‌ها (۱۴ روز)</h3><ul class="fx-usage">' + Object.entries(st.providers).map(([id, u]) => '<li><b>' + esc((d.providers.find(p => p.id === id) || { label: id }).label) + '</b><span>' + fa(u.calls) + ' پاسخ · ' + fa(u.failures) + ' خطا · ' + fa(u.input + u.output) + ' توکن</span></li>').join('') + '</ul>' : '') + '</section>' +
      '</div>' +
      '<section class="panel fx-ai"><header><div><h2>' + icon('sparkle') + 'اتصال به هوش مصنوعی</h2><p>اگر خاموش باشد یا کلید کار نکند، فندق با مغز داخلی خودش جواب می‌دهد و هیچ پیامی بی‌جواب نمی‌ماند.</p></div><label class="fx-master"><span>پاسخ با هوش مصنوعی</span><input type="checkbox" class="toggle" data-fx-ai' + (s.ai.enabled ? ' checked' : '') + '></label></header>' +
      '<p class="fx-identity">' + icon('shield') + '<span>هر سرویسی که وصل کنی، فندق خودش را «فندق» معرفی می‌کند: سؤال‌هایی مثل «تو کلادی؟» یا «از چه هوش مصنوعی استفاده می‌کنی؟» اصلاً به سرویس نمی‌رسد، و اگر پاسخی بگوید «من ChatGPT هستم»، همان جمله با معرفی فندق عوض می‌شود.</span></p>' +
      '<div class="fx-providers" role="radiogroup" aria-label="سرویس هوش مصنوعی">' + d.providers.map(p => provider(p, s, d.keys)).join('') + '</div>' +
      '<div class="fx-tuning">' +
      '<label>خلاقیت پاسخ<span class="fx-range"><input type="range" min="0" max="100" step="5" data-fx-temp value="' + Math.round(s.ai.temperature * 100) + '"><output data-fx-temp-out>' + fa(Math.round(s.ai.temperature * 100)) + '٪</output></span></label>' +
      '<label>بیشترین طول پاسخ<span class="fx-num"><input class="input" type="number" min="100" max="2000" step="50" data-fx-tokens value="' + s.ai.maxTokens + '"><em>توکن</em></span></label>' +
      '<label>سقف روزانهٔ کل سایت<span class="fx-num"><input class="input" type="number" min="1" max="1000000" step="1" data-fx-calls value="' + s.ai.dailyCalls + '"><em>پاسخ</em></span></label>' +
      '<label class="fx-inline fx-wide"><input type="checkbox" class="toggle" data-fx-small' + (s.ai.smalltalk ? ' checked' : '') + '>سلام و احوالپرسی هم با هوش مصنوعی جواب داده شود (هزینه بیشتر؛ معرفی فندق همیشه داخلی می‌ماند)</label>' +
      '</div></section>' +
      '<section class="panel fx-save"><label>دلیل تغییر<textarea class="input" data-fx-reason minlength="5" maxlength="500" placeholder="مثلاً: وصل‌کردن فندق به سرویس جدید"></textarea></label><div class="fx-save__row"><button type="button" class="btn btn-primary" data-fx-save>' + icon('save') + 'ذخیرهٔ تنظیمات فندق</button><p class="fx-result" data-fx-status role="status"></p></div></section>' +
      '</div>';
  }
  window.ownerAssistant = d => { requestAnimationFrame(animate); return render(d); };

  // Numbers count up and bars rise once; reduced motion shows them as they are.
  function animate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('.fx-kpi strong[data-count]').forEach((el, i) => { const end = Number(el.dataset.count); if (!end) return; const start = performance.now() + i * 70, dur = 900; const step = now => { const k = Math.min(1, Math.max(0, (now - start) / dur)), e = 1 - Math.pow(1 - k, 3); el.textContent = fa(Math.round(end * e)); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); });
  }
  const say = (el, text, kind) => { if (!el) return; el.textContent = text; el.dataset.kind = kind || ''; };
  async function call(route, body) {
    const response = await fetch('/api/admin/' + route, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'درخواست انجام نشد');
    return result;
  }
  function collect() {
    const providers = {};
    for (const card of $$('.fx-provider')) { const model = card.querySelector('[data-model]').value.trim(), url = card.querySelector('[data-url]')?.value.trim() || ''; if (model || url) providers[card.dataset.provider] = { model, url }; }
    return { enabled: $('[data-fx-enabled]').checked, freeDaily: Number($('[data-fx-free]').value), paidDaily: Number($('[data-fx-paid]').value), providers,
      ai: { enabled: $('[data-fx-ai]').checked, provider: ($('[name="fx-provider"]:checked') || {}).value || data.settings.ai.provider, temperature: Number($('[data-fx-temp]').value) / 100, maxTokens: Number($('[data-fx-tokens]').value), dailyCalls: Number($('[data-fx-calls]').value), smalltalk: $('[data-fx-small]').checked } };
  }
  const reason = () => { const r = $('[data-fx-reason]').value.trim(); if (r.length < 5) { $('[data-fx-reason]').focus(); throw new Error('دلیل تغییر را دست‌کم در پنج حرف بنویس'); } return r; };
  async function refresh(message) {
    const d = await call('assistant'), host = $('#content'); host.innerHTML = window.ownerAssistant(d);
    say($('[data-fx-status]'), message, 'ok');
  }

  document.addEventListener('change', e => {
    if (!e.target.closest('[data-fx-root]')) return;
    if (e.target.name === 'fx-provider') $$('.fx-provider').forEach(card => card.classList.toggle('is-active', card.dataset.provider === e.target.value));
    if (e.target.matches('[data-fx-enabled]')) e.target.previousElementSibling.textContent = e.target.checked ? 'روشن' : 'خاموش';
  });
  document.addEventListener('input', e => {
    if (!e.target.closest('[data-fx-root]')) return;
    if (e.target.matches('[data-key]')) { const id = e.target.closest('.fx-provider').dataset.provider; if (e.target.value.trim()) keys[id] = e.target.value.trim(); else delete keys[id]; }
    if (e.target.matches('[data-fx-temp]')) $('[data-fx-temp-out]').textContent = fa(e.target.value) + '٪';
  });
  document.addEventListener('click', async e => {
    const root = e.target.closest('[data-fx-root]'); if (!root) return;
    const card = e.target.closest('.fx-provider');
    if (card && !card.classList.contains('is-active') && !e.target.closest('.fx-fields')) { const radio = card.querySelector('[name="fx-provider"]'); radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    const test = e.target.closest('[data-test]');
    if (test) {
      const out = card.querySelector('[data-test-result]'); test.disabled = true; say(out, 'در حال گفت‌وگو با سرویس…', 'wait');
      try { const r = await call('assistant/test', { provider: card.dataset.provider, key: card.querySelector('[data-key]').value.trim() || undefined, model: card.querySelector('[data-model]').value.trim() || undefined, url: card.querySelector('[data-url]')?.value.trim() || undefined }); say(out, r.ok ? '✓ وصل شد (' + fa(r.ms) + ' میلی‌ثانیه): «' + r.reply + '»' : '✕ ' + r.error, r.ok ? 'ok' : 'error'); }
      catch (error) { say(out, '✕ ' + error.message, 'error'); } finally { test.disabled = false; }
      return;
    }
    const remove = e.target.closest('[data-remove-key]');
    if (remove) { keys[card.dataset.provider] = null; card.querySelector('[data-key]').value = ''; say(card.querySelector('[data-test-result]'), 'با ذخیرهٔ تنظیمات، کلید این سرویس حذف می‌شود.', 'wait'); return; }
    const plan = e.target.closest('[data-plan-save]');
    if (plan) {
      const row = plan.closest('[data-plan]'), item = data.plans.find(p => p.ref === row.dataset.plan), status = $('[data-fx-status]');
      try { plan.disabled = true; await call('catalog/product', { ref: item.ref, confirmation: item.ref, reason: reason(), requestId: requestId(), expected: item.expected, data: { price: Math.round(Number(row.querySelector('[data-plan-price]').value) * 2000), paused: row.querySelector('[data-plan-paused]').checked } }); await refresh('قیمت «' + item.period + '» ذخیره شد.'); }
      catch (error) { say(status, error.message, 'error'); plan.disabled = false; }
      return;
    }
    const save = e.target.closest('[data-fx-save]');
    if (save) {
      const status = $('[data-fx-status]');
      try { save.disabled = true; say(status, 'در حال ذخیره…', 'wait'); await call('assistant', { settings: collect(), keys: Object.keys(keys).length ? keys : undefined, reason: reason(), requestId: requestId() }); await refresh('تنظیمات فندق ذخیره شد.'); }
      catch (error) { say(status, error.message, 'error'); save.disabled = false; }
    }
  });
})();
