import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_BUTTON_WIDTH = 316; // matches the card's inner content width (380 - 32px padding * 2)

export function LoginView() {
  const { login, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const gsiButtonRef = useRef(null);

  // Google's real button is rendered invisibly on top of our own styled
  // "G" button below (see the wrapper's position:relative), so it gets
  // the click but the page keeps its own look — GIS doesn't support
  // styling its button to match arbitrary designs directly.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    function handleCredentialResponse({ credential }) {
      loginWithGoogle({ idToken: credential }).catch((err) => {
        showToast(err.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ', 'e');
      });
    }

    function init() {
      if (cancelled || !gsiButtonRef.current) return;
      if (!window.google?.accounts?.id) { setTimeout(init, 100); return; }
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredentialResponse });
      window.google.accounts.id.renderButton(gsiButtonRef.current, { type: 'standard', width: GOOGLE_BUTTON_WIDTH });
    }
    init();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) { setError('กรุณากรอกอีเมลและรหัสผ่าน'); return; }
    setSubmitting(true);
    setError('');
    try {
      await login({ email: trimmedEmail, password });
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  function handleGoogleButtonFallbackClick() {
    // Only reachable when GIS never rendered its (invisible, overlaid)
    // real button on top of this one — i.e. not configured.
    showToast('Google Sign-In ยังไม่ได้ตั้งค่าฝั่งเซิร์ฟเวอร์ (ต้องตั้งค่า VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID)', 'e');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#2A2262 0%,#38419D 55%,#3887BE 100%)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '18px', boxShadow: '0 20px 60px rgba(42,34,98,.25)', overflow: 'hidden' }}>
        <div style={{ padding: '32px 32px 20px', textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg,#2A2262,#38419D)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#1A1D3A' }}>CPSU Room Reservation</div>
          <div style={{ fontSize: '11.5px', color: '#8890B5', marginTop: '2px' }}>ภาควิชาวิทยาการคอมพิวเตอร์ · มหาวิทยาลัยศิลปากร</div>
        </div>
        <div style={{ padding: '8px 32px 32px' }}>
          {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '9px 12px', fontSize: '11.5px', marginBottom: '14px' }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">อีเมล</label>
            <input className="form-control" type="email" placeholder="you@su.ac.th" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
          </div>
          <div className="form-group">
            <label className="form-label">รหัสผ่าน</label>
            <input className="form-control" type="password" placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
          </div>
          <button className="btn btn-p" style={{ width: '100%', padding: '11px', marginTop: '6px' }} disabled={submitting} onClick={handleLogin}>
            {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#E8EAF0' }} />
            <span style={{ fontSize: '10.5px', color: '#8890B5' }}>หรือ</span>
            <div style={{ flex: 1, height: '1px', background: '#E8EAF0' }} />
          </div>
          <div style={{ position: 'relative', width: '100%' }}>
            <button className="btn btn-o" style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleGoogleButtonFallbackClick}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" /><path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" /></svg>
              เข้าสู่ระบบด้วย Google
            </button>
            {GOOGLE_CLIENT_ID && (
              <div ref={gsiButtonRef} style={{ position: 'absolute', inset: 0, opacity: 0, overflow: 'hidden' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
