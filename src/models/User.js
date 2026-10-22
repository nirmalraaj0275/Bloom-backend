import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 32
  },
  salt: { type: String, required: true, select: false },
  hash: { type: String, required: true, select: false },
  revision: { type: Number, required: true, default: 0 }
}, { timestamps: true, collection: 'Users' });

export const User = mongoose.model('User', userSchema);
