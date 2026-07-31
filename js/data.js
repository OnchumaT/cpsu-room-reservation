const MONTHS=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const DAYS=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

const IC={
  home:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  search:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  cal:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  list:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  tool:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
  bell:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  user:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  check:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
  box:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
  chart:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  file:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  users:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  bldg:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
  monitor:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  gear:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  mic:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  proj:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  wb:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2"/><line x1="7" y1="21" x2="17" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  plug:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"/><path d="M8.5 2l5 5-4.5 4.5-5-5z"/><path d="M15.5 22l-5-5 4.5-4.5 5 5z"/></svg>`,
  hdmi:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><polyline points="7 12 10 9 10 15"/><line x1="13" y1="12" x2="17" y2="12"/></svg>`,
  laser:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/></svg>`,
  plus:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  clock:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  ok:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  door:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M9 21V9h6v12"/></svg>`,
  bookmark:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>`,
};

const TEMPLATES={teacher:[],student:[],head:[]};

let state={role:'teacher',page:'dashboard',sbCol:false,calDate:new Date(2025,5,1),selDate:null,filterStatus:'all',approvalMode:'manual'};

const ROLE_INFO={
  teacher:{name:'ผศ.ดร.สมชาย วงศ์ดี',short:'อ',avBg:'#EEF0FF',avC:'#38419D',label:'อาจารย์',nb:2},
  student:{name:'นายพงศ์ธร มีสุข',short:'น',avBg:'#DBEAFE',avC:'#1e40af',label:'นักศึกษา',nb:1},
  staff:{name:'น.ส.วิภา สมใจ',short:'จ',avBg:'#dcfce7',avC:'#166534',label:'เจ้าหน้าที่',nb:2},
  admin:{name:'นายอนุวัฒน์ ดีมาก',short:'ผ',avBg:'#FEF3C7',avC:'#92400e',label:'ผู้ดูแลระบบ',nb:5},
  head:{name:'รศ.ดร.สุรเดช ปัญญาวัฒน์',short:'ห',avBg:'#F3E8FF',avC:'#6b21a8',label:'หัวหน้าภาควิชา',nb:2},
};
const MENUS={
  teacher:[{sec:'หลัก'},{key:'dashboard',label:'แดชบอร์ด',ic:'home'},{key:'rooms',label:'ค้นหาห้อง',ic:'bldg'},{key:'book',label:'จองห้อง',ic:'cal'},{key:'templates',label:'เทมเพลตการจอง',ic:'bookmark'},{key:'history',label:'ประวัติการจอง',ic:'list'},{sec:'อื่นๆ'},{key:'notifications',label:'การแจ้งเตือน',ic:'bell',badge:2},{key:'profile',label:'โปรไฟล์',ic:'user'}],
  student:[{sec:'หลัก'},{key:'dashboard',label:'แดชบอร์ด',ic:'home'},{key:'rooms',label:'ค้นหาห้อง',ic:'bldg'},{key:'book',label:'จองห้อง',ic:'cal'},{key:'templates',label:'เทมเพลตการจอง',ic:'bookmark'},{key:'history',label:'ประวัติการจอง',ic:'list'},{sec:'อื่นๆ'},{key:'notifications',label:'การแจ้งเตือน',ic:'bell',badge:1},{key:'profile',label:'โปรไฟล์',ic:'user'}],
  staff:[{sec:'หลัก'},{key:'dashboard',label:'แดชบอร์ด',ic:'home'},{key:'reservations',label:'จัดการการจอง',ic:'list'},{sec:'คำขอ'},{key:'facilityqueue',label:'คำขอสิ่งอำนวยความสะดวก',ic:'box',badge:3},{sec:'อื่นๆ'},{key:'notifications',label:'การแจ้งเตือน',ic:'bell',badge:2},{key:'reports',label:'รายงาน',ic:'chart'}],
  admin:[{sec:'หลัก'},{key:'dashboard',label:'แดชบอร์ด',ic:'home'},{sec:'จัดการ'},{key:'users',label:'จัดการผู้ใช้',ic:'users'},{key:'managerooms',label:'จัดการห้อง',ic:'bldg'},{key:'equipment',label:'จัดการอุปกรณ์',ic:'monitor'},{key:'allbookings',label:'การจองทั้งหมด',ic:'list'},{sec:'วิเคราะห์'},{key:'analytics',label:'วิเคราะห์ข้อมูล',ic:'chart'},{key:'reports',label:'รายงาน',ic:'file'},{sec:'ระบบ'},{key:'settings',label:'ตั้งค่าระบบ',ic:'gear'},{key:'notifications',label:'การแจ้งเตือน',ic:'bell',badge:5}],
  head:[{sec:'หลัก'},{key:'dashboard',label:'แดชบอร์ด',ic:'home'},{key:'rooms',label:'ค้นหาห้อง',ic:'bldg'},{key:'book',label:'จองห้อง',ic:'cal'},{key:'templates',label:'เทมเพลตการจอง',ic:'bookmark'},{sec:'อนุมัติ'},{key:'approvals',label:'คิวอนุมัติ',ic:'check',badge:2},{key:'reservations',label:'จัดการการจอง',ic:'list'},{key:'approvalsettings',label:'ตั้งค่าการอนุมัติ',ic:'gear'},{sec:'อื่นๆ'},{key:'notifications',label:'การแจ้งเตือน',ic:'bell',badge:2},{key:'reports',label:'รายงาน',ic:'chart'}],
};
const ROOMS=[
  {id:'1637',name:'ห้อง 1637',cap:20,status:'available',floor:6,grad:'linear-gradient(135deg,#2A2262,#38419D)'},
  {id:'1638',name:'ห้อง 1638',cap:20,status:'available',floor:6,grad:'linear-gradient(135deg,#4A1B6D,#7C3ABD)'},
  {id:'1639',name:'ห้อง 1639',cap:20,status:'available',floor:6,grad:'linear-gradient(135deg,#0F4C75,#1B9AAA)'},
  {id:'1640',name:'ห้อง 1640',cap:20,status:'pending',floor:6,grad:'linear-gradient(135deg,#7A3B00,#D4820A)'},
  {id:'1641',name:'ห้อง 1641',cap:20,status:'available',floor:6,grad:'linear-gradient(135deg,#0A3D1E,#1B7A3A)'},
];
const ROOM_COLORS={
  '1637':{bg:'#DBEAFE',text:'#1e3a8a',bar:'#3b82f6'},
  '1638':{bg:'#D1FAE5',text:'#065f46',bar:'#10b981'},
  '1639':{bg:'#FEF3C7',text:'#92400e',bar:'#f59e0b'},
  '1640':{bg:'#F3E8FF',text:'#6b21a8',bar:'#a855f7'},
  '1641':{bg:'#FFE4E6',text:'#9f1239',bar:'#f43f5e'},
};

const BOOKINGS=[
  // อาจารย์
  {id:'BK001',room:'1637',user:'ผศ.ดร.สมชาย วงศ์ดี',title:'สอนวิชา CS301',date:'2025-06-02',time:'09:00-12:00',status:'approved',role:'teacher'},
  {id:'BK003',room:'1639',user:'อ.วรรณา สุขใจ',title:'ปฏิบัติการ AI Lab',date:'2025-06-02',time:'13:00-16:00',status:'approved',role:'teacher'},
  {id:'BK004',room:'1637',user:'ผศ.ดร.สมชาย วงศ์ดี',title:'สอบปลายภาค CS301',date:'2025-06-05',time:'09:00-12:00',status:'approved',role:'teacher'},
  {id:'BK006',room:'1638',user:'อ.วรรณา สุขใจ',title:'สัมมนาวิชาการ',date:'2025-06-09',time:'09:00-12:00',status:'approved',role:'teacher'},
  {id:'BK008',room:'1637',user:'ผศ.ดร.สมชาย วงศ์ดี',title:'ประชุม Department',date:'2025-06-12',time:'10:00-12:00',status:'approved',role:'teacher'},
  {id:'BK010',room:'1641',user:'อ.วรรณา สุขใจ',title:'สอนวิชา CS401',date:'2025-06-23',time:'09:00-12:00',status:'approved',role:'teacher'},
  {id:'BK011',room:'1637',user:'ผศ.ดร.สมชาย วงศ์ดี',title:'ปัจฉิมนิเทศ',date:'2025-06-26',time:'13:00-16:00',status:'approved',role:'teacher'},
  // นักศึกษา — มี approved, pending, rejected, cancelled ครบ
  {id:'BK002',room:'1638',user:'นายพงศ์ธร มีสุข',title:'ประชุมกลุ่มโปรเจกต์',date:'2025-06-02',time:'10:00-12:00',status:'approved',role:'student'},
  {id:'BK015',room:'1641',user:'นายพงศ์ธร มีสุข',title:'เรียนพิเศษก่อนสอบ',date:'2025-06-04',time:'13:00-15:00',status:'approved',role:'student'},
  {id:'BK016',room:'1639',user:'น.ส.กมลชนก จริงจิต',title:'ซ้อมนำเสนองาน',date:'2025-06-05',time:'13:00-16:00',status:'approved',role:'student'},
  {id:'BK005',room:'1640',user:'น.ส.กมลชนก จริงจิต',title:'ฝึกนำเสนองาน',date:'2025-06-05',time:'09:00-11:00',status:'pending',role:'student'},
  {id:'BK007',room:'1641',user:'นายธีรภัทร ดีงาม',title:'โปรเจกต์ IT Club',date:'2025-06-09',time:'13:00-16:00',status:'pending',role:'student'},
  {id:'BK012',room:'1638',user:'น.ส.กมลชนก จริงจิต',title:'โปรเจกต์ Senior',date:'2025-06-26',time:'09:00-12:00',status:'pending',role:'student'},
  {id:'BK014',room:'1641',user:'นายธีรภัทร ดีงาม',title:'โปรเจกต์กลุ่ม',date:'2025-06-10',time:'09:00-11:00',status:'pending',role:'student'},
  {id:'BK009',room:'1639',user:'นายพงศ์ธร มีสุข',title:'เรียนพิเศษ',date:'2025-06-17',time:'14:00-17:00',status:'rejected',role:'student'},
  {id:'BK013',room:'1640',user:'นายพงศ์ธร มีสุข',title:'ฝึกนำเสนองาน',date:'2025-06-03',time:'14:00-16:00',status:'cancelled',role:'student'},
];

const STAFF_NOTIFS=[
  {id:1,unr:true,icKey:'tool',ibg:'#EEF0FF',title:'ผศ.ดร.สมชาย ขอสิ่งอำนวยความสะดวกเพิ่มเติม',sub:'ห้อง 1637 · 2 มิ.ย. 09:00–12:00\nไมโครโฟน 2 ตัว · กาแฟร้อน 10 แก้ว',time:'เมื่อสักครู่',st:'รอ',stBg:'#FEF3C7',stC:'#92400e',acts:[{l:'รับงาน',c:'g',f:'accept'},{l:'ดูเพิ่ม',c:'',f:'detail'}]},
  {id:2,unr:true,icKey:'tool',ibg:'#EEF0FF',title:'อ.วรรณา ขอสิ่งอำนวยความสะดวกเพิ่มเติม',sub:'ห้อง 1639 · 3 มิ.ย.\nไวท์บอร์ดเพิ่ม 1 แผ่น · ข้าวกล่อง 8 กล่อง',time:'20 นาทีที่แล้ว',st:'รอ',stBg:'#FEF3C7',stC:'#92400e',acts:[{l:'รับงาน',c:'g',f:'accept'},{l:'ดูเพิ่ม',c:'',f:'detail'}]},
];
const HEAD_NOTIFS=[
  {id:3,unr:true,icKey:'cal',ibg:'#FEF3C7',title:'นายพงศ์ธร ขอจองห้อง 1638',sub:'2 มิ.ย. 13:00–15:00 · ประชุมกลุ่ม',time:'5 นาทีที่แล้ว',st:'รออนุมัติ',stBg:'#FEF3C7',stC:'#92400e',acts:[{l:'อนุมัติ',c:'g',f:'approve'},{l:'ปฏิเสธ',c:'r',f:'reject'}]},
  {id:4,unr:false,icKey:'check',ibg:'#dcfce7',title:'ผศ.ดร.สมชาย จองห้อง 1637',sub:'อนุมัติอัตโนมัติ · 2 มิ.ย. 09:00–12:00',time:'3 ชม.ที่แล้ว',st:'สำเร็จ',stBg:'#dcfce7',stC:'#166534',acts:[]},
];

function fmtDate(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function stLabel(s){return{approved:'อนุมัติ',pending:'รอ',rejected:'ปฏิเสธ',cancelled:'ยกเลิก'}[s]||s}
function stChip(s){return`<span class="chip chip-${s==='approved'?'a':s==='pending'?'p':s==='rejected'?'r':'c'}">${stLabel(s)}</span>`}
