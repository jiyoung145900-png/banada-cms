/**
 * 실시간 데이터 페이지 - 편집 기능 통합
 *
 * 포함 기능:
 * - Ctrl/Cmd 드래그로 셀 다중 선택
 * - 색상 팔레트 40색 (글자색/배경색)
 * - 폰트 크기 조절
 * - 문구 편집 (상단/하단)
 * - 행/열 추가·삭제
 * - 복사·붙여넣기
 * - 자동저장 (localStorage)
 * - Undo/Redo (Ctrl+Z, Ctrl+Y, 50단계)
 * - 이미지 다운로드 (선택 영역 / 전체)
 * - 토스트 알림
 * - ESC로 선택 해제
 */
import { toast } from '../js/toast.js';

// html2canvas 동적 로드
function loadHtml2canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const s = document.createElement('script');
    s.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => reject(new Error('html2canvas 로드 실패'));
    document.head.appendChild(s);
  });
}

// 페이지 전용 CSS 로드
function loadPageCss() {
  const HREF = 'css/traffic-live.css';
  if (document.querySelector(`link[href="${HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = HREF;
  document.head.appendChild(link);
}

// ═══════════════════════════════════════════════
export function init(container) {
  loadPageCss();
  loadHtml2canvas().catch(() => toast('이미지 다운로드 기능을 준비하지 못했습니다.', 'warning'));

  // ── DOM ──
  const table = container.querySelector('#rtdTable');
  const selectionBox = container.querySelector('#selectionBox');
  const palette = container.querySelector('#rtdPalette');
  const noticeTop = container.querySelector('#rtdNoticeTop');
  const noticeBottom = container.querySelector('#rtdNoticeBottom');
  const editTop = container.querySelector('#rtdEditTop');
  const editBottom = container.querySelector('#rtdEditBottom');
  const fontSizeInput = container.querySelector('#rtdFontSize');
  const saveStatus = container.querySelector('#rtdSaveStatus');
  const undoBtn = container.querySelector('#rtdUndoBtn');
  const redoBtn = container.querySelector('#rtdRedoBtn');
  const toolsEl = container.querySelector('#rtdTools');
  const submenu = container.querySelector('#rtdSubmenu');

  // ── 상수 ──
  const COLORS = [
    '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF',
    '#FFA500', '#800080', '#008000', '#808000', '#000080', '#800000', '#C0C0C0', '#808080',
    '#FF4500', '#ADFF2F', '#1E90FF', '#FFD700', '#20B2AA', '#E9967A', '#9400D3', '#FF69B4',
    '#A0522D', '#D2B48C', '#87CEEB', '#F08080', '#4682B4', '#DA70D6', '#B0C4DE', '#F4A460',
    '#5F9EA0', '#DDA0DD', '#7FFF00', '#6495ED', '#DC143C', '#FF8C00', '#9ACD32', '#40E0D0',
  ];
  const STORAGE_KEY = 'banada_rtd_state_v1';
  const HISTORY_LIMIT = 50;

  // ── 상태 ──
  let startCell = null, endCell = null;
  const selectedCells = new Set();
  let isDragging = false;
  let lastMoveEndCell = null;
  let autoSave = true;
  let saveTimer = null;
  let undoStack = [];
  let redoStack = [];
  let isApplyingHistory = false;
  let historyTimer = null;

  // ═════════════ 팔레트 초기화 ═════════════
  COLORS.forEach(c => {
    const d = document.createElement('div');
    d.className = 'rtd-swatch';
    d.style.background = c;
    d.dataset.color = c;
    d.addEventListener('click', () => applyColor(c));
    palette.appendChild(d);
  });

  // ═════════════ 헬퍼 ═════════════
  const setSaveStatus = (state) => {
    if (!saveStatus) return;
    saveStatus.className = state || '';
    saveStatus.textContent = state === 'saving' ? '💾 저장 중...'
      : state === 'saved' ? '✓ 저장됨'
      : state === 'error' ? '⚠ 저장 실패'
      : '';
    if (state === 'saved') {
      setTimeout(() => {
        if (saveStatus.textContent === '✓ 저장됨') {
          saveStatus.textContent = '';
          saveStatus.className = '';
        }
      }, 2000);
    }
  };

  const saveState = () => {
    try {
      setSaveStatus('saving');
      const state = {
        tableHTML: table.innerHTML,
        topNotice: noticeTop.innerHTML,
        bottomNotice: noticeBottom.innerHTML,
        fontSize: fontSizeInput.value,
        submenuIdx: Array.from(submenu.querySelectorAll('.rtd-submenu-item'))
          .findIndex(el => el.classList.contains('active')),
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveStatus('saved');
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      toast('저장에 실패했습니다.', 'error');
    }
  };

  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 800);
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (s.tableHTML) table.innerHTML = s.tableHTML;
      if (s.topNotice) noticeTop.innerHTML = s.topNotice;
      if (s.bottomNotice) noticeBottom.innerHTML = s.bottomNotice;
      if (s.fontSize) fontSizeInput.value = s.fontSize;
      if (typeof s.submenuIdx === 'number' && s.submenuIdx >= 0) {
        const items = submenu.querySelectorAll('.rtd-submenu-item');
        items.forEach(i => i.classList.remove('active'));
        items[s.submenuIdx]?.classList.add('active');
      }
      // contentEditable 재적용
      table.querySelectorAll('td').forEach(td => { td.contentEditable = 'true'; });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // ═════════════ Undo/Redo ═════════════
  const snapshot = () => ({
    tableHTML: table.innerHTML,
    topNotice: noticeTop.innerHTML,
    bottomNotice: noticeBottom.innerHTML,
  });

  const applySnapshot = (snap) => {
    if (!snap) return;
    isApplyingHistory = true;
    table.innerHTML = snap.tableHTML;
    noticeTop.innerHTML = snap.topNotice;
    noticeBottom.innerHTML = snap.bottomNotice;
    if (editTop) editTop.value = stripHtml(snap.topNotice);
    if (editBottom) editBottom.value = snap.bottomNotice.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, m => (m === '<b>' || m === '</b>' ? m : '')).trim();
    table.querySelectorAll('td').forEach(td => { td.contentEditable = 'true'; });
    clearSelection();
    updateUndoRedoUI();
    setTimeout(() => { isApplyingHistory = false; }, 0);
  };

  const updateUndoRedoUI = () => {
    if (undoBtn) undoBtn.disabled = undoStack.length <= 1;  // 초기 상태 하나는 남겨둠
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  };

  const pushHistoryNow = () => {
    if (isApplyingHistory) return;
    const snap = snapshot();
    const last = undoStack[undoStack.length - 1];
    if (last && last.tableHTML === snap.tableHTML
        && last.topNotice === snap.topNotice
        && last.bottomNotice === snap.bottomNotice) return;
    undoStack.push(snap);
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
    updateUndoRedoUI();
  };

  const pushHistory = () => {
    if (historyTimer) clearTimeout(historyTimer);
    historyTimer = setTimeout(pushHistoryNow, 500);
  };

  const undo = () => {
    if (undoStack.length <= 1) {
      toast('되돌릴 작업이 없습니다.', 'warning');
      return;
    }
    redoStack.push(snapshot());
    undoStack.pop();  // 현재 상태 제거
    applySnapshot(undoStack[undoStack.length - 1]);
    toast('되돌렸습니다', 'info', 1200);
  };

  const redo = () => {
    if (redoStack.length === 0) {
      toast('다시 실행할 작업이 없습니다.', 'warning');
      return;
    }
    const next = redoStack.pop();
    undoStack.push(next);
    applySnapshot(next);
    toast('다시 실행했습니다', 'info', 1200);
  };

  const stripHtml = (s) => {
    const d = document.createElement('div');
    d.innerHTML = s;
    return d.textContent || '';
  };

  const triggerSave = () => {
    if (autoSave) debouncedSave();
    pushHistory();
  };

  // ═════════════ 선택 ═════════════
  const clearSelection = () => {
    selectedCells.forEach(c => c.classList.remove('selected'));
    selectedCells.clear();
    selectionBox.style.display = 'none';
    startCell = null;
    endCell = null;
  };

  const coordOf = (cell) => ({
    r: cell.closest('tr').rowIndex,
    c: cell.cellIndex,
  });

  const selectRange = (a, b) => {
    const r1 = Math.min(a.r, b.r), r2 = Math.max(a.r, b.r);
    const c1 = Math.min(a.c, b.c), c2 = Math.max(a.c, b.c);
    // ★ [수정] 기존 선택만 시각적으로 해제 (startCell/endCell은 유지!)
    selectedCells.forEach(c => c.classList.remove('selected'));
    selectedCells.clear();
    for (let r = r1; r <= r2; r++) {
      const row = table.rows[r];
      if (!row) continue;
      for (let c = c1; c <= c2; c++) {
        const cell = row.cells[c];
        if (cell) {
          cell.classList.add('selected');
          selectedCells.add(cell);
        }
      }
    }
  };

  const drawBox = (a, b) => {
    if (!a || !b) return;
    const wrap = container.querySelector('.rtd-table-wrap');
    const wrapRect = wrap.getBoundingClientRect();
    const aR = a.getBoundingClientRect();
    const bR = b.getBoundingClientRect();
    const left = Math.min(aR.left, bR.left) - wrapRect.left;
    const top = Math.min(aR.top, bR.top) - wrapRect.top;
    const right = Math.max(aR.right, bR.right) - wrapRect.left;
    const bottom = Math.max(aR.bottom, bR.bottom) - wrapRect.top;
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${right - left}px`;
    selectionBox.style.height = `${bottom - top}px`;
    selectionBox.style.display = 'block';
  };

  const onMouseDown = (e) => {
    const cell = e.target.closest('td');
    if (!cell) return;
    const multi = e.ctrlKey || e.metaKey;
    if (multi) {
      if (document.activeElement?.closest('.rtd-table')) document.activeElement.blur();
      clearSelection();
      startCell = cell;
      endCell = cell;
      cell.classList.add('selected');
      selectedCells.add(cell);
      table.classList.add('disable-select');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
      e.stopPropagation();
    } else {
      clearSelection();
      cell.classList.add('selected');
      selectedCells.add(cell);
    }
  };

  const onMouseMove = (e) => {
    if (!startCell) return;
    if (!e.ctrlKey && !e.metaKey) { onMouseUp(); return; }
    const cell = e.target.closest('td');
    if (!cell || cell === lastMoveEndCell) return;
    endCell = cell;
    lastMoveEndCell = cell;
    selectRange(coordOf(startCell), coordOf(endCell));
    drawBox(startCell, endCell);
    isDragging = true;
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    table.classList.remove('disable-select');
    selectionBox.style.display = 'none';
    if (isDragging) setTimeout(() => { isDragging = false; }, 0);
    lastMoveEndCell = null;
  };

  table.addEventListener('mousedown', onMouseDown);
  table.addEventListener('input', triggerSave);
  noticeTop.addEventListener('input', triggerSave);
  noticeBottom.addEventListener('input', triggerSave);

  // ═════════════ 색상/폰트 ═════════════
  const applyColor = (color) => {
    if (selectedCells.size === 0) {
      toast('먼저 셀을 Ctrl/Cmd 드래그로 선택하세요.', 'warning');
      return;
    }
    const target = container.querySelector('input[name="rtdColorTarget"]:checked').value;
    selectedCells.forEach(c => {
      if (target === 'text') c.style.color = color;
      else c.style.backgroundColor = color;
    });
    triggerSave();
  };

  container.querySelector('#rtdApplyFont').addEventListener('click', () => {
    if (selectedCells.size === 0) {
      toast('먼저 셀을 Ctrl/Cmd 드래그로 선택하세요.', 'warning');
      return;
    }
    const size = fontSizeInput.value + 'px';
    selectedCells.forEach(c => { c.style.fontSize = size; });
    triggerSave();
  });

  // ═════════════ 문구 편집 ═════════════
  editTop.value = stripHtml(noticeTop.innerHTML);
  editBottom.value = noticeBottom.innerHTML
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<b>|<\/b>/g, '')
    .trim();

  container.querySelector('#rtdApplyText').addEventListener('click', () => {
    noticeTop.textContent = editTop.value;
    noticeBottom.innerHTML = editBottom.value
      .replace(/</g, '&lt;')
      .replace(/\[중요 공지\]/g, '<b>[중요 공지]</b>')
      .replace(/\n/g, '<br>');
    toast('문구를 저장했습니다.', 'success');
    triggerSave();
  });

  // ═════════════ 행/열 조작 ═════════════
  container.querySelector('#rtdAddRow').addEventListener('click', () => {
    const cols = table.rows[0]?.cells.length || 5;
    const tr = table.tBodies[0].insertRow();
    for (let i = 0; i < cols; i++) {
      const td = tr.insertCell();
      td.contentEditable = 'true';
      td.textContent = '';
    }
    triggerSave();
    toast('행을 추가했습니다.', 'success');
  });

  container.querySelector('#rtdAddCol').addEventListener('click', () => {
    if (!confirm('모든 행에 새 열을 추가하시겠습니까?')) return;
    Array.from(table.rows).forEach(row => {
      const td = row.insertCell();
      td.contentEditable = 'true';
      td.textContent = row.rowIndex === 0 ? '새 열' : '';
    });
    triggerSave();
    toast('열을 추가했습니다.', 'success');
  });

  container.querySelector('#rtdDelRow').addEventListener('click', () => {
    // ★ [수정] 선택된 셀에서 헤더(<thead>) 셀은 미리 제외
    const validSelectedCells = Array.from(selectedCells).filter(c => {
      const row = c.closest('tr');
      return row && row.parentElement !== table.tHead;
    });
    const rowIdx = new Set();
    validSelectedCells.forEach(c => rowIdx.add(c.closest('tr').rowIndex));

    if (rowIdx.size === 0) {
      // 선택된 데이터 행이 없으면 마지막 데이터 행 삭제
      const rows = table.tBodies[0].rows;
      if (rows.length === 0) return toast('삭제할 행이 없습니다.', 'info');
      if (!confirm('마지막 데이터 행을 삭제하시겠습니까?')) return;
      rows[rows.length - 1].remove();
      clearSelection();
      triggerSave();
      toast('행을 삭제했습니다.', 'success');
      return;
    }
    if (!confirm(`선택된 ${rowIdx.size}개 행을 삭제하시겠습니까? (헤더는 자동 제외)`)) return;
    // ★ 큰 인덱스부터 삭제 (인덱스 밀림 방지)
    const sorted = Array.from(rowIdx).sort((a, b) => b - a);
    let deleted = 0;
    for (const idx of sorted) {
      const row = table.rows[idx];
      if (!row) continue;
      // ★ [안전장치] thead의 행은 절대 삭제 안 함
      if (row.parentElement === table.tHead) continue;
      if (row.parentElement?.tagName === 'THEAD') continue;
      row.remove();
      deleted++;
    }
    clearSelection();
    if (deleted > 0) {
      triggerSave();
      toast(`${deleted}개 행을 삭제했습니다.`, 'success');
    } else {
      toast('삭제할 수 있는 데이터 행이 없습니다. (헤더는 삭제 불가)', 'warning');
    }
  });

  container.querySelector('#rtdDelCol').addEventListener('click', () => {
    const colIdx = new Set();
    selectedCells.forEach(c => colIdx.add(c.cellIndex));
    if (colIdx.size === 0) {
      const last = (table.rows[0]?.cells.length || 0) - 1;
      if (last < 0) return;
      if (!confirm('가장 오른쪽 열을 삭제하시겠습니까?')) return;
      Array.from(table.rows).forEach(row => { if (row.cells[last]) row.deleteCell(last); });
      triggerSave();
      toast('열을 삭제했습니다.', 'success');
      return;
    }
    if (!confirm(`선택된 ${colIdx.size}개 열을 삭제하시겠습니까?`)) return;
    const sorted = Array.from(colIdx).sort((a, b) => b - a);
    let deleted = 0;
    for (const idx of sorted) {
      Array.from(table.rows).forEach(row => { if (row.cells[idx]) row.deleteCell(idx); });
      deleted++;
    }
    clearSelection();
    triggerSave();
    toast(`${deleted}개 열을 삭제했습니다.`, 'success');
  });

  container.querySelector('#rtdAutoFit').addEventListener('click', () => {
    table.querySelectorAll('td').forEach(td => {
      td.style.width = '';
      td.style.minWidth = '';
    });
    table.style.width = '100%';
    toast('열 너비를 재조정했습니다.', 'success');
    triggerSave();
  });

  // ═════════════ 클립보드 ═════════════
  container.querySelector('#rtdCopy').addEventListener('click', async () => {
    if (selectedCells.size === 0) {
      toast('먼저 셀을 Ctrl/Cmd 드래그로 선택하세요.', 'warning');
      return;
    }
    const cells = Array.from(selectedCells).sort((a, b) => {
      const A = coordOf(a), B = coordOf(b);
      return A.r !== B.r ? A.r - B.r : A.c - B.c;
    });
    const base = coordOf(cells[0]);
    const data = cells.map(c => {
      const co = coordOf(c);
      return {
        r: co.r - base.r,
        c: co.c - base.c,
        html: c.innerHTML,
        color: c.style.color || '',
        bg: c.style.backgroundColor || '',
        fontSize: c.style.fontSize || '',
      };
    });
    try {
      await navigator.clipboard.writeText(JSON.stringify({ type: 'rtd_clip', data }));
      toast(`${cells.length}개 셀을 복사했습니다.`, 'success');
    } catch (e) {
      toast('클립보드 접근 실패', 'error');
    }
  });

  container.querySelector('#rtdPaste').addEventListener('click', async () => {
    try {
      const clip = JSON.parse(await navigator.clipboard.readText());
      if (clip.type !== 'rtd_clip') throw new Error('형식 불일치');
      const target = selectedCells.size === 1 ? Array.from(selectedCells)[0] : table.rows[1]?.cells[0];
      if (!target) return toast('붙여넣을 위치가 없습니다.', 'warning');
      const base = coordOf(target);
      let applied = 0;
      clip.data.forEach(d => {
        const row = table.rows[base.r + d.r];
        if (!row) return;
        const cell = row.cells[base.c + d.c];
        if (!cell) return;
        cell.innerHTML = d.html;
        if (d.color) cell.style.color = d.color;
        if (d.bg) cell.style.backgroundColor = d.bg;
        if (d.fontSize) cell.style.fontSize = d.fontSize;
        applied++;
      });
      toast(`${applied}개 셀을 붙여넣었습니다.`, 'success');
      triggerSave();
    } catch (e) {
      toast('붙여넣을 데이터가 없거나 형식이 잘못됐습니다.', 'error');
    }
  });

  // ═════════════ 저장 ═════════════
  const autoBtn = container.querySelector('#rtdAutoSaveToggle');
  autoBtn.addEventListener('click', () => {
    autoSave = !autoSave;
    autoBtn.textContent = `자동저장: ${autoSave ? 'ON' : 'OFF'}`;
    autoBtn.style.background = autoSave ? '#4CAF50' : '#666';
    if (autoSave) saveState();
  });

  container.querySelector('#rtdSaveNow').addEventListener('click', () => {
    saveState();
    toast('현재 상태를 저장했습니다.', 'success');
  });

  container.querySelector('#rtdReset').addEventListener('click', () => {
    if (!confirm('저장된 편집 데이터를 모두 삭제하고 초기 상태로 되돌립니다.\n계속하시겠습니까?')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // ═════════════ Undo/Redo 버튼 ═════════════
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  // ═════════════ 이미지 다운로드 ═════════════
  container.querySelector('#rtdDlSelection').addEventListener('click', async () => {
    if (selectedCells.size === 0) {
      toast('먼저 셀을 Ctrl/Cmd 드래그로 선택하세요.', 'warning');
      return;
    }
    const h2c = await loadHtml2canvas().catch(() => null);
    if (!h2c) return toast('이미지 라이브러리를 로드하지 못했습니다.', 'error');
    selectionBox.style.display = 'none';
    const cells = Array.from(selectedCells);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cells.forEach(c => {
      const r = c.getBoundingClientRect();
      minX = Math.min(minX, r.left);
      minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right);
      maxY = Math.max(maxY, r.bottom);
    });
    const wrapRect = container.querySelector('.rtd-table-wrap').getBoundingClientRect();
    try {
      const canvas = await h2c(table, {
        x: minX - wrapRect.left,
        y: minY - wrapRect.top,
        width: maxX - minX,
        height: maxY - minY,
        scale: 2,
        backgroundColor: '#2b4a6b',
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'banada_data_selection.png';
      link.click();
      toast('선택 영역을 다운로드했습니다.', 'success');
    } catch (e) {
      console.error(e);
      toast('이미지 다운로드에 실패했습니다.', 'error');
    }
  });

  container.querySelector('#rtdDlFull').addEventListener('click', async () => {
    const h2c = await loadHtml2canvas().catch(() => null);
    if (!h2c) return toast('이미지 라이브러리를 로드하지 못했습니다.', 'error');
    // 도구 패널 잠깐 숨김
    const prevDisplay = toolsEl.style.display;
    toolsEl.style.display = 'none';
    selectionBox.style.display = 'none';
    const main = container.querySelector('.rtd-main');
    // grid 컬럼 임시로 바꿔서 메인만 전체 너비 차지
    const layout = container.querySelector('.rtd-layout');
    const prevGrid = layout.style.gridTemplateColumns;
    layout.style.gridTemplateColumns = '1fr';
    // 스크롤 위로
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 100));  // 레이아웃 재계산 대기
    try {
      const canvas = await h2c(main, {
        scale: 2,
        backgroundColor: '#1a1420',
        logging: false,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'banada_realtime_data.png';
      link.click();
      toast('전체 화면을 다운로드했습니다.', 'success');
    } catch (e) {
      console.error(e);
      toast('이미지 다운로드에 실패했습니다.', 'error');
    } finally {
      toolsEl.style.display = prevDisplay;
      layout.style.gridTemplateColumns = prevGrid;
    }
  });

  // ═════════════ 도구 접기/펼치기 ═════════════
  container.querySelector('#rtdToolsToggle').addEventListener('click', () => {
    toolsEl.classList.toggle('collapsed');
  });

  // ═════════════ 서브 메뉴 ═════════════
  submenu.addEventListener('click', (e) => {
    const btn = e.target.closest('.rtd-submenu-item');
    if (!btn) return;
    submenu.querySelectorAll('.rtd-submenu-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    triggerSave();
  });

  // ═════════════ 전역 이벤트 ═════════════
  const clickHandler = (e) => {
    if (isDragging) return;
    const t = e.target;
    if (t.closest('.rtd-table') || t.closest('.rtd-tools') || t.closest('#toastContainer')) return;
    clearSelection();
  };
  document.addEventListener('click', clickHandler);

  const keyHandler = (e) => {
    // ESC로 선택 해제
    if (e.key === 'Escape') {
      if (document.activeElement?.closest('.rtd-table')) {
        document.activeElement.blur();
        return;
      }
      if (selectedCells.size > 0) {
        clearSelection();
        e.preventDefault();
      }
      return;
    }
    // Ctrl+Z / Y (편집 중인 input에선 제외)
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
  };
  document.addEventListener('keydown', keyHandler);

  // ═════════════ 초기화 ═════════════
  const restored = loadState();
  pushHistoryNow();  // 초기 상태를 히스토리에 저장
  updateUndoRedoUI();
  if (restored) toast('저장된 편집 데이터를 복원했습니다.', 'info', 1500);

  // 페이지 이탈 시 정리 (SPA에서 페이지 바뀔 때)
  window.addEventListener('beforeunload', () => {
    if (autoSave) saveState();
  });
}