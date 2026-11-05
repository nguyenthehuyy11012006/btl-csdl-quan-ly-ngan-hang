# BTL Cơ sở dữ liệu – Project 3: Hệ thống quản lý ngân hàng

Bài tập lớn môn Cơ sở dữ liệu (MySQL). Repo gồm:

- **Yêu cầu 1** – sơ đồ EER và mô tả cấu trúc CSDL: thư mục `docs/`
- **Yêu cầu 2** – file SQL tạo CSDL, dữ liệu mẫu và các truy vấn: thư mục `sql/`
- **Yêu cầu 3** – ứng dụng: thư mục `app/` (sẽ bổ sung)

## Thành viên nhóm

| Họ tên | MSSV | Phụ trách |
|--------|------|-----------|
|        |      |           |
|        |      |           |
|        |      |           |

## Cấu trúc thư mục

```
.
├── README.md
├── sql/
│   └── BTL_CSDL_QuanLyNganHang.sql    # bảng, hàm, view, trigger, procedure, dữ liệu mẫu, các truy vấn
├── docs/
│   ├── EER_quan_ly_ngan_hang.png      # sơ đồ EER (ảnh)
│   └── EER_quan_ly_ngan_hang.pdf      # sơ đồ EER (PDF)
│   └── BTL_CSDL_YeuCau1.pdf           # file PDF Yêu cầu 1
└── app/                               # ứng dụng (sẽ bổ sung)
```

## Yêu cầu cài đặt

- **MySQL 8.0.16 trở lên** (cần CHECK constraint, hàm cửa sổ `RANK()`, `LAG()`). Kiểm tra bằng `mysql --version`.
- Biết tài khoản và mật khẩu MySQL của máy mình (thường là user `root`).

## Cách chạy CSDL

> ⚠️ File SQL sẽ **xóa rồi tạo lại** CSDL `quan_ly_ngan_hang`. Nếu máy bạn đã có CSDL trùng tên thì dữ liệu trong đó sẽ mất.

Tải repo về (nút **Code → Download ZIP** rồi giải nén, hoặc `git clone`), mở Terminal tại **thư mục gốc của repo**, sau đó chọn một trong các cách sau.

### Cách 1: một dòng lệnh (macOS / Linux)

```bash
mysql -u root -p --default-character-set=utf8mb4 < sql/BTL_CSDL_QuanLyNganHang.sql
```

Nhập mật khẩu MySQL của bạn khi được hỏi. Chạy xong không báo lỗi nào là thành công.

### Cách 2: dùng MySQL client (mọi hệ điều hành, kể cả Windows)

```bash
mysql -u root -p --default-character-set=utf8mb4
```

Trong dấu nhắc `mysql>`:

```sql
source sql/BTL_CSDL_QuanLyNganHang.sql;
```

### Cách 3: MySQL Workbench

`File → Open SQL Script…` → chọn `sql/BTL_CSDL_QuanLyNganHang.sql` → bấm biểu tượng tia sét (Execute).

### Cách 4: Docker (không cần cài MySQL)

```bash
docker run --name mysql-btl -e MYSQL_ROOT_PASSWORD=matkhau -p 3306:3306 -d mysql:8.0
# đợi khoảng 20–30 giây cho MySQL khởi động rồi chạy:
docker exec -i mysql-btl mysql -uroot -pmatkhau --default-character-set=utf8mb4 < sql/BTL_CSDL_QuanLyNganHang.sql
```

## Kiểm tra đã chạy thành công

```bash
mysql -u root -p -e "USE quan_ly_ngan_hang; SHOW TABLES;"
```

Phải thấy 6 bảng `GiaoDich`, `KhachHang`, `NhanVien`, `TaiKhoan`, `TaiKhoanGuiTien`, `TaiKhoanTinDung` và 3 view `v_DuNoTinDung`, `v_LuongNVKD`, `v_HoatDongTaiKhoan` (trên macOS tên view có thể hiện chữ thường).

Khi chạy cả file, màn hình in ra kết quả của các truy vấn. Một vài số để đối chiếu:

| Truy vấn | Kết quả đúng |
|----------|--------------|
| Truy vấn 3 (dư nợ) | `TKT009` đứng đầu với 110.000.000, tiếp theo `TKT004` với 50.000.000 |
| Truy vấn 4 (top 10 tiền gửi) | `KH009` đứng đầu với 500.000.000, thứ hai `KH003` với 355.000.000 |
| Truy vấn 5 (thanh toán) | Sau hai lệnh `CALL sp_ThanhToan`: `TKT001` còn nợ 30.000.000, `TKT009` còn nợ 90.000.000 |
| Tính năng 7 (cảnh báo ≥ 80% hạn mức) | `TKT008` (88,0%), `TKT011` (84,4%), `TKT002` (83,3%) |
| Tính năng 8 (đóng băng ≥ 6 tháng) | `TKG017`, `TKT012`, `TKT013` bị đóng băng (xem lưu ý bên dưới) |
| Tính năng 9 (khách mới theo năm) | 2024: 2, 2025: 3, 2026: 7 |
| Tính năng 10 (thành phố) | Hà Nội 41,67%, TP. Hồ Chí Minh 25%, Đà Nẵng 16,67%, Hải Phòng và Cần Thơ 8,33% |

> Tính năng 8 tính "6 tháng" từ **ngày hiện tại của máy chạy**, nên nếu chạy file vào một ngày muộn hơn nhiều (vài tháng sau), sẽ có thêm tài khoản bị đóng băng. Đây là bình thường.

## Nội dung file SQL

| Mục | Nội dung |
|-----|----------|
| 1 | Tạo 6 bảng: `NhanVien`, `KhachHang`, `TaiKhoan`, `TaiKhoanTinDung`, `TaiKhoanGuiTien`, `GiaoDich` |
| 2 | Hàm `fn_DuNo` và view `v_DuNoTinDung` để tính dư nợ |
| 3 | Trigger cài các ràng buộc (tối đa 2 TK tín dụng / 3 TK gửi tiền, hạn mức, số dư tối thiểu, chỉ nhân viên kinh doanh được tạo tài khoản, tài khoản đóng băng không giao dịch được, ...) |
| 4 | Stored procedure: `sp_MoTaiKhoanTinDung`, `sp_MoTaiKhoanGuiTien`, `sp_ChiTieu`, `sp_ThanhToan` |
| 5 | Dữ liệu mẫu (8 nhân viên, 12 khách hàng ở 5 thành phố, 13 TK tín dụng, 17 TK gửi tiền, 26 giao dịch) |
| 6 | Năm truy vấn theo đề bài |
| 7 | Các lệnh kiểm thử ràng buộc (đang để comment) |
| 8 | Phần phụ trợ cho tính năng phụ 6–10: view `v_LuongNVKD`, `v_HoatDongTaiKhoan`, procedure đóng băng / mở băng, các truy vấn |

### Cột thêm cho tính năng phụ

| Cột | Dùng cho |
|-----|----------|
| `KhachHang.NgayDangKy` | Tính năng 9: tăng trưởng khách hàng |
| `KhachHang.ThanhPho` | Tính năng 10: thành phố có tỉ lệ khách hàng cao |
| `TaiKhoan.TrangThai` (`HoatDong` / `DongBang`) | Tính năng 8: tài khoản đóng băng |

### Năm truy vấn trong mục 6

1. Lương nhân viên kinh doanh theo từng tháng (500.000 / TK tín dụng + 2% số tiền gửi lần đầu của TK gửi tiền).
2. Khách hàng và số tiền giao dịch trên mỗi TK tín dụng trong một khoảng thời gian (đổi `@tu_ngay`, `@den_ngay`).
3. Các TK tín dụng kèm dư nợ, sắp xếp giảm dần theo dư nợ.
4. Mười khách hàng có tổng tiền gửi nhiều nhất.
5. Thanh toán TK tín dụng từ TK gửi tiền: `CALL sp_ThanhToan(...)`.

## Mười tính năng phụ của ứng dụng

| # | Tính năng | Dùng gì trong CSDL |
|---|-----------|--------------------|
| 1 | Tra cứu thông tin khách hàng | `KhachHang`, `TaiKhoan` |
| 2 | Tra cứu thông tin tài khoản | `TaiKhoan`, `TaiKhoanTinDung`, `TaiKhoanGuiTien` |
| 3 | Quản lý nhân viên (thêm, sửa, xóa, tra cứu, phân loại theo vị trí) | `NhanVien` |
| 4 | Thống kê lịch sử giao dịch (theo tài khoản, khách hàng, loại giao dịch, thời gian) | `GiaoDich` |
| 5 | Thống kê chi tiêu, thanh toán và dư nợ từng tài khoản tín dụng | `GiaoDich`, `v_DuNoTinDung` |
| 6 | Xếp hạng nhân viên theo mức thu nhập | `v_LuongNVKD` (mục 8.3) |
| 7 | Cảnh báo tài khoản dùng đến hạn mức | `v_DuNoTinDung` (mục 8.4) |
| 8 | Tài khoản đóng băng (từ 6 tháng không có giao dịch) | `TaiKhoan.TrangThai`, `v_HoatDongTaiKhoan`, `sp_DongBangTaiKhoanKhongHoatDong`, `sp_DongBangTaiKhoan`, `sp_MoBangTaiKhoan` (mục 8.2, 8.5) |
| 9 | Theo dõi tăng trưởng khách hàng (theo ngày, tháng, năm) | `KhachHang.NgayDangKy` (mục 8.6) |
| 10 | Thành phố có tỉ lệ khách hàng cao | `KhachHang.ThanhPho` (mục 8.7) |

## Thử các ràng buộc

Ví dụ chi tiêu vượt hạn mức (phải báo lỗi):

```bash
mysql -u root -p quan_ly_ngan_hang -e "CALL sp_ChiTieu('KH010','NV004','TKT010',10000000,NULL);"
# ERROR 1644 (45000): Vượt hạn mức: nợ 9,000,000 + 10,000,000 > 15,000,000
```

Ví dụ giao dịch trên tài khoản đã bị đóng băng (chạy sau khi chạy cả file; phải báo lỗi):

```bash
mysql -u root -p quan_ly_ngan_hang -e "CALL sp_ChiTieu('KH011','NV004','TKT012',1000000,NULL);"
# ERROR 1644 (45000): Tài khoản tín dụng đang bị đóng băng, cần mở băng trước khi giao dịch
```

Các lệnh kiểm thử khác nằm ở mục 7 và 8.8 của file SQL. Muốn đưa dữ liệu về trạng thái ban đầu, chạy lại file SQL.

## Lưu ý khi làm việc nhóm

- **Không đưa mật khẩu vào repo** (file SQL, file cấu hình, code). Mỗi người dùng mật khẩu MySQL của máy mình.
- Trước khi sửa file chung, chạy `git pull`. Sửa xong thì `git add`, `git commit`, `git push`.
- Mỗi lần sửa file SQL nên chạy lại toàn bộ file trên MySQL thật để chắc không có lỗi.
- Khi thêm bảng hoặc cột mới, nhớ cập nhật cả sơ đồ EER trong `docs/` và phần mô tả trong file PDF Yêu cầu 1.
