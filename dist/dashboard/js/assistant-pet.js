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

  const FACE = '<svg class="pet__svg" viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="pet-body" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#c79a6f"/><stop offset=".55" stop-color="#9a6a42"/><stop offset="1" stop-color="#6b4629"/></radialGradient></defs>' +
    '<g class="pet__antenna"><path d="M60 22 C60 12 66 8 72 6" stroke="#6b4629" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="73" cy="6" r="5" fill="#f1d3a8"/></g>' +
    '<g class="pet__body"><ellipse cx="60" cy="66" rx="44" ry="42" fill="url(#pet-body)"/><ellipse cx="60" cy="72" rx="30" ry="24" fill="#f5ebe1" opacity=".22"/>' +
    '<g class="pet__eye" data-eye><ellipse cx="44" cy="58" rx="11" ry="13" fill="#fff"/><circle class="pet__pupil" cx="44" cy="59" r="5.5" fill="#1c2d38"/><circle cx="46" cy="56" r="1.8" fill="#fff"/></g>' +
    '<g class="pet__eye" data-eye><ellipse cx="76" cy="58" rx="11" ry="13" fill="#fff"/><circle class="pet__pupil" cx="76" cy="59" r="5.5" fill="#1c2d38"/><circle cx="78" cy="56" r="1.8" fill="#fff"/></g>' +
    '<path class="pet__mouth" d="M50 82 Q60 90 70 82" stroke="#3a2414" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="34" cy="76" r="5" fill="#e79a83" opacity=".45"/><circle cx="86" cy="76" r="5" fill="#e79a83" opacity=".45"/></g></svg>';

  /* ---------- Shell ---------- */
  function build() {
    root = document.createElement('div'); root.className = 'pet'; root.dataset.state = 'idle';
    root.innerHTML = '<div class="pet__bubble" role="status" aria-live="polite" hidden></div>' +
      '<button type="button" class="pet__face" aria-label="دستیار رزومه" aria-expanded="false" aria-controls="pet-panel">' + FACE + '<span class="pet__badge" hidden></span></button>' +
      '<section class="pet__panel" id="pet-panel" role="dialog" aria-label="دستیار رزومه" hidden><header class="pet__head"><span class="pet__mini">' + FACE + '</span><div><b>دستیار رزومیت</b><small data-pet-usage>در حال آماده‌سازی…</small></div><button type="button" class="pet__icon" data-pet-mute title="پیام‌های خودکار" aria-pressed="false">' + RI.icon('bell') + '</button><button type="button" class="pet__icon" data-pet-close aria-label="بستن">' + RI.icon('x') + '</button></header>' +
      '<nav class="pet__tabs" role="tablist"><button type="button" role="tab" data-pet-tab="chat">' + RI.icon('sparkle') + 'گفت‌وگو</button><button type="button" role="tab" data-pet-tab="score">' + RI.icon('chart') + 'امتیاز</button><button type="button" role="tab" data-pet-tab="review">' + RI.icon('check') + 'بررسی متن</button></nav>' +
      '<div class="pet__view" data-pet-view="chat"><div class="pet__log" data-pet-log></div><div class="pet__chips" data-pet-chips></div><form class="pet__ask" data-pet-form><label class="sr-only" for="pet-input">سؤالت</label><input id="pet-input" class="input" maxlength="500" autocomplete="off" placeholder="بپرس یا بگو چه کاره‌ای…"><button type="submit" class="pet__send" aria-label="فرستادن">' + RI.icon('chevL') + '</button></form></div>' +
      '<div class="pet__view pet__score" data-pet-view="score" hidden></div><div class="pet__view pet__review" data-pet-view="review" hidden></div></section>';
    document.body.append(root);
    pet = root.querySelector('.pet__face'); bubble = root.querySelector('.pet__bubble'); panel = root.querySelector('.pet__panel');
    pet.addEventListener('click', () => toggle());
    root.querySelector('[data-pet-close]').addEventListener('click', () => toggle(false));
    root.querySelector('[data-pet-mute]').addEventListener('click', e => { const on = !muted(); store('ri-pet-muted', on ? '1' : null); e.currentTarget.setAttribute('aria-pressed', String(on)); RI.toast(on ? 'دستیار دیگر خودش پیام نمی‌دهد' : 'دستیار گاهی پیشنهاد می‌دهد', { kind: 'info' }); });
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
    const pupils = () => root.querySelectorAll('.pet__face .pet__pupil');
    document.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(() => { raf = 0; const r = pet.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .45, a = Math.atan2(y - cy, x - cx), d = Math.min(1, Math.hypot(x - cx, y - cy) / 260); pupils().forEach(p => { p.style.transform = 'translate(' + (Math.cos(a) * 4.2 * d).toFixed(2) + 'px,' + (Math.sin(a) * 4.8 * d).toFixed(2) + 'px)'; }); }); }, { passive: true });
  }
  function blink() {
    if (calm.matches) return;
    const once = () => { root.classList.add('is-blink'); setTimeout(() => root.classList.remove('is-blink'), 140); setTimeout(once, 2600 + Math.random() * 4200); };
    setTimeout(once, 1800);
  }
  function mood(state, ms) { root.dataset.state = state; if (ms) setTimeout(() => { if (root.dataset.state === state) root.dataset.state = 'idle'; }, ms); }

  /* ---------- Speech bubble: proactive, local, rate-limited ---------- */
  function say(text, actions = [], { force = false } = {}) {
    if (!force && (open || muted() || Date.now() - lastTip < 40000 || tipsShown >= 6)) return false;
    lastTip = Date.now(); tipsShown++;
    bubble.innerHTML = '<p>' + esc(text) + '</p>' + (actions.length ? '<div class="pet__acts">' + actions.map((a, i) => '<button type="button" class="pet__act" data-bubble-act="' + i + '">' + esc(a.label) + '</button>').join('') + '</div>' : '') + '<button type="button" class="pet__x" data-bubble-close aria-label="بستن پیام">' + RI.icon('x') + '</button>';
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
  function greet() { const B = brain(); if (!B) return; const o = B.opening(RI.C(), { goal: goal() }); push('bot', o.text, o.actions, o.follow); }
  function push(who, text, actions = [], follow = []) {
    const m = { id: 'm' + chat.length, who, text, actions, follow }; chat.push(m); if (chat.length > 50) chat.shift();
    const log = root.querySelector('[data-pet-log]');
    log.insertAdjacentHTML('beforeend', '<div class="pet-msg pet-msg--' + who + '" data-msg="' + m.id + '">' + (who === 'bot' ? '<span class="pet-msg__av">' + FACE + '</span>' : '') + '<div class="pet-msg__body"><p>' + esc(text).replace(/\n/g, '<br>') + '</p>' + (actions.length ? '<div class="pet__acts">' + actions.map((a, i) => '<button type="button" class="pet__act pet__act--' + a.kind + '" data-msg-act="' + m.id + ':' + i + '">' + esc(a.label) + '</button>').join('') + '</div>' : '') + '</div></div>');
    root.querySelector('[data-pet-chips]').innerHTML = (follow || []).map(f => '<button type="button" class="pet__chip" data-ask="' + esc(f) + '">' + esc(f) + '</button>').join('');
    log.scrollTo({ top: log.scrollHeight, behavior: calm.matches ? 'auto' : 'smooth' });
    if (who !== 'me') history.push({ role: 'assistant', text }); else history.push({ role: 'user', text });
    if (history.length > 12) history.splice(0, history.length - 12);
  }
  async function ask(question) {
    if (busy) return; busy = true; push('me', question); mood('think');
    const log = root.querySelector('[data-pet-log]'); log.insertAdjacentHTML('beforeend', '<div class="pet-msg pet-msg--bot pet-msg--typing"><span class="pet-msg__av">' + FACE + '</span><div class="pet-msg__body"><i></i><i></i><i></i></div></div>'); log.scrollTop = log.scrollHeight;
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
