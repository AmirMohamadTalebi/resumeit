# Account Roles

`owner` (full administrator / founder), `admin`, `support`, and `user` are the
four account roles. `account_role` in the session is derived from persistent
membership, never from a request header or client-supplied profile field.
The professional profile's `role` text remains unrelated to account permissions.

| Capability | Owner | Admin | Support | User |
| --- | --- | --- | --- | --- |
| Own account and personal dashboard | Yes | Yes | Yes | Yes |
| Support ticket inbox, reply, close/reopen | Yes | Yes | Yes | Own tickets only |
| Customer profile edit, suspension, session revocation | Yes | Yes | No | No |
| Grant/revoke support for non-admin users | Yes | Yes | No | No |
| Assign owner/admin roles, demote administrators | Yes | No | No | No |
| Read management reports and audit log | Yes | Yes | No | No |
| Enable/disable payment gateways | Yes | No | No | No |
| Enable/disable notification email/SMS/push | Yes | No | No | No |
| Manual wallet credit and permanent customer deletion | Yes | No | No | No |
| Purge management audit records | Yes | No | No | No |

Owner membership is stored in `owner_accounts`. Owners also inherit
`admin_accounts` membership for existing administrator workflows. Promoting or
demoting a user clears stale memberships in one transaction; sessions re-read the
current role on every request. Suspended accounts cannot use privileged paths.

The first owner is bootstrapped from the existing verified founder identity only
when no owner exists. Legacy admins are not automatically promoted. Restarting
the service does not restore revoked founder permissions. Owners cannot change
their own role or delete their own account through the normal account-deletion
path: another owner must perform the demotion first. Granting a privileged role
requires an active account and verified phone. Role changes require a reason,
are audited, and use replay-safe request IDs.

Sensitive HTTP writes are owner-only and require same-origin JSON requests. The
production database methods independently check active owner membership under a
user-row lock; hiding a form is not the authorization boundary.

Audit purge requires an explicit cutoff, reason, request ID, and the exact typed
confirmation displayed in the UI. It deletes only `admin_audit` records older
than the cutoff, not bank receipts, wallet entries, or customer data. Purge
receipts are always retained and record actor, cutoff, reason, and deleted count.
There is no ordinary HTTP delete endpoint that can remove these receipts.

Notification channel switches do not disable login/recovery OTP. OTP delivery
currently remains independently configured; no new OTP control was added here.

Run `npm run check:roles` for local SQL/HTTP and browser checks. These use SQLite
and synthetic accounts; a real MySQL migration and live provider delivery are
not established by these tests.
