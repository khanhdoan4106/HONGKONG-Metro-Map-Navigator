// Sinh HTML cho phần kết quả tuyến trong panel (hàm thuần, chỉ trả về chuỗi).

import { stationById, lineColor, lineLabel } from '../core/graph.js';
import { getRouteSuggestions, kindLabel } from '../core/suggestions.js';
import { formatMinutes, roundedMinutes, escapeHtml } from '../core/utils.js';

export function renderRouteOptions(options, selectedModeKey) {
  if (!options.length) return '';

  const cards = options.map(option => {
    const isActive = option.modeKey === selectedModeKey;
    const modeText = option.matchedModes?.length ? option.matchedModes.join(' / ') : option.modeShortLabel;
    return `
        <button class="route-option-card ${isActive ? 'active' : ''}" type="button" data-tour-mode="${option.modeKey}">
          <span class="option-tag">${option.modeTag}</span>
          <strong>${option.modeShortLabel}</strong>
          <span>${formatMinutes(option.cost)} · ${option.transfers} lần đổi tuyến · ${option.suggestionCount} điểm dừng</span>
          <small>${modeText}</small>
        </button>`;
  }).join('');

  return `
    <div class="route-options">
      <div class="route-options-head">
        <span class="section-label">Phương án gợi ý</span>
        <span>${options.length} tuyến</span>
      </div>
      <div class="route-option-list">${cards}
      </div>
    </div>`;
}

function buildLineSegments(result) {
  const segments = [];

  result.legs.forEach(leg => {
    const last = segments[segments.length - 1];
    const canMerge = last && !leg.isTransfer && !last.isTransfer && last.line === leg.line && leg.transferTime === 0;

    if (canMerge) {
      last.to = leg.to;
      last.stops += 1;
      last.minutes = roundedMinutes(last.minutes + leg.edgeTime);
      return;
    }

    segments.push({
      line: leg.line,
      from: leg.from,
      to: leg.to,
      stops: leg.isTransfer ? 0 : 1,
      minutes: roundedMinutes(leg.edgeTime + leg.transferTime),
      transferTime: leg.transferTime,
      isTransfer: leg.isTransfer
    });
  });

  return segments;
}

export function renderJourneyTimeline(result) {
  const segments = buildLineSegments(result);
  if (!segments.length) return '';

  const rows = segments.map((segment, index) => {
    const from = stationById.get(segment.from);
    const to = stationById.get(segment.to);
    const lineText = segment.line === 'XFER' ? 'Đi bộ' : segment.line;
    const transferText = segment.transferTime > 0
      ? `<span class="timeline-transfer">+ ${formatMinutes(segment.transferTime)} đổi tuyến</span>`
      : '';

    return `
        <div class="timeline-segment" style="--line-color:${lineColor(segment.line)}">
          <div class="timeline-index">${index + 1}</div>
          <div class="timeline-main">
            <div class="timeline-line">
              <span class="line-chip">${lineText}</span>
              <span>${lineLabel(segment.line)}</span>
            </div>
            <div class="timeline-stations">${from.name} → ${to.name}</div>
            <div class="timeline-meta">
              <span>${segment.stops || 1} điểm dừng</span>
              <span>${formatMinutes(segment.minutes)}</span>
              ${transferText}
            </div>
          </div>
        </div>`;
  }).join('');

  return `
    <div class="journey-timeline">
      <div class="timeline-head">
        <span class="section-label">Lịch trình hành trình</span>
        <span>${segments.length} chặng</span>
      </div>
      <div class="timeline-list">${rows}
      </div>
    </div>`;
}

export function renderRoute(result) {
  if (result.route.length === 1) {
    const station = stationById.get(result.route[0]);
    return `<div class="route-flow"><div class="route-stop"><span class="stop-dot first"></span><span class="stop-name">${station.name}</span></div></div>`;
  }

  let html = '<div class="route-flow">';

  result.route.forEach((stationId, idx) => {
    const station = stationById.get(stationId);
    const cls = idx === 0 ? 'first' : idx === result.route.length - 1 ? 'last' : 'mid';
    html += `<div class="route-stop">
      <span class="stop-dot ${cls}"></span>
      <span class="stop-name">${station.name}</span>
    </div>`;

    if (idx < result.legs.length) {
      const leg = result.legs[idx];
      const transferText = leg.transferTime > 0 ? ` + ${formatMinutes(leg.transferTime)} đổi tuyến` : '';
      html += `<div class="route-leg" style="--line-color:${lineColor(leg.line)}">
        <span class="line-chip">${leg.line === 'XFER' ? 'Đi bộ' : leg.line}</span>
        <span>${formatMinutes(leg.edgeTime)}${transferText}</span>
      </div>`;
    }
  });

  html += `</div>
  <div class="route-summary">
    <span class="time-chip">⏱ ${formatMinutes(result.cost)}</span>
    <span class="profile-chip">${result.modeShortLabel}</span>
    <span class="stop-count-chip">${result.route.length} ga · ${result.legs.filter(leg => !leg.isTransfer).length} đoạn metro · ${result.transfers} lần đổi tuyến</span>
  </div>`;

  return html;
}

export function renderStopSuggestions(result) {
  const suggestions = getRouteSuggestions(result.route);

  if (!suggestions.length) {
    return `
      <div class="trip-ideas empty">
        <div class="ideas-head">
          <span class="section-label">Gợi ý dừng chân</span>
        </div>
        <div class="idea-empty">Tuyến này chưa có gợi ý du lịch trong dữ liệu mẫu.</div>
      </div>`;
  }

  const cards = suggestions.map(item => `
      <div class="idea-card">
        <div class="idea-card-top">
          <span class="idea-kind">${escapeHtml(kindLabel(item.kind))}</span>
          <span class="idea-station">${escapeHtml(item.stationName)} · điểm ${item.stopIndex}</span>
        </div>
        <div class="idea-title">${escapeHtml(item.title)}</div>
        <div class="idea-note">${escapeHtml(item.note)}</div>
        <div class="idea-meta">
          <span>${escapeHtml(item.walk)}</span>
          <span>${escapeHtml(item.tip)}</span>
        </div>
      </div>`).join('');

  return `
    <div class="trip-ideas">
      <div class="ideas-head">
        <span class="section-label">Gợi ý dừng chân</span>
        <span class="ideas-count">${suggestions.length}</span>
      </div>
      <div class="ideas-subtitle">Các điểm này nằm trên tuyến vừa tính, phù hợp nếu khách muốn xuống ga chơi hoặc ăn rồi tiếp tục đi tàu.</div>
      <div class="idea-list">${cards}
      </div>
      <div class="ideas-source">Gợi ý tham khảo từ dữ liệu du lịch Hong Kong; nên kiểm tra giờ mở cửa thực tế trước khi ghé.</div>
    </div>`;
}

export function renderRouteResult(options, result) {
  return renderRouteOptions(options, result.modeKey)
    + renderRoute(result)
    + renderJourneyTimeline(result)
    + renderStopSuggestions(result);
}
