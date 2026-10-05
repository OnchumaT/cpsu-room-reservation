import { PrismaClient } from '@prisma/client';
import { loadSyncSourceUrl } from './syncSourceConfig.js';

// Credentials are checked against Cloud with the read-only account, so local
// copies of password hashes (which sync deliberately replaces) are never used
// to authenticate. Read-only: findUnique only.
let cloudReader = null;

export function cloudAuthReader() {
  if (!cloudReader) {
    cloudReader = new PrismaClient({ datasources: { db: { url: loadSyncSourceUrl() } } });
  }
  return cloudReader;
}

export function findCloudAuthByEmail(email) {
  return cloudAuthReader().user.findUnique({
    where: { email },
    select: { id: true, password: true, isActive: true },
  });
}
