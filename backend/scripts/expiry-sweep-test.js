import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/db.js';
import { withTransaction } from '../src/utils/transaction.js';
import { releaseStock } from '../src/services/orderWorkflow.js';
import { expireStaleOrders } from '../src/services/orderLifecycle.service.js';

const BASE = 'http://localhost:4000/api/v1';

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
  return { status: res.status, json: await res.json().catch(() => null) };
}

const ADDR = {
  fullName: 'Juan Dela Cruz',
  phone: '09171234567',
  line1: '123 Test Street',
  city: 'Manila',
  province: 'Metro Manila',
  postalCode: '1000',
};

try {
  const login = await call('POST', '/auth/login', {
    body: { email: 'test@example.com', password: 'password123' },
  });
  assert.equal(login.status, 200, 'login failed');
  const token = login.json.data.token ?? login.json.data.accessToken;

  const list = await call('GET', '/products?inStock=true&limit=5');
  const items = Array.isArray(list.json.data) ? list.json.data : list.json.data.items;
  const PRODUCT = items[0].id;
  const stockOf = async () => (await call('GET', `/products/${PRODUCT}`)).json.data.stock;

  const stock0 = await stockOf();

  await call('DELETE', '/cart', { token });
  let r = await call('POST', '/cart/items', { token, body: { productId: PRODUCT, quantity: 1 } });
  if (r.status === 422) {
    r = await call('POST', '/cart/items', { token, body: { product_id: PRODUCT, quantity: 1 } });
  }
  assert.ok([200, 201].includes(r.status), 'add to cart failed');
  const c = await call('POST', '/orders', {
    token,
    body: { shippingAddress: ADDR },
    headers: { 'Idempotency-Key': randomUUID() },
  });
  assert.equal(c.status, 201, JSON.stringify(c.json));
  const orderId = c.json.data.id;
  assert.equal(await stockOf(), stock0 - 1);
  console.log('ok 1 - order created, stock held');

  // Same effect as a failed payment: stock goes back, order stays pending_payment.
  await withTransaction((client) => releaseStock(client, orderId));
  assert.equal(await stockOf(), stock0);
  console.log('ok 2 - stock released, order still open');

  // A recent order must not be expired by the sweep.
  await expireStaleOrders();
  const fresh = await call('GET', `/orders/${orderId}`, { token });
  assert.equal(fresh.json.data.status, 'pending_payment');
  console.log('ok 3 - a recent order is left alone');

  await pool.query("UPDATE orders SET updated_at = now() - interval '31 minutes' WHERE id = $1", [
    orderId,
  ]);
  await expireStaleOrders();
  const done = await call('GET', `/orders/${orderId}`, { token });
  assert.equal(done.json.data.status, 'expired');
  assert.equal(await stockOf(), stock0);
  console.log('ok 4 - idle failed order is expired and stock is unchanged');
} finally {
  await pool.end();
}