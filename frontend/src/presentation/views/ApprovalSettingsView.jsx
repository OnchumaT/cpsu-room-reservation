import { IC } from '../../shared/icons.js';
import { APPROVAL_MODE } from '../../domain/policies/ApprovalPolicy.js';
import { container } from '../../shared/di/container.js';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { settingsRepository } = container.repositories;
const { setApprovalModeUseCase } = container.useCases;

const MODES = [
  {
    key: APPROVAL_MODE.AUTO, label: 'อนุมัติอัตโนมัติ', en: 'Automatic Approval',
    icon: 'ok', iconBg: '#dcfce7', iconColor: '#166534',
    points: [
      'เมื่อผู้ใช้งานส่งคำขอจองห้อง ระบบจะอนุมัติการจองทันทีโดยอัตโนมัติ',
      'สถานะการจองจะเปลี่ยนเป็น "อนุมัติแล้ว" ทันที',
      'ผู้จองจะได้รับการแจ้งเตือนในระบบโดยอัตโนมัติ',
    ],
  },
  {
    key: APPROVAL_MODE.MANUAL, label: 'อนุมัติแบบแมนนวล', en: 'Manual Approval',
    icon: 'clock', iconBg: '#FEF3C7', iconColor: '#92400e',
    points: [
      'เมื่อผู้ใช้งานส่งคำขอจองห้อง ระบบจะกำหนดสถานะเป็น "รอการอนุมัติ"',
      'ผู้มีสิทธิ์อนุมัติจะต้องตรวจสอบคำขอและเลือกอนุมัติหรือปฏิเสธด้วยตนเอง',
      'หลังจากดำเนินการแล้ว ผู้จองจะได้รับการแจ้งเตือนในระบบ',
    ],
  },
];

/** Visible to anyone holding a can_approve management position: picks the
 * department-wide default approval mode. */
export function ApprovalSettingsView() {
  const { approvalMode, setApprovalMode } = useAppShell();
  const { showToast } = useToast();
  const { loading, error } = useRepository(async () => {
    setApprovalMode(await settingsRepository.getApprovalMode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectMode(mode) {
    const result = await setApprovalModeUseCase.execute({ mode, currentMode: approvalMode });
    if (!result.success || !result.changed) return;
    setApprovalMode(mode);
    showToast(mode === APPROVAL_MODE.AUTO ? 'เปลี่ยนเป็นอนุมัติอัตโนมัติแล้ว' : 'เปลี่ยนเป็นอนุมัติแบบแมนนวลแล้ว', 's');
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1D3A' }}>ตั้งค่าการอนุมัติ</div>
        <div style={{ fontSize: '12px', color: '#8890B5', marginTop: '2px' }}>เลือกรูปแบบการอนุมัติที่จะใช้กับคำขอจองห้องใหม่ทั้งหมด — มีผลทันทีเมื่อเลือก ไม่มีผลย้อนหลังกับคำขอที่ส่งไปแล้ว</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {MODES.map((m) => {
          const on = approvalMode === m.key;
          return (
            <div
              key={m.key}
              onClick={() => selectMode(m.key)}
              style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', cursor: 'pointer', border: `2px solid ${on ? '#38419D' : '#D8DBF0'}`, boxShadow: on ? '0 4px 16px rgba(56,65,157,.12)' : '0 1px 3px rgba(42,34,98,.06)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: m.iconBg, color: m.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: IC[m.icon] || '' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1D3A' }}>{m.label}</div>
                    <div style={{ fontSize: '11px', color: '#8890B5' }}>({m.en})</div>
                  </div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {m.points.map((p) => <li key={p} style={{ fontSize: '11px', color: '#4A4F7A', lineHeight: 1.5 }}>{p}</li>)}
                  </ul>
                </div>
                {on
                  ? <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#38419D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></div>
                  : <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1.5px solid #D8DBF0', flexShrink: 0 }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
