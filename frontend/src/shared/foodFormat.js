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

// The booker picks each item's category, stored as a readable prefix
// ("อาหารกลางวัน: ข้าวมันไก่ จำนวน 4") so every page shows it and no
// schema change is needed. The student room-request form puts each on its
// own line; items saved before the picker have no prefix.
export const FOOD_CATEGORIES = ['อาหารว่าง/เครื่องดื่ม', 'อาหารกลางวัน'];

export function withFoodCategory(category, label) {
  return `${category}: ${label}`;
}

/** "อาหารกลางวัน: ข้าวมันไก่" → { category: 'อาหารกลางวัน', item: 'ข้าวมันไก่' }; no prefix → category null. */
export function splitFoodCategory(entry) {
  const text = formatFoodItem(entry);
  const category = FOOD_CATEGORIES.find((c) => text.startsWith(`${c}: `));
  return category ? { category, item: text.slice(category.length + 2) } : { category: null, item: text };
}
