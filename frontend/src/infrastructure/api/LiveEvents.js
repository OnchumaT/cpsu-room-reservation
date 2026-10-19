import { apiUrl } from './ApiClient.js';

// Listens to the server's real-time stream (GET /api/events, Server-Sent
// Events). Read with fetch() rather than EventSource so the JWT goes in the
// Authorization header, never in the URL. Reconnects by itself (1s, 2s, 4s…
// up to 30s) when the connection drops — a restarted server, a laptop that
// slept, a phone that switched networks.
export function startLiveEvents({ getToken, onChange }) {
  let stopped = false;
  let controller = null;
  let retryMs = 1000;

  async function connect() {
    while (!stopped) {
      const token = getToken();
      if (!token) return;
      controller = new AbortController();
      try {
        const res = await fetch(apiUrl('/events'), {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.status === 401) return; // logged out / token expired — the app handles that elsewhere
        if (!res.ok || !res.body) throw new Error(`events ${res.status}`);
        retryMs = 1000;
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const frames = buffer.split('\n\n');
          buffer = frames.pop();
          for (const frame of frames) {
            if (frame.split('\n').some((line) => line === 'event: changed')) onChange();
          }
        }
      } catch {
        if (stopped) return;
      }
      if (stopped) return;
      await new Promise((r) => setTimeout(r, retryMs));
      retryMs = Math.min(retryMs * 2, 30000);
    }
  }

  connect();
  return () => { stopped = true; controller?.abort(); };
}

// Pages refetch on this window event (see useRepository).
export const LIVE_EVENT = 'cpsu:live-change';
