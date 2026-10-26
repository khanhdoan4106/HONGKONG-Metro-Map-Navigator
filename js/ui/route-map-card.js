// Thẻ "bản đồ tuyến" trên trang đăng nhập: vẽ toàn mạng MTR (SVG, theo toạ độ thật),
// làm nổi tuyến A* từ ga đang dừng tới một điểm đến và cho một đoàn tàu nhỏ chạy dọc tuyến.

import { stations } from '../data/stations.js';
import { lineProfiles, lineSequences } from '../data/lines.js';
import { stationById, lineColor } from '../core/graph.js';
import { findPath } from '../core/pathfinding.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const W = 360;
const H = 250;
const PAD = 10;

// Điểm đến cho từng ga xuất phát (đi xa để tuyến đẹp và đổi tuyến)
const DESTINATIONS = ['AIR', 'DIS', 'LOW', 'POA', 'TUM', 'OCP', 'WKS'];

const el = (name, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
};

// Phép chiếu equirectangular có hiệu chỉnh cos(vĩ độ), vừa khít khung
const lats = stations.map(s => s.lat);
const lngs = stations.map(s => s.lng);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
const scale = Math.min((W - PAD * 2) / ((maxLng - minLng) * kx), (H - PAD * 2) / (maxLat - minLat));
const offX = (W - (maxLng - minLng) * kx * scale) / 2;
const offY = (H - (maxLat - minLat) * scale) / 2;
const project = s => [offX + (s.lng - minLng) * kx * scale, offY + (maxLat - s.lat) * scale];
const fmt = n => n.toFixed(1);

export function createRouteMapCard(root) {
  const svg = root.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const base = el('g', { class: 'rm-base' });
  const routeG = el('g', { class: 'rm-route' });
  const stationsG = el('g', { class: 'rm-stations' });
  const trainG = el('g', { class: 'rm-train' });

  // Mạng nền: mỗi tuyến một đường mờ theo màu tuyến
  Object.entries(lineSequences).forEach(([line, branches]) => {
    branches.forEach(seq => {
      const d = seq.map((id, i) => `${i ? 'L' : 'M'}${project(stationById.get(id)).map(fmt).join(' ')}`).join('');
      base.appendChild(el('path', { d, stroke: lineProfiles[line].color, class: 'rm-line' }));
    });
  });

  stations.filter(s => s.lines.length > 1).forEach(s => {
    const [x, y] = project(s);
    stationsG.appendChild(el('circle', { cx: fmt(x), cy: fmt(y), r: 2.2, class: 'rm-interchange' }));
  });

  // Đoàn tàu: thân bo tròn + dải cửa sổ, quay theo hướng chạy
  const train = el('g', {});
  train.appendChild(el('rect', { x: -9, y: -3.4, width: 18, height: 6.8, rx: 3.4, class: 'rm-train-body' }));
  train.appendChild(el('rect', { x: -6, y: -1.4, width: 10, height: 2.2, rx: 1.1, class: 'rm-train-window' }));
  train.appendChild(el('circle', { cx: 7.2, cy: 0, r: 1.1, class: 'rm-train-lamp' }));
  trainG.appendChild(train);

  svg.append(base, routeG, stationsG, trainG);

  const title = root.querySelector('[data-rm="title"]');
  const meta = root.querySelector('[data-rm="meta"]');
  const legs = root.querySelector('[data-rm="legs"]');

  let pathEl = null;
  let pathLen = 0;
  let startTime = 0;
  let frame = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateTrain(now) {
    if (!pathEl) return;
    const duration = Math.max(4000, pathLen * 22);
    const t = ((now - startTime) % (duration + 900)) / duration;
    const d = Math.min(1, t) * pathLen;
    const p = pathEl.getPointAtLength(d);
    const q = pathEl.getPointAtLength(Math.min(pathLen, d + 1));
    const angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
    train.setAttribute('transform', `translate(${fmt(p.x)} ${fmt(p.y)}) rotate(${angle.toFixed(1)})`);
    frame = requestAnimationFrame(animateTrain);
  }

  function showRoute(fromId, index = 0) {
    const dest = DESTINATIONS.find((id, i) => i >= index % DESTINATIONS.length && id !== fromId) || 'AIR';
    const result = findPath(fromId, dest, { modeKey: 'fastest' });
    if (!result) return;

    routeG.replaceChildren();
    svg.classList.add('has-route');

    // Vẽ từng chặng theo màu tuyến, thêm một đường trắng liền mạch để tàu chạy theo
    result.legs.forEach(leg => {
      const [x1, y1] = project(stationById.get(leg.from));
      const [x2, y2] = project(stationById.get(leg.to));
      routeG.appendChild(el('line', {
        x1: fmt(x1), y1: fmt(y1), x2: fmt(x2), y2: fmt(y2),
        stroke: leg.isTransfer ? '#cfe3f3' : lineColor(leg.line),
        color: leg.isTransfer ? '#cfe3f3' : lineColor(leg.line),
        class: leg.isTransfer ? 'rm-leg rm-walk' : 'rm-leg'
      }));
    });

    const d = result.route.map((id, i) => `${i ? 'L' : 'M'}${project(stationById.get(id)).map(fmt).join(' ')}`).join('');
    pathEl = el('path', { d, class: 'rm-track' });
    routeG.appendChild(pathEl);
    pathLen = pathEl.getTotalLength();

    [result.route[0], result.route[result.route.length - 1]].forEach((id, i) => {
      const [x, y] = project(stationById.get(id));
      routeG.appendChild(el('circle', { cx: fmt(x), cy: fmt(y), r: 4.6, class: i ? 'rm-end' : 'rm-start' }));
    });

    const from = stationById.get(fromId).name;
    const to = stationById.get(dest).name;
    title.textContent = `${from} đến ${to}`;
    meta.textContent = `${Math.round(result.cost)} phút, ${result.route.length} ga, ${result.transfers} lần đổi tuyến`;

    // Các tuyến đi qua, theo thứ tự
    const seen = [];
    result.legs.forEach(leg => { if (!leg.isTransfer && !seen.includes(leg.line)) seen.push(leg.line); });
    legs.replaceChildren(...seen.map(code => {
      const chip = document.createElement('span');
      chip.className = 'rm-chip';
      chip.style.setProperty('--c', lineColor(code));
      chip.textContent = code;
      return chip;
    }));

    cancelAnimationFrame(frame);
    if (reduceMotion) {
      const p = pathEl.getPointAtLength(pathLen / 2);
      train.setAttribute('transform', `translate(${fmt(p.x)} ${fmt(p.y)})`);
      return;
    }
    startTime = performance.now();
    frame = requestAnimationFrame(animateTrain);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else if (pathEl && !reduceMotion) frame = requestAnimationFrame(animateTrain);
  });

  return { showRoute };
}
