// Khởi tạo bản đồ Leaflet, các lớp nền và ranh giới Hong Kong.
//
// Lớp nền mặc định: CARTO Positron (cần API key, miễn phí 5 triệu tile/tháng).
// Key này bị giới hạn theo website (khanhdoan4106.github.io, localhost, 127.0.0.1)
// nên để công khai trong mã nguồn vẫn an toàn: trang khác dùng sẽ bị từ chối.
// Đổi / xin key mới: https://carto.com/basemaps/apikey/
//
// Dự phòng: nếu lớp đang dùng không tải được tile nào (key sai, bị chặn, mất mạng...),
// bản đồ tự chuyển sang lớp kế tiếp trong FALLBACK_ORDER (Esri không cần key).

const CARTO_KEY = 'cb1_4uum_1_dbc52731385a48b6635691a2';

const HK_MAX_BOUNDS = [[22.15, 113.82], [22.58, 114.44]];
const BOUNDARY_URL = './assets/data/hongkong.geojson';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION}, &copy; <a href="https://carto.com/attributions">CARTO</a>`;

function cartoLayer(style) {
  return L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${CARTO_KEY}`, {
    maxZoom: 19,
    attribution: CARTO_ATTRIBUTION
  });
}

function esriLayer(path, maxNativeZoom = 19) {
  return L.tileLayer(`${ESRI}/${path}/MapServer/tile/{z}/{y}/{x}`, {
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

  const baseMaps = {};
  if (CARTO_KEY) {
    baseMaps['Bản đồ Sáng'] = cartoLayer('light_all');
    baseMaps['Bản đồ Tối'] = cartoLayer('dark_all');
    baseMaps['Voyager'] = cartoLayer('voyager');
  }
  Object.assign(baseMaps, {
    'Xám nhạt (Esri)': esriLayer('Canvas/World_Light_Gray_Base', 16),
    'Xám đậm (Esri)': esriLayer('Canvas/World_Dark_Gray_Base', 16),
    'Đường phố (Esri)': esriLayer('World_Street_Map'),
    'Vệ tinh (Esri)': L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    }),
    'OpenStreetMap': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION
    })
  });

  const FALLBACK_ORDER = ['Bản đồ Sáng', 'Xám nhạt (Esri)', 'Đường phố (Esri)', 'OpenStreetMap', 'Vệ tinh (Esri)']
    .filter(name => baseMaps[name]);
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
      const next = order.find(candidate => !tried.has(candidate));
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
