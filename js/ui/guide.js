// Điều khiển lời thoại và biểu cảm của hai mascot.

import { guideMoods, defaultGuideTips } from '../data/guide-dialogs.js';
import { formatMinutes } from '../core/utils.js';
import { getRouteSuggestions, isCheckinSuggestion, isFoodSuggestion } from '../core/suggestions.js';

let tips = [];
let tipIndex = 0;
let role = 'user';

function applyMood(targetId, badgeId, mood) {
  const safeMood = guideMoods[mood] ? mood : 'happy';
  const moodClass = `mood-${safeMood}`;

  [document.getElementById(targetId), document.getElementById(badgeId)].forEach(el => {
    if (!el) return;
    Object.keys(guideMoods).forEach(key => el.classList.remove(`mood-${key}`));
    el.classList.add(moodClass);
  });

  const badge = document.getElementById(badgeId);
  const config = guideMoods[safeMood];
  const icon = badge?.querySelector('.mood-icon');
  const label = badge?.querySelector('.mood-label');
  if (icon) icon.textContent = config.icon;
  if (label) label.textContent = config.label;
}

/** @param {{left:string, right:string, leftMood?:string, rightMood?:string}} tip */
export function setGuideTip(tip) {
  const left = document.getElementById('guide-text');
  const right = document.getElementById('guide-text-right');
  if (left) left.textContent = tip.left || '';
  if (right) right.textContent = tip.right || '';
  applyMood('tour-guide', 'guide-mood-left', tip.leftMood || 'happy');
  applyMood('tour-guide-right', 'guide-mood-right', tip.rightMood || 'idea');
}

function setTips(list) {
  tips = list;
  tipIndex = 0;
  if (tips.length) setGuideTip(tips[0]);
}

export function cycleGuideTip() {
  if (!tips.length) return;
  tipIndex = (tipIndex + 1) % tips.length;
  setGuideTip(tips[tipIndex]);
}

export function resetGuideTips() {
  setTips([...(defaultGuideTips[role] || defaultGuideTips.user)]);
}

export function initGuide(userRole) {
  role = userRole;
  document.getElementById('tour-guide')?.addEventListener('click', cycleGuideTip);
  document.getElementById('tour-guide-right')?.addEventListener('click', cycleGuideTip);
  resetGuideTips();
}

export function showRouteTips(result) {
  const suggestions = getRouteSuggestions(result.route);
  const list = [
    {
      left: `${result.modeShortLabel}: tớ thấy tuyến này có ${suggestions.length} điểm dừng chân, đi khoảng ${formatMinutes(result.cost)}.`,
      right: result.transfers > 1
        ? `Nhưng có ${result.transfers} lần đổi tuyến. Tớ hơi không vui đâu, nhớ đọc lịch trình kỹ nhé.`
        : 'Ít đổi tuyến đấy. Đi như vậy khá gọn, tớ tạm chấp nhận.',
      leftMood: suggestions.length ? 'excited' : 'idea',
      rightMood: result.transfers > 1 ? 'pout' : 'proud'
    }
  ];

  suggestions.slice(0, 5).forEach((item, index) => {
    const food = isFoodSuggestion(item);
    const checkin = isCheckinSuggestion(item);
    const leftWins = food || (!checkin && index % 2 === 0);

    list.push({
      left: leftWins
        ? `${item.stationName}: tớ vote xuống thử ${item.title}. ${item.walk}.`
        : `${item.stationName} cũng được, nhưng tớ vẫn muốn dành thời gian cho đồ ăn hơn.`,
      right: leftWins
        ? `Khoan, đừng ham quá. ${item.tip}`
        : `${item.stationName}: ${item.title} hợp check-in hơn. ${item.tip}`,
      leftMood: food ? 'excited' : leftWins ? 'happy' : 'pout',
      rightMood: leftWins ? 'pout' : 'excited'
    });
  });

  list.push({
    left: 'Nếu bạn muốn vui hơn thì chọn Ăn uống, tớ sẽ có lý do đòi xuống tàu nhiều hơn.',
    right: 'Nếu muốn gọn hơn thì chọn Nhanh nhất hoặc Ít đổi tuyến. Tớ sẽ thắng cuộc tranh luận này.',
    leftMood: 'proud',
    rightMood: 'angry'
  });

  setTips(list);
}
