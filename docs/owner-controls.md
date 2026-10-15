# Owner Controls, 0.22.2-beta

## Operator Locations

- `/admin/users/?user=USER_ID`: a separate owner-only workspace with subscription/days, password reset, account profile, permanent product access, audited It adjustments and one bonus subdomain.
- `/admin/catalog/`: owner-only prices expressed in It, sale pauses, top-up Toman/It rate and per-image limits. Search filters the product list.
- Existing owner controls for gateways, notification services, roles and audit retention remain separate and unchanged.

Ordinary admins keep their previous account-editing tools. The advanced routes reject ordinary admins, support and users; the production SQL methods recheck the owner role inside the transaction. Changes require a reason, an exact confirmation and an idempotency key. This is structured administration, not an arbitrary SQL or code console.

## Balances and Prices

The ledger's immutable unit remains 1/2000 It. **Never change `RI.IT_RATE` to the Toman top-up rate.** Doing so would retroactively change existing balances. `commerce_settings.rate` is the Toman price of a newly acquired It. The invoice and order store `it_rate` and `credit_units`. An invoice issued before a rate change keeps its original quote; bank amount verification still compares the original Toman amount with the bank's Rial proof. Wallet settlement credits the snapshotted units only once.

Quotes round down to an integer ledger unit (0.0005 It). UI formatting preserves four decimal places. Product prices are stored in ledger units and edited as whole It. Toman equivalents use the current top-up rate. Purchase requests carry the confirmed price; a stale price is rejected rather than silently charging a different amount. Sale pauses do not revoke previously acquired access or stop settlement of existing bank orders.

Subscription changes replace active subscription access with the selected plan and remaining days measured from now, or cancel it without deleting content. They create an administrative audit event, not a fake purchase. Permanent product access is managed independently. Wallet increases/decreases create real ledger entries; negative balances are rejected.

## Images and Workspace Quotas

- Default per-image limits: free 409600 bytes (400 KiB), subscribed 2097152 bytes (2 MiB).
- The free limit must not exceed one fifth of the subscribed limit. The owner may lower both limits; the current inline-upload infrastructure retains its 2 MiB hard ceiling.
- These are **per-image limits, not a total account storage allowance**. Both client selection and server content validation enforce them, including embedded template images. Existing images are preserved when a subscription expires or a limit is lowered.
- No automatic grant to every user: the owner enables one bonus subdomain on selected accounts. Free accounts can then use slots 1 and 2. Subscribed accounts can use subdomain slots 1, 2 and 4, plus the existing links-only path slot 3.
- Revocation preserves documents but blocks further edits/public rendering where the slot is no longer allowed. Slot access is rechecked while the user row is locked. Unpublishing remains possible.

## Security Boundaries

Passwords are reset through the existing scrypt hasher; old passwords are never returned. Resets invalidate sessions and OTP challenges. Audit data records only a request fingerprint; secret-derived receipt data is scrypt-hardened, never a reusable login hash. The user's verified phone and OAuth identities are not reassigned by this form. Bank proofs, card data and provider secrets are not editable.

## Migration and Verification

Startup creates `commerce_settings` and `owner_user_settings`, then idempotently adds `it_rate` and nullable `credit_units` to existing payment invoices/orders. Old orders fall back to the original 2000 Toman/It interpretation. No balance migration or rewrite of historical transactions is needed.

`npm run check:owner-controls` executes local HTTP/production-SQL checks using SQLite and Playwright at 1440, 390 and 320 pixels. It covers owner/admin isolation, CSRF, confirmation, duplicate requests, password/session/OTP handling, subscription replacement, grants, balance adjustment, stale/paused prices, invoice-rate snapshots and settlement, preserved balances, server image limits, actual bonus-slot publication/revocation and real owner-form submission. Screenshots: `artifacts/owner-controls/`.

MySQL startup migration, real payment providers and physical mobile devices have not been tested by this local suite. No push or production deployment is implied.

Final local verification: `npm test` passed, all 28 browser suites in `npm run check:ui` passed, and `git diff --check` passed. The advanced forms were visually inspected and corrected in desktop/mobile batches. Aggregate browser evidence: `artifacts/full-ui-suite/report.json`.
