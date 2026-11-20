import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://localhost:4000/api/v1';
let n = 0;
const ok = (m) => console.log(`ok ${++n} - ${m}`);

async function call(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function login(email, password) {
  const r = await call('POST', '/auth/login', { body: { email, password } });
  assert.equal(r.status, 200, `login failed for ${email}`);
  const token = r.json.data.token ?? r.json.data.accessToken;
  assert.ok(token, `no token field, data keys: ${Object.keys(r.json.data)}`);
  return token;
}

const ADDR = {
  fullName: 'Juan Dela Cruz',
  phone: '09171234567',
  line1: '123 Test Street',
  city: 'Manila',
  province: 'Metro Manila',
  postalCode: '1000',
};

const t1 = await login('test@example.com', 'password123');
const t2 = await login('customer1@pcparts.test', process.env.SEED_PASSWORD);

// 1. create an order from the cart
const created = await call('POST', '/orders', {
  token: t1,
  body: { shippingAddress: ADDR },
  headers: { 'Idempotency-Key': randomUUID() },
});
if (created.status === 422 && created.json?.error?.code === 'CART_EMPTY') {
  console.log('Your cart is empty. Add one item as test@example.com in the browser, then rerun.');
  process.exit(1);
}
assert.equal(created.status, 201, JSON.stringify(created.json));
const order = created.json.data;
assert.equal(order.status, 'pending_payment');
ok(`order ${order.id} created (pending_payment)`);

// 2. start payment
const p1 = await call('POST', `/orders/${order.id}/pay`, { token: t1 });
assert.equal(p1.status, 200, JSON.stringify(p1.json));
assert.equal(p1.json.data.provider, 'mock');
assert.equal(p1.json.data.reused, false);
assert.match(p1.json.data.checkoutUrl, /\/mock-checkout\/mock_/);
ok(`checkout session created: ${p1.json.data.checkoutUrl}`);

// 3. second click reuses the same session
const p2 = await call('POST', `/orders/${order.id}/pay`, { token: t1 });
assert.equal(p2.status, 200);
assert.equal(p2.json.data.reused, true);
assert.equal(p2.json.data.checkoutUrl, p1.json.data.checkoutUrl);
ok('second pay call reuses the pending session (no duplicate)');

// 4. gateway session carries the server-computed amount
const sessionId = p1.json.data.checkoutUrl.split('/').pop();
const s = await call('GET', `/mock-checkout/${sessionId}`);
assert.equal(s.status, 200);
assert.equal(s.json.data.status, 'pending');
assert.equal(s.json.data.amountCentavos, order.total_centavos);
assert.equal(s.json.data.reference, order.id);
ok(`gateway amount ${s.json.data.amountCentavos} equals order total`);

// 5. negative cases
assert.equal((await call('POST', `/orders/${order.id}/pay`, { token: t2 })).status, 404);
ok("another user cannot pay someone else's order (404)");
assert.equal((await call('POST', `/orders/${order.id}/pay`)).status, 401);
ok('no token: 401');
assert.equal((await call('POST', '/orders/not-a-uuid/pay', { token: t1 })).status, 422);
ok('bad order id: 422');

// 6. a cancelled order cannot be paid (also restores the stock)
assert.equal((await call('POST', `/orders/${order.id}/cancel`, { token: t1 })).status, 200);
const p3 = await call('POST', `/orders/${order.id}/pay`, { token: t1 });
assert.equal(p3.status, 409);
assert.equal(p3.json.error.code, 'ORDER_NOT_PAYABLE');
ok('cancelled order: 409 ORDER_NOT_PAYABLE');

console.log(`\nAll ${n} checks passed`);