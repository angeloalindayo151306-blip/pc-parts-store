import { ref, resRef, okResponse, errorResponse, body, idParam } from './components.js';

const auth = [{ bearerAuth: [] }];
const adminErrors = {
  401: resRef('Unauthorized'),
  403: resRef('Forbidden'),
};

const productId = idParam('id', 'Product id');
const notFound = errorResponse('Code: PRODUCT_NOT_FOUND');

const adminProduct = {
  type: 'object',
  additionalProperties: true,
  description: 'Product row as stored, including is_active',
};

const productFields = {
  categoryId: { type: 'integer', minimum: 1 },
  name: { type: 'string', minLength: 2, maxLength: 150, example: 'Ryzen 5 7600' },
  description: { type: 'string', maxLength: 2000 },
  priceCentavos: { type: 'integer', minimum: 0, maximum: 100000000, example: 899900 },
  stock: { type: 'integer', minimum: 0, maximum: 100000, default: 0 },
  imageUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
  specs: {
    type: 'object',
    additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
    example: { socket: 'AM5', tdp_watts: 65 },
  },
};

export const extraPaths = {
  '/ai/recommend-build': {
    post: {
      tags: ['AI'],
      summary: 'Recommend a PC build for a budget',
      description:
        'Gemini picks parts from active, in-stock products only. Every returned id is checked against the database, the budget and the compatibility rules. If Gemini is unavailable or its answer is rejected, a keyword fallback answers instead (source: "fallback"). The notes field is treated as untrusted data. Limit: 10 per 15 minutes.',
      requestBody: body({
        type: 'object',
        required: ['budgetPhp', 'useCase'],
        properties: {
          budgetPhp: { type: 'integer', minimum: 1000, maximum: 1000000, example: 60000 },
          useCase: { type: 'string', enum: ['gaming', 'editing', 'office'] },
          notes: { type: 'string', maxLength: 1000, example: 'I prefer a white case' },
        },
      }),
      responses: {
        200: okResponse('A build within the budget', ref('AiBuild')),
        422: errorResponse('VALIDATION_ERROR, or BUDGET_TOO_LOW when no build fits'),
        429: resRef('RateLimited'),
      },
    },
  },

  '/compatibility/check': {
    post: {
      tags: ['Compatibility'],
      summary: 'Check that parts work together',
      description:
        'Checks CPU/motherboard socket, motherboard/RAM type and PSU wattage. Limit: 60 per 15 minutes.',
      requestBody: body({
        type: 'object',
        required: ['productIds'],
        properties: {
          productIds: {
            type: 'array',
            minItems: 1,
            maxItems: 12,
            items: { type: 'string', format: 'uuid' },
          },
        },
      }),
      responses: {
        200: okResponse('Result, with a list of any issues', ref('CompatResult')),
        404: errorResponse('A product does not exist. Code: PRODUCT_NOT_FOUND. details lists the missing ids'),
        422: resRef('ValidationError'),
        429: resRef('RateLimited'),
      },
    },
  },

  '/admin/ping': {
    get: {
      tags: ['Admin'],
      summary: 'Admin role check',
      security: auth,
      responses: {
        200: okResponse('Caller is an admin', { type: 'object', additionalProperties: true }),
        ...adminErrors,
      },
    },
  },

  '/admin/products': {
    get: {
      tags: ['Admin'],
      summary: 'List products, including inactive ones',
      security: auth,
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search text' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['active', 'inactive', 'all'], default: 'all' },
        },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: {
        200: okResponse('A page of products', { type: 'array', items: adminProduct }, { meta: ref('PageMeta') }),
        ...adminErrors,
        422: resRef('ValidationError'),
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create a product',
      security: auth,
      requestBody: body({
        type: 'object',
        required: ['categoryId', 'name', 'priceCentavos'],
        additionalProperties: false,
        properties: productFields,
      }),
      responses: {
        201: okResponse('Product created', adminProduct),
        ...adminErrors,
        409: errorResponse('Code: PRODUCT_NAME_TAKEN'),
        422: errorResponse('VALIDATION_ERROR, or CATEGORY_NOT_FOUND'),
      },
    },
  },

  '/admin/products/{id}': {
    get: {
      tags: ['Admin'],
      summary: 'One product, active or not',
      security: auth,
      parameters: [productId],
      responses: {
        200: okResponse('The product', adminProduct),
        ...adminErrors,
        404: notFound,
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update a product',
      description: 'Send at least one field. Use isActive to hide or show a product.',
      security: auth,
      parameters: [productId],
      requestBody: body({
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: { ...productFields, isActive: { type: 'boolean' } },
      }),
      responses: {
        200: okResponse('The updated product', adminProduct),
        ...adminErrors,
        404: notFound,
        409: errorResponse('Code: PRODUCT_NAME_TAKEN'),
        422: errorResponse('VALIDATION_ERROR, or CATEGORY_NOT_FOUND'),
      },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Soft-delete a product',
      description: 'The product is hidden, not removed, so old orders keep their history.',
      security: auth,
      parameters: [productId],
      responses: {
        200: okResponse('The deactivated product', adminProduct),
        ...adminErrors,
        404: notFound,
      },
    },
  },

  '/admin/products/{id}/stock': {
    post: {
      tags: ['Admin'],
      summary: 'Set stock, with a recorded reason',
      security: auth,
      parameters: [productId],
      requestBody: body({
        type: 'object',
        required: ['newStock', 'reason'],
        additionalProperties: false,
        properties: {
          newStock: { type: 'integer', minimum: 0, maximum: 100000, example: 25 },
          reason: { type: 'string', minLength: 3, maxLength: 200, example: 'Restock from supplier' },
        },
      }),
      responses: {
        200: okResponse('The adjustment', {
          type: 'object',
          properties: {
            product: adminProduct,
            previous_stock: { type: 'integer' },
            new_stock: { type: 'integer' },
            reason: { type: 'string' },
          },
        }),
        ...adminErrors,
        404: notFound,
        422: errorResponse('VALIDATION_ERROR, or NO_STOCK_CHANGE when the number is the same'),
      },
    },
  },

  '/admin/products/{id}/adjustments': {
    get: {
      tags: ['Admin'],
      summary: 'Stock adjustment history for a product',
      security: auth,
      parameters: [productId],
      responses: {
        200: okResponse('Adjustments', { type: 'array', items: { type: 'object', additionalProperties: true } }),
        ...adminErrors,
        404: notFound,
      },
    },
  },
};