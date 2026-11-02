'use strict';

const { Pool } = require('pg');
const { loadConfig } = require('./config');
const { createApp } = require('./app');
const { createPgRepository } = require('./repository');

const config = loadConfig();
const pool = new Pool(config.db);
pool.on('error', (err) => console.error(`postgres pool error: ${err.message}`));

const app = createApp({ repo: createPgRepository(pool), appName: config.appName });
const server = app.listen(config.port, () => {
  console.log(`${config.appName} API listening on port ${config.port}`);
});

// Graceful shutdown so `docker compose stop` drains connections cleanly.
function shutdown(signal) {
  console.log(`received ${signal}, shutting down`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
