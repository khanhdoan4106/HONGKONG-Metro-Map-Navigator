// Trang đăng nhập.

import { login, getSession, APP_PAGE } from './auth/auth.js';

if (getSession()) location.replace(APP_PAGE);

const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const submit = document.getElementById('login-submit');
const password = document.getElementById('password');
const toggle = document.getElementById('toggle-password');

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

toggle.addEventListener('click', () => {
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  toggle.textContent = visible ? 'Hiện' : 'Ẩn';
});

form.addEventListener('input', () => showError(''));

form.addEventListener('submit', async event => {
  event.preventDefault();
  const username = form.username.value.trim();

  if (!username || !password.value) {
    showError('Vui lòng nhập tên đăng nhập và mật khẩu.');
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Đang đăng nhập...';

  try {
    await login(username, password.value, { remember: form.remember.checked });
    location.replace(APP_PAGE);
  } catch (err) {
    showError(err.message);
    password.value = '';
    password.focus();
    submit.disabled = false;
    submit.textContent = 'Đăng nhập';
  }
});
