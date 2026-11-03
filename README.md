# BTL Cơ sở dữ liệu – Project 3: Hệ thống quản lý ngân hàng

Bài tập lớn môn Cơ sở dữ liệu (MySQL). Repo gồm:

- **Yêu cầu 1** – sơ đồ EER và mô tả cấu trúc CSDL: thư mục `docs/`
- **Yêu cầu 2** – file SQL tạo CSDL, dữ liệu mẫu và các truy vấn: thư mục `sql/`
- **Yêu cầu 3** – ứng dụng: thư mục `app/` (sẽ bổ sung)

## Thành viên nhóm

| Họ tên         | MSSV       | Phụ trách |
|----------------|------------|-----------|
|Nguyễn Thế Huy  |B24DCCN284  |           |
|                |            |           |
|                |            |           |

## Cấu trúc thư mục

```
.
├── README.md
├── sql/
│   └── BTL_CSDL_QuanLyNganHang.sql    # bảng, hàm, view, trigger, procedure, dữ liệu mẫu, 5 truy vấn
├── docs/
│   ├── EER_quan_ly_ngan_hang.png      # sơ đồ EER (ảnh)
│   └── EER_quan_ly_ngan_hang.pdf      # sơ đồ EER (PDF)
└── app/                               # ứng dụng (sẽ bổ sung)
```

## Yêu cầu cài đặt

- **MySQL 8.0.16 trở lên** (cần CHECK constraint). Kiểm tra bằng `mysql --version`.
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

Phải thấy 6 bảng `GiaoDich`, `KhachHang`, `NhanVien`, `TaiKhoan`, `TaiKhoanGuiTien`, `TaiKhoanTinDung` và view `v_DuNoTinDung` (trên macOS có thể hiện chữ thường `v_dunotindung`).

Khi chạy cả file, màn hình in ra kết quả của 5 truy vấn. Một vài số để đối chiếu:

- Truy vấn 3: tài khoản `TKT009` đứng đầu với dư nợ 110.000.000.
- Truy vấn 4: khách hàng `KH009` đứng đầu với tổng tiền gửi 500.000.000.
- Truy vấn 5: sau hai lệnh thanh toán, `TKT001` còn nợ 30.000.000 và `TKT009` còn nợ 90.000.000.

## Nội dung file SQL

| Mục | Nội dung |
|-----|----------|
| 1 | Tạo 6 bảng: `NhanVien`, `KhachHang`, `TaiKhoan`, `TaiKhoanTinDung`, `TaiKhoanGuiTien`, `GiaoDich` |
| 2 | Hàm `fn_DuNo` và view `v_DuNoTinDung` để tính dư nợ |
| 3 | Trigger cài các ràng buộc (tối đa 2 TK tín dụng / 3 TK gửi tiền, hạn mức, số dư tối thiểu, chỉ nhân viên kinh doanh được tạo tài khoản, ...) |
| 4 | Stored procedure: `sp_MoTaiKhoanTinDung`, `sp_MoTaiKhoanGuiTien`, `sp_ChiTieu`, `sp_ThanhToan` |
| 5 | Dữ liệu mẫu (8 nhân viên, 12 khách hàng, 11 TK tín dụng, 16 TK gửi tiền, 23 giao dịch) |
| 6 | Năm truy vấn theo đề bài |
| 7 | Các lệnh kiểm thử ràng buộc (đang để comment) |

### Năm truy vấn trong mục 6

1. Lương nhân viên kinh doanh theo từng tháng (500.000 / TK tín dụng + 2% số tiền gửi lần đầu của TK gửi tiền).
2. Khách hàng và số tiền giao dịch trên mỗi TK tín dụng trong một khoảng thời gian (đổi `@tu_ngay`, `@den_ngay`).
3. Các TK tín dụng kèm dư nợ, sắp xếp giảm dần theo dư nợ.
4. Mười khách hàng có tổng tiền gửi nhiều nhất.
5. Thanh toán TK tín dụng từ TK gửi tiền: `CALL sp_ThanhToan(...)`.

## Thử các ràng buộc

Ví dụ chi tiêu vượt hạn mức (phải báo lỗi):

```bash
mysql -u root -p quan_ly_ngan_hang -e "CALL sp_ChiTieu('KH010','NV004','TKT010',10000000,NULL);"
# ERROR 1644 (45000): Vượt hạn mức: nợ 9,000,000 + 10,000,000 > 15,000,000
```

Các lệnh kiểm thử khác nằm ở mục 7 của file SQL. Muốn đưa dữ liệu về trạng thái ban đầu, chạy lại file SQL.

## Lưu ý khi làm việc nhóm

- **Không đưa mật khẩu vào repo** (file SQL, file cấu hình, code). Mỗi người dùng mật khẩu MySQL của máy mình.
- Trước khi sửa file chung, chạy `git pull`. Sửa xong thì `git add`, `git commit`, `git push`.
- Mỗi lần sửa file SQL nên chạy lại toàn bộ file trên MySQL thật để chắc không có lỗi.
