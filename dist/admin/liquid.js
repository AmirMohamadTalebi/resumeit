// Liquid glass motion helpers: stagger indexes, pointer light and button ripples. Purely visual.
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const groups = [["#content,.admin-grid,.catalog-grid,.overview-kpis", 12], [".chart,.table tbody,.admin-nav ul", 30]];
  const stagger = (root) => {
    for (const [sel, cap] of groups)
      for (const parent of root.querySelectorAll(sel))
        [...parent.children].forEach((el, i) => el.style.setProperty("--i", Math.min(i, cap)));
  };
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; stagger(document); });
  };
  const start = () => {
    stagger(document);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  };
  document.addEventListener("pointermove", (e) => {
    if (reduce.matches) return;
    const card = e.target.closest && e.target.closest(".panel,.kpi,.catalog-item,.admin-head");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
  }, { passive: true });
  document.addEventListener("pointerdown", (e) => {
    if (reduce.matches || e.button !== 0) return;
    const btn = e.target.closest && e.target.closest(".btn");
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect(), dot = document.createElement("span");
    dot.className = "lq-ripple";
    dot.setAttribute("aria-hidden", "true");
    dot.style.left = e.clientX - r.left + "px";
    dot.style.top = e.clientY - r.top + "px";
    dot.style.setProperty("--d", Math.max(r.width, r.height) * 2.4 + "px");
    btn.append(dot);
    setTimeout(() => dot.remove(), 700);
  }, { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
