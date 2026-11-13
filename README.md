# ResumeIt

Persian RTL résumé and links site, maintained in [VY1-pick/resumeit](https://github.com/VY1-pick/resumeit) for a Node.js host. The frontend uses static HTML, daisyUI 5, self-hosted Vazirmatn and GSAP. Account authentication, sessions, OTP and configured Google/GitHub OAuth use MySQL.

## Run

Use Node.js 24.15 or newer. Install production packages with `npm ci --omit=dev`, configure host environment variables from `.env.example`, then run `npm start`. Local development can load `.env`. Public execution requires a valid HTTPS `PUBLIC_ORIGIN`; never commit real keys, passwords or a database. Detailed instructions: [hosting](docs/HOSTING.fa.md), [authentication](docs/AUTH-SETUP.fa.md), [SMS.ir](docs/SMSIR.fa.md).

`node preview.cjs` serves a static preview on loopback port 4173; it does not provide an account backend.

## Structure

```text
server.cjs               Application entry point
src/http/                Server, static files, request and browser protection
src/auth/                Password, authentication routes, OAuth, OTP
src/database/            MySQL connection, schema and store modules
src/services/            SMS.ir adapter
src/dashboard/           Dashboard validation, API and shared public rendering
src/admin/               Guarded administration endpoints and access
DESIGN.md                Implemented visual system
dist/                    Public pages and frontend assets
  auth-ui/               Shared authentication components
  dashboard/js/pages/    Independent dashboard page modules
  signature/             Shared card-formed R hero
tests/                   Security, integration and browser tests
scripts/                 Account provisioning tools
docs/                    Setup guides, design notes and the feature council (docs/council)
```

## Product boundaries

Dashboard content and publication snapshots use MySQL with per-account revision checks and unique usernames. Published résumé and links pages render independently at `username.resumeit.ir` and `/links`; `/u/username/` on the main domain is also available. Public visits and link clicks feed daily request counts. Runflare wildcard DNS, project routing and HTTPS must be configured before subdomains work. Payment, independent custom domains and automatic notifications remain unavailable. See [dashboard implementation](docs/DASHBOARD-IMPLEMENTATION.fa.md).

Current proposed plans: 3 months at 96,000 toman/month (288,000 total), 6 months at 85,000 (510,000 total), 12 months at 75,000 (900,000 total). Individual items start at 46,000 toman. Gallery preview profiles are illustrative; dashboard statistics use stored request counts.

The Persian RTL visual identity remains icy blue, off-white and warm brown. Cards form the signature R. Reduced motion and responsive layouts are retained.

## Validate

Install development packages with `npm ci`. On Windows browser tests use installed Edge; other platforms use Chromium installed by `npx playwright install --with-deps chromium`. An existing Playwright installation can be selected with `PLAYWRIGHT_PATH`.

```text
npm test                 Security, password/session, mocked SMS/OTP and OAuth
npm run check:ui         Dashboard, authentication, mobile, motion and public pages
npm run check:database   Real MySQL integration in a temporary test database
npm audit --omit=dev     Dependency advisories
```

`npm test` runs checks in parallel; `RI_JOBS=1 npm test` runs them one at a time.

Database tests create and remove a randomly named database; use a test MySQL instance and an account allowed to create databases. Tests do not send real SMS or call real OAuth providers. `.github/workflows/checks.yml` runs the suite with MySQL 8.4 and Chromium.

See the [current Persian review and change report](docs/REVIEW-21.1.fa.md) for fixes, evidence and unverified production conditions. Local checks and a GitHub branch do not confirm a live deployment.
