import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import {
  loadSyncSourceUrl,
  loadSyncTargetUrl,
  assertBackendIsLocal,
  ALLOWED_TARGET_DB,
} from './syncSourceConfig.js';

// Every check runs before any transaction is opened. Any failure closes
// both clients and throws, so nothing is written.
export async function openSyncClients({ requireLocalBackend = false } = {}) {
  const sourceUrl = loadSyncSourceUrl();
  const targetUrl = loadSyncTargetUrl();
  if (requireLocalBackend) assertBackendIsLocal(env.databaseUrl);

  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });
  try {
    const [row] = await target.$queryRaw`SELECT DATABASE() AS db`;
    if (row?.db !== ALLOWED_TARGET_DB) {
      throw AppError.forbidden('Sync target did not confirm the expected local database; refusing');
    }
    return { source, target };
  } catch (err) {
    await source.$disconnect();
    await target.$disconnect();
    throw err;
  }
}
