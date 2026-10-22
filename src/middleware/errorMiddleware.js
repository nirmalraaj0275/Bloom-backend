import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (_req, _res, next) => next(new ApiError(404, 'Endpoint not found.'));
export function errorHandler(error, _req, res, _next) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: error.issues.map(issue => issue.message).join(' ') });
  } else if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message });
  } else if (error.code === 11000) {
    res.status(409).json({ error: 'An account already exists. Sign in instead.' });
  } else if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Your data exceeds the 5 MB upload limit.' });
  } else if (error instanceof SyntaxError && error.status === 400) {
    res.status(400).json({ error: 'Request contains invalid JSON.' });
  } else {
    console.error('API request failed:', error instanceof Error ? error.name : 'UnknownError');
    res.status(500).json({ error: 'The request could not be completed. Please try again.' });
  }
}
