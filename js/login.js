// Trang đăng nhập.

import { login, getSession, APP_PAGE } from './auth/auth.js';
import { stations } from './data/stations.js';
import { lineProfiles } from './data/lines.js';
import { drawLineBundle, fillLineStrip } from './ui/line-bundle.js';

if (getSession()) location.replace(APP_PAGE);

const $ = id => document.getElementById(id);
const form = $('login-form');
const errorBox = $('login-error');
const submit = $('login-submit');
const username = $('username');
const password = $('password');
const toggle = $('toggle-password');
const capsHint = $('caps-hint');
const submitHtml = submit.innerHTML;

// ----- Trang trí -----
drawLineBundle($('line-bundle'));
fillLineStrip($('card-strip'));
const lineCount = Object.keys(lineProfiles).filter(code => code !== 'XFER').length;
$('network-meta').textContent = `Hong Kong MTR · ${stations.length} ga · ${lineCount} tuyến`;

// ----- Form -----
function showError(message, fieldIds = []) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
  ['field-username', 'field-password'].forEach(id => $(id).classList.toggle('invalid', fieldIds.includes(id)));
  if (message) {
    errorBox.classList.remove('shake');
    void errorBox.offsetWidth; // chạy lại animation
    errorBox.classList.add('shake');
  }
}

function setLoading(loading) {
  submit.disabled = loading;
  submit.innerHTML = loading ? '<span class="spinner"></span><span>Đang đăng nhập</span>' : submitHtml;
}

toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
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
    showError(err.message, ['field-username', 'field-password']);
    password.value = '';
    password.focus();
    setLoading(false);
  }
});
