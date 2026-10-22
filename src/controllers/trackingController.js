import * as tracking from '../services/trackingService.js';

export async function getData(_req, res) {
  res.json(await tracking.getTrackingData(res.locals.userId));
}
export async function putData(req, res) {
  res.json(await tracking.replaceTrackingData(res.locals.userId, req.body.state, req.body.revision));
}
export async function updateSettings(req, res) {
  res.json(await tracking.mutateTrackingData(res.locals.userId, req.body.revision,
    state => ({ ...state, settings: req.body.settings })));
}
