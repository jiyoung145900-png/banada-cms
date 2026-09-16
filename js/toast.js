/**
 * 토스트 알림 - 어디서든 import 해서 사용
 */
const CONTAINER_ID = 'toastContainer';

function ensureContainer() {
  let c = document.getElementById(CONTAINER_ID);
  if (!c) {
    c = document.createElement('div');
    c.id = CONTAINER_ID;
    document.body.appendChild(c);
  }
  return c;
}

export function toast(message, type = 'info', duration = 2500) {
  const container = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type] || 'ℹ';
  el.innerHTML = `<span style="font-weight:bold;">${icon}</span> <span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  }, duration);
}
