import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { emptyState } from '../src/lib/cycle.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { Period } from '../src/models/Period.js';
import { Daily } from '../src/models/Daily.js';
import { Journal } from '../src/models/Journal.js';
import { Settings } from '../src/models/Settings.js';

const origin = 'http://localhost:5173';
const app = createApp({ clientOrigin: origin });
let mongo;
let alice;
let bob;
const period = {
  id: crypto.randomUUID(),
  start: '2024-02-28',
  end: '2024-03-01',
  flow: 'medium',
  cramps: 'mild',
  symptoms: [],
  notes: ''
};

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([
    User.init(), Session.init(), Period.init(), Daily.init(), Journal.init(), Settings.init()
  ]);
  alice = request.agent(app);
  bob = request.agent(app);
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}, 60000);

describe('authenticated Express and MongoDB API', () => {
  it('reports health and rejects unauthenticated access and cross-origin writes', async () => {
    const health = await request(app).get('/api/health').expect(200);
    expect(health.body.database).toBe('connected');
    await request(app).get('/api/data').expect(401);
    await request(app).post('/api/auth/register').set('Origin', 'https://untrusted.example').send({}).expect(403);
  });

  it('validates credentials and registers with an HttpOnly session', async () => {
    await alice.post('/api/auth/register').set('Origin', origin).send({ username: 'ab', password: 'short' }).expect(400);
    const spaced = await alice.post('/api/auth/register').set('Origin', origin)
      .send({ username: 'Nirmal Raj', password: 'test-password-123' }).expect(201);
    expect(spaced.body.user.username).toBe('nirmal raj');
    await alice.delete('/api/auth/account').set('Origin', origin).expect(204);
    const response = await alice.post('/api/auth/register').set('Origin', origin)
      .send({ username: 'alice_user', password: 'test-password-123' }).expect(201);
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Strict');
    expect(response.body.token).toBeUndefined();
    expect(response.body.user.username).toBe('alice_user');
    expect(response.body.revision).toBe(0);
    await bob.post('/api/auth/register').set('Origin', origin)
      .send({ username: 'bob_user', password: 'another-test-123' }).expect(201);
  });

  it('exposes the current session', async () => {
    const me = await alice.get('/api/auth/me').expect(200);
    expect(me.body.user.username).toBe('alice_user');
  });

  it('creates and reads a period and isolates accounts', async () => {
    const created = await alice.post('/api/periods').set('Origin', origin).send({ record: period, revision: 0 }).expect(201);
    expect(created.body.state.periods).toHaveLength(1);
    expect(created.body.revision).toBe(1);
    const own = await alice.get('/api/periods').expect(200);
    expect(own.body.records[0].start).toBe('2024-02-28');
    const other = await bob.get('/api/periods').expect(200);
    expect(other.body.records).toHaveLength(0);
    await bob.put(`/api/periods/${period.id}`).set('Origin', origin).send({ record: period, revision: 0 }).expect(404);
  });

  it('rejects overlapping records, invalid dates, stale writes, and ID mismatches', async () => {
    await alice.post('/api/periods').set('Origin', origin).send({ record: { ...period, id: crypto.randomUUID() }, revision: 1 }).expect(400);
    await alice.post('/api/periods').set('Origin', origin).send({ record: { ...period, id: crypto.randomUUID(), end: '2024-02-01' }, revision: 1 }).expect(400);
    await alice.put(`/api/periods/${period.id}`).set('Origin', origin).send({ record: period, revision: 0 }).expect(409);
    await alice.put(`/api/periods/${crypto.randomUUID()}`).set('Origin', origin).send({ record: period, revision: 1 }).expect(400);
  });

  it('updates a period and persists it in the periods collection mapped by userId', async () => {
    await alice.put(`/api/periods/${period.id}`).set('Origin', origin).send({ record: { ...period, flow: 'heavy' }, revision: 1 }).expect(200);
    const user = await User.findOne({ username: 'alice_user' }).lean();
    expect(user.state).toBeUndefined();
    expect(user.hash).toBeUndefined();
    const saved = await Period.findOne({ userId: user._id, id: period.id }).lean();
    expect(saved.flow).toBe('heavy');
    expect(String(saved.userId)).toBe(String(user._id));
    const response = await alice.get('/api/data').expect(200);
    expect(response.body.revision).toBe(2);
  });

  it('provides validated symptom and journal CRUD and settings endpoints', async () => {
    const daily = { id: crypto.randomUUID(), date: '2024-03-01', symptoms: ['Fatigue'], severity: 'mild', mood: 'Calm', notes: '' };
    await alice.post('/api/daily').set('Origin', origin).send({ revision: 2, record: daily }).expect(201);
    await alice.post('/api/daily').set('Origin', origin).send({ revision: 3, record: { ...daily, id: crypto.randomUUID() } }).expect(400);
    await alice.put(`/api/daily/${daily.id}`).set('Origin', origin).send({ revision: 3, record: { ...daily, mood: 'Happy' } }).expect(200);
    const journal = { id: crypto.randomUUID(), date: '2024-03-01', symptoms: [], notes: 'Synthetic integration-test note.' };
    await alice.post('/api/journal').set('Origin', origin).send({ revision: 4, record: journal }).expect(201);
    await alice.put(`/api/journal/${journal.id}`).set('Origin', origin).send({ revision: 5, record: { ...journal, notes: 'Updated synthetic test note.' } }).expect(200);
    expect((await alice.get('/api/journal').expect(200)).body.records[0].notes).toBe('Updated synthetic test note.');
    await alice.delete(`/api/journal/${journal.id}`).set('Origin', origin).send({ revision: 6 }).expect(200);
    await alice.delete(`/api/daily/${daily.id}`).set('Origin', origin).send({ revision: 7 }).expect(200);
    await alice.put('/api/settings').set('Origin', origin).send({ revision: 8, settings: { ...emptyState().settings, name: 'Test nickname' } }).expect(200);
  });

  it('deletes a period and handles snapshot sync with optimistic concurrency', async () => {
    await alice.delete(`/api/periods/${period.id}`).set('Origin', origin).send({ revision: 9 }).expect(200);
    expect((await alice.get('/api/periods').expect(200)).body.records).toHaveLength(0);
    await alice.put('/api/data').set('Origin', origin).send({ revision: 10, state: emptyState() }).expect(200);
    await alice.put('/api/data').set('Origin', origin).send({ revision: 10, state: emptyState() }).expect(409);
  });

  it('logs out, validates login, and permanently deletes the remote account', async () => {
    await alice.post('/api/auth/logout').set('Origin', origin).expect(204);
    await alice.get('/api/data').expect(401);
    await alice.post('/api/auth/login').set('Origin', origin).send({ username: 'alice_user', password: 'incorrect-password' }).expect(401);
    await alice.post('/api/auth/login').set('Origin', origin).send({ username: 'alice_user', password: 'test-password-123' }).expect(200);
    await alice.delete('/api/auth/account').set('Origin', origin).expect(204);
    await alice.get('/api/data').expect(401);
    expect(await User.exists({ username: 'alice_user' })).toBeNull();
  });

  it('explicitly reports unavailability instead of pretending cloud writes succeeded', async () => {
    await mongoose.disconnect();
    const health = await request(app).get('/api/health').expect(200);
    expect(health.body.database).toBe('unavailable');
    const response = await bob.get('/api/data').expect(503);
    expect(response.body.error).toContain('temporarily unavailable');
  });
});
