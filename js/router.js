/**
 * BANADA 데이터 센터 - SPA 라우터
 * 
 * 페이지 fragment(HTML)을 fetch로 불러와서 #app-content에 삽입
 * URL 해시(#page=xxx)로 페이지 상태 관리 → 새로고침해도 유지
 */
import { MENU_STRUCTURE, findMenuByPage, DEFAULT_PAGE } from './menu-config.js';
import { toast } from './toast.js';

// ─────────── 상태 ───────────
let currentPage = null;
const pageCache = new Map();  // 페이지 HTML 캐시

// ─────────── DOM ───────────
const contentEl = document.getElementById('app-content');
const breadcrumbEl = document.getElementById('breadcrumb');
const sidebarMenuEl = document.getElementById('sidebar-menu');

// ─────────── 사이드바 렌더링 ───────────
export function renderSidebar() {
  if (!sidebarMenuEl) return;
  sidebarMenuEl.innerHTML = MENU_STRUCTURE.map(group => `
    <div class="menu-group">
      <div class="menu-group-label">
        <span class="icon">${group.icon}</span>
        <span>${group.label}</span>
      </div>
      ${group.items.map(item => `
        <a class="menu-item" data-page="${item.page}" href="#page=${item.page}">
          ${item.label}
        </a>
      `).join('')}
    </div>
  `).join('');

  // 클릭 이벤트 (해시 변경으로 처리)
  sidebarMenuEl.addEventListener('click', (e) => {
    const link = e.target.closest('.menu-item');
    if (!link) return;
    // 브라우저 기본 해시 변경 → hashchange 이벤트 발생 → loadPageFromHash 호출됨
  });
}

// ─────────── 활성 메뉴 표시 ───────────
function setActiveMenu(pageId) {
  document.querySelectorAll('.menu-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
}

// ─────────── 브레드크럼 렌더링 ───────────
function renderBreadcrumb(pageId) {
  if (!breadcrumbEl) return;
  const found = findMenuByPage(pageId);
  if (!found) {
    breadcrumbEl.innerHTML = `<span class="current">알 수 없는 페이지</span>`;
    return;
  }
  breadcrumbEl.innerHTML = `
    <span>${found.group.icon}</span>
    <span>${found.group.label}</span>
    <span class="separator">›</span>
    <span class="current">${found.item.label}</span>
  `;
  document.title = `${found.item.label} · BANADA 데이터 센터`;
}

// ─────────── 페이지 로드 ───────────
async function loadPage(pageId) {
  if (!contentEl) return;
  
  const found = findMenuByPage(pageId);
  if (!found) {
    pageId = DEFAULT_PAGE;
  }

  currentPage = pageId;
  setActiveMenu(pageId);
  renderBreadcrumb(pageId);

  // 로딩 표시
  contentEl.innerHTML = `<div class="loading">📂 페이지를 불러오는 중...</div>`;

  try {
    let html;
    if (pageCache.has(pageId)) {
      html = pageCache.get(pageId);
    } else {
      const res = await fetch(`pages/${pageId}.html`);
      if (!res.ok) throw new Error(`페이지를 찾을 수 없습니다 (${res.status})`);
      html = await res.text();
      pageCache.set(pageId, html);
    }
    contentEl.innerHTML = html;

    // 페이지별 초기화 스크립트가 있으면 실행
    try {
      const mod = await import(`../pages/${pageId}.js`);
      if (typeof mod.init === 'function') {
        mod.init(contentEl);
      }
    } catch (e) {
      // 페이지 전용 JS가 없는 건 정상 (오류 아님)
      if (!e.message.includes('Failed to fetch') && !e.message.includes('not found')) {
        console.warn(`[${pageId}] 초기화 스크립트 로드 실패:`, e);
      }
    }
  } catch (err) {
    console.error(err);
    contentEl.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <div class="text">페이지를 불러올 수 없습니다: ${err.message}</div>
        <div style="margin-top: 12px; color: var(--text-muted); font-size: 12px;">
          pages/${pageId}.html 파일이 있는지 확인해주세요.
        </div>
      </div>`;
    toast(`페이지 로드 실패: ${pageId}`, 'error');
  }
}

// ─────────── URL 해시 처리 ───────────
function getPageFromHash() {
  const hash = window.location.hash.slice(1);  // '#' 제거
  const params = new URLSearchParams(hash);
  return params.get('page') || DEFAULT_PAGE;
}

function loadPageFromHash() {
  const pageId = getPageFromHash();
  if (pageId !== currentPage) {
    loadPage(pageId);
  }
}

// ─────────── 초기화 ───────────
export function initRouter() {
  window.addEventListener('hashchange', loadPageFromHash);
  loadPageFromHash();  // 초기 페이지 로드
}

// 외부에서 프로그래밍적으로 페이지 이동
export function navigate(pageId) {
  window.location.hash = `page=${pageId}`;
}

// 캐시 무효화 (개발 시 유용)
export function clearPageCache(pageId = null) {
  if (pageId) pageCache.delete(pageId);
  else pageCache.clear();
}
