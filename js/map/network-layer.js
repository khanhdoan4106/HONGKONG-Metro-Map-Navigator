// Vẽ ga và các đoạn metro lên bản đồ.
// Việc bấm vào đoạn để chặn chỉ được kích hoạt khi canEdit() trả về true (admin).

import { stations } from '../data/stations.js';
import { edges, stationById, lineColor, lineLabel } from '../core/graph.js';
import { formatMinutes } from '../core/utils.js';

export function drawStations(map) {
  stations.forEach(station => {
    const isInterchange = station.lines.length > 1;
    L.marker([station.lat, station.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="station-dot ${isInterchange ? 'interchange' : ''}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
    }).addTo(map).bindTooltip(
      `${station.name}<br><span>${station.lines.join(' · ')}</span>`,
      { permanent: false, direction: 'top' }
    );
  });

  map.fitBounds(stations.map(station => [station.lat, station.lng]), { padding: [28, 28] });
}

/**
 * @param {L.Map} map
 * @param {{ blocked: {has(key:string):boolean}, canEdit: () => boolean, onEdgeClick: (key:string) => void }} opts
 * @returns {{ redraw: () => void }}
 */
export function createNetworkLayer(map, { blocked, canEdit, onEdgeClick }) {
  let layers = [];

  function styleFor(edge, isBlocked, baseWeight) {
    if (edge.isTransfer) return { weight: 3, opacity: 0.58 };
    return isBlocked ? { weight: 6, opacity: 1 } : { weight: baseWeight, opacity: 0.8 };
  }

  function redraw() {
    layers.forEach(layer => map.removeLayer(layer));
    layers = [];
    const editable = canEdit();

    edges.forEach(edge => {
      const a = stationById.get(edge.u);
      const b = stationById.get(edge.v);
      const isBlocked = blocked.has(edge.key);
      const primaryLine = edge.lines.includes('TKL') ? 'TKL' : edge.lines[0];
      const isShared = edge.lines.length > 1 && !edge.isTransfer;
      const baseWeight = isShared ? 6 : 4;
      const clickable = editable && !edge.isTransfer;

      const line = L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
        color: isBlocked ? '#ff5252' : lineColor(primaryLine),
        ...styleFor(edge, isBlocked, baseWeight),
        dashArray: edge.isTransfer ? '4,8' : isBlocked ? '9,7' : null,
        className: `base-edge${clickable ? ' editable-edge' : ''}`
      }).addTo(map);
      layers.push(line);

      if (isShared && !isBlocked) {
        const secondLine = edge.lines.find(code => code !== primaryLine) || edge.lines[1];
        layers.push(L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
          color: lineColor(secondLine),
          weight: baseWeight,
          opacity: 0.95,
          dashArray: '10, 10',
          interactive: false,
          className: 'base-edge'
        }).addTo(map));
      }

      const minTime = Math.min(...edge.lines.map(code => edge.timeByLine[code]));
      const stateText = isBlocked ? (editable ? ' · Đang cấm (bấm để bỏ)' : ' · Tạm dừng khai thác') : '';
      line.bindTooltip(
        `${a.name} ↔ ${b.name}<br>${edge.lines.map(lineLabel).join(' / ')} · ${formatMinutes(minTime)}${stateText}`,
        { sticky: true }
      );

      if (!clickable) return;

      line.on('click', event => {
        L.DomEvent.stopPropagation(event);
        onEdgeClick(edge.key);
      });
      line.on('mouseover', () => line.setStyle({ weight: 8, opacity: 1 }));
      line.on('mouseout', () => line.setStyle(styleFor(edge, blocked.has(edge.key), baseWeight)));
    });
  }

  return { redraw };
}
