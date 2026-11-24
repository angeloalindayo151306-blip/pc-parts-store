import jwt from 'jsonwebtoken';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const base = `http://localhost:${env.port || 4000}/api/v1`;

const buyer = (
  await pool.query(
    `select o.user_id, u.role, oi.product_id
     from orders o
     join order_items oi on oi.order_id = o.id
     join users u on u.id = o.user_id
     join products p on p.id = oi.product_id and p.is_active = true
     where o.status in ('paid','processing','shipped','delivered')
       and not exists (
         select 1 from product_reviews r
         where r.user_id = o.user_id and r.product_id = oi.product_id)
     limit 1`
  )
).rows[0];

if (!buyer) {
  console.log('RESULT no paid order with an active, unreviewed product found');
  process.exit(0);
}

const other = (
  await pool.query(
    `select id from products
     where is_active = true
       and id not in (
         select oi.product_id from order_items oi
         join orders o on o.id = oi.order_id
         where o.user_id = $1
           and o.status in ('paid','processing','shipped','delivered'))
     limit 1`,
    [buyer.user_id]
  )
).rows[0];

const token = jwt.sign({ sub: buyer.user_id, role: buyer.role }, env.jwtSecret, {
  algorithm: 'HS256',
  expiresIn: '5m',
});

const call = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
};

const pid = buyer.product_id;
const created = await call('POST', `/products/${pid}/reviews`, { rating: 5, comment: 'Check' });
const duplicate = await call('POST', `/products/${pid}/reviews`, { rating: 4 });
const notBought = other
  ? await call('POST', `/products/${other.id}/reviews`, { rating: 3 })
  : { status: 'n/a', json: {} };
const badRating = await call('POST', `/products/${pid}/reviews`, { rating: 9 });
const list = await call('GET', `/products/${pid}/reviews`);
const removed = await call('DELETE', `/products/${pid}/reviews/mine`);

console.log(
  'RESULT',
  `create=${created.status}`,
  `duplicate=${duplicate.status}:${duplicate.json.error?.code}`,
  `notBought=${notBought.status}:${notBought.json.error?.code}`,
  `badRating=${badRating.status}:${badRating.json.error?.code}`,
  `avg=${list.json.meta?.averageRating}`,
  `count=${list.json.meta?.total}`,
  `delete=${removed.status}`
);
process.exit(0);