# ResumeIt — تمامِ تو. یک امضا.

A standalone Persian hero, with eight real content cards assembling into R. No background letter, framework, remote asset, timer-driven animation or backend.

## Run

From the existing repository: `node preview.cjs`, then visit `http://127.0.0.1:4173/signature/`.

In the delivered ZIP, run `node preview.cjs` and use the same URL. The ZIP includes the local Vazirmatn font, existing daisyUI stylesheet and favicon. The host-provided `/register/`, `/login/` and `/demo/?theme=studio` destinations are integration links; the isolated ZIP does not implement those routes.

## Integrate

Copy the `.sig-hero` section and optional `.sig-next` from `index.html`. Include `signature.css` and `signature.js` once. Wrap the section in `.signature-page` (or apply that class to the existing body) for the font, base colors and shared controls. All selectors use `sig-` or `signature-page`. Point `@font-face` and the stylesheet link at your existing local assets. Keep one H1 on the destination page. The demo header is optional. No GSAP dependency is required.

## Motion map

| Card | Movement | Role in R |
|---|---|---|
| آوا مهر | Slides from the upper center to the upper left | Top of vertical stem |
| مهارت‌ها | Settles underneath the profile | Middle of stem |
| لینک‌های من | Moves from lower right to lower left | Base of stem |
| کار منتخب | Moves from center left to the top | Top edge of bowl |
| پروژهٔ مکث | Moves inward on the right | Outside of bowl |
| آدرس | Rises from the bottom to the middle | Crossbar closing bowl |
| به رنگ خودت | Moves inward after the stem begins settling | First segment of diagonal leg |
| آمادهٔ همکاری | Moves down and right last | End of diagonal leg |

Progress is derived directly from scroll position and eased mathematically. Each whole card moves without stretching its text. The final 22% holds the R. Reverse scrolling reverses the same path. Desktop pins the complete composition; mobile allows the copy to scroll away, then pins only the cards so short screens remain usable. The 320px variant omits secondary details and retains each card's product meaning. Resize and font-ready events recalculate geometry.

Reduced motion displays a static R without pinning. With JavaScript unavailable, all eight cards remain in a readable grid. Very short desktop landscape viewports receive the static R to avoid inaccessible pinned content. Links retain visible keyboard focus.

## Verification

Browser automation: Edge at 1440×900, 390×844 and 320×568; scroll forward, pause, reverse, no horizontal overflow, reduced-motion mode, one H1, no-JS content and runtime errors. Screenshots in the ZIP show the beginning, middle and end on desktop and mobile. Physical phones and Safari have not been tested.

The fictional profile is illustrative. No customer claims or real account behavior are implied.
