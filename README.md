# CPSU Room Reservation System

ระบบจองห้อง ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยศิลปากร

## โครงสร้างโปรเจกต์

```
frontend/   Vite + vanilla JS UI (Clean Architecture) — เชื่อมกับ backend จริงแล้ว
backend/    Express REST API (JWT auth, business rules)
database/   Prisma schema, migrations และ seed script (MySQL)
```

แต่ละโฟลเดอร์รันแยกกัน มี `package.json` ของตัวเอง — ต้องรันทั้ง backend และ
frontend พร้อมกันถึงจะใช้งานได้ (frontend เรียก backend ที่ `http://localhost:4000`):

```bash
# terminal 1
cd backend && npm install && npm run dev

# terminal 2
cd frontend && npm install && npm run dev
```

จากนั้นเปิด `http://localhost:5173` — จะเจอหน้า login จริง (ไม่ใช่ตัวสลับ role
แบบ demo เดิมแล้ว) ล็อกอินด้วยบัญชีที่ seed ไว้ได้ที่ [backend/README.md](backend/README.md)
(ทุกบัญชีรหัสผ่าน `123456`)

- **frontend/** — Vite dev server, ต่อ API จริงผ่าน `frontend/src/infrastructure/`
  (`ApiClient`, `Api*Repository`) ดูรายละเอียดสถาปัตยกรรมใน [frontend/README ด้านล่าง](#frontend)
- **backend/** — ดูวิธีติดตั้ง/รัน API และเชื่อมต่อฐานข้อมูลที่ [backend/README.md](backend/README.md)
- **database/** — schema (`schema.prisma`) และ migration history ที่จัดการผ่าน Prisma CLI ใน `backend/`

## ระบบสิทธิ์และอนุมัติ (backend)

`backend/` ใช้ตาราง `management_positions` + `user_management_positions`
แยกสิทธิ์ "อนุมัติการจองได้" ออกจาก `role` ของผู้ใช้ — ผู้ใช้ role `teacher`
ที่ดำรงตำแหน่งบริหาร (เช่น รองหัวหน้าภาควิชา) ก็อนุมัติได้เช่นกัน ไม่ใช่ผูกกับ
role ตายตัว รายละเอียด business logic ทั้งหมด (การเช็คห้องชนกัน, auto/manual
approval, transaction, การส่งอีเมล) อยู่ในหัวข้อ "Business rules and where
they live" ของ [backend/README.md](backend/README.md)

## Frontend

Frontend เดิมเป็น demo ที่ใช้ `InMemory*Repository` (ข้อมูลปลอมในหน่วยความจำ)
และมีตัว "สลับ role" แทน login จริง — ตอนนี้เชื่อมกับ backend/database จริงแล้ว
ทั้งหมด, การเปลี่ยนแปลงหลักๆ:

- **Login จริง** — `frontend/src/presentation/views/LoginView.js` แทนที่
  `RoleSwitcher` เดิม (email/password ผ่าน JWT; ปุ่ม Google เข้าสู่ระบบมี UI
  ให้แล้วแต่ต้องตั้งค่า `GOOGLE_CLIENT_ID` ฝั่ง backend ก่อนถึงจะใช้งานได้จริง)
- **Repository layer ใหม่** — `frontend/src/infrastructure/repositories/Api*Repository.js`
  แทนที่ `InMemory*Repository` เดิม แต่ละตัว cache ผลลัพธ์ไว้ในหน่วยความจำหลัง
  fetch (`refresh()`), ให้ `getAll()`/`findById()` ยังคง synchronous เหมือนเดิม
  — ทำให้ view ส่วนใหญ่แทบไม่ต้องแก้โครงสร้างเลย แค่เพิ่ม `load()` (async) ให้
  `Router` เรียกก่อน `render()` ทุกครั้งที่เปลี่ยนหน้า
- **สิทธิ์อนุมัติ (`appState.canApprove`)** — แทนที่ role `'head'` เดิม (ซึ่งไม่มี
  ใน backend จริงแล้ว) เมนู "คิวอนุมัติ"/"ตั้งค่าการอนุมัติ" จะโผล่ในแถบเมนูของ
  role ใดก็ได้ที่ผู้ใช้คนนั้นถือตำแหน่งบริหารอยู่จริง
- **ฟีเจอร์ที่ตัดออก** — "อนุมัติทั้งหมด" (ไม่มี endpoint รองรับ), การแก้ไข
  โปรไฟล์/รหัสผ่าน, badge ตัวเลขแจ้งเตือนแบบ fake ต่อเมนู (เหลือ badge เดียวที่
  กระดิ่งบนสุด คำนวณจากจำนวน unread จริง) — หน้า วิเคราะห์ข้อมูล/รายงาน/ตั้งค่าระบบ
  ยังเป็นข้อมูลตัวอย่างคงที่เหมือนเดิม (ไม่มี backend endpoint รองรับ)
- **แดชบอร์ดดึงข้อมูลจริง** — การ์ดตัวเลขสรุป (รออนุมัติ, การจองทั้งหมด, ห้องว่าง
  ฯลฯ) คำนวณจาก database จริงผ่าน `GET /api/dashboard/stats` แล้ว (เดิมเป็น
  ตัวเลข mock ตายตัว) — เป็นแบบ fetch ตอนเปิดหน้า ไม่ใช่ live push ถ้ามีคนอื่น
  จอง/อนุมัติขณะเปิดหน้าค้างไว้ต้องรีเฟรชถึงจะเห็นตัวเลขใหม่
- **ฟอร์มจองห้องกรองเฉพาะห้องว่างจริง** — เมื่อเลือกวันที่/เวลา dropdown "เลือกห้อง"
  จะดึงเฉพาะห้องที่ไม่ชนกับการจองอื่นในช่วงเวลานั้นมาให้เลือก (`GET /api/rooms/available`)
  แทนที่จะโชว์ห้องทั้งหมดแล้วปล่อยให้ชนตอน submit

ทดสอบผ่าน browser จริงแล้ว (Playwright): login, สร้าง/อนุมัติ/ปฏิเสธการจอง,
คำขอสิ่งอำนวยความสะดวก, จัดการผู้ใช้/ห้อง, เทมเพลต, การแจ้งเตือน, คงสถานะ
login ไว้หลัง refresh หน้า — ไม่มี error ใน console
