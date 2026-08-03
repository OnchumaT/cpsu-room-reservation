import { showToast } from '../components/Toast.js';

/**
 * Real login screen — replaces the old RoleSwitcher demo. Renders into
 * #loginScreen (a sibling of #appShell in index.html); main.js toggles
 * which one is visible based on whether a session is active.
 */
export function createLoginView({ authClient, onLoginSuccess }) {
  function render() {
    return `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2A2262 0%,#38419D 55%,#3887BE 100%);padding:20px">
      <div style="width:100%;max-width:380px;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(42,34,98,.25);overflow:hidden">
        <div style="padding:32px 32px 20px;text-align:center">
          <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#2A2262,#38419D);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div style="font-size:17px;font-weight:700;color:#1A1D3A">CPSU Room Reservation</div>
          <div style="font-size:11.5px;color:#8890B5;margin-top:2px">ภาควิชาวิทยาการคอมพิวเตอร์ · มหาวิทยาลัยศิลปากร</div>
        </div>
        <div style="padding:8px 32px 32px">
          <div id="loginError" style="display:none;background:#fee2e2;color:#991b1b;border-radius:8px;padding:9px 12px;font-size:11.5px;margin-bottom:14px"></div>
          <div class="form-group">
            <label class="form-label">อีเมล</label>
            <input class="form-control" id="loginEmail" type="email" placeholder="you@su.ac.th" autocomplete="username" onkeydown="if(event.key==='Enter')App.login()">
          </div>
          <div class="form-group">
            <label class="form-label">รหัสผ่าน</label>
            <input class="form-control" id="loginPassword" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')App.login()">
          </div>
          <button class="btn btn-p" id="loginSubmitBtn" style="width:100%;padding:11px;margin-top:6px" onclick="App.login()">เข้าสู่ระบบ</button>
          <div style="display:flex;align-items:center;gap:10px;margin:16px 0">
            <div style="flex:1;height:1px;background:#E8EAF0"></div>
            <span style="font-size:10.5px;color:#8890B5">หรือ</span>
            <div style="flex:1;height:1px;background:#E8EAF0"></div>
          </div>
          <button class="btn btn-o" style="width:100%;padding:10px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="App.loginWithGoogle()">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            เข้าสู่ระบบด้วย Google
          </button>
        </div>
      </div>
    </div>`;
  }

  function showError(message) {
    const el = document.getElementById('loginError');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
  }

  async function login() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!email || !password) { showError('กรุณากรอกอีเมลและรหัสผ่าน'); return; }

    const btn = document.getElementById('loginSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...'; }
    try {
      const session = await authClient.login({ email, password });
      await onLoginSuccess(session);
    } catch (err) {
      showError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
      if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
    }
  }

  async function loginWithGoogle() {
    showToast('Google Sign-In ยังไม่ได้ตั้งค่าฝั่งเซิร์ฟเวอร์ (ต้องตั้งค่า GOOGLE_CLIENT_ID)', 'e');
  }

  return { render, login, loginWithGoogle };
}
