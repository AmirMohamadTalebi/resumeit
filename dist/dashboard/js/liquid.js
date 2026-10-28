// Liquid glass motion helpers for the dashboard: stagger indexes, pointer light and button ripples. Purely visual.
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const groups = [
    ["#view,.activity-summary,.pstat-grid,.statgrid,.tgrid,.publication-grid,.gallery-pages,.plans,.chklist,.rows,.setgrid", 12],
    [".table tbody,.coral-rail>nav,.sidebar .nav,.sidebar .nav__children,.journey", 30],
  ];
  const lit = ".panel,.hero,.activity-card,.pstat,.pubcard,.planhero,.studio-ready,.studio-overview,.wallet-balance,.stat,.sharecard,.plan";
  const stagger = () => {
    for (const [sel, cap] of groups)
      for (const parent of document.querySelectorAll(sel))
        [...parent.children].forEach((el, i) => el.style.setProperty("--i", Math.min(i, cap)));
    document.querySelectorAll(".journey__step").forEach((el, i) => el.style.setProperty("--i", Math.min(i, 12)));
  };
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; stagger(); });
  };
  const start = () => {
    stagger();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  };
  document.addEventListener("pointermove", (e) => {
    if (reduce.matches) return;
    const card = e.target.closest && e.target.closest(lit);
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
