import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await deriveKey(password, salt, 64)).toString('hex');
  return { salt, hash };
}
export async function verifyPassword(password, user) {
  const derived = await deriveKey(password, user.salt, 64);
  return timingSafeEqual(Buffer.from(user.hash, 'hex'), derived);
}
export const createToken = () => randomBytes(32).toString('hex');
export const hashToken = token => createHash('sha256').update(token).digest('hex');
