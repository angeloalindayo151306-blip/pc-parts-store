import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://localhost:4000/api/v1';
const HOOK_TOKEN = process.env.MAYA_WEBHOOK_TOKEN;
assert.ok(HOOK_TOKEN, 'MAYA_WEBHOOK_TOKEN is missing in backend/.env');
assert.equal(process.env.PAYMENT_PROVIDER || 'mock', 'mock', 'Run this test with PAYMENT_PROVIDER=mock');

let n = 0;
const ok = (m) => console.log(`ok ${++n} - ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function waitFor(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(250);
  }
  assert.fail('timed out waiting for the expected state');
}

async function login(email, password) {
  const r = await call('POST', '/auth/login', { body: { email, password } });
  assert.equal(r.status, 200, `login failed for ${email}`);
  return r.json.data.token ?? r.json.data.accessToken;
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

const list = await call('GET', '/products?inStock=true&limit=5');
const items = Array.isArray(list.json.data) ? list.json.data : list.json.data.items;
const PRODUCT = items[0].id;

async function stockOf() {
  return (await call('GET', `/products/${PRODUCT}`)).json?.data?.stock;
}

async function newOrder(token) {
  await call('DELETE', '/cart', { token });
  let r = await call('POST', '/cart/items', { token, body: { productId: PRODUCT, quantity: 1 } });
  if (r.status === 422) {
    r = await call('POST', '/cart/items', { token, body: { product_id: PRODUCT, quantity: 1 } });
  }
  assert.ok([200, 201].includes(r.status), `add to cart failed: ${JSON.stringify(r.json)}`);
  const c = await call('POST', '/orders', {
    token,
    body: { shippingAddress: ADDR },
    headers: { 'Idempotency-Key': randomUUID() },
  });
  assert.equal(c.status, 201, JSON.stringify(c.json));
  return c.json.data;
}

async function startPay(token, order) {
  const p = await call('POST', `/orders/${order.id}/pay`, { token });
  assert.equal(p.status, 200, JSON.stringify(p.json));
  return p.json.data.checkoutUrl.split('/').pop();
}

const gateway = (sid, outcome, extra = {}) =>
  call('POST', `/mock-checkout/${sid}/complete`, { body: { outcome, ...extra } });

const hook = (sid, paymentStatus, token = HOOK_TOKEN) =>
  call('POST', `/webhooks/maya/${token}`, { body: { id: sid, paymentStatus } });

const getOrder = async (token, id) => (await call('GET', `/orders/${id}`, { token })).json.data;

// ---------- 1. webhook security ----------
let o = await newOrder(t1);
let sid = await startPay(t1, o);
assert.equal((await hook(sid, 'PAYMENT_SUCCESS', 'wrong-token')).status, 401);
ok('wrong webhook token: 401');
await sleep(300);
assert.equal((await getOrder(t1, o.id)).status, 'pending_payment');
ok('a rejected webhook changed nothing');

const unknown = await call('POST', `/webhooks/maya/${HOOK_TOKEN}`, { body: { foo: 'bar' } });
assert.equal(unknown.status, 200);
assert.equal(unknown.json.data.ignored, true);
ok('unknown event: 2xx and ignored');
await call('POST', `/orders/${o.id}/cancel`, { token: t1 });

// ---------- 2. paid + duplicate ----------
o = await newOrder(t1);
sid = await startPay(t1, o);
await gateway(sid, 'paid');
const h1 = await hook(sid, 'PAYMENT_SUCCESS');
assert.equal(h1.status, 200);
assert.equal(h1.json.data.duplicate, false);
let d = await waitFor(async () => {
  const x = await getOrder(t1, o.id);
  return x.status === 'paid' ? x : null;
});
assert.equal(d.history.filter((h) => h.to_status === 'paid').length, 1);
ok('webhook + server-side verification: order is paid');

await sleep(400);
const h2 = await hook(sid, 'PAYMENT_SUCCESS');
assert.equal(h2.status, 200);
assert.equal(h2.json.data.duplicate, true);
await sleep(400);
d = await getOrder(t1, o.id);
assert.equal(d.status, 'paid');
assert.equal(d.history.filter((h) => h.to_status === 'paid').length, 1);
ok('duplicate webhook: 2xx, stored once, no second transition');

// ---------- 3. amount mismatch ----------
o = await newOrder(t1);
sid = await startPay(t1, o);
await gateway(sid, 'paid', { amountCentavos: o.total_centavos - 100 });
await hook(sid, 'PAYMENT_SUCCESS');
d = await waitFor(async () => {
  const x = await getOrder(t1, o.id);
  return x.status === 'payment_flagged' ? x : null;
});
assert.match(d.flag_reason, /amount/);
ok('amount mismatch: order is payment_flagged, not paid');
await call('POST', `/orders/${o.id}/cancel`, { token: t1 });

// ---------- 4. failed payment releases stock, retry takes it again (21E) ----------
const stock0 = await stockOf();
o = await newOrder(t1);
sid = await startPay(t1, o);
const firstUrl = (await call('POST', `/orders/${o.id}/pay`, { token: t1 })).json.data.checkoutUrl;
if (typeof stock0 === 'number') assert.equal(await stockOf(), stock0 - 1);
await gateway(sid, 'failed');
await hook(sid, 'PAYMENT_FAILED');
if (typeof stock0 === 'number') {
  await waitFor(async () => (await stockOf()) === stock0);
}
assert.equal((await getOrder(t1, o.id)).status, 'pending_payment');
ok('failed payment: stock is released and the order stays open');

const retry = await waitFor(async () => {
  const r = await call('POST', `/orders/${o.id}/pay`, { token: t1 });
  return r.json?.data?.reused === false ? r : null;
});
assert.notEqual(retry.json.data.checkoutUrl, firstUrl);
if (typeof stock0 === 'number') assert.equal(await stockOf(), stock0 - 1);
ok('retry: Pay now re-reserves the stock and creates a new session');

await call('POST', `/orders/${o.id}/cancel`, { token: t1 });
if (typeof stock0 === 'number') {
  await waitFor(async () => (await stockOf()) === stock0);
}
ok('cancel after retry: stock is back to the starting value');

// ---------- 5. expired payment releases stock ----------
const before = await stockOf();
o = await newOrder(t1);
sid = await startPay(t1, o);
await gateway(sid, 'expired');
await hook(sid, 'PAYMENT_EXPIRED');
await waitFor(async () => (await getOrder(t1, o.id)).status === 'expired');
if (typeof before === 'number') assert.equal(await stockOf(), before);
ok('expired payment: order expired and stock restored');

// ---------- 6. reconcile (webhook never arrived) ----------
o = await newOrder(t1);
sid = await startPay(t1, o);
await gateway(sid, 'paid');
assert.equal((await call('POST', `/orders/${o.id}/reconcile`, { token: t2 })).status, 404);
ok("another user cannot reconcile someone else's order (404)");

const rec = await call('POST', `/orders/${o.id}/reconcile`, { token: t1 });
assert.equal(rec.status, 200);
assert.equal(rec.json.data.order.status, 'paid');
assert.deepEqual(rec.json.data.results, ['paid']);
ok('reconcile without any webhook: order is paid');

const rec2 = await call('POST', `/orders/${o.id}/reconcile`, { token: t1 });
assert.equal(rec2.json.data.order.status, 'paid');
ok('reconcile twice is harmless');

// ---------- 7. late payment on a cancelled order ----------
o = await newOrder(t1);
sid = await startPay(t1, o);
assert.equal((await call('POST', `/orders/${o.id}/cancel`, { token: t1 })).status, 200);
await gateway(sid, 'paid');
await hook(sid, 'PAYMENT_SUCCESS');
d = await waitFor(async () => {
  const x = await getOrder(t1, o.id);
  return x.flag_reason ? x : null;
});
assert.equal(d.status, 'cancelled');
ok('payment after cancel: order stays cancelled and is flagged for refund');