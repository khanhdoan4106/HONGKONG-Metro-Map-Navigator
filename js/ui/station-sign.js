// Biển tên ga + bảng "ga kế tiếp" cho trang đăng nhập.
// Thời gian tới ga kế tiếp lấy từ đồ thị thật (timeByLine của cạnh).

import { signStations } from '../data/station-signs.js';
import { lineProfiles, lineSequences } from '../data/lines.js';
import { edgeByKey, canonicalEdgeKey, stationById } from '../core/graph.js';

const CYCLE_MS = 5200;

/** Ga cuối theo hướng đi (dùng cho dòng "về ..."). */
function terminusToward(line, from, toward) {
  for (const seq of lineSequences[line]) {
    const i = seq.indexOf(from);
    const j = seq.indexOf(toward);
    if (i === -1 || j === -1) continue;
    return j > i ? seq[seq.length - 1] : seq[0];
  }
  return toward;
}

function describe(stop) {
  const station = stationById.get(stop.id);
  const next = stationById.get(stop.toward);
  const edge = edgeByKey.get(canonicalEdgeKey(stop.id, stop.toward));
  const minutes = Math.max(1, Math.round(edge?.timeByLine[stop.line] ?? 2));
  const profile = lineProfiles[stop.line];
  return {
    zh: stop.zh,
    en: station.name,
    lineCode: stop.line,
    lineName: profile.name,
    color: profile.color,
    terminus: stationById.get(terminusToward(stop.line, stop.id, stop.toward)).name,
    next: next.name,
    minutes
  };
}

export function startStationSign(root) {
  const stops = signStations.map(describe);
  const $ = sel => root.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;

  function render(info) {
    root.style.setProperty('--line', info.color);
    $('[data-sign="zh"]').textContent = info.zh;
    $('[data-sign="en"]').textContent = info.en;
    $('[data-sign="code"]').textContent = info.lineCode;
    $('[data-sign="line"]').textContent = info.lineName;
    $('[data-sign="terminus"]').textContent = `Hướng ${info.terminus}`;
    $('[data-sign="next"]').textContent = info.next;
    $('[data-sign="min"]').textContent = info.minutes;
  }

  function arrive() {
    root.classList.add('is-leaving');
    setTimeout(() => {
      index = (index + 1) % stops.length;
      render(stops[index]);
      root.classList.remove('is-leaving');
      restartProgress();
    }, 380);
  }

  function restartProgress() {
    const bar = $('.board-progress');
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = '';
  }

  render(stops[0]);
  root.style.setProperty('--cycle', `${CYCLE_MS}ms`);
  if (reduceMotion) return;

  let timer = setInterval(arrive, CYCLE_MS);
  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) {
      restartProgress();
      timer = setInterval(arrive, CYCLE_MS);
    }
  });
}
