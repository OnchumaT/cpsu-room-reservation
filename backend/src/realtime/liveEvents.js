// Real-time "something changed" signal over Server-Sent Events (SSE).
//
// Every open browser tab keeps one GET /api/events stream open. When any
// request changes data (a booking, an approval, a notification read…), or a
// background job runs, the server sends a tiny `changed` event to every tab;
// each tab then re-fetches what it shows (bell count, the page in view).
// The event carries no data on purpose: what a user may see is still decided
// by the normal API calls and their permission checks.

const clients = new Set();
const PING_MS = 25 * 1000; // keeps proxies/tunnels (e.g. Cloudflare) from closing an idle stream

export function liveEventsRoute(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), PING_MS);
  req.on('close', () => { clearInterval(ping); clients.delete(res); });
}

export function broadcastChange(reason = 'change') {
  const frame = `event: changed\ndata: ${JSON.stringify({ reason, at: Date.now() })}\n\n`;
  for (const res of clients) res.write(frame);
}

// After any successful write request, tell every open tab to refresh.
// Runs on 'finish' — i.e. after the use case's transaction committed — so a
// tab that refetches straight away already sees the new data.
const SKIP = [/^\/api\/auth\//, /^\/api\/events/, /^\/api\/timetable\/preview/];
export function broadcastOnWrite(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  const path = req.originalUrl.split('?')[0];
  if (SKIP.some((re) => re.test(path))) return next();
  res.on('finish', () => { if (res.statusCode < 400) broadcastChange(`${req.method} ${path}`); });
  return next();
}

export function liveClientCount() {
  return clients.size;
}
