import { api } from './client.js';

// The idempotency key prevents retries or double-clicks from creating duplicate orders.
export const createOrder = (token, idempotencyKey, payload) =>
  api('/orders', {
    method: 'POST',
    body: payload,
    token,
    headers: { 'Idempotency-Key': idempotencyKey },
  });

export const listOrders = (token) => api('/orders', { token });

export const getOrder = (token, id) => api(`/orders/${id}`, { token });

export const cancelOrder = (token, id) =>
  api(`/orders/${id}/cancel`, {
    method: 'POST',
    token,
  });