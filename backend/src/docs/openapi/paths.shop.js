import { ref, resRef, okResponse, errorResponse, body, idParam } from './components.js';

const auth = [{ bearerAuth: [] }];

const productIdParam = idParam('productId', 'Product id');
const orderId = idParam('id', 'Order id');

const stockErrors =
  'Codes: OUT_OF_STOCK, INSUFFICIENT_STOCK (details: available, in_cart), PRODUCT_UNAVAILABLE';

export const shopPaths = {
  '/cart': {
    get: {
      tags: ['Cart'],
      summary: 'My cart',
      security: auth,
      responses: {
        200: okResponse('The cart (empty if nothing added yet)', ref('Cart')),
        401: resRef('Unauthorized'),
      },
    },
    delete: {
      tags: ['Cart'],
      summary: 'Empty my cart',
      security: auth,
      responses: {
        200: okResponse('The now-empty cart', ref('Cart')),
        401: resRef('Unauthorized'),
      },
    },
  },

  '/cart/items': {
    post: {
      tags: ['Cart'],
      summary: 'Add a product to the cart',
      description: 'Adds to the quantity already in the cart. Maximum 99 per line.',
      security: auth,
      requestBody: body({
        type: 'object',
        required: ['productId'],
        additionalProperties: false,
        properties: {
          productId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1, maximum: 99, default: 1 },
        },
      }),
      responses: {
        200: okResponse('The updated cart', ref('Cart')),
        401: resRef('Unauthorized'),
        404: errorResponse('Product missing or inactive. Code: PRODUCT_NOT_FOUND'),
        409: errorResponse(stockErrors),
        422: errorResponse('VALIDATION_ERROR, or QUANTITY_LIMIT when more than 99'),
      },
    },
  },

  '/cart/items/{productId}': {
    patch: {
      tags: ['Cart'],
      summary: 'Set the quantity of a cart line',
      security: auth,
      parameters: [productIdParam],
      requestBody: body({
        type: 'object',
        required: ['quantity'],
        additionalProperties: false,
        properties: { quantity: { type: 'integer', minimum: 1, maximum: 99 } },
      }),
      responses: {
        200: okResponse('The updated cart', ref('Cart')),
        401: resRef('Unauthorized'),
        404: errorResponse('Code: CART_ITEM_NOT_FOUND'),
        409: errorResponse(stockErrors),
        422: errorResponse('VALIDATION_ERROR, or QUANTITY_LIMIT when more than 99'),
      },
    },
    delete: {
      tags: ['Cart'],
      summary: 'Remove a line from the cart',
      security: auth,
      parameters: [productIdParam],
      responses: {
        200: okResponse('The updated cart', ref('Cart')),
        401: resRef('Unauthorized'),
        404: errorResponse('Code: CART_ITEM_NOT_FOUND'),
      },
    },
  },

  '/orders': {
    post: {
      tags: ['Orders'],
      summary: 'Check out the cart',
      description:
        'Prices, shipping and discount are calculated on the server; the client sends no amounts. Stock is reserved for 30 minutes. Sending the same Idempotency-Key again returns the same order with replayed: true.',
      security: auth,
      parameters: [
        {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          description: '8 to 100 characters: letters, digits, underscore, hyphen',
          schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{8,100}$', example: 'checkout-0001-abcd' },
        },
      ],
      requestBody: body({
        type: 'object',
        required: ['shippingAddress'],
        additionalProperties: false,
        properties: {
          shippingAddress: ref('ShippingAddress'),
          couponCode: { type: 'string', minLength: 1, maxLength: 40, example: 'WELCOME10' },
        },
      }),
      responses: {
        201: okResponse('Order created', {
          allOf: [ref('Order'), { type: 'object', properties: { replayed: { type: 'boolean', example: false } } }],
        }),
        200: okResponse('Same Idempotency-Key as an earlier checkout; the original order is returned', {
          allOf: [ref('Order'), { type: 'object', properties: { replayed: { type: 'boolean', example: true } } }],
        }),
        401: resRef('Unauthorized'),
        409: errorResponse(stockErrors),
        422: errorResponse(
          'VALIDATION_ERROR, IDEMPOTENCY_KEY_REQUIRED, CART_EMPTY, COUPON_INVALID, COUPON_INACTIVE, COUPON_EXPIRED, COUPON_MIN_SPEND, COUPON_LIMIT_REACHED, COUPON_ALREADY_USED'
        ),
      },
    },
    get: {
      tags: ['Orders'],
      summary: 'My orders (latest 50)',
      security: auth,
      responses: {
        200: okResponse('Order summaries, newest first', { type: 'array', items: ref('OrderSummary') }),
        401: resRef('Unauthorized'),
      },
    },
  },

  '/orders/{id}': {
    get: {
      tags: ['Orders'],
      summary: 'One of my orders, with items and status history',
      security: auth,
      parameters: [orderId],
      responses: {
        200: okResponse('The order', ref('Order')),
        401: resRef('Unauthorized'),
        404: errorResponse('Not found, or not yours. Code: ORDER_NOT_FOUND'),
      },
    },
  },

  '/orders/{id}/cancel': {
    post: {
      tags: ['Orders'],
      summary: 'Cancel an unpaid order',
      description: 'Releases the stock hold. Only allowed from a status that can move to cancelled.',
      security: auth,
      parameters: [orderId],
      responses: {
        200: okResponse('The cancelled order', ref('Order')),
        401: resRef('Unauthorized'),
        404: errorResponse('Code: ORDER_NOT_FOUND'),
        409: errorResponse('Code: ILLEGAL_TRANSITION'),
      },
    },
  },

  '/orders/{id}/pay': {
    post: {
      tags: ['Payments'],
      summary: 'Start payment and get the checkout URL',
      description:
        'Creates a Maya sandbox checkout session (or reuses the open one). The amount comes from the database. If a failed payment released the stock, it is reserved again here.',
      security: auth,
      parameters: [orderId],
      responses: {
        200: okResponse('Redirect the customer to checkoutUrl', ref('PaymentStart')),
        401: resRef('Unauthorized'),
        404: errorResponse('Code: ORDER_NOT_FOUND'),
        409: errorResponse('Codes: ORDER_NOT_PAYABLE, RESERVATION_EXPIRED, INSUFFICIENT_STOCK'),
        502: errorResponse('The payment gateway refused or failed. Code: PAYMENT_GATEWAY_ERROR'),
      },
    },
  },

  '/orders/{id}/reconcile': {
    post: {
      tags: ['Payments'],
      summary: 'Check the gateway for a missed webhook',
      description:
        'Asks the gateway about every open payment of this order and settles it the same way the webhook does. Safe to call repeatedly.',
      security: auth,
      parameters: [orderId],
      responses: {
        200: okResponse('The order after checking', ref('ReconcileResult')),
        401: resRef('Unauthorized'),
        404: errorResponse('Code: ORDER_NOT_FOUND'),
      },
    },
  },

  '/webhooks/maya/{token}': {
    post: {
      tags: ['Payments'],
      summary: 'Maya payment webhook',
      description:
        'Protected by a secret token in the URL (MAYA_WEBHOOK_TOKEN), not by a signature header. The body is never trusted: the server re-fetches the payment from Maya before changing the order. Processing happens after the response is sent.',
      security: [],
      parameters: [
        { name: 'token', in: 'path', required: true, description: 'Secret webhook token', schema: { type: 'string' } },
      ],
      requestBody: body({ type: 'object', additionalProperties: true }),
      responses: {
        200: okResponse(
          'Accepted. ignored: true means the event type is not handled; duplicate: true means it was already received',
          {
            type: 'object',
            properties: {
              received: { type: 'boolean', example: true },
              duplicate: { type: 'boolean' },
              ignored: { type: 'boolean' },
            },
          }
        ),
        400: errorResponse('Body is not valid JSON. Code: INVALID_JSON'),
        401: errorResponse('Wrong token. Code: WEBHOOK_UNAUTHORIZED'),
      },
    },
  },
};