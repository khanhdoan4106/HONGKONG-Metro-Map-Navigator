// Kho lưu các đoạn metro bị chặn.
// - Chỉ admin được thay đổi (kiểm tra quyền ngay tại đây, không chỉ ở UI).
// - Lưu vào localStorage nên user đăng nhập sau trên cùng trình duyệt sẽ thấy.
// - Đồng bộ giữa các tab qua sự kiện "storage".

import { getSession, isAdmin } from '../auth/auth.js';
import { edgeByKey } from '../core/graph.js';

const STORAGE_KEY = 'mtr.blockedEdges';

/** @type {Map<string, {at:number, by:string}>} */
let entries = load();
const listeners = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const result = new Map();
    Object.entries(raw.edges || {}).forEach(([key, meta]) => {
      const edge = edgeByKey.get(key);
      if (edge && !edge.isTransfer) result.set(key, meta);
    });
    return result;
  } catch {
    return new Map();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, edges: Object.fromEntries(entries) }));
  } catch {
    // localStorage bị chặn: vẫn chạy được trong phiên hiện tại
  }
}

function emit() {
  listeners.forEach(listener => listener());
}

function assertAdmin() {
  if (!isAdmin()) throw new Error('Chỉ quản trị viên mới được chặn hoặc bỏ chặn tuyến.');
}

export const blockedStore = {
  has(key) {
    return entries.has(key);
  },
  get size() {
    return entries.size;
  },
  keys() {
    return [...entries.keys()].sort();
  },
  meta(key) {
    return entries.get(key) || null;
  },
  toggle(key) {
    assertAdmin();
    const edge = edgeByKey.get(key);
    if (!edge || edge.isTransfer) return;
    if (entries.has(key)) entries.delete(key);
    else entries.set(key, { at: Date.now(), by: getSession().username });
    persist();
    emit();
  },
  remove(key) {
    assertAdmin();
    if (entries.delete(key)) {
      persist();
      emit();
    }
  },
  clear() {
    assertAdmin();
    if (!entries.size) return;
    entries.clear();
    persist();
    emit();
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  entries = load();
  emit();
});
