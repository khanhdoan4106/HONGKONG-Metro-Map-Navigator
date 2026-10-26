// Trang đăng nhập.

import { login, getSession, APP_PAGE } from './auth/auth.js';
import { stations } from './data/stations.js';
import { lineProfiles } from './data/lines.js';
import { railEdgeCount } from './core/graph.js';
import { drawNetworkArt } from './ui/network-art.js';

if (getSession()) location.replace(APP_PAGE);

const $ = id => document.getElementById(id);
const form = $('login-form');
const errorBox = $('login-error');
const submit = $('login-submit');
const username = $('username');
const password = $('password');
const toggle = $('toggle-password');
const capsHint = $('caps-hint');

// ----- Phần trang trí: số liệu và sơ đồ lấy từ dữ liệu thật -----
const railLines = Object.entries(lineProfiles).filter(([code]) => code !== 'XFER');
$('stat-stations').textContent = stations.length;
$('stat-lines').textContent = railLines.length;
$('stat-edges').textContent = railEdgeCount;
$('line-strip').innerHTML = railLines.map(([, p]) => `<i style="--line:${p.color}"></i>`).join('');
drawNetworkArt($('network-canvas'));

// ----- Form -----
function showError(message, fields = []) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
  ['field-username', 'field-password'].forEach(id => $(id).classList.toggle('invalid', fields.includes(id)));
  if (message) {
    errorBox.classList.remove('shake');
    void errorBox.offsetWidth; // chạy lại animation
    errorBox.classList.add('shake');
  }
}

function setLoading(loading) {
  submit.disabled = loading;
  submit.innerHTML = loading ? '<span class="spinner"></span>Đang đăng nhập...' : 'Đăng nhập';
}

toggle.addEventListener('click', () => {
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  toggle.textContent = visible ? 'Hiện' : 'Ẩn';
  toggle.setAttribute('aria-pressed', String(!visible));
  password.focus();
});

password.addEventListener('keyup', event => {
  capsHint.hidden = !event.getModifierState?.('CapsLock');
});

form.addEventListener('input', () => showError(''));

form.addEventListener('submit', async event => {
  event.preventDefault();
  const name = username.value.trim();

  if (!name || !password.value) {
    const missing = [!name && 'field-username', !password.value && 'field-password'].filter(Boolean);
    showError('Vui lòng nhập tên đăng nhập và mật khẩu.', missing);
    (name ? password : username).focus();
    return;
  }

  setLoading(true);
  try {
    await login(name, password.value, { remember: form.remember.checked });
    location.replace(APP_PAGE);
  } catch (err) {
    showError(err.message, ['field-username', 'field-password']);
    password.value = '';
    password.focus();
    setLoading(false);
  }
});
