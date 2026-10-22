import { emptyState } from '../lib/cycle.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Settings } from '../models/Settings.js';
import { hashPassword, verifyPassword, createToken, hashToken } from '../utils/crypto.js';
import { deleteUserData } from './trackingService.js';
import { ApiError } from '../utils/ApiError.js';

export async function registerAccount({ username, password }) {
  if (await User.exists({ username })) {
    throw new ApiError(409, 'That username is taken. Choose another or sign in.');
  }

  const user = await User.create({ username, ...await hashPassword(password) });
  await Settings.create({ userId: user._id, ...emptyState().settings });
  return user;
}

export async function loginAccount({ username, password }) {
  const user = await User.findOne({ username }).select('+hash +salt');
  if (!user || !await verifyPassword(password, user)) {
    throw new ApiError(401, 'Username or password is incorrect.');
  }
  return user;
}

export async function getAccount(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new ApiError(401, 'Sign in to continue.');
  return user;
}

export async function createSession(userId) {
  const token = createToken();
  await Session.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + 7 * 86400000)
  });
  return token;
}

export const endSession = tokenHash => Session.deleteOne({ tokenHash });

export async function deleteAccount(userId) {
  await Promise.all([
    deleteUserData(userId),
    Session.deleteMany({ userId }),
    User.deleteOne({ _id: userId })
  ]);
}
