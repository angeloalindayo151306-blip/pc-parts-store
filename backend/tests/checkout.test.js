import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';

const api = '/api/v1';
const password = 'password123';
const stamp = Date.now();
const address = {
  fullName: 'Jest Buyer',
  phone: '09171234567',
  line1: '123 Test Street',
  city: 'Manila',
  province: 'Metro Manila',
  postalCode: '1000',
};

async function makeUser(label) {
  const res = await request(app)
    .post(`${api}/auth/register`)
    .send({ name: `Jest ${label}`, email: `jest-${label}-${stamp}@example.com`, password });
  const token = res.body.data.token;
  return { token, id: jwt.decode(token).sub };
}

const as = (u) => ({ Authorization: `Bearer ${u.token}` });

async function makeProduct(label, priceCentavos, stock) {
  const cat = await pool.query('select id from categories order by id limit 1');
  const { rows } = await pool.query(
    'insert into products (category_id, name, price_centavos, stock) values ($1, $2, $3, $4) returning id',
    [cat.rows[0].id, `jest-product-${label}-${stamp}`, priceCentavos, stock]
  );
  return rows[0].id;
}

const stockOf = async (productId) =>
  (await pool.query('select stock from products where id = $1', [productId])).rows[0].stock;

const ordersOf = async (userId) =>
  (
    await pool.query(
      'select status, subtotal_centavos, discount_centavos, shipping_centavos, total_centavos from orders where user_id = $1',
      [userId]
    )
  ).rows;

const addToCart = (u, productId, quantity) =>
  request(app).post(`${api}/cart/items`).set(as(u)).send({ productId, quantity });

const checkout = (u, key, body = { shippingAddress: address }) =>
  request(app).post(`${api}/orders`).set(as(u)).set('Idempotency-Key', key).send(body);

async function cleanup() {
  await pool.query(
    "delete from orders where user_id in (select id from users where email like 'jest-%@example.com')"
  );
  await pool.query("delete from users where email like 'jest-%@example.com'");
  await pool.query("delete from products where name like 'jest-product-%'");
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('Checkout validation', () => {
  let user;
  beforeAll(async () => {
    user = await makeUser('valid');
  });

  test('422 IDEMPOTENCY_KEY_REQUIRED without the header', async () => {
    const res = await request(app)
      .post(`${api}/orders`)
      .set(as(user))
      .send({ shippingAddress: address });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  test('422 VALIDATION_ERROR when the client sends its own total', async () => {
    const res = await checkout(user, `jest-key-${stamp}-total`, {
      shippingAddress: address,
      total: 1,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('422 CART_EMPTY for an empty cart', async () => {
    const res = await checkout(user, `jest-key-${stamp}-empty`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CART_EMPTY');
  });
});

describe('Checkout pricing (server calculates every amount)', () => {
  test('subtotal, flat shipping and total come from database prices; stock is reserved', async () => {
    const user = await makeUser('price');
    const pid = await makeProduct('price', 100000, 5); // PHP 1,000.00 each
    const added = await addToCart(user, pid, 2);
    expect([200, 201]).toContain(added.status);

    const res = await checkout(user, `jest-key-${stamp}-price`);
    expect(res.status).toBe(201);

    const rows = await ordersOf(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('pending_payment');
    expect(rows[0].subtotal_centavos).toBe(200000);
    expect(rows[0].discount_centavos).toBe(0);
    expect(rows[0].shipping_centavos).toBe(15000);
    expect(rows[0].total_centavos).toBe(215000);
    expect(await stockOf(pid)).toBe(3);
  });

  test('the same Idempotency-Key returns the same order and reserves nothing twice', async () => {
    const user = await makeUser('replay');
    const pid = await makeProduct('replay', 100000, 5);
    await addToCart(user, pid, 1);

    const first = await checkout(user, `jest-key-${stamp}-replay`);
    const second = await checkout(user, `jest-key-${stamp}-replay`);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.replayed).toBe(true);
    expect(await ordersOf(user.id)).toHaveLength(1);
    expect(await stockOf(pid)).toBe(4);
  });

  test('shipping is free when the amount reaches PHP 10,000', async () => {
    const user = await makeUser('free');
    const pid = await makeProduct('free', 600000, 5); // PHP 6,000.00 each
    await addToCart(user, pid, 2);

    const res = await checkout(user, `jest-key-${stamp}-free`);
    expect(res.status).toBe(201);

    const rows = await ordersOf(user.id);
    expect(rows[0].subtotal_centavos).toBe(1200000);
    expect(rows[0].shipping_centavos).toBe(0);
    expect(rows[0].total_centavos).toBe(1200000);
  });
});

describe('Stock conflict', () => {
  test('cannot add more than the stock, and the last unit goes to the first checkout', async () => {
    const a = await makeUser('stockA');
    const b = await makeUser('stockB');
    const pid = await makeProduct('stock', 50000, 1); // only 1 in stock

    const tooMany = await addToCart(a, pid, 2);
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Both customers put the last unit in their cart.
    expect([200, 201]).toContain((await addToCart(a, pid, 1)).status);
    expect([200, 201]).toContain((await addToCart(b, pid, 1)).status);

    const first = await checkout(a, `jest-key-${stamp}-stockA`);
    expect(first.status).toBe(201);
    expect(await stockOf(pid)).toBe(0);

    const second = await checkout(b, `jest-key-${stamp}-stockB`);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('OUT_OF_STOCK');
    expect(await stockOf(pid)).toBe(0); // never negative
    expect(await ordersOf(b.id)).toHaveLength(0);

    // The failed checkout leaves B's cart filled; empty it so cleanup can delete the product.
    await request(app).delete(`${api}/cart`).set(as(b));
  });
});