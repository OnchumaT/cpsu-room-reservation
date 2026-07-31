import { IC } from '../../shared/icons.js';
import { ROLE_INFO, BOOKING_EQUIPMENT_OPTIONS, BOOKING_PURPOSES, TEACHER_ONLY_PURPOSES, OTHER_PURPOSE, TIME_SLOTS_START, TIME_SLOTS_END, PARTICIPATING_TEACHERS } from '../../shared/constants.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { ApprovalPolicy } from '../../domain/policies/ApprovalPolicy.js';
import { openModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';
import { bookingStatusLongLabel } from '../formatters/statusLabels.js';

const FACILITY_EQUIPMENT_NAMES = { mic: 'ไมโครโฟน', wb: 'ไวท์บอร์ด', ext: 'ปลั๊กพ่วง', hdmi: 'สาย HDMI' };
const PURPOSES_NEEDING_TEACHER_LIST_AND_FOOD = new Set(TEACHER_ONLY_PURPOSES);

export function createBookingView({ appState, roomRepository, createBookingUseCase, checkRoomAvailabilityUseCase }) {
  function requiresFacilityPanel() {
    return BookingPermissionPolicy.canRequestFacilities(appState.role);
  }

  function willAutoApprove() {
    return ApprovalPolicy.willAutoApprove({ role: appState.role, approvalMode: appState.approvalMode });
  }

  function render() {
    if (!BookingPermissionPolicy.canBookRooms(appState.role)) {
      return `<div class="misc-pg">${IC.gear}<div style="font-weight:500;color:#4A4F7A">ไม่มีสิทธิ์จองห้อง</div><div>เฉพาะอาจารย์ นักศึกษา และหัวหน้าภาควิชาเท่านั้น</div></div>`;
    }

    const showFacilityPanel = requiresFacilityPanel();
    const template = appState.takeTemplateToApply();
    appState.bookFoodItems = template ? [...(template.food || [])] : [];
    appState.bookEqQty = template ? { mic: 0, wb: 0, ext: 0, hdmi: 0, ...(template.equipment || {}) } : { mic: 0, wb: 0, ext: 0, hdmi: 0 };
    const autoApprove = willAutoApprove();
    const rooms = roomRepository.getAll();
    const today = new Date().toISOString().slice(0, 10);

    return `
    <div style="display:grid;grid-template-columns:${showFacilityPanel ? 'minmax(0,1fr) minmax(0,420px)' : 'minmax(0,560px)'};gap:20px;align-items:start;${showFacilityPanel ? '' : 'margin:0 auto'}">

      <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(42,34,98,.08),0 8px 32px rgba(42,34,98,.06)">
        <div style="background:linear-gradient(135deg,#2A2262 0%,#38419D 60%,#3887BE 100%);padding:20px 24px 18px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <div style="width:28px;height:28px;background:rgba(255,255,255,.15);border-radius:8px;display:flex;align-items:center;justify-content:center">${IC.cal}</div>
            <div style="font-size:16px;font-weight:600;color:white">แบบฟอร์มจองห้อง</div>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,.6)">กรอกข้อมูลให้ครบ แล้วกดยืนยันการจอง</div>
          <div style="margin-top:12px;background:rgba(255,255,255,.12);border-radius:8px;padding:8px 12px;font-size:11px;color:${autoApprove ? '#a7f3d0' : '#fde68a'};display:flex;align-items:center;gap:6px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            ${autoApprove ? 'ได้รับการอนุมัติอัตโนมัติทันที' : 'คำขอจะถูกส่งไปรอการอนุมัติจากหัวหน้าภาควิชา'}
          </div>
        </div>
        <div style="padding:22px 24px">
          <div class="form-group">
            <label class="form-label">เลือกห้อง *</label>
            <select class="form-control" id="bkRoom" onchange="App.checkRoomAvail()">
              <option value="">-- เลือกห้อง --</option>
              ${rooms.map((r) => `<option value="${r.id}" ${r.isOccupied() ? 'disabled' : ''}${template && r.id === template.room ? ' selected' : ''}>${r.name}${r.isOccupied() ? ' (ไม่ว่าง)' : ''}</option>`).join('')}
            </select>
            <div id="roomWarnBox" style="display:none;margin-top:6px;background:#fef2f2;border:.5px solid #fca5a5;border-radius:7px;padding:7px 11px;font-size:11px;color:#991b1b;align-items:center;gap:6px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span id="roomWarnMsg"></span>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">วันที่จอง *</label>
              <input type="date" class="form-control" id="bkDate" value="${today}" min="${today}" onchange="App.checkRoomAvail()">
            </div>
            <div class="form-group">
              <label class="form-label">จำนวนผู้เข้าร่วม</label>
              <input type="number" class="form-control" id="bkParticipants" value="${template?.participants || 10}" min="1" max="20">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">เวลาเริ่มต้น *</label>
              <select class="form-control" id="bkStart">${TIME_SLOTS_START.map((t) => `<option>${t}</option>`).join('')}</select>
            </div>
            <div class="form-group">
              <label class="form-label">เวลาสิ้นสุด *</label>
              <select class="form-control" id="bkEnd">${TIME_SLOTS_END.map((t) => `<option${t === '12:00' ? ' selected' : ''}>${t}</option>`).join('')}</select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">วัตถุประสงค์ *</label>
            <select class="form-control" id="bkPurpose" onchange="App.onPurposeChange(this.value)">
              ${BOOKING_PURPOSES.map((p) => `<option value="${p}"${template?.purpose === p ? ' selected' : ''}>${p}</option>`).join('')}
              ${showFacilityPanel ? TEACHER_ONLY_PURPOSES.map((p) => `<option value="${p}"${template?.purpose === p ? ' selected' : ''}>${p}</option>`).join('') : ''}
              <option value="${OTHER_PURPOSE}"${template?.purpose === OTHER_PURPOSE ? ' selected' : ''}>${OTHER_PURPOSE}</option>
            </select>
          </div>

          <div id="teacherListSection" style="display:none" class="form-group">
            <label class="form-label">รายชื่ออาจารย์ที่เข้าร่วม <span style="color:#8890B5;font-weight:400">(เลือกได้หลายคน)</span></label>
            <div style="border:.5px solid #C2C7E0;border-radius:8px;overflow:hidden">
              <div style="max-height:150px;overflow-y:auto;padding:6px 8px">
                ${PARTICIPATING_TEACHERS.map((name, i) => `
                <label style="display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;border-radius:5px;font-size:12px;color:#1A1D3A" onmouseover="this.style.background='#EEF0FF'" onmouseout="this.style.background='transparent'">
                  <input type="checkbox" id="tch_${i}" style="accent-color:#38419D"> ${name}
                </label>`).join('')}
              </div>
              <div style="padding:5px 10px 7px;background:#F4F5FA;border-top:.5px solid #D8DBF0;font-size:10px;color:#8890B5" id="selectedCount">เลือก 0 คน</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">รายละเอียดเพิ่มเติม</label>
            <textarea class="form-control" id="bkNote" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)...">${template?.note || ''}</textarea>
          </div>

          <div style="display:flex;gap:10px;padding-top:4px">
            <button onclick="App.submitBooking()" style="flex:1;padding:12px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;letter-spacing:.02em;transition:opacity .15s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">ยืนยันการจอง</button>
            <button onclick="App.navigate('rooms')" style="padding:12px 18px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;font-family:Sarabun,sans-serif">ยกเลิก</button>
          </div>
        </div>
      </div>

      ${showFacilityPanel ? `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(42,34,98,.08),0 8px 32px rgba(42,34,98,.06)">
          <div style="background:linear-gradient(135deg,#0F4C75,#3887BE);padding:18px 20px 16px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:26px;height:26px;background:rgba(255,255,255,.15);border-radius:7px;display:flex;align-items:center;justify-content:center">${IC.tool}</div>
                <div style="font-size:14px;font-weight:600;color:white">ขอสิ่งอำนวยความสะดวกเพิ่มเติม</div>
              </div>
              <span style="font-size:10px;background:rgba(255,255,255,.15);color:white;padding:3px 9px;border-radius:20px">เฉพาะอาจารย์</span>
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:5px">เจ้าหน้าที่จะได้รับแจ้งเตือนทันที</div>
          </div>
          <div style="padding:16px 18px">
            <div style="font-size:11px;font-weight:600;color:#4A4F7A;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">อุปกรณ์เพิ่มเติม</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${BOOKING_EQUIPMENT_OPTIONS.map((e) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:#F4F5FA;border-radius:9px;border:.5px solid #E8EAF0">
                <div style="display:flex;align-items:center;gap:9px">
                  <div style="width:28px;height:28px;background:#EEF0FF;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#38419D;flex-shrink:0">${IC[e.ic] || ''}</div>
                  <div>
                    <div style="font-size:12px;font-weight:500;color:#1A1D3A">${e.nm}</div>
                    <div style="font-size:10px;color:#8890B5">คงเหลือ ${e.avail}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px">
                  <button onclick="App.changeBookingEquipmentQty('${e.k}',-1)" style="width:26px;height:26px;background:#fff;border:.5px solid #C2C7E0;border-radius:6px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;color:#38419D">−</button>
                  <span id="bqn-${e.k}" style="font-size:13px;font-weight:700;min-width:22px;text-align:center;color:#38419D">${appState.bookEqQty[e.k] || 0}</span>
                  <button onclick="App.changeBookingEquipmentQty('${e.k}',1)" style="width:26px;height:26px;background:#EEF0FF;border:.5px solid #c7cbf0;border-radius:6px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;color:#38419D">+</button>
                </div>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <div id="foodSection" style="display:none;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(42,34,98,.08),0 8px 32px rgba(42,34,98,.06)">
          <div style="background:linear-gradient(135deg,#0A3D1E,#16a34a);padding:14px 20px 12px">
            <div style="font-size:14px;font-weight:600;color:white">อาหาร / เครื่องดื่ม</div>
            <div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:3px">พิมพ์รายการแล้วกด Enter</div>
          </div>
          <div style="padding:14px 18px">
            <div style="border:.5px solid #C2C7E0;border-radius:9px;overflow:hidden">
              <div style="display:flex">
                <input type="text" id="bookFoodInp" placeholder="เช่น กาแฟร้อน 5 แก้ว..."
                  style="flex:1;border:none;padding:9px 12px;font-size:12px;font-family:Sarabun,sans-serif;color:#1A1D3A;outline:none;background:#fff"
                  onkeydown="if(event.key==='Enter')App.addBookingFood()">
                <button onclick="App.addBookingFood()" style="padding:0 14px;background:#38419D;color:white;border:none;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif;font-weight:600">+ เพิ่ม</button>
              </div>
              <div id="bookFoodTags" style="display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;background:#F4F5FA;min-height:36px">
                <span style="font-size:11px;color:#8890B5;align-self:center">ยังไม่มีรายการ</span>
              </div>
            </div>
          </div>
        </div>

        <div style="background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 1px 3px rgba(42,34,98,.08),0 8px 32px rgba(42,34,98,.06)">
          <label class="form-label">หมายเหตุถึงเจ้าหน้าที่</label>
          <textarea class="form-control" id="bookFacNote" rows="3" placeholder="เช่น ต้องการก่อน 08:30 น. / มีผู้แพ้อาหาร...">${template?.facilityNote || ''}</textarea>
        </div>
      </div>` : ''}
    </div>`;
  }

  function changeBookingEquipmentQty(key, delta) {
    const max = BOOKING_EQUIPMENT_OPTIONS.find((e) => e.k === key)?.max || 5;
    appState.bookEqQty[key] = Math.max(0, Math.min(max, (appState.bookEqQty[key] || 0) + delta));
    const el = document.getElementById(`bqn-${key}`);
    if (el) el.textContent = appState.bookEqQty[key];
  }

  function addBookingFood() {
    const input = document.getElementById('bookFoodInp');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    appState.bookFoodItems.push(value);
    input.value = '';
    renderBookingFoodTags();
    input.focus();
  }

  function removeBookingFood(index) {
    appState.bookFoodItems.splice(index, 1);
    renderBookingFoodTags();
  }

  function renderBookingFoodTags() {
    const wrap = document.getElementById('bookFoodTags');
    if (!wrap) return;
    const items = appState.bookFoodItems || [];
    wrap.innerHTML = items.length
      ? items.map((item, i) => `<div style="display:flex;align-items:center;gap:4px;background:#fff;border:.5px solid #C2C7E0;border-radius:20px;padding:3px 9px;font-size:11px;color:#1A1D3A"><span>${item}</span><span onclick="App.removeBookingFood(${i})" style="color:#8890B5;cursor:pointer;font-size:13px">×</span></div>`).join('')
      : '<span style="font-size:11px;color:#8890B5">ยังไม่มีรายการ</span>';
  }

  function onPurposeChange(value) {
    const needsTeacherListAndFood = PURPOSES_NEEDING_TEACHER_LIST_AND_FOOD.has(value);

    const teacherSection = document.getElementById('teacherListSection');
    if (teacherSection) {
      teacherSection.style.display = needsTeacherListAndFood ? 'block' : 'none';
      if (needsTeacherListAndFood) {
        document.querySelectorAll('#teacherListSection input[type=checkbox]').forEach((cb) => {
          cb.onchange = () => {
            const count = document.querySelectorAll('#teacherListSection input[type=checkbox]:checked').length;
            const countEl = document.getElementById('selectedCount');
            if (countEl) countEl.textContent = `เลือก ${count} คน`;
          };
        });
      }
    }

    const foodSection = document.getElementById('foodSection');
    if (foodSection) {
      if (needsTeacherListAndFood) {
        foodSection.style.display = 'block';
        foodSection.style.transition = 'opacity .2s';
        foodSection.style.opacity = '1';
      } else {
        foodSection.style.display = 'none';
        appState.bookFoodItems = [];
        renderBookingFoodTags();
      }
    }
  }

  function syncFormVisuals() {
    const purposeEl = document.getElementById('bkPurpose');
    if (purposeEl) onPurposeChange(purposeEl.value);
    Object.entries(appState.bookEqQty || {}).forEach(([key, qty]) => {
      const el = document.getElementById(`bqn-${key}`);
      if (el) el.textContent = qty;
    });
    renderBookingFoodTags();
  }

  function checkRoomAvail() {
    const room = document.getElementById('bkRoom')?.value;
    const date = document.getElementById('bkDate')?.value;
    const warnBox = document.getElementById('roomWarnBox');
    const warnMsg = document.getElementById('roomWarnMsg');
    if (!warnBox || !warnMsg) return;
    const { bookedTimes } = checkRoomAvailabilityUseCase.execute({ room, date });
    if (bookedTimes.length) {
      warnMsg.textContent = `ห้อง ${room} มีการจองแล้วในวันนี้: ${bookedTimes.join(', ')}`;
      warnBox.style.display = 'flex';
    } else {
      warnBox.style.display = 'none';
    }
  }

  function submitBooking() {
    const room = document.getElementById('bkRoom').value;
    if (!room) { showToast('กรุณาเลือกห้อง', 'e'); return; }
    const date = document.getElementById('bkDate')?.value;
    const start = document.getElementById('bkStart')?.value;
    const end = document.getElementById('bkEnd')?.value;
    if (!date || !start || !end) { showToast('กรุณากรอกวันที่และเวลา', 'e'); return; }
    if (start >= end) { showToast('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น', 'e'); return; }

    const purpose = document.getElementById('bkPurpose')?.value || '-';
    const participants = document.getElementById('bkParticipants')?.value || 10;
    const note = document.getElementById('bkNote')?.value || '';
    const facility = requiresFacilityPanel() ? {
      equipment: { ...(appState.bookEqQty || {}) },
      food: [...(appState.bookFoodItems || [])],
      facilityNote: document.getElementById('bookFacNote')?.value || '',
    } : null;

    showToast('กำลังบันทึก...', 'i');
    setTimeout(() => {
      const result = createBookingUseCase.execute({
        role: appState.role,
        roleName: ROLE_INFO[appState.role].name,
        room, date, start, end, purpose, participants, note,
        approvalMode: appState.approvalMode,
        facility,
      });

      if (!result.success) {
        showConflictModal(result.conflict, { room, date, start, end });
        return;
      }

      appState.lastBookingSnapshot = {
        room, purpose, participants, note,
        equipment: facility ? { ...facility.equipment } : {},
        food: facility ? [...facility.food] : [],
        facilityNote: facility ? facility.facilityNote : '',
      };

      showSuccessModal(result.booking, result.autoApproved);

      if (result.facilityRequest) {
        setTimeout(() => showToast('แจ้งเจ้าหน้าที่เรื่องสิ่งอำนวยฯ แล้ว', 'i'), 600);
      }

      appState.resetBookingScratch();
    }, 800);
  }

  function showConflictModal(conflict, requested) {
    openModal(
      'ไม่สามารถจองได้',
      `<div style="background:#fee2e2;border-radius:10px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:flex-start;gap:10px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:3px">ห้อง ${requested.room} ไม่ว่างในช่วงเวลานี้</div>
          <div style="font-size:11px;color:#b91c1c">วันที่ ${requested.date} · เวลา ${requested.start}–${requested.end}</div>
        </div>
      </div>
      <div style="font-size:12px;font-weight:500;color:#4A4F7A;margin-bottom:8px">การจองที่ขัดแย้ง</div>
      <div style="background:#F4F5FA;border-radius:8px;padding:12px 14px">
        ${[
          ['ห้อง', `ห้อง ${conflict.room}`],
          ['ผู้จอง', conflict.user],
          ['วัตถุประสงค์', conflict.title],
          ['วันที่', conflict.date],
          ['เวลา', conflict.time],
          ['สถานะ', `<span style="background:${conflict.isApproved() ? '#dcfce7' : '#FEF3C7'};color:${conflict.isApproved() ? '#166534' : '#92400e'};padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500">${bookingStatusLongLabel(conflict.status)}</span>`],
        ].map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:.5px solid #D8DBF0">
          <span style="font-size:11px;color:#8890B5">${k}</span>
          <span style="font-size:11px;font-weight:500;color:#1A1D3A">${v}</span>
        </div>`).join('')}
      </div>
      <div style="background:#EEF0FF;border-radius:8px;padding:10px 12px;margin-top:12px;font-size:11px;color:#38419D">
        กรุณาเลือกห้องอื่น หรือเปลี่ยนวันที่/เวลา แล้วลองจองใหม่อีกครั้ง
      </div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ปิด</button>
       <button class="btn btn-p" onclick="App.closeModal();App.navigate('rooms')">ดูห้องว่าง</button>`,
    );
  }

  function showSuccessModal(booking, autoApproved) {
    const roleInfo = ROLE_INFO[appState.role];
    const statusText = autoApproved ? 'อนุมัติแล้ว' : 'รอการอนุมัติ';
    const [start, end] = booking.time.split('-');
    openModal(
      'จองสำเร็จ!',
      `<div style="text-align:center;padding:8px 0 16px">
        <div style="width:56px;height:56px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style="font-size:16px;font-weight:700;color:#1A1D3A;margin-bottom:4px">จองห้องสำเร็จ!</div>
        <div style="font-size:12px;color:#8890B5">${autoApproved ? 'อนุมัติอัตโนมัติแล้ว' : 'รอการอนุมัติจากหัวหน้าภาควิชา'}</div>
      </div>
      <div style="background:#F4F5FA;border-radius:10px;padding:14px 16px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:600;color:#4A4F7A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">รายละเอียดการจอง</div>
        ${[
          ['รหัสการจอง', booking.id],
          ['ห้อง', `ห้อง ${booking.room}`],
          ['ผู้จอง', roleInfo.name],
          ['วันที่', booking.date],
          ['เวลา', `${start} – ${end}`],
          ['วัตถุประสงค์', booking.title],
          ['สถานะ', statusText],
        ].map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:.5px solid #E8EAF0">
          <span style="font-size:11px;color:#8890B5">${k}</span>
          <span style="font-size:11px;font-weight:500;color:#1A1D3A">${v}</span>
        </div>`).join('')}
      </div>
      <div style="background:#EEF0FF;border-radius:8px;padding:10px 14px;font-size:11px;color:#38419D;display:flex;align-items:center;gap:6px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38419D" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        กดปุ่ม "พิมพ์ PDF" เพื่อเก็บเป็นหลักฐานการจอง
      </div>`,
      `<button class="btn btn-o" onclick="App.promptSaveTemplate()">บันทึกเป็นรายการโปรด</button>
       <button class="btn btn-o" onclick="App.closeModal();App.navigate('history')">ดูประวัติ</button>
       <button class="btn btn-p" style="display:flex;align-items:center;gap:6px" onclick="App.printBookingPDF('${booking.id}','${booking.room}','${booking.date}','${start}–${end}','${booking.title}','${roleInfo.name}','${statusText}')">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
         พิมพ์ PDF
       </button>`,
    );
  }

  function printBookingPDF(id, room, date, time, purpose, name, status) {
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`<!DOCTYPE html><html lang="th"><head>
      <meta charset="UTF-8">
      <title>ใบยืนยันการจองห้อง ${id}</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Sarabun,sans-serif;color:#1A1D3A;background:#f8f9ff;padding:30px}
        .page{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
        .header{background:linear-gradient(135deg,#2A2262,#38419D);padding:28px 32px;color:white}
        .logo-row{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .logo-box{width:42px;height:42px;background:rgba(255,255,255,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
        .sys-name{font-size:18px;font-weight:700}
        .sys-sub{font-size:11px;opacity:.65;margin-top:2px}
        .doc-title{font-size:22px;font-weight:700;margin-bottom:4px}
        .doc-id{font-size:13px;opacity:.75}
        .body{padding:28px 32px}
        .status-bar{border-radius:8px;padding:10px 14px;margin-bottom:22px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px}
        .status-approved{background:#dcfce7;color:#166534}
        .status-pending{background:#FEF3C7;color:#92400e}
        .section-title{font-size:11px;font-weight:600;color:#8890B5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
        .info-table{width:100%;border-collapse:collapse;margin-bottom:24px}
        .info-table td{padding:10px 0;border-bottom:.5px solid #E8EAF0;font-size:13px}
        .info-table td:first-child{color:#8890B5;width:40%}
        .info-table td:last-child{font-weight:500;color:#1A1D3A}
        .footer{padding:18px 32px;background:#F4F5FA;border-top:.5px solid #E8EAF0;font-size:11px;color:#8890B5;display:flex;justify-content:space-between;align-items:center}
        .stamp{border:2px solid ${status === 'อนุมัติแล้ว' ? '#166534' : '#92400e'};color:${status === 'อนุมัติแล้ว' ? '#166534' : '#92400e'};border-radius:8px;padding:6px 16px;font-size:13px;font-weight:700;letter-spacing:.05em;display:inline-block;transform:rotate(-3deg);margin-top:4px}
        @media print{body{background:white;padding:0}.page{box-shadow:none;border-radius:0}button{display:none}}
      </style>
    </head><body>
      <div class="page">
        <div class="header">
          <div class="logo-row">
            <div class="logo-box">🏠</div>
            <div><div class="sys-name">CPSU Rooms</div><div class="sys-sub">ภาควิชาวิทยาการคอมพิวเตอร์ · มหาวิทยาลัยศิลปากร</div></div>
          </div>
          <div class="doc-title">ใบยืนยันการจองห้อง</div>
          <div class="doc-id">รหัสการจอง: ${id}</div>
        </div>
        <div class="body">
          <div class="status-bar ${status === 'อนุมัติแล้ว' ? 'status-approved' : 'status-pending'}">
            ${status === 'อนุมัติแล้ว' ? '✓ การจองได้รับการอนุมัติแล้ว' : '⏳ การจองอยู่ระหว่างรอการอนุมัติ'}
          </div>
          <div class="section-title">รายละเอียดการจอง</div>
          <table class="info-table">
            <tr><td>รหัสการจอง</td><td>${id}</td></tr>
            <tr><td>ห้องที่จอง</td><td>ห้อง ${room} · ชั้น 6 อาคาร 1</td></tr>
            <tr><td>ผู้จอง</td><td>${name}</td></tr>
            <tr><td>วันที่</td><td>${date}</td></tr>
            <tr><td>เวลา</td><td>${time}</td></tr>
            <tr><td>วัตถุประสงค์</td><td>${purpose}</td></tr>
            <tr><td>สถานะ</td><td><span class="stamp">${status}</span></td></tr>
            <tr><td>วันที่ออกเอกสาร</td><td>${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          </table>
          <div style="background:#EEF0FF;border-radius:8px;padding:12px 14px;font-size:12px;color:#38419D;margin-bottom:20px">
            <strong>หมายเหตุ:</strong> กรุณาแสดงเอกสารนี้ต่อเจ้าหน้าที่ก่อนเข้าใช้ห้อง หากมีข้อสงสัยติดต่อได้ที่ภาควิชาวิทยาการคอมพิวเตอร์
          </div>
          <div style="text-align:center">
            <button onclick="window.print()" style="padding:10px 28px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;margin-right:8px">🖨️ พิมพ์ / บันทึก PDF</button>
            <button onclick="window.close()" style="padding:10px 20px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:8px;font-size:13px;cursor:pointer;font-family:Sarabun,sans-serif">ปิด</button>
          </div>
        </div>
        <div class="footer">
          <span>ระบบจองห้อง CPSU · ภาควิชาวิทยาการคอมพิวเตอร์</span>
          <span>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</span>
        </div>
      </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.focus(), 300);
  }

  return {
    render,
    changeBookingEquipmentQty,
    addBookingFood,
    removeBookingFood,
    onPurposeChange,
    syncFormVisuals,
    checkRoomAvail,
    submitBooking,
    printBookingPDF,
  };
}
