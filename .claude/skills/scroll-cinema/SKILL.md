---
name: scroll-cinema
description: Cinematic, scroll-driven page building for ResumeIt, modelled on the Scrolltide library (scrolltide.co) and its «SELENE» landing page as the reference. Use it whenever you build or rebuild a landing page, hero, marketing or showcase page, a template sample, a long info page, an animated banner/poster in HTML, or whenever the user asks for scroll animation, parallax, "cinematic", "like scrolltide", pinned sections or storytelling on scroll. Works with the `motion` skill (its rules still apply) and needs no libraries.
---

# Scroll cinema

A page is a short film the visitor directs with the scrollbar. Each screen is a **chapter** that pins in place,
plays while the visitor scrolls through it, and hands over to the next. Reference: Scrolltide's **SELENE** (a lunar
expedition: dust clears onto the Moon, the Earth rises over the horizon across six parallax layers, a trajectory
inks itself while a counter climbs to 384,400 km, and a mission reel slides past sideways). Take the *grammar* of
that page, never its copy, art or code; Scrolltide's prompts are paid and are not ours to reuse.

ResumeIt's version is the night sky of `dist/landing.css` (night `#0b141b → #1b3242`, gold `#f0bd52`, teal
`#3d8c9c`, sky `#8ec5d6`, Vazirmatn, RTL). Fandogh may appear as a character between chapters.

## The six moves (use at least four on a page)

1. **Pinned chapter** — a tall wrapper (`200–300vh`, phones `150vh`) holding a `position:sticky; top:0; height:100vh`
   stage. Everything inside reads one progress value `--p` from 0 to 1.
2. **Depth parallax** — 3–6 layers in one stage, each moving `translate: 0 calc(var(--p) * var(--depth) * -1px)`
   with depths like 40 / 120 / 260 / 420 px; far layers blur slightly, near layers are sharp and larger.
3. **Clearing** — the opening frame starts veiled (blur 12px, low opacity, a dust/mist layer) and resolves as `--p`
   reaches 0.3; the camera pushes in (`scale: calc(1.15 - var(--p) * .15)`).
4. **Inked path + counter** — an SVG path draws itself (`stroke-dashoffset: calc(1 - var(--p))` with
   `pathLength="1"`) while an `@property --n <integer>` counter climbs to a real number from the content
   (years of experience, projects, skills); `counter(n, persian)` shows Persian digits.
5. **Sideways reel** — a pinned stage whose track translates on X by the progress (RTL: move toward positive X)
   so cards (templates, projects, experience) slide past while the page scrolls down.
6. **Word light-up** — a pinned sentence whose words go from 20% to 100% opacity one by one as `--p` grows
   (`opacity: clamp(.2, (var(--p) * var(--count) - var(--i)), 1)`), the cursor-free version of a reading line.

Between chapters: a hard cut is fine; a soft one is better (the next stage rises over the previous with a shadow).

## Wiring the progress (no libraries)

Prefer CSS scroll-driven animation; fall back to one small script.

```css
@property --p { syntax: '<number>'; inherits: true; initial-value: 0; }
.chapter { height: 260vh; view-timeline: --chapter block; }
.chapter__stage { position: sticky; top: 0; height: 100vh; overflow: clip; }
@supports (animation-timeline: view()) {
  .chapter__stage { animation: chapter-p linear both; animation-timeline: --chapter; animation-range: contain 0% contain 100%; }
}
@keyframes chapter-p { from { --p: 0 } to { --p: 1 } }
```

```js
// Fallback for browsers without scroll timelines: one rAF-throttled listener writes --p on each stage.
if (!CSS.supports('animation-timeline: view()')) {
  const stages = [...document.querySelectorAll('.chapter')]; let queued = false;
  const frame = () => { queued = false; for (const c of stages) { const r = c.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); c.firstElementChild.style.setProperty('--p', p.toFixed(4)); } };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(frame); } }, { passive: true }); frame();
}
```

Scripts must be same-origin files (the CSP forbids inline scripts); on people's resume pages motion must be CSS-only.

## Rules

- **Never hijack the scroll.** No wheel interception, no forced snapping, no scroll-speed changes. The visitor can
  always scroll at their own pace and reach the footer.
- **Reduced motion:** chapters collapse to normal height (`height:auto`, stage `position:static`) and every element
  shows its *final* frame (`--p: 1`); counters show their final value; reels become a wrapped grid.
- **Phones:** shorter pins (≤150vh), at most three parallax layers, the reel becomes a native horizontal scroll with
  `scroll-snap-type: x mandatory`, no sticky stages taller than the viewport.
- **Readable without the film:** headings and copy are real text in DOM order; screen readers get the story
  without the motion (`aria-hidden` only on decorative layers).
- **Performance:** animate transform/opacity/filter/registered properties only; `will-change` only on the moving
  stage layers; images lazy, sized and compressed (WebP/AVIF); no more than ~6 moving layers per stage; check
  60fps with CPU throttling ×4.
- **Truth:** numbers that count up come from real content or the product; never invent stats.
- The `motion` skill's guardrails (contrast, focus outline, no waiting on animation) still apply.

## Chapter plan for a ResumeIt page (adapt per page)

1. **Arrival** — night sky clears, the headline is inked in gold, Fandogh peeks in. (clearing + parallax)
2. **The address** — a `you.resumeit.ir` bar types itself; glass R-cards assemble. (pinned, assemble on `--p`)
3. **The journey** — a path draws through the resume sections while counters climb. (inked path + counter)
4. **The gallery** — templates slide past sideways. (reel)
5. **The promise** — one sentence lights up word by word. (word light-up)
6. **Landing** — the CTA settles over the horizon; the footer rises. (soft handover)

## Done when

- [ ] At least four of the six moves are used and each chapter has a clear start and end frame.
- [ ] Works with and without scroll timelines (fallback script tested), and with reduced motion (final frames).
- [ ] Phone width: no sideways page scroll, shorter pins, native reel.
- [ ] No scroll hijacking; the page is fully readable with CSS animations off.
- [ ] Related browser tests pass; screenshots taken at 1440, 768 and 390 px.
