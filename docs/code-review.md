# Code Review Checklist (self-review)

This is a self-review of the project, done by its author. It is not an independent audit. Each row has one of three statuses:

- **Pass**: checked, with the evidence shown.
- **Open**: checked and found lacking, or a known tradeoff. It is listed, not hidden.
- **Not checked**: not looked at yet. Nothing is claimed.

The checks were made by reading the code and running searches over the source. The method is stated in each row so its limits are clear.

## Security and secrets

| Item | Status | Evidence |
|---|---|---|
| No env or local-secret file is tracked in git | Pass | `git ls-files` matched no `.env`, `.env.local` or `environment.local` file. `postman/environment.local.json` is git-ignored. |
| `backend/.env.example` exists | Pass | Found by `ls`. |
| `frontend/.env.example` exists | Pass | Added in commit `90d8926`. It holds only a commented `VITE_API_URL` example. |
| No secret names appear in the frontend source | Pass | A case-insensitive search for `MAYA_`, `GEMINI`, `SECRET_KEY` and `JWT_SECRET` matched only the display word "gemini" in `AiAssistant.jsx` and the `source` value in `api/ai.js`. The only build variables read are `VITE_API_URL` and `DEV`. |
| No secret appears in the built frontend bundle | Not checked | Only the source was searched, not the `dist` output. |
| SQL values are passed as `$n` parameters | Pass | The three repositories with dynamic SQL (`product`, `admin.product`, `review`) were read in full: sort keys come from a whitelist, column lists are constants or a fixed field map, and every value is a parameter. A search for `${` across the other repositories and the four services that run SQL found only a lock key passed as a parameter and an error message. The search does not catch string concatenation with `+`. |
| An unexpected error does not leak details | Pass | `errorHandler.js` sends only `INTERNAL_ERROR` and "Something went wrong" for an unknown error, and logs the real one on the server. |
| The webhook token is compared in constant time and the webhook is closed when no token is set | Pass | Read in `webhook.controller.js`. It hashes both values and uses `timingSafeEqual`. |
| Maya webhook signatures and source IPs are verified | Open | Not implemented. The webhook relies on the secret token in the URL and never trusts the body. Maya signs its webhooks (RSA-SHA256), which this API does not check. |
| The mock payment provider is refused in production | Pass | Read in `paymentFactory.js`. |
| AI output is validated before it is shown | Pass | Read in `ai.service.js`. JSON, schema, real product ids, no duplicates, budget and compatibility are all checked. |
| The AI endpoint is rate limited | Pass | Read in `ai.routes.js`. 10 requests per 15 minutes per IP. |
| The AI endpoint requires a login | Open | It is mounted with no `auth` middleware, so it is public. The rate limit is the only protection. |
| The login token is kept out of script reach | Open | `AuthContext` stores the whole login response, including the JWT, in `localStorage`, so any script running on the page can read it. The token expires after 1 hour. This is a known tradeoff of the approach. |
| Production dependencies have no known vulnerabilities | Pass | `npm audit --omit=dev` gave 0 findings for backend and frontend. The 22 findings in the full audit are all development tooling. See `docs/test-plan.md`. |

## Code structure

| Item | Status | Evidence |
|---|---|---|
| Repositories never call services | Pass | A search for `services/` inside `backend/src/repositories` found nothing. |
| The layer rules have no exceptions | Open | Two controllers call a repository directly (`auth.controller.js`, `webhook.controller.js`). Four services run their own SQL (`orderWorkflow.js`, `orderLifecycle.service.js`, `coupon.service.js`, `health.service.js`). Both are documented in `docs/architecture.md` and `docs/design-patterns-oop.md`. |
| Order status is updated in one place | Pass | A search for `SET status` found one write on `orders`, in `transition` in `orderWorkflow.js`. The other two matches update `payments`. This is a text search. |
| Backend logging is intentional | Pass | The 9 `console` calls are startup, error and warning messages. None is leftover debugging. |
| No TODO or FIXME markers | Pass | A search of `backend/src` and `frontend/src` found none. |
| The frontend has no `dangerouslySetInnerHTML` and no `console` calls | Pass | Both searches found none. |
| The frontend lint passes | Open | `npm run lint` reports 13 problems (12 errors, 1 warning): 8 `react-hooks/set-state-in-effect` (`CartContext`, `Checkout`, `OrderDetail`, `Orders`, `PaymentReturn`, `ProductDetail`, `Products` twice), 4 `react-refresh/only-export-components` (`AuthContext`, `CartContext`, `NetworkStatusContext`, `Orders`) and 1 `react-hooks/exhaustive-deps` (`CartContext`). The flagged lines have not been read or fixed. |
| The backend has a linter and formatter | Open | Neither is configured. Only `frontend/eslint.config.js` exists. |
| The API base URL is defined once | Open | `VITE_API_URL` with a `/api/v1` default is read separately in `api/client.js` and `api/products.js`. |

## Tests and behaviour

| Item | Status | Evidence |
|---|---|---|
| The Jest suite passes | Not checked | It was not re-run for this review. The last recorded result is 4 suites and 28 tests. |
| The Postman collection passes | Not checked | Not re-run for this review. The last recorded run was 64 requests and 224 assertions with 0 failures. |
| Reviews and the compatibility endpoint have Jest tests | Open | They are covered by Postman and `reviews-check.js` only. |
| The live Gemini path is tested automatically | Open | Jest runs with the key blank, so only the fallback is tested. One live call was seen working on Render by hand. |
| Failed-card and 3-D Secure payments were tried against Maya | Open | Not run. Only a successful card payment was done. |
| The Maya webhook is registered and has received a real delivery | Open | Not registered, on purpose. Listing webhooks with the sandbox secret key showed hooks that are not ours, so the keys appear to be shared (inferred, not proven) and a secret token in a webhook URL would not stay secret. The webhook path has been tested only with the mock provider. |

## Documentation and delivery

| Item | Status | Evidence |
|---|---|---|
| The Mermaid diagrams render on GitHub | Pass | All five showed as pictures in the GitHub preview, seen in the author's browser screenshots: `architecture.md`, `database.md`, `payment-integration.md`, `design-patterns-oop.md` and `ai-integration.md`. For four of them only the top part of the diagram was visible, so the lower parts were not checked. |
| Swagger UI "Try it out" works with Authorize | Not checked | The page renders on Render. The Authorize flow has not been tried in a browser. |
| Lighthouse targets are met | Open | Run on the live site on Nov 26. Accessibility 100, Best Practices 100 and SEO 91 meet their targets. Performance was 71 and 74 in the two clean runs, 1 point under the target of 75 on the better one. Details are in `docs/test-plan.md`. |
| Accessibility was reviewed | Not checked | Lighthouse's automated accessibility audit scored 100 in four runs. No manual review has been done. |

## Known limits of this review

- It is one person reviewing their own work.
- Findings come from reading files and running searches. Most files were not read line by line.
- The AI `summary` and `reason` text from Gemini is not checked for content, only for length.

## Next actions

1. `frontend/.env.example` is added (done).
2. Fix or consciously accept the 13 frontend lint problems.
3. Decide whether the AI endpoint should require a login.
4. Webhook: not registered (see the table). Revisit only with sandbox keys that belong to this project alone.
5. Lighthouse was run on the deployed site. Performance is 1 point under target in the better clean run, so one more attempt is optional.
