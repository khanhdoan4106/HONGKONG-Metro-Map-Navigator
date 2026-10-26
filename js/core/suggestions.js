// Gợi ý du lịch dọc tuyến và điểm thưởng du lịch dùng trong A*.

import { stopSuggestions } from '../data/suggestions.js';
import { routeModes } from '../data/route-modes.js';
import { stationById } from './graph.js';

const KIND_LABELS = {
  View: 'Ngắm cảnh',
  Culture: 'Văn hóa',
  Food: 'Ăn uống',
  Heritage: 'Di sản',
  Nature: 'Thiên nhiên',
  Shopping: 'Mua sắm',
  Photo: 'Chụp ảnh',
  Landmark: 'Địa danh',
  'Night market': 'Chợ đêm',
  'Local life': 'Đời sống địa phương',
  'Local culture': 'Văn hóa địa phương',
  'Local market': 'Chợ địa phương',
  Art: 'Nghệ thuật',
  'Theme park': 'Công viên chủ đề',
  Transit: 'Trung chuyển',
  'Day trip': 'Đi trong ngày'
};

const FOOD_KINDS = ['Food', 'Night market', 'Local market'];
const CHECKIN_KINDS = ['View', 'Photo', 'Culture', 'Heritage', 'Landmark', 'Nature', 'Theme park', 'Art', 'Shopping'];

export function kindLabel(kind) {
  return KIND_LABELS[kind] || kind;
}

export function isFoodSuggestion(item) {
  return FOOD_KINDS.includes(item.kind);
}

export function isCheckinSuggestion(item) {
  return CHECKIN_KINDS.includes(item.kind);
}

export function getRouteMode(modeKey) {
  return routeModes[modeKey] || routeModes.balanced;
}

export function stationTourBonus(stationId, modeKey) {
  const profile = getRouteMode(modeKey);
  const items = stopSuggestions[stationId] || [];
  if (!items.length || !profile.attractionBonus) return 0;

  if (!profile.preferredKinds) {
    return Math.min(profile.maxStationBonus, items.length * profile.attractionBonus);
  }

  const preferred = new Set(profile.preferredKinds);
  const matching = items.filter(item => preferred.has(item.kind)).length;
  const secondary = items.length - matching;
  const bonus = matching * profile.attractionBonus + secondary * 0.15;
  return Math.min(profile.maxStationBonus, bonus);
}

export function routeTourScore(route, modeKey) {
  const profile = getRouteMode(modeKey);
  const preferred = profile.preferredKinds ? new Set(profile.preferredKinds) : null;
  return route.reduce((total, stationId) => {
    const items = stopSuggestions[stationId] || [];
    return total + items.reduce((sum, item) => {
      if (!preferred) return sum + 1;
      return sum + (preferred.has(item.kind) ? 2 : 0.35);
    }, 0);
  }, 0);
}

/** Tối đa 6 gợi ý: ưu tiên gợi ý đầu tiên của mỗi ga trên tuyến. */
export function getRouteSuggestions(route) {
  const primary = [];
  const secondary = [];
  const seen = new Set();

  route.forEach((stationId, index) => {
    (stopSuggestions[stationId] || []).forEach((item, itemIndex) => {
      const key = `${stationId}:${item.title}`;
      if (seen.has(key)) return;
      seen.add(key);

      const suggestion = {
        ...item,
        stationId,
        stationName: stationById.get(stationId).name,
        stopIndex: index + 1
      };
      (itemIndex === 0 ? primary : secondary).push(suggestion);
    });
  });

  return [...primary, ...secondary].slice(0, 6);
}
