/* Fandogh (فندق), ResumeIt's white cat, built from nine painted expressions of one peeking pose. The expressions are
   stacked and cross-faded; every movement (peeking out from behind the left edge, leaning toward the pointer,
   breathing, hopping, purring, dozing off) is a transform on wrapper elements, so the painting never shifts.
   The art is cut by a straight line where the wall hides the rest of her; that line stays on the screen edge,
   so tilts pivot on it and nothing slides sideways. She never stands in the way of the page: over text or
   controls she stays mostly behind the wall, and she slips away when the pointer goes for something under her
   or the page scrolls. Reduced motion keeps a still, complete pose.
   Usage: const g = Fandogh.mount(element, { base: '/brand/fandogh/' }); g.say('سلام!'); g.mood('happy', 1500); */
(function () {
  'use strict';
  if (window.Fandogh) return;
  const FACES = ['neutral', 'blink', 'happy', 'talk', 'think', 'sad', 'sleep', 'surprised', 'laugh'];
  const MOOD_FACE = { idle: 'neutral', talk: 'neutral', happy: 'happy', think: 'think', sad: 'sad', sleep: 'sleep', surprised: 'surprised', laugh: 'laugh' };
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const X = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function mount(host, o = {}) {
    const base = o.base || '/brand/fandogh/', name = o.name || 'فندق';
    host.insertAdjacentHTML('beforeend', '<div class="gr" data-mood="idle">' +
      '<div class="gr__cat"><div class="gr__lean"><div class="gr__bob">' +
      FACES.map(f => '<img class="gr__face" data-face="' + f + '" src="' + base + 'peek-' + f + '.webp" alt="" draggable="false" decoding="async"' + (f === 'neutral' ? ' data-on' : ' loading="lazy"') + '>').join('') +
      '</div></div><button type="button" class="gr__hit" aria-label="' + esc(o.label || name) + '"><span class="gr__dot" hidden></span></button></div>' +
      '<span class="gr__edge" aria-hidden="true"></span>' +
      '<span class="gr__think" aria-hidden="true"><i></i><i></i><i></i></span><span class="gr__zzz" aria-hidden="true"><b>z</b><b>z</b><b>z</b></span><span class="gr__fx" aria-hidden="true"></span>' +
      '<div class="gr__bubble" role="status" aria-live="polite" hidden><b class="gr__name">' + esc(name) + '</b><p></p><div class="gr__acts"></div><button type="button" class="gr__x" aria-label="بستن پیام">' + X + '</button></div></div>');
    const el = host.lastElementChild, hit = el.querySelector('.gr__hit'), bubble = el.querySelector('.gr__bubble'), fx = el.querySelector('.gr__fx');
    const imgs = Object.fromEntries([...el.querySelectorAll('.gr__face')].map(i => [i.dataset.face, i]));
    const opt = { auto: o.auto !== false, track: o.track !== false, dodge: o.dodge !== false, sleepAfter: o.sleepAfter || 45000 };
    let face = 'neutral', mood = 'idle', held = false, alive = true, lastActive = Date.now(), lastSlow = 0, onAction = null;
    let moodTimer = 0, talkTimer = 0, talkEnd = 0, hushTimer = 0, faceTimer = 0, raf = 0, px = 0;
    const still = () => calm.matches;
    const later = (fn, ms) => setTimeout(() => { if (alive) fn(); }, ms);
    const listen = (target, type, fn, options) => { target.addEventListener(type, fn, options); cleanups.push(() => target.removeEventListener(type, fn, options)); };
    const cleanups = [];

    // Shows one expression. Quick changes (blinks, the moving mouth) skip the cross-fade.
    function setFace(f, snap) {
      if (!imgs[f] || f === face) return; face = f;
      el.classList.toggle('gr--snap', !!snap || still());
      for (const k in imgs) imgs[k].toggleAttribute('data-on', k === f);
    }
    function flashFace(f, ms, snap) { clearTimeout(faceTimer); setFace(f, snap); faceTimer = later(() => setFace(MOOD_FACE[mood] || 'neutral', snap), ms); }
    function flash(cls, ms) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); later(() => el.classList.remove(cls), ms); }

    function setMood(m, ms) {
      if (!MOOD_FACE[m]) return;
      clearTimeout(moodTimer); clearTimeout(faceTimer);
      mood = m; el.dataset.mood = m; setFace(MOOD_FACE[m]);
      if (ms) moodTimer = later(() => { if (mood === m) setMood('idle'); }, ms);
    }

    function burst(kind = 'heart', n = 5) {
      if (still()) return;
      const glyph = { heart: '♥', star: '✦', note: '♪', spark: '✧' }[kind] || kind;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('i'); s.className = 'gr-p gr-p--' + kind; s.textContent = glyph;
        s.style.setProperty('--x', Math.round(Math.random() * 80 - 10) + 'px'); s.style.setProperty('--r', Math.round(Math.random() * 70 - 35) + 'deg'); s.style.animationDelay = i * 90 + 'ms';
        fx.append(s); later(() => s.remove(), 1800 + i * 90);
      }
    }

    // Speech: words appear one after another while the mouth moves. Optional buttons call back with their index.
    function say(text, options) {
      const so = typeof options === 'number' ? { ms: options } : (options || {});
      const words = String(text).trim().split(/\s+/).filter(Boolean); if (!words.length) return;
      bubble.querySelector('p').innerHTML = words.map((w, i) => '<span style="--i:' + Math.min(i, 40) + '">' + esc(w) + '</span>').join(' ');
      const acts = so.actions || [];
      bubble.querySelector('.gr__acts').innerHTML = acts.map((a, i) => '<button type="button" class="gr__act' + (a.primary ? ' gr__act--primary' : '') + '" data-act="' + i + '" style="--i:' + i + '">' + esc(a.label) + '</button>').join('');
      onAction = so.onAction || null;
      bubble.hidden = false; el.classList.remove('gr--speaking'); void bubble.offsetWidth; el.classList.add('gr--speaking');
      if (mood === 'sleep') wake(true);
      const talkFor = still() ? 0 : Math.min(6000, words.length * 90 + 500);
      clearInterval(talkTimer); clearTimeout(talkEnd); clearTimeout(hushTimer);
      if (talkFor) {
        if (mood === 'idle' || mood === 'talk') setMood('talk');
        el.classList.add('gr--talking');
        talkTimer = setInterval(() => setFace(face === 'talk' ? 'neutral' : 'talk', true), 150 + Math.random() * 60);
        talkEnd = later(() => { clearInterval(talkTimer); el.classList.remove('gr--talking'); if (mood === 'talk') setMood('idle'); else setFace(MOOD_FACE[mood], true); }, talkFor);
      }
      if (!so.sticky) hushTimer = later(hush, so.ms || Math.max(acts.length ? 12000 : 4500, 2500 + text.length * 55));
    }
    function hush() { clearTimeout(hushTimer); el.classList.remove('gr--speaking'); later(() => { if (!el.classList.contains('gr--speaking')) bubble.hidden = true; }, 300); }
    bubble.addEventListener('click', e => {
      if (e.target.closest('.gr__x')) { hush(); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const fn = onAction; hush(); fn?.(Number(b.dataset.act));
    });

    function sleep() { if (held || mood === 'sleep' || still()) return; hush(); setMood('sleep'); el.style.setProperty('--tilt', '0deg'); }
    function wake(quiet) {
      if (mood !== 'sleep') return; lastActive = Date.now(); setMood('idle');
      if (!quiet && !still()) { flashFace('laugh', 1100); flash('gr--stretch', 1100); }
    }
    function activity() { lastActive = Date.now(); if (mood === 'sleep') wake(); }

    const actions = {
      blink: () => { if (face === 'neutral') { flashFace('blink', 120, true); if (Math.random() < .22) later(() => flashFace('blink', 110, true), 260); } },
      slowblink: () => { if (mood === 'idle') flashFace('sleep', 650); },
      glance: () => { if (mood === 'idle') flashFace('think', 1500); },
      stretch: () => flash('gr--stretch', 1100),
      hide: () => flash('gr--hide', 2300),
      peek: () => { el.classList.remove('gr--in'); void el.offsetWidth; el.classList.add('gr--in'); },
      purr: () => { setMood('happy', 1300); flash('gr--purr', 1000); burst('heart', 5); },
      laugh: () => { setMood('laugh', 1900); flash('gr--hop', 800); burst('note', 4); },
      yawn: () => { flashFace('laugh', 1100); flash('gr--stretch', 1100); },
      celebrate: () => { setMood('laugh', 1900); flash('gr--hop', 800); later(() => flash('gr--hop', 800), 820); burst('star', 8); },
      surprise: () => { setMood('surprised', 1200); flash('gr--jolt', 600); },
    };
    function play(name) { if (actions[name] && (!still() || name === 'peek')) actions[name](); }

    function idleLoop() {
      if (!alive) return;
      if (opt.auto && !held && mood === 'idle' && !document.hidden && !el.classList.contains('gr--tucked') && !shy && !dodging && el.offsetWidth) {
        const r = Math.random();
        play(r < .28 ? 'glance' : r < .5 ? 'slowblink' : r < .66 ? 'stretch' : r < .8 ? 'hide' : r < .92 ? 'yawn' : 'surprise');
      }
      later(idleLoop, 9000 + Math.random() * 8000);
    }
    function blinkLoop() { if (!alive) return; if (opt.auto && !document.hidden && mood !== 'sleep') play('blink'); later(blinkLoop, 2400 + Math.random() * 3800); }

    // She leans slightly toward the pointer, pivoting on the wall line so the cut never shows.
    function lean() {
      raf = 0; const r = el.getBoundingClientRect(); if (!r.width) return;
      const dx = px - (r.left + r.width * .5), t = opt.track && mood !== 'sleep' ? Math.max(-1, Math.min(1, dx / 700)) * 1.6 : 0;
      el.style.setProperty('--tilt', t.toFixed(2) + 'deg');
    }
    listen(window, 'pointermove', e => { px = e.clientX; activity(); if (!still() && !raf) raf = requestAnimationFrame(lean); }, { passive: true });
    listen(window, 'keydown', activity, { passive: true });
    hit.addEventListener('pointerenter', () => { if (Date.now() - lastSlow > 4000) { lastSlow = Date.now(); play('slowblink'); } });
    hit.addEventListener('click', () => { activity(); if (el.classList.contains('gr--tucked')) { tuck(false); return; } if (o.onClick) o.onClick(); else play(Math.random() < .7 ? 'purr' : 'laugh'); });
    const sleepCheck = setInterval(() => { if (alive && opt.auto && !held && el.offsetWidth && Date.now() - lastActive > opt.sleepAfter) sleep(); }, 2000);

    // Away: she ducks behind the wall for a while (for example while her panel is open), leaving an ear and an eye.
    function away(on) { el.classList.toggle('gr--away', !!on); if (on) { hush(); dodge(false); setShy(false); } else remeasure(400); }
    function tuck(on) { el.classList.toggle('gr--tucked', !!on); if (on) hush(); remeasure(50); o.onTuck?.(!!on); }

    /* ---------- Never in the way of the page ----------
       Shy: when text, a control or an image lies under her, she stays mostly behind the wall (one ear and one eye).
       Dodge: when the pointer goes for something under her, or the page scrolls, she slips away until it is over.
       Hovering Fandogh herself never makes her leave. */
    const CONTROL = 'a,button,input,select,textarea,label,img,svg,video,canvas,[role=button],[role=link],[role=tab],[contenteditable]';
    const mine = n => el.contains(n) || (o.ignore && o.ignore.contains(n));
    const isContent = n => {
      if (!n || n === document.body || n === document.documentElement || mine(n)) return false;
      if (n.closest(CONTROL)) return true;
      return [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
    };
    const under = (x, y) => document.elementsFromPoint(x, y).find(n => !mine(n) && !n.contains(el));
    let shy = false, dodging = false, dodgeTimer = 0, measureTimer = 0;
    function measure() {
      if (!alive) return;
      const r = el.getBoundingClientRect();
      if (!opt.dodge || held || !r.width || el.classList.contains('gr--tucked') || el.classList.contains('gr--away')) { setShy(false); return; }
      let hits = 0;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) {
        const x = r.left + r.width * (.1 + i * .26), y = r.top + r.height * (.06 + j * .145);
        if (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && isContent(under(x, y))) hits++;
      }
      setShy(hits >= 2);
    }
    function setShy(on) { if (on === shy) return; shy = on; el.classList.toggle('gr--shy', on); }
    const remeasure = (ms = 350) => { clearTimeout(measureTimer); measureTimer = later(measure, ms); };
    function dodge(on, ms) {
      clearTimeout(dodgeTimer);
      if (on && opt.dodge && !held) { if (!dodging) { dodging = true; el.classList.add('gr--dodge'); } dodgeTimer = later(() => dodge(false), ms || 900); }
      else if (dodging) { dodging = false; el.classList.remove('gr--dodge'); }
    }
    listen(window, 'pointermove', e => {
      if (!opt.dodge || held) return; const r = el.getBoundingClientRect(), pad = 30;
      if (!r.width || e.clientX > r.right + pad || e.clientY < r.top - pad || e.clientX < r.left || e.clientY > r.bottom) return;
      if (e.target.closest?.('.gr__hit,.gr__bubble') || (o.ignore && o.ignore.contains(e.target))) return;
      if (isContent(under(e.clientX, e.clientY))) dodge(true, 1200);
    }, { passive: true });
    listen(window, 'scroll', e => { if (opt.dodge && !(o.ignore && o.ignore.contains(e.target))) { dodge(true, 700); remeasure(750); } }, { passive: true, capture: true });
    listen(window, 'resize', () => remeasure(), { passive: true });
    const watcher = new MutationObserver(list => { if (list.some(m => !mine(m.target))) remeasure(500); });
    watcher.observe(o.scope || document.body, { childList: true, subtree: true, characterData: true });
    const measureLoop = setInterval(() => { if (!document.hidden) measure(); }, 3000);

    // Enter once the main expression is decoded, so nothing pops in half-loaded.
    const ready = imgs.neutral.decode ? imgs.neutral.decode().catch(() => {}) : Promise.resolve();
    ready.then(() => requestAnimationFrame(() => { if (!alive) return; el.classList.add('gr--in'); later(measure, 2400); if (!still()) { later(blinkLoop, 3200); later(idleLoop, o.firstFidget || 9000); } }));

    return {
      el, hit,
      face: f => flashFace(f, 1500), mood: setMood, play, say, hush, sleep, wake, tuck, away, burst, measure,
      dot(on) { el.querySelector('.gr__dot').hidden = !on; },
      hold(on) { held = !!on; if (held) { wake(true); dodge(false); setShy(false); } else remeasure(200); },
      set(k, v) { opt[k] = v; if (k === 'track' && !v) el.style.setProperty('--tilt', '0deg'); if (k === 'dodge') { dodge(false); measure(); } },
      get state() { return { mood, face, tucked: el.classList.contains('gr--tucked'), shy, dodging, speaking: el.classList.contains('gr--speaking') }; },
      destroy() { alive = false; clearInterval(sleepCheck); clearInterval(measureLoop); clearInterval(talkTimer); watcher.disconnect(); cleanups.forEach(fn => fn()); el.remove(); },
    };
  }
  window.Fandogh = { mount, faces: FACES };
})();
