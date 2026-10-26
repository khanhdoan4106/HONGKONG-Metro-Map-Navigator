// Cấu hình các chế độ tìm đường du lịch.

export const routeModes = {
  balanced: {
    label: 'Cân bằng',
    shortLabel: 'Cân bằng',
    tag: 'Du lịch thông minh',
    description: 'Giữ thời gian hợp lý và ưu tiên các ga có điểm ăn chơi.',
    timeWeight: 1,
    transferWeight: 1.35,
    attractionBonus: 0.45,
    maxStationBonus: 1.2,
    heuristicWeight: 0.35
  },
  fastest: {
    label: 'Nhanh nhất',
    shortLabel: 'Nhanh nhất',
    tag: 'Ưu tiên thời gian',
    description: 'Đi nhanh nhất theo thời gian MTR ước tính.',
    timeWeight: 1,
    transferWeight: 1,
    attractionBonus: 0,
    maxStationBonus: 0,
    heuristicWeight: 1
  },
  lowTransfers: {
    label: 'Ít đổi tuyến',
    shortLabel: 'Ít đổi tuyến',
    tag: 'Dễ đi',
    description: 'Phạt nặng việc đổi tuyến để tìm hành trình dễ theo dõi hơn.',
    timeWeight: 1.02,
    transferWeight: 4.2,
    attractionBonus: 0.1,
    maxStationBonus: 0.3,
    heuristicWeight: 0.2
  },
  food: {
    label: 'Ăn uống',
    shortLabel: 'Ăn uống',
    tag: 'Món ngon',
    description: 'Ưu tiên các tuyến đi qua ga có món ngon, chợ đêm hoặc khu ẩm thực địa phương.',
    timeWeight: 1.08,
    transferWeight: 1.35,
    attractionBonus: 1.1,
    maxStationBonus: 2.1,
    heuristicWeight: 0.12,
    preferredKinds: ['Food', 'Night market', 'Local market']
  },
  checkin: {
    label: 'Check-in',
    shortLabel: 'Check-in',
    tag: 'Điểm đẹp',
    description: 'Ưu tiên các ga gần view đẹp, địa danh, văn hóa và điểm chụp ảnh.',
    timeWeight: 1.08,
    transferWeight: 1.35,
    attractionBonus: 1,
    maxStationBonus: 2,
    heuristicWeight: 0.12,
    preferredKinds: ['View', 'Photo', 'Culture', 'Heritage', 'Landmark', 'Nature', 'Theme park', 'Art', 'Shopping']
  }
};

export const routeModeOrder = ['balanced', 'fastest', 'lowTransfers', 'food', 'checkin'];
