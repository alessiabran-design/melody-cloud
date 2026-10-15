export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function openSheet(innerHtml, { onMount } = {}) {
  closeSheet();
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.id = 'active-sheet';
  overlay.innerHTML = `<div class="sheet">${innerHtml}</div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });
  document.body.appendChild(overlay);
  if (onMount) onMount(overlay);
  return overlay;
}

export function closeSheet() {
  const el = document.getElementById('active-sheet');
  if (el) el.remove();
}

export function formatRelative(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays <= 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
