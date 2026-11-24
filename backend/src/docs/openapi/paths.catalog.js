import { ref, resRef, json, okResponse, errorResponse, body, idParam } from './components.js';

const auth = [{ bearerAuth: [] }];

const reviewBody = {
  type: 'object',
  required: ['rating'],
  properties: {
    rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
    comment: { type: 'string', maxLength: 1000, example: 'Runs cool and quiet.' },
  },
};

const productId = idParam('id', 'Product id');

const q = (name, schema, description) => ({ name, in: 'query', required: false, description, schema });

export const catalogPaths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Service and database health',
      responses: {
        200: okResponse('Service is up', {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            database: { type: 'string', example: 'up' },
            time: { type: 'string', format: 'date-time' },
          },
        }),
        503: errorResponse('Database unreachable. Code: DATABASE_UNAVAILABLE'),
      },
    },
  },

  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Create a customer account',
      description: 'The role is ignored; new accounts are always customers. Limit: 20 per 15 minutes.',
      requestBody: body({
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80, example: 'Juan Dela Cruz' },
          email: { type: 'string', format: 'email', maxLength: 254, example: 'juan@example.com' },
          password: { type: 'string', minLength: 8, maxLength: 72, example: 'password123' },
        },
      }),
      responses: {
        201: okResponse('Account created', {
          type: 'object',
          properties: { user: ref('User'), token: { type: 'string' } },
        }),
        409: errorResponse('Email already registered. Code: EMAIL_TAKEN'),
        422: resRef('ValidationError'),
        429: resRef('RateLimited'),
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Log in and get a JWT',
      description: 'Limit: 20 per 15 minutes.',
      requestBody: body({
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'test@example.com' },
          password: { type: 'string', maxLength: 72, example: 'password123' },
        },
      }),
      responses: {
        200: okResponse('Logged in', {
          type: 'object',
          properties: { user: ref('User'), token: { type: 'string' } },
        }),
        401: errorResponse('Wrong email or password. Code: INVALID_CREDENTIALS'),
        422: resRef('ValidationError'),
        429: resRef('RateLimited'),
      },
    },
  },

  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user',
      security: auth,
      responses: {
        200: okResponse('The signed-in user', {
          type: 'object',
          properties: { user: ref('User') },
        }),
        401: resRef('Unauthorized'),
      },
    },
  },

  '/products': {
    get: {
      tags: ['Products'],
      summary: 'Search and filter active products',
      parameters: [
        q('q', { type: 'string', maxLength: 100 }, 'Search text'),
        q('category', { type: 'integer' }, 'Category id'),
        q('minPrice', { type: 'integer' }, 'Minimum price in centavos'),
        q('maxPrice', { type: 'integer' }, 'Maximum price in centavos'),
        q('inStock', { type: 'string', enum: ['true', 'false'] }, 'Filter by stock'),
        q(
          'sort',
          { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'name_asc'], default: 'newest' },
          'Sort order'
        ),
        q('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number'),
        q('limit', { type: 'integer', minimum: 1, maximum: 50, default: 12 }, 'Page size'),
      ],
      responses: {
        200: okResponse('A page of products', { type: 'array', items: ref('Product') }, { meta: ref('PageMeta') }),
        422: resRef('ValidationError'),
      },
    },
  },

  '/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'One product',
      parameters: [productId],
      responses: {
        200: okResponse('The product', ref('Product')),
        404: errorResponse('Code: PRODUCT_NOT_FOUND'),
        422: resRef('ValidationError'),
      },
    },
  },

  '/categories': {
    get: {
      tags: ['Products'],
      summary: 'All categories with product counts',
      responses: {
        200: okResponse('Category list', { type: 'array', items: ref('Category') }),
      },
    },
  },

  '/products/{id}/reviews': {
    get: {
      tags: ['Reviews'],
      summary: 'List reviews for a product',
      parameters: [
        productId,
        q('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number'),
        q('limit', { type: 'integer', minimum: 1, maximum: 50, default: 10 }, 'Page size'),
      ],
      responses: {
        200: okResponse(
          'A page of reviews, newest first',
          { type: 'array', items: ref('Review') },
          {
            meta: {
              allOf: [
                ref('PageMeta'),
                { type: 'object', properties: { averageRating: { type: 'number', nullable: true } } },
              ],
            },
          }
        ),
        404: errorResponse('Code: PRODUCT_NOT_FOUND'),
      },
    },
    post: {
      tags: ['Reviews'],
      summary: 'Review a product you bought',
      description:
        'Only customers with a paid, processing, shipped or delivered order containing the product can review it. One review per product. Limit: 30 writes per 15 minutes.',
      security: auth,
      parameters: [productId],
      requestBody: body(reviewBody),
      responses: {
        201: okResponse('Review created', ref('Review')),
        401: resRef('Unauthorized'),
        403: errorResponse('You have not bought this product. Code: NOT_VERIFIED_PURCHASE'),
        404: errorResponse('Code: PRODUCT_NOT_FOUND'),
        409: errorResponse('You already reviewed this product. Code: REVIEW_EXISTS'),
        422: resRef('ValidationError'),
        429: resRef('RateLimited'),
      },
    },
  },

  '/products/{id}/reviews/mine': {
    put: {
      tags: ['Reviews'],
      summary: 'Edit my review',
      security: auth,
      parameters: [productId],
      requestBody: body(reviewBody),
      responses: {
        200: okResponse('Review updated', ref('Review')),
        401: resRef('Unauthorized'),
        404: errorResponse('Code: REVIEW_NOT_FOUND'),
        422: resRef('ValidationError'),
        429: resRef('RateLimited'),
      },
    },
    delete: {
      tags: ['Reviews'],
      summary: 'Delete my review',
      security: auth,
      parameters: [productId],
      responses: {
        200: okResponse('Review deleted', {
          type: 'object',
          properties: { deleted: { type: 'boolean', example: true } },
        }),
        401: resRef('Unauthorized'),
        404: errorResponse('Code: REVIEW_NOT_FOUND'),
        429: resRef('RateLimited'),
      },
    },
  },
};