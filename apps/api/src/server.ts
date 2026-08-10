import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './config/mongo.js';

async function main(): Promise<void> {
  const config = env();

  await connectMongo();

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`[api] finora-api listening on http://localhost:${config.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[api] received ${signal}, shutting down...`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[api] fatal startup error:', error);
  process.exit(1);
});