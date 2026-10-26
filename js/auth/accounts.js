// Tài khoản cố định của ứng dụng (không dùng database).
//
// Mật khẩu không lưu dạng rõ mà lưu SHA-256 của chuỗi
//   "mtr-navigator:<username>:<password>"
// Đổi mật khẩu: chạy lệnh dưới rồi dán kết quả vào passwordHash.
//   node -e "console.log(require('crypto').createHash('sha256').update('mtr-navigator:admin:MAT_KHAU_MOI').digest('hex'))"
//
// Lưu ý: đây là xác thực phía trình duyệt cho mục đích demo/học tập.
// Người dùng có kỹ thuật vẫn có thể sửa sessionStorage để giả quyền admin;
// muốn bảo mật thật cần kiểm tra quyền ở phía server.

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  USER: 'user'
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.USER]: 'Người dùng'
});

export const ACCOUNTS = Object.freeze([
  {
    username: 'admin',
    displayName: 'Admin',
    role: ROLES.ADMIN,
    // admin123
    passwordHash: '270751142c52af14e54dfa752057fa422d0726af7de0ac09b213c3057a1e58d0'
  },
  {
    username: 'user',
    displayName: 'Hành khách',
    role: ROLES.USER,
    // user123
    passwordHash: '0881dfe144aae40596158b6048f413004bdfbca1629669f7c7d76830bb297d93'
  }
]);
