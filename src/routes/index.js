import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { recordRouter } from './recordRoutes.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { syncSchema, preferencesSchema } from '../validators/requestSchemas.js';
import { getData, putData, updateSettings } from '../controllers/trackingController.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use(authenticate);
apiRouter.get('/data', getData);
apiRouter.put('/data', validate(syncSchema), putData);
apiRouter.put('/settings', validate(preferencesSchema), updateSettings);
for (const collection of ['periods', 'daily', 'journal']) apiRouter.use(`/${collection}`, recordRouter(collection));
