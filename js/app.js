/**
 * BANADA 데이터 센터 - 메인 진입점
 */
import { renderSidebar, initRouter } from './router.js';

// ─────────── 실시간 시계 ───────────
function initClock() {
  const el = document.getElementById('topbar-time');
  if (!el) return;
  const update = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    el.textContent = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  update();
  setInterval(update, 1000);
}

// ─────────── 앱 초기화 ───────────
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  initRouter();
  initClock();
});
