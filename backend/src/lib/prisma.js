import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient instance (connection pool), reused across
// every repository. `node --watch` restarts the process on file change,
// so no dev-time singleton-on-globalThis dance is needed here.
export const prisma = new PrismaClient();
