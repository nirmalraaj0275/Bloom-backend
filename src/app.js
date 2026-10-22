import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { requireDatabase } from './middleware/databaseMiddleware.js';
import { verifyOrigin } from './middleware/originMiddleware.js';
export function createApp({
  clientOrigin = 'http://localhost:5173',
  allowedOrigins = [clientOrigin],
  production = false
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.locals.production = production;
  // Render (and similar hosts) sit behind one reverse proxy and send X-Forwarded-For.
  // Trust only that first hop so express-rate-limit can identify clients correctly.
  if (production) app.set('trust proxy', 1);
  // Render sits behind one reverse proxy and sends X-Forwarded-For.
  // Trust that first hop so express-rate-limit can identify clients correctly.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {

[21 lines collapsed]
