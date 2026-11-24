# PC Parts Store: Concept Statement

## Problem

Buying PC parts online is hard for people who are new to building. Parts must fit together (CPU socket, RAM type, power supply size), and it is easy to overspend or buy a part that does not work with the rest. Most small stores sell products but give no help choosing them.

## Users

- **Customers:** PC builders and first-time buyers in the Philippines, shopping in pesos and paying online.
- **Admin:** the store owner, who manages products and stock.

## Solution

PC Parts Store is a mobile-first web store that sells PC components and helps customers pick parts that work together.

- **Catalog:** search, filter by category and price, and sort products.
- **Cart and checkout:** all prices, discounts, shipping and totals are calculated on the server from database prices, never from the client. Stock is held for 30 minutes while the customer pays.
- **Payments:** online payment through the Maya sandbox. A missed webhook is recovered when the customer returns to the store, so a paid order is never left unpaid.
- **AI build assistant:** the customer enters a budget and a use case (gaming, editing or office). Google Gemini proposes a build using only real, in-stock products from the database. Its answer is validated and checked for compatibility. If Gemini is unavailable, a rule-based fallback answers instead.
- **Compatibility checker:** detects socket mismatch, RAM type mismatch and an underpowered power supply.
- **Verified-purchase reviews:** only customers with a paid order containing the product can review it, once per product. Products show their average rating.
- **Admin tools:** product management with soft delete, and stock adjustments that are logged with a reason.

## Technology

- **Frontend:** React and Vite, installable as a PWA.
- **Backend:** Node.js and Express, in layers (routes, controllers, services, repositories), with Zod validation, JWT login with roles, rate limiting, Helmet and a CORS allowlist.
- **Database:** PostgreSQL on Supabase.
- **Integrations:** Maya sandbox checkout and Google Gemini.
- **Hosting:** the API runs on Render.

## Scope note

This is a demo store built for coursework. Payments run in the Maya sandbox, so no real money moves.