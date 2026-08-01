// Booking dates are generated relative to today (instead of a frozen
// historical month) so the dashboard calendar and history list always
// show demo data near the current date. Offset 0 is anchored 10 days
// before today, keeping the original spread as a mix of past and
// upcoming bookings. Bookings still "pending" must land on a future
// offset (>10) — a request can't realistically still be awaiting
// approval for a date that has already passed.
function relDate(daysFromAnchor) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromAnchor - 10);
  return d.toISOString().slice(0, 10);
}

// All demo bookings are authored by teachers (ผศ.ดร.สมชาย วงศ์ดี / อ.วรรณา
// สุขใจ) — sample data intentionally has no student-authored bookings.
export const BOOKINGS_SEED = [
  { id: 'BK001', room: '1637', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'สอนวิชา CS301', date: relDate(0), time: '09:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK003', room: '1639', user: 'อ.วรรณา สุขใจ', title: 'ปฏิบัติการ AI Lab', date: relDate(0), time: '13:00-16:00', status: 'approved', role: 'teacher' },
  { id: 'BK004', room: '1637', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'สอบปลายภาค CS301', date: relDate(3), time: '09:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK006', room: '1638', user: 'อ.วรรณา สุขใจ', title: 'สัมมนาวิชาการ', date: relDate(7), time: '09:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK008', room: '1637', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'ประชุม Department', date: relDate(10), time: '10:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK010', room: '1641', user: 'อ.วรรณา สุขใจ', title: 'สอนวิชา CS401', date: relDate(21), time: '09:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK011', room: '1637', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'ปัจฉิมนิเทศ', date: relDate(24), time: '13:00-16:00', status: 'approved', role: 'teacher' },
  { id: 'BK002', room: '1638', user: 'อ.วรรณา สุขใจ', title: 'ประชุมกลุ่มงานวิจัย', date: relDate(0), time: '10:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK015', room: '1641', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'สอนเสริมก่อนสอบ', date: relDate(2), time: '13:00-15:00', status: 'approved', role: 'teacher' },
  { id: 'BK016', room: '1639', user: 'อ.วรรณา สุขใจ', title: 'ซ้อมนำเสนองานวิจัย', date: relDate(3), time: '13:00-16:00', status: 'approved', role: 'teacher' },
  { id: 'BK005', room: '1640', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'ปฏิบัติการ', date: relDate(13), time: '09:00-11:00', status: 'pending', role: 'teacher' },
  { id: 'BK007', room: '1641', user: 'อ.วรรณา สุขใจ', title: 'ประชุมกลุ่ม', date: relDate(17), time: '13:00-16:00', status: 'pending', role: 'teacher' },
  { id: 'BK012', room: '1638', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'จัดสอบโครงงานปริญญานิพนธ์', date: relDate(24), time: '09:00-12:00', status: 'pending', role: 'teacher' },
  { id: 'BK014', room: '1641', user: 'อ.วรรณา สุขใจ', title: 'ประชุมกลุ่ม', date: relDate(20), time: '09:00-11:00', status: 'pending', role: 'teacher' },
  { id: 'BK009', room: '1639', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'สอน/บรรยาย', date: relDate(15), time: '14:00-17:00', status: 'rejected', role: 'teacher' },
  { id: 'BK013', room: '1640', user: 'อ.วรรณา สุขใจ', title: 'ปฏิบัติการ', date: relDate(1), time: '14:00-16:00', status: 'cancelled', role: 'teacher' },
];
