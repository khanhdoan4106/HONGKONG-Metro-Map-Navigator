// Các phần tử dùng chung của panel: thanh trạng thái, thông tin tài khoản, danh sách đoạn bị chặn.

import { ROLE_LABELS, ROLES } from '../auth/accounts.js';
import { edgeByKey, stationById } from '../core/graph.js';
import { escapeHtml } from '../core/utils.js';

export function setStatus(text, variant = '') {
  const badge = document.getElementById('status-badge');
  badge.className = variant;
  badge.innerHTML = `<span class="dot"></span><span>${escapeHtml(text)}</span>`;
}

export function renderUserBar(session, onLogout) {
  const bar = document.getElementById('user-bar');
  const isAdmin = session.role === ROLES.ADMIN;
  const isGuest = session.role === ROLES.GUEST;
  bar.innerHTML = `
    <div class="user-info">
      <span class="user-avatar ${isAdmin ? 'admin' : isGuest ? 'guest' : ''}">${escapeHtml(session.displayName.charAt(0).toUpperCase())}</span>
      <span class="user-name">${escapeHtml(session.displayName)}</span>
      <span class="role-badge ${isAdmin ? 'admin' : isGuest ? 'guest' : 'user'}">${ROLE_LABELS[session.role]}</span>
    </div>
    <button class="logout-btn" type="button">${isGuest ? 'Đăng nhập' : 'Đăng xuất'}</button>`;
  bar.querySelector('.logout-btn').addEventListener('click', onLogout);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
  });
}

/**
 * @param {{ keys: string[], meta: (key:string)=>({at:number, by:string}|null), canEdit: boolean }} opts
 */
export function renderBlockedPanel({ keys, meta, canEdit }) {
  const count = keys.length;
  const list = document.getElementById('blocked-list');
  const empty = document.getElementById('blocked-empty-msg');
  const badge = document.getElementById('blocked-count-badge');
  const chip = document.getElementById('blocked-count-chip');
  const clearBtn = document.getElementById('clear-blocked-btn');

  badge.style.display = count ? 'inline' : 'none';
  badge.textContent = count;
  if (chip) {
    chip.style.display = count ? 'inline' : 'none';
    chip.textContent = count;
  }
  if (clearBtn) clearBtn.hidden = !canEdit || !count;

  empty.style.display = count ? 'none' : 'block';
  list.innerHTML = keys.map(key => {
    const edge = edgeByKey.get(key);
    if (!edge) return '';
    const u = stationById.get(edge.u);
    const v = stationById.get(edge.v);
    const info = meta(key);
    const since = info?.at ? `<div class="blocked-meta">Từ ${formatTime(info.at)}</div>` : '';
    const action = canEdit
      ? `<button class="unblock-btn" type="button" data-unblock="${edge.key}">Bỏ cấm</button>`
      : '<span class="blocked-tag">Tạm dừng</span>';

    return `
      <div class="blocked-line-item">
        <div>
          <div class="blocked-line-names">
            <span class="stn-tag">${u.name}</span>
            <span class="line-arrow">⟷</span>
            <span class="stn-tag">${v.name}</span>
          </div>
          ${since}
        </div>
        ${action}
      </div>`;
  }).join('');
}
