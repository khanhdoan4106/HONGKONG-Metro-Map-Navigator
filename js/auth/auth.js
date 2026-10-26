// Đăng nhập / đăng xuất / phiên làm việc và kiểm tra quyền.

import { ACCOUNTS, ROLES } from './accounts.js';

const SESSION_KEY = 'mtr.session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // phiên "ghi nhớ" hết hạn sau 12 giờ

export const LOGIN_PAGE = 'login.html';
export const APP_PAGE = 'index.html';

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hashPassword(username, password) {
  return sha256Hex(`mtr-navigator:${username}:${password}`);
}

function readStorage(storage) {
  try {
    const raw = storage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStorage() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* bỏ qua */ }
  try { localStorage.removeItem(SESSION_KEY); } catch { /* bỏ qua */ }
}

/**
 * @returns {Promise<{username:string, displayName:string, role:string, loginAt:number}>}
 * @throws {Error} khi sai tên đăng nhập hoặc mật khẩu
 */
export async function login(username, password, { remember = false } = {}) {
  const name = String(username || '').trim().toLowerCase();
  const account = ACCOUNTS.find(item => item.username === name);
  const hash = await hashPassword(name, String(password || ''));

  // So sánh hash cả khi không có tài khoản để thời gian phản hồi như nhau
  if (!account || hash !== account.passwordHash) {
    throw new Error('Sai tên đăng nhập hoặc mật khẩu.');
  }

  const session = {
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    loginAt: Date.now()
  };

  clearStorage();
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  clearStorage();
}

/** Phiên hiện tại, hoặc null nếu chưa đăng nhập / phiên không hợp lệ. */
export function getSession() {
  const session = readStorage(sessionStorage) || readStorage(localStorage);
  if (!session) return null;

  // Chỉ chấp nhận phiên khớp với một tài khoản có thật và đúng vai trò của nó
  const account = ACCOUNTS.find(item => item.username === session.username);
  const expired = Date.now() - Number(session.loginAt || 0) > SESSION_TTL_MS;
  if (!account || account.role !== session.role || expired) {
    clearStorage();
    return null;
  }
  return session;
}

export function isAdmin(session = getSession()) {
  return session?.role === ROLES.ADMIN;
}

/** Dùng ở đầu trang cần đăng nhập: chuyển về trang login nếu chưa có phiên. */
export function requireAuth() {
  const session = getSession();
  if (!session) {
    location.replace(LOGIN_PAGE);
    return null;
  }
  return session;
}
