import { useState } from 'react';
import { IC } from '../../shared/icons.js';
import { getRoomColor } from '../../shared/constants.js';
import { roomStatusMeta } from '../formatters/statusLabels.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { container } from '../../shared/di/container.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const EQUIPMENT_DISPLAY_ROWS = [
  ['proj', 'Projector', 'projector', 1, 'เครื่อง'],
  ['wb', 'Whiteboard', 'whiteboard', 1, 'แผ่น'],
  ['gear', 'A/C', 'ac', 2, 'เครื่อง'],
  ['mic', 'ไมโครโฟน', 'mic', 1, 'ตัว'],
  ['plug', 'ปลั๊กไฟ', 'plug', 6, 'จุด'],
  ['monitor', 'จอ TV', 'tv', 1, 'เครื่อง'],
  ['bell', 'ระบบเสียง', 'sound', 1, 'ชุด'],
];

const { roomRepository } = container.repositories;
const { searchRoomsUseCase } = container.useCases;

// Card/detail hero background — matches the calendar/dashboard room-color
// legend instead of the admin-set `room.grad` (a separate, unrelated field).
function roomGradient(roomId) {
  const rc = getRoomColor(roomId);
  return `linear-gradient(135deg, ${rc.text}, ${rc.bar})`;
}

function RoomCard({ room, canBookRooms, onOpenDetail, onBook }) {
  const meta = roomStatusMeta(room.status);
  return (
    <div
      onClick={() => onOpenDetail(room.id)}
      style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 3px rgba(42,34,98,.07),0 4px 16px rgba(42,34,98,.05)' }}
    >
      <div style={{ height: '140px', background: roomGradient(room.id), position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.2"><rect x="2" y="7" width="20" height="14" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
        <div style={{ position: 'absolute', top: '12px', left: '14px', background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(4px)', color: 'white', fontSize: '13px', fontWeight: 700, padding: '4px 11px', borderRadius: '20px', letterSpacing: '.04em' }}>{room.id}</div>
        <div style={{ position: 'absolute', top: '12px', right: '14px', background: meta.bg, color: meta.color, fontSize: '11px', fontWeight: 600, padding: '4px 11px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />{meta.label}
        </div>
        <div style={{ position: 'absolute', bottom: '12px', right: '14px', background: 'rgba(0,0,0,.25)', color: 'rgba(255,255,255,.85)', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>ชั้น {room.floor}</div>
      </div>
      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ fontSize: '17px', fontWeight: 600, color: '#1A1D3A', marginBottom: '6px' }}>{room.name}</div>
        <div style={{ fontSize: '12px', color: '#8890B5', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
            {room.cap} ที่นั่ง
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
            อาคาร 1 ชั้น {room.floor}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {['Projector', 'Whiteboard', 'A/C', 'Mic'].map((eq) => <span key={eq} style={{ fontSize: '11px', background: '#F4F5FA', color: '#4A4F7A', padding: '4px 10px', borderRadius: '20px', border: '.5px solid #E8EAF0' }}>{eq}</span>)}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={(e) => { e.stopPropagation(); onOpenDetail(room.id); }} style={{ flex: 1, padding: '10px', background: '#F4F5FA', color: '#4A4F7A', border: '.5px solid #D8DBF0', borderRadius: '9px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'Sarabun,sans-serif' }}>รายละเอียด</button>
          {canBookRooms && room.isBookable()
            ? <button onClick={(e) => { e.stopPropagation(); onBook(); }} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#2A2262,#38419D)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun,sans-serif' }}>จองห้องนี้</button>
            : <button disabled style={{ flex: 1, padding: '10px', background: '#F4F5FA', color: '#C2C7E0', border: '.5px solid #E8EAF0', borderRadius: '9px', fontSize: '12px', fontWeight: 500, cursor: 'not-allowed', fontFamily: 'Sarabun,sans-serif' }}>{room.isOccupied() ? 'ไม่พร้อมใช้งาน' : 'จองห้อง'}</button>}
        </div>
      </div>
    </div>
  );
}

export function RoomsView() {
  const { role, canApprove } = useAuth();
  const { navigate, setTemplateToApply } = useAppShell();
  function bookRoom(roomId) {
    setTemplateToApply({ room: roomId });
    navigate('book');
  }
  const { openModal, closeModal } = useModal();
  const { loading, error } = useRepository(() => roomRepository.refresh());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const canBookRooms = BookingPermissionPolicy.canBookRooms(role) || canApprove;

  function showRoomDetail(id) {
    const room = roomRepository.findById(id);
    if (!room) return;
    const eq = room.getEquipment();
    openModal(
      `รายละเอียด ${room.name}`,
      <>
        <div style={{ height: '80px', background: roomGradient(room.id), borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', position: 'relative' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
          <div style={{ position: 'absolute', bottom: '8px', right: '10px', background: 'rgba(0,0,0,.35)', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '5px' }}>{roomStatusMeta(room.status).label}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}><span className="chip chip-a">{room.cap} ที่นั่ง</span><span className="chip chip-a">ชั้น {room.floor}</span></div>
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#4A4F7A', marginBottom: '8px' }}>อุปกรณ์ในห้อง</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
          {EQUIPMENT_DISPLAY_ROWS.map(([icKey, label, eqKey, fallback, unit]) => {
            const qty = eqKey === 'plug' ? (eq.plug || 6) : (eq[eqKey] || fallback);
            return (
              <div key={icKey} style={{ background: '#F4F5FA', border: '.5px solid #D8DBF0', borderRadius: '8px', padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', color: '#38419D', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: IC[icKey] || '' }} />
                <div style={{ fontSize: '10px', fontWeight: 500, color: '#1A1D3A', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#38419D' }}>{qty} {unit}</div>
              </div>
            );
          })}
          <div style={{ background: '#F4F5FA', border: '.5px solid #D8DBF0', borderRadius: '8px', padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#38419D', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: IC.user }} />
            <div style={{ fontSize: '10px', fontWeight: 500, color: '#1A1D3A', marginBottom: '2px' }}>โต๊ะ-เก้าอี้</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#38419D' }}>{room.cap} ชุด</div>
          </div>
        </div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ปิด</button>
        {canBookRooms && <button className="btn btn-p" onClick={() => { closeModal(); bookRoom(room.id); }}>จองห้องนี้</button>}
      </>,
    );
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const { rooms } = searchRoomsUseCase.execute({ query, status });
  const all = roomRepository.getAll();
  const avail = all.filter((r) => r.status === 'available').length;
  const occupied = all.filter((r) => r.status === 'occupied').length;
  const pending = all.filter((r) => r.status === 'pending').length;

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '11px', padding: '12px 16px', boxShadow: '0 1px 4px rgba(42,34,98,.06)' }}>
          <span style={{ color: '#8890B5', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: IC.search }} />
          <input
            placeholder="ค้นหาห้อง รหัส หรืออุปกรณ์..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ border: 'none', background: 'none', fontSize: '14px', fontFamily: 'Sarabun,sans-serif', color: '#1A1D3A', outline: 'none', width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`fchip${status === 'all' ? ' on' : ''}`} onClick={() => setStatus('all')}>ทั้งหมด ({all.length})</button>
          <button className={`fchip${status === 'available' ? ' on' : ''}`} onClick={() => setStatus('available')}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', marginRight: '5px' }} />ว่าง ({avail})
          </button>
          <button className={`fchip${status === 'occupied' ? ' on' : ''}`} onClick={() => setStatus('occupied')}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginRight: '5px' }} />ไม่พร้อมใช้งาน ({occupied})
          </button>
          <button className={`fchip${status === 'pending' ? ' on' : ''}`} onClick={() => setStatus('pending')}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', marginRight: '5px' }} />รอดำเนินการ ({pending})
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '18px' }}>
        {rooms.length
          ? rooms.map((room) => <RoomCard key={room.id} room={room} canBookRooms={canBookRooms} onOpenDetail={showRoomDetail} onBook={() => bookRoom(room.id)} />)
          : <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#8890B5', fontSize: '13px' }}>ไม่พบห้องที่ค้นหา</div>}
      </div>
    </>
  );
}
