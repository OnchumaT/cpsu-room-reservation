export const BOOKINGS_SEED = [
  // อาจารย์
  { id: 'BK001', room: '1637', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'สอนวิชา CS301', date: '2025-06-02', time: '09:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK003', room: '1639', user: 'อ.วรรณา สุขใจ', title: 'ปฏิบัติการ AI Lab', date: '2025-06-02', time: '13:00-16:00', status: 'approved', role: 'teacher' },
  { id: 'BK004', room: '1637', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'สอบปลายภาค CS301', date: '2025-06-05', time: '09:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK006', room: '1638', user: 'อ.วรรณา สุขใจ', title: 'สัมมนาวิชาการ', date: '2025-06-09', time: '09:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK008', room: '1637', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'ประชุม Department', date: '2025-06-12', time: '10:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK010', room: '1641', user: 'อ.วรรณา สุขใจ', title: 'สอนวิชา CS401', date: '2025-06-23', time: '09:00-12:00', status: 'approved', role: 'teacher' },
  { id: 'BK011', room: '1637', user: 'ผศ.ดร.สมชาย วงศ์ดี', title: 'ปัจฉิมนิเทศ', date: '2025-06-26', time: '13:00-16:00', status: 'approved', role: 'teacher' },
  // นักศึกษา — มี approved, pending, rejected, cancelled ครบ
  { id: 'BK002', room: '1638', user: 'นายพงศ์ธร มีสุข', title: 'ประชุมกลุ่มโปรเจกต์', date: '2025-06-02', time: '10:00-12:00', status: 'approved', role: 'student' },
  { id: 'BK015', room: '1641', user: 'นายพงศ์ธร มีสุข', title: 'เรียนพิเศษก่อนสอบ', date: '2025-06-04', time: '13:00-15:00', status: 'approved', role: 'student' },
  { id: 'BK016', room: '1639', user: 'น.ส.กมลชนก จริงจิต', title: 'ซ้อมนำเสนองาน', date: '2025-06-05', time: '13:00-16:00', status: 'approved', role: 'student' },
  { id: 'BK005', room: '1640', user: 'น.ส.กมลชนก จริงจิต', title: 'ฝึกนำเสนองาน', date: '2025-06-05', time: '09:00-11:00', status: 'pending', role: 'student' },
  { id: 'BK007', room: '1641', user: 'นายธีรภัทร ดีงาม', title: 'โปรเจกต์ IT Club', date: '2025-06-09', time: '13:00-16:00', status: 'pending', role: 'student' },
  { id: 'BK012', room: '1638', user: 'น.ส.กมลชนก จริงจิต', title: 'โปรเจกต์ Senior', date: '2025-06-26', time: '09:00-12:00', status: 'pending', role: 'student' },
  { id: 'BK014', room: '1641', user: 'นายธีรภัทร ดีงาม', title: 'โปรเจกต์กลุ่ม', date: '2025-06-10', time: '09:00-11:00', status: 'pending', role: 'student' },
  { id: 'BK009', room: '1639', user: 'นายพงศ์ธร มีสุข', title: 'เรียนพิเศษ', date: '2025-06-17', time: '14:00-17:00', status: 'rejected', role: 'student' },
  { id: 'BK013', room: '1640', user: 'นายพงศ์ธร มีสุข', title: 'ฝึกนำเสนองาน', date: '2025-06-03', time: '14:00-16:00', status: 'cancelled', role: 'student' },
];
