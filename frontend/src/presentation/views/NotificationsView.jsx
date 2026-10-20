import { useEffect, useState } from 'react';
import { IC } from '../../shared/icons.js';
import { ROLE_INFO } from '../../shared/constants.js';
import { formatDateTime } from '../formatters/statusLabels.js';
import { container } from '../../shared/di/container.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { useBookingDetailModal } from '../components/BookingDetailModal.jsx';
import { useRejectReasonModal } from '../hooks/useRejectReasonModal.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { notificationRepository } = container.repositories;
const { updateNotificationUseCase, approveRejectBookingUseCase } = container.useCases;

function ReadOnlyItem({ n, onAction }) {
  // An unread FYI with nowhere to go (e.g. a cancellation notice) is still
  // clickable — clicking is how it gets marked read and its dot cleared.
  const clickable = Boolean(n.bookingId) || n.kind === 'user-registration' || n.unr;
  return (
    <div
      className={`nitem${n.unr ? ' unr' : ''}`}
      style={clickable ? { cursor: 'pointer' } : undefined}
      onClick={clickable ? () => onAction(n.id, 'detail') : undefined}
    >
      <div className="notif-ic" style={{ background: n.ibg, color: '#4A4F7A' }} dangerouslySetInnerHTML={{ __html: IC[n.icKey] || '' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14.5px', fontWeight: n.unr ? 600 : 400, color: '#1A1D3A', marginBottom: '3px' }}>{n.title}</div>
        <div style={{ fontSize: '12.5px', color: '#8890B5' }}>{n.sub || ''}{n.sub ? ' · ' : ''}{formatDateTime(n.time)}</div>
      </div>
      {n.unr && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38419D', flexShrink: 0, marginTop: '5px' }} />}
    </div>
  );
}

function ActionableItem({ n, onAction }) {
  const hasDetail = n.acts.some((a) => a.f === 'detail');
  const otherActs = n.acts.filter((a) => a.f !== 'detail');
  const classes = `staff-nitem${n.unr ? ' unr' : ''}${hasDetail ? ' clickable' : ''}`;
  return (
    <div
      className={classes}
      style={hasDetail ? { cursor: 'pointer' } : undefined}
      onClick={hasDetail ? () => onAction(n.id, 'detail') : undefined}
    >
      <div className="notif-ic" style={{ background: n.ibg, color: '#4A4F7A' }} dangerouslySetInnerHTML={{ __html: IC[n.icKey] || '' }} />
      <div className="sni-body">
        <div className="sni-ti">{n.title}</div>
        <div className="sni-su">{n.sub || ''}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          <span style={{ fontSize: '12.5px', color: '#8890B5' }}>{formatDateTime(n.time)}</span>
          <span className="chip" style={{ background: n.stBg, color: n.stC, fontSize: '12px', padding: '4px 11px' }}>{n.st}</span>
        </div>
        {otherActs.length > 0 && (
          <div className="sni-acts">
            {otherActs.map((a) => (
              <button key={a.f} className={`sact ${a.c}`} onClick={(e) => { e.stopPropagation(); onAction(n.id, a.f, a); }}>{a.l}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Item({ n, onAction }) {
  return n.acts.length ? <ActionableItem n={n} onAction={onAction} /> : <ReadOnlyItem n={n} onAction={onAction} />;
}

// `limit` shows only the newest N items, with a toggle for the rest — so a
// long approvals backlog doesn't push every other notification far down.
function Section({ title, list, onAction, limit }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = limit && !expanded ? Math.max(list.length - limit, 0) : 0;
  const shown = hidden ? list.slice(0, limit) : list;
  return (
    <>
      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4A4F7A', textTransform: 'uppercase', letterSpacing: '.06em', margin: '18px 0 10px' }}>{title}</div>
      <div className="tbl-wrap">
        {list.length
          ? shown.map((n) => <Item key={n.id} n={n} onAction={onAction} />)
          : <div style={{ padding: '20px', textAlign: 'center', color: '#8890B5', fontSize: '13px' }}>ไม่มีรายการ</div>}
        {limit && list.length > limit && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{ width: '100%', padding: '11px', background: '#F4F5FA', border: 'none', borderTop: '.5px solid #D8DBF0', color: '#38419D', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {expanded ? 'ย่อรายการ' : `ดูเพิ่มเติม (อีก ${hidden} รายการ)`}
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Own role's inbox (read-only summary items for admin/teacher,
 * actionable cards for staff — decided by whether the item actually has
 * `acts`, not by role) plus, for anyone holding a can_approve position,
 * the shared "approvers" inbox merged in above it.
 */
export function NotificationsView() {
  const { role, canApprove } = useAuth();
  const { navigate, refreshUnreadCount, setApprovalFocus, setTemplateToApply, setFacilityFocus } = useAppShell();
  const { showToast } = useToast();
  const { show: showBookingDetail } = useBookingDetailModal();
  const { askRejectReason } = useRejectReasonModal();
  const { loading, error, refetch } = useRepository(() => {
    const tasks = [notificationRepository.refresh()];
    if (canApprove) tasks.push(notificationRepository.refreshApproverInbox());
    return Promise.all(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApprove]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const tasks = [notificationRepository.refresh()];
      if (canApprove) tasks.push(notificationRepository.refreshApproverInbox());
      Promise.all(tasks).then(() => setTick((n) => n + 1)).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [canApprove]);

  function findNotification(id) {
    return [...notificationRepository.getAll(), ...notificationRepository.getApproverInbox()].find((n) => String(n.id) === String(id));
  }

  async function applyAction(id, action, actionObj) {
    const notification = findNotification(id);

    // A freed-slot notice has no bookingId to open (there's no booking —
    // the room just became available again), so its only action is
    // re-opening the booking form pre-filled with the slot that was
    // originally wanted (see NotifyFreedSlotUseCase on the backend).
    if (action === 'retry' && actionObj) {
      if (notification?.unr) updateNotificationUseCase.execute({ notificationId: id, action: 'read' }).then(refreshUnreadCount);
      // The freed slot's day may be over by the time the notice is clicked.
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (actionObj.date < today) { showToast('ช่วงเวลานี้ผ่านไปแล้ว จองไม่ได้', 'i'); return; }
      setTemplateToApply({ room: actionObj.room, date: actionObj.date, start: actionObj.start, end: actionObj.end });
      navigate('book');
      return;
    }

    if (action === 'detail') {
      // Opening a notification reads it — fire-and-refetch so the unread
      // dot clears without making the click wait on a network round trip.
      if (notification?.unr) {
        updateNotificationUseCase.execute({ notificationId: id, action: 'read' }).then(() => { refetch(); refreshUnreadCount(); });
      }
      // Staff jump to the queue (that's where they action a request) — anyone
      // else (the teacher who made the request, an approver's FYI copy) has
      // no access to that page, so their own booking detail is the useful
      // landing spot instead.
      if (notification?.kind === 'facility-request') {
        if (role === 'staff') { setFacilityFocus(notification.bookingId); navigate('facilityqueue'); return; }
        if (notification.bookingId) { showBookingDetail(notification.bookingId); return; }
        return;
      }
      if (notification?.kind === 'user-registration') { navigate('users'); return; }
      // Approvers with a request still awaiting a decision land on the queue with it highlighted.
      // Always ask the API for the current status: the local cache can still say "pending" for a
      // request that was just approved/rejected (by this approver or another), which would send
      // them to the queue for nothing. The cache is only a fallback if the request fails.
      if (canApprove && notification?.bookingId) {
        const { bookingRepository } = container.repositories;
        const booking = await bookingRepository.fetchById(notification.bookingId)
          .catch(() => bookingRepository.findById(notification.bookingId));
        if (booking?.isPending()) {
          setApprovalFocus(notification.bookingId);
          navigate('approvals');
          return;
        }
      }
      if (notification?.bookingId) { showBookingDetail(notification.bookingId); return; }
      // Nothing to open — the click above already marked it read.
      return;
    }

    if ((action === 'approve' || action === 'reject') && notification?.bookingId) {
      try {
        if (action === 'approve') {
          await approveRejectBookingUseCase.approve(notification.bookingId);
        } else {
          const reason = await askRejectReason();
          if (!reason) return;
          await approveRejectBookingUseCase.reject(notification.bookingId, reason);
        }
      } catch (err) {
        showToast(err.message || 'ดำเนินการไม่สำเร็จ', 'e');
        return;
      }
    }

    const result = await updateNotificationUseCase.execute({ notificationId: id, action });
    if (!result.success) return;
    const messages = { approve: ['อนุมัติแล้ว', 's'], reject: ['ปฏิเสธแล้ว', 'i'], accept: ['รับงานแล้ว', 's'], done: ['จัดการเรียบร้อย', 's'] };
    const [message, type] = messages[action] || ['ดำเนินการแล้ว', 'i'];
    showToast(message, type);
    refetch();
    refreshUnreadCount();
  }

  async function markAllRead() {
    const unread = [...notificationRepository.getAll(), ...notificationRepository.getApproverInbox()].filter((n) => n.unr);
    if (!unread.length) { showToast('ไม่มีรายการที่ยังไม่ได้อ่าน', 'i'); return; }
    await Promise.all(unread.map((n) => updateNotificationUseCase.execute({ notificationId: n.id, action: 'read' })));
    showToast('อ่านทั้งหมดแล้ว', 's');
    refetch();
    refreshUnreadCount();
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const roleLabel = ROLE_INFO[role]?.label || role;
  const own = notificationRepository.getAll();
  const approverInbox = canApprove ? notificationRepository.getApproverInbox() : [];
  // The approvers' shared inbox stays apart from the user's own notices:
  // requests still awaiting a decision on top, then everything else sent to
  // approvers (cancellations, edits, decided requests). A "รออนุมัติ" card
  // whose booking no longer exists has nothing left to decide.
  const isAwaiting = (n) => n.st === 'รออนุมัติ' && Boolean(n.bookingId);
  const awaiting = approverInbox.filter(isAwaiting);
  const approverActivity = approverInbox.filter((n) => !isAwaiting(n));
  const hasUnread = [...own, ...approverInbox].some((n) => n.unr);

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">การแจ้งเตือน — {roleLabel}</span>
        <button className="btn btn-o" disabled={!hasUnread} onClick={markAllRead}>อ่านทั้งหมด</button>
      </div>
      {canApprove && <Section title="รอการอนุมัติ" list={awaiting.map((n) => ({ ...n, acts: [] }))} onAction={applyAction} limit={5} />}
      {canApprove && <Section title="ความเคลื่อนไหวคำขอจอง (ผู้อนุมัติ)" list={approverActivity.map((n) => ({ ...n, acts: [] }))} onAction={applyAction} limit={5} />}
      <Section title={canApprove ? 'แจ้งเตือนของฉัน' : 'ทั้งหมด'} list={own} onAction={applyAction} />
    </>
  );
}
