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
if (!session) window.__appReady = true; // đang chuyển về trang đăng nhập
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
  $('blocked-section-label').textContent = admin ? 'Đoạn bị chặn' : 'Đoạn tạm dừng';
  $('blocked-empty-msg').textContent = admin
    ? 'Chưa có đoạn nào bị chặn.'
    : 'Toàn bộ mạng đang chạy bình thường.';
  $('task-switch').hidden = !admin;

  // ---------------------------------------------------------------- helpers
  function stationNear(latlng) {
    return isInsideBoundary(hkBoundary, latlng) ? nearestStation(latlng) : null;
  }

  function showIdleStatus() {
    const count = blockedStore.size;

    if (mode === 'block') {
      setStatus(
        count > 0
          ? `Đang chặn ${count} đoạn. Chuyển sang Tìm đường để thử tuyến đi vòng.`
          : `Mạng có ${stations.length} ga và ${railEdgeCount} đoạn metro.`,
        count > 0 ? 'danger' : ''
      );
      setGuideTip(count > 0
        ? {
            left: `Đã khóa ${count} đoạn rồi. Hành khách sẽ thấy các đoạn này bị tạm dừng.`,
            right: 'Chuyển sang tab Tìm đường để kiểm tra tuyến thay thế nhé. Đừng khóa quá tay.',
            leftMood: 'angry',
            rightMood: 'pout'
          }
        : {
            left: 'Bấm vào đoạn metro để giả lập sự cố. Hành khách sẽ được tự động đi vòng.',
            right: 'Không cần chặn đoạn nào thì chuyển sang tab Tìm đường luôn.',
            leftMood: 'happy',
            rightMood: 'idea'
          });
      return;
    }

    if (mode === 'start') {
      setStatus(
        count > 0 ? `${count} đoạn đang tạm dừng, tuyến sẽ tự đi vòng.` : 'Bấm vào bản đồ để chọn điểm đi.',
        count > 0 ? 'danger' : ''
      );
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
    $('active-mode-note').textContent = getRouteMode(activeRouteMode).description;
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
        'Điểm này nằm ngoài Hong Kong nên không có ga MTR gần. Bấm bản đồ để chọn lại điểm đi trong Hong Kong.',
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
        'Không có tuyến nào tránh được các đoạn đang tạm dừng',
        admin
          ? 'Hai ga này bị tách rời vì các đoạn đang chặn. Mở lại một đoạn ở danh sách bên dưới, tuyến sẽ được tính lại.'
          : 'Hai ga này bị tách rời vì các đoạn đang tạm dừng. Thử chọn một điểm đến khác.',
        {
          left: 'Không ổn rồi, tuyến bị chia cắt. Tớ tức vì không dẫn bạn đi ăn được.',
          right: admin
            ? 'Bình tĩnh. Mở lại vài đoạn hoặc chọn cặp ga gần hơn là tớ tính lại ngay.'
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
    setStatus(`Tuyến ${result.modeShortLabel.toLowerCase()} từ ${source.name} đến ${target.name}. Bấm bản đồ để chọn lại điểm đi.`, 'success');
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
    setMode('start');
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
      setMode('end');
      setStatus('Bấm vào bản đồ để chọn điểm đến.');
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
      setMode('done');
      updateRoute();
    }
  }

  function resetMap() {
    [markerStart, markerEnd].forEach(marker => marker && map.removeLayer(marker));
    markerStart = null;
    markerEnd = null;
    routeLayer.clear();

    $('route-section').style.display = 'none';

    setMode(initialMode);
    network.redraw();
    resetGuideTips();
    showIdleStatus();
  }

  // Phóng to / thu nhỏ thanh bên (CSS zoom); bản đồ co giãn theo bề rộng mới
  function applyZoom() {
    document.documentElement.style.setProperty('--ui-scale', scale.toFixed(2));
    requestAnimationFrame(() => map.invalidateSize());
  }

  // Vé hành trình (thay cho thanh bước): ô Từ / Đến hiện ga gần nhất với điểm đã bấm,
  // ô đang chờ người dùng bấm bản đồ được tô đậm.
  function slotText(marker, prompt) {
    if (!marker) return { text: prompt, empty: true };
    const id = stationNear(marker.getLatLng());
    return id
      ? { text: `Ga ${stationById.get(id).name}`, empty: false }
      : { text: 'Ngoài Hong Kong', empty: false };
  }

  function renderTrip() {
    const blocking = mode === 'block';
    $('trip').hidden = blocking;
    $('mode-section').hidden = blocking;
    $('block-intro').hidden = !blocking;

    document.querySelectorAll('#task-switch [data-task]').forEach(button => {
      const selected = (button.dataset.task === 'block') === blocking;
      button.setAttribute('aria-pressed', String(selected));
    });

    const slots = {
      start: slotText(markerStart, 'Bấm bản đồ để chọn'),
      end: slotText(markerEnd, mode === 'end' ? 'Bấm bản đồ để chọn' : 'Chọn sau điểm đi')
    };
    Object.entries(slots).forEach(([key, { text, empty }]) => {
      const value = $(`slot-${key}`);
      value.textContent = text;
      value.classList.toggle('is-empty', empty);
      const slot = value.closest('.trip-slot');
      slot.classList.toggle('is-current', mode === key);
      slot.classList.toggle('is-set', !empty);
    });
  }

  function setMode(next) {
    mode = next;
    renderTrip();
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
  // Xác nhận 2 bước ngay trên nút (không dùng confirm() vì bị chặn trong iframe/trang nhúng)
  let clearArmedTimer = null;
  const clearBtn = $('clear-blocked-btn');
  clearBtn.addEventListener('click', () => {
    if (!admin) return;
    if (!clearArmedTimer) {
      clearBtn.textContent = 'Bấm lần nữa để mở tất cả';
      clearBtn.classList.add('armed');
      clearArmedTimer = setTimeout(disarmClear, 3000);
      return;
    }
    disarmClear();
    blockedStore.clear();
  });
  function disarmClear() {
    clearTimeout(clearArmedTimer);
    clearArmedTimer = null;
    clearBtn.textContent = 'Mở tất cả';
    clearBtn.classList.remove('armed');
  }
  $('task-switch').addEventListener('click', event => {
    const button = event.target.closest('[data-task]');
    if (!button || !admin) return;
    if (button.dataset.task === 'route' && mode === 'block') enterStartMode();
    if (button.dataset.task === 'block' && mode !== 'block') resetMap();
  });
  $('zoom-in-btn').addEventListener('click', () => { scale = Math.min(scale + 0.1, 1.5); applyZoom(); });
  $('zoom-out-btn').addEventListener('click', () => { scale = Math.max(scale - 0.1, 0.6); applyZoom(); });
  $('reset-btn').addEventListener('click', resetMap);

  blockedStore.subscribe(refreshBlocked);

  // ---------------------------------------------------------------- boot
  renderTrip();
  initGuide(session.role);
  renderTourModeButtons();
  renderBlockedPanel({ keys: blockedStore.keys(), meta: key => blockedStore.meta(key), canEdit: admin });
  network.redraw();
  document.body.classList.remove('auth-pending');
  window.__appReady = true;

  setStatus('Đang tải dữ liệu biên giới Hong Kong...');
  loadHKBoundary().then(boundary => {
    hkBoundary = boundary;
    map.on('click', handleMapClick);
    showIdleStatus();
  });
}
