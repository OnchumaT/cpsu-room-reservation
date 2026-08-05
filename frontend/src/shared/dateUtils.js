// Local (not UTC) yyyy-mm-dd. `Date#toISOString()` converts to UTC first,
// which can land on the wrong calendar day depending on timezone/time of
// day (e.g. early-morning Bangkok time is still "yesterday" in UTC) —
// use this instead of `new Date().toISOString().slice(0, 10)` for any
// "today" comparison against booking dates.
export function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
