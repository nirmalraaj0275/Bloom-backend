import { mutateTrackingData, getTrackingData } from '../services/trackingService.js';
import { ApiError } from '../utils/ApiError.js';

export function recordController(collection) {
  return {
    async list(_req, res) {
      const data = await getTrackingData(res.locals.userId);
      res.json({ records: data.state[collection], revision: data.revision });
    },
    async create(req, res) {
      const data = await mutateTrackingData(res.locals.userId, req.body.revision, state => {
        if (state[collection].some(record => record.id === req.body.record.id)) throw new ApiError(409, 'This record already exists.');
        return { ...state, [collection]: [...state[collection], req.body.record] };
      });
      res.status(201).json(data);
    },
    async update(req, res) {
      if (req.params.id !== req.body.record.id) throw new ApiError(400, 'Record ID must match the URL.');
      const data = await mutateTrackingData(res.locals.userId, req.body.revision, state => {
        if (!state[collection].some(record => record.id === req.params.id)) throw new ApiError(404, 'Record not found.');
        return { ...state, [collection]: state[collection].map(record => record.id === req.params.id ? req.body.record : record) };
      });
      res.json(data);
    },
    async remove(req, res) {
      const data = await mutateTrackingData(res.locals.userId, req.body.revision, state => {
        if (!state[collection].some(record => record.id === req.params.id)) throw new ApiError(404, 'Record not found.');
        return { ...state, [collection]: state[collection].filter(record => record.id !== req.params.id) };
      });
      res.json(data);
    }
  };
}
