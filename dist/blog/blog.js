/* Articles: search and topic filter on the index, and the copy-link button on each article. */
(() => {
  'use strict';
  const grid = document.querySelector('[data-bl-grid]');
  if (grid) {
    const cards = [...grid.querySelectorAll('.bl-card')], promo = grid.querySelector('[data-bl-promo]'), input = document.querySelector('[data-bl-search]'), chips = [...document.querySelectorAll('[data-bl-tag]')];
    const count = document.querySelector('[data-bl-count]'), empty = document.querySelector('[data-bl-empty]');
    let tag = '';
    const apply = () => {
      const q = (input?.value || '').trim().toLocaleLowerCase('fa');
      let shown = 0;
      for (const card of cards) {
        const on = (!tag || card.dataset.tag === tag) && (!q || card.dataset.text.toLocaleLowerCase('fa').includes(q));
        card.hidden = !on; if (on) card.style.setProperty('--i', shown++);
      }
      // The lead layout only makes sense with every article on screen.
      grid.classList.toggle('is-filtered', !!(tag || q));
      if (promo) promo.hidden = !!(tag || q);
      count.textContent = shown.toLocaleString('fa-IR') + ' مقاله';
      empty.hidden = shown > 0;
    };
    input?.addEventListener('input', apply);
    chips.forEach(chip => chip.addEventListener('click', () => { tag = chip.dataset.blTag; chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip))); apply(); }));
  }
  document.querySelectorAll('[data-copy-link]').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copyLink); button.classList.add('is-done'); button.setAttribute('aria-label', 'نشانی کپی شد'); setTimeout(() => { button.classList.remove('is-done'); button.setAttribute('aria-label', 'کپی نشانی مقاله'); }, 1800); }
    catch { prompt('نشانی مقاله:', button.dataset.copyLink); }
  }));
})();
