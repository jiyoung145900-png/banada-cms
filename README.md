# 🎯 BANADA 데이터 센터 CMS

BANADA 프로젝트 데이터 관리를 위한 SPA(단일 페이지 앱) 대시보드.

## 📁 프로젝트 구조

```
banada-cms/
├── index.html              ← SPA 껍데기 (사이드바 + 상단바 + 콘텐츠 영역)
├── assets/
│   └── logo.webp           ← BANADA 로고
├── css/
│   └── common.css          ← 공통 스타일 (다크 테마 · 로즈골드)
├── js/
│   ├── app.js              ← 진입점
│   ├── menu-config.js      ← 메뉴 구조 (← 새 메뉴 추가 시 이 파일만!)
│   ├── router.js           ← SPA 라우터 (해시 기반)
│   └── toast.js            ← 토스트 알림 유틸
└── pages/
    ├── main.html           ← 메인 대시보드
    ├── main.js             ← (선택) 페이지 전용 스크립트
    ├── members-all.html    ← 전체 회원 조회
    ├── members-all.js
    └── ...                 ← 나머지 20개 페이지
```

## 🚀 실행 방법

### VSCode에서 실행 (권장)

1. VSCode에 **Live Server** 확장 설치
   - Extensions 탭 → "Live Server" 검색 → Install
2. `index.html` 우클릭 → **Open with Live Server**
3. 브라우저가 자동으로 열림 (http://127.0.0.1:5500)

### 또는 Python 간이 서버

```bash
cd banada-cms
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

> ⚠️ `index.html`을 직접 더블클릭하면 **CORS 오류로 안 됨** (ES 모듈 때문).
> 반드시 Live Server 같은 HTTP 서버로 실행해야 함.

## ✏️ 페이지 편집 워크플로

### 기존 페이지 내용 수정
`pages/main.html` 같은 파일을 직접 열어서 HTML 편집.

### 새 페이지 추가
1. `pages/new-page.html` 생성
2. `js/menu-config.js`에 메뉴 항목 추가:
```javascript
{ id: 'new-page', label: '새 페이지', page: 'new-page' }
```
3. (선택) `pages/new-page.js` 만들어서 페이지 전용 로직 추가:
```javascript
export function init(container) {
  container.querySelector('#my-button')?.addEventListener('click', ...);
}
```

### 페이지 전용 JS
`pages/xxx.html`에 매칭되는 `pages/xxx.js`가 있으면 라우터가 자동으로 로드하고 `init(containerEl)` 함수를 호출.

## 🎨 스타일 가이드

### 컬러 (CSS 변수)
- `--bg-body` `#1a1a1a` - 배경
- `--bg-panel` `#2c2c2c` - 카드/패널
- `--accent-gold` `#ffdd66` - 강조색 (로즈골드)
- `--accent-green` `#4CAF50` - 성공
- `--accent-red` `#ff5252` - 경고/에러

### 공통 컴포넌트
- `.card` - 카드 컨테이너
- `.kpi-card` - KPI 지표 카드
- `.data-table` - 데이터 테이블
- `.badge.success` / `.warning` / `.error` / `.info` / `.gold` - 상태 뱃지
- `.btn.btn-primary` / `.btn-secondary` / `.btn-danger` - 버튼
- `.search-box` - 검색바

### 토스트 알림 (JS)
```javascript
import { toast } from '../js/toast.js';
toast('저장되었습니다', 'success');
toast('오류가 발생했습니다', 'error');
```

## 🔗 URL & 새로고침

- 각 페이지는 `#page=xxx` 해시로 관리
- 예: `http://localhost:8000/#page=members-all`
- 새로고침해도 현재 페이지 유지
- 뒤로가기 버튼도 정상 동작

## 📋 메뉴 구조 (총 21개 페이지)

- **📊 대시보드**: 메인 대시보드
- **👥 회원 관리**: 전체 회원 · 신규 승인 · 탈퇴 · VIP
- **💫 매칭·주문**: 매칭 현황 · 주문 · 결제 · 인증
- **💬 상담·문의**: 실시간 상담 · 문의 · 지역별 요청
- **🎉 이벤트**: 이벤트 관리 · 참여 현황
- **📈 데이터·통계**: 트래픽 · 매출 · 포인트 · 오류 로그
- **⚙️ 시스템**: 관리자 · 로그인 이력 · 설정

## 🚧 개발 상태

- ✅ SPA 라우팅 & 사이드바
- ✅ 메인 대시보드 (샘플 데이터)
- ✅ 전체 회원 조회 (샘플 + 검색 기능)
- 🚧 나머지 19개 페이지 (스켈레톤만 있음, 편집 필요)

## 🔮 다음 단계 아이디어

- Firebase Firestore 연동 (실제 데이터)
- 관리자 로그인
- Chart.js로 차트 페이지
- Firestore 실시간 업데이트
