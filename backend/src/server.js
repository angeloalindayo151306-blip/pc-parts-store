import { app } from './app.js';
import { env } from './config/env.js';
import './jobs/expiry.job.js';

app.listen(env.port, () => {
  console.log(`API running on port ${env.port} (${env.nodeEnv})`);
});