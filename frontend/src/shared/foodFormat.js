// Food/drink items are stored as plain text, e.g. "ข้าวผัด จำนวน 4".
// Items saved before that wording used "ข้าวผัด ×4" — rewritten on read so
// every page and PDF shows one format, without touching stored rows.
export function formatFoodItem(item) {
  return String(item ?? '').replace(/\s*×\s*(\d+)\s*$/, ' จำนวน $1');
}

/** "ข้าวผัด" + 4 → "ข้าวผัด จำนวน 4"; a single item is just its name. */
export function foodLabel(name, qty) {
  return qty > 1 ? `${name} จำนวน ${qty}` : name;
}
