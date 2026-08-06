export function LoadingPlaceholder() {
  return <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8890B5', fontSize: '13px' }}>กำลังโหลด...</div>;
}

export function ErrorPlaceholder({ error }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
      เกิดข้อผิดพลาด: {error?.message || 'ไม่สามารถโหลดข้อมูลได้'}
    </div>
  );
}
