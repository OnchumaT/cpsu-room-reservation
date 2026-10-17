// Number of people attending a booking (or saved in a template) — a whole
// number of at least 1. null/undefined means "not given" (callers default it).
export function isValidParticipants(n) {
  return n == null || (Number.isInteger(Number(n)) && Number(n) >= 1);
}
