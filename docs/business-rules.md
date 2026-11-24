# Business Rules

These rules are enforced on the server (services and database constraints). The client never sends a price, a total or a discount.

Money is stored in centavos (integers). The examples below use pesos.

## 1. Pricing and shipping

| ID | Rule |
|---|---|
| BR-01 | Prices come from the database at checkout. The request body carries no amounts. |
| BR-02 | `subtotal` = sum of (unit price x quantity) of the cart lines. |
| BR-03 | `total` = `subtotal` - `discount` + `shipping`. |
| BR-04 | Shipping is a flat ₱150.00, and free when the amount after discount is ₱10,000.00 or more. |
| BR-05 | A discount can never be larger than the subtotal. |

Examples:
- Subtotal ₱8,995 with no coupon: shipping ₱150, total ₱9,145.
- Subtotal ₱9,000 with WELCOME10: discount ₱900, shipping ₱150, total ₱8,250.
- Subtotal ₱12,000 with WELCOME10: discount ₱1,200, amount after discount ₱10,800 (free shipping), total ₱10,800.

Constants live in `backend/src/config/business.js`. The calculations are in `backend/src/services/pricing.js`.

## 2. Coupons

| ID | Rule | Error (HTTP 422) |
|---|---|---|
| BR-10 | The code is trimmed and upper-cased. It must exist. | `COUPON_INVALID` |
| BR-11 | The coupon must be active. | `COUPON_INACTIVE` |
| BR-12 | It must not be past its expiry date. | `COUPON_EXPIRED` |
| BR-13 | The subtotal (before discount) must reach the minimum spend. | `COUPON_MIN_SPEND` |
| BR-14 | Total uses must be below the usage limit (if the coupon has one). | `COUPON_LIMIT_REACHED` |
| BR-15 | One customer can use a coupon only up to its per-user limit. | `COUPON_ALREADY_USED` |
| BR-16 | Percent coupons round the discount down to a whole centavo. | |
| BR-17 | The coupon row is locked during checkout, so two checkouts cannot take the last use. | |
| BR-18 | A cancelled or expired order gives the coupon back. A failed payment does not. | |

Seeded coupons:

| Code | Type | Value | Minimum spend | Usage limit | Per user | Note |
|---|---|---|---|---|---|---|
| WELCOME10 | percent | 10% | none | none | 1 | |
| SAVE500 | fixed | ₱500 | ₱5,000 | 100 | 1 | |
| EXPIRED20 | percent | 20% | none | none | 1 | Expired in 2024, used to demonstrate `COUPON_EXPIRED` |

## 3. Cart

| ID | Rule | Error |
|---|---|---|
| BR-20 | Quantity is a whole number from 1 to 99. | 422 `VALIDATION_ERROR` / `QUANTITY_LIMIT` |
| BR-21 | An out-of-stock product cannot be added. | 409 `OUT_OF_STOCK` |
| BR-22 | A quantity above the available stock is refused. | 409 `INSUFFICIENT_STOCK` |
| BR-23 | An unknown product is refused. | 404 `PRODUCT_NOT_FOUND` |
| BR-24 | An inactive (hidden) product cannot be added, and looks like a missing product. If a product is hidden after it was added, changing its quantity is refused. | 404 `PRODUCT_NOT_FOUND` on add / 409 `PRODUCT_UNAVAILABLE` on update |
| BR-25 | Changing or removing a line that is not in the cart is refused. | 404 `CART_ITEM_NOT_FOUND` |

## 4. Checkout and stock reservation

| ID | Rule | Error |
|---|---|---|
| BR-30 | Checkout needs a login and a non-empty cart. | 401 `UNAUTHENTICATED` / 422 `CART_EMPTY` |
| BR-31 | Creating an order is idempotent. The same idempotency key for the same customer returns the same order and reserves or charges nothing twice. | |
| BR-32 | Order creation is one database transaction: stock holds, order, items, coupon redemption, history and cart clearing all succeed together or are all undone. | |
| BR-33 | Stock is reserved atomically per line, in product-id order so two shoppers cannot deadlock. | 409 `OUT_OF_STOCK` / `INSUFFICIENT_STOCK` / `PRODUCT_UNAVAILABLE` |
| BR-34 | The hold lasts 30 minutes (`RESERVATION_MINUTES`). | |
| BR-35 | A customer sees only their own orders. Someone else's order looks like a missing one. | 404 `ORDER_NOT_FOUND` |

## 5. Order lifecycle

Allowed status changes. Anything not listed is refused with 409 `ILLEGAL_TRANSITION`.

| From | May move to |
|---|---|
| `pending_payment` | `paid`, `cancelled`, `expired`, `payment_flagged` |
| `payment_flagged` | `paid`, `cancelled` |
| `paid` | `processing` |
| `processing` | `shipped` |
| `shipped` | `delivered` |
| `cancelled`, `expired`, `delivered` | nothing (final) |

| ID | Rule |
|---|---|
| BR-40 | Every status change writes a row to `order_status_history` (who and why). A change made by the system has no actor. |
| BR-41 | The order row is locked during a change, so a cancel and a webhook on the same order run one after the other. |
| BR-42 | A customer can cancel only their own order, and only while it is `pending_payment` or `payment_flagged`. Cancelling gives back the stock, frees the coupon and expires any live payment session. |
| BR-43 | A failed or cancelled payment attempt gives back the stock only. The order stays `pending_payment` and keeps its coupon. |
| BR-44 | "Pay now" on such an order takes the stock hold again. If an item sold out meanwhile, it fails with 409 `INSUFFICIENT_STOCK`. |
| BR-45 | A scheduled sweep expires `pending_payment` orders when the stock hold ran out, or when a failed payment was not retried within 30 minutes. It gives back stock and coupon. It re-checks each order under its lock, so it never touches an order that was paid or retried a moment before. |
| BR-46 | A payment that arrives for an order with no hold tries to take the stock again. If it cannot, the order is flagged (`payment_flagged`) for review. |
| BR-47 | If the amount reported by the payment provider differs from the order total, the order is flagged instead of marked paid. |
| BR-48 | A provider event is processed once. A repeated webhook event is ignored. |

## 6. Admin catalog and stock

| ID | Rule | Error |
|---|---|---|
| BR-50 | Only the `admin` role can manage products. | 401 / 403 |
| BR-51 | Deleting a product is a soft delete (`is_active = false`). Old orders keep pointing to it. | |
| BR-52 | A product name must be unique. | 409 `PRODUCT_NAME_TAKEN` |
| BR-53 | A product needs an existing category. | 422 `CATEGORY_NOT_FOUND` |
| BR-54 | Every stock change (including initial stock) is logged in `stock_adjustments` with previous stock, new stock, reason and actor. | |
| BR-55 | Setting stock to its current value is refused. | 422 `NO_STOCK_CHANGE` |

## 7. Build compatibility checker

Pure rules in `backend/src/services/compatibility.service.js`. A rule is skipped when a product has no value for that spec.

| ID | Code | Rule |
|---|---|---|
| BR-60 | `SOCKET_MISMATCH` | The CPU socket must equal the motherboard socket. |
| BR-61 | `RAM_TYPE_MISMATCH` | The RAM type must equal the motherboard RAM type. |
| BR-62 | `PSU_INSUFFICIENT` | PSU wattage must cover CPU TDP + GPU TDP + 150 W headroom. |

| ID | Rule |
|---|---|
| BR-63 | `POST /api/v1/compatibility/check` takes 1 to 12 product ids and returns `compatible`, `issues` and `items`. It is public and limited to 60 requests per 15 minutes. |
| BR-64 | An unknown product id returns 404 `PRODUCT_NOT_FOUND`. |
| BR-65 | The AI build assistant uses the same checker. A Gemini build that is incompatible is rejected and the next model or the rule-based fallback answers instead. |
| BR-66 | The AI only sees active, in-stock products. It must use real product ids, with no duplicates, within the budget. |

## 8. Verified-purchase reviews

| ID | Rule | Error |
|---|---|---|
| BR-70 | Anyone can read the reviews of an active product (paginated, 10 per page by default, up to 50). | 404 `PRODUCT_NOT_FOUND` |
| BR-71 | Writing a review needs a login. | 401 `UNAUTHENTICATED` |
| BR-72 | The customer must have an order containing the product with status `paid`, `processing`, `shipped` or `delivered`. Unpaid, cancelled, expired and flagged orders do not count. | 403 `NOT_VERIFIED_PURCHASE` |
| BR-73 | One review per customer per product (enforced by a unique index as well as the service). | 409 `REVIEW_EXISTS` |
| BR-74 | Rating is a whole number from 1 to 5. The comment is optional, trimmed, at most 1,000 characters. | 422 `VALIDATION_ERROR` |
| BR-75 | A customer can edit or delete only their own review (`PUT` / `DELETE .../reviews/mine`). | 404 `REVIEW_NOT_FOUND` |
| BR-76 | A product shows its average rating (one decimal) and review count. With no reviews the average is `null`. | |
| BR-77 | A review shows the reviewer's name, never the email. | |
| BR-78 | Review writes are limited to 30 per 15 minutes. | 429 `RATE_LIMITED` |

A paid order cannot go back to `cancelled` (see section 5), so a verified purchase stays verified.