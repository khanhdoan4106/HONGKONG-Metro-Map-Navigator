// Điểm vào của trang bản đồ: kiểm tra đăng nhập rồi nối các module lại với nhau.

import { requireAuth, isAdmin, logout, LOGIN_PAGE } from './auth/auth.js';
import { stations } from './data/stations.js';
import { routeModes } from './data/route-modes.js';
import { isInsideBoundary } from './core/geo.js';
import { nearestStation, railEdgeCount, stationById } from './core/graph.js';
import { buildRouteOptions } from './core/pathfinding.js';
import { getRouteMode } from './core/suggestions.js';
import { blockedStore } from './state/blocked-store.js';
import { createMap, loadHKBoundary } from './map/map-setup.js';
import { drawStations, createNetworkLayer } from './map/network-layer.js';
import { createRouteLayer, pointMarker } from './map/route-layer.js';
import { setStatus, renderUserBar, renderBlockedPanel } from './ui/panel.js';
import { initGuide, resetGuideTips, setGuideTip, showRouteTips } from './ui/guide.js';
import { renderRouteResult } from './ui/route-panel.js';

const session = requireAuth();
if (session) startApp(session);

function startApp(session) {
  const admin = isAdmin(session);
  const $ = id => document.getElementById(id);

  // ---------------------------------------------------------------- state
  // mode: 'block' (admin chọn đoạn cấm) → 'start' → 'end' → 'done'
  const initialMode = admin ? 'block' : 'start';
  let mode = initialMode;
  let scale = 1;
  let markerStart = null;
  let markerEnd = null;
  let activeRouteMode = 'balanced';
  let hkBoundary = null;

  // ---------------------------------------------------------------- map
  const map = createMap('map');
  drawStations(map);
  const routeLayer = createRouteLayer(map);
  const network = createNetworkLayer(map, {
    blocked: blockedStore,
    canEdit: () => admin && mode === 'block',
    onEdgeClick: key => blockedStore.toggle(key)
  });

  // ---------------------------------------------------------------- role-based UI
  document.body.classList.add(admin ? 'role-admin' : 'role-user');
  renderUserBar(session, () => {
    logout();
    location.replace(LOGIN_PAGE);
  });
  $('blocked-section-label').textContent = admin ? 'Đoạn bị cấm' : 'Đoạn tạm dừng';
  $('blocked-empty-msg').textContent = admin
    ? 'Chưa có đoạn nào bị cấm — bấm vào đoạn metro trên bản đồ để chặn'
    : 'Toàn bộ mạng đang hoạt động bình thường';
  $('confirm-btn').hidden = !admin;

  // ---------------------------------------------------------------- helpers
  function stationNear(latlng) {
    return isInsideBoundary(hkBoundary, latlng) ? nearestStation(latlng) : null;
  }

  function showIdleStatus() {
    const count = blockedStore.size;

    if (mode === 'block') {
      setStatus(
        count > 0
          ? `${count} đoạn bị cấm — nhấn Xác nhận để chọn điểm đi/đến`
          : `${stations.length} ga · ${railEdgeCount} đoạn metro — bấm vào đoạn để chặn`,
        count > 0 ? 'danger' : ''
      );
      setGuideTip(count > 0
        ? {
            left: `Đã khóa ${count} đoạn rồi. Hành khách sẽ thấy các đoạn này bị tạm dừng.`,
            right: 'Bấm Xác nhận rồi thử tìm đường để kiểm tra tuyến thay thế nhé. Đừng khóa quá tay.',
            leftMood: 'angry',
            rightMood: 'pout'
          }
        : {
            left: 'Bấm vào đoạn metro để giả lập sự cố. Hành khách sẽ được tự động đi vòng.',
            right: 'Nếu không cần chặn đoạn nào thì bấm Xác nhận để thử tìm đường.',
            leftMood: 'happy',
            rightMood: 'idea'
          });
      return;
    }

    if (mode === 'start') {
      const note = count > 0 ? ` (${count} đoạn đang tạm dừng)` : '';
      setStatus(`Chọn điểm bắt đầu trên bản đồ${note}`, count > 0 ? 'danger' : '');
    }
  }

  function refreshBlocked() {
    renderBlockedPanel({ keys: blockedStore.keys(), meta: key => blockedStore.meta(key), canEdit: admin });
    network.redraw();
    if (mode === 'done') updateRoute();
    else showIdleStatus();
  }

  function renderTourModeButtons() {
    document.querySelectorAll('.mode-pill[data-tour-mode]').forEach(button => {
      const selected = button.dataset.tourMode === activeRouteMode;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $('active-mode-note').textContent = getRouteMode(activeRouteMode).label;
  }

  // ---------------------------------------------------------------- route
  function showNoRoute(statusText, message, tip) {
    setStatus(statusText, 'danger');
    $('route-body').innerHTML = `<div class="no-route">${message}</div>`;
    setGuideTip(tip);
  }

  function updateRoute() {
    if (!markerStart || !markerEnd) return;

    const sourceId = stationNear(markerStart.getLatLng());
    const targetId = stationNear(markerEnd.getLatLng());

    routeLayer.clear();
    $('route-section').style.display = 'block';

    if (!sourceId || !targetId) {
      const which = !sourceId && !targetId ? 'Cả hai điểm' : !sourceId ? 'Điểm xuất phát' : 'Điểm đến';
      showNoRoute(
        `${which} nằm ngoài phạm vi mạng MTR Hong Kong`,
        'Điểm bắt đầu hoặc điểm kết thúc nằm ngoài lãnh thổ Hong Kong. Vui lòng chọn lại trong phạm vi mạng MTR.',
        {
          left: 'Ủa bạn đi đâu vậy? Chỗ đó tớ không phủ sóng được rồi!',
          right: 'MTR chỉ chạy trong Hong Kong thôi nha. Bấm lại vào đúng vị trí trong bản đồ nhé.',
          leftMood: 'angry',
          rightMood: 'pout'
        }
      );
      return;
    }

    const options = buildRouteOptions(sourceId, targetId, activeRouteMode, blockedStore);
    const result = options.find(option => option.modeKey === activeRouteMode) || options[0];

    if (!result) {
      showNoRoute(
        'Không tìm được đường đi với các đoạn đang bị cấm',
        'Không còn tuyến hợp lệ giữa hai điểm đã chọn.',
        {
          left: 'Không ổn rồi, tuyến bị chia cắt. Tớ tức vì không dẫn bạn đi ăn được.',
          right: admin
            ? 'Bình tĩnh. Bỏ cấm vài đoạn hoặc chọn cặp ga gần hơn là tớ tính lại ngay.'
            : 'Một số đoạn đang tạm dừng. Thử chọn điểm khác hoặc quay lại sau nhé.',
          leftMood: 'angry',
          rightMood: 'pout'
        }
      );
      return;
    }

    routeLayer.draw(result, markerStart.getLatLng(), markerEnd.getLatLng());
    $('route-body').innerHTML = renderRouteResult(options, result);
    showRouteTips(result);

    const source = stationById.get(sourceId);
    const target = stationById.get(targetId);
    setStatus(`Đã tính tuyến ${source.name} → ${target.name} theo ${result.modeShortLabel}`, 'success');
  }

  function setTourMode(modeKey) {
    if (!routeModes[modeKey]) return;
    activeRouteMode = modeKey;
    renderTourModeButtons();

    if (mode === 'done') {
      updateRoute();
      return;
    }

    const profile = getRouteMode(modeKey);
    setGuideTip({
      left: `Đã đổi sang ${profile.shortLabel}. Tớ sẽ tìm điểm dừng chân hợp gu hơn.`,
      right: `${profile.description} Tớ sẽ kiểm tra xem tuyến có đi quá vòng không.`,
      leftMood: ['food', 'checkin'].includes(modeKey) ? 'excited' : 'idea',
      rightMood: ['lowTransfers', 'fastest'].includes(modeKey) ? 'proud' : 'pout'
    });
  }

  // ---------------------------------------------------------------- flow
  function enterStartMode() {
    mode = 'start';
    $('route-section').style.display = 'none';
    routeLayer.clear();
    network.redraw(); // tắt khả năng bấm chặn đoạn
    showIdleStatus();
    setGuideTip({
      left: 'Chọn điểm bắt đầu trên bản đồ đi. Tớ sẽ gán vào ga MTR gần nhất.',
      right: 'Sau đó chọn điểm đến. Tớ sẽ so tuyến với bạn tóc trắng.',
      leftMood: 'happy',
      rightMood: 'idea'
    });
  }

  function handleMapClick(event) {
    if (mode === 'block') return;

    if (mode === 'start' || mode === 'done') {
      // Ở trạng thái 'done', bấm bản đồ sẽ bắt đầu chọn lại điểm đi
      [markerStart, markerEnd].forEach(marker => marker && map.removeLayer(marker));
      markerEnd = null;
      routeLayer.clear();
      $('route-section').style.display = 'none';
      markerStart = pointMarker(map, event.latlng, 'start');
      mode = 'end';
      setStatus('Chọn điểm kết thúc trên bản đồ');
      setGuideTip({
        left: 'Tốt, đã có điểm đi. Giờ chọn điểm đến, tớ sẽ săn điểm ăn chơi dọc tuyến.',
        right: 'Tớ sẽ đối chiếu với thời gian và số lần đổi tuyến. Chọn điểm đến đi.',
        leftMood: 'excited',
        rightMood: 'proud'
      });
      return;
    }

    if (mode === 'end') {
      markerEnd = pointMarker(map, event.latlng, 'end');
      mode = 'done';
      updateRoute();
    }
  }

  function resetMap() {
    [markerStart, markerEnd].forEach(marker => marker && map.removeLayer(marker));
    markerStart = null;
    markerEnd = null;
    routeLayer.clear();

    scale = 1;
    const panel = $('panel');
    panel.style.transform = '';
    panel.style.maxHeight = '';
    $('route-section').style.display = 'none';

    mode = initialMode;
    network.redraw();
    resetGuideTips();
    showIdleStatus();
  }

  function applyZoom() {
    const panel = $('panel');
    panel.style.transform = `scale(${scale})`;
    panel.style.transformOrigin = 'top right';
    // Khi scale > 1, thu max-height để ctrl-row không bị đẩy ra ngoài viewport
    panel.style.maxHeight = `calc((100vh - 32px) / ${scale})`;
  }

  // ---------------------------------------------------------------- events
  document.querySelector('.tour-mode-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-tour-mode]');
    if (button) setTourMode(button.dataset.tourMode);
  });
  $('route-body').addEventListener('click', event => {
    const button = event.target.closest('[data-tour-mode]');
    if (button) setTourMode(button.dataset.tourMode);
  });
  $('blocked-list').addEventListener('click', event => {
    const button = event.target.closest('[data-unblock]');
    if (button && admin) blockedStore.remove(button.dataset.unblock);
  });
  $('clear-blocked-btn').addEventListener('click', () => {
    if (admin && confirm(`Bỏ cấm toàn bộ ${blockedStore.size} đoạn?`)) blockedStore.clear();
  });
  $('confirm-btn').addEventListener('click', () => admin && enterStartMode());
  $('zoom-in-btn').addEventListener('click', () => { scale = Math.min(scale + 0.1, 1.5); applyZoom(); });
  $('zoom-out-btn').addEventListener('click', () => { scale = Math.max(scale - 0.1, 0.6); applyZoom(); });
  $('reset-btn').addEventListener('click', resetMap);

  blockedStore.subscribe(refreshBlocked);

  // ---------------------------------------------------------------- boot
  initGuide(session.role);
  renderTourModeButtons();
  renderBlockedPanel({ keys: blockedStore.keys(), meta: key => blockedStore.meta(key), canEdit: admin });
  network.redraw();
  document.body.classList.remove('auth-pending');

  setStatus('Đang tải dữ liệu biên giới Hong Kong...');
  loadHKBoundary().then(boundary => {
    hkBoundary = boundary;
    map.on('click', handleMapClick);
    showIdleStatus();
  });
}
