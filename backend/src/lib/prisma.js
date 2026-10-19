import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient instance (connection pool), reused across
// every repository. `node --watch` restarts the process on file change,
// so no dev-time singleton-on-globalThis dance is needed here.
// PRISMA_LOG_QUERIES=1 counts the SQL round trips each request makes —
// handy for spotting slow pages when the database is far away.
export const prisma = new PrismaClient(
  process.env.PRISMA_LOG_QUERIES === '1' ? { log: [{ emit: 'event', level: 'query' }] } : undefined,
);
