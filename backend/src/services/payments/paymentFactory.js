import { env } from '../../config/env.js';
import { MayaProvider } from './MayaProvider.js';
import { MockProvider } from './MockProvider.js';

const builders = {
  maya: () => new MayaProvider(env.payment.maya),
  mock: () => new MockProvider({ baseUrl: env.payment.apiPublicUrl }),
};

const cache = new Map(); // one instance per provider name

export function getPaymentProvider(name = env.payment.provider) {
  const key = String(name).toLowerCase();
  const build = builders[key];
  if (!build) throw new Error(`Unknown PAYMENT_PROVIDER: ${key}`);
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}

export const availableProviders = () => Object.keys(builders);