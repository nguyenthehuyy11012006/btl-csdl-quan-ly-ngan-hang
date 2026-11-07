# Ứng dụng quản lý ngân hàng

Bài tập lớn môn Cơ sở dữ liệu – Project 3: Hệ thống quản lý ngân hàng (Học viện Công nghệ Bưu chính Viễn thông).
Giảng viên hướng dẫn: Nguyễn Việt Dũng. Nhóm 01: Nguyễn Thế Huy, Nguyễn Trí Hiếu, Nguyễn Văn Hưng, Bùi Thanh Hùng.

Ứng dụng web viết bằng **Python + Streamlit**, kết nối **MySQL** bằng PyMySQL. Người dùng không cần biết lập trình: mọi chức năng đều có giao diện, và thông báo lỗi tiếng Việt của trigger/procedure trong CSDL được hiển thị nguyên văn trên trang.

## 1. Yêu cầu

- **MySQL 8.0.16 trở lên** (CSDL dùng CHECK, trigger, procedure và hàm cửa sổ như `RANK`, `LAG`).
- **Python 3.10 trở lên** (đã chạy thử trên Python 3.14).
- **Git** để lấy mã nguồn.

## 2. Cài đặt và chạy

Các lệnh dưới đây chạy trong Terminal (macOS/Linux). Người dùng Windows xem ghi chú ở cuối mục.

### Bước 1. Lấy mã nguồn

```
git clone https://github.com/nguyenthehuyy11012006/btl-csdl-quan-ly-ngan-hang.git
cd btl-csdl-quan-ly-ngan-hang
```

### Bước 2. Bật MySQL

Trên macOS cài bằng Homebrew:

```
brew install mysql
brew services start mysql
```

Nếu đã cài rồi, kiểm tra bằng `brew services list` và bảo đảm dòng `mysql` ở trạng thái `started`.

### Bước 3. Nạp CSDL

Chạy ở thư mục gốc của repo (nhập mật khẩu `root` của MySQL khi được hỏi, nếu root chưa đặt mật khẩu thì nhấn Enter):

```
mysql -u root -p --default-character-set=utf8mb4 < sql/BTL_CSDL_QuanLyNganHang.sql
```

Lệnh này tạo database `quan_ly_ngan_hang` cùng bảng, trigger, view, procedure và dữ liệu mẫu. Nếu database đó đã có, nó bị xóa và tạo lại. Chạy xong không báo lỗi nào là thành công.

### Bước 4. Tạo môi trường ảo và cài thư viện

```
cd app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Sau khi bật môi trường ảo, đầu dòng lệnh có thêm chữ `(.venv)`.

### Bước 5. Cấu hình kết nối

```
cp .env.example .env
```

Mở file `.env` và điền mật khẩu MySQL của bạn:

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `DB_HOST` | Máy chạy MySQL | `localhost` |
| `DB_PORT` | Cổng MySQL | `3306` |
| `DB_USER` | Tên đăng nhập | `root` |
| `DB_PASSWORD` | Mật khẩu (để trống nếu không có) | trống |
| `DB_NAME` | Tên database | `quan_ly_ngan_hang` |

File `.env` chứa mật khẩu nên đã được `.gitignore` chặn, **không commit file này**. Chỉ file mẫu `.env.example` nằm trên repo.

### Bước 6. Chạy ứng dụng

```
streamlit run app.py
```

Trình duyệt tự mở `http://localhost:8501`. Trang chủ hiện dòng "Đã kết nối CSDL quan_ly_ngan_hang" và số dòng của từng bảng. Menu bên trái dẫn tới các chức năng.

Những lần sau chỉ cần:

```
cd app
source .venv/bin/activate
streamlit run app.py
```

Tắt ứng dụng bằng `Ctrl + C` trong Terminal.

### Ghi chú cho Windows

- Tạo môi trường ảo: `py -m venv .venv`, bật bằng `.venv\Scripts\activate`.
- Sao chép file cấu hình: `copy .env.example .env`.
- Nếu lệnh `mysql` không được nhận ra, mở "MySQL Command Line Client" hoặc thêm thư mục `bin` của MySQL vào biến môi trường `PATH`.
- Bật MySQL: dịch vụ `MySQL80` trong Services (thường tự chạy sau khi cài).

## 3. Cấu trúc thư mục

```
btl-csdl-quan-ly-ngan-hang/
├── docs/                      Tài liệu của đề tài
├── sql/
│   └── BTL_CSDL_QuanLyNganHang.sql   Tạo CSDL, ràng buộc, dữ liệu mẫu, truy vấn
└── app/
    ├── app.py                 Trang chủ, kiểm tra kết nối
    ├── db.py                  Kết nối MySQL, hàm query / call / execute, dịch lỗi sang tiếng Việt
    ├── requirements.txt       Danh sách thư viện
    ├── .env.example           File cấu hình mẫu
    └── pages/                 Mỗi file là một trang trong menu
```

## 4. Chức năng

### 5 chức năng theo đề bài

| Trang | Nội dung |
|---|---|
| `1_Luong_nhan_vien_kinh_doanh` | Lương nhân viên kinh doanh theo tháng |
| `2_Giao_dich_tin_dung_theo_ngay` | Tên khách hàng và số tiền giao dịch tín dụng trong khoảng ngày |
| `3_Tai_khoan_tin_dung_va_du_no` | Thông tin tài khoản tín dụng kèm dư nợ |
| `4_Top_10_tien_gui` | 10 khách hàng có tổng tiền gửi nhiều nhất |
| `5_Thanh_toan_tin_dung` | Thanh toán tài khoản tín dụng từ tài khoản gửi tiền |

### Trang nghiệp vụ

| Trang | Nội dung |
|---|---|
| `6_Mo_tai_khoan` | Mở tài khoản tín dụng hoặc gửi tiền cho khách hàng |
| `7_Ghi_chi_tieu` | Ghi chi tiêu trên tài khoản tín dụng |

### 10 tính năng phụ

| Tính năng | Trang |
|---|---|
| 1, 2. Tra cứu khách hàng, tra cứu tài khoản | `8_Tra_cuu_khach_hang_va_tai_khoan` |
| 3. Quản lý nhân viên (xem, thêm, sửa, xóa) | `9_Quan_ly_nhan_vien` |
| 4. Lịch sử giao dịch | `10_Lich_su_giao_dich` |
| 5. Thống kê chi tiêu và dư nợ | `11_Thong_ke_chi_tieu_va_du_no` |
| 6. Xếp hạng nhân viên theo thu nhập | `12_Xep_hang_thu_nhap_nhan_vien` |
| 7. Cảnh báo tài khoản gần hạn mức | `13_Canh_bao_han_muc` |
| 8. Đóng băng và mở băng tài khoản | `14_Dong_bang_tai_khoan` |
| 9. Tăng trưởng khách hàng | `15_Tang_truong_khach_hang` |
| 10. Thành phố có tỉ lệ khách hàng cao | `16_Thanh_pho_ti_le_khach_hang` |

## 5. Ràng buộc của CSDL thể hiện trên ứng dụng

Ứng dụng làm hai việc: hiện sẵn thông tin để người dùng không vi phạm ràng buộc, và nếu vẫn vi phạm thì hiện lại nguyên văn thông báo của CSDL.

| Ràng buộc | Cách thể hiện |
|---|---|
| Chỉ thanh toán bằng tài khoản gửi tiền của chính mình; thanh toán hộ tài khoản tín dụng của người khác thì được | Trang thanh toán chỉ liệt kê tài khoản gửi tiền của khách hàng đã chọn; danh sách tài khoản tín dụng gồm cả của người khác; lịch sử giao dịch có cột "Thanh toán hộ" |
| Số dư còn lại phải lớn hơn hoặc bằng số dư tối thiểu; không thanh toán quá dư nợ | Trang thanh toán hiện dư nợ, số dư, số dư tối thiểu và số tiền tối đa; nhập quá thì cảnh báo, bấm vẫn được và CSDL từ chối kèm lý do |
| Tổng nợ không vượt hạn mức tín dụng | Trang chi tiêu hiện hạn mức còn lại và thanh tiến độ; vượt thì hiện lỗi "Vượt hạn mức..." của trigger |
| Tối đa 2 tài khoản tín dụng và 3 tài khoản gửi tiền mỗi khách hàng | Trang mở tài khoản hiện "đã mở X / giới hạn" và khóa nút khi đã đủ |
| Chỉ nhân viên kinh doanh được tạo tài khoản | Ô chọn nhân viên ở trang mở tài khoản chỉ liệt kê nhân viên kinh doanh |
| Ngày tạo tài khoản không trước ngày đăng ký của khách hàng | Cảnh báo trên trang; CSDL từ chối nếu vẫn gửi |
| Tài khoản đóng băng không giao dịch được | Tài khoản đóng băng bị loại khỏi ô chọn kèm cảnh báo; có trang đóng băng và mở băng |
| CMT duy nhất; nhân viên đã được tham chiếu thì không xóa được | Trang quản lý nhân viên hiện lỗi tương ứng của CSDL |
| Dư nợ luôn khớp lịch sử giao dịch | Trang thống kê tự đối chiếu tổng chi tiêu trừ tổng thanh toán với tổng dư nợ |

## 6. Khắc phục sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| "Sai tên đăng nhập hoặc mật khẩu MySQL" | Mở `app/.env`, sửa `DB_USER` và `DB_PASSWORD` |
| "Chưa có CSDL quan_ly_ngan_hang" | Chạy lại Bước 3 để nạp CSDL |
| "Không kết nối được MySQL" | Bật MySQL (`brew services start mysql` trên macOS), kiểm tra `DB_HOST` và `DB_PORT` |
| `command not found: streamlit` hoặc `ModuleNotFoundError` | Chưa bật môi trường ảo: chạy `source .venv/bin/activate` trong thư mục `app` rồi thử lại |
| Lỗi nhắc thư viện `cryptography` | Chạy `pip install -r requirements.txt` trong môi trường ảo (MySQL 8 cần thư viện này để đăng nhập) |
| Chữ tiếng Việt trong CSDL bị lỗi font | Nạp lại CSDL với đúng tùy chọn `--default-character-set=utf8mb4` |
| Cổng 8501 đang bị dùng | `streamlit run app.py --server.port 8502` |

## 7. Đưa dữ liệu về như ban đầu

Các trang thanh toán, ghi chi tiêu, mở tài khoản, đóng băng và quản lý nhân viên ghi dữ liệu thật vào CSDL. Muốn quay về dữ liệu mẫu ban đầu, nạp lại file SQL (từ thư mục gốc của repo):

```
mysql -u root -p --default-character-set=utf8mb4 < sql/BTL_CSDL_QuanLyNganHang.sql
```

Sau đó tải lại trang web (`Cmd + R` hoặc `F5`).
