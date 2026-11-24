import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/errors.js';
import v1 from './routes/index.js';
import mockCheckout from './routes/mockCheckout.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { openapiSpec } from './docs/openapi/index.js';


export const app = express();


app.set('trust proxy', 1); // Render sits behind a proxy
app.use(requestId);


// API documentation. Swagger UI needs inline scripts that Helmet's default
// Content-Security-Policy blocks, so only this path turns that one header off.
// It is registered BEFORE the global helmet() below so the strict policy
// still applies to every other route.
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));
app.use(
  '/api-docs',
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'PC Parts Store API',
    swaggerOptions: { persistAuthorization: true },
  })
);


app.use(helmet());
// Payment webhook: needs the RAW body, so it is registered BEFORE express.json.
app.use('/api/v1/webhooks', webhookRoutes);


// CORS allowlist: no wildcard. Requests with no Origin (curl, Postman) are allowed.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      callback(new AppError(403, 'CORS_BLOCKED', 'Origin not allowed'));
    },
  })
);


app.use(express.json({ limit: '100kb' }));


// Fake gateway API: development and tests only, never in production.
if (env.payment.provider === 'mock' && env.nodeEnv !== 'production') {
  app.use('/api/v1/mock-checkout', mockCheckout);
}


app.use('/api/v1', v1);


app.use(notFound);
app.use(errorHandler);