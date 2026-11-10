# FHBank — Quản lý ngân hàng

Ứng dụng quản lý ngân hàng làm cho bài tập lớn Cơ sở dữ liệu. Giao diện desktop hiện tại được xây bằng React, TypeScript, Tailwind CSS và Electron; dữ liệu lưu trong MySQL.

## Thành viên nhóm

| Họ tên | MSSV |
|---|---|
| Nguyễn Thế Huy | B24DCCN284 |
| Nguyễn Trí Hiếu | B24DCCN218 |
| Nguyễn Văn Hưng | B24DCCN262 |
| Bùi Thanh Hùng | B24DCCN251 |
## Chức năng
xq
- Tra cứu hồ sơ khách hàng và tài khoản.
- Mở tài khoản tín dụng và gửi tiền; ghi chi tiêu và thanh toán tín dụng.
- Xem dư nợ, tiền gửi, lịch sử giao dịch và giao dịch theo khoảng ngày.
- Xem báo cáo chi tiêu, thu nhập/xếp hạng nhân viên, tăng trưởng khách hàng và phân bố theo thành phố.
- Cảnh báo hạn mức và quản lý trạng thái đóng băng tài khoản.
- Quản lý hồ sơ nhân viên.
- Dashboard có chế độ sáng/tối và trạng thái kết nối MySQL.

## Công nghệ

- React + TypeScript + Tailwind CSS + Vite
- Electron cho ứng dụng desktop Windows
- MySQL 8.0.16 trở lên
- `mysql2` chạy ở Electron main process; renderer gọi qua IPC, không kết nối trực tiếp đến MySQL.

## Cấu trúc dự án

```text
electron/       Electron main/preload và API MySQL
src/            Giao diện React và các trang chức năng
sql/            Script schema, dữ liệu mẫu, view, trigger, procedure và truy vấn
docs/           Sơ đồ EER và tài liệu yêu cầu CSDL
app/            Ứng dụng Streamlit cũ, tài liệu nghiệp vụ và cấu hình dev app/.env
release/        Bộ cài Windows được tạo bởi electron-builder (không commit)
```

Ứng dụng desktop không chạy các trang Python trong `app/`; chúng được giữ lại để tham khảo và đối chiếu nghiệp vụ. File `app/.env` vẫn được Electron dùng khi phát triển.

## Yêu cầu

- Windows 10/11
- Node.js và npm
- MySQL 8.0.16 trở lên, đang chạy và có thể truy cập từ máy dùng FHBank

## Thiết lập cơ sở dữ liệu

Nếu database `quan_ly_ngan_hang` đã tồn tại và có dữ liệu, **không cần chạy lại script SQL**. Script bên dưới có lệnh xóa rồi tạo lại database, nên sẽ xóa dữ liệu hiện tại nếu chạy lại.

Chỉ khi cần tạo database mới hoặc khôi phục dữ liệu mẫu, chạy `sql/BTL_CSDL_QuanLyNganHang.sql` bằng MySQL Workbench hoặc MySQL client. Script tạo bảng, dữ liệu mẫu, view, trigger và stored procedure mà FHBank gọi.

## Chạy ở chế độ phát triển

1. Sao chép `app/.env.example` thành `app/.env`.
2. Mở `app/.env` và điền thông tin MySQL của máy:

   ```dotenv
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=mat_khau_mysql_cua_ban
   DB_NAME=quan_ly_ngan_hang
   ```

   Không thêm dấu ngoặc kép quanh giá trị. Với MySQL trên máy khác, thay `localhost` bằng hostname/IP của máy chủ.

3. Mở Terminal tại thư mục gốc dự án và chạy:

   ```powershell
   npm install
   npm run dev
   ```

## Đóng gói Windows

```powershell
npm run desktop:pack
```

Bộ cài NSIS được tạo trong `release/`, ví dụ `release/FHBank Setup 0.1.0.exe`.

Sau khi cài, bản desktop đã đóng gói đọc cấu hình từ `%APPDATA%\FHBank\.env`. Hãy tạo file đó với cùng các biến `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` như cấu hình dev.

## Kiểm tra build

```powershell
npm run build
```

Build kiểm tra TypeScript và tạo giao diện production. Các thao tác ghi dữ liệu nên được kiểm thử trên database thử nghiệm hoặc bản sao, không phải dữ liệu đang sử dụng.

## Git và dữ liệu

- Git lưu mã nguồn, không lưu các bản ghi MySQL được tạo khi chạy ứng dụng.
- Các file `.env` bị bỏ qua bởi `.gitignore`; không commit mật khẩu.
- Muốn nhiều người cùng thấy dữ liệu, cấu hình FHBank kết nối đến cùng một MySQL server; push code lên Git không đồng bộ database.

## Ứng dụng Streamlit (bản cũ)

Hướng dẫn cài đặt và chạy bản web Streamlit: xem [app/README.md](app/README.md).
