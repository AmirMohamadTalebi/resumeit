---
name: motion
description: ResumeIt's standing motion rule and pattern library. Use it every time you build, rebuild or restyle any UI in this project — public pages, auth pages, dashboard, admin, resume or link templates, error pages, emails rendered as HTML, marketing banners and posters — so the piece ships with as much modern, purposeful animation as it can carry, in the landing page's language, without slowing any operation or breaking reduced motion.
---

# Motion in ResumeIt

**Rule:** wherever an animation *can* go, put one there — not only where one is needed. Hover colour changes and a
lift on hover do not count on their own; every new or rebuilt piece needs real choreography (an entrance, a reveal,
something that reacts to the person, a state change that moves). Reduced motion turns it all off.

The reference is the landing page (`dist/landing.css`, `dist/public-chrome.css`) and the night-sky auth pages
(`dist/auth-ui/css/auth.css`, `dist/auth-ui/js/auth-motion.js`). Reuse their names and curves before inventing new ones.

## Tokens

- Ease `cubic-bezier(.2,.8,.2,1)` (`--ease`, `--a-ease`, `--pc-ease`) for reveals and slides.
- Spring `cubic-bezier(.3,1.4,.5,1)` (`--spring`, `--a-spring`) for anything that pops, lifts or lands.
- Durations: micro 0.25–0.45s, entrances 0.6–1s, ambient loops 5–30s.
- Colours in motion: gold `#f0bd52` / `#e2a03a`, teal `#3d8c9c`, sky `#8ec5d6`, brown `#875a36`, night `#0b141b → #1b3242`.

## Pattern library (pick several per piece)

| Pattern | Where it lives | Use for |
|---|---|---|
| Rise in with blur, staggered by `--i` | `.auth-in`, `[data-anim=rise]`, `.lg-reveal` | every block that appears: cards, form steps, sections |
| Scroll reveal | `IntersectionObserver` adding `.is-in`; or CSS `animation-timeline: view()` inside `@supports` | long pages, template sections, lists |
| Night sky | `.auth-sky` / `.ln-aurora`, `.ln-stars`, `.ln-grid-floor`, comets | hero and full-page dark backgrounds |
| Pointer parallax and spotlight | `--px/--py` on `:root`, `--mx/--my` on a card | heroes, art columns, feature cards (fine pointers only) |
| Travelling gold focus edge | `@property --auth-edge` / `--ln-edge` conic ring on `:focus-within` | every text field instead of a thick focus ring |
| Rotating light border | `@property --auth-spin` conic mask | featured card, form card, highlighted price |
| Sheen sweep + arrow that leans | `.btn--primary::before/::after` | primary buttons and CTAs |
| Magnetic button + press ripple | `auth-motion.js` pointer handlers | primary buttons (magnet on fine pointers only) |
| Sliding thumb | `.segmented.is-sliding` | tabs, toggles, segmented controls |
| Path drawing | `stroke-dasharray` + `stroke-dashoffset` → 0 | icons that appear, checks, charts, success marks |
| Pop / coin flip / rings | `auth-pop`, `auth-coin`, `auth-ring` | success states, badges, the step that just finished |
| Confetti burst (WAAPI, removed on finish) | `confetti()` in `auth-motion.js` | finishing a flow, a purchase, a publish |
| Shine text | `.ln-shine`, `.art__title` | big headings on dark backgrounds |
| Count-up | `[data-count]` in `app.js` | any number that matters |
| Wipe reveal | `clip-path: inset(...)` keyframes | titles, images, before/after swaps |
| Idle float / bob | `translate` keyframes (composes with `transform`) | decorative cards, mascots, planets |

## Guardrails (all must hold)

1. Animate `transform`, `translate`, `scale`, `rotate`, `opacity`, `filter`, `clip-path`, `background-position` or a
   registered custom property. Never animate layout (`width`, `height`, `top`, `margin`).
2. **Nothing waits for an animation.** Requests, navigation, focus and validation run immediately; tests assert this
   (`auth-motion-check` measures under 500 ms). Animations decorate a state change, they never gate it.
3. `@media (prefers-reduced-motion: reduce)` → `animation: none` and no transitions on the moving parts; final states
   must still look right (text visible, checks drawn). Template tests assert `document.getAnimations().length === 0`.
4. Pointer effects (parallax, magnet, spotlight, tilt) only under `(hover: hover) and (pointer: fine)`, throttled with
   one `requestAnimationFrame`. Touch gets entrances and press feedback instead.
5. Resting contrast stays ≥ 4.5:1 and every control keeps a visible focus outline ≥ 2px
   (`site-interaction-contrast-check`). Give animated controls a solid `background-color` so the check can read it.
6. Infinite loops only on a handful of ambient elements per screen, and they must be cheap (transform or opacity).
7. daisyUI ships a 2px `.input:focus, .input:focus-within` outline; override both selectors when restyling inputs.
8. A preview server caches `dist` in memory — restart it before judging a change.

## Before calling a piece done

- [ ] It has an entrance and at least two other kinds of motion from the table.
- [ ] Every state change (open, switch, success, error) moves.
- [ ] Reduced motion checked: still, readable, complete.
- [ ] Phone width checked: no sideways scroll, no pointer-only effects.
- [ ] Related browser tests still pass.
