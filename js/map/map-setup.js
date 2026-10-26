// Khởi tạo bản đồ Leaflet, các lớp nền và ranh giới Hong Kong.

const HK_MAX_BOUNDS = [[22.15, 113.82], [22.58, 114.44]];
const BOUNDARY_URL = './assets/data/hongkong.geojson';

export function createMap(elementId = 'map') {
  const map = L.map(elementId, {
    zoomControl: false,
    maxBounds: HK_MAX_BOUNDS,
    maxBoundsViscosity: 1.3,
    minZoom: 10,
    maxZoom: 18
  }).setView([22.34, 114.15], 11);

  const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CARTO'
  });

  const baseMaps = {
    'Bản đồ Sáng': cartoLight,
    'Bản đồ Tối': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap, © CARTO'
    }),
    'Tiêu chuẩn (OSM)': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }),
    'Vệ tinh (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles © Esri'
    })
  };

  // Lớp sáng hiển thị tuyến MTR rõ nhất
  cartoLight.addTo(map);
  // Góc trên phải; góc dưới dành cho hai mascot
  L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

  return map;
}

/** Tải GeoJSON ranh giới; trả về null nếu lỗi (khi đó không chặn click ngoài HK). */
export async function loadHKBoundary() {
  try {
    const res = await fetch(BOUNDARY_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Không load được boundary HK:', err);
    return null;
  }
}
