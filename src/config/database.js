import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);
export async function connectDatabase(uri) {
  if (!uri) {
    console.info('MONGODB_URI is not set. Cloud endpoints are disabled; local-only mode is available.');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.info('MongoDB connected.');
  } catch (error) {
    const reason = error?.message?.includes('bad auth') || error?.codeName === 'AuthenticationFailed'
      ? 'Authentication failed. Check the Atlas username and URL-encoded password in backend/.env.'
      : 'Check configuration, network access (Atlas IP allowlist), and availability.';
    console.error(`MongoDB connection failed. ${reason} Local-only mode is still available.`);
  }
}
export const disconnectDatabase = () => mongoose.disconnect();
