# Support Role

The `support_accounts` table is additive and independent from `admin_accounts`.
Existing administrators retain their permissions. Granting support never grants
administrator permissions. The normal session query reads both flags from the
database on each request; there is no role in a client-controlled cookie.

## Administration

Open a user in `/admin/users/`, then use the support role form with a reason.
The target must have a verified phone and an active account when granting access.
Administrators cannot change themselves or other administrators through this form.
Grant and revoke operations are transactional, replay-safe, and audited.

## Support Panel

`/staff/` is available to support accounts and administrators. It loads ticket
data only, without loading the dashboard editor or an admin health request.
Available operations: search/filter/page through tickets, view messages, respond,
close/reopen a ticket, and read the ticket author's ID, display name, and suspended
status. It does not return the customer's phone, wallet, purchases, or OTP data.

The existing staff-ticket endpoints require a fresh staff/admin session.
Staff mutations also recheck permissions under a user-row lock in the database,
the same row locked when changing the support role. Replies are idempotent and
create one customer notification; staff replies and status changes are audited.
Revocation applies on the next request without requiring the user to sign out.
`/admin/` and every admin API remain administrator-only.

## Verification

Run `npm run check:support` for production-SQL authorization tests using SQLite,
local HTTP boundary tests, and Edge/Chromium desktop/mobile UI checks. Screenshots
are written to `artifacts/support-role/`. These checks do not establish a live
MySQL migration or production deployment.
