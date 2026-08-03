import { IC } from '../../shared/icons.js';
import { BOOKING_PURPOSES, TEACHER_ONLY_PURPOSES, OTHER_PURPOSE } from '../../shared/constants.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { openModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';

const TPL_EQUIPMENT_NAMES = { mic: 'ไมโครโฟน', wb: 'ไวท์บอร์ด', ext: 'ปลั๊กพ่วง', hdmi: 'สาย HDMI' };
const TPL_EQUIPMENT_MAX = { mic: 3, wb: 2, ext: 5, hdmi: 4 };

export function createTemplatesView({
  appState, roomRepository, templateRepository,
  saveTemplateUseCase, applyTemplateUseCase, updateTemplateUseCase, duplicateTemplateUseCase, deleteTemplateUseCase,
  router,
}) {
  // Modal-scoped scratch state for the "edit template" equipment/food
  // editor — module-private (not on `window`, unlike the old code's
  // equivalent editEqQty/editFoodItems globals).
  let editEqQty = {};
  let editFoodItems = [];

  async function load() {
    await Promise.all([templateRepository.refresh(), roomRepository.refresh()]);
  }

  function render() {
    const list = templateRepository.getAll();
    return `
    <div class="sec-hdr"><span class="sec-ttl">เทมเพลตการจองของฉัน (${list.length})</span></div>
    ${list.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:18px">
      ${list.map(templateCard).join('')}
    </div>` : `<div style="text-align:center;padding:50px 20px;color:#8890B5">
      <div style="display:flex;justify-content:center;margin-bottom:10px;color:#D8DBF0">${IC.bookmark}</div>
      <div style="font-size:13px;font-weight:500;color:#4A4F7A;margin-bottom:4px">ยังไม่มีเทมเพลตการจอง</div>
      <div style="font-size:12px;margin-bottom:14px">จองห้องให้สำเร็จ แล้วกด "บันทึกเป็นรายการโปรด" เพื่อสร้างเทมเพลตแรกของคุณ</div>
      <button class="btn btn-p" onclick="App.navigate('book')">ไปจองห้อง</button>
    </div>`}`;
  }

  function templateCard(template) {
    const room = roomRepository.findById(template.room);
    const eqBadges = Object.entries(template.equipment || {}).filter(([, qty]) => qty > 0).map(([key, qty]) => `${TPL_EQUIPMENT_NAMES[key] || key} ${qty}`);
    const badges = [...eqBadges, ...(template.food || [])];
    return `<div style="background:#fff;border-radius:16px;padding:22px 24px;box-shadow:0 1px 3px rgba(42,34,98,.07),0 4px 16px rgba(42,34,98,.05)">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
        <div style="width:46px;height:46px;border-radius:12px;background:#EEF0FF;color:#38419D;display:flex;align-items:center;justify-content:center;flex-shrink:0">${IC.bookmark}</div>
        <div style="min-width:0">
          <div style="font-size:16px;font-weight:600;color:#1A1D3A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${template.name}</div>
          <div style="font-size:12.5px;color:#8890B5;margin-top:3px">${room ? room.name : `ห้อง ${template.room}`} · ${template.purpose} · ${template.participants || 10} คน</div>
        </div>
      </div>
      ${badges.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">${badges.map((b) => `<span style="font-size:11px;background:#F4F5FA;color:#4A4F7A;padding:4px 11px;border-radius:20px;border:.5px solid #E8EAF0">${b}</span>`).join('')}</div>` : '<div style="margin-bottom:16px"></div>'}
      <button onclick="App.bookFromTemplate('${template.id}')" style="width:100%;padding:11px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;margin-bottom:10px">จองจากเทมเพลต</button>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="App.showRenameTemplate('${template.id}')" style="flex:1;min-width:90px;padding:9px 12px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:9px;font-size:12px;cursor:pointer;font-family:Sarabun,sans-serif">แก้ไขชื่อ</button>
        <button onclick="App.showEditTemplate('${template.id}')" style="flex:1;min-width:90px;padding:9px 12px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:9px;font-size:12px;cursor:pointer;font-family:Sarabun,sans-serif">แก้ไขข้อมูล</button>
        <button onclick="App.duplicateTemplate('${template.id}')" style="flex:1;min-width:90px;padding:9px 12px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:9px;font-size:12px;cursor:pointer;font-family:Sarabun,sans-serif">ทำสำเนา</button>
        <button onclick="App.deleteTemplate('${template.id}')" style="padding:9px 16px;background:#fee2e2;color:#991b1b;border:.5px solid #fca5a5;border-radius:9px;font-size:12px;cursor:pointer;font-family:Sarabun,sans-serif">ลบ</button>
      </div>
    </div>`;
  }

  async function bookFromTemplate(templateId) {
    const result = await applyTemplateUseCase.execute({ templateId });
    if (!result.success) { showToast('ไม่พบเทมเพลต', 'e'); return; }
    appState.templateToApply = result.draft;
    router.navigate('book');
  }

  async function duplicateTemplate(templateId) {
    await duplicateTemplateUseCase.execute({ templateId });
    showToast('ทำสำเนาเทมเพลตแล้ว', 's');
    router.navigate('templates');
  }

  async function deleteTemplate(templateId) {
    if (!confirm('ต้องการลบเทมเพลตนี้หรือไม่?')) return;
    await deleteTemplateUseCase.execute({ templateId });
    showToast('ลบเทมเพลตแล้ว', 'i');
    router.navigate('templates');
  }

  function promptSaveTemplate() {
    const snapshot = appState.lastBookingSnapshot;
    if (!snapshot) { showToast('ไม่พบข้อมูลการจองล่าสุด', 'e'); return; }
    const suggested = `${snapshot.purpose} · ห้อง ${snapshot.room}`;
    openModal(
      'บันทึกเป็นรายการโปรด',
      `<div class="form-group"><label class="form-label">ชื่อเทมเพลต *</label><input class="form-control" id="tplName" value="${suggested}" placeholder="เช่น สอน CS301 ห้อง 1637"></div>
       <div style="background:#EEF0FF;border-radius:8px;padding:10px 12px;font-size:11px;color:#38419D">จะไม่บันทึกวันที่และเวลา — ต้องเลือกวันที่และเวลาใหม่ทุกครั้งตอนจองจากเทมเพลตนี้</div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ยกเลิก</button>
       <button class="btn btn-p" onclick="App.saveTemplateFromSnapshot()">บันทึก</button>`,
    );
  }

  async function saveTemplateFromSnapshot() {
    const name = document.getElementById('tplName')?.value?.trim();
    if (!name) { showToast('กรุณาตั้งชื่อเทมเพลต', 'e'); return; }
    const result = await saveTemplateUseCase.execute({ name, snapshot: appState.lastBookingSnapshot });
    if (!result.success) { showToast('กรุณาตั้งชื่อเทมเพลต', 'e'); return; }
    closeModal();
    showToast('บันทึกเทมเพลตเรียบร้อย', 's');
  }

  function showRenameTemplate(templateId) {
    const template = templateRepository.findById(templateId);
    if (!template) return;
    openModal(
      'แก้ไขชื่อเทมเพลต',
      `<div class="form-group"><label class="form-label">ชื่อเทมเพลต *</label><input class="form-control" id="tplRenameInp" value="${template.name}"></div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ยกเลิก</button>
       <button class="btn btn-p" onclick="App.saveRenameTemplate('${templateId}')">บันทึก</button>`,
    );
  }

  async function saveRenameTemplate(templateId) {
    const name = document.getElementById('tplRenameInp')?.value?.trim();
    if (!name) { showToast('กรุณาตั้งชื่อเทมเพลต', 'e'); return; }
    const result = await updateTemplateUseCase.rename({ templateId, name });
    if (!result.success) return;
    closeModal();
    showToast('เปลี่ยนชื่อเทมเพลตแล้ว', 's');
    router.navigate('templates');
  }

  function showEditTemplate(templateId) {
    const template = templateRepository.findById(templateId);
    if (!template) return;
    const showFacilityFields = BookingPermissionPolicy.canRequestFacilities(appState.role, appState.canApprove);
    editEqQty = { mic: 0, wb: 0, ext: 0, hdmi: 0, ...(template.equipment || {}) };
    editFoodItems = [...(template.food || [])];
    const purposes = [...BOOKING_PURPOSES, ...(showFacilityFields ? TEACHER_ONLY_PURPOSES : []), OTHER_PURPOSE];

    const facilityHtml = showFacilityFields ? `
      <div style="border-top:0.5px solid #D8DBF0;margin:12px 0 10px"></div>
      <div style="font-size:11px;font-weight:600;color:#4A4F7A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">ขอสิ่งอำนวยความสะดวกเพิ่มเติม</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
        ${Object.entries(TPL_EQUIPMENT_NAMES).map(([key, name]) => `
        <div style="background:#F4F5FA;border:0.5px solid #D8DBF0;border-radius:8px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:11px;font-weight:500;color:#1A1D3A">${name}</span>
          <div style="display:flex;align-items:center;gap:5px">
            <button onclick="App.changeTemplateEquipmentQty('${key}',-1)" style="width:22px;height:22px;border:0.5px solid #C2C7E0;border-radius:5px;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
            <span id="tplEq-${key}" style="font-size:12px;font-weight:600;min-width:16px;text-align:center;color:#38419D">${editEqQty[key] || 0}</span>
            <button onclick="App.changeTemplateEquipmentQty('${key}',1)" style="width:22px;height:22px;border:0.5px solid #C2C7E0;border-radius:5px;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">+</button>
          </div>
        </div>`).join('')}
      </div>
      <div class="form-group">
        <label class="form-label">อาหาร / เครื่องดื่ม (พิมพ์แล้วกด Enter)</label>
        <div style="border:0.5px solid #C2C7E0;border-radius:8px;overflow:hidden">
          <div style="display:flex">
            <input type="text" id="tplFoodInp" placeholder="เช่น กาแฟร้อน 5 แก้ว..." style="flex:1;border:none;padding:8px 10px;font-size:12px;font-family:Sarabun,sans-serif;outline:none;color:#1A1D3A" onkeydown="if(event.key==='Enter')App.addTemplateFood()">
            <button onclick="App.addTemplateFood()" style="padding:0 12px;background:#38419D;color:white;border:none;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif;font-weight:500">+ เพิ่ม</button>
          </div>
          <div id="tplFoodTags" style="display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;background:#F4F5FA;min-height:34px"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">หมายเหตุถึงเจ้าหน้าที่</label>
        <textarea class="form-control" id="tplFacilityNote" rows="2" placeholder="เช่น ต้องการก่อน 08:30 น. / มีผู้แพ้อาหาร...">${template.facilityNote || ''}</textarea>
      </div>` : '';

    openModal(
      'แก้ไขข้อมูลเทมเพลต',
      `<div class="form-group"><label class="form-label">ชื่อเทมเพลต *</label><input class="form-control" id="tplEditName" value="${template.name}"></div>
       <div class="form-group"><label class="form-label">ห้อง *</label>
         <select class="form-control" id="tplEditRoom">${roomRepository.getAll().map((r) => `<option value="${r.id}"${r.id === template.room ? ' selected' : ''}>${r.name}</option>`).join('')}</select>
       </div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
         <div class="form-group"><label class="form-label">วัตถุประสงค์ *</label>
           <select class="form-control" id="tplEditPurpose">${purposes.map((p) => `<option value="${p}"${p === template.purpose ? ' selected' : ''}>${p}</option>`).join('')}</select>
         </div>
         <div class="form-group"><label class="form-label">จำนวนผู้เข้าร่วม</label>
           <input type="number" class="form-control" id="tplEditParticipants" value="${template.participants || 10}" min="1" max="20">
         </div>
       </div>
       <div class="form-group"><label class="form-label">รายละเอียดเพิ่มเติม</label>
         <textarea class="form-control" id="tplEditNote" rows="2">${template.note || ''}</textarea>
       </div>
       ${facilityHtml}`,
      `<button class="btn btn-o" onclick="App.closeModal()">ยกเลิก</button>
       <button class="btn btn-p" onclick="App.saveTemplateEdit('${templateId}')">บันทึก</button>`,
    );
    renderTemplateFoodTags();
  }

  function changeTemplateEquipmentQty(key, delta) {
    const max = TPL_EQUIPMENT_MAX[key] || 5;
    editEqQty[key] = Math.max(0, Math.min(max, (editEqQty[key] || 0) + delta));
    const el = document.getElementById(`tplEq-${key}`);
    if (el) el.textContent = editEqQty[key];
  }

  function addTemplateFood() {
    const input = document.getElementById('tplFoodInp');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    editFoodItems.push(value);
    input.value = '';
    renderTemplateFoodTags();
    input.focus();
  }

  function removeTemplateFood(index) {
    editFoodItems.splice(index, 1);
    renderTemplateFoodTags();
  }

  function renderTemplateFoodTags() {
    const wrap = document.getElementById('tplFoodTags');
    if (!wrap) return;
    wrap.innerHTML = editFoodItems.length
      ? editFoodItems.map((item, i) => `<div style="display:flex;align-items:center;gap:4px;background:#fff;border:.5px solid #C2C7E0;border-radius:20px;padding:3px 9px;font-size:11px;color:#1A1D3A"><span>${item}</span><span onclick="App.removeTemplateFood(${i})" style="color:#8890B5;cursor:pointer;font-size:13px">×</span></div>`).join('')
      : '<span style="font-size:11px;color:#8890B5">ยังไม่มีรายการ</span>';
  }

  async function saveTemplateEdit(templateId) {
    const name = document.getElementById('tplEditName')?.value?.trim();
    const room = document.getElementById('tplEditRoom')?.value;
    const purpose = document.getElementById('tplEditPurpose')?.value;
    if (!name || !room || !purpose) { showToast('กรุณากรอกข้อมูลให้ครบ', 'e'); return; }

    const changes = {
      name, room, purpose,
      participants: Number(document.getElementById('tplEditParticipants')?.value) || 10,
      note: document.getElementById('tplEditNote')?.value || '',
      equipment: { ...editEqQty },
      food: [...editFoodItems],
    };
    const facilityNoteEl = document.getElementById('tplFacilityNote');
    if (facilityNoteEl) changes.facilityNote = facilityNoteEl.value || '';

    const result = await updateTemplateUseCase.execute({ templateId, changes });
    if (!result.success) { showToast('กรุณากรอกข้อมูลให้ครบ', 'e'); return; }
    closeModal();
    showToast('บันทึกเทมเพลตเรียบร้อย', 's');
    router.navigate('templates');
  }

  return {
    render,
    load,
    bookFromTemplate,
    duplicateTemplate,
    deleteTemplate,
    promptSaveTemplate,
    saveTemplateFromSnapshot,
    showRenameTemplate,
    saveRenameTemplate,
    showEditTemplate,
    changeTemplateEquipmentQty,
    addTemplateFood,
    removeTemplateFood,
    saveTemplateEdit,
  };
}
