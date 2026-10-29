# Internship Portal — Frontend

React frontend for the Internship Portal (MERN): students take a 15-question assessment, earn a merit
discount, enrol and pay, follow a day-wise schedule with protected SOPs, submit GitHub-backed tasks for
trainer review, and receive a verifiable certificate. Includes the student portal, trainer workspace and
admin dashboard described in `../internship_portal_architecture_blueprint.pdf` and the frontend Jira
tickets (SN1–SN15, GP1–GP14, KD1–KD14).

## Quick start

```bash
cd frontend
npm install          # also generates public/mockServiceWorker.js (msw.workerDirectory)
npm run dev          # http://localhost:5173 — runs against the in-browser mock API
```

If the mock API does not start, run `npm run msw:init` once (creates `public/mockServiceWorker.js`).

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (mock API on by default via `.env.development`) |
| `npm run build` / `npm run preview` | Production build / preview |
| `npm run lint` / `npm run format` | ESLint (flat config) / Prettier |
| `npm test` | Vitest + Testing Library (uses the same mock handlers through `msw/node`) |
| `npm run e2e:install` then `npm run e2e` | Playwright smoke tests of auth and the student journey |

## Environment

Copy `.env.example` to `.env.local` and adjust.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api/v1` | Backend base URL (relative keeps the refresh cookie first-party) |
| `VITE_API_PROXY_TARGET` | – | Dev proxy target for `/api`, e.g. `http://localhost:5000` |
| `VITE_USE_MOCKS` | `true` in dev | `true` = MSW mock API with seeded data, `false` = real backend |
| `VITE_MOCK_LATENCY_MS` | `350` | Simulated latency for the mock API |
| `VITE_PAYMENT_PROVIDER` | `mock` | Checkout adapter: `mock` or `razorpay` |
| `VITE_APP_NAME`, `VITE_SUPPORT_EMAIL` | – | Branding and support contact |

## Mock API and demo data (ticket GP1)

With `VITE_USE_MOCKS=true` every endpoint in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) is served
in the browser by MSW (`src/mocks`). Data is seeded deterministically and persisted in `localStorage`,
so a payment or review survives a reload. A **Mock API** button (bottom-left) opens dev tools to:
log in as any demo account, read simulated emails (verification, password reset, team invites), force
error scenarios (422, 401, 403, 404, empty lists, 500, network error) and reset the data.

All demo accounts use the password **`Password@123`**:

| Email | Scenario |
| --- | --- |
| `student@demo.dev` | Java / Banking internship in progress, tasks in every state, GitHub connected |
| `new.student@demo.dev` | Verified, not assessed yet — walk the whole journey |
| `pending@demo.dev` | Enrolled, last payment failed — retry payment |
| `unverified@demo.dev` | Email not verified — payment is blocked until verified |
| `graduate@demo.dev` | Completed internship with certificate `IP-2026-000123` |
| `leader@demo.dev` | Leads a forming team with pending invites |
| `trainer@demo.dev` | Trainer with a review queue |
| `admin@demo.dev` | Full admin access |
| `suspended@demo.dev` | Suspended account (login is refused) |

Revoked certificate for the public verification page: `IP-2026-000045`.

Switching to the real backend: set `VITE_USE_MOCKS=false` and point `VITE_API_URL` at the API. Screens
only talk to `src/services/*`, which follow the same contract as the mocks.

## Architecture

```
src/
  features/            feature-sliced modules (components, hooks, pages, schemas, index.js)
    auth, internships, assessment, enrollment, applications, teams, dashboard, schedule, tasks,
    github, profile, certificates, admin, employer, assessment-builder, schedule-builder,
    assignments, trainer
  routes/              data router: public, auth, student, trainer, admin groups + guards
  services/            axios client + one module per API area, React Query keys/client
  shared/              ui kit, layouts, constants, context, hooks, utils, icons
  mocks/               MSW handlers, seed content, mock DB and domain logic
  pages/               404, 403, route error, /dev/ui component catalogue
  tests/               Vitest setup and tests
e2e/                   Playwright specs
docs/API_CONTRACT.md   endpoint and response-shape contract shared with the backend
```

Key decisions:

- **Auth (SN3):** the access token lives in memory only; the refresh token is an httpOnly cookie. The
  axios client retries a 401 once after a single-flight `/auth/refresh`; a failed refresh signs the user
  out. Users land on their role's home: admin → `/admin`, trainer → `/trainer`, student → `/dashboard`.
- **Routing:** React Router data router (`createBrowserRouter`) so the assessment can warn before you
  leave mid-test (`useBlocker`). Pages are lazy-loaded; non-admins opening `/admin/*` see a 403 page.
- **Server state:** TanStack Query with central `queryKeys`; client errors (4xx) are never retried.
- **Trust boundaries:** prices, discounts and scores always come from the server; the payment status
  page polls the server and never treats a gateway redirect as proof of payment (SN9).
- **Protected SOPs (GP4):** sanitised with DOMPurify, tiled watermark with the student's name and ID,
  no download/print controls, copy and context menu discouraged. These controls only discourage
  sharing; they cannot prevent screenshots.
- **Payment gateway adapter:** `features/enrollment/components/gateways` holds the mock gateway and a
  Razorpay adapter; adding a provider means adding one adapter.
- **UI kit (SN2, KD1, KD2):** `src/shared/components/ui` — accessible form controls, overlays, toasts,
  DataTable with server-side pagination, StatusBadge, DynamicRowEditor, charts. Browse it at `/dev/ui`.

## Quality checklist (SN15, GP14, KD14)

Every screen is built for 360, 768 and 1280 px, keyboard navigation and screen readers, and has
loading, error and empty states. Status is always shown with a text label, never colour alone.
