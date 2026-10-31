/* Landing page behaviour (2.7.6): template showcase and filters, the four-step story, FAQ, and the motion layer:
   word-by-word reveals, a parallax hero, count-ups, a typewriter, scroll-speed marquees, tilt cards, magnetic
   buttons and Gerdoo peeking from the edge. On wide screens GSAP + ScrollTrigger are loaded on demand for the
   pinned story and scroll scrubs. Every part checks its own elements, and reduced motion gets a calm, complete page. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = !calm.matches && 'IntersectionObserver' in window;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const fa = n => Number(n).toLocaleString('fa-IR');
  if (motion) document.documentElement.classList.add('ln-motion');

  // Template showcase: the big preview wipes to the selected template; filters reflow the cards with FLIP.
  const THEMES = {
    glacier: ['یخچال', 'دو ستونی، روشن و منظم؛ انتخاب امن برای شروع'], vista: ['ویستا', 'تک‌صفحه‌ای با مهارت‌ها و نمونه‌کارهای برجسته'],
    satiar: ['ساتیار', 'تصویری و تک‌صفحه‌ای برای معرفی پررنگ'], terminal: ['ترمینال', 'تیره با حال‌وهوای خط فرمان برای برنامه‌نویس‌ها'],
    mono: ['تک‌رنگ', 'مینیمال با تأکید روی پروژه‌ها و مهارت‌ها'], journal: ['دفترچه', 'حال‌وهوای نوشتاری برای بلاگرها و دانشجوها'],
    campus: ['پردیس', 'تک‌ستونی و گرم، مناسب دانشجو و دانش‌آموز'], spotlight: ['نورافکن', 'جلوهٔ تصویری بزرگ برای تولیدکننده‌های محتوا'],
    shabtab: ['شب‌تاب', 'آسمان شب رزومیت با نام طلایی، عکس در مدار و حرکت‌های زنده'],
  };
  function selectGallery(theme) {
    const t = THEMES[theme], frame = $('#gallery-preview'); if (!t || !frame) return;
    $$('[data-gallery]').forEach(b => { const on = b.dataset.gallery === theme; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    const live = $('.template-live'); if (live) live.dataset.theme = theme;
    $('#gallery-title').textContent = t[0]; $('#gallery-description').textContent = t[1]; $('#gallery-address').textContent = 'niloofar.ResumeIt.ir';
    $('#gallery-open').href = '/resume' + theme + '/'; frame.alt = 'نمای قالب ' + t[0];
    frame.src = '/brand/template-thumbs/resume-' + theme + '.jpg';
    const wipe = frame.closest('.ln-wipe');
    if (wipe && motion) { wipe.classList.remove('is-swap'); void wipe.offsetWidth; wipe.classList.add('is-swap'); }
  }
  $$('[data-gallery]').forEach(b => b.addEventListener('click', () => selectGallery(b.dataset.gallery)));

  const filters = $('.ln-filters'), ink = $('.ln-filters__ink');
  function moveInk() {
    const active = filters?.querySelector('.btn.active'); if (!ink || !active || !active.offsetWidth) return;
    filters.classList.add('has-ink');
    filters.style.setProperty('--ink-x', active.offsetLeft + 'px'); filters.style.setProperty('--ink-w', active.offsetWidth + 'px');
  }
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    $$('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    moveInk();
    const cards = $$('[data-category]'), before = new Map(cards.filter(c => !c.hidden).map(c => [c, c.getBoundingClientRect()]));
    cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && !card.dataset.category.split(' ').includes(button.dataset.filter); });
    if (motion) cards.filter(c => !c.hidden).forEach((card, i) => {
      const now = card.getBoundingClientRect(), was = before.get(card);
      if (was) { const dx = was.left - now.left, dy = was.top - now.top; if (dx || dy) card.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.3,1.25,.5,1)' }); }
      else card.animate([{ opacity: 0, transform: 'scale(.6) rotate(-5deg)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 50, easing: 'cubic-bezier(.3,1.35,.5,1)', fill: 'backwards' });
    });
    const current = $('[data-gallery][aria-pressed="true"]');
    if (!current || current.closest('[hidden]')) { const first = $('.template-card:not([hidden]) [data-gallery]'); if (first) selectGallery(first.dataset.gallery); }
  }));
  moveInk(); addEventListener('resize', moveInk); document.fonts?.ready.then(moveInk);

  // The four-step story: buttons, the "next" control and (on wide screens) scroll progress all land here.
  const STEPS = [['سلام، قهرمانِ قصه!', 'هر مسیر بزرگ، از معرفی خودت شروع می‌شود', 'من نیکام؛ دانشجو و عاشق ساختن چیزهای تازه', '✦ شروع یک فصل تازه'], ['چیزهایی که می‌توانی بسازی', 'تجربه فقط شغل نیست؛ پروژه‌های تو هم حرف دارند', 'مهارت‌ها: طراحی، برنامه‌نویسی، عکاسی', '✦ توانایی‌هایت را پیدا کردی'], ['این رنگ، شبیه توست', 'ظاهر صفحه‌ات را با حال و هوای خودت هماهنگ کن', 'قالب یخچال · فونت وزیرمتن · آبی یخی', '✦ سبک خودت را ساختی'], ['یک آدرس به نام تو', 'قصه‌ات آماده است تا جای خودش را در وب پیدا کند', 'nika.ResumeIt.ir + /links', '✦ آمادهٔ دیده شدن']];
  const preview = $('.game-preview'), sheet = $('.ln-build__sheet'); let step = 0, sheetSeen = !motion;
  function showStep(index) {
    if (!preview) return; step = index; preview.dataset.step = String(index);
    $$('button[data-step]').forEach(b => { const on = Number(b.dataset.step) === index; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    $('#level').textContent = 'مرحلهٔ ' + '۱۲۳۴'[index] + ' از ۴';
    const bar = $('.game-progress i'); if (bar) bar.style.width = (index + 1) * 25 + '%';
    ['step-title', 'step-copy', 'step-example', 'step-reward'].forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = STEPS[index][i]; });
    const start = $('.guide-start'); if (start) start.hidden = index !== 3;
    $('#next-step').textContent = index === 3 ? 'از اول ↻' : 'مرحلهٔ بعد ←';
    if (sheet && sheetSeen) sheet.dataset.buildStep = String(index);
    if (motion) ['#step-title', '#step-copy', '#step-example'].forEach((s, i) => $(s)?.animate([{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 480, delay: i * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  }
  // On phones the preview sits below the four steps; bring it into view so the change is seen, not just made.
  const reveal = () => { if (innerWidth < 760 && preview) { const r = preview.getBoundingClientRect(); if (r.top < 70 || r.top > innerHeight * .5) preview.scrollIntoView({ block: 'start', behavior: motion ? 'smooth' : 'auto' }); } };
  $$('button[data-step]').forEach(b => b.addEventListener('click', () => { showStep(Number(b.dataset.step)); reveal(); }));
  $('#next-step')?.addEventListener('click', () => showStep((step + 1) % 4));
  if (sheet && motion) sheet.removeAttribute('data-build-step');
  if (preview) showStep(0);

  // FAQ: one answer open at a time with a height animation; search filters and highlights as you type, category
  // chips narrow the list and count what matches, and every answer has its own link (#faq-…) that opens it.
  const items = $$('.faq-list details'), faDigits = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  function setFaq(detail, opening, instant) {
    const answer = detail.querySelector('.faq-answer');
    detail._run?.cancel();
    if (!motion || instant || !answer) { detail.open = opening; return; }
    const from = detail.open ? answer.getBoundingClientRect().height : 0; detail.open = true;
    const run = detail._run = answer.animate([{ height: from + 'px', opacity: from ? 1 : 0 }, { height: (opening ? answer.scrollHeight : 0) + 'px', opacity: opening ? 1 : 0 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    run.onfinish = () => { detail.open = opening; detail._run = null; };
  }
  function openFaq(detail, instant) {
    items.forEach(other => { if (other !== detail && other.open) setFaq(other, false, instant); });
    setFaq(detail, true, instant);
  }
  items.forEach((detail, i) => {
    const num = detail.querySelector('.ln-faq__num'); if (num) num.textContent = faDigits(String(i + 1).padStart(2, '0'));
    detail.querySelector('summary').addEventListener('click', e => {
      e.preventDefault(); const opening = !detail.open;
      if (opening) openFaq(detail); else setFaq(detail, false);
      if (detail.id) history.replaceState(null, '', opening ? '#' + detail.id : location.pathname + location.search);
    });
  });
  const faqSearch = $('[data-faq-search]'), faqClear = $('[data-faq-clear]'), faqEmpty = $('[data-faq-empty]'), faqCats = $$('.ln-faq__cat'), faqInk = $('.ln-faq__ink');
  const fold = s => String(s || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[ً-ْ]/g, '').replace(/[‌\s]+/g, ' ').trim();
  const escHtml = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  // Questions and answers are plain text, kept aside so highlights can be redrawn safely.
  items.forEach(d => { d.querySelectorAll('.ln-faq__q, .faq-answer p').forEach(el => { if (!el.children.length) el.dataset.raw = el.textContent; }); d.dataset.text = fold(d.textContent); });
  const highlight = (el, words) => {
    const raw = el.dataset.raw; if (raw === undefined) return;
    if (!words.length) { el.textContent = raw; return; }
    const re = new RegExp('(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
    el.innerHTML = raw.split(re).map((part, i) => i % 2 ? '<mark>' + escHtml(part) + '</mark>' : escHtml(part)).join('');
  };
  let faqCat = 'all', faqTimer = 0;
  function filterFaq() {
    const q = fold(faqSearch?.value), words = q.split(' ').filter(w => w.length > 1), counts = { all: 0 };
    let shown = 0, last = null;
    items.forEach(d => {
      const hit = !words.length || words.every(w => d.dataset.text.includes(w)), cat = d.dataset.faqCat;
      if (hit) { counts.all++; counts[cat] = (counts[cat] || 0) + 1; }
      const show = hit && (faqCat === 'all' || cat === faqCat);
      if (show && d.hidden && motion) d.animate([{ opacity: 0, transform: 'translateY(12px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: shown * 40, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'backwards' });
      d.hidden = !show; if (show) { shown++; last = d; }
      d.querySelectorAll('[data-raw]').forEach(el => highlight(el, show ? words : []));
    });
    $$('[data-faq-count]').forEach(b => { b.textContent = faDigits(counts[b.dataset.faqCount] || 0); });
    if (faqEmpty) faqEmpty.hidden = shown > 0;
    if (faqClear) faqClear.hidden = !q;
    if (words.length && shown === 1 && !last.open) openFaq(last);
  }
  function faqInkTo(btn) {
    if (!faqInk || !btn || !btn.offsetWidth) return;
    btn.parentElement.classList.add('has-ink');
    faqInk.style.width = btn.offsetWidth + 'px'; faqInk.style.height = btn.offsetHeight + 'px';
    faqInk.style.transform = 'translate(' + btn.offsetLeft + 'px,' + (btn.offsetTop - 5) + 'px)';
  }
  faqCats.forEach(b => b.addEventListener('click', () => {
    faqCat = b.dataset.faqCat;
    faqCats.forEach(x => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    faqInkTo(b); filterFaq();
  }));
  faqSearch?.addEventListener('input', () => { clearTimeout(faqTimer); faqTimer = setTimeout(filterFaq, 90); });
  faqSearch?.addEventListener('keydown', e => { if (e.key === 'Escape' && faqSearch.value) { faqSearch.value = ''; filterFaq(); } });
  faqClear?.addEventListener('click', () => { faqSearch.value = ''; filterFaq(); faqSearch.focus(); });
  if (items.length) {
    filterFaq();
    const ink = () => faqInkTo($('.ln-faq__cat.is-on'));
    ink(); addEventListener('resize', ink); document.fonts?.ready.then(ink);
    const fromHash = () => {
      const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!target || !target.matches('.faq-list details')) return;
      if (target.hidden) { faqCat = 'all'; if (faqSearch) faqSearch.value = ''; faqCats.forEach(x => { const on = x.dataset.faqCat === 'all'; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); }); ink(); filterFaq(); }
      openFaq(target, true);
    };
    fromHash(); addEventListener('hashchange', fromHash);
  }

  // «فرصت بعدی، شاید یک آدرس بخواهد»: the field previews the visitor's own address with the publish page's rule
  // (3–24 lowercase letters, digits and single hyphens). Until they type, demo names write themselves into the
  // window; then each new letter pops into the bar, the avatar takes their initial and colour, and a valid name
  // earns a stamp and confetti. Enter leads to sign-up; nothing is reserved here.
  const claim = $('[data-claim]');
  if (claim) {
    const section = claim.closest('.ln-claim'), input = claim.querySelector('input'), field = claim.querySelector('.ln-claim__field'), hint = $('[data-claim-hint]');
    const urlEl = $('[data-claim-url]'), nameEl = $('[data-claim-name]'), initial = $('[data-claim-initial]'), scene = $('[data-claim-scene]');
    const HINT = hint ? hint.textContent : '', RULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    let shown = '', demoOn = motion;
    const paint = handle => {
      const value = handle || 'you', grew = value.length > shown.length && value.startsWith(shown);
      urlEl.innerHTML = [...value].map((ch, i) => '<span class="ln-claim__ch' + (grew && i >= shown.length ? ' is-new' : '') + '">' + ch + '</span>').join('');
      nameEl.textContent = value;
      if (initial.textContent !== value[0].toUpperCase()) {
        initial.textContent = value[0].toUpperCase(); initial.style.setProperty('--h', String((value.charCodeAt(0) * 47) % 360));
        initial.classList.remove('is-swap'); void initial.offsetWidth; initial.classList.add('is-swap');
      }
      shown = value;
    };
    const clean = v => v.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, 24);
    input.addEventListener('input', () => {
      demoOn = false;
      const raw = input.value, handle = clean(raw), foreign = /[^\x00-\x7F]/.test(raw);
      if (raw !== handle) input.value = handle;
      const valid = handle.length >= 3 && RULE.test(handle);
      section.classList.toggle('is-valid', valid);
      hint.classList.toggle('is-warn', foreign);
      hint.textContent = foreign ? 'برای آدرس از حروف انگلیسی استفاده کن؛ مثلاً nika یا amir-rad.' : valid ? 'آدرس قشنگی است! اگر کسی زودتر برنداشته باشد، بعد از ثبت‌نام در بخش «آدرس و انتشار» ثبتش کن.' : HINT;
      if (foreign && motion) { field.classList.remove('is-shake'); void field.offsetWidth; field.classList.add('is-shake'); }
      paint(handle);
    });
    input.addEventListener('focus', () => { demoOn = false; });
    claim.addEventListener('submit', e => { e.preventDefault(); location.href = claim.querySelector('[data-start-link]')?.getAttribute('href') || '/register/'; });
    // Demo names type and erase themselves while the section is on screen and nobody has typed yet.
    if (motion && 'IntersectionObserver' in window) {
      const names = ['ava', 'nika', 'amir-rad', 'sara', 'reza'];
      let n = 0, len = 3, erasing = true, timer = 0, visible = false;
      const step = () => {
        timer = 0; if (!demoOn || !visible) return;
        const name = names[n];
        if (erasing) { len--; if (len <= 0) { erasing = false; n = (n + 1) % names.length; len = 0; } }
        else { len++; if (len >= names[n].length) { erasing = true; paint(names[n]); timer = setTimeout(step, 1800); return; } }
        paint((erasing ? name : names[n]).slice(0, Math.max(1, len)));
        timer = setTimeout(step, erasing ? 70 : 140);
      };
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible && !timer) timer = setTimeout(step, 900); }, { threshold: .3 }).observe(scene);
    }
    if (motion && finePointer) {
      const stage = claim.closest('.ln-claim__stage'), win = $('.ln-claim__window');
      stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); win.style.setProperty('--ry', ((e.clientX - r.left) / r.width * 10 - 5).toFixed(2) + 'deg'); win.style.setProperty('--rx', ((r.top + r.height / 2 - e.clientY) / r.height * 6).toFixed(2) + 'deg'); });
      stage.addEventListener('pointerleave', () => { win.style.removeProperty('--ry'); win.style.removeProperty('--rx'); });
    }
  }

  // Headings reveal word by word. Words, not letters, so Persian letters keep joining.
  $$('[data-split]').forEach(el => {
    let i = 0;
    const walk = node => [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span'); w.className = 'ln-w'; w.style.setProperty('--i', i++); w.textContent = part; frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) {
        if (child.matches('.ln-shine, em')) { child.classList.add('ln-w'); child.style.setProperty('--i', i++); }
        else walk(child);
      }
    });
    walk(el);
  });

  // Everything else that should arrive on scroll rises in; siblings that enter together are staggered.
  ['.template-card', '.faq-list details', '.ln-numbers>div', '.ln-dual__visual', '.template-live', '.ln-preview', '.ln-build', '.ln-how__copy h2', '.ln-how .ln-eyebrow', '.step', '.ln-foot__bottom']
    .forEach(s => $$(s).forEach(el => { if (!el.dataset.anim && !el.hasAttribute('data-split')) el.dataset.anim = 'rise'; }));
  const countUp = el => {
    const to = Number(el.dataset.count) || 0, ring = el.closest('.ln-ring');
    if (!motion) { el.textContent = fa(to); ring?.style.setProperty('--v', to); return; }
    const t0 = performance.now(), dur = 1700;
    const tick = now => { const p = Math.min(1, (now - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - p, 4))); el.textContent = fa(v); ring?.style.setProperty('--v', v); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const onEnter = el => {
    el.classList.add('is-in');
    if (el.hasAttribute('data-count')) countUp(el);
    if (el === sheet) { sheetSeen = true; sheet.dataset.buildStep = String(step); }
  };
  const revealTargets = $$('[data-anim], [data-split], [data-tilt], [data-chat], [data-count], .ln-build__sheet, .ln-claim__scene');
  if (motion) {
    $$('[data-count]').forEach(el => { el.textContent = fa(0); el.closest('.ln-ring')?.style.setProperty('--v', 0); });
    const io = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach((entry, i) => { entry.target.style.setProperty('--d', Math.min(i, 8) * 90 + 'ms'); onEnter(entry.target); io.unobserve(entry.target); });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealTargets.forEach(el => io.observe(el));
  } else revealTargets.forEach(onEnter);

  // Hero: the stage assembles, then follows the pointer in depth.
  const hero = $('.ln-hero');
  requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add('is-ready')));
  if (motion && finePointer && hero) {
    const layers = $$('.ln-stage [data-depth]'); let raf = 0, nx = 0, ny = 0;
    hero.addEventListener('pointermove', e => {
      nx = e.clientX / innerWidth - .5; ny = e.clientY / innerHeight - .5;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; layers.forEach(l => { const d = Number(l.dataset.depth) || 0; l.style.translate = `${(-nx * d).toFixed(1)}px ${(-ny * d).toFixed(1)}px`; }); });
    });
    hero.addEventListener('pointerleave', () => layers.forEach(l => { l.style.translate = ''; }));
  }

  // Rotating audience word in the hero.
  const word = $('[data-words]');
  if (word && motion) {
    const words = word.dataset.words.split('|'), box = word.parentElement; let w = 0;
    setInterval(() => {
      if (document.hidden) return;
      const out = word.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-110%)', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.5,0,.75,0)' });
      out.onfinish = () => {
        const from = box.offsetWidth; w = (w + 1) % words.length; word.textContent = words[w];
        box.style.width = ''; const to = box.offsetWidth;
        box.animate([{ width: from + 'px' }, { width: to + 'px' }], { duration: 420, easing: 'cubic-bezier(.3,1.3,.5,1)' });
        word.animate([{ transform: 'translateY(110%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      };
    }, 2600);
  }

  // Typewriter for the address tile.
  const typed = $('[data-type]');
  if (typed && motion) {
    const names = typed.dataset.type.split('|'); let n = 0, len = names[0].length, deleting = true;
    const type = () => {
      const name = names[n];
      if (deleting) { len--; if (len <= 0) { deleting = false; n = (n + 1) % names.length; } }
      else { len++; if (len >= names[n].length) { deleting = true; typed.textContent = names[n]; return setTimeout(type, 1800); } }
      typed.textContent = (deleting ? name : names[n]).slice(0, Math.max(0, len));
      setTimeout(type, deleting ? 55 : 110);
    };
    setTimeout(type, 2200);
  }

  // Cards tilt toward the pointer and a soft light follows it; primary buttons lean toward it.
  if (motion && finePointer) {
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        card.style.transform = `perspective(1000px) rotateX(${((.5 - py) * 7).toFixed(2)}deg) rotateY(${((px - .5) * 9).toFixed(2)}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
    $$('[data-magnetic]').forEach(btn => {
      btn.addEventListener('pointermove', e => { const r = btn.getBoundingClientRect(); btn.style.translate = `${((e.clientX - r.left - r.width / 2) * .25).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * .35).toFixed(1)}px`; });
      btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
    });
    const glow = $('.ln-cursor');
    if (glow) addEventListener('pointermove', e => { glow.classList.add('is-on'); glow.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`; }, { passive: true });
  }

  // Scroll loop: template wall drift and marquee speed that follows scroll velocity (the header lives in
  // public-chrome.js).
  $$('.ln-wall__row').forEach(row => row.append(...[...row.children].map(c => c.cloneNode(true))));
  const wall = $('.ln-wall'), loops = $$('.ln-marquee__row, .ln-wall__row');
  let lastY = scrollY, vel = 0, ticking = false;
  const frame = () => {
    const y = scrollY;
    if (wall && motion) { const r = wall.getBoundingClientRect(), p = (innerHeight - r.top) / (innerHeight + r.height) - .5; wall.style.setProperty('--wx', (p * 260).toFixed(1) + 'px'); wall.querySelector('.ln-wall__row--b')?.style.setProperty('--wx', (-p * 260).toFixed(1) + 'px'); }
    if (motion) {
      vel += ((y - lastY) - vel) * .25;
      const rate = Math.max(-3, Math.min(6, 1 + vel * .12));
      loops.forEach(row => row.getAnimations().forEach(a => { a.playbackRate = rate; }));
    }
    lastY = y;
    if (motion && Math.abs(vel) > .05) requestAnimationFrame(frame);
    else { vel = 0; loops.forEach(row => row.getAnimations().forEach(a => { a.playbackRate = 1; })); ticking = false; }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();

  // Fandogh, desktop only: loaded once the page has settled, she peeks from the bottom-left corner, greets the
  // visitor and says one thing about each section. Phones never load her.
  const fdHost = $('[data-fandogh]');
  if (fdHost && matchMedia('(min-width: 1024px)').matches) {
    const css = href => new Promise(ok => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = l.onerror = ok; document.head.append(l); });
    const js = src => new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.append(s); });
    const start = () => css('/public-assets/fandogh.css').then(() => js('/public-assets/fandogh.js')).then(() => {
      if (!window.Fandogh) return;
      const go = () => { location.href = $('[data-start-link]')?.getAttribute('href') || '/register/'; };
      const invite = { actions: [{ label: 'شروع رایگان', primary: true }], onAction: go };
      const fd = window.Fandogh.mount(fdHost, { base: '/brand/fandogh/', label: 'فندق؛ بیا رزومه‌ات را بسازیم', onClick: () => { fd.play('purr'); fd.say('میو! بیا با هم رزومه‌ات را بسازیم؛ شروعش رایگان است.', invite); } });
      setTimeout(() => fd.say('میو! من فندقم، دستیار رزومه‌ات در رزومیت 🐾', invite), 3400);
      const lines = { features: 'این‌ها همه برای توست؛ من هم یکی از امکاناتم!', how: 'چهار قدم کوتاه؛ من هر قدم کنارت هستم.', templates: 'من «یخچال» را دوست دارم، تو کدام؟', pricing: 'روزی ۵ پیام با من رایگان است.', faq: 'سؤالی ماند؟ بعد از ثبت‌نام از خودم بپرس.' };
      const seen = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting || fd.state.speaking) return;
        fd.say(lines[entry.target.id]); seen.unobserve(entry.target);
      }), { threshold: .35 });
      Object.keys(lines).forEach(id => { const s = document.getElementById(id); if (s) seen.observe(s); });
    }).catch(() => {});
    if (document.readyState === 'complete') setTimeout(start, 900); else addEventListener('load', () => setTimeout(start, 900), { once: true });
  }

  // Wide screens: load GSAP for the pinned story and scroll scrubs. Phones keep the lighter CSS motion.
  if (!motion || !matchMedia('(min-width: 1081px)').matches) return;
  const load = src => new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.append(s); });
  load('/assets/gsap.min.js').then(() => load('/assets/ScrollTrigger.min.js')).then(() => {
    const { gsap, ScrollTrigger } = window; if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    const out = { trigger: hero, start: 'top top', end: 'bottom top', scrub: .6 };
    gsap.to('.ln-stage', { yPercent: -12, scale: .9, opacity: .35, ease: 'none', scrollTrigger: out });
    gsap.to('.ln-hero__copy', { y: -110, opacity: .15, ease: 'none', scrollTrigger: out });
    gsap.to('.ln-hero .ln-aurora', { yPercent: 30, ease: 'none', scrollTrigger: out });
    gsap.to('.ln-grid-floor', { opacity: 0, ease: 'none', scrollTrigger: out });
    if ($('.ln-how') && preview) {
      let last = -1;
      ScrollTrigger.create({ trigger: '.ln-how', pin: '.ln-how__pin', start: 'top top', end: '+=2200', onUpdate: self => { const i = Math.min(3, Math.floor(self.progress * 4)); if (i !== last) { last = i; if (i !== step) showStep(i); } } });
    }
    gsap.fromTo('.ln-claim__stage', { scale: .86, borderRadius: 90 }, { scale: 1, borderRadius: 40, ease: 'none', scrollTrigger: { trigger: '.ln-claim', start: 'top bottom', end: 'top 35%', scrub: .6 } });
    gsap.to('.ln-dual .phone', { y: -70, rotate: -5, ease: 'none', scrollTrigger: { trigger: '.ln-dual', start: 'top bottom', end: 'bottom top', scrub: .8 } });
    gsap.to('.ln-orbit', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.ln-dual', start: 'top bottom', end: 'bottom top', scrub: .8 } });
    gsap.fromTo('.ln-numbers', { rotateX: 28, transformPerspective: 1200 }, { rotateX: 0, ease: 'none', scrollTrigger: { trigger: '.ln-numbers', start: 'top bottom', end: 'top 55%', scrub: .6 } });
    gsap.to('.ln-window--big', { y: -30, ease: 'none', scrollTrigger: { trigger: '#templates', start: 'top bottom', end: 'bottom top', scrub: .8 } });
    addEventListener('load', () => ScrollTrigger.refresh());
  }).catch(() => {});
})();
