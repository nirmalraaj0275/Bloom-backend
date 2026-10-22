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
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in 15 minutes.' }
  }));
  app.get('/api/health', (_req, res) => res.json({
    status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable'
  }));
  app.use('/api', verifyOrigin(allowedOrigins), requireDatabase, apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
