import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const password = process.env.SEED_PASSWORD;
if (!password || password.length < 8) {
  console.error('Set SEED_PASSWORD (8+ characters) in backend/.env first.');
  process.exit(1);
}

const CATEGORIES = ['CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU'];

// [category, name, price in centavos, stock, specs]
const PRODUCTS = [
  ['CPU', 'AMD Ryzen 5 5600 6-Core', 849500, 12, { socket: 'AM4', tdp_watts: 65 }],
  ['CPU', 'AMD Ryzen 7 5700X 8-Core', 1099500, 8, { socket: 'AM4', tdp_watts: 65 }],
  ['CPU', 'AMD Ryzen 5 7600 6-Core', 1349500, 10, { socket: 'AM5', tdp_watts: 65 }],
  ['CPU', 'AMD Ryzen 7 7700X 8-Core', 1899500, 5, { socket: 'AM5', tdp_watts: 105 }],
  ['CPU', 'Intel Core i5-12400F', 799500, 14, { socket: 'LGA1700', tdp_watts: 65 }],
  ['CPU', 'Intel Core i5-13400F', 1149500, 9, { socket: 'LGA1700', tdp_watts: 65 }],

  ['Motherboard', 'MSI B550M PRO-VDH WiFi', 625000, 9, { socket: 'AM4', ram_type: 'DDR4', form_factor: 'mATX' }],
  ['Motherboard', 'Gigabyte B550 AORUS Elite', 899500, 6, { socket: 'AM4', ram_type: 'DDR4', form_factor: 'ATX' }],
  ['Motherboard', 'ASUS TUF Gaming B650-PLUS', 1299500, 7, { socket: 'AM5', ram_type: 'DDR5', form_factor: 'ATX' }],
  ['Motherboard', 'MSI PRO B760M-P DDR4', 699500, 11, { socket: 'LGA1700', ram_type: 'DDR4', form_factor: 'mATX' }],
  ['Motherboard', 'MSI PRO B760-P WiFi DDR5', 1049500, 4, { socket: 'LGA1700', ram_type: 'DDR5', form_factor: 'ATX' }],

  ['RAM', 'Corsair Vengeance 16GB (2x8) DDR4 3200', 195000, 30, { ram_type: 'DDR4', capacity_gb: 16, speed_mhz: 3200 }],
  ['RAM', 'Kingston Fury Beast 32GB (2x16) DDR4 3200', 369500, 18, { ram_type: 'DDR4', capacity_gb: 32, speed_mhz: 3200 }],
  ['RAM', 'Kingston Fury Beast 16GB DDR5 5200', 329500, 15, { ram_type: 'DDR5', capacity_gb: 16, speed_mhz: 5200 }],
  ['RAM', 'G.Skill Ripjaws S5 32GB (2x16) DDR5 5600', 549500, 3, { ram_type: 'DDR5', capacity_gb: 32, speed_mhz: 5600 }],

  ['GPU', 'NVIDIA GeForce RTX 4060 8GB', 1899500, 4, { tdp_watts: 115, vram_gb: 8 }],
  ['GPU', 'AMD Radeon RX 7600 8GB', 1549500, 6, { tdp_watts: 165, vram_gb: 8 }],
  ['GPU', 'NVIDIA GeForce RTX 4060 Ti 8GB', 2699500, 5, { tdp_watts: 160, vram_gb: 8 }],
  ['GPU', 'NVIDIA GeForce RTX 4070 Super 12GB', 4199500, 2, { tdp_watts: 220, vram_gb: 12 }],

  ['Storage', 'Kingston NV2 1TB NVMe SSD', 320000, 0, { type: 'NVMe SSD', capacity_gb: 1000 }],
  ['Storage', 'WD Blue SN580 1TB NVMe SSD', 349500, 20, { type: 'NVMe SSD', capacity_gb: 1000 }],
  ['Storage', 'Crucial MX500 500GB SATA SSD', 249500, 16, { type: 'SATA SSD', capacity_gb: 500 }],

  ['PSU', 'Cooler Master MWE 650W 80+ Bronze', 345000, 15, { wattage: 650 }],
  ['PSU', 'Seasonic Focus GX-750 750W 80+ Gold', 699500, 7, { wattage: 750 }],
  ['PSU', 'MSI MAG A850GL 850W 80+ Gold', 799500, 5, { wattage: 850 }],
  ['PSU', 'Corsair CV550 550W 80+ Bronze', 299500, 12, { wattage: 550 }],
];

const USERS = [
  ['Store Admin', 'admin@pcparts.test', 'admin'],
  ['Maria Santos', 'customer1@pcparts.test', 'customer'],
  ['Juan Dela Cruz', 'customer2@pcparts.test', 'customer'],
];

// [code, type, value, min spend (centavos), expires_at, usage_limit, per_user_limit]
const COUPONS = [
  ['WELCOME10', 'percent', 10, 0, null, null, 1],
  ['SAVE500', 'fixed', 50000, 500000, null, 100, 1],
  ['EXPIRED20', 'percent', 20, 0, '2024-01-01T00:00:00Z', null, 1],
];

const describe = (category, specs) =>
  `${category}. ` +
  Object.entries(specs).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ');

const client = await pool.connect();
try {
  await client.query('begin');

  const catIds = {};
  for (const name of CATEGORIES) {
    const { rows } = await client.query(
      `insert into categories (name) values ($1)
       on conflict (name) do update set name = excluded.name
       returning id`,
      [name]
    );
    catIds[name] = rows[0].id;
  }

  for (const [category, name, price, stock, specs] of PRODUCTS) {
    await client.query(
      `insert into products (category_id, name, description, price_centavos, stock, specs, is_active)
       values ($1, $2, $3, $4, $5, $6, true)
       on conflict (name) do update set
         category_id = excluded.category_id, description = excluded.description,
         price_centavos = excluded.price_centavos, stock = excluded.stock,
         specs = excluded.specs, is_active = true`,
      [catIds[category], name, describe(category, specs), price, stock, specs]
    );
  }

  const hash = await bcrypt.hash(password, 10);
  for (const [name, email, role] of USERS) {
    await client.query(
      `insert into users (name, email, password_hash, role) values ($1, $2, $3, $4)
       on conflict (email) do update set
         name = excluded.name, password_hash = excluded.password_hash, role = excluded.role`,
      [name, email, hash, role]
    );
  }

  for (const [code, type, value, minSpend, expiresAt, usageLimit, perUser] of COUPONS) {
    await client.query(
      `insert into coupons (code, discount_type, discount_value, min_spend_centavos,
                            expires_at, usage_limit, per_user_limit, is_active)
       values ($1, $2, $3, $4, $5, $6, $7, true)
       on conflict (code) do update set
         discount_type = excluded.discount_type, discount_value = excluded.discount_value,
         min_spend_centavos = excluded.min_spend_centavos, expires_at = excluded.expires_at,
         usage_limit = excluded.usage_limit, per_user_limit = excluded.per_user_limit,
         is_active = true`,
      [code, type, value, minSpend, expiresAt, usageLimit, perUser]
    );
  }

  await client.query('commit');
  console.log(
    `Seeded: ${CATEGORIES.length} categories, ${PRODUCTS.length} products, ` +
    `${USERS.length} users, ${COUPONS.length} coupons.`
  );
} catch (err) {
  await client.query('rollback');
  console.error('Seed failed, nothing was changed:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}