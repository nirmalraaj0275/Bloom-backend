import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  id: { type: String, required: true },
  start: { type: String, required: true },
  end: String,
  flow: String,
  cramps: String,
  symptoms: { type: [String], default: [] },
  mood: String,
  notes: { type: String, default: '' }
}, { timestamps: true, collection: 'periods' });

periodSchema.index({ userId: 1, id: 1 }, { unique: true });

export const Period = mongoose.model('Period', periodSchema);
