// Real-time "something changed" signal, delivered by long polling.
//
// Every open browser tab keeps one request waiting on
// GET /api/events/wait?v=<last version it saw>. The server answers it the
// moment data changes (any successful write request, or a background job
// run) — or after 25 s with nothing new — and the tab immediately sends the
// next one. On a change the tab re-fetches what it shows (bell count, the
// page in view).
//
// Why not Server-Sent Events: a held-open stream gets buffered by some
// proxies — Cloudflare quick tunnels (trycloudflare.com) hold the whole
// stream back, so nothing ever arrives. Each long-poll is an ordinary
// request that completes, so it passes through any proxy or tunnel.
//
// The answer carries no data on purpose: what a user may see is still decided
// by the normal API calls and their permission checks.

const WAIT_MS = 25 * 1000; // well under proxy idle limits (Cloudflare: 100 s)

let version = Date.now(); // starts high so a restarted server never repeats an old number
const waiters = new Set();

function answer(res) {
  if (!res.headersSent) res.json({ v: version });
}

export function waitForChangeRoute(req, res) {
  res.set('Cache-Control', 'no-store');
  const seen = Number(req.query.v);
  // First call (no version yet), or something changed since → answer at once.
  if (!Number.isFinite(seen) || seen !== version) return answer(res);

  const waiter = { res, timer: setTimeout(() => { waiters.delete(waiter); answer(res); }, WAIT_MS) };
  waiters.add(waiter);
  req.on('close', () => { clearTimeout(waiter.timer); waiters.delete(waiter); });
  return undefined;
}

export function broadcastChange() {
  version += 1;
  for (const waiter of waiters) {
    clearTimeout(waiter.timer);
    answer(waiter.res);
  }
  waiters.clear();
}

// After any successful write request, wake every waiting tab.
// Runs on 'finish' — i.e. after the use case's transaction committed — so a
// tab that refetches straight away already sees the new data.
const SKIP = [/^\/api\/auth\//, /^\/api\/events/, /^\/api\/timetable\/preview/];
export function broadcastOnWrite(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  const path = req.originalUrl.split('?')[0];
  if (SKIP.some((re) => re.test(path))) return next();
  res.on('finish', () => { if (res.statusCode < 400) broadcastChange(); });
  return next();
}
