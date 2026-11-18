import { config } from '../config';

// Check the resolved application configuration before a write-bearing fixture imports Prisma.
const database = new URL(config.database.url);
const safeOptions = new Set(['schema', 'connection_limit', 'connect_timeout', 'pool_timeout', 'sslmode']);
if (config.server.nodeEnv === 'production' ||
    !['postgresql:', 'postgres:'].includes(database.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname.toLowerCase()) ||
    !/^\/[A-Za-z0-9_]+_test$/.test(database.pathname) ||
    [...database.searchParams.keys()].some(key => !safeOptions.has(key))) {
  throw new Error('A disposable local PostgreSQL database ending in _test with a direct loopback endpoint is required.');
}
