import { useEffect, useState } from 'react';
import { container } from '../../shared/di/container.js';
import { takePendingCheckIn } from '../../shared/checkIn.js';
import { formatDateDMY } from '../../shared/dateFormat.js';
import { useAppShell } from '../context/AppShellContext.jsx';

/**
 * Opened right after a room's QR code is scanned (see shared/checkIn.js):
 * checks the signed-in user into their booking running in that room now
 * and shows the outcome in big, glanceable text — it's read on a phone
 * standing at the door.
 */
export function CheckInView() {
  const { navigate } = useAppShell();
  const [state, setState] = useState({ phase: 'working' });

  useEffect(() => {
    const pending = takePendingCheckIn();
    if (!pending) { setState({ phase: 'error', message: 'ไม่พบข้อมูล QR Code กรุณาสแกนจากป้ายหน้าห้องอีกครั้ง' }); return; }
    container.repositories.bookingRepository.checkIn(pending)
      .then((result) => setState({ phase: 'done', ...result }))
      .catch((err) => setState({ phase: 'error', roomId: pending.roomId, message: err.message || 'เช็กอินไม่สำเร็จ' }));
  }, []);

  const ok = state.phase === 'done';
  const tone = state.phase === 'working'
    ? { bg: '#EEF0FF', fg: '#38419D', icon: '…' }
    : ok ? { bg: '#dcfce7', fg: '#166534', icon: '✓' } : { bg: '#fee2e2', fg: '#991b1b', icon: '!' };

  return (
    <div style={{ maxWidth: '460px', margin: '24px auto', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '16px', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: tone.bg, color: tone.fg, fontSize: '36px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{tone.icon}</div>
      {state.phase === 'working' && <div style={{ fontSize: '18px', fontWeight: 600 }}>กำลังเช็กอิน...</div>}
      {ok && (
        <>
          <div style={{ fontSize: '20px', fontWeight: 700, color: tone.fg }}>{state.alreadyCheckedIn ? 'เช็กอินไว้แล้ว' : 'เช็กอินสำเร็จ'}</div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '12px 0 4px' }}>ห้อง {state.booking.room}</div>
          <div style={{ fontSize: '14px', color: '#4A4F7A' }}>{formatDateDMY(state.booking.date)} · {state.booking.time}</div>
          <div style={{ fontSize: '14px', color: '#4A4F7A', marginTop: '2px' }}>{state.booking.title}</div>
        </>
      )}
      {state.phase === 'error' && (
        <>
          <div style={{ fontSize: '18px', fontWeight: 700, color: tone.fg }}>เช็กอินไม่สำเร็จ</div>
          {state.roomId && <div style={{ fontSize: '22px', fontWeight: 700, margin: '10px 0 4px' }}>ห้อง {state.roomId}</div>}
          <div style={{ fontSize: '14px', color: '#4A4F7A', marginTop: '6px', lineHeight: 1.6 }}>{state.message}</div>
        </>
      )}
      {state.phase !== 'working' && (
        <button className="btn btn-p" style={{ marginTop: '22px' }} onClick={() => navigate('dashboard')}>ไปหน้าแดชบอร์ด</button>
      )}
    </div>
  );
}
