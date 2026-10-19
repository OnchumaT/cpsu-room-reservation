import { apiUrl } from './ApiClient.js';

// Real-time "something changed" signal from the server, by long polling:
// one request at a time waits on GET /api/events/wait?v=<version>; the
// server answers the moment data changes (or after 25 s with nothing new),
// and the next request goes out straight away. Works through any proxy or
// tunnel (see backend/src/realtime/liveEvents.js for why not SSE).
// The JWT goes in the Authorization header, never in the URL. On an error
// (server restarting, laptop asleep, network switch) it retries after 1s, 2s,
// 4s… up to 30s.
export function startLiveEvents({ getToken, onChange }) {
  let stopped = false;
  let controller = null;
  let version = null;
  let retryMs = 1000;

  async function loop() {
    while (!stopped) {
      const token = getToken();
      if (!token) return;
      controller = new AbortController();
      try {
        const res = await fetch(apiUrl(`/events/wait${version === null ? '' : `?v=${version}`}`), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.status === 401) return; // logged out / token expired — the app handles that elsewhere
        if (!res.ok) throw new Error(`events ${res.status}`);
        const { v } = await res.json();
        if (version !== null && v !== version) onChange();
        version = v;
        retryMs = 1000;
      } catch {
        if (stopped) return;
        await new Promise((r) => setTimeout(r, retryMs));
        retryMs = Math.min(retryMs * 2, 30000);
      }
    }
  }

  loop();
  return () => { stopped = true; controller?.abort(); };
}

// Pages refetch on this window event (see useRepository).
export const LIVE_EVENT = 'cpsu:live-change';
