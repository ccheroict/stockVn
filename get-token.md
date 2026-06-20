# Lấy token TCBS tự động (không phải đào DevTools mỗi lần)

Token TCBS (`Authorization: Bearer ...`) sống ~12h. Thay vì copy thủ công từ
Network tab, dùng bookmarklet bên dưới: 1 click là token được copy vào clipboard,
chỉ việc dán vào file `.tcbs_token`.

## Cách cài bookmarklet
1. Tạo 1 bookmark mới trên trình duyệt (Ctrl+D ở trang bất kỳ rồi sửa).
2. Đặt tên: `TCBS token`.
3. Dán toàn bộ đoạn dưới (bắt đầu bằng `javascript:`) vào ô URL của bookmark.

```
javascript:(function(){function j(v){if(typeof v!=='string')return false;var p=v.split('.');if(p.length!==3)return false;try{var b=JSON.parse(atob(p[1].replace(/-/g,'+').replace(/_/g,'/')));return!!(b.tcbsId||b.iss==='authen_service'||b.custodyID);}catch(e){return false;}}var f=null;[localStorage,sessionStorage].forEach(function(s){for(var i=0;i<s.length;i++){var v=s.getItem(s.key(i));if(j(v)){f=v;continue;}try{var o=JSON.parse(v);for(var k in o){if(j(o[k]))f=o[k];}}catch(e){}}});if(f){navigator.clipboard.writeText(f).then(function(){alert('TCBS token da copy! Dan vao .tcbs_token');},function(){window.prompt('Copy token:',f);});}else{alert('Khong tim thay JWT TCBS trong storage - hay chac chan dang o tab tcinvest da dang nhap');}})();
```

## Cách dùng
1. Mở tab `tcinvest.tcbs.com.vn` đã đăng nhập.
2. Click bookmark `TCBS token` → hiện alert "đã copy".
3. Mở file `.tcbs_token`, xóa nội dung cũ, dán token mới (Ctrl+V), lưu.
4. Chạy lại `node screener.js`.

Bookmarklet tự tìm JWT (token nằm trực tiếp hoặc lồng trong object JSON ở
localStorage/sessionStorage) nên không cần biết trước key.

## Muốn tự động hoàn toàn (zero-touch)?
Xem `auto-token.md` (hướng Playwright) — đánh đổi: phải cài playwright + login 1 lần
vào profile riêng. Bảo mật token: file `.tcbs_token` có scope toàn tài khoản, giữ như mật khẩu.
