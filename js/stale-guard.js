// Bảo vệ khi trình duyệt giữ lẫn file cũ và mới sau mỗi lần cập nhật GitHub Pages
// (Pages cho trình duyệt cache file 10 phút; HTML mới + JS cũ làm module lỗi import).
//
// Dùng: <script src="js/stale-guard.js" data-ready-flag="__loginReady"></script>
// Module chính của trang đặt window[flag] = true khi chạy xong. Nếu sau khi tải trang
// cờ vẫn chưa bật, hiện thông báo kèm nút tải lại. Nút này ép trình duyệt tải lại
// mọi file JS/CSS của trang từ máy chủ (bỏ qua cache) rồi mới tải lại trang.
// Đây là script thường (không phải module) để vẫn chạy được khi các module bị lỗi.
(function () {
  var script = document.currentScript;
  var flag = (script && script.getAttribute('data-ready-flag')) || '__appReady';
  if (location.protocol === 'file:') return;

  function sameOriginAssets() {
    var urls = {};
    (performance.getEntriesByType('resource') || []).forEach(function (entry) {
      if (entry.name.indexOf(location.origin) === 0) urls[entry.name.split('#')[0]] = true;
    });
    document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach(function (el) {
      var url = new URL(el.getAttribute('src') || el.getAttribute('href'), location.href).href;
      if (url.indexOf(location.origin) === 0) urls[url] = true;
    });
    urls[location.href.split('#')[0]] = true;
    return Object.keys(urls);
  }

  function forceRefresh(button) {
    if (button) {
      button.disabled = true;
      button.textContent = 'Đang tải bản mới...';
    }
    var jobs = sameOriginAssets().map(function (url) {
      return fetch(url, { cache: 'reload' }).catch(function () {});
    });
    Promise.all(jobs).then(function () { location.reload(); });
  }
  window.__forceRefresh = forceRefresh;

  function showNotice() {
    var style = document.createElement('style');
    style.textContent =
      '.stale-notice{position:fixed;left:50%;bottom:24px;z-index:99999;transform:translateX(-50%);' +
      'width:min(540px,calc(100% - 32px));display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;' +
      'padding:14px 16px;font:14px/1.45 "Be Vietnam Pro",system-ui,sans-serif;color:#fff;background:#3a1d24;' +
      'border:1px solid rgba(255,122,122,.45);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.45)}' +
      '.stale-notice p{flex:1;min-width:220px;margin:0}' +
      '.stale-notice button{font:inherit;font-weight:600;padding:7px 14px;border:0;border-radius:8px;' +
      'color:#04121c;background:#5fd4ff;cursor:pointer}' +
      '.stale-notice button:disabled{opacity:.7;cursor:wait}' +
      '.stale-notice small{flex-basis:100%;font-size:12.5px;color:#f2c4c4}';
    document.head.appendChild(style);

    var box = document.createElement('div');
    box.className = 'stale-notice';
    box.setAttribute('role', 'alert');
    box.innerHTML =
      '<p>Trang vừa được cập nhật nhưng trình duyệt còn giữ bản cũ.</p>' +
      '<button type="button">Tải bản mới</button>' +
      '<small>Nếu vẫn lỗi, mở trang bằng cửa sổ ẩn danh.</small>';
    box.querySelector('button').addEventListener('click', function () { forceRefresh(this); });
    document.body.appendChild(box);
  }

  window.addEventListener('load', function () {
    setTimeout(function () {
      if (!window[flag]) showNotice();
    }, 1500);
  });
})();
