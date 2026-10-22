import * as auth from '../services/authService.js';

const cookieOptions = res => ({
  httpOnly: true,
  secure: res.app.locals.production,
  sameSite: 'strict',
  path: '/api',
  maxAge: 7 * 86400000
});

function userPayload(user) {
  return { user: { username: user.username }, revision: user.revision ?? 0 };
}

async function respondWithSession(user, res, status) {
  const token = await auth.createSession(user._id);
  res.cookie('bloomcycle_session', token, cookieOptions(res));
  res.status(status).json(userPayload(user));
}

export const register = async (req, res) => respondWithSession(await auth.registerAccount(req.body), res, 201);
export const login = async (req, res) => respondWithSession(await auth.loginAccount(req.body), res, 200);

export async function me(_req, res) {
  const user = await auth.getAccount(res.locals.userId);
  res.json(userPayload(user));
}

export async function logout(_req, res) {
  await auth.endSession(res.locals.tokenHash);
  res.clearCookie('bloomcycle_session', { ...cookieOptions(res), maxAge: undefined });
  res.status(204).end();
}

export async function removeAccount(_req, res) {
  await auth.deleteAccount(res.locals.userId);
  res.clearCookie('bloomcycle_session', { ...cookieOptions(res), maxAge: undefined });
  res.status(204).end();
}
