import { Session } from '../models/Session.js';
import { hashToken } from '../utils/crypto.js';
import { ApiError } from '../utils/ApiError.js';

export async function authenticate(req, res, next) {
  const token = req.cookies.bloomcycle_session;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new ApiError(401, 'Sign in to continue.');
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) throw new ApiError(401, 'Your session expired. Sign in again.');
  res.locals.userId = session.userId;
  res.locals.tokenHash = session.tokenHash;
  next();
}
