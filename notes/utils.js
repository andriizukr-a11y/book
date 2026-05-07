/* ---------- NOTES UTILS ---------- */

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'щойно';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} хв тому`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} год тому`;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  if (d.getFullYear() === now.getFullYear()) {
    return `${day}.${month} ${hours}:${minutes}`;
  }
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function getEditTime() {
  const ts = getNotesTimestamps();
  const stamp = ts[notesActiveTopic];
  return stamp ? `${formatDate(stamp)}` : '';
}

function showConfirm(message, onConfirm) {
  const existing = document.querySelector('.notes-confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'notes-confirm-overlay';
  overlay.innerHTML = `
    <div class="notes-confirm-box">
      <div class="notes-confirm-msg">${escapeHtml(message)}</div>
      <div class="notes-confirm-btns">
        <button class="notes-confirm-cancel">Скасувати</button>
        <button class="notes-confirm-ok">Видалити</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('.notes-confirm-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.notes-confirm-ok').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.remove();
  });

  document.querySelector('.notes-layout').appendChild(overlay);
  overlay.querySelector('.notes-confirm-cancel').focus();
}

function showToast(message) {
  const existing = document.querySelector('.notes-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'notes-toast';
  toast.textContent = message;
  document.querySelector('.notes-layout').appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
