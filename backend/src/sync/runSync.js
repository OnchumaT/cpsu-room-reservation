import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { openSyncClients } from './syncClients.js';
import { SYNC_TABLES } from './tables.js';
import { recordRun } from './syncState.js';

const MAX_SAMPLE_IDS = 50;

// Reads Cloud (findMany only) and writes the verified local target only.
// Rows missing from Cloud are kept and reported, never deleted. Any failure
// rolls back every local write in the transaction.
export async function runSync() {
  const startedAt = new Date().toISOString();
  const { source, target } = await openSyncClients({ requireLocalBackend: true });
  const unusablePasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const ctx = { unusablePasswordHash };

  try {
    const plan = [];
    for (const spec of SYNC_TABLES) {
      const sourceRows = await source[spec.delegate].findMany();
      const rows = sourceRows.map((r) => {
        const masked = spec.mask ? spec.mask(r) : r;
        return spec.prepare ? spec.prepare(masked, ctx) : masked;
      });
      const localRows = await target[spec.delegate].findMany({ select: { id: true } });
      const cloudIds = new Set(rows.map((r) => String(r.id)));
      const localIds = new Set(localRows.map((r) => String(r.id)));
      plan.push({
        spec,
        rows,
        upserted: 0,
        inserted: rows.filter((r) => !localIds.has(String(r.id))).length,
        missingIds: localRows.filter((r) => !cloudIds.has(String(r.id))).map((r) => r.id),
      });
    }

    await target.$transaction(async (tx) => {
      for (const step of plan) {
        for (const row of step.rows) {
          await tx[step.spec.delegate].upsert({ where: { id: row.id }, create: row, update: row });
          step.upserted += 1;
        }
      }
    }, { timeout: 300_000, maxWait: 10_000 });

    const tables = plan.map((s) => ({
      table: s.spec.key,
      cloudRows: s.rows.length,
      upserted: s.upserted,
      inserted: s.inserted,
      missingInCloud: s.missingIds.length,
      missingIdsSample: s.missingIds.slice(0, MAX_SAMPLE_IDS),
    }));
    const entry = { status: 'success', startedAt, finishedAt: new Date().toISOString(), tables };
    await recordRun(entry);
    return entry;
  } catch (err) {
    const entry = { status: 'failed', startedAt, finishedAt: new Date().toISOString(), error: String(err.message).slice(0, 500) };
    await recordRun(entry);
    throw err;
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}
