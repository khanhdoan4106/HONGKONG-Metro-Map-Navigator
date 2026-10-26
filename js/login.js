// Trang đăng nhập.

import { login, getSession, APP_PAGE } from './auth/auth.js';
import { startStationSign } from './ui/station-sign.js';

if (getSession()) location.replace(APP_PAGE);

const $ = id => document.getElementById(id);
const form = $('login-form');
const errorBox = $('login-error');
const submit = $('login-submit');
const username = $('username');
const password = $('password');
const toggle = $('toggle-password');
const capsHint = $('caps-hint');

startStationSign($('platform'));

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
