import { ApiError } from '../utils/ApiError.js';

export function verifyOrigin(allowedOrigins) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];
  return (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !origins.includes(req.get('origin'))) {
      throw new ApiError(403, 'Request origin is not allowed.');
    }
    next();
  };
}
