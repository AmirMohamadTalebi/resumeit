/* فندق، صفحهٔ کامل: a workspace for working on the resume with Fandogh rather than a chat box. Conversations live
   on this device (a rail with search, pins and rename); every message can go to a different model with its cost
   shown before sending; «/» opens commands and «@» points at resume sections; the inspector shows the score, which
   sections Fandogh can see and every change made in this conversation, each with undo. Answers can be stopped,
   retried with another model, copied or exported. On wide screens the rail and the inspector fold away (and come
   back) so the conversation can take the whole width; the choice is remembered. On narrow screens they are drawers. */
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc, F = RI.Fandogh;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const AVATAR = '<img src="/brand/fandogh/avatar.webp" alt="" width="40" height="40" decoding="async">';
  const COMMANDS = [
    ['امتیاز', 'امتیاز رزومه و راه بالا بردنش', 'امتیاز رزومه‌ام چند است و برای بالا بردنش اول چه کار کنم؟', 'chart'],
    ['معرفی', 'بازنویسی معرفی', 'معرفی‌ام را حرفه‌ای‌تر و کوتاه‌تر بازنویسی کن.', 'user'],
    ['عنوان', 'عنوان حرفه‌ای بهتر', 'یک عنوان حرفه‌ای بهتر برایم بساز.', 'award'],
    ['غلط', 'غلط‌گیری املایی و تایپی', 'غلط‌های املایی و تایپی رزومه‌ام را پیدا و درست کن.', 'check'],
    ['مهارت', 'مهارت‌هایی که کم دارم', 'بر اساس نقشم چه مهارت‌هایی باید اضافه کنم؟', 'sparkle'],
    ['تجربه', 'توضیح تجربه‌ها با فعل‌های قوی', 'توضیح تجربه‌هایم را با فعل‌های قوی و نتیجه‌محور بازنویسی کن.', 'briefcase'],
    ['آگهی', 'مقایسه با یک آگهی شغلی', 'این آگهی شغلی را با رزومه‌ام مقایسه کن و بگو چه چیزهایی را تغییر بدهم:\n', 'search'],
    ['مصاحبه', 'آمادگی برای مصاحبه', 'برای مصاحبهٔ نقشم چه سؤال‌هایی می‌پرسند و چطور با همین رزومه جواب بدهم؟', 'book'],
    ['انگلیسی', 'نسخهٔ انگلیسی معرفی', 'یک نسخهٔ انگلیسی کوتاه از معرفی‌ام بنویس.', 'language'],
    ['پاک', 'شروع دوبارهٔ همین گفت‌وگو', null, 'trash'],
  ];
  const SUGGEST = [
    ['chart', 'امتیاز رزومه‌ام چند است؟', 'و اول چه چیزی را درست کنم'],
    ['user', 'معرفی‌ام را بازنویسی کن', 'کوتاه، حرفه‌ای و اول‌شخص'],
    ['check', 'غلط‌های رزومه‌ام را بگیر', 'املایی، تایپی و نیم‌فاصله'],
    ['search', 'با یک آگهی مقایسه کن', 'متن آگهی را بچسبان'],
    ['briefcase', 'تجربه‌هایم را قوی‌تر کن', 'با فعل‌های اثرگذار و نتیجه'],
    ['sparkle', 'چه مهارت‌هایی کم دارم؟', 'بر اساس نقش تو'],
  ];
  const key = () => 'ri-fandogh-chats-' + RI.ownerId;
  const load = () => { try { const v = JSON.parse(F.store(key()) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const when = t => { const d = new Date(t), now = new Date(), day = 864e5; if (now - t < day && d.getDate() === now.getDate()) return 'امروز'; if (now - t < 2 * day) return 'دیروز'; if (now - t < 7 * day) return 'این هفته'; return 'قبل‌تر'; };
  const clock = t => new Date(t).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  RI.registerPage('fandogh', {
    title: 'فندق، دستیار رزومه',
    render() {
      return '<div class="fs" data-fs>' +
        '<aside class="fs-rail" data-fs-rail aria-label="گفت‌وگوها"><div class="fs-rail__top"><div class="fs-rail__row"><button type="button" class="fs-new" data-fs-new>' + RI.icon('plus') + '<span>گفت‌وگوی تازه</span><kbd>Ctrl K</kbd></button><button type="button" class="fs-icon fs-fold" data-fs-hide="rail" title="جمع کردن گفت‌وگوها (Ctrl+B)" aria-label="جمع کردن گفت‌وگوها">' + RI.icon('chevR') + '</button></div><label class="fs-search"><span class="sr-only">جست‌وجو در گفت‌وگوها</span>' + RI.icon('search') + '<input type="search" data-fs-search placeholder="جست‌وجو در گفت‌وگوها"></label></div><nav class="fs-chats" data-fs-chats></nav><div class="fs-rail__foot"><a href="' + RI.routeUrl('assistant') + '" data-go="assistant">' + RI.icon('sliders') + 'تنظیمات فندق</a><small>گفت‌وگوها فقط روی همین دستگاه می‌مانند.</small></div></aside>' +
        '<section class="fs-main" aria-labelledby="page-title"><h1 id="page-title" tabindex="-1" class="sr-only">فندق، دستیار رزومه</h1>' +
        '<header class="fs-bar"><button type="button" class="fs-icon fs-pane-btn" data-fs-open="rail" aria-label="گفت‌وگوها" title="گفت‌وگوها (Ctrl+B)">' + RI.icon('menu') + '</button><input class="fs-title" data-fs-title maxlength="60" aria-label="نام گفت‌وگو"><a class="fs-quota" data-fs-quota href="' + RI.routeUrl('assistant', { tab: 'wallet' }) + '" data-go="assistant"></a><button type="button" class="fs-icon" data-fs-export title="خروجی متنی گفت‌وگو">' + RI.icon('download') + '</button><button type="button" class="fs-icon" data-fs-delete title="حذف گفت‌وگو">' + RI.icon('trash') + '</button><button type="button" class="fs-icon fs-pane-btn" data-fs-open="inspector" aria-label="زمینه و تغییرها" title="زمینه و تغییرها (Ctrl+Shift+B)">' + RI.icon('layers') + '</button></header>' +
        '<div class="fs-thread" data-fs-thread aria-live="polite"></div>' +
        '<form class="fs-composer" data-fs-form novalidate><div class="fs-pop fs-palette" data-fs-palette role="listbox" hidden></div><div class="fs-pop fs-models" data-fs-models hidden></div>' +
        '<div class="fs-composer__box"><label class="sr-only" for="fs-input">پیامت به فندق</label><textarea id="fs-input" data-fs-input rows="1" maxlength="4000" placeholder="از فندق بپرس… «/» برای دستورها، «@» برای بخش‌های رزومه"></textarea>' +
        '<div class="fs-composer__bar"><button type="button" class="fs-model-btn" data-fs-model aria-haspopup="listbox"></button><div class="fs-mode" role="group" aria-label="تغییرهای رزومه"><button type="button" data-fs-mode="ask" title="اول نشانم بده">' + RI.icon('eye') + '</button><button type="button" data-fs-mode="auto" title="خودش انجام بدهد">' + RI.icon('zap') + '</button></div><span class="fs-count" data-fs-count>۰</span><button type="submit" class="fs-send" data-fs-send aria-label="فرستادن">' + RI.icon('chevL') + '</button></div></div></form></section>' +
        '<aside class="fs-inspector" data-fs-inspector aria-label="زمینه و تغییرها"></aside><div class="fs-scrim" data-fs-scrim hidden></div></div>';
    },
    mount(view) {
      const $ = s => view.querySelector(s), thread = $('[data-fs-thread]'), input = $('[data-fs-input]'), root = $('[data-fs]');
      let chats = load(), chat = null, busy = null, palette = [], palIndex = 0, only = new Set(F.SECTIONS.map(s => s[0])), saveTimer = 0, alive = true;
      const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { chats = chats.slice(0, 40); F.store(key(), JSON.stringify(chats)); }, 150); };
      const name = () => F.status?.name || 'فندق';
      const fresh = () => ({ id: uid('c'), title: 'گفت‌وگوی تازه', created: Date.now(), updated: Date.now(), pinned: false, model: F.status?.engine || 'local', messages: [] });
      const current = () => chat || (chat = chats[0] || fresh());
      const modelOf = id => F.model(id) || F.model('local') || { id: 'local', label: 'فندق محلی', cost: 0 };

      /* ---------- Rail: conversations ---------- */
      function paintRail() {
        const q = ($('[data-fs-search]').value || '').trim(), list = chats.filter(c => !q || c.title.includes(q) || c.messages.some(m => m.text.includes(q)));
        const groups = {}; for (const c of [...list.filter(c => c.pinned), ...list.filter(c => !c.pinned)]) (groups[c.pinned ? 'سنجاق‌شده' : when(c.updated)] ||= []).push(c);
        $('[data-fs-chats]').innerHTML = Object.entries(groups).map(([g, items]) => '<div class="fs-chats__group"><b>' + g + '</b>' + items.map((c, i) => '<div class="fs-chat' + (c.id === current().id ? ' is-on' : '') + '" style="--i:' + i + '"><button type="button" class="fs-chat__open" data-fs-chat="' + c.id + '"><span>' + esc(c.title) + '</span><small>' + RI.fa(c.messages.length) + ' پیام · ' + esc(modelOf(c.model).label) + '</small></button><button type="button" class="fs-chat__pin" data-fs-pin="' + c.id + '" aria-pressed="' + c.pinned + '" title="سنجاق">' + RI.icon('pin') + '</button></div>').join('') + '</div>').join('') || '<p class="fs-chats__empty">' + (q ? 'چیزی پیدا نشد.' : 'هنوز گفت‌وگویی نداری؛ اولین سؤالت را بپرس.') + '</p>';
      }
      function open(id) { chat = chats.find(c => c.id === id) || fresh(); paint(); closeDrawers(); input.focus(); }
      function newChat() { if (busy) stop(); chat = fresh(); paint(); input.focus(); }

      /* ---------- Thread ---------- */
      function paint() {
        const c = current();
        $('[data-fs-title]').value = c.title;
        thread.innerHTML = c.messages.length ? c.messages.map(m => message(m)).join('') : empty();
        for (const m of c.messages) if (m.edits?.length) mountEdits(m, false);
        paintRail(); paintModel(); paintInspector(); paintQuota();
        thread.scrollTop = thread.scrollHeight;
      }
      function empty() {
        return '<div class="fs-empty"><img class="fs-empty__cat" src="/brand/fandogh/full.webp" alt="" width="518" height="900" decoding="async"><div class="fs-empty__copy"><span class="fs-kicker">' + RI.icon('sparkle') + 'دستیار رزومهٔ تو</span><h2>سلام! من ' + esc(name()) + ' هستم.</h2><p>رزومه‌ات جلوی چشمم است. بپرس، بخواه بازنویسی کنم، یا یک آگهی را بچسبان تا مقایسه کنیم. هر تغییری قبل از اعمال با «قبل/بعد» نشانت داده می‌شود.</p></div><div class="fs-suggest">' + SUGGEST.map(([icon, t, s], i) => '<button type="button" data-fs-suggest="' + esc(t) + '" style="--i:' + i + '"><i>' + RI.icon(icon) + '</i><b>' + esc(t) + '</b><small>' + esc(s) + '</small></button>').join('') + '</div></div>';
      }
      function message(m) {
        if (m.role === 'user') return '<article class="fs-msg fs-msg--me" data-fs-msg="' + m.id + '"><div class="fs-msg__body">' + esc(m.text).replace(/\n/g, '<br>') + '</div><div class="fs-tools"><span>' + clock(m.time) + '</span><button type="button" data-fs-tool="edit" title="ویرایش و فرستادن دوباره">' + RI.icon('edit') + '</button><button type="button" data-fs-tool="copy" title="کپی">' + RI.icon('copy') + '</button></div></article>';
        const mm = m.model || { label: 'فندق محلی', cost: 0 };
        return '<article class="fs-msg fs-msg--bot' + (m.error ? ' is-error' : '') + '" data-fs-msg="' + m.id + '"><span class="fs-msg__av">' + AVATAR + '</span><div class="fs-msg__main"><header><b>' + esc(name()) + '</b><span class="fs-badge">' + esc(mm.label) + '</span>' + (mm.cost ? '<span class="fs-badge fs-badge--paid" title="' + RI.fa(mm.used || 0) + ' توکن مصرف شد">' + F.paid(mm) + '</span>' : '') + '<time>' + clock(m.time) + '</time></header><div class="fs-msg__body fs-prose">' + (m.stopped ? '<p class="fs-muted">متوقف شد.</p>' : F.format(m.text)) + '</div>' +
          ((m.actions || []).length ? '<div class="fs-acts">' + m.actions.map((a, i) => '<button type="button" class="pet__act" data-fs-act="' + i + '">' + esc(a.label) + '</button>').join('') + '</div>' : '') +
          '<div class="fs-edits" data-fs-edits></div>' +
          ((m.follow || []).length ? '<div class="fs-follow">' + m.follow.map(f => '<button type="button" data-fs-suggest="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div>' : '') +
          '<div class="fs-tools"><button type="button" data-fs-tool="copy" title="کپی">' + RI.icon('copy') + '</button><button type="button" data-fs-tool="retry" title="جواب دوباره با مدل انتخاب‌شده">' + RI.icon('refresh') + '</button><button type="button" data-fs-tool="up" aria-pressed="' + (m.vote === 1) + '" title="خوب بود">' + RI.icon('up') + '</button><button type="button" data-fs-tool="down" aria-pressed="' + (m.vote === -1) + '" title="خوب نبود">' + RI.icon('down') + '</button></div></div></article>';
      }
      function mountEdits(m, live) {
        const host = thread.querySelector('[data-fs-msg="' + m.id + '"] [data-fs-edits]'); if (!host) return;
        if (!live && m.editState) { host.innerHTML = '<p class="fs-muted">' + RI.icon('edit') + (m.editState === 'applied' ? RI.fa(m.edits.length) + ' تغییر در این پیام اعمال شد.' : 'این تغییرها اعمال نشد.') + '</p>'; return; }
        F.editCard(host, m.edits, live ? F.editMode() : 'ask', {
          applied: picked => { m.editState = 'applied'; m.applied = picked.map(e => e.label + (e.after ? ' ← ' + e.after.slice(0, 50) : '')); save(); paintInspector(); RI.pet?.cat?.play('celebrate'); },
          undone: () => { m.editState = 'undone'; save(); paintInspector(); },
          note: () => { m.editState = 'skipped'; save(); },
        });
      }
      function reveal(article) {
        if (calm.matches || !article) return;
        article.querySelectorAll('.fs-prose > *').forEach((el, i) => { el.style.setProperty('--i', i); el.classList.add('fs-in'); });
      }

      /* ---------- Asking ---------- */
      async function send(text, opts = {}) {
        text = text.trim(); if (!text || busy) return;
        const c = current(), model = opts.model || c.model;
        if (!chats.includes(c)) chats.unshift(c);
        if (c.title === 'گفت‌وگوی تازه') c.title = text.replace(/\s+/g, ' ').slice(0, 40);
        if (!opts.retry) c.messages.push({ id: uid('m'), role: 'user', text, time: Date.now() });
        c.updated = Date.now(); chats = [c, ...chats.filter(x => x !== c)]; save();
        if (thread.querySelector('.fs-empty')) thread.innerHTML = '';
        if (!opts.retry) thread.insertAdjacentHTML('beforeend', message(c.messages.at(-1)));
        const m = modelOf(model);
        thread.insertAdjacentHTML('beforeend', '<div class="fs-typing" data-fs-typing><span class="fs-msg__av">' + AVATAR + '</span><div><b>' + esc(name()) + ' دارد فکر می‌کند</b><small>' + esc(m.label) + (m.cost ? ' · ' + F.cost(m) : '') + '</small></div><span class="fs-orbit" aria-hidden="true"><i></i><i></i><i></i></span></div>');
        thread.scrollTo({ top: thread.scrollHeight, behavior: calm.matches ? 'auto' : 'smooth' });
        busy = new AbortController(); root.classList.add('is-busy'); paintSend(); paintRail();
        const history = c.messages.filter(x => !x.error && !x.stopped).slice(-11, -1).map(x => ({ role: x.role === 'user' ? 'user' : 'assistant', text: x.text }));
        let reply = null, error = null;
        try { reply = await F.ask(text, { model, history, only, signal: busy.signal }); } catch (e) { error = e; }
        if (!alive) return;
        thread.querySelector('[data-fs-typing]')?.remove(); busy = null; root.classList.remove('is-busy'); paintSend();
        const out = { id: uid('m'), role: 'assistant', time: Date.now() };
        if (reply) Object.assign(out, { text: reply.text, model: reply.model, actions: reply.actions || [], follow: reply.follow || [], edits: reply.edits || [] });
        else if (error?.code === 'ABORTED') Object.assign(out, { text: '', stopped: true });
        else Object.assign(out, { text: error?.message || 'الان نتوانستم جواب بدهم؛ کمی بعد دوباره بپرس.', error: true, actions: error?.code === 'FANDOGH_BALANCE' ? [{ kind: 'route', route: 'assistant', tab: 'wallet', label: 'شارژ کیف پول فندق' }, { kind: 'model', label: 'بپرس از فندق محلی (رایگان)', value: 'local' }] : error?.code === 'ASSISTANT_LIMIT' ? [{ kind: 'model', label: 'بپرس از فندق محلی (رایگان)', value: 'local' }, { kind: 'route', route: 'billing', label: 'اشتراک و دستیار' }] : [] });
        c.messages.push(out); c.messages = c.messages.slice(-80); c.updated = Date.now(); save();
        thread.insertAdjacentHTML('beforeend', message(out));
        const article = thread.querySelector('[data-fs-msg="' + out.id + '"]'); reveal(article);
        if (out.edits?.length) mountEdits(out, true);
        thread.scrollTo({ top: thread.scrollHeight, behavior: calm.matches ? 'auto' : 'smooth' });
        paintRail(); paintQuota(); paintInspector();
      }
      function stop() { busy?.abort(); }
      function lastUserText(before) { const list = current().messages, i = before ? list.findIndex(x => x.id === before) : list.length; for (let j = i - 1; j >= 0; j--) if (list[j].role === 'user') return list[j].text; return ''; }

      /* ---------- Model picker, quota and send button ---------- */
      function paintModel() {
        const m = modelOf(current().model);
        $('[data-fs-model]').innerHTML = RI.icon('sparkle') + '<b>' + esc(m.label) + '</b><em class="' + (m.cost ? '' : 'is-free') + '">' + F.cost(m) + '</em>' + RI.icon('chevD');
        view.querySelectorAll('[data-fs-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fsMode === F.editMode())));
      }
      function paintModels() {
        const box = $('[data-fs-models]'), list = F.status?.models || [];
        // Grouped by maker; a model above the person's plan shows the plan that opens it and leads to the plans.
        let i = 0;
        box.innerHTML = '<header><b>کدام مدل جواب بدهد؟</b><small>قیمت برای یک پیام معمولی (۱۰٬۰۰۰ توکن) است و دقیقش بعد از جواب از کیف پول فندق کم می‌شود. اشتراک تو: ' + esc(F.status?.planName || 'رایگان') + '</small></header>' + F.groups(list).map(([group, items]) => '<div class="fs-modelgroup"><b class="fs-modelgroup__name">' + esc(group) + '</b>' + items.map(m => '<button type="button" class="fs-modelcard' + (m.id === current().model ? ' is-on' : '') + (m.locked ? ' is-locked' : '') + '" data-fs-pick="' + m.id + '" style="--i:' + (i++) + '"' + (m.available || m.locked ? '' : ' disabled') + '><span><b>' + esc(m.label) + '</b><small>' + esc(m.note || '') + (m.million ? ' · ' + F.rate(m) : '') + '</small><span class="fset-tags">' + (m.tags || []).map(t => '<i>' + esc(t) + '</i>').join('') + '</span></span><em class="' + (m.cost ? '' : 'is-free') + (m.locked ? ' is-lock' : '') + '">' + (m.locked ? RI.icon('lock') + F.tier(m.tier) : m.available ? F.cost(m) : 'در دسترس نیست') + '</em></button>').join('') + '</div>').join('') + '<a href="' + RI.routeUrl('assistant') + '" data-go="assistant">' + RI.icon('sliders') + 'اشتراک‌ها، مدل پیش‌فرض و کلید خودت</a>';
      }
      function paintQuota() {
        const s = F.status; if (!s?.wallet) return; const m = modelOf(current().model), w = s.wallet;
        const box = $('[data-fs-quota]'), low = m.cost && w.toman < m.cost;
        box.innerHTML = '<i class="fs-coin" aria-hidden="true">' + RI.icon('card') + '</i><span>' + F.money(w.toman) + '</span><small>' + (m.cost ? F.cost(m) + ' برای هر پیام' : F.tokens(w.tokens)) + '</small>';
        box.title = 'کیف پول فندق: ' + F.money(w.toman) + ' (' + F.tokens(w.tokens) + ')'; box.classList.toggle('is-low', !!low);
      }
      function paintSend() {
        const b = $('[data-fs-send]'); b.classList.toggle('is-stop', !!busy); b.innerHTML = busy ? RI.icon('x') : RI.icon('chevL'); b.setAttribute('aria-label', busy ? 'توقف جواب' : 'فرستادن');
        $('[data-fs-count]').textContent = RI.fa(input.value.length) + (input.value.length > 3500 ? ' / ۴۰۰۰' : '');
      }

      /* ---------- Inspector: score, what Fandogh sees, changes in this conversation ---------- */
      function paintInspector() {
        const B = window.ResumeBrain, sc = B ? B.score(RI.C(), { goal: F.goal() }) : null, c = RI.C();
        const applied = current().messages.filter(m => m.editState === 'applied' && m.applied).flatMap(m => m.applied.map(t => [m.id, t]));
        $('[data-fs-inspector]').innerHTML = '<div class="fs-inspector__head"><b>زمینه و تغییرها</b><button type="button" class="fs-icon fs-close" data-fs-hide="inspector" aria-label="جمع کردن زمینه و تغییرها" title="جمع کردن (Ctrl+Shift+B)">' + RI.icon(wide('inspector') ? 'chevL' : 'x') + '</button></div>' +
          (sc ? '<section class="fs-card fs-score"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="42" pathLength="100" style="--v:' + sc.total + '"/></svg><div><b>' + RI.fa(sc.total) + '</b><span>' + esc(sc.label) + '</span>' + (sc.role ? '<small>نقش: ' + esc(sc.role.label) + '</small>' : '') + '</div></section>' : '') +
          '<section class="fs-card"><h3>' + RI.icon('eye') + 'فندق چه چیزهایی را می‌بیند</h3><div class="fs-sections">' + F.SECTIONS.map(([k, label]) => { const n = k === 'profile' ? [c.profile.title, c.profile.bio].filter(Boolean).length : (c[k] || []).length; return '<label><input type="checkbox" data-fs-only="' + k + '"' + (only.has(k) ? ' checked' : '') + '><span>' + esc(label) + '<small>' + RI.fa(n) + '</small></span></label>'; }).join('') + '</div><p class="fs-muted">راه‌های تماس هیچ‌وقت فرستاده نمی‌شوند.</p></section>' +
          '<section class="fs-card"><h3>' + RI.icon('edit') + 'تغییرهای این گفت‌وگو</h3>' + (applied.length ? '<ol class="fs-changes">' + applied.map(([id, t], i) => '<li style="--i:' + i + '"><span>' + esc(t) + '</span><button type="button" data-fs-jump="' + id + '">' + RI.icon('eye') + '</button></li>').join('') + '</ol>' : '<p class="fs-muted">هنوز تغییری نداده‌ایم. بگو «بازنویسی کن» یا «درستش کن».</p>') + '</section>' +
          '<section class="fs-card fs-links"><a href="' + RI.routeUrl('resume') + '" data-go="resume">' + RI.icon('resume') + 'ویرایشگر رزومه</a><a href="' + RI.routeUrl('studio') + '" data-go="studio">' + RI.icon('check') + 'آمادگی انتشار</a><a href="' + RI.routeUrl('assistant') + '" data-go="assistant">' + RI.icon('sliders') + 'تنظیمات فندق</a></section>';
      }

      /* ---------- Composer: autosize, «/» commands, «@» sections ---------- */
      function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 220) + 'px'; paintSend(); }
      function paintPalette() {
        const v = input.value, at = /(^|\s)@([^\s@]*)$/.exec(v.slice(0, input.selectionStart)), slash = /^\/(\S*)$/.exec(v.trim());
        if (slash) palette = COMMANDS.filter(c => c[0].startsWith(slash[1])).map(c => ({ kind: 'cmd', c }));
        else if (at) palette = F.SECTIONS.filter(s => s[1].includes(at[2])).map(s => ({ kind: 'at', s, q: at[2] }));
        else palette = [];
        const box = $('[data-fs-palette]'); box.hidden = !palette.length; palIndex = Math.min(palIndex, Math.max(0, palette.length - 1));
        box.innerHTML = palette.map((p, i) => '<button type="button" role="option" data-fs-pal="' + i + '" aria-selected="' + (i === palIndex) + '" style="--i:' + i + '">' + (p.kind === 'cmd' ? RI.icon(p.c[3]) + '<b>/' + esc(p.c[0]) + '</b><small>' + esc(p.c[1]) + '</small>' : RI.icon('layers') + '<b>@' + esc(p.s[1]) + '</b><small>اشاره به این بخش رزومه</small>') + '</button>').join('');
      }
      function pick(i) {
        const p = palette[i]; if (!p) return;
        if (p.kind === 'cmd') { if (!p.c[2]) { current().messages = []; current().title = 'گفت‌وگوی تازه'; save(); input.value = ''; paint(); } else { input.value = p.c[2]; if (!p.c[2].endsWith('\n')) { send(input.value); input.value = ''; } } }
        else { const pos = input.selectionStart, before = input.value.slice(0, pos).replace(/@([^\s@]*)$/, '@' + p.s[1] + ' '); input.value = before + input.value.slice(pos); only.add(p.s[0]); paintInspector(); }
        palette = []; $('[data-fs-palette]').hidden = true; grow(); input.focus();
      }
      function closeDrawers() { root.classList.remove('is-rail', 'is-inspector'); $('[data-fs-scrim]').hidden = true; }
      // Wide screens fold a pane into the grid; narrow ones open or close it as a drawer.
      function wide(pane) { return matchMedia(pane === 'rail' ? '(min-width: 900px)' : '(min-width: 1280px)').matches; }
      function paintFolds() {
        for (const pane of ['rail', 'inspector']) { const folded = root.classList.contains('is-' + pane + '-folded'), btn = $('.fs-bar [data-fs-open=' + pane + ']'); btn.setAttribute('aria-pressed', String(wide(pane) && !folded)); btn.classList.toggle('is-folded', wide(pane) && folded); }
      }
      function fold(pane, hide) {
        if (!wide(pane)) { if (hide) closeDrawers(); else { root.classList.add('is-' + pane); $('[data-fs-scrim]').hidden = false; } return; }
        const on = hide ?? !root.classList.contains('is-' + pane + '-folded');
        root.classList.toggle('is-' + pane + '-folded', on);
        // The pane that comes back slides in; the conversation settles into its new width.
        if (!calm.matches) { const el = $(pane === 'rail' ? '[data-fs-rail]' : '[data-fs-inspector]'), main = $('.fs-main'); if (!on) { el.classList.remove('fs-pane-in'); void el.offsetWidth; el.classList.add('fs-pane-in'); } main.classList.remove('fs-widen'); void main.offsetWidth; main.classList.add('fs-widen'); }
        F.store(foldKey(), JSON.stringify({ rail: root.classList.contains('is-rail-folded'), inspector: root.classList.contains('is-inspector-folded') }));
        paintFolds();
      }
      const foldKey = () => 'ri-fandogh-folds-' + RI.ownerId;
      try { const saved = JSON.parse(F.store(foldKey()) || '{}'); root.classList.toggle('is-rail-folded', !!saved.rail); root.classList.toggle('is-inspector-folded', !!saved.inspector); } catch {}

      /* ---------- Events ---------- */
      input.addEventListener('input', () => { grow(); paintPalette(); });
      input.addEventListener('keydown', e => {
        if (!$('[data-fs-palette]').hidden && palette.length) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palIndex = (palIndex + (e.key === 'ArrowDown' ? 1 : -1) + palette.length) % palette.length; paintPalette(); return; }
          if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(palIndex); return; }
          if (e.key === 'Escape') { e.preventDefault(); $('[data-fs-palette]').hidden = true; return; }
        }
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('[data-fs-form]').requestSubmit(); }
      });
      $('[data-fs-form]').addEventListener('submit', e => { e.preventDefault(); if (busy) { stop(); return; } const t = input.value; if (!t.trim()) return; input.value = ''; grow(); send(t); });
      $('[data-fs-title]').addEventListener('change', e => { const c = current(); c.title = e.target.value.trim() || 'گفت‌وگوی تازه'; if (!chats.includes(c)) chats.unshift(c); save(); paintRail(); });
      $('[data-fs-search]').addEventListener('input', paintRail);
      root.addEventListener('click', e => {
        const t = e.target.closest('button,a'); if (!t) { if (!e.target.closest('[data-fs-models],[data-fs-model]')) $('[data-fs-models]').hidden = true; return; }
        if (!t.closest('[data-fs-models]') && !t.matches('[data-fs-model]')) $('[data-fs-models]').hidden = true;
        if (t.matches('[data-fs-new]')) newChat();
        else if (t.dataset.fsChat) open(t.dataset.fsChat);
        else if (t.dataset.fsPin) { const c = chats.find(x => x.id === t.dataset.fsPin); if (c) { c.pinned = !c.pinned; save(); paintRail(); } }
        else if (t.dataset.fsSuggest) { if (/آگهی/.test(t.dataset.fsSuggest)) { input.value = COMMANDS.find(c => c[0] === 'آگهی')[2]; grow(); input.focus(); } else send(t.dataset.fsSuggest); }
        else if (t.matches('[data-fs-model]')) { paintModels(); const box = $('[data-fs-models]'); box.hidden = !box.hidden; }
        else if (t.dataset.fsPick && modelOf(t.dataset.fsPick).locked) { const m = modelOf(t.dataset.fsPick); RI.toast('«' + m.label + '» با اشتراک «' + F.tier(m.tier) + '» فندق یا اشتراک رزومیت باز می‌شود', { kind: 'info' }); RI.go('assistant', { tab: 'plans' }); }
        else if (t.dataset.fsPick) { current().model = t.dataset.fsPick; save(); $('[data-fs-models]').hidden = true; paintModel(); paintQuota(); paintRail(); RI.toast('از این به بعد در این گفت‌وگو «' + modelOf(t.dataset.fsPick).label + '» جواب می‌دهد', { kind: 'info' }); }
        else if (t.dataset.fsMode) { F.setEditMode(t.dataset.fsMode); paintModel(); RI.toast(t.dataset.fsMode === 'auto' ? 'فندق تغییرها را خودش انجام می‌دهد و می‌توانی برگردانی' : 'فندق اول تغییرها را نشانت می‌دهد', { kind: 'info' }); }
        else if (t.dataset.fsPal) pick(Number(t.dataset.fsPal));
        else if (t.dataset.fsAct) { const id = t.closest('[data-fs-msg]').dataset.fsMsg, m = current().messages.find(x => x.id === id), a = m?.actions?.[Number(t.dataset.fsAct)]; if (!a) return;
          if (a.kind === 'model') { current().model = a.value; save(); paintModel(); send(lastUserText(id), { retry: false, model: a.value }); }
          else if (a.kind === 'route') RI.go(a.route, a.tab ? { tab: a.tab } : undefined);
          else if (a.kind === 'go') RI.go('resume', { step: a.section });
          else if (a.kind === 'tab') RI.petOpen?.(a.tab); }
        else if (t.dataset.fsTool) { const art = t.closest('[data-fs-msg]'), m = current().messages.find(x => x.id === art.dataset.fsMsg); if (!m) return; const k = t.dataset.fsTool;
          if (k === 'copy') navigator.clipboard?.writeText(m.text).then(() => RI.toast('کپی شد', { kind: 'success' }));
          else if (k === 'edit') { input.value = m.text; grow(); input.focus(); }
          else if (k === 'retry') send(lastUserText(m.id), { retry: true });
          else if (k === 'up' || k === 'down') { m.vote = m.vote === (k === 'up' ? 1 : -1) ? 0 : (k === 'up' ? 1 : -1); save(); art.querySelectorAll('[data-fs-tool=up],[data-fs-tool=down]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.fsTool === 'up' ? 1 : -1) === m.vote))); if (m.vote === 1) RI.pet?.cat?.play('purr'); } }
        else if (t.dataset.fsJump) { const el = thread.querySelector('[data-fs-msg="' + t.dataset.fsJump + '"]'); el?.scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'center' }); el?.classList.add('fs-flash'); setTimeout(() => el?.classList.remove('fs-flash'), 1400); closeDrawers(); }
        else if (t.matches('[data-fs-export]')) { const c = current(), md = '# ' + c.title + '\n\n' + c.messages.map(m => (m.role === 'user' ? '**تو:** ' : '**' + name() + (m.model ? ' (' + m.model.label + ')' : '') + ':** ') + (m.text || '(متوقف شد)')).join('\n\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' })); a.download = (c.title || 'fandogh').replace(/[\\/:*?"<>|]/g, '') + '.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
        else if (t.matches('[data-fs-delete]')) { const c = current(); if (!c.messages.length || confirm('این گفت‌وگو حذف شود؟')) { chats = chats.filter(x => x !== c); chat = null; save(); paint(); } }
        else if (t.dataset.fsOpen) fold(t.dataset.fsOpen, wide(t.dataset.fsOpen) ? undefined : false);
        else if (t.dataset.fsHide) fold(t.dataset.fsHide, true);
      });
      root.addEventListener('change', e => { if (e.target.dataset.fsOnly) { if (e.target.checked) only.add(e.target.dataset.fsOnly); else only.delete(e.target.dataset.fsOnly); } });
      $('[data-fs-scrim]').addEventListener('click', closeDrawers);
      const keys = e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); newChat(); }
        else if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); input.focus(); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); fold(e.shiftKey ? 'inspector' : 'rail', wide(e.shiftKey ? 'inspector' : 'rail') ? undefined : !root.classList.contains('is-' + (e.shiftKey ? 'inspector' : 'rail'))); }
        else if (e.key === 'Escape' && busy) stop();
      };
      document.addEventListener('keydown', keys);
      const onStatus = () => { paintModel(); paintQuota(); };
      document.addEventListener('ri:fandogh-status', onStatus);
      paint(); grow(); paintFolds();
      const onResize = () => { paintFolds(); paintInspector(); };
      const sizes = [matchMedia('(min-width: 900px)'), matchMedia('(min-width: 1280px)')]; sizes.forEach(q => q.addEventListener('change', onResize));
      F.refresh().then(() => { if (!alive) return; const c = current(); if (!c.messages.length && !chats.includes(c)) c.model = F.status.engine || 'local'; paint(); }).catch(() => {});
      return () => { alive = false; busy?.abort(); document.removeEventListener('keydown', keys); document.removeEventListener('ri:fandogh-status', onStatus); sizes.forEach(q => q.removeEventListener('change', onResize)); clearTimeout(saveTimer); F.store(key(), JSON.stringify(chats.slice(0, 40))); };
    }
  });
})();
