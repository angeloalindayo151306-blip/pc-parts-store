const MESSAGES = {
  RESERVATION_EXPIRED: 'The stock hold for this order has ended. Please place a new order.',
  ORDER_NOT_PAYABLE: 'This order can no longer be paid.',
  PAYMENT_GATEWAY_ERROR:
    'The payment service is not responding. Nothing was charged. Please try again in a moment.',
  NETWORK_ERROR: 'Cannot reach the server. Check your connection and try again.',
  ORDER_NOT_FOUND: 'Order not found.',
  ILLEGAL_TRANSITION: "That action is not allowed for this order's current status.",
};

// Turns an API error (see api/client.js) into one friendly sentence.
export function friendlyError(err) {
  if (err?.status === 401) return 'Your session has expired. Please log in again.';
  if (err?.status === 403) return 'You are not allowed to do that.';
  return MESSAGES[err?.code] || err?.message || 'Something went wrong. Please try again.';
}