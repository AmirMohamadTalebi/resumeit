// Info pages: table-of-contents scroll spy, reading progress and copy buttons for contact details.
(() => {
  const links = [...document.querySelectorAll('.lg-toc a[href^="#"]')];
  const sections = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const bar = document.querySelector('[data-progress]');
  if (sections.length) {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = innerHeight * .3;
      let current = sections[0];
      for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s;
      for (const a of links) a.hash === '#' + current.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
      if (bar) {
        const article = sections[0].parentElement.getBoundingClientRect();
        const done = Math.min(1, Math.max(0, (line - article.top) / Math.max(1, article.height - line)));
        bar.style.width = (done * 100).toFixed(1) + '%';
      }
    };
    addEventListener('scroll', () => { frame ||= requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();
  }
  document.addEventListener('click', async e => {
    const button = e.target.closest('[data-copy]');
    if (!button) return;
    const label = button.querySelector('span');
    try { await navigator.clipboard.writeText(button.dataset.copy); } catch { return; }
    button.classList.add('is-done');
    if (label) label.textContent = 'کپی شد';
    setTimeout(() => { button.classList.remove('is-done'); if (label) label.textContent = 'کپی'; }, 1800);
  });
})();
