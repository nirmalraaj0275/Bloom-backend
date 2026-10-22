import { Router } from 'express';
import { recordController } from '../controllers/recordController.js';
import { validate } from '../middleware/validateMiddleware.js';
import { recordSchemas, revisionSchema } from '../validators/requestSchemas.js';

export function recordRouter(collection) {
  const router = Router();
  const controller = recordController(collection);
  router.get('/', controller.list);
  router.post('/', validate(recordSchemas[collection]), controller.create);
  router.put('/:id', validate(recordSchemas[collection]), controller.update);
  router.delete('/:id', validate(revisionSchema), controller.remove);
  return router;
}
