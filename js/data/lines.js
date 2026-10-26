// Dữ liệu tĩnh của mạng MTR Hong Kong (tách từ app.js cũ).
// Thời gian mỗi cạnh được ước tính từ khoảng cách geodesic, tốc độ tuyến,
// thời gian dừng ga và phạt đổi tuyến.

export const lineProfiles = {
  AEL: { name: 'Airport Express',      color: '#00888a', speedKmh: 75, dwellMins: 0.25, minEdgeMins: 2.0 },
  DRL: { name: 'Disneyland Resort',    color: '#f08bb4', speedKmh: 48, dwellMins: 0.35, minEdgeMins: 2.0 },
  EAL: { name: 'East Rail Line',       color: '#6cc4e8', speedKmh: 62, dwellMins: 0.35, minEdgeMins: 1.5 },
  ISL: { name: 'Island Line',          color: '#007dc5', speedKmh: 42, dwellMins: 0.35, minEdgeMins: 1.3 },
  KTL: { name: 'Kwun Tong Line',       color: '#00a040', speedKmh: 38, dwellMins: 0.35, minEdgeMins: 1.4 },
  SIL: { name: 'South Island Line',    color: '#b5bd00', speedKmh: 45, dwellMins: 0.35, minEdgeMins: 1.6 },
  TCL: { name: 'Tung Chung Line',      color: '#f7941d', speedKmh: 68, dwellMins: 0.35, minEdgeMins: 1.6 },
  TKL: { name: 'Tseung Kwan O Line',   color: '#7d499d', speedKmh: 45, dwellMins: 0.35, minEdgeMins: 1.4 },
  TML: { name: 'Tuen Ma Line',         color: '#9a3b26', speedKmh: 55, dwellMins: 0.35, minEdgeMins: 1.5 },
  TWL: { name: 'Tsuen Wan Line',       color: '#e2231a', speedKmh: 40, dwellMins: 0.35, minEdgeMins: 1.3 },
  XFER: { name: 'Đi bộ chuyển tuyến',  color: '#9aa4b2', speedKmh: 5,  dwellMins: 0,    minEdgeMins: 0 }
};

export const transferPenaltyMins = {
  ADM: 4, CEN: 4, HOK: 5, TST: 4, ETS: 4, KOT: 4, TAW: 4, DIH: 4,
  HOM: 4, HUH: 4, MEF: 4, NAC: 4, LAK: 3, TSY: 3, YMT: 3, MOK: 3,
  PRE: 3, NOP: 3, QUB: 3, YAT: 3, TIK: 3
};

export const DEFAULT_TRANSFER_MINS = 3;
export const FASTEST_SPEED_KMH = 75;

export const lineSequences = {
  AEL: [['HOK', 'KOW', 'TSY', 'AIR', 'AWE']],
  DRL: [['DIS', 'SUN']],
  EAL: [
    ['ADM', 'EXC', 'HUH', 'MKK', 'KOT', 'TAW', 'SHT', 'FOT', 'UNI', 'TAP', 'TWO', 'FAN', 'SHS', 'LOW'],
    ['ADM', 'EXC', 'HUH', 'MKK', 'KOT', 'TAW', 'SHT', 'FOT', 'UNI', 'TAP', 'TWO', 'FAN', 'SHS', 'LMC']
  ],
  ISL: [['KET', 'HKU', 'SYP', 'SHW', 'CEN', 'ADM', 'WAC', 'CAB', 'TIH', 'FOH', 'NOP', 'QUB', 'TAK', 'SWH', 'SKW', 'HFC', 'CHW']],
  KTL: [['WHA', 'HOM', 'YMT', 'MOK', 'PRE', 'SKM', 'KOT', 'LOF', 'WTS', 'DIH', 'CHH', 'KOB', 'NTK', 'KWT', 'LAT', 'YAT', 'TIK']],
  SIL: [['ADM', 'OCP', 'WCH', 'LET', 'SOH']],
  TCL: [['HOK', 'KOW', 'OLY', 'NAC', 'LAK', 'TSY', 'SUN', 'TUC']],
  TKL: [
    ['NOP', 'QUB', 'YAT', 'TIK', 'TKO', 'HAH', 'POA'],
    ['LHP', 'TKO', 'TIK']
  ],
  TML: [['WKS', 'MOS', 'HEO', 'TSH', 'SHM', 'CIO', 'STW', 'CKT', 'TAW', 'HIK', 'DIH', 'KAT', 'SUW', 'TKW', 'HOM', 'HUH', 'ETS', 'AUS', 'NAC', 'MEF', 'TWW', 'KSR', 'YUL', 'LOP', 'TIS', 'SIH', 'TUM']],
  TWL: [['CEN', 'ADM', 'TST', 'JOR', 'YMT', 'MOK', 'PRE', 'SSP', 'CSW', 'LCK', 'MEF', 'LAK', 'KWF', 'KWH', 'TWH', 'TSW']]
};

export const transferLinks = [
  { u: 'CEN', v: 'HOK', mins: 5 },
  { u: 'TST', v: 'ETS', mins: 4 }
];
