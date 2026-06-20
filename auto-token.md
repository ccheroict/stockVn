# Tự động lấy token TCBS (Playwright)

Tự đọc token từ một browser session đã đăng nhập → ghi vào `.tcbs_token`.
Không lưu mật khẩu trong code.

## Cài 1 lần
```
cd C:/Chung/stockVn
npm init -y
npm i playwright
npx playwright install chromium
```

## Dùng
```
node auto-token.js
```
- Lần đầu: cửa sổ Chrome mở ra trang tcinvest → bạn đăng nhập (cả OTP). Script tự
  phát hiện token và ghi `.tcbs_token` rồi đóng.
- Session lưu trong `.tcbs-profile/` → các lần sau web app tự cấp token mới, chạy
  `node auto-token.js --headless` là lấy được token mới mà không cần login lại
  (tới khi session hết hạn hẳn thì login lại 1 lần).

## Pipeline đầy đủ
```
node auto-token.js --headless     # làm mới token
node screener.js                  # lọc mã -> data/_watchlist.txt
node crawl.js --list data/_watchlist.txt   # tải OHLC
```

## Bảo mật
- `.tcbs_token` và `.tcbs-profile/` chứa quyền truy cập tài khoản → đã gitignore.
- Không commit, không chia sẻ 2 thứ này.
