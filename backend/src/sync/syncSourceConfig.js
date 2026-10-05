import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { AppError } from '../utils/AppError.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SYNC_ENV_PATH = path.resolve(here, '../../.env.sync.local');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const ALLOWED_TARGET_DB = 'cpsu_room_reservation';

function readSyncEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    throw AppError.badRequest('Sync is not configured (backend/.env.sync.local is missing)');
  }
  return dotenv.parse(fs.readFileSync(envPath));
}

export function loadSyncSourceUrl(envPath = SYNC_ENV_PATH) {
  const url = readSyncEnv(envPath)['SYNC_SOURCE_DATABASE_URL'];
  if (!url) throw AppError.badRequest('SYNC_SOURCE_DATABASE_URL is not set in backend/.env.sync.local');
  if (new URL(url).username === 'avnadmin') {
    throw AppError.forbidden('Sync source must use the read-only account, not the owner account');
  }
  return url;
}

// No fallback: if the target is missing or not a permitted local database, sync refuses.
export function loadSyncTargetUrl(envPath = SYNC_ENV_PATH) {
  const url = readSyncEnv(envPath)['SYNC_TARGET_DATABASE_URL'];
  if (!url) throw AppError.badRequest('SYNC_TARGET_DATABASE_URL is not set; sync will not guess a target');
  const parsed = new URL(url);
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw AppError.forbidden('Sync target must be a local database host');
  }
  if (parsed.pathname.slice(1) !== ALLOWED_TARGET_DB) {
    throw AppError.forbidden(`Sync target must be the ${ALLOWED_TARGET_DB} database`);
  }
  return url;
}

export function assertBackendIsLocal(databaseUrl) {
  const host = new URL(databaseUrl).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw AppError.forbidden('Sync can only run from a backend whose own database is local (refusing: this backend points at a non-local database)');
  }
}

export { ALLOWED_TARGET_DB };

export function isLocalDatabase(databaseUrl) {
  return LOCAL_HOSTS.has(new URL(databaseUrl).hostname);
}
