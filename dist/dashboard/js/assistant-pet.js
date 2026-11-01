/* Resume assistant as a companion. On desktop Fandogh (fandogh.js) leans out from the bottom-left corner, now and
   then says something about what you are doing (free, local, rate-limited) and opens a panel with chat (server,
   counted against the daily allowance), the resume score and, on the resume page, the full text review.
   Phones get no cat: the same panel opens as a sheet from «فندق» in the menu. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc, brain = () => window.ResumeBrain;
  const calm = matchMedia('(prefers-reduced-motion: reduce)'), wide = matchMedia('(min-width: 1024px)');
  const store = (key, value) => { try { if (value === undefined) return localStorage.getItem(key); if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {} return null; };
  const AVATAR = '<img class="pet__avatar" src="/brand/fandogh/avatar.webp" alt="" width="64" height="64" decoding="async">';
  let root, cat = null, panel, status = null, history = [], chat = [], tab = 'chat', open = false, busy = false, lastTip = 0, tipsShown = 0, reviewHost = null, typingTimer = 0, opener = null;
  const goal = () => store('ri-pet-goal-' + RI.ownerId) || '';
  const muted = () => store('ri-pet-muted') === '1';
  // How Fandogh's own resume edits land: «ask» shows them with before/after first, «auto» applies them and offers undo.
  const editMode = () => RI.Fandogh.editMode();

  /* ---------- Shell ---------- */
  function build() {
    root = document.createElement('div'); root.className = 'pet';
    root.innerHTML = '<div class="pet__stage"></div>' +
      '<section class="pet__panel" id="pet-panel" role="dialog" aria-label="فندق، دستیار رزومه" hidden>' +
      '<header class="pet__head"><span class="pet__face">' + AVATAR + '</span><div class="pet__title"><b>فندق <span>دستیار رزومه</span></b><div class="pet__quota"><i data-pet-quota></i></div><small data-pet-usage>در حال آماده‌سازی…</small></div>' +
      '<button type="button" class="pet__icon" data-pet-studio title="باز کردن در صفحهٔ کامل">' + RI.icon('external') + '</button>' +
      '<button type="button" class="pet__icon" data-pet-settings title="تنظیمات فندق">' + RI.icon('settings') + '</button>' +
      '<button type="button" class="pet__icon" data-pet-mute title="پیام‌های خودکار فندق" aria-pressed="false">' + RI.icon('bell') + '</button>' +
      '<button type="button" class="pet__icon" data-pet-tuck title="فندق پشت دیوار برود">' + RI.icon('eyeOff') + '</button>' +
      '<button type="button" class="pet__icon" data-pet-close aria-label="بستن">' + RI.icon('x') + '</button></header>' +
      '<nav class="pet__tabs" role="tablist" aria-label="بخش‌های دستیار"><span class="pet__ink" aria-hidden="true"></span><button type="button" role="tab" data-pet-tab="chat">' + RI.icon('sparkle') + 'گفت‌وگو</button><button type="button" role="tab" data-pet-tab="score">' + RI.icon('chart') + 'امتیاز</button><button type="button" role="tab" data-pet-tab="review">' + RI.icon('check') + 'بررسی متن</button></nav>' +
      '<div class="pet__view" data-pet-view="chat"><div class="pet__log" data-pet-log aria-live="polite"></div><div class="pet__chips" data-pet-chips></div><div class="pet__mode" role="group" aria-label="وقتی فندق رزومه را تغییر می‌دهد"><span>تغییرهای فندق</span><button type="button" data-pet-mode="ask">' + RI.icon('eye') + 'اول نشانم بده</button><button type="button" data-pet-mode="auto">' + RI.icon('zap') + 'خودش انجام بدهد</button></div><form class="pet__ask" data-pet-form><label class="sr-only" for="pet-input">سؤالت از فندق</label><input id="pet-input" class="input" maxlength="500" autocomplete="off" placeholder="بپرس یا بگو چه کاره‌ای…"><button type="submit" class="pet__send" aria-label="فرستادن">' + RI.icon('chevL') + '</button></form></div>' +
      '<div class="pet__view pet__score" data-pet-view="score" hidden></div><div class="pet__view pet__review" data-pet-view="review" hidden></div></section>';
    document.body.append(root);
    panel = root.querySelector('.pet__panel');
    root.querySelector('[data-pet-close]').addEventListener('click', () => toggle(false));
    root.querySelector('[data-pet-tuck]').addEventListener('click', () => { toggle(false); cat?.tuck(true); RI.toast('فندق پشت دیوار رفت؛ هر وقت خواستی روی گوشش کلیک کن', { kind: 'info' }); });
    const mute = root.querySelector('[data-pet-mute]');
    mute.setAttribute('aria-pressed', String(muted()));
    mute.addEventListener('click', () => { const on = !muted(); store('ri-pet-muted', on ? '1' : null); mute.setAttribute('aria-pressed', String(on)); RI.toast(on ? 'فندق دیگر خودش پیام نمی‌دهد' : 'فندق گاهی پیشنهاد می‌دهد', { kind: 'info' }); });
    root.addEventListener('click', onClick);
    root.querySelector('[data-pet-studio]').addEventListener('click', () => { toggle(false); RI.go('fandogh'); });
    root.querySelector('[data-pet-settings]').addEventListener('click', () => { toggle(false); RI.go('assistant'); });
    document.addEventListener('ri:fandogh-status', e => { status = e.detail; paintUsage(); });
    paintMode();
    root.querySelector('[data-pet-form]').addEventListener('submit', e => { e.preventDefault(); const input = root.querySelector('#pet-input'), q = input.value.trim(); if (!q) return; input.value = ''; flyout(); ask(q); });
    // Escape closes the innermost thing first: an open tooltip inside the panel, then the panel itself.
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !e.defaultPrevented && !root.querySelector('.pet__panel [role=tooltip]:not([hidden])')) { toggle(false); } });
    RI.delegate(document, 'click', '[data-pet-open]', () => { if (RI.$('#sidebar')?.dataset.open === 'true') RI.$('#scrim')?.click(); opener = document.activeElement; toggle(true); });
    mountCat(); wide.addEventListener('change', mountCat);
    menuEntry(); new MutationObserver(menuEntry).observe(RI.$('#sidebar') || document.body, { childList: true, subtree: true });
    select('chat');
  }

  // The cat only exists on wide screens; narrower windows keep the panel and the menu entry.
  function mountCat() {
    if (cat || !wide.matches || !window.Fandogh) return;
    cat = Fandogh.mount(root.querySelector('.pet__stage'), { label: 'فندق، دستیار رزومه', ignore: root, onClick: () => { opener = cat.hit; toggle(); }, onTuck: on => store('ri-pet-tucked', on ? '1' : null) });
    cat.hit.setAttribute('aria-controls', 'pet-panel'); cat.hit.setAttribute('aria-expanded', 'false');
    if (store('ri-pet-tucked') === '1') cat.tuck(true);
  }
  function menuEntry() {
    const nav = RI.$('#sidebar .dn-nav'); if (!nav || nav.querySelector('[data-pet-open]')) return;
    nav.insertAdjacentHTML('beforeend', '<div class="dn-group dn-group--pet"><ul><li><button type="button" class="dn-item dn-item--pet" data-pet-open><span class="dn-item__ico">' + AVATAR + '</span><span class="dn-item__txt">پنجرهٔ سریع فندق</span></button></li></ul></div>');
  }

  /* ---------- Speech: proactive, local, rate-limited ---------- */
  function say(text, actions = [], { force = false } = {}) {
    if (!cat || cat.state.tucked) return false;
    if (!force && (open || muted() || Date.now() - lastTip < 40000 || tipsShown >= 6)) return false;
    lastTip = Date.now(); tipsShown++;
    cat.say(text, { actions, onAction: i => act(actions[i]) });
    if (!open) cat.dot(true);
    return true;
  }

  function contextTip(page) {
    const B = brain(); if (!B || open) return;
    const c = RI.C(), typos = B.spelling(c);
    if (page === 'resume' && typos.length) return say('«' + typos[0].wrong + '» در ' + typos[0].where + ' احتمالاً «' + typos[0].right + '» است.', [{ kind: 'fix', label: 'درستش کن', primary: true, wrong: typos[0].wrong, value: typos[0].right }]);
    const sc = B.score(c, { goal: goal() }), weak = sc.dims.slice().sort((a, b) => a.value - b.value)[0];
    const tips = {
      home: weak.reasons[0] ? 'رزومه‌ات ' + RI.fa(sc.total) + ' از ۱۰۰ است. قدم بعدی: ' + weak.reasons[0] + '.' : 'رزومه‌ات ' + RI.fa(sc.total) + ' از ۱۰۰ است؛ آفرین!',
      resume: weak.reasons[0] ? 'برای قوی‌تر شدن «' + weak.label + '»: ' + weak.reasons[0] + '.' : 'رزومه‌ات خوب پیش می‌رود؛ اگر سؤالی داری بپرس.',
      themes: sc.role ? 'برای «' + sc.role.label + '» قالب خوانا با رنگ آرام بهتر جواب می‌دهد.' : 'قالب را عوض کن؛ محتوایت سر جایش می‌ماند.',
      publish: 'قبل از انتشار، آدرس کوتاه و به‌یادماندنی انتخاب کن؛ مثل نام و نام خانوادگی.',
      links: 'مهم‌ترین لینک را اول بگذار؛ بیشتر کلیک‌ها مال لینک اول است.',
      stats: 'اگر بازدید داری ولی پیام نه، یک دعوت روشن به همکاری در معرفی‌ات بنویس.',
    };
    if (tips[page]) say(tips[page], page === 'home' || page === 'resume' ? [{ kind: 'open', label: 'بیشتر بپرس', primary: true }] : []);
  }
  // Watches the page and the field being edited; speaks only after the user pauses.
  function watch() {
    new MutationObserver(() => { clearTimeout(watch.t); watch.t = setTimeout(() => contextTip(document.body.dataset.page), 2500); }).observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
    setTimeout(() => contextTip(document.body.dataset.page), 7000);
    document.addEventListener('focusin', e => {
      const field = e.target.closest?.('[data-p]'); if (!field || open) return;
      const hints = { bio: 'معرفی را دو تا سه جمله بنویس: چه کاری می‌کنی، در چه زمینه‌ای، و دنبال چه فرصتی هستی.', title: 'عنوان یک خط کوتاه است؛ مثل «طراح رابط کاربری» یا «توسعه‌دهندهٔ فرانت‌اند».' };
      const hint = hints[field.dataset.p]; if (hint) say(hint);
    });
    document.addEventListener('input', e => {
      if (!e.target.matches?.('input,textarea') || e.target.closest('.pet')) return;
      clearTimeout(typingTimer); typingTimer = setTimeout(() => {
        const B = brain(); if (!B) return; const value = e.target.value || '';
        const slip = B.spelling({ profile: { title: value } })[0];
        if (slip) say('«' + slip.wrong + '» را درست نوشتی؟ شاید «' + slip.right + '».', [{ kind: 'fix', label: 'درستش کن', primary: true, wrong: slip.wrong, value: slip.right }]);
      }, 2200);
    });
    RI.on?.('save', () => { if (RI.state?.ui?.saveError) cat?.mood('sad', 1600); });
  }

  /* ---------- Panel ---------- */
  function toggle(force) {
    open = force === undefined ? !open : force;
    root.classList.toggle('is-open', open); cat?.hit.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!opener) opener = document.activeElement;
      panel.hidden = false; cat?.dot(false); cat?.hold(true); cat?.away(true); cat?.mood('happy', 1200);
      refresh(); if (!chat.length) greet(); select(tab);
      setTimeout(() => root.querySelector(tab === 'chat' ? '#pet-input' : '[data-pet-tab][aria-selected=true]')?.focus({ preventScroll: true }), 260);
    } else {
      cat?.away(false); cat?.hold(false);
      setTimeout(() => { if (!open) panel.hidden = true; }, calm.matches ? 0 : 300);
      const back = opener; opener = null; if (back?.isConnected && panel.contains(document.activeElement)) back.focus({ preventScroll: true });
    }
  }
  function select(id) {
    if (id === 'review' && !reviewHost) id = 'chat';
    tab = id;
    root.querySelectorAll('[data-pet-tab]').forEach(b => { const on = b.dataset.petTab === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (b.dataset.petTab === 'review') b.hidden = !reviewHost; });
    root.querySelectorAll('[data-pet-view]').forEach(v => { v.hidden = v.dataset.petView !== id; });
    if (id === 'score') paintScore();
    if (id === 'review' && reviewHost && reviewHost.parentElement !== root.querySelector('[data-pet-view=review]')) root.querySelector('[data-pet-view=review]').append(reviewHost);
    requestAnimationFrame(ink);
  }
  // The highlight under the tabs slides to the selected one.
  function ink() {
    const on = root.querySelector('[data-pet-tab][aria-selected=true]'), bar = root.querySelector('.pet__ink'); if (!on || !bar || !on.offsetWidth) return;
    bar.style.width = on.offsetWidth + 'px'; bar.style.transform = 'translateX(' + on.offsetLeft + 'px)';
  }
  function greet() { const B = brain(); if (!B) return; const o = B.opening(RI.C(), { goal: goal() }); push('bot', 'میو! من فندق هستم. ' + o.text.replace(/^سلام[^!]*!\s*/, ''), o.actions, o.follow); }
  function push(who, text, actions = [], follow = []) {
    const m = { id: 'm' + chat.length, who, text, actions, follow }; chat.push(m); if (chat.length > 50) chat.shift();
    const log = root.querySelector('[data-pet-log]'), words = esc(text).split(/(\s+)/);
    const body = who === 'bot' && !calm.matches ? words.map((w, i) => /^\s+$/.test(w) ? w.replace(/\n/g, '<br>') : '<span class="pet-w" style="--i:' + Math.min(i >> 1, 60) + '">' + w + '</span>').join('') : esc(text).replace(/\n/g, '<br>');
    log.insertAdjacentHTML('beforeend', '<div class="pet-msg pet-msg--' + who + '" data-msg="' + m.id + '">' + (who === 'bot' ? '<span class="pet-msg__av">' + AVATAR + '</span>' : '') + '<div class="pet-msg__body"><p>' + body + '</p>' + (actions.length ? '<div class="pet__acts">' + actions.map((a, i) => '<button type="button" class="pet__act pet__act--' + a.kind + '" data-msg-act="' + m.id + ':' + i + '" style="--i:' + i + '">' + esc(a.label) + '</button>').join('') + '</div>' : '') + '</div></div>');
    root.querySelector('[data-pet-chips]').innerHTML = (follow || []).map((f, i) => '<button type="button" class="pet__chip" data-ask="' + esc(f) + '" style="--i:' + i + '">' + esc(f) + '</button>').join('');
    log.scrollTo({ top: log.scrollHeight, behavior: calm.matches ? 'auto' : 'smooth' });
    history.push({ role: who === 'me' ? 'user' : 'assistant', text });
    if (history.length > 12) history.splice(0, history.length - 12);
  }
  function flyout() { const b = root.querySelector('.pet__send'); b.classList.remove('is-sent'); void b.offsetWidth; b.classList.add('is-sent'); }
  // Small talk (greetings, how-are-you, date and time…) is answered on the spot: no server call, no allowance used.
  const REACT = { joke: 'laugh', laugh: 'laugh', love: 'purr', thanks: 'purr', greet: 'purr', moodgood: 'celebrate', rude: 'surprise' };
  let lastQuestion = '';
  async function ask(question, model) {
    if (busy) return; busy = true; lastQuestion = question; push('me', question); cat?.mood('think'); root.classList.add('is-busy');
    const log = root.querySelector('[data-pet-log]'); log.insertAdjacentHTML('beforeend', '<div class="pet-msg pet-msg--bot pet-msg--typing"><span class="pet-msg__av">' + AVATAR + '</span><div class="pet-msg__body"><i></i><i></i><i></i></div></div>'); log.scrollTop = log.scrollHeight;
    // Same reading as the server, with the conversation so far; identity questions always stay here. When the owner
    // paused Fandogh or wants small talk answered by the model too, the server decides.
    const B = brain(), said = B?.reply ? B.reply(question, RI.C(), { goal: goal(), history: history.slice(0, -1) }) : B?.chat?.(question, RI.C(), { goal: goal() });
    const mine = said && said.intent === 'smalltalk' && (said.topics || [said.topic]).some(t => ['name', 'model', 'bot', 'maker'].includes(t));
    const local = !model && said && said.intent === 'smalltalk' && status?.enabled !== false && (mine || !status?.smalltalk) ? said : null;
    if (local) {
      await new Promise(r => setTimeout(r, calm.matches ? 0 : 450 + Math.min(700, local.text.length * 6)));
      log.querySelector('.pet-msg--typing')?.remove(); push('bot', local.text, local.actions, local.follow);
      cat?.mood(local.topic === 'moodbad' || local.topic === 'rude' ? 'sad' : 'happy', 1300); if (REACT[local.topic]) cat?.play(REACT[local.topic]);
      busy = false; root.classList.remove('is-busy'); return;
    }
    try {
      const mode = editMode(), reply = await RI.Fandogh.ask(question, { mode, model, history: history.slice(-9, -1) });
      log.querySelector('.pet-msg--typing')?.remove();
      push('bot', reply.text, reply.actions || [], reply.follow || []); cat?.mood('happy', 1200);
      if (reply.edits?.length) edits(reply.edits, mode);
    } catch (e) {
      log.querySelector('.pet-msg--typing')?.remove();
      if (e.code === 'ASSISTANT_LIMIT') { if (e.data?.usage) { status = RI.Fandogh.status = e.data.usage; paintUsage(); } upsell(e.message); }
      else push('bot', e.message || 'الان نتوانستم جواب بدهم؛ کمی بعد دوباره بپرس.');
      cat?.mood('sad', 1600);
    } finally { busy = false; root.classList.remove('is-busy'); }
  }
  /* ---------- Fandogh's own edits: a before/after card, applied after a yes or right away with undo ---------- */
  function paintMode() { const m = editMode(); root.querySelectorAll('[data-pet-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.petMode === m))); }
  const note = text => { history.push({ role: 'user', text }); if (history.length > 12) history.splice(0, history.length - 12); };
  function edits(list, mode) {
    const log = root.querySelector('[data-pet-log]');
    RI.Fandogh.editCard(log, list, mode, {
      applied: picked => { cat?.play('celebrate'); note('(فندق این تغییرها را در رزومه داد: ' + picked.map(e => e.label + (e.after ? ' ← ' + e.after.slice(0, 60) : '')).join('؛ ') + ')'); },
      undone: () => { cat?.mood('think', 1000); note('(تغییرهای قبلی فندق را برگرداندم)'); },
      note, kept: () => cat?.play('purr')
    });
    log.scrollTo({ top: log.scrollHeight, behavior: calm.matches ? 'auto' : 'smooth' });
  }
  /* ---------- The person's own settings: the name they call Fandogh, tone, answer length and their own model key ---------- */
  const label = () => (status?.name || 'فندق');
  function paintName() { const b = root.querySelector('.pet__title b'); if (b && b.firstChild) b.firstChild.textContent = label() + ' '; }
  function upsell(message) {
    const plans = status?.plans || [], log = root.querySelector('[data-pet-log]');
    log.insertAdjacentHTML('beforeend', '<div class="pet-upsell"><b>' + esc(message || 'پیام‌های رایگان امروز تمام شد') + '</b><p>با هر اشتراک رزومیت، دستیار خودکار فعال است. یا فقط دستیار را بگیر:</p><div class="pet-upsell__plans">' + plans.map((p, i) => '<button type="button" class="pet-plan" data-buy="' + p.id + '" style="--i:' + i + '"' + (p.paused ? ' disabled' : '') + '><b>' + esc(p.name) + '</b><span>' + RI.it(p.price) + '</span><small>' + RI.fa(p.window) + ' پیام در ۵ ساعت</small>' + '</button>').join('') + '</div><a class="pet__link" href="' + RI.routeUrl('billing') + '" data-go="billing">دیدن اشتراک‌ها</a></div>');
    log.scrollTop = log.scrollHeight;
  }
  async function refresh() { try { status = await RI.Fandogh.refresh(); paintUsage(); } catch { root.querySelector('[data-pet-usage]').textContent = 'وضعیت سهمیه دریافت نشد'; } }
  function paintUsage() {
    if (!status) return; const el = root.querySelector('[data-pet-usage]'), bar = root.querySelector('[data-pet-quota]');
    paintName();
    const engine = (status.models || []).find(m => m.id === status.engine);
    el.textContent = engine && !engine.cost ? (engine.id === 'local' ? 'فندق محلی · رایگان و بی‌سهمیه' : 'با کلید خودت · بدون سهمیه') : (status.plan === 'free' ? 'رایگان' : 'اشتراک ' + (status.planName || '')) + ' · ' + RI.fa(status.remaining) + ' پیام از ' + RI.fa(status.limit) + ' در ۵ ساعت';
    const low = status.plan === 'free' && status.remaining <= 1; el.dataset.low = String(low); bar.dataset.low = String(low);
    bar.style.setProperty('--q', Math.max(0, Math.min(100, Math.round(status.remaining / (status.limit || 1) * 100))) + '%');
  }
  function paintScore() {
    const B = brain(), host = root.querySelector('[data-pet-view=score]'); if (!B) return;
    const sc = B.score(RI.C(), { goal: goal() });
    host.innerHTML = '<div class="pet-score__top"><svg class="pet-score__ring" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="pet-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cc8f6"/><stop offset="1" stop-color="#2f6fb3"/></linearGradient></defs><circle cx="50" cy="50" r="42" class="pet-score__track"/><circle cx="50" cy="50" r="42" class="pet-score__value" pathLength="100" style="--v:' + sc.total + '"/></svg><b data-count="' + sc.total + '">۰</b><div><h3>' + esc(sc.label) + '</h3><p>' + (sc.role ? 'نقش: <b>' + esc(sc.role.label) + '</b>' : 'بگو چه کاره‌ای تا دقیق‌تر بسنجم') + '</p></div></div>' +
      '<ul class="pet-score__dims">' + sc.dims.map((d, i) => '<li style="--i:' + i + '"><div><b>' + esc(d.label) + '</b><span>' + RI.fa(d.value) + '</span></div><i><em class="' + (d.value >= 75 ? 'good' : d.value >= 50 ? 'mid' : 'low') + '" style="--w:' + d.value + '%"></em></i>' + (d.reasons[0] ? '<small>' + esc(d.reasons[0]) + '</small>' : '') + '</li>').join('') + '</ul>';
    const num = host.querySelector('[data-count]'), target = sc.total, start = performance.now();
    const tick = t => { const k = Math.min(1, (t - start) / 900), v = Math.round(target * (1 - Math.pow(1 - k, 3))); num.textContent = RI.fa(v); if (k < 1) requestAnimationFrame(tick); };
    if (calm.matches) num.textContent = RI.fa(target); else requestAnimationFrame(tick);
    if (sc.total >= 80) cat?.play('celebrate');
  }

  /* ---------- Actions from answers and tips ---------- */
  function act(a) {
    if (!a) return; const c = RI.C();
    if (a.kind === 'open') { toggle(true); return; }
    if (a.kind === 'tab') { if (!open) toggle(true); select(a.tab === 'review' && !reviewHost ? 'chat' : a.tab); if (a.tab === 'review' && !reviewHost) RI.go('resume'); return; }
    if (a.kind === 'route') { if (open) toggle(false); RI.go(a.route, a.tab ? { tab: a.tab } : undefined); return; }
    if (a.kind === 'model') { if (lastQuestion) ask(lastQuestion, a.value); return; }
    if (a.kind === 'go') { if (RI.resumeFocus) RI.resumeFocus({ section: a.section, field: a.field }); else RI.go('resume', { step: a.section }); return; }
    if (a.kind === 'goal') { store('ri-pet-goal-' + RI.ownerId, a.value); RI.toast('هدفت ثبت شد: ' + a.value); if (tab === 'score') paintScore(); return; }
    if (a.kind === 'bio' || a.kind === 'title') { c.profile[a.kind] = a.value; RI.touch('profile'); RI.rerender?.(); RI.toast(a.kind === 'bio' ? 'معرفی گذاشته شد؛ هر جا خواستی ویرایشش کن' : 'عنوان به‌روز شد'); cat?.mood('happy', 1200); return; }
    if (a.kind === 'skill') { if (RI.resumeStudioAddSkill?.(a.value) || (!RI.resumeStudioAddSkill && c.skills.push({ id: 'k' + Date.now().toString(36), name: a.value, level: 3 }) && (RI.touch('skills'), true))) RI.toast('«' + a.value + '» به مهارت‌ها اضافه شد'); return; }
    if (a.kind === 'fix') {
      const swap = s => typeof s === 'string' ? s.split(a.wrong).join(a.value) : s;
      c.profile.title = swap(c.profile.title); c.profile.bio = swap(c.profile.bio);
      for (const key of ['experience', 'education', 'projects']) for (const item of c[key] || []) for (const f of ['role', 'desc', 'degree', 'title']) if (typeof item[f] === 'string') item[f] = swap(item[f]);
      document.querySelectorAll('#view input, #view textarea').forEach(el => { if (el.value.includes(a.wrong)) el.value = swap(el.value); });
      RI.touch('profile'); RI.rerender?.(); RI.toast('«' + a.wrong + '» به «' + a.value + '» تغییر کرد'); cat?.play('laugh');
    }
  }
  function onClick(e) {
    if (e.target === root && open) { toggle(false); return; }
    const t = e.target.closest('[data-pet-tab],[data-ask],[data-msg-act],[data-buy],[data-pet-mode]'); if (!t) return;
    if (t.dataset.petMode) { RI.Fandogh.setEditMode(t.dataset.petMode); paintMode(); RI.toast(t.dataset.petMode === 'auto' ? 'از این به بعد فندق تغییرها را خودش انجام می‌دهد و می‌توانی برگردانی' : 'از این به بعد فندق اول تغییرها را نشانت می‌دهد', { kind: 'info' }); return; }
    if (t.dataset.petTab) select(t.dataset.petTab);
    else if (t.dataset.ask) { if (tab !== 'chat') select('chat'); ask(t.dataset.ask); }
    else if (t.dataset.msgAct) { const [id, i] = t.dataset.msgAct.split(':'), a = chat.find(m => m.id === id)?.actions?.[Number(i)]; if (a) act(a); }
    else if (t.dataset.buy) { const p = status?.plans.find(x => x.id === t.dataset.buy); if (p) RI.walletPurchase('assistant:' + p.id, 'اشتراک فندق «' + p.name + '»', p.price).then(ok => { if (ok) { refresh(); push('bot', 'اشتراک «' + p.name + '» فعال شد! حالا مدل‌های بیشتری در اختیارت است.'); cat?.play('celebrate'); } }); }
  }
  addEventListener('resize', () => { if (open) ink(); }, { passive: true });

  // The resume page hands over its text review so it lives in the companion instead of the side panel.
  RI.petReview = host => { reviewHost = host; if (root) { if (!host && tab === 'review') select('chat'); else select(tab); } };
  RI.petOpen = (view = 'chat') => { if (!root) return; toggle(true); select(view); };
  RI.petSay = (text, actions) => root && say(text, actions || [], { force: true });
  RI.pet = { get cat() { return cat; } };

  document.addEventListener('ri:dashboard-ready', () => { if (root || !RI.ownerId) return; build(); watch(); });
})();
