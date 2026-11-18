import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/errors.js';
import v1 from './routes/index.js';

export const app = express();

app.set('trust proxy', 1); // Render sits behind a proxy
app.use(requestId);
app.use(helmet());

// CORS allowlist: no wildcard. Requests with no Origin (curl, Postman) are allowed.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      callback(new AppError(403, 'CORS_BLOCKED', 'Origin not allowed'));
    },
  })
);

// >>> The payment webhook route goes HERE later (it needs the raw body,
// >>> so it must be registered BEFORE express.json).

app.use(express.json({ limit: '100kb' }));

app.use('/api/v1', v1);

app.use(notFound);
app.use(errorHandler);