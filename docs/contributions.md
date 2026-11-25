# Contributions

PC Parts Store is a **solo project**. One person designed, built, tested and documented all of it. There is no team split, so this page records who did what (everything), what outside services and libraries were used, and what the git history shows.

## Author

The repository owner, GitHub account `angeloalindayo151306-blip`.

## Work by area

| Area | Done by | Where |
|---|---|---|
| Requirements and business rules | Author | `docs/concept-statement.md`, `docs/business-rules.md` |
| Database design, migrations and seed data | Author | `docs/database.md`, `backend/db/` |
| REST API (auth, products, cart, orders, reviews, admin) | Author | `backend/src/` |
| Checkout, stock reservation, coupons and the order workflow | Author | `backend/src/services/`, `backend/src/repositories/` |
| Maya payments and the mock provider | Author | `backend/src/services/payments/`, `docs/payment-integration.md` |
| AI build recommendation and compatibility checker | Author | `backend/src/services/ai.service.js`, `aiFallback.js`, `compatibility.service.js`, `docs/ai-integration.md` |
| API documentation (OpenAPI and Swagger UI) | Author | `backend/src/docs/openapi/`, served at `/api-docs` |
| Automated tests and the Postman collection | Author | `backend/tests/`, `backend/scripts/`, `postman/`, `docs/test-plan.md` |
| Frontend (React PWA) | Author | `frontend/src/` |
| Deployment of the API on Render | Author | Render service `pc-parts-api` |
| Architecture, patterns and review documents | Author | `docs/architecture.md`, `docs/design-patterns-oop.md`, `docs/code-review.md` |

## Outside services and libraries

These were used, not written by the author:

| Item | Used for |
|---|---|
| Supabase PostgreSQL | The database |
| Render | Hosting the API |
| Maya sandbox checkout API | Real sandbox payments |
| Google Gemini API | The AI build recommendation |
| Express, Zod, Helmet, cors, express-rate-limit, jsonwebtoken, bcryptjs, pg, dotenv, swagger-ui-express | Backend libraries |
| Jest, supertest, Newman | Testing |
| React, Vite, react-router, vite-plugin-pwa | Frontend |

## Git history

Figures taken from git when this page was written:

- Commits so far: 48
- First commit: 2026-11-18
- Latest commit: 2026-11-25
- Authors in the history:
  - Angelo Alindayo (48 commits)
