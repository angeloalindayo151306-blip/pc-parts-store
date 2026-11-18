import { pool } from '../config/db.js';

// Whitelist: the user picks a KEY, never raw SQL. This prevents SQL injection in ORDER BY.
const SORTS = {
  newest: 'p.created_at desc, p.id',
  price_asc: 'p.price_centavos asc, p.id',
  price_desc: 'p.price_centavos desc, p.id',
  name_asc: 'p.name asc, p.id',
};

// Make % and _ in the search text match literally.
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const COLUMNS = `
  p.id, p.name, p.description, p.price_centavos, p.stock, p.image_url, p.specs,
  c.id as category_id, c.name as category`;

export async function list({ q, category, minPrice, maxPrice, inStock, sort, page, limit }) {
  const where = ['p.is_active = true'];
  const params = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (q) {
    const term = add(`%${escapeLike(q)}%`);
    where.push(`(p.name ilike ${term} or p.description ilike ${term})`);
  }
  if (category !== undefined) where.push(`p.category_id = ${add(category)}`);
  if (minPrice !== undefined) where.push(`p.price_centavos >= ${add(minPrice)}`);
  if (maxPrice !== undefined) where.push(`p.price_centavos <= ${add(maxPrice)}`);
  if (inStock === 'true') where.push('p.stock > 0');

  const whereSql = where.join(' and ');

  const count = await pool.query(
    `select count(*)::int as total from products p where ${whereSql}`,
    params
  );

  const limitParam = add(limit);
  const offsetParam = add((page - 1) * limit);
  const { rows } = await pool.query(
    `select ${COLUMNS}
     from products p join categories c on c.id = p.category_id
     where ${whereSql}
     order by ${SORTS[sort]}
     limit ${limitParam} offset ${offsetParam}`,
    params
  );

  return { items: rows, total: count.rows[0].total };
}

export async function findActiveById(id) {
  const { rows } = await pool.query(
    `select ${COLUMNS}
     from products p join categories c on c.id = p.category_id
     where p.id = $1 and p.is_active = true`,
    [id]
  );
  return rows[0] || null;
}

export async function listCategories() {
  const { rows } = await pool.query(
    `select c.id, c.name, count(p.id)::int as product_count
     from categories c
     left join products p on p.category_id = c.id and p.is_active = true
     group by c.id
     order by c.id`
  );
  return rows;
}