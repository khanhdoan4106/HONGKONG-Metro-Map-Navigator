// Khởi tạo bản đồ Leaflet, các lớp nền và ranh giới Hong Kong.
//
// Lớp nền mặc định: Esri Canvas (Light / Dark Gray) — miễn phí, không cần API key,
// kiểu xám nhạt giống CARTO Positron cũ nên màu các tuyến MTR nổi rõ.
//   - CARTO (basemaps.cartocdn.com) giờ yêu cầu API key, không key sẽ hiện chữ "API key required".
//   - tile.openstreetmap.org hạn chế trang web bên ngoài dùng trực tiếp, hay bị chặn (bản đồ xám trơn).
// Nếu lớp đang dùng không tải được tile nào, bản đồ tự chuyển sang lớp kế tiếp trong FALLBACK_ORDER.
//
// Có key CARTO miễn phí (https://carto.com/basemaps/apikey/) thì điền vào CARTO_KEY để có thêm 2 lớp CARTO.

const CARTO_KEY = '';

const HK_MAX_BOUNDS = [[22.15, 113.82], [22.58, 114.44]];
const BOUNDARY_URL = './assets/data/hongkong.geojson';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function esriCanvas(name, maxNativeZoom = 16) {
  return L.tileLayer(`${ESRI}/Canvas/${name}/MapServer/tile/{z}/{y}/{x}`, {
    maxZoom: 19,
    maxNativeZoom,
    attribution: ESRI_ATTRIBUTION
  });
}

export function createMap(elementId = 'map') {
  const map = L.map(elementId, {
    zoomControl: false,
    maxBounds: HK_MAX_BOUNDS,
    maxBoundsViscosity: 1.3,
    minZoom: 10,
    maxZoom: 18
  }).setView([22.34, 114.15], 11);

  const baseMaps = {
    'Bản đồ Sáng': esriCanvas('World_Light_Gray_Base'),
    'Bản đồ Tối': esriCanvas('World_Dark_Gray_Base'),
    'Đường phố (Esri)': L.tileLayer(`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      attribution: ESRI_ATTRIBUTION
    }),
    'Vệ tinh (Esri)': L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    }),
    'OpenStreetMap': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION
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

  const FALLBACK_ORDER = ['Bản đồ Sáng', 'Đường phố (Esri)', 'OpenStreetMap', 'Vệ tinh (Esri)'];
  watchTileFailures(map, baseMaps, FALLBACK_ORDER);

  baseMaps[FALLBACK_ORDER[0]].addTo(map);
  // Góc trên phải; góc dưới dành cho hai mascot
  L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

  return map;
}

/**
 * Nếu một lớp nền báo lỗi liên tiếp mà chưa tải được tile nào (máy chủ chặn / mất mạng),
 * tự chuyển sang lớp kế tiếp để bản đồ không bị xám trơn.
 */
function watchTileFailures(map, baseMaps, order) {
  const tried = new Set();

  Object.entries(baseMaps).forEach(([name, layer]) => {
    let errors = 0;
    let loaded = 0;

    layer.on('tileload', () => { loaded += 1; });
    layer.on('tileerror', () => {
      errors += 1;
      if (loaded > 0 || errors < 4 || !map.hasLayer(layer)) return;

      tried.add(name);
      const next = order.find(candidate => !tried.has(candidate) && baseMaps[candidate]);
      if (!next) return;

      console.warn(`Lớp nền "${name}" không tải được, chuyển sang "${next}".`);
      map.removeLayer(layer);
      baseMaps[next].addTo(map);
    });
  });
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
