# User workspace revision - 2026-10-14

The chosen reference is round3 dashboard-1 (Abgoon), slightly icy. Preserve public navigation and the signature hero. Do not modify the admin UI until its separate brief is complete. Preserve independent upstream changes. Do not make a real bank payment.

## Scope
- Matte quick access, dashboard label, full-width links and avatar popup.
- Diagnose cold startup; progressively load heavy content without losing edits.
- Two distinct navigation levels, liquid glass hover in both, no coral selection; readable account name.
- Responsive bounded preview, mouse/keyboard splitter; better resume section navigation.
- Real support tickets, notification inbox and toasts; public version history outside dashboard.
- Links: additional content blocks, icon picker, linked profile sync, left alignment, ring for every template.
- Templates: search, filters, sort, inspect card modal, short font sample, effective shared colors/radii, readable subscription period.
- Contextual useful page heads; publication readiness inside Studio, missing items next to their editor; creative completion cues.
- Publication redesign, metadata/social cards; custom domain deferred.
- Wallet rebuilt with tabs/search/filter for bank requests, ledger and purchases. New original blonde female cat It coin.
- Subscription tabs/search/filter, Iranian myth names, meaningful server-enforced benefits, no stale payment claims.
- Settings grouped; notification settings moved to notification center; branding mode in each editor, custom text only for active subscribers.
- Investigate invalid payment response at checkout without charging a card.

## Next Batch Reminder
Before starting the next requested batch, remind the owner to specify the personal-domain implementation. Do not implement domains in this batch.

## Independent Support And Notification Menus - 2026-10-15
Support and notifications are independent primary navigation groups, not account settings. Support links to tickets, a new-ticket form (`?tab=new`), the existing contact page, direct Telegram support and the product Telegram channel. Notifications links to the full inbox, unread-only view (`?tab=unread`), preferences (`?tab=preferences`) and public release history. Direct links preserve their destination on refresh; same-page navigation uses the shared guarded router. External Telegram links open with `noopener noreferrer`. The mobile drawer retains the separately titled groups.

## Verification
Use real API/database contracts, mocked bank providers, responsive browser tests and saved screenshots. Distinguish local verification, GitHub push and actual live deployment. Never ship partially verified financial/persistence changes.

## Resume Section Navigator - 2026-10-15
The internal resume navigator follows the already selected Abgoon reference and the owner's latest horizontal desktop reference. `dist/dashboard/js/pages/resume.js` includes only sections supported by the selected template. The active section uses `aria-selected` and points to the editor panel.

At 1101px and above, the outline moves into `resume-tabs-host` above both the form and preview. `dist/dashboard/css/abgoon.css` displays a single horizontal row of text tabs, with an underline and stronger text for the active section; overflow stays within the tab row. Group headings, icons, completion captions and indicators are hidden in this desktop presentation. There is no vertical desktop navigator column.

At 1100px and below, native expandable details default closed, retain the current section label in the summary and reveal two columns of grouped rows for identity/contact, professional history, work/achievements and template details. Each row retains its icon, completion or publication guidance and state indicator, with icy glass hover and selected states. Choosing a section brings its editor into view. The outline moves between its mobile and desktop hosts when crossing the breakpoint. Outline transitions and editor entry animation respect reduced motion.

The shared toolbar retains the desktop reference's 78px height and soft 40px controls, but the latest owner feedback supersedes the transparent material: it now has an inset rounded matte-glass background with 30px backdrop blur. Publication is a persistent action in every dashboard shell, followed by saved status, preview and notifications. Manual save and undo remain available when actionable. The publication picker uses the existing save and publication contracts without navigating away from the active form.

Local visual evidence is stored in `artifacts/abgoon-release/resume-desktop.png` and `resume-mobile.png`; the expanded mobile states are `resume-outline-open-mobile.png` and `resume-outline-open-small.png`. The latest desktop tabs and toolbar supersede the previously reviewed desktop column. The fresh visual review returned `ship` for this scope. Browser tests passed at 1440, 1180, 390 and 320 pixels, including horizontal tab placement and section switching, toolbar height/order and preview bounds. The save regression test also passed. These captures document local rendering only and do not establish deployment.

The existing root `DESIGN.md` and `.impeccable/design.json` predate this workspace revision: their global user-rail description and selected-state guidance do not fully describe the scoped Abgoon implementation, and the sidecar does not record the 1100px resume-outline breakpoint. This is recorded design-document drift. A global refresh or merge needs a separate decision so the public and administration identities are not redefined by this user-workspace change.

## Support And Inbox Follow-Up - 2026-10-15

Unread notifications are a first-class navigation destination and tab, not a checkbox inside a view already filtered to unread. Both the inbox and support open with four matte-glass summary tiles. Counts are aggregated across all records in the authorized account/staff scope, independently of list filters or pagination; unread state and ticket status update the totals.

The administration Health page now stores per-channel email/SMS/push permission in `notification_policy`, with an audit record. Delivery requires global permission, valid provider configuration and valid user opt-in. Disabling does not delete user preferences or disable the internal inbox, toasts, or authentication OTP. Already in-flight provider submissions cannot be recalled. Fixture API and browser tests are `notification-policy-check.cjs` and `communication-ui-check.cjs`; screenshots are in `artifacts/communication-polish/`. This remains local preview only.

## Editor Polish Preview - 2026-10-15

Readiness opens with actual counts from both page checklists instead of a standalone publication link. Native disclosures animate open and closed with interruptible bounded transitions; reduced motion retains immediate native behavior. The links header has a grouped sync source, separate edit link and switch. Current-template summaries keep their title, name and access badge separate.

Template cards open the actual preview directly, with a separate Use action and no intermediate details dialog. Color selection includes a live sample; mobile swatches use two columns to reduce scrolling. Search controls and selects share focus/hover states; browsers supporting `appearance: base-select` also receive a styled options popup, with native select fallback elsewhere.

`npm run check:editor-polish`, the workspace regression UI test and `npm test` passed locally. Fresh captures are in `artifacts/editor-polish/`. Publication tests use isolated local fixture accounts, not the live site. GitHub and deployment remain untouched at the owner's request.
