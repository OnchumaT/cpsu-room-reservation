import qrcode from 'qrcode-generator';

// QR check-in at the room door. The printed QR code opens
//   <site>/?checkin=<roomId>&t=<room's secret token>
// which works whether or not the person is logged in: the pair is parked in
// sessionStorage the moment the page loads (and stripped from the address
// bar), survives the login screen, and the app opens the check-in page
// right after sign-in.
const KEY = 'cpsu_pending_checkin';

export function checkInUrl(roomId, token) {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('checkin', roomId);
  url.searchParams.set('t', token);
  return url.toString();
}

/** Inline SVG of a QR code for `text` — black on white, for printing. */
export function qrSvg(text, cellSize = 6) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize, margin: 2, scalable: true });
}

/** Called once at startup (main.jsx). */
export function captureCheckInFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('checkin');
  const token = params.get('t');
  if (!roomId || !token) return;
  try { sessionStorage.setItem(KEY, JSON.stringify({ roomId, token })); } catch { /* private mode — check-in just won't survive a login */ }
  params.delete('checkin');
  params.delete('t');
  const rest = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
}

export function hasPendingCheckIn() {
  try { return Boolean(sessionStorage.getItem(KEY)); } catch { return false; }
}

/** Returns { roomId, token } once, then forgets it. */
export function takePendingCheckIn() {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
