// Shared building blocks for the OpenAPI document.
// Money is always an integer in centavos (100 centavos = PHP 1).

export const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
export const resRef = (name) => ({ $ref: `#/components/responses/${name}` });
export const json = (schema) => ({ 'application/json': { schema } });

export const errorResponse = (description) => ({
  description,
  content: json(ref('ErrorResponse')),
});

export const okResponse = (description, data, extra = {}) => ({
  description,
  content: json({
    type: 'object',
    required: ['success', 'data'],
    properties: {
      success: { type: 'boolean', example: true },
      data,
      ...extra,
    },
  }),
});

export const body = (schema, required = true) => ({ required, content: json(schema) });

export const idParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', format: 'uuid' },
});

const str = { type: 'string' };
const int = { type: 'integer' };
const nullableStr = { type: 'string', nullable: true };
const date = { type: 'string', format: 'date-time' };

export const info = {
  title: 'PC Parts Store API',
  version: '1.0.0',
  description: [
    'REST API for the PC Parts Store (ITPE101).',
    '',
    '**Envelope.** Success: `{ success: true, data, meta? }`. Error: `{ success: false, error: { code, message, details }, requestId }`.',
    '',
    '**Money** is always an integer in centavos (100 centavos = PHP 1).',
    '',
    '**Auth.** Log in at `POST /auth/login`, then press Authorize and paste the token (no "Bearer " prefix).',
    '',
    '**Webhook.** `POST /webhooks/maya/{token}` is protected by a secret token in the URL, not by a signature header.',
  ].join('\n'),
};

export const servers = [{ url: '/api/v1', description: 'This server' }];

export const tags = [
  { name: 'Health' },
  { name: 'Auth' },
  { name: 'Products' },
  { name: 'Reviews' },
  { name: 'Cart' },
  { name: 'Orders' },
  { name: 'Payments' },
  { name: 'AI' },
  { name: 'Compatibility' },
  { name: 'Admin' },
];

const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'expired',
  'payment_flagged',
];

export const components = {
  securitySchemes: {
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  },
  responses: {
    Unauthorized: errorResponse(
      'Missing or bad token. Codes: UNAUTHENTICATED, INVALID_TOKEN, TOKEN_EXPIRED'
    ),
    Forbidden: errorResponse('Signed in but not allowed. Code: FORBIDDEN'),
    ValidationError: errorResponse(
      'Request failed validation. Code: VALIDATION_ERROR. details is a list of { field, message }'
    ),
    RateLimited: errorResponse('Too many requests. Code: RATE_LIMITED'),
  },
  schemas: {
    ErrorResponse: {
      type: 'object',
      required: ['success', 'error'],
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'PRODUCT_NOT_FOUND' },
            message: str,
            details: { nullable: true, description: 'Extra information; shape depends on the code' },
          },
        },
        requestId: str,
      },
    },
    PageMeta: {
      type: 'object',
      properties: { page: int, limit: int, total: int, totalPages: int },
    },
    User: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        name: str,
        role: { type: 'string', enum: ['customer', 'admin'] },
      },
    },
    Product: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: str,
        description: nullableStr,
        price_centavos: int,
        stock: int,
        image_url: nullableStr,
        specs: { type: 'object', additionalProperties: true, example: { socket: 'AM5', tdp_watts: 105 } },
        category_id: int,
        category: str,
        average_rating: { type: 'number', nullable: true },
        review_count: int,
      },
    },
    Category: {
      type: 'object',
      properties: { id: int, name: str, product_count: int },
    },
    Review: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        product_id: { type: 'string', format: 'uuid' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        comment: nullableStr,
        created_at: date,
        updated_at: date,
        reviewer_name: str,
      },
    },
    CartItem: {
      type: 'object',
      properties: {
        product_id: { type: 'string', format: 'uuid' },
        name: str,
        category_name: str,
        image_url: nullableStr,
        quantity: int,
        unit_price_centavos: int,
        line_total_centavos: int,
        stock: int,
        issue: {
          type: 'string',
          nullable: true,
          enum: ['UNAVAILABLE', 'OUT_OF_STOCK', 'INSUFFICIENT_STOCK', null],
          description: 'null when the line can be checked out',
        },
      },
    },
    Cart: {
      type: 'object',
      properties: {
        items: { type: 'array', items: ref('CartItem') },
        item_count: int,
        subtotal_centavos: int,
        can_checkout: { type: 'boolean' },
      },
    },
    ShippingAddress: {
      type: 'object',
      required: ['fullName', 'phone', 'line1', 'city', 'province', 'postalCode'],
      properties: {
        fullName: { type: 'string', minLength: 2, maxLength: 100, example: 'Juan Dela Cruz' },
        phone: { type: 'string', pattern: '^[0-9+\\-\\s]{7,20}$', example: '09171234567' },
        line1: { type: 'string', minLength: 3, maxLength: 150, example: '12 Rizal St' },
        line2: { type: 'string', maxLength: 150 },
        city: { type: 'string', minLength: 2, maxLength: 80, example: 'Quezon City' },
        province: { type: 'string', minLength: 2, maxLength: 80, example: 'Metro Manila' },
        postalCode: { type: 'string', pattern: '^[0-9]{4}$', example: '1100' },
      },
    },
    OrderItem: {
      type: 'object',
      properties: {
        product_id: { type: 'string', format: 'uuid' },
        product_name: str,
        quantity: int,
        unit_price_centavos: int,
        line_total_centavos: int,
      },
    },
    OrderHistory: {
      type: 'object',
      properties: {
        from_status: nullableStr,
        to_status: { type: 'string', enum: ORDER_STATUSES },
        note: nullableStr,
        created_at: date,
      },
    },
    Order: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ORDER_STATUSES },
        subtotal_centavos: int,
        discount_centavos: int,
        shipping_centavos: int,
        total_centavos: int,
        shipping_address: ref('ShippingAddress'),
        flag_reason: nullableStr,
        coupon_code: nullableStr,
        reservation_expires_at: { type: 'string', format: 'date-time', nullable: true },
        created_at: date,
        updated_at: date,
        items: { type: 'array', items: ref('OrderItem') },
        history: { type: 'array', items: ref('OrderHistory') },
      },
    },
    OrderSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ORDER_STATUSES },
        total_centavos: int,
        created_at: date,
        item_count: int,
      },
    },
    PaymentStart: {
      type: 'object',
      properties: {
        checkoutUrl: { type: 'string', format: 'uri' },
        provider: { type: 'string', example: 'maya' },
        paymentId: str,
        reused: { type: 'boolean', description: 'true when an open checkout session already existed' },
      },
    },
    ReconcileResult: {
      type: 'object',
      properties: {
        order: ref('Order'),
        checked: { type: 'integer', description: 'How many open payments were checked' },
        results: {
          type: 'array',
          items: { type: 'string', example: 'paid' },
          description: 'One result per payment: paid, flagged, still_pending, expired, failed, cancelled, already_processed ...',
        },
      },
    },
    AiItem: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: str,
        category: str,
        priceCentavos: int,
        reason: str,
      },
    },
    AiBuild: {
      type: 'object',
      properties: {
        source: { type: 'string', description: '"fallback" when the keyword fallback answered instead of Gemini' },
        model: nullableStr,
        summary: str,
        items: { type: 'array', items: ref('AiItem') },
        totalCentavos: int,
        budgetCentavos: int,
        notes: { description: 'Extra notes about the build' },
      },
    },
    CompatResult: {
      type: 'object',
      properties: {
        compatible: { type: 'boolean' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', enum: ['SOCKET_MISMATCH', 'RAM_TYPE_MISMATCH', 'PSU_INSUFFICIENT'] },
              message: str,
            },
          },
        },
        items: { type: 'array', items: { type: 'object', additionalProperties: true } },
      },
    },
  },
};