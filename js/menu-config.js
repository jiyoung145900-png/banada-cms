/**
 * BANADA 데이터 센터 - 메뉴 구조
 * 새 메뉴 추가 시 이 파일만 수정
 */
export const MENU_STRUCTURE = [
  {
    id: 'main',
    label: '메인',
    icon: '🏠',
    items: [
      { id: 'main', label: '메인 화면', page: 'main' },
    ],
  },
  {
    id: 'matching',
    label: '매칭/고객 상태',
    icon: '💫',
    items: [
      { id: 'orders', label: '주문 상태', page: 'orders' },
      { id: 'auth',   label: '인증 상태', page: 'auth' },
    ],
  },
  {
    id: 'support',
    label: '상담/문의',
    icon: '💬',
    items: [
      { id: 'inquiries',       label: '직무 문의', page: 'inquiries' },
      { id: 'region-requests', label: '전국 만남', page: 'region-requests' },
    ],
  },
  {
    id: 'data',
    label: '관리/데이터',
    icon: '📊',
    items: [
      { id: 'traffic-live',    label: '실시간 데이터', page: 'traffic-live' },
      { id: 'error-logs',      label: '실시간 오류',   page: 'error-logs' },
      { id: 'revenue',         label: '데이터 분석',   page: 'revenue' },
      { id: 'points',          label: '포인트 조회',   page: 'points' },
      { id: 'entertainment',   label: '유흥 관리',     page: 'entertainment' },
      { id: 'members-all',     label: '회원 관리',     page: 'members-all' },
      { id: 'members-approve', label: '회원 승인',     page: 'members-approve' },
      { id: 'members-leave',   label: '회원 탈퇴',     page: 'members-leave' },
      { id: 'members-vip',     label: '담당 실장',     page: 'members-vip' },
    ],
  },
];

// 페이지 ID로 메뉴 정보 찾기
export function findMenuByPage(pageId) {
  for (const group of MENU_STRUCTURE) {
    for (const item of group.items) {
      if (item.page === pageId) return { group, item };
    }
  }
  return null;
}

// 기본 페이지
export const DEFAULT_PAGE = 'main';
