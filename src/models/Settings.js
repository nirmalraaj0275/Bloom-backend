import mongoose from 'mongoose';
import { emptyState } from '../lib/cycle.js';

const remindersSchema = new mongoose.Schema({
  period: Boolean,
  daily: Boolean,
  custom: Boolean,
  customText: String,
  time: String,
  daysBefore: Number
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  name: { type: String, default: '' },
  cycleLength: { type: Number, default: 28 },
  periodLength: { type: Number, default: 5 },
  theme: { type: String, default: 'light' },
  onboarded: { type: Boolean, default: false },
  reminders: { type: remindersSchema, default: () => emptyState().settings.reminders }
}, { timestamps: true, collection: 'settings' });

export const Settings = mongoose.model('Settings', settingsSchema);
