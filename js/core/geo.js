// Hình học: khoảng cách Haversine và kiểm tra điểm nằm trong ranh giới Hong Kong.

export function haversine(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
          + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
          * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Ray casting
export function polygonContains(ring, point) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xj)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Kiểm tra latlng có nằm trong GeoJSON ranh giới không.
 * Nếu chưa có GeoJSON (load lỗi / chưa xong) thì cho qua.
 */
export function isInsideBoundary(geojson, latlng) {
  if (!geojson) return true;

  const point = [latlng.lng, latlng.lat]; // GeoJSON dùng [lng, lat]
  const geometries = geojson.features
    ? geojson.features.map(feature => feature.geometry)
    : [geojson.geometry];

  return geometries.some(geom => {
    if (!geom) return false;
    if (geom.type === 'Polygon') return polygonContains(geom.coordinates[0], point);
    if (geom.type === 'MultiPolygon') return geom.coordinates.some(poly => polygonContains(poly[0], point));
    return false;
  });
}
