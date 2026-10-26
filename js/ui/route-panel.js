// Sinh HTML cho phần kết quả tuyến trong panel (hàm thuần, chỉ trả về chuỗi).
//
// Thứ tự: tổng thời gian → phương án khác (nếu có) → strip map từng chặng → gợi ý dừng chân.
// Mỗi tuyến chỉ được trình bày một lần (bản trước lặp lại 3 lần: thẻ phương án,
// danh sách ga và lịch trình).

import { stationById, lineColor, lineLabel } from '../core/graph.js';
import { getRouteSuggestions, kindLabel } from '../core/suggestions.js';
import { formatMinutes, escapeHtml } from '../core/utils.js';

const stationName = id => escapeHtml(stationById.get(id)?.name ?? id);

function summaryFacts(result) {
  const transfers = result.transfers === 0 ? 'không đổi tuyến' : `${result.transfers} lần đổi tuyến`;
  return `${transfers}, ${result.route.length} ga`;
}

/** Gộp các cạnh liên tiếp cùng tuyến thành một chặng, giữ lại danh sách ga đi qua. */
export function buildLineSegments(result) {
  const segments = [];

  result.legs.forEach(leg => {
    const last = segments[segments.length - 1];
    const canMerge = last && !leg.isTransfer && !last.isTransfer && last.line === leg.line && leg.transferTime === 0;

    if (canMerge) {
      last.stations.push(leg.to);
      last.minutes += leg.edgeTime;
      return;
    }

    segments.push({
      line: leg.line,
      isTransfer: leg.isTransfer,
      stations: [leg.from, leg.to],
      minutes: leg.edgeTime,
      transferTime: leg.transferTime
    });
  });

  return segments;
}

function renderSummary(result) {
  return `
    <div class="route-summary">
      <p class="route-time">${Math.round(result.cost)}<small>phút</small></p>
      <p class="route-facts">${summaryFacts(result)}</p>
    </div>`;
}

/** Các phương án khác chỉ hiện khi A* tìm ra hơn một tuyến khác nhau. */
export function renderRouteOptions(options, selectedModeKey) {
  if (options.length < 2) return '';

  const rows = options.map(option => {
    const isActive = option.modeKey === selectedModeKey;
    const modes = option.matchedModes?.length > 1 ? `, hợp cả ${option.matchedModes.length} chế độ` : '';
    return `
      <button class="route-alt" type="button" data-tour-mode="${option.modeKey}" ${isActive ? 'aria-current="true"' : ''}>
        <strong>${escapeHtml(option.modeShortLabel)}</strong>
        <span class="alt-time">${formatMinutes(option.cost)}</span>
        <span class="alt-facts">${summaryFacts(option)}${modes}</span>
      </button>`;
  }).join('');

  return `
    <div class="route-alts">
      <p class="route-alts-title">${options.length} cách đi khác nhau</p>
      ${rows}
    </div>`;
}

function stopItem(id, { isEnd = false, note = '' } = {}) {
  const noteHtml = note ? `<span class="stop-note">${note}</span>` : '';
  return `<li class="stop${isEnd ? ' is-end' : ''}">${stationName(id)}${noteHtml}</li>`;
}

function renderLeg(segment, { isFirst, isLast }) {
  const [board, ...rest] = segment.stations;
  const alight = rest.pop();
  const middle = rest;
  const rides = segment.stations.length - 1;

  const middleHtml = middle.length
    ? `<li><details><summary>${middle.length} ga ở giữa</summary><ol class="stops-inner">${middle.map(id => stopItem(id)).join('')}</ol></details></li>`
    : '';

  return `
    <li class="leg" style="--line-color:${lineColor(segment.line)}">
      <div class="leg-head">
        <span class="line-tag">${segment.line}</span>
        <span class="line-name">${escapeHtml(lineLabel(segment.line))}</span>
        <span class="leg-time">${formatMinutes(segment.minutes)}</span>
      </div>
      <ol class="stops">
        ${stopItem(board, { isEnd: true, note: isFirst ? 'lên tàu' : '' })}
        ${middleHtml}
        ${stopItem(alight, { isEnd: true, note: isLast ? 'xuống tàu' : `${rides} ga` })}
      </ol>
    </li>`;
}

/** Strip map: mỗi chặng là một thanh màu tuyến; giữa các chặng là dòng đi bộ / đổi tuyến. */
export function renderStrip(result) {
  const segments = buildLineSegments(result);
  if (!segments.length) {
    return `<ol class="strip"><li class="leg"><ol class="stops">${stopItem(result.route[0], { isEnd: true, note: 'điểm đi và điểm đến cùng một ga' })}</ol></li></ol>`;
  }

  const rideIndexes = segments.map((segment, index) => (segment.isTransfer ? -1 : index)).filter(i => i >= 0);
  const firstRide = rideIndexes[0];
  const lastRide = rideIndexes[rideIndexes.length - 1];

  const items = segments.map((segment, index) => {
    if (segment.isTransfer) {
      const [from, to] = segment.stations;
      return `<li class="change">Đi bộ từ ${stationName(from)} sang ${stationName(to)}, khoảng ${formatMinutes(segment.minutes + segment.transferTime)}</li>`;
    }

    const change = segment.transferTime > 0
      ? `<li class="change">Đổi sang ${escapeHtml(lineLabel(segment.line))} tại ${stationName(segment.stations[0])}, khoảng ${formatMinutes(segment.transferTime)}</li>`
      : '';
    return change + renderLeg(segment, { isFirst: index === firstRide, isLast: index === lastRide });
  }).join('');

  return `<ol class="strip" aria-label="Các chặng của tuyến">${items}</ol>`;
}

export function renderStopSuggestions(result) {
  const suggestions = getRouteSuggestions(result.route);

  if (!suggestions.length) {
    return `
      <div class="trip-ideas">
        <div class="sb-head"><h2 class="sb-title">Gợi ý dừng chân</h2></div>
        <p class="idea-empty">Chưa có gợi ý cho các ga trên tuyến này.</p>
      </div>`;
  }

  const items = suggestions.map(item => `
      <li class="idea">
        <div class="idea-top">
          <span class="idea-kind">${escapeHtml(kindLabel(item.kind))}</span>
          <span>Xuống ga ${escapeHtml(item.stationName)}</span>
        </div>
        <div class="idea-title">${escapeHtml(item.title)}</div>
        <p class="idea-note">${escapeHtml(item.note)}</p>
        <p class="idea-meta">${escapeHtml(item.walk)}. ${escapeHtml(item.tip)}</p>
      </li>`).join('');

  return `
    <div class="trip-ideas">
      <div class="sb-head">
        <h2 class="sb-title">Gợi ý dừng chân</h2>
        <span class="route-facts">${suggestions.length} điểm</span>
      </div>
      <p class="ideas-subtitle">Xuống ga, ghé chơi hoặc ăn, rồi lên lại chuyến sau.</p>
      <ul class="idea-list">${items}
      </ul>
      <p class="ideas-source">Giờ mở cửa có thể thay đổi, nên kiểm tra trước khi ghé.</p>
    </div>`;
}

export function renderRouteResult(options, result) {
  return renderSummary(result)
    + renderRouteOptions(options, result.modeKey)
    + renderStrip(result)
    + renderStopSuggestions(result);
}
