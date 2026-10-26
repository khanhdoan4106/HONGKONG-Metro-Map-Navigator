// Tiện ích dùng chung: định dạng số liệu và escape HTML.

export function roundedMinutes(value) {
  return Math.round(value * 10) / 10;
}

export function formatMinutes(value) {
  return `${Math.round(value)} phút`;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}
