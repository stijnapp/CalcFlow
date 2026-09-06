import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { openStore } from './db.js';

const config = (() => {
  try {
    return readConfig();
  } catch (err) {
    console.error(`CalcFlow server: ${(err as Error).message}`);
    process.exit(1);
  }
})();

const store = openStore(config.dbPath);
const app = await buildApp({ config, store });

// SQLite wants closing: WAL is checkpointed on the way out, which is the
// difference between a clean file and one that needs recovering next boot.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => {
      store.close();
      process.exit(0);
    });
  });
}

await app.listen({ host: config.host, port: config.port });
app.log.info(
  { db: config.dbPath, web: config.webRoot ?? 'api only', attempts: store.count() },
  'CalcFlow server ready',
);
