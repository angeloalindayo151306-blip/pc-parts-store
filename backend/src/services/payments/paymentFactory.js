import { env } from '../../config/env.js';
import { MayaProvider } from './MayaProvider.js';
import { MockProvider } from './MockProvider.js';

const builders = {
  maya: () => new MayaProvider(env.payment.maya),
  // The fake gateway's checkout page is a frontend route.
  mock: () => new MockProvider({ baseUrl: env.frontendUrl }),
};

const cache = new Map(); // one instance per provider name

export function getPaymentProvider(name = env.payment.provider) {
  const key = String(name).toLowerCase();
  const build = builders[key];
  if (!build) throw new Error(`Unknown PAYMENT_PROVIDER: ${key}`);
  if (key === 'mock' && env.nodeEnv === 'production') {
    throw new Error('The mock payment provider is disabled in production');
  }
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}

export const availableProviders = () => Object.keys(builders);