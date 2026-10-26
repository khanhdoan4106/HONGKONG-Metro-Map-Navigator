// Trang đăng nhập.

import { login, getSession, APP_PAGE } from './auth/auth.js';
import { getSignStops } from './core/sign-stops.js';
import { createStationScene, webglAvailable } from './ui/station-scene.js';
import { createRouteMapCard } from './ui/route-map-card.js';

if (getSession()) location.replace(APP_PAGE);

const $ = id => document.getElementById(id);
const form = $('login-form');
const errorBox = $('login-error');
const submit = $('login-submit');
const username = $('username');
const password = $('password');
const toggle = $('toggle-password');
const capsHint = $('caps-hint');

// ================= Cảnh sân ga + bảng thông tin =================
const PHASE_TEXT = {
  arriving: 'Tàu đang vào ga',
  stopped: 'Tàu đã dừng',
  doors: 'Cửa đang mở',
  departing: 'Tàu rời ga',
  waiting: 'Chuyến kế tiếp sắp tới'
};

const hud = $('hud');
['hud-zh', 'hud-en', 'hud-code', 'hud-line', 'hud-dir', 'hud-next', 'hud-min'].forEach(id => $(id).classList.add('swap'));

const routeCard = createRouteMapCard($('route-card'));
let stopCount = 0;

let lastStopId = null;

let firstStop = true;
function showStop(stop) {
  if (stop.id !== lastStopId) {
    lastStopId = stop.id;
    routeCard.showRoute(stop.id, stopCount++);
  }
  const fill = () => {
    document.documentElement.style.setProperty('--line', stop.color);
    $('hud-zh').textContent = stop.zh;
    $('hud-en').textContent = stop.en;
    $('hud-code').textContent = stop.lineCode;
    $('hud-line').textContent = stop.lineName;
    $('hud-dir').textContent = `Hướng ${stop.terminus}`;
    $('hud-next').textContent = stop.next;
    $('hud-min').textContent = stop.minutes;
  };
  if (firstStop) {
    firstStop = false;
    fill();
    return;
  }
  hud.classList.add('is-changing');
  setTimeout(() => {
    fill();
    hud.classList.remove('is-changing');
  }, 350);
}

const stops = getSignStops();
const canvas = $('scene');

if (window.THREE && webglAvailable()) {
  try {
    createStationScene(canvas, {
      stops,
      onStation: showStop,
      onPhase: phase => { $('hud-phase').textContent = PHASE_TEXT[phase] || ''; }
    });
    requestAnimationFrame(() => canvas.classList.add('ready'));
  } catch (err) {
    console.warn('Không dựng được cảnh 3D, dùng nền tĩnh:', err);
    showStop(stops[0]);
  }
} else {
  // Không có WebGL / không tải được Three.js: giữ nền gradient và bảng thông tin tĩnh
  showStop(stops[0]);
  $('hud-phase').textContent = PHASE_TEXT.stopped;
}

// Đồng hồ giờ Hong Kong
const clockFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', hour12: false });
const tick = () => { $('hk-clock').textContent = clockFmt.format(new Date()); };
tick();
setInterval(tick, 15000);

// ================= Form =================
function showError(message, fieldIds = []) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
  ['field-username', 'field-password'].forEach(id => $(id).classList.toggle('invalid', fieldIds.includes(id)));
}

function setLoading(loading) {
  submit.disabled = loading;
  submit.innerHTML = loading ? '<span class="spinner" aria-hidden="true"></span>Đang đăng nhập' : 'Đăng nhập';
}

toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.textContent = show ? 'Ẩn' : 'Hiện';
  toggle.setAttribute('aria-pressed', String(show));
  password.focus();
});

password.addEventListener('keyup', event => {
  capsHint.hidden = !event.getModifierState?.('CapsLock');
});

form.addEventListener('input', () => {
  if (!errorBox.hidden) showError('');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const name = username.value.trim();

  if (!name || !password.value) {
    const missing = [!name && 'field-username', !password.value && 'field-password'].filter(Boolean);
    showError('Nhập tên đăng nhập và mật khẩu để tiếp tục.', missing);
    (name ? password : username).focus();
    return;
  }

  setLoading(true);
  try {
    await login(name, password.value, { remember: form.remember.checked });
    location.replace(APP_PAGE);
  } catch (err) {
    showError(`${err.message} Kiểm tra lại rồi thử lần nữa.`, ['field-username', 'field-password']);
    password.value = '';
    password.focus();
    setLoading(false);
  }
});
