// Vẽ tuyến kết quả, đoạn đi bộ và marker điểm đi / điểm đến.

import { haversine } from '../core/geo.js';
import { stationById, lineColor } from '../core/graph.js';

const WALK_SPEED_KMH = 5;

export function pointMarker(map, latlng, kind) {
  const config = kind === 'start'
    ? { label: '▶ Bắt đầu', color: '#36c95a' }
    : { label: '■ Kết thúc', color: '#ff5252' };

  return L.marker(latlng, {
    icon: L.divIcon({
      className: '',
      html: `<div class="point-marker" style="background:${config.color}">${config.label}</div>`,
      iconSize: null, // để khung tự co theo nội dung (mặc định 12×12 làm chữ tràn ra ngoài)
      iconAnchor: [30, 12]
    })
  }).addTo(map);
}

function walkMinutes(latlng, station) {
  const dist = haversine({ lat: latlng.lat, lng: latlng.lng }, station);
  return Math.max(1, Math.ceil((dist / 1000 / WALK_SPEED_KMH) * 60));
}

export function createRouteLayer(map) {
  let layers = [];
  const mapEl = map.getContainer();

  function clear() {
    layers.forEach(layer => map.removeLayer(layer));
    layers = [];
    mapEl.classList.remove('has-active-route');
  }

  function walkLine(from, to, tooltip) {
    const line = L.polyline([from, to], {
      color: '#8da2b5',
      weight: 5,
      dashArray: '6, 8',
      lineCap: 'round',
      opacity: 0.9,
      className: 'walk-path'
    }).addTo(map);
    line.bindTooltip(tooltip, { sticky: true });
    layers.push(line);
  }

  function draw(result, startLatLng, endLatLng) {
    clear();
    mapEl.classList.add('has-active-route');

    const startStn = stationById.get(result.route[0]);
    const endStn = stationById.get(result.route[result.route.length - 1]);

    walkLine(startLatLng, [startStn.lat, startStn.lng],
      `🚶 Đi bộ tới ga ${startStn.name} · ~${walkMinutes(startLatLng, startStn)} phút`);
    walkLine([endStn.lat, endStn.lng], endLatLng,
      `🚶 Đi bộ từ ga ${endStn.name} · ~${walkMinutes(endLatLng, endStn)} phút`);

    result.legs.forEach(leg => {
      const a = stationById.get(leg.from);
      const b = stationById.get(leg.to);
      layers.push(L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
        color: lineColor(leg.line),
        weight: leg.isTransfer ? 5 : 7,
        opacity: 1,
        dashArray: leg.isTransfer ? '5,8' : '15, 12',
        lineCap: 'round',
        lineJoin: 'round',
        className: leg.isTransfer ? 'active-route-transfer' : 'active-route-core'
      }).addTo(map));
    });
  }

  return { draw, clear };
}
