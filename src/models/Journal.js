import mongoose from 'mongoose';

const journalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  id: { type: String, required: true },
  date: { type: String, required: true },
  mood: String,
  symptoms: { type: [String], default: [] },
  notes: { type: String, required: true }
}, { timestamps: true, collection: 'journal' });

journalSchema.index({ userId: 1, id: 1 }, { unique: true });

export const Journal = mongoose.model('Journal', journalSchema);
