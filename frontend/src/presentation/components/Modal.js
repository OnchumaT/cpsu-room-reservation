// Modal — single-responsibility: the one shared modal shell every view
// reuses (matches the single #modalOv element in index.html).

export function openModal(title, bodyHtml, footHtml) {
  document.getElementById('mTitle').textContent = title;
  document.getElementById('mBody').innerHTML = bodyHtml;
  document.getElementById('mFoot').innerHTML = footHtml || '<button class="btn btn-o" onclick="App.closeModal()">ปิด</button>';
  document.getElementById('modalOv').style.display = 'flex';
}

export function closeModal() {
  document.getElementById('modalOv').style.display = 'none';
}
