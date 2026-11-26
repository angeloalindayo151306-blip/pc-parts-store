# PC Parts Store

A mobile-first PC parts store. It is one codebase with two parts: a React PWA (the customer app) and a layered Node/Express REST API with Postgres, Maya sandbox payments and a Gemini-powered build recommender.

Built solo by Angelo Alindayo for ITE101 (Mobile-First React PWA) and ITPE101 (Integrative Programming).

## Live links

| Part | URL |
|---|---|
| Frontend (Netlify) | https://pc-store-parts.netlify.app |
| API (Render) | https://pc-parts-api-kik5.onrender.com |
| Health check | https://pc-parts-api-kik5.onrender.com/api/v1/health |
| API documentation (Swagger UI) | https://pc-parts-api-kik5.onrender.com/api-docs |

The API runs on a free Render instance that sleeps when idle. The first request after a pause can take about a minute.

## What it does

- Browse and search a catalog of PC parts (27 seeded products across CPU, Motherboard, RAM, GPU, PSU and Storage).
- Register, log in, keep a cart, and check out with shipping and coupons. Checkout reserves stock and is safe to retry (`Idempotency-Key`).
- Pay through the Maya sandbox. The server confirms the payment with Maya itself. A redirect back to the site never marks an order as paid.
- Order pages with a status history that records every status change.
- AI build recommendation (`/ai-assistant` in the app): asks Gemini for a build from the real in-stock catalog, checks the answer, and falls back to a keyword-based build if Gemini is unavailable or returns something invalid.
- Installable PWA. Catalog pages you have already opened online can be shown offline.
- API only, no screen in the app yet: product reviews ("verified purchase" badge), a parts compatibility checker, and admin endpoints.

## Tech stack

- **Frontend:** React 19, Vite 8, react-router-dom 7, vite-plugin-pwa (Workbox).
- **Backend:** Node.js and Express 4, Zod 4 for validation, Helmet, CORS allowlist, rate limits, JWT with bcryptjs, `pg`.
- **Database:** Supabase Postgres (17 tables).
- **Payments:** Maya sandbox through a provider interface, plus a mock provider for local tests.
- **AI:** Google Gemini over plain `fetch`.
- **Tests and docs:** Jest and supertest, a Postman collection, OpenAPI with Swagger UI.

The backend is layered: routes, controllers, services, repositories. See `docs/architecture.md`.

## Run it locally

You need Node.js (24 was used for development and the Netlify build) and a Postgres database.

### Backend

```bash
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example` and fill in the values (see the table below). Then apply the migrations in `backend/db/migrations` with `node --env-file=.env scripts/run-migration.js <path-to-migration-file>`, seed the data with `npm run seed`, and start the API:

```bash
npm run dev
```

The API listens on port 4000. Check it at `http://localhost:4000/api/v1/health`.

Before running the seed on a database that already holds orders, check what it does to them.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens on port 5173. In development, Vite forwards `/api` calls to `http://localhost:4000`, so no frontend `.env` is needed. For a deployed build, set `VITE_API_URL` to the full API address including `/api/v1`. Never put a secret in a `VITE_` variable: it ends up in the browser bundle.

PWA and offline behaviour only work on a production build (`npm run build`, then `npm run preview`), not on the dev server.

## Environment variables (backend)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | Server port (default 4000) |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing secret and lifetime (default `1h`) |
| `CORS_ORIGINS` | Allowed browser origin (the frontend address) |
| `FRONTEND_URL` | Where Maya sends the customer back after paying |
| `SEED_PASSWORD` | Password for the seeded accounts |
| `PAYMENT_PROVIDER` | `maya` or `mock` (default `mock`; `mock` is refused in production) |
| `MAYA_BASE_URL`, `MAYA_PUBLIC_KEY`, `MAYA_SECRET_KEY` | Maya sandbox connection |
| `MAYA_WEBHOOK_TOKEN` | Secret in the webhook URL (the webhook is not registered, see limits) |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_TIMEOUT_MS` | Gemini access and model choice |

Real values never go in the repository. `.env` files are git-ignored.

## Tests

```bash
cd backend
npm test
```

This runs 4 Jest suites (28 tests: auth, checkout, webhook, AI). The tests use the real database configured in `backend/.env`, not a separate test database.

The Postman collection in `postman/` has 64 requests. `node scripts/check-openapi.js` (run from `backend/`) checks the OpenAPI document. How each is run, and the results, are in `docs/test-plan.md`.

## Documentation

| File | Contents |
|---|---|
| `docs/concept-statement.md` | What the project is and who it is for |
| `docs/business-rules.md` | Pricing, stock, coupons, order statuses |
| `docs/architecture.md` | Layers, deployment, diagrams |
| `docs/database.md` | Tables and relationships |
| `docs/payment-integration.md` | Maya flow, settlement, live evidence, limitations |
| `docs/ai-integration.md` | Gemini design, validation, fallback |
| `docs/design-patterns-oop.md` | Patterns and OOP used in the code |
| `docs/test-plan.md` | Tests, manual checks, Lighthouse runs, known gaps |
| `docs/code-review.md` | Self-review checklist with Pass, Open and Not checked rows |
| `docs/contributions.md` | Who did what (solo project) |

The API is also documented in the OpenAPI file served at `/api-docs` and `/api-docs.json`.

## Known limits

These are also recorded in the docs above.

- The Maya webhook is not registered. Payments are settled by the reconcile path, which the payment-return page calls. Webhook signatures and Maya's IP list are not checked.
- Only one full payment with a successful card has been run on the live site. Failed-card and 3-D Secure paths have not been run against Maya. There are no refunds.
- Lighthouse on the live site (mobile): Accessibility 100, Best Practices 100, SEO 91. Performance was 71 and 74 in the two clean runs, under the target of 75. The accessibility score comes from the automated audit only.
- Offline use covers only catalog pages visited online in the last 24 hours. Checkout, payment, AI and login need a connection.
- Reviews and the compatibility checker have API endpoints but no screen in the app. AI results have no add-to-cart button.
- The tests and the deployed API share one database, so test runs leave rows behind.
- The frontend has 13 lint problems that are not fixed yet.

## Author

Angelo Alindayo