import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export function requireDatabase(_req, _res, next) {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'BloomCycle is temporarily unavailable. Please try again shortly.');
  }
  next();
}
