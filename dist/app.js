/* Landing page behaviour: template showcase and filters, the four-step preview, FAQ accordion, gentle reveals.
   Every part checks its own elements so the page works if a section is removed. No animation library. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  // e-Namad seal: show the official image when it loads, a text link otherwise.
  const seal = $('[data-enamad-seal]');
  if (seal) {
    const image = seal.querySelector('img'), fallback = $('.footer-enamad-fallback');
    const update = () => { const loaded = image.complete && image.naturalWidth > 0; seal.hidden = !loaded; if (fallback) fallback.hidden = loaded; };
    image.addEventListener('load', update); image.addEventListener('error', update); update();
  }

  // Template showcase: the big preview follows the selected thumbnail; filters hide whole cards.
  const THEMES = {
    glacier: ['یخچال', 'دو ستونی، روشن و منظم؛ انتخاب امن برای شروع'], vista: ['ویستا', 'تک‌صفحه‌ای با مهارت‌ها و نمونه‌کارهای برجسته'],
    satiar: ['ساتیار', 'تصویری و تک‌صفحه‌ای برای معرفی پررنگ'], terminal: ['ترمینال', 'تیره با حال‌وهوای خط فرمان برای برنامه‌نویس‌ها'],
    mono: ['تک‌رنگ', 'مینیمال با تأکید روی پروژه‌ها و مهارت‌ها'], journal: ['دفترچه', 'حال‌وهوای نوشتاری برای بلاگرها و دانشجوها'],
    campus: ['پردیس', 'تک‌ستونی و گرم، مناسب دانشجو و دانش‌آموز'], spotlight: ['نورافکن', 'جلوهٔ تصویری بزرگ برای تولیدکننده‌های محتوا'],
  };
  function selectGallery(theme) {
    const t = THEMES[theme], frame = $('#gallery-preview'); if (!t || !frame) return;
    $$('[data-gallery]').forEach(b => { const on = b.dataset.gallery === theme; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    const live = $('.template-live'); if (live) live.dataset.theme = theme;
    $('#gallery-title').textContent = t[0]; $('#gallery-description').textContent = t[1]; $('#gallery-address').textContent = 'niloofar.ResumeIt.ir';
    $('#gallery-open').href = '/resume' + theme + '/'; frame.alt = 'نمای قالب ' + t[0];
    if (!calm.matches) frame.animate([{ opacity: .35, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    frame.src = '/brand/template-thumbs/resume-' + theme + '.jpg';
  }
  $$('[data-gallery]').forEach(b => b.addEventListener('click', () => selectGallery(b.dataset.gallery)));
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    $$('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    $$('[data-category]').forEach(card => { card.hidden = button.dataset.filter !== 'all' && !card.dataset.category.split(' ').includes(button.dataset.filter); });
    const current = $('[data-gallery][aria-pressed="true"]');
    if (!current || current.closest('[hidden]')) { const first = $('.template-card:not([hidden]) [data-gallery]'); if (first) selectGallery(first.dataset.gallery); }
  }));

  // Four-step preview.
  const STEPS = [['سلام، قهرمانِ قصه!', 'هر مسیر بزرگ، از معرفی خودت شروع می‌شود', 'من نیکام؛ دانشجو و عاشق ساختن چیزهای تازه', '✦ شروع یک فصل تازه'], ['چیزهایی که می‌توانی بسازی', 'تجربه فقط شغل نیست؛ پروژه‌های تو هم حرف دارند', 'مهارت‌ها: طراحی، برنامه‌نویسی، عکاسی', '✦ توانایی‌هایت را پیدا کردی'], ['این رنگ، شبیه توست', 'ظاهر صفحه‌ات را با حال و هوای خودت هماهنگ کن', 'قالب یخچال · فونت وزیرمتن · آبی یخی', '✦ سبک خودت را ساختی'], ['یک آدرس به نام تو', 'قصه‌ات آماده است تا جای خودش را در وب پیدا کند', 'nika.ResumeIt.ir + /links', '✦ آمادهٔ دیده شدن']];
  const preview = $('.game-preview'); let step = 0;
  function showStep(index) {
    if (!preview) return; step = index; preview.dataset.step = String(index);
    $$('button[data-step]').forEach(b => { const on = Number(b.dataset.step) === index; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    $('#level').textContent = 'مرحلهٔ ' + '۱۲۳۴'[index] + ' از ۴';
    const bar = $('.game-progress i'); if (bar) bar.style.width = (index + 1) * 25 + '%';
    ['step-title', 'step-copy', 'step-example', 'step-reward'].forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = STEPS[index][i]; });
    const start = $('.guide-start'); if (start) start.hidden = index !== 3;
    $('#next-step').textContent = index === 3 ? 'از اول ↻' : 'مرحلهٔ بعد ←';
    if (!calm.matches) preview.animate([{ opacity: .55, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  $$('button[data-step]').forEach(b => b.addEventListener('click', () => showStep(Number(b.dataset.step))));
  $('#next-step')?.addEventListener('click', () => showStep((step + 1) % 4));
  if (preview) showStep(0);

  // FAQ: one answer open at a time, with a short height animation.
  const items = $$('.faq-list details');
  function setFaq(detail, opening) {
    const answer = detail.querySelector('.faq-answer');
    if (calm.matches || !answer) { detail.open = opening; return; }
    const from = detail.open ? answer.getBoundingClientRect().height : 0; detail.open = true;
    const run = answer.animate([{ height: from + 'px', opacity: from ? 1 : 0 }, { height: (opening ? answer.scrollHeight : 0) + 'px', opacity: opening ? 1 : 0 }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
    run.onfinish = () => { detail.open = opening; };
  }
  items.forEach(detail => detail.querySelector('summary').addEventListener('click', e => {
    e.preventDefault(); const opening = !detail.open;
    if (opening) items.forEach(other => { if (other !== detail && other.open) setFaq(other, false); });
    setFaq(detail, opening);
  }));

  // Sections fade in once as they enter the viewport.
  const reveals = $$('.ln-reveal');
  if (!calm.matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('ln-motion');
    const io = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); } }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  }
})();
