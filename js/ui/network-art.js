// Vẽ sơ đồ mạng MTR trang trí cho trang đăng nhập bằng canvas,
// dùng toạ độ ga và thứ tự ga thật, có chấm tàu chạy dọc từng tuyến.

import { stations } from '../data/stations.js';
import { lineProfiles, lineSequences } from '../data/lines.js';

const stationById = new Map(stations.map(s => [s.id, s]));

export function drawNetworkArt(canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let paths = [];
  let frame = null;

  // Phép chiếu equirectangular có hiệu chỉnh cos(vĩ độ)
  const lats = stations.map(s => s.lat);
  const lngs = stations.map(s => s.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const spanX = (maxLng - minLng) * kx;
  const spanY = maxLat - minLat;

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = Math.min(width, height) * 0.1;
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    const offX = (width - spanX * scale) / 2;
    const offY = (height - spanY * scale) / 2;
    const project = s => ({
      x: offX + (s.lng - minLng) * kx * scale,
      y: offY + (maxLat - s.lat) * scale
    });

    paths = [];
    Object.entries(lineSequences).forEach(([line, branches]) => {
      branches.forEach((seq, branchIndex) => {
        const pts = seq.map(id => project(stationById.get(id)));
        const segLens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
        const total = segLens.reduce((a, b) => a + b, 0);
        paths.push({
          line,
          color: lineProfiles[line].color,
          pts,
          segLens,
          total,
          ids: seq,
          // nhánh phụ trùng đường với nhánh chính thì không cần thêm tàu
          trains: branchIndex === 0 ? 2 : 1,
          speed: 0.035 + (line.charCodeAt(0) % 5) * 0.006
        });
      });
    });
  }

  function pointAt(path, t) {
    let d = t * path.total;
    for (let i = 0; i < path.segLens.length; i += 1) {
      if (d <= path.segLens[i]) {
        const a = path.pts[i];
        const b = path.pts[i + 1];
        const r = path.segLens[i] ? d / path.segLens[i] : 0;
        return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
      }
      d -= path.segLens[i];
    }
    return path.pts[path.pts.length - 1];
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);

    // lưới mờ
    ctx.strokeStyle = 'rgba(160,190,220,0.06)';
    ctx.lineWidth = 1;
    const step = 32;
    for (let x = step; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = step; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    paths.forEach(path => {
      ctx.strokeStyle = path.color;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      path.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    stations.forEach(station => {
      const owner = paths.find(p => p.ids.includes(station.id));
      if (!owner) return;
      const p = owner.pts[owner.ids.indexOf(station.id)];
      const interchange = station.lines.length > 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, interchange ? 4.2 : 2.4, 0, Math.PI * 2);
      ctx.fillStyle = interchange ? '#0b1724' : '#e8eef5';
      ctx.fill();
      if (interchange) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e8eef5';
        ctx.stroke();
      }
    });
  }

  function drawTrains(time) {
    paths.forEach((path, pi) => {
      for (let k = 0; k < path.trains; k += 1) {
        const base = (time / 1000) * path.speed * (300 / Math.max(path.total, 1));
        let t = (base + k / path.trains + pi * 0.137) % 2;
        if (t > 1) t = 2 - t; // chạy đi rồi chạy về
        const p = pointAt(path, t);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
        glow.addColorStop(0, path.color);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  function render(time = 0) {
    drawStatic();
    drawTrains(time);
    if (!reduceMotion && !document.hidden) frame = requestAnimationFrame(render);
  }

  function restart() {
    cancelAnimationFrame(frame);
    layout();
    render(performance.now());
  }

  new ResizeObserver(restart).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) restart();
  });
}
