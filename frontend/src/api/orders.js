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
  api(`/orders/${id}/cancel`, { method: 'POST', token });

// Returns { checkoutUrl, provider, paymentId, reused }. The server decides the amount.
export const payOrder = (token, id) => api(`/orders/${id}/pay`, { method: 'POST', token });

// Asks the server to verify with the gateway. Returns { order, checked, results }.
export const reconcileOrder = (token, id) =>
  api(`/orders/${id}/reconcile`, { method: 'POST', token });