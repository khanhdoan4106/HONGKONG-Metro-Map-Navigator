// Thông tin các ga dùng cho cảnh sân ga ở trang đăng nhập:
// tên chữ Hán, tuyến, hướng đi, ga kế tiếp và số phút lấy từ đồ thị thật.

import { signStations } from '../data/station-signs.js';
import { lineProfiles, lineSequences } from '../data/lines.js';
import { edgeByKey, canonicalEdgeKey, stationById } from './graph.js';

function terminusToward(line, from, toward) {
  for (const seq of lineSequences[line]) {
    const i = seq.indexOf(from);
    const j = seq.indexOf(toward);
    if (i === -1 || j === -1) continue;
    return j > i ? seq[seq.length - 1] : seq[0];
  }
  return toward;
}

export function getSignStops() {
  return signStations.map(stop => {
    const edge = edgeByKey.get(canonicalEdgeKey(stop.id, stop.toward));
    const profile = lineProfiles[stop.line];
    return {
      id: stop.id,
      zh: stop.zh,
      en: stationById.get(stop.id).name,
      lineCode: stop.line,
      lineName: profile.name,
      color: profile.color,
      terminus: stationById.get(terminusToward(stop.line, stop.id, stop.toward)).name,
      next: stationById.get(stop.toward).name,
      minutes: Math.max(1, Math.round(edge?.timeByLine[stop.line] ?? 2))
    };
  });
}
