import { openSyncClients } from './syncClients.js';
import { SYNC_TABLES } from './tables.js';

const MAX_SAMPLE_IDS = 50;

function normalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, normalize(value[k])]));
  }
  return value;
}

function fingerprint(row, ignoreFields) {
  const kept = Object.entries(row).filter(([k]) => !ignoreFields.includes(k));
  return JSON.stringify(normalize(Object.fromEntries(kept)));
}

// Read-only on both sides: findMany only. Nothing is written.
export async function runDryRun() {
  const { source, target } = await openSyncClients();
  try {
    const tables = [];
    for (const spec of SYNC_TABLES) {
      const [sourceRows, localRows] = await Promise.all([
        source[spec.delegate].findMany(),
        target[spec.delegate].findMany(),
      ]);
      const ignoreFields = spec.ignoreFields ?? [];
      const cloudRows = spec.mask ? sourceRows.map(spec.mask) : sourceRows;

      const localById = new Map(localRows.map((r) => [String(r.id), r]));
      const cloudIds = new Set(cloudRows.map((r) => String(r.id)));

      let toAdd = 0;
      let toUpdate = 0;
      for (const row of cloudRows) {
        const local = localById.get(String(row.id));
        if (!local) toAdd += 1;
        else if (fingerprint(row, ignoreFields) !== fingerprint(local, ignoreFields)) toUpdate += 1;
      }

      const missingIds = localRows.filter((r) => !cloudIds.has(String(r.id))).map((r) => r.id);
      tables.push({
        table: spec.key,
        cloudRows: cloudRows.length,
        localRows: localRows.length,
        toAdd,
        toUpdate,
        missingInCloud: missingIds.length,
        missingIdsSample: missingIds.slice(0, MAX_SAMPLE_IDS),
      });
    }
    return { mode: 'dry-run', writes: 0, tables, generatedAt: new Date().toISOString() };
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}
