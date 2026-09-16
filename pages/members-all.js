/**
 * pages/members-all.js
 * 전체 회원 조회 페이지 전용 스크립트
 * 
 * export const init = (containerEl) => { ... }
 * 라우터가 페이지 로드 후 자동으로 init() 호출
 */
import { toast } from '../js/toast.js';

export function init(container) {
  // 검색
  const searchInput = container.querySelector('#search-input');
  const table = container.querySelector('#members-table tbody');

  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    table?.querySelectorAll('tr').forEach(tr => {
      const text = tr.textContent.toLowerCase();
      tr.style.display = !q || text.includes(q) ? '' : 'none';
    });
  });

  // CSV 내보내기
  container.querySelector('#btn-export')?.addEventListener('click', () => {
    toast('CSV 파일을 준비 중입니다...', 'info');
    // 실제 구현: Firestore에서 데이터 가져와 CSV 생성
    setTimeout(() => toast('CSV 파일을 다운로드했습니다.', 'success'), 800);
  });

  // 필터
  container.querySelector('#btn-filter')?.addEventListener('click', () => {
    toast('필터 기능은 곧 추가됩니다.', 'info');
  });

  // 상세 버튼
  container.querySelectorAll('.data-table .btn-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      const name = row?.querySelector('td:nth-child(3)')?.textContent;
      toast(`${name}님의 상세 정보를 조회합니다.`, 'info');
    });
  });
}
