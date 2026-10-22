import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { config } from './config/env.js';

await connectDatabase(config.mongoUri);
const server = createApp(config).listen(config.port, () => console.info(`BloomCycle API listening on port ${config.port}.`));
async function shutdown() {
  server.close(async () => { await disconnectDatabase(); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
