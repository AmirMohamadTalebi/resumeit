# Performance: image-only template galleries

Local implementation for 0.22.1-beta. No production measurements or push are implied.

## Before / After

Measured with `node tests/performance-snapshot.cjs before|after`, Chromium/Edge headless, 390x844 touch viewport, 4x CPU throttle, 80ms network latency, 500000 bytes/sec download. These are one controlled local comparison, not real-device FPS or a field Core Web Vitals guarantee.

| Surface | Metric | Before | After |
| --- | --- | ---: | ---: |
| Landing | DOMContentLoaded | 2037ms | 1223ms |
| Landing | Long task time during load/scroll | 957ms | 205ms |
| Landing | Embedded frames | 1 | 0 |
| Template gallery | Dashboard ready | 1232ms | 920ms |
| Template gallery | Encoded resource bytes | 654273 | 332075 |
| Template gallery | DOM nodes | 1098 | 490 |

## Loading Contract

- Galleries only request catalog metadata and lazy image thumbnails, not inactive template definitions, preview frames, or template fonts.
- Public examples are static generated pages: `/resumevista/`, `/resumesatiar/`, `/resumeglacier/`, etc. Link template examples use `/linkfrost/`, etc. Confirmation opens a separate tab; the editor remains in place.
- Only the selected imported template is fetched as compressed JSON. It is decoded/parsed in a dedicated Worker, with a bounded timeout/size limit and actual byte progress. No eval, blob script, or unsafe CSP exception was added.
- The loading overlay fills the browser viewport, not the operating-system screen. Tic-tac-toe uses the vendored ISC-licensed `tic-tac-toe-minimax` 1.0.8 engine on the Worker. No artificial delay is added when a template is already ready.
- Failed or cancelled loading preserves the active template and saved content. Inactive runtime definitions are released; user configuration for older templates remains in the account.
- Mobile landing does not load GSAP/ScrollTrigger. Its signature-card choreography is preserved; repeated endpoint paints and mobile browser-chrome resizes are skipped. Large blurred animated surfaces are constrained on touch/small screens. Desktop motion remains available.
- The public initial-loading cover no longer waits on the external eNAMAD image. Dashboard readiness remains tied to its own data.
- Mobile account/support/notification groups are closed on drawer open, exclusive, animated, keyboard-operable, and inert when closed. Desktop context navigation is unchanged.

## Rebuilding And Verification

`npm run build:template-previews` regenerates static HTML/JSON from the trusted template source and captures JPEG thumbnails from the actual examples. Run it after changing template contracts or presentation. The generated assets are included in the release; deployment does not need a browser.

`node tests/template-loader-check.cjs` checks worker cancellation/retry/deduplication, release and the game engine. `node tests/template-performance-check.cjs` checks images, previews, separate tabs, playable loading, network failure and mobile dropdowns. Standard security/API/template checks still apply. Screenshots and raw measurements are under `artifacts/performance/` locally.

Not checked: low-end physical phones, production network/CDN, Runflare startup/load, and the user's exact device. No claim of universally lag-free rendering is made.
