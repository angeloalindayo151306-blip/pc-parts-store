import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const email = `jest-${Date.now()}@example.com`;
const password = 'password123';
let token;

afterAll(async () => {
  await pool.query("delete from users where email like 'jest-%@example.com'");
  await pool.end();
});

describe('POST /api/v1/auth/register', () => {
  test('creates a customer and never returns the password hash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Jest User', email, password });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.token).toBeDefined();
  });

  test('409 EMAIL_TAKEN for a duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Jest User', email, password });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('422 with field details for invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  test('cannot register yourself as admin', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Sneaky', email: `jest-admin-${Date.now()}@example.com`, password, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('customer');
  });
});

describe('POST /api/v1/auth/login', () => {
  test('200 with a token for correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    token = res.body.data.token;
    expect(token).toBeDefined();
  });

  test('401 INVALID_CREDENTIALS for a wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('401 with the same message for an unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody-here@example.com', password });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });
});

describe('GET /api/v1/auth/me (token checks)', () => {
  test('200 with a valid token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
  });

  test('401 UNAUTHENTICATED with no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('401 INVALID_TOKEN for a tampered token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}x`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('401 TOKEN_EXPIRED for an expired token', async () => {
    const expired = jwt.sign({ sub: 'x', role: 'customer' }, env.jwtSecret, { expiresIn: -10 });
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('Role protection', () => {
  test('403 FORBIDDEN when a customer calls an admin route', async () => {
    const res = await request(app).get('/api/v1/admin/ping').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('401 on an admin route with no token', async () => {
    const res = await request(app).get('/api/v1/admin/ping');
    expect(res.status).toBe(401);
  });
});