import mongoose from 'mongoose';
import { emptyState, stateSchema } from '../lib/cycle.js';
import { User } from '../models/User.js';
import { Settings } from '../models/Settings.js';
import { Period } from '../models/Period.js';
import { Daily } from '../models/Daily.js';
import { Journal } from '../models/Journal.js';
import { ApiError } from '../utils/ApiError.js';

function stripRecord(doc) {
  if (!doc) return null;
  const { userId: _userId, _id, __v, createdAt, updatedAt, ...record } = doc;
  return record;
}

function settingsFromDoc(doc) {
  if (!doc) return emptyState().settings;
  const { userId: _userId, _id, __v, createdAt, updatedAt, ...settings } = doc;
  return settings;
}

async function migrateLegacyEmbeddedState(userId) {
  const raw = await User.collection.findOne({ _id: new mongoose.Types.ObjectId(String(userId)) });
  if (!raw?.state) return false;

  const validated = stateSchema.parse(raw.state);
  await writeState(userId, validated);
  await User.collection.updateOne({ _id: raw._id }, { $unset: { state: '' } });
  return true;
}

export async function getTrackingData(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new ApiError(404, 'Account not found.');

  let [settingsDoc, periods, daily, journal] = await Promise.all([
    Settings.findOne({ userId }).lean(),
    Period.find({ userId }).lean(),
    Daily.find({ userId }).lean(),
    Journal.find({ userId }).lean()
  ]);

  if (!settingsDoc && !periods.length && !daily.length && !journal.length) {
    const migrated = await migrateLegacyEmbeddedState(userId);
    if (migrated) {
      [settingsDoc, periods, daily, journal] = await Promise.all([
        Settings.findOne({ userId }).lean(),
        Period.find({ userId }).lean(),
        Daily.find({ userId }).lean(),
        Journal.find({ userId }).lean()
      ]);
    }
  }

  const state = stateSchema.parse({
    settings: settingsFromDoc(settingsDoc),
    periods: periods.map(stripRecord),
    daily: daily.map(stripRecord),
    journal: journal.map(stripRecord)
  });

  return { state, revision: user.revision };
}

async function writeState(userId, validated, session) {
  await Settings.findOneAndUpdate(
    { userId },
    { $set: { ...validated.settings, userId } },
    { upsert: true, session, new: true, setDefaultsOnInsert: true }
  );

  await Promise.all([
    Period.deleteMany({ userId }, { session }),
    Daily.deleteMany({ userId }, { session }),
    Journal.deleteMany({ userId }, { session })
  ]);

  if (validated.periods.length) {
    await Period.insertMany(validated.periods.map(record => ({ ...record, userId })), { session });
  }
  if (validated.daily.length) {
    await Daily.insertMany(validated.daily.map(record => ({ ...record, userId })), { session });
  }
  if (validated.journal.length) {
    await Journal.insertMany(validated.journal.map(record => ({ ...record, userId })), { session });
  }
}

export async function replaceTrackingData(userId, state, revision) {
  const validated = stateSchema.parse(state);
  const session = await mongoose.startSession();

  try {
    let nextRevision;
    await session.withTransaction(async () => {
      const user = await User.findOneAndUpdate(
        { _id: userId, revision },
        { $inc: { revision: 1 } },
        { new: true, session }
      ).lean();

      if (!user) {
        throw new ApiError(
          409,
          'Your data was updated elsewhere. Refresh the page, then try saving again.'
        );
      }

      await writeState(userId, validated, session);
      nextRevision = user.revision;
    });

    return { state: validated, revision: nextRevision };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.code === 11000) throw new ApiError(409, 'A conflicting record already exists for this account.');
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function mutateTrackingData(userId, revision, mutate) {
  const current = await getTrackingData(userId);
  if (current.revision !== revision) {
    throw new ApiError(409, 'Data changed. Reload before saving your changes.');
  }
  return replaceTrackingData(userId, mutate(current.state), revision);
}

export async function deleteUserData(userId) {
  await Promise.all([
    Settings.deleteMany({ userId }),
    Period.deleteMany({ userId }),
    Daily.deleteMany({ userId }),
    Journal.deleteMany({ userId })
  ]);
}
