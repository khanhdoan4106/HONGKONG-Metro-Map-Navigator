// Vẽ bó tuyến MTR trang trí cho trang đăng nhập (SVG).
// 10 tuyến chạy song song, bẻ góc 45° hai lần như sơ đồ metro; có ký hiệu
// ga trung chuyển (khung trắng viền đen) và chấm tàu chạy dọc từng tuyến.

import { lineProfiles } from '../data/lines.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 1440;
const VIEW_H = 900;
const GAP = 12;          // khoảng cách giữa hai tuyến liền kề
const K = Math.SQRT2 - 1; // dịch góc để các tuyến song song đều nhau khi bẻ 45°

function el(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

/** Dải màu các tuyến (dùng ở đầu thẻ trên màn hình nhỏ). */
export function fillLineStrip(container) {
  container.innerHTML = Object.entries(lineProfiles)
    .filter(([code]) => code !== 'XFER')
    .map(([, profile]) => `<i style="background:${profile.color}"></i>`)
    .join('');
}

export function drawLineBundle(svg) {
  const lines = Object.entries(lineProfiles).filter(([code]) => code !== 'XFER');
  const n = lines.length;
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);

  // Đường trục: vào từ trái ở y0, bẻ lên 45° tại x0, tới y1 thì bẻ ngang ra phải.
  const y0 = 640;
  const y1 = 250;
  const x0 = 300;
  const x1 = x0 + (y0 - y1);

  const group = el('g', {});
  const trains = el('g', {});

  lines.forEach(([code, profile], i) => {
    const o = (i - (n - 1) / 2) * GAP;
    const d = [
      `M -40 ${y0 + o}`,
      `L ${x0 + o * K} ${y0 + o}`,
      `L ${x1 + o * K} ${y1 + o}`,
      `L ${VIEW_W + 40} ${y1 + o}`
    ].join(' ');

    group.appendChild(el('path', { d, class: 'rail', stroke: profile.color }));

    const train = el('path', { d, class: 'train' });
    train.style.setProperty('--dur', `${11 + (i * 7) % 9}s`);
    train.style.setProperty('--delay', `${-((i * 3.7) % 11)}s`);
    trains.appendChild(train);
  });

  // Ký hiệu ga trung chuyển cắt ngang cả bó
  const half = ((n - 1) / 2) * GAP + 9;
  const capsule = (cx, cy, vertical) => el('rect', vertical
    ? { x: cx - 11, y: cy - half, width: 22, height: half * 2, rx: 11, class: 'interchange' }
    : { x: cx - half, y: cy - 11, width: half * 2, height: 22, rx: 11, class: 'interchange' });

  svg.replaceChildren(group, trains,
    capsule(150, y0, true),
    capsule(x1 + 390, y1, true),
    capsule(VIEW_W - 140, y1, true));
}
