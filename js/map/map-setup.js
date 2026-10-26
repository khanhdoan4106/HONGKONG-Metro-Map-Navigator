// Khởi tạo bản đồ Leaflet, các lớp nền và ranh giới Hong Kong.
//
// Lớp nền: dùng tile OpenStreetMap (không cần API key). Kiểu "Sáng" và "Tối" là
// cùng tile OSM được lọc màu bằng CSS (xem .tiles-light / .tiles-dark trong css/map.css),
// nên không phụ thuộc dịch vụ nào phải đăng ký.
//
// CARTO đã bắt đầu yêu cầu API key cho basemaps.cartocdn.com (hiện chữ "API key required").
// Nếu có key miễn phí từ https://carto.com/basemaps/apikey/ thì điền vào CARTO_KEY để
// có thêm hai lớp CARTO Positron / Dark Matter.

const CARTO_KEY = '';

const HK_MAX_BOUNDS = [[22.15, 113.82], [22.58, 114.44]];
const BOUNDARY_URL = './assets/data/hongkong.geojson';

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function createMap(elementId = 'map') {
  const map = L.map(elementId, {
    zoomControl: false,
    maxBounds: HK_MAX_BOUNDS,
    maxBoundsViscosity: 1.3,
    minZoom: 10,
    maxZoom: 18
  }).setView([22.34, 114.15], 11);

  const osm = className => L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION, className });

  const lightLayer = osm('tiles-light');
  const baseMaps = {
    'Bản đồ Sáng': lightLayer,
    'Bản đồ Tối': osm('tiles-dark'),
    'Tiêu chuẩn (OSM)': osm(''),
    'Vệ tinh (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    })
  };

  if (CARTO_KEY) {
    const carto = style => L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, {
      maxZoom: 19,
      attribution: `${OSM_ATTRIBUTION}, &copy; <a href="https://carto.com/attributions">CARTO</a>`
    });
    baseMaps['CARTO Positron'] = carto('light_all');
    baseMaps['CARTO Dark Matter'] = carto('dark_all');
  }

  // Lớp sáng (OSM nhạt màu) để màu các tuyến MTR nổi rõ nhất
  lightLayer.addTo(map);
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
