// Toast — single-responsibility: show a transient notification bubble.

export function showToast(message, type = 'i') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const color = type === 's' ? '#16a34a' : type === 'e' ? '#ef4444' : '#38419D';
  const icon = type === 's'
    ? '<polyline points="20 6 9 17 4 12"/>'
    : type === 'e'
      ? '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
      : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
  el.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5">${icon}</svg>${message}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2500);
  setTimeout(() => el.remove(), 3000);
}
