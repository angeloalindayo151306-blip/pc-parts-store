import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const stripSlash = (s) => (s || '').replace(/\/+$/, '');

const port = Number(process.env.PORT) || 4000;

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  frontendUrl: stripSlash(process.env.FRONTEND_URL || 'http://localhost:5173'),
  payment: Object.freeze({
    provider: (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase(),
    apiPublicUrl: stripSlash(process.env.API_PUBLIC_URL || `http://localhost:${port}`),
    webhookToken: process.env.MAYA_WEBHOOK_TOKEN || '',
    maya: Object.freeze({
      baseUrl: stripSlash(process.env.MAYA_BASE_URL || 'https://pg-sandbox.paymaya.com'),
      publicKey: process.env.MAYA_PUBLIC_KEY || '',
      secretKey: process.env.MAYA_SECRET_KEY || '',
    }),
  }),
  ai: Object.freeze({
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite',
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 15000,
  }),
});