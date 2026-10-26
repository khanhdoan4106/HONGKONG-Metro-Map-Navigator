// Các ga hiển thị trên biển tên ga ở trang đăng nhập (tên chữ Hán + tuyến + hướng đi).

export const signStations = [
  { id: 'CEN', zh: '中環',   line: 'ISL', toward: 'SHW' },
  { id: 'ADM', zh: '金鐘',   line: 'TWL', toward: 'TST' },
  { id: 'TST', zh: '尖沙咀', line: 'TWL', toward: 'JOR' },
  { id: 'MOK', zh: '旺角',   line: 'KTL', toward: 'PRE' },
  { id: 'KOT', zh: '九龍塘', line: 'EAL', toward: 'TAW' },
  { id: 'CAB', zh: '銅鑼灣', line: 'ISL', toward: 'TIH' }
];

/** Toàn bộ chữ Hán cần tải từ Google Fonts (tham số text= để chỉ tải đúng các chữ này). */
export const SIGN_GLYPHS = [...new Set(signStations.map(s => s.zh).join(''))].join('');
