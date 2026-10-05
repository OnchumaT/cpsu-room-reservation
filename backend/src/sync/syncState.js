import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SYNC_DIR = path.resolve(here, '../../.sync');
export const STATE_PATH = path.join(SYNC_DIR, 'state.json');
const MAX_RUNS_KEPT = 50;

export async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return { lastRun: null, runs: [] };
    throw err;
  }
}

// Write-to-temp then rename, so a crash mid-write never leaves a half-written state file.
export async function recordRun(entry) {
  const state = await readState();
  state.lastRun = entry;
  state.runs = [entry, ...state.runs].slice(0, MAX_RUNS_KEPT);
  await fs.mkdir(SYNC_DIR, { recursive: true });
  const tmp = `${STATE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, STATE_PATH);
}
