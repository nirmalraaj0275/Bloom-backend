import mongoose from 'mongoose';

const dailySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  id: { type: String, required: true },
  date: { type: String, required: true },
  symptoms: { type: [String], default: [] },
  severity: String,
  mood: String,
  notes: { type: String, default: '' }
}, { timestamps: true, collection: 'daily' });

dailySchema.index({ userId: 1, id: 1 }, { unique: true });
dailySchema.index({ userId: 1, date: 1 }, { unique: true });

export const Daily = mongoose.model('Daily', dailySchema);
