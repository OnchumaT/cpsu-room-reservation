// A reject reason is shown to the requester, so it must say something:
// at least 2 letters (Thai or English). Punctuation, digits or spaces alone
// (e.g. ".") are refused. Letters may still be mixed with them ("ห้องไม่ว่าง 2 ชม.").
const LETTER = /[ก-ฮะ-๎a-zA-Z]/g;
export const REJECT_REASON_HINT = 'เหตุผลต้องเป็นข้อความ (มีตัวอักษรอย่างน้อย 2 ตัว) ไม่ใช่แค่จุดหรือสัญลักษณ์';

export function isValidRejectReason(reason) {
  return (String(reason ?? '').match(LETTER) || []).length >= 2;
}
