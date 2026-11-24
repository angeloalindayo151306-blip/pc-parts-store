import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';

const url = (token) => `/api/v1/webhooks/maya/${token}`;
const payload = { id: 'jest-session', paymentStatus: 'PAYMENT_SUCCESS' };

afterAll(async () => {
  await pool.end();
});

describe('Payment webhook authentication (secret token in the URL)', () => {
  test('401 WEBHOOK_UNAUTHORIZED for a wrong token', async () => {
    const res = await request(app).post(url('wrong-token')).send(payload);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('WEBHOOK_UNAUTHORIZED');
  });

  test('401 for a very long token (no crash, no leak)', async () => {
    const res = await request(app).post(url('x'.repeat(500))).send(payload);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('WEBHOOK_UNAUTHORIZED');
  });
});