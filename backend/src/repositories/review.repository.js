import { pool } from '../config/db.js';

const cols = (a) =>
  `${a}.id, ${a}.product_id, ${a}.rating, ${a}.comment, ${a}.created_at, ${a}.updated_at`;

// True if the user has a paid (or later) order containing the product.
export async function hasPurchased(userId, productId) {
  const { rows } = await pool.query(
    `select exists(
       select 1
       from orders o
       join order_items oi on oi.order_id = o.id
       where o.user_id = $1
         and oi.product_id = $2
         and o.status in ('paid', 'processing', 'shipped', 'delivered')
     ) as purchased`,
    [userId, productId]
  );
  return rows[0].purchased;
}

export async function listByProduct(productId, { page, limit }) {
  const summary = await pool.query(
    `select count(*)::int as total,
            round(avg(rating)::numeric, 1)::float as average
     from product_reviews
     where product_id = $1`,
    [productId]
  );
  const { rows } = await pool.query(
    `select ${cols('r')}, u.name as reviewer_name
     from product_reviews r
     join users u on u.id = r.user_id
     where r.product_id = $1
     order by r.created_at desc, r.id
     limit $2 offset $3`,
    [productId, limit, (page - 1) * limit]
  );
  return {
    items: rows,
    total: summary.rows[0].total,
    average: summary.rows[0].average,
  };
}

// Returns null if this user already reviewed this product.
export async function insert(userId, productId, { rating, comment }) {
  const { rows } = await pool.query(
    `with ins as (
       insert into product_reviews (user_id, product_id, rating, comment)
       values ($1, $2, $3, $4)
       on conflict (user_id, product_id) do nothing
       returning *
     )
     select ${cols('ins')}, u.name as reviewer_name
     from ins join users u on u.id = ins.user_id`,
    [userId, productId, rating, comment]
  );
  return rows[0] || null;
}

// Returns null if the user has no review for this product.
export async function update(userId, productId, { rating, comment }) {
  const { rows } = await pool.query(
    `with upd as (
       update product_reviews
       set rating = $3, comment = $4, updated_at = now()
       where user_id = $1 and product_id = $2
       returning *
     )
     select ${cols('upd')}, u.name as reviewer_name
     from upd join users u on u.id = upd.user_id`,
    [userId, productId, rating, comment]
  );
  return rows[0] || null;
}

export async function remove(userId, productId) {
  const { rowCount } = await pool.query(
    'delete from product_reviews where user_id = $1 and product_id = $2',
    [userId, productId]
  );
  return rowCount > 0;
}