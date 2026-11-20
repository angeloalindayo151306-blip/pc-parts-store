import { env } from '../config/env.js';
import { expireStaleOrders } from '../services/orderLifecycle.service.js';

const EVERY_MS = 60_000;
let timer = null;

async function tick() {
  try {
    const n = await expireStaleOrders();
    if (n > 0) console.log(`Expired ${n} unpaid order(s)`);
  } catch (err) {
    console.error('Expiry job failed:', err.message);
  }
}

export function startExpiryJob() {
  if (timer || env.nodeEnv === 'test') return;
  setTimeout(tick, 5000).unref();
  timer = setInterval(tick, EVERY_MS);
  timer.unref();
}

startExpiryJob();