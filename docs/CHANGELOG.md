# Changelog

## 2026-10-26 — Làm lại giao diện trang bản đồ

### Thiết kế
- Bảng màu theo biển chỉ dẫn MTR: mực `#1c2530` trên nền trắng, màu nổi bật duy nhất là màu tuyến; đỏ `#c8102e` chỉ dùng cho đoạn tạm dừng và lỗi.
- Một font duy nhất Be Vietnam Pro (đồng bộ trang đăng nhập, đủ dấu tiếng Việt), số dùng tabular-nums. Bỏ Outfit và JetBrains Mono.
- Bỏ nhãn VIẾT HOA, chuỗi "A · B · C", emoji trong nhãn; câu chữ viết lại theo góc nhìn người dùng.
- Ga trên bản đồ vẽ theo quy ước bản đồ MTR (vòng trắng viền mực, ga đổi tuyến to hơn); nhãn Điểm đi / Điểm đến có mũi nhọn chạm đúng điểm bấm.

### Bố cục
- Thanh bước 1-2-3-4 thay bằng vé Từ / Đến hiện tên ga gần nhất đã chọn.
- Admin chuyển giữa "Chặn đoạn" và "Tìm đường" bằng 2 tab (thay nút Xác nhận).
- Kết quả tuyến vẽ thành strip map như trên cửa tàu: thanh màu tuyến, ga lên/xuống đậm, ga giữa thu gọn, dòng đi bộ / đổi tuyến giữa các chặng. Mỗi tuyến chỉ hiện một lần (trước lặp lại 3 lần).
- Phương án khác chỉ hiện khi A* tìm ra hơn một tuyến.
- Gộp `panel.css` + `app-layout.css` thành một `panel.css`; `auth.css` và `responsive.css` không còn ghi đè panel.

## 2026-10-26 — Tổ chức lại dự án và thêm đăng nhập phân quyền

### Cấu trúc
- Tách `app.js` (~1.900 dòng) thành ES modules theo lớp: `data/`, `core/`, `auth/`, `state/`, `map/`, `ui/`, điểm vào `main.js`.
- Thuật toán A* (`core/pathfinding.js`) không còn phụ thuộc DOM/biến toàn cục; tập đoạn bị chặn truyền qua tham số.
- Tách `style.css` thành `base`, `map`, `guide`, `panel`, `auth`, `responsive`.
- Chuyển `hongkong.geojson` vào `assets/data/`; gộp `README1.md` → `docs/tour-mode.md`, `README2.md` → changelog này.
- Bỏ toàn bộ `onclick` inline trong HTML, chuyển sang `addEventListener` / event delegation.
- Ghim Leaflet `1.9.4` (trước đây dùng URL không có phiên bản).

### Tính năng
- Trang `login.html`, 2 tài khoản cố định `admin` / `user`, mật khẩu lưu dạng SHA-256.
- Chưa đăng nhập thì bị chuyển về trang đăng nhập; thanh tài khoản + nút đăng xuất trong panel.
- Chỉ admin được chặn / bỏ chặn đoạn metro (kiểm tra ở cả UI lẫn kho dữ liệu), có thêm nút "Gỡ tất cả" và thời điểm chặn.
- Đoạn bị chặn được lưu `localStorage`, đồng bộ giữa các tab; user thấy danh sách "Đoạn tạm dừng" ở chế độ chỉ xem.
- Sau khi có tuyến, click bản đồ để chọn lại điểm đi mà không cần bấm đặt lại.

### Sửa lỗi
- Nhãn "Bắt đầu" / "Kết thúc" bị tràn chữ ra ngoài khung màu (divIcon mặc định 12×12px).

## Trước đó — Fix lỗi không thể Zoom Out
- Sửa `applyZoom()` để khi scale lớn hơn 1 thì `max-height` tự điều chỉnh.
- Thêm reset `panel.style.maxHeight` trong `resetMap()`.
