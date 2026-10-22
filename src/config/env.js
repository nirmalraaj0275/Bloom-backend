import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const loaded = dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
if (loaded.error && loaded.error.code !== 'ENOENT') {
  throw new Error('Backend environment configuration could not be loaded. Check file access permissions.');
}

const environment = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
}).parse(process.env);

const clientOrigin = new URL(environment.CLIENT_ORIGIN).origin;
const production = environment.NODE_ENV === 'production';

function localDevOrigins(origin) {
  const url = new URL(origin);
  const port = url.port ? `:${url.port}` : '';
  const origins = new Set([origin]);
  if (url.hostname === 'localhost') origins.add(`${url.protocol}//127.0.0.1${port}`);
  if (url.hostname === '127.0.0.1') origins.add(`${url.protocol}//localhost${port}`);
  return [...origins];
}

export const config = {
  port: environment.PORT,
  clientOrigin,
  // In development, accept both localhost and 127.0.0.1 so Vite and the API stay aligned.
  allowedOrigins: production ? [clientOrigin] : localDevOrigins(clientOrigin),
  mongoUri: environment.MONGODB_URI,
  production
};
