// Records admin/staff changes in audit_logs — who did what, when — without
// touching every route: each entry below maps a write endpoint to an action
// name. Booking create/approve/reject/cancel/faculty-result and the archive
// job already log themselves inside their use cases (in the same DB
// transaction), so they're deliberately not listed here.
//
// An entry is written only after the request succeeded (status < 400).
// Passwords, Google tokens and uploaded CSV text are never stored.

const AUDITED = [
  ['POST', '/api/auth/login', 'auth.login'],
  ['POST', '/api/auth/google', 'auth.login_google'],
  ['POST', '/api/users', 'user.create'],
  ['PATCH', '/api/users/:id', 'user.update'],
  ['PATCH', '/api/users/:id/toggle', 'user.toggle'],
  ['DELETE', '/api/users/:id', 'user.delete'],
  ['POST', '/api/management-positions', 'position.create'],
  ['POST', '/api/management-positions/assign', 'position.assign'],
  ['POST', '/api/management-positions/unassign', 'position.unassign'],
  ['POST', '/api/rooms', 'room.create'],
  ['PATCH', '/api/rooms/:id', 'room.update'],
  ['PATCH', '/api/rooms/:id/toggle', 'room.toggle'],
  ['DELETE', '/api/rooms/:id', 'room.delete'],
  ['POST', '/api/buildings', 'building.create'],
  ['DELETE', '/api/buildings/:id', 'building.delete'],
  ['PATCH', '/api/equipment/:key', 'equipment.update'],
  ['POST', '/api/facility-requests/:id/accept', 'facility.accept'],
  ['POST', '/api/facility-requests/:id/done', 'facility.done'],
  ['POST', '/api/facility-requests/:id/not-done', 'facility.not_done'],
  ['POST', '/api/holidays', 'holiday.create'],
  ['DELETE', '/api/holidays/:id', 'holiday.delete'],
  ['PATCH', '/api/settings/approval', 'settings.approval_mode'],
  ['PATCH', '/api/settings/advance-days', 'settings.advance_days'],
  ['PATCH', '/api/settings/retention-days', 'settings.retention_days'],
  ['PATCH', '/api/settings/toggles', 'settings.toggles'],
  ['PATCH', '/api/settings/check-in-grace', 'settings.check_in_grace'],
  ['POST', '/api/timetable/import', 'timetable.import'],
  ['PATCH', '/api/bookings/:id', 'booking.edit'],
  ['POST', '/api/sync/run', 'sync.run'],
].map(([method, pattern, action]) => {
  const names = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; })}$`);
  return { method, re, names, action };
});

const SECRET_FIELDS = new Set(['password', 'idToken', 'csv', 'token']);

function matchAudited(method, path) {
  for (const r of AUDITED) {
    if (r.method !== method) continue;
    const m = r.re.exec(path);
    if (m) return { action: r.action, params: Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

function safeBody(body) {
  if (!body || typeof body !== 'object') return {};
  return Object.fromEntries(Object.entries(body)
    .filter(([k]) => !SECRET_FIELDS.has(k))
    .map(([k, v]) => [k, typeof v === 'string' && v.length > 200 ? `${v.slice(0, 200)}…` : v]));
}

// What a deleted record was, looked up before it's gone, so the log can say
// "ลบผู้ใช้ สมชาย" rather than just an id.
async function describeTarget(action, params, repositories) {
  try {
    if (action === 'user.delete' || action === 'user.toggle' || action === 'user.update') {
      const u = await repositories.userRepository.findById(params.id);
      return u ? { targetName: u.name, targetEmail: u.email } : {};
    }
    if (action === 'holiday.delete') {
      const h = (await repositories.holidayRepository.getAll()).find((x) => String(x.id) === String(params.id));
      return h ? { targetName: h.name, date: h.date } : {};
    }
    if (action === 'building.delete') {
      const b = await repositories.buildingRepository.findById(params.id);
      return b ? { targetName: b.name } : {};
    }
  } catch { /* best effort — the log still records the id */ }
  return {};
}

export function auditTrail(repositories) {
  return async (req, res, next) => {
    const path = req.originalUrl.split('?')[0];
    const hit = matchAudited(req.method, path);
    if (!hit) return next();

    const before = await describeTarget(hit.action, hit.params, repositories);
    let responseBody;
    const originalJson = res.json.bind(res);
    res.json = (body) => { responseBody = body; return originalJson(body); };

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      // Logins have no req.user yet — the account comes from the response.
      const userId = req.user?.id ?? responseBody?.user?.id ?? null;
      const details = { ...hit.params, ...before, ...safeBody(req.body) };
      if (hit.action === 'timetable.import' && responseBody) {
        Object.assign(details, { addedCount: responseBody.addedCount, updatedCount: responseBody.updatedCount, removedCount: responseBody.removedCount });
      }
      repositories.auditLogRepository.create({ userId, action: hit.action, details })
        .catch((err) => console.error('[audit] write failed:', err.message));
    });
    return next();
  };
}
