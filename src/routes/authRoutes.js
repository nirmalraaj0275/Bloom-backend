import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, removeAccount, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { credentialsSchema } from '../validators/requestSchemas.js';

export const authRouter = Router();

authRouter.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many account requests. Please try again in 15 minutes.' }
}));

authRouter.post('/register', validate(credentialsSchema), register);
authRouter.post('/login', validate(credentialsSchema), login);
authRouter.get('/me', authenticate, me);
authRouter.post('/logout', authenticate, logout);
authRouter.delete('/account', authenticate, removeAccount);
