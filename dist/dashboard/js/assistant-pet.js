/* Resume assistant as a companion: a small character at the bottom-left that watches the pointer, now and then
   says something about what you are doing (free, local), and opens into a panel with chat (server, counted
   against the daily allowance), the resume score, and — on the resume page — the full text review. */
(function () {
  'use strict';
  const RI = window.RI, esc = RI.esc, brain = () => window.ResumeBrain;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const store = (key, value) => { try { if (value === undefined) return localStorage.getItem(key); if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {} return null; };
  let root, pet, bubble, panel, status = null, history = [], chat = [], tab = 'chat', open = false, busy = false, lastTip = 0, tipsShown = 0, reviewHost = null, tipTimer = 0, typingTimer = 0;
  const goal = () => store('ri-pet-goal-' + RI.ownerId) || '';
  const muted = () => store('ri-pet-muted') === '1';

  const CAT = '<svg class="cat" viewBox="0 0 220 250" aria-hidden="true"><defs><linearGradient id="cat-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f4bd45"/><stop offset="1" stop-color="#d9962a"/></linearGradient><linearGradient id="cat-hair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd76a"/><stop offset=".5" stop-color="#e9a933"/><stop offset="1" stop-color="#b9781c"/></linearGradient><radialGradient id="cat-eye" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#9cf0a8"/><stop offset=".55" stop-color="#2fae5a"/><stop offset="1" stop-color="#16703a"/></radialGradient><radialGradient id="cat-gem" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#bfe8ff"/><stop offset=".6" stop-color="#3fa0e6"/><stop offset="1" stop-color="#1b5f99"/></radialGradient></defs><g class="cat__tail"><path d="M168 236 C204 228 210 196 196 172 C186 154 196 134 214 128" fill="none" stroke="url(#cat-hair)" stroke-width="16" stroke-linecap="round"/><path d="M168 236 C204 228 210 196 196 172 C186 154 196 134 214 128" fill="none" stroke="#fff3c4" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/></g><g class="cat__lean"><path class="cat__body" d="M66 156 Q104 176 142 156 L156 246 Q104 262 52 246Z" fill="url(#cat-fur)"/><g class="cat__head"><path class="cat__mane" d="M44 70 Q58 26 104 24 Q152 26 166 72 Q178 112 160 150 Q170 176 152 198 Q146 172 136 160 Q104 176 72 160 Q60 176 56 200 Q36 176 46 150 Q30 112 44 70Z" fill="url(#cat-hair)"/><g class="cat__ear cat__ear--l"><path d="M56 70 L58 14 L98 44Z" fill="url(#cat-fur)"/><path d="M63 62 L64 28 L88 46Z" fill="#f7b49b"/></g><g class="cat__ear cat__ear--r"><path d="M114 42 L152 12 L154 68Z" fill="url(#cat-fur)"/><path d="M122 44 L146 26 L147 60Z" fill="#f7b49b"/></g><path d="M58 92 Q60 50 104 48 Q148 50 150 92 Q152 128 124 146 Q104 156 84 146 Q56 128 58 92Z" fill="url(#cat-fur)"/><path d="M62 60 Q80 42 106 50 Q84 56 74 76 Q66 92 58 104Z M146 60 Q130 44 104 50 Q126 58 134 78 Q142 94 150 106Z" fill="url(#cat-hair)"/><path d="M60 92 Q44 120 56 150 Q48 172 66 190 Q66 168 72 150 Q62 124 68 100Z M148 92 Q164 120 152 150 Q160 172 142 190 Q142 168 136 150 Q146 124 140 100Z" fill="url(#cat-hair)"/><g class="cat__eyes"><g class="cat__eye"><path d="M70 100 Q84 86 98 98 Q86 110 70 100Z" fill="url(#cat-eye)"/><ellipse class="cat__pupil" cx="84" cy="99" rx="2.6" ry="7" fill="#123521"/><circle cx="88" cy="95" r="2" fill="#fff"/><path d="M68 100 Q84 84 100 97" fill="none" stroke="#3a240e" stroke-width="2.6" stroke-linecap="round"/><path d="M69 99 L62 94" stroke="#3a240e" stroke-width="2.2" stroke-linecap="round"/></g><g class="cat__eye"><path d="M110 98 Q124 86 138 100 Q122 110 110 98Z" fill="url(#cat-eye)"/><ellipse class="cat__pupil" cx="124" cy="99" rx="2.6" ry="7" fill="#123521"/><circle cx="128" cy="95" r="2" fill="#fff"/><path d="M108 97 Q124 84 140 100" fill="none" stroke="#3a240e" stroke-width="2.6" stroke-linecap="round"/><path d="M139 99 L146 94" stroke="#3a240e" stroke-width="2.2" stroke-linecap="round"/></g></g><g class="cat__happy"><path d="M72 100 Q84 90 96 100" fill="none" stroke="#3a240e" stroke-width="3.2" stroke-linecap="round"/><path d="M112 100 Q124 90 136 100" fill="none" stroke="#3a240e" stroke-width="3.2" stroke-linecap="round"/></g><path d="M76 84 Q84 80 92 82 M116 82 Q124 80 132 84" fill="none" stroke="#9a6418" stroke-width="2" stroke-linecap="round"/><ellipse cx="76" cy="118" rx="8" ry="5" fill="#f08d7a" opacity=".38"/><ellipse cx="132" cy="118" rx="8" ry="5" fill="#f08d7a" opacity=".38"/><path d="M99 114 L109 114 L104 120Z" fill="#e5806e"/><path class="cat__mouth" d="M104 120 Q104 127 97 128 M104 120 Q104 127 111 128" fill="none" stroke="#3a240e" stroke-width="2.2" stroke-linecap="round"/><path d="M66 118 L36 112 M66 122 L34 126 M142 118 L172 112 M142 122 L174 126" stroke="#fff6dc" stroke-width="1.6" stroke-linecap="round" opacity=".9"/></g><path d="M74 156 Q104 172 134 156 L134 165 Q104 181 74 165Z" fill="#5a3412"/><circle cx="104" cy="174" r="7" fill="url(#cat-gem)" stroke="#e9c46a" stroke-width="2"/><circle cx="101.5" cy="171.5" r="2" fill="#fff" opacity=".9"/><g class="cat__paw"><ellipse cx="80" cy="204" rx="22" ry="16" fill="url(#cat-fur)"/><path d="M70 196 v8 M80 194 v9 M90 196 v8" stroke="#c98a2a" stroke-width="2" stroke-linecap="round"/></g></g></svg>';
  const AVATAR = '<img class="pet__avatar" src="/brand/it-cat-coin-v1.png" alt="" width="64" height="64">';

  /* ---------- Shell ---------- */
  function build() {
    root = document.createElement('div'); root.className = 'pet'; root.dataset.state = 'idle';
    root.innerHTML = '<div class="pet__bubble" role="status" aria-live="polite" hidden></div>' +
      '<button type="button" class="pet__face" aria-label="گردو، دستیار رزومه" aria-expanded="false" aria-controls="pet-panel">' + CAT + '<span class="pet__badge" hidden></span></button>' +
      '<section class="pet__panel" id="pet-panel" role="dialog" aria-label="گردو، دستیار رزومه" hidden><header class="pet__head"><span class="pet__mini">' + AVATAR + '</span><div><b>گردو <span>· دستیار رزومه</span></b><small data-pet-usage>در حال آماده‌سازی…</small></div><button type="button" class="pet__icon" data-pet-mute title="پیام‌های خودکار" aria-pressed="false">' + RI.icon('bell') + '</button><button type="button" class="pet__icon" data-pet-close aria-label="بستن">' + RI.icon('x') + '</button></header>' +
      '<nav class="pet__tabs" role="tablist"><button type="button" role="tab" data-pet-tab="chat">' + RI.icon('sparkle') + 'گفت‌وگو</button><button type="button" role="tab" data-pet-tab="score">' + RI.icon('chart') + 'امتیاز</button><button type="button" role="tab" data-pet-tab="review">' + RI.icon('check') + 'بررسی متن</button></nav>' +
      '<div class="pet__view" data-pet-view="chat"><div class="pet__log" data-pet-log></div><div class="pet__chips" data-pet-chips></div><form class="pet__ask" data-pet-form><label class="sr-only" for="pet-input">سؤالت</label><input id="pet-input" class="input" maxlength="500" autocomplete="off" placeholder="بپرس یا بگو چه کاره‌ای…"><button type="submit" class="pet__send" aria-label="فرستادن">' + RI.icon('chevL') + '</button></form></div>' +
      '<div class="pet__view pet__score" data-pet-view="score" hidden></div><div class="pet__view pet__review" data-pet-view="review" hidden></div></section>';
    document.body.append(root);
    pet = root.querySelector('.pet__face'); bubble = root.querySelector('.pet__bubble'); panel = root.querySelector('.pet__panel');
    pet.addEventListener('click', () => toggle());
    root.querySelector('[data-pet-close]').addEventListener('click', () => toggle(false));
    root.querySelector('[data-pet-mute]').addEventListener('click', e => { const on = !muted(); store('ri-pet-muted', on ? '1' : null); e.currentTarget.setAttribute('aria-pressed', String(on)); RI.toast(on ? 'گردو دیگر خودش پیام نمی‌دهد' : 'گردو گاهی پیشنهاد می‌دهد', { kind: 'info' }); });
    root.querySelector('[data-pet-mute]').setAttribute('aria-pressed', String(muted()));
    root.addEventListener('click', onClick);
    root.querySelector('[data-pet-form]').addEventListener('submit', e => { e.preventDefault(); const input = root.querySelector('#pet-input'), q = input.value.trim(); if (!q) return; input.value = ''; ask(q); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) { toggle(false); pet.focus(); } });
    eyes(); blink(); select('chat');
    requestAnimationFrame(() => root.classList.add('is-in'));
  }

  /* ---------- Eyes follow the pointer; the character blinks and reacts ---------- */
  function eyes() {
    if (calm.matches) return;
    let x = 0, y = 0, raf = 0;
    const pupils = () => root.querySelectorAll('.cat__pupil'), head = () => root.querySelector('.cat__head');
    document.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(() => { raf = 0; const r = pet.getBoundingClientRect(), cx = r.left + r.width * .55, cy = r.top + r.height * .4, a = Math.atan2(y - cy, x - cx), d = Math.min(1, Math.hypot(x - cx, y - cy) / 320); pupils().forEach(p => { p.style.transform = 'translate(' + (Math.cos(a) * 5 * d).toFixed(2) + 'px,' + (Math.sin(a) * 3.2 * d).toFixed(2) + 'px)'; }); const h = head(); if (h) h.style.transform = 'rotate(' + (Math.max(-7, Math.min(7, (x - cx) / 90))).toFixed(2) + 'deg) translateY(' + (Math.max(-3, Math.min(3, (y - cy) / 160))).toFixed(2) + 'px)'; }); }, { passive: true });
  }
  function blink() {
    if (calm.matches) return;
    const once = () => { root.classList.add('is-blink'); setTimeout(() => root.classList.remove('is-blink'), 140); setTimeout(once, 2600 + Math.random() * 4200); };
    setTimeout(once, 1800);
    const fidget = () => { if (!open && !document.hidden) { const r = Math.random(); const cls = r < .3 ? 'is-hide' : r < .65 ? 'is-ear' : 'is-stretch'; root.classList.add(cls); setTimeout(() => root.classList.remove(cls), cls === 'is-hide' ? 1600 : 900); } setTimeout(fidget, 9000 + Math.random() * 12000); };
    setTimeout(fidget, 8000);
  }
  function mood(state, ms) { root.dataset.state = state; if (ms) setTimeout(() => { if (root.dataset.state === state) root.dataset.state = 'idle'; }, ms); }

  /* ---------- Speech bubble: proactive, local, rate-limited ---------- */
  function say(text, actions = [], { force = false } = {}) {
    if (!force && (open || muted() || Date.now() - lastTip < 40000 || tipsShown >= 6)) return false;
    lastTip = Date.now(); tipsShown++;
    bubble.innerHTML = '<b class="pet__name">گردو</b><p>' + esc(text) + '</p>' + (actions.length ? '<div class="pet__acts">' + actions.map((a, i) => '<button type="button" class="pet__act" data-bubble-act="' + i + '">' + esc(a.label) + '</button>').join('') + '</div>' : '') + '<button type="button" class="pet__x" data-bubble-close aria-label="بستن پیام">' + RI.icon('x') + '</button>';
    bubble._actions = actions; bubble.hidden = false; root.classList.remove('has-bubble'); void bubble.offsetWidth; root.classList.add('has-bubble');
    mood('talk', 2400); clearTimeout(tipTimer); tipTimer = setTimeout(hideBubble, 14000);
    const badge = root.querySelector('.pet__badge'); if (!open) { badge.hidden = false; badge.textContent = '۱'; }
    return true;
  }
  function hideBubble() { root.classList.remove('has-bubble'); setTimeout(() => { if (!root.classList.contains('has-bubble')) bubble.hidden = true; }, 260); }

  function contextTip(page) {
    const B = brain(); if (!B || open) return;
    const c = RI.C(), typos = B.spelling(c);
    if (page === 'resume' && typos.length) return say('«' + typos[0].wrong + '» در ' + typos[0].where + ' احتمالاً «' + typos[0].right + '» است.', [{ kind: 'fix', label: 'درستش کن', wrong: typos[0].wrong, value: typos[0].right }]);
    const sc = B.score(c, { goal: goal() }), weak = sc.dims.slice().sort((a, b) => a.value - b.value)[0];
    const tips = {
      home: weak.reasons[0] ? 'رزومه‌ات ' + RI.fa(sc.total) + ' از ۱۰۰ است. قدم بعدی: ' + weak.reasons[0] + '.' : 'رزومه‌ات ' + RI.fa(sc.total) + ' از ۱۰۰ است؛ آفرین!',
      resume: weak.reasons[0] ? 'برای قوی‌تر شدن «' + weak.label + '»: ' + weak.reasons[0] + '.' : 'رزومه‌ات خوب پیش می‌رود؛ اگر سؤالی داری بپرس.',
      themes: sc.role ? 'برای «' + sc.role.label + '» قالب خوانا با رنگ آرام بهتر جواب می‌دهد.' : 'قالب را عوض کن؛ محتوایت سر جایش می‌ماند.',
      publish: 'قبل از انتشار، آدرس کوتاه و به‌یادماندنی انتخاب کن؛ مثل نام و نام خانوادگی.',
      links: 'مهم‌ترین لینک را اول بگذار؛ بیشتر کلیک‌ها مال لینک اول است.',
      stats: 'اگر بازدید داری ولی پیام نه، یک دعوت روشن به همکاری در معرفی‌ات بنویس.',
    };
    if (tips[page]) say(tips[page], page === 'home' || page === 'resume' ? [{ kind: 'open', label: 'بیشتر بپرس' }] : []);
  }
  // Watches the page and the field being edited; speaks only after the user pauses.
  function watch() {
    new MutationObserver(() => { clearTimeout(watch.t); watch.t = setTimeout(() => contextTip(document.body.dataset.page), 2500); }).observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
    setTimeout(() => contextTip(document.body.dataset.page), 6000);
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
        if (slip) say('«' + slip.wrong + '» را درست نوشتی؟ شاید «' + slip.right + '».', [{ kind: 'fix', label: 'درستش کن', wrong: slip.wrong, value: slip.right }]);
      }, 2200);
    });
  }

  /* ---------- Panel ---------- */
  function toggle(force) {
    open = force === undefined ? !open : force;
    pet.setAttribute('aria-expanded', String(open)); root.classList.toggle('is-open', open);
    if (open) { panel.hidden = false; hideBubble(); root.querySelector('.pet__badge').hidden = true; mood('happy', 900); refresh(); if (!chat.length) greet(); select(tab); setTimeout(() => root.querySelector('#pet-input')?.focus({ preventScroll: true }), 220); }
    else setTimeout(() => { if (!open) panel.hidden = true; }, calm.matches ? 0 : 280);
  }
  function select(id) {
    if (id === 'review' && !reviewHost) id = 'chat';
    tab = id;
    root.querySelectorAll('[data-pet-tab]').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.petTab === id)); if (b.dataset.petTab === 'review') b.hidden = !reviewHost; });
    root.querySelectorAll('[data-pet-view]').forEach(v => { v.hidden = v.dataset.petView !== id; });
    if (id === 'score') paintScore();
    if (id === 'review' && reviewHost && reviewHost.parentElement !== root.querySelector('[data-pet-view=review]')) root.querySelector('[data-pet-view=review]').append(reviewHost);
  }
  function greet() { const B = brain(); if (!B) return; const o = B.opening(RI.C(), { goal: goal() }); push('bot', 'میو! من گردو هستم. ' + o.text.replace(/^سلام[^!]*!\s*/, ''), o.actions, o.follow); }
  function push(who, text, actions = [], follow = []) {
    const m = { id: 'm' + chat.length, who, text, actions, follow }; chat.push(m); if (chat.length > 50) chat.shift();
    const log = root.querySelector('[data-pet-log]');
    log.insertAdjacentHTML('beforeend', '<div class="pet-msg pet-msg--' + who + '" data-msg="' + m.id + '">' + (who === 'bot' ? '<span class="pet-msg__av">' + AVATAR + '</span>' : '') + '<div class="pet-msg__body"><p>' + esc(text).replace(/\n/g, '<br>') + '</p>' + (actions.length ? '<div class="pet__acts">' + actions.map((a, i) => '<button type="button" class="pet__act pet__act--' + a.kind + '" data-msg-act="' + m.id + ':' + i + '">' + esc(a.label) + '</button>').join('') + '</div>' : '') + '</div></div>');
    root.querySelector('[data-pet-chips]').innerHTML = (follow || []).map(f => '<button type="button" class="pet__chip" data-ask="' + esc(f) + '">' + esc(f) + '</button>').join('');
    log.scrollTo({ top: log.scrollHeight, behavior: calm.matches ? 'auto' : 'smooth' });
    if (who !== 'me') history.push({ role: 'assistant', text }); else history.push({ role: 'user', text });
    if (history.length > 12) history.splice(0, history.length - 12);
  }
  async function ask(question) {
    if (busy) return; busy = true; push('me', question); mood('think');
    const log = root.querySelector('[data-pet-log]'); log.insertAdjacentHTML('beforeend', '<div class="pet-msg pet-msg--bot pet-msg--typing"><span class="pet-msg__av">' + AVATAR + '</span><div class="pet-msg__body"><i></i><i></i><i></i></div></div>'); log.scrollTop = log.scrollHeight;
    try {
      const c = RI.C(), r = await RI.dashboardRequest('assistant/ask', { question, goal: goal(), history: history.slice(-7, -1), content: { profile: c.profile, skills: c.skills, experience: c.experience, education: c.education, projects: c.projects, certs: c.certs, languages: c.languages, contacts: c.contacts, socials: c.socials } });
      status = r.usage; paintUsage(); log.querySelector('.pet-msg--typing')?.remove();
      push('bot', r.reply.text, r.reply.actions || [], r.reply.follow || []); mood('happy', 1200);
    } catch (e) {
      log.querySelector('.pet-msg--typing')?.remove();
      if (e.code === 'ASSISTANT_LIMIT') { if (e.data?.usage) { status = e.data.usage; paintUsage(); } upsell(e.message); }
      else push('bot', e.message || 'الان نتوانستم جواب بدهم؛ کمی بعد دوباره بپرس.');
      mood('sad', 1600);
    } finally { busy = false; }
  }
  function upsell(message) {
    const plans = status?.plans || [], log = root.querySelector('[data-pet-log]');
    log.insertAdjacentHTML('beforeend', '<div class="pet-upsell"><b>' + esc(message || 'پیام‌های رایگان امروز تمام شد') + '</b><p>با هر اشتراک رزومیت، دستیار خودکار فعال است. یا فقط دستیار را بگیر:</p><div class="pet-upsell__plans">' + plans.map(p => '<button type="button" class="pet-plan" data-buy="' + p.id + '"' + (p.paused ? ' disabled' : '') + '><b>' + esc(p.period) + '</b><span>' + RI.it(p.price) + '</span>' + (p.months > 1 ? '<small>' + RI.fa(Math.round((1 - p.price / p.months / (plans[0].price || 1)) * 100)) + '٪ ارزان‌تر</small>' : '<small>ماهانه</small>') + '</button>').join('') + '</div><a class="pet__link" href="' + RI.routeUrl('billing') + '" data-go="billing">دیدن اشتراک‌ها</a></div>');
    log.scrollTop = log.scrollHeight;
  }
  async function refresh() { try { status = await RI.dashboardRequest('assistant'); paintUsage(); } catch { root.querySelector('[data-pet-usage]').textContent = 'وضعیت سهمیه دریافت نشد'; } }
  function paintUsage() {
    if (!status) return; const el = root.querySelector('[data-pet-usage]');
    el.textContent = status.plan === 'free' ? RI.fa(status.remaining) + ' پیام رایگان از ' + RI.fa(status.limit) + ' برای امروز' : (status.plan === 'subscription' ? 'فعال با اشتراک' : 'دستیار فعال') + ' · ' + RI.fa(status.remaining) + ' پیام باقی امروز';
    el.dataset.low = String(status.plan === 'free' && status.remaining <= 1);
  }
  function paintScore() {
    const B = brain(), host = root.querySelector('[data-pet-view=score]'); if (!B) return;
    const sc = B.score(RI.C(), { goal: goal() });
    host.innerHTML = '<div class="pet-score__top"><svg class="pet-score__ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" class="pet-score__track"/><circle cx="50" cy="50" r="42" class="pet-score__value" pathLength="100" style="--v:' + sc.total + '"/></svg><b data-count="' + sc.total + '">۰</b><div><h3>' + esc(sc.label) + '</h3><p>' + (sc.role ? 'نقش: <b>' + esc(sc.role.label) + '</b>' : 'بگو چه کاره‌ای تا دقیق‌تر بسنجم') + '</p></div></div>' +
      '<ul class="pet-score__dims">' + sc.dims.map((d, i) => '<li style="--i:' + i + '"><div><b>' + esc(d.label) + '</b><span>' + RI.fa(d.value) + '</span></div><i><em class="' + (d.value >= 75 ? 'good' : d.value >= 50 ? 'mid' : 'low') + '" style="--w:' + d.value + '%"></em></i>' + (d.reasons[0] ? '<small>' + esc(d.reasons[0]) + '</small>' : '') + '</li>').join('') + '</ul>';
    const num = host.querySelector('[data-count]'), target = sc.total, start = performance.now();
    const tick = t => { const k = Math.min(1, (t - start) / 900), v = Math.round(target * (1 - Math.pow(1 - k, 3))); num.textContent = RI.fa(v); if (k < 1) requestAnimationFrame(tick); };
    if (calm.matches) num.textContent = RI.fa(target); else requestAnimationFrame(tick);
  }

  /* ---------- Actions from answers and tips ---------- */
  function act(a) {
    const c = RI.C();
    if (a.kind === 'open') { toggle(true); return; }
    if (a.kind === 'tab') { select(a.tab === 'review' && !reviewHost ? 'chat' : a.tab); if (a.tab === 'review' && !reviewHost) RI.go('resume'); return; }
    if (a.kind === 'route') { RI.go(a.route, a.tab ? { tab: a.tab } : undefined); return; }
    if (a.kind === 'go') { if (RI.resumeFocus) RI.resumeFocus({ section: a.section, field: a.field }); else RI.go('resume', { step: a.section }); return; }
    if (a.kind === 'goal') { store('ri-pet-goal-' + RI.ownerId, a.value); RI.toast('هدفت ثبت شد: ' + a.value); if (tab === 'score') paintScore(); return; }
    if (a.kind === 'bio' || a.kind === 'title') { c.profile[a.kind] = a.value; RI.touch('profile'); RI.rerender?.(); RI.toast(a.kind === 'bio' ? 'معرفی گذاشته شد؛ هر جا خواستی ویرایشش کن' : 'عنوان به‌روز شد'); mood('happy', 1200); return; }
    if (a.kind === 'skill') { if (RI.resumeStudioAddSkill?.(a.value) || (!RI.resumeStudioAddSkill && c.skills.push({ id: 'k' + Date.now().toString(36), name: a.value, level: 3 }) && (RI.touch('skills'), true))) RI.toast('«' + a.value + '» به مهارت‌ها اضافه شد'); return; }
    if (a.kind === 'fix') {
      const swap = s => typeof s === 'string' ? s.split(a.wrong).join(a.value) : s;
      c.profile.title = swap(c.profile.title); c.profile.bio = swap(c.profile.bio);
      for (const key of ['experience', 'education', 'projects']) for (const item of c[key] || []) for (const f of ['role', 'desc', 'degree', 'title']) if (typeof item[f] === 'string') item[f] = swap(item[f]);
      document.querySelectorAll('#view input, #view textarea').forEach(el => { if (el.value.includes(a.wrong)) { el.value = swap(el.value); } });
      RI.touch('profile'); RI.rerender?.(); RI.toast('«' + a.wrong + '» به «' + a.value + '» تغییر کرد'); mood('happy', 1200); hideBubble();
    }
  }
  function onClick(e) {
    const t = e.target.closest('[data-pet-tab],[data-ask],[data-msg-act],[data-bubble-act],[data-bubble-close],[data-buy]'); if (!t) return;
    if (t.dataset.petTab) select(t.dataset.petTab);
    else if (t.dataset.ask) { if (tab !== 'chat') select('chat'); ask(t.dataset.ask); }
    else if (t.dataset.msgAct) { const [id, i] = t.dataset.msgAct.split(':'), a = chat.find(m => m.id === id)?.actions?.[Number(i)]; if (a) act(a); }
    else if (t.dataset.bubbleAct) { const a = bubble._actions?.[Number(t.dataset.bubbleAct)]; hideBubble(); if (a) act(a); }
    else if (t.hasAttribute('data-bubble-close')) hideBubble();
    else if (t.dataset.buy) { const p = status?.plans.find(x => x.id === t.dataset.buy); if (p) RI.walletPurchase('assistant:' + p.id, 'دستیار هوشمند ' + p.period, p.price).then(ok => { if (ok) { refresh(); push('bot', 'دستیار فعال شد! حالا هر چه می‌خواهی بپرس.'); mood('happy', 1500); } }); }
  }

  // The resume page hands over its text review so it lives in the companion instead of the side panel.
  RI.petReview = host => { reviewHost = host; if (root) { if (!host && tab === 'review') select('chat'); else select(tab); } };
  RI.petOpen = (view = 'chat') => { if (!root) return; toggle(true); select(view); };
  RI.petSay = (text, actions) => root && say(text, actions || [], { force: true });

  document.addEventListener('ri:dashboard-ready', () => { if (root || !RI.ownerId) return; build(); watch(); });
})();
