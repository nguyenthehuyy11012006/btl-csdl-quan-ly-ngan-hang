-- =====================================================================
--  BÀI TẬP LỚN CƠ SỞ DỮ LIỆU
--  PROJECT 3: HỆ THỐNG QUẢN LÝ NGÂN HÀNG
--  Yêu cầu 2: xây dựng CSDL bằng MySQL, nhập dữ liệu mẫu, viết truy vấn
-- ---------------------------------------------------------------------
--  Yêu cầu : MySQL 8.0.16 trở lên (cần CHECK constraint).
--  Cách chạy: mysql -u root -p --default-character-set=utf8mb4 < BTL_CSDL_QuanLyNganHang.sql
--             (hoặc mở file trong MySQL Workbench rồi bấm Execute)
--  Lưu ý    : file tự xóa và tạo lại CSDL `quan_ly_ngan_hang`.
--
--  Mục lục
--    0. Khởi tạo CSDL
--    1. Tạo bảng
--    2. Hàm và view hỗ trợ (tính dư nợ)
--    3. Trigger (các ràng buộc ngoài khóa / CHECK)
--    4. Stored procedure (mở tài khoản, chi tiêu, thanh toán)
--    5. Dữ liệu mẫu
--    6. Năm truy vấn theo đề bài
--    7. Kiểm thử các ràng buộc (các lệnh đang để comment, mỗi lệnh phải báo lỗi)
-- =====================================================================


-- =====================================================================
-- 0. KHỞI TẠO CSDL
-- =====================================================================
SET NAMES utf8mb4;

DROP DATABASE IF EXISTS quan_ly_ngan_hang;
CREATE DATABASE quan_ly_ngan_hang
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE quan_ly_ngan_hang;


-- =====================================================================
-- 1. TẠO BẢNG
-- =====================================================================

-- Nhân viên ngân hàng. Nhân viên kinh doanh là nhân viên có ViTri = 'Kinh doanh'
-- (lớp con không có thuộc tính riêng nên không tách bảng).
CREATE TABLE NhanVien (
    MaNV      VARCHAR(10)   NOT NULL,
    CMT       VARCHAR(12)   NOT NULL,
    Ten       VARCHAR(100)  NOT NULL,
    NgaySinh  DATE          NOT NULL,
    DiaChi    VARCHAR(255)  NOT NULL,
    BacNghe   TINYINT       NOT NULL,
    ThamNien  TINYINT       NOT NULL DEFAULT 0,        -- số năm
    ViTri     VARCHAR(50)   NOT NULL,                  -- Kinh doanh, Giao dịch viên, Kế toán, ...
    PRIMARY KEY (MaNV),
    UNIQUE KEY uq_nhanvien_cmt (CMT),
    CONSTRAINT ck_nv_bacnghe  CHECK (BacNghe >= 1),
    CONSTRAINT ck_nv_thamnien CHECK (ThamNien >= 0)
) ENGINE = InnoDB;

CREATE TABLE KhachHang (
    MaKH      VARCHAR(10)   NOT NULL,
    CMT       VARCHAR(12)   NOT NULL,
    Ten       VARCHAR(100)  NOT NULL,
    NgaySinh  DATE          NOT NULL,
    DiaChi    VARCHAR(255)  NOT NULL,
    PRIMARY KEY (MaKH),
    UNIQUE KEY uq_khachhang_cmt (CMT)
) ENGINE = InnoDB;

-- Tài khoản ngân hàng (lớp cha). Mỗi tài khoản thuộc đúng một lớp con.
CREATE TABLE TaiKhoan (
    MaTK      VARCHAR(12)   NOT NULL,
    MaKH      VARCHAR(10)   NOT NULL,                  -- quan hệ "Mở"
    MaNV_Tao  VARCHAR(10)   NOT NULL,                  -- quan hệ "Tạo" (phải là NV kinh doanh)
    LoaiTK    ENUM('TinDung', 'GuiTien') NOT NULL,
    SoDu      DECIMAL(15,0) NOT NULL DEFAULT 0,        -- TK gửi tiền: tiền hiện có; TK tín dụng: 0
    NgayTao   DATE          NOT NULL,
    PRIMARY KEY (MaTK),
    CONSTRAINT fk_tk_kh FOREIGN KEY (MaKH)     REFERENCES KhachHang (MaKH),
    CONSTRAINT fk_tk_nv FOREIGN KEY (MaNV_Tao) REFERENCES NhanVien (MaNV),
    CONSTRAINT ck_tk_sodu CHECK (SoDu >= 0)
) ENGINE = InnoDB;

CREATE TABLE TaiKhoanTinDung (
    MaTK    VARCHAR(12)   NOT NULL,
    HanMuc  DECIMAL(15,0) NOT NULL,                    -- hạn mức tín dụng
    PRIMARY KEY (MaTK),
    CONSTRAINT fk_td_tk FOREIGN KEY (MaTK) REFERENCES TaiKhoan (MaTK),
    CONSTRAINT ck_td_hanmuc CHECK (HanMuc > 0)
) ENGINE = InnoDB;

CREATE TABLE TaiKhoanGuiTien (
    MaTK             VARCHAR(12)   NOT NULL,
    LaiSuatThang     DECIMAL(5,2)  NOT NULL,           -- % / tháng, ví dụ 0.50 = 0,5%/tháng
    SoDuToiThieu     DECIMAL(15,0) NOT NULL,
    SoTienGuiLanDau  DECIMAL(15,0) NOT NULL,           -- dùng để tính lương nhân viên kinh doanh
    PRIMARY KEY (MaTK),
    CONSTRAINT fk_gt_tk FOREIGN KEY (MaTK) REFERENCES TaiKhoan (MaTK),
    CONSTRAINT ck_gt_laisuat  CHECK (LaiSuatThang >= 0),
    CONSTRAINT ck_gt_toithieu CHECK (SoDuToiThieu >= 0),
    CONSTRAINT ck_gt_gui      CHECK (SoTienGuiLanDau >= SoDuToiThieu)
) ENGINE = InnoDB;

-- Giao dịch trên tài khoản tín dụng.
--   ChiTieu   : khách hàng chi tiêu bằng thẻ tín dụng  -> tăng dư nợ.
--   ThanhToan : thanh toán tài khoản tín dụng bằng tiền từ tài khoản gửi tiền
--               -> giảm dư nợ, trừ SoDu của tài khoản gửi tiền (MaTK_GuiTien bắt buộc).
-- Dư nợ KHÔNG lưu thành cột mà tính từ bảng này (hàm fn_DuNo, view v_DuNoTinDung).
CREATE TABLE GiaoDich (
    MaGD          INT           NOT NULL AUTO_INCREMENT,
    MaKH          VARCHAR(10)   NOT NULL,              -- quan hệ "Thực hiện" (người thực hiện giao dịch)
    MaNV          VARCHAR(10)   NOT NULL,              -- quan hệ "Hỗ trợ" (nhân viên bất kỳ)
    MaTK_TinDung  VARCHAR(12)   NOT NULL,              -- quan hệ "Diễn ra trên"
    MaTK_GuiTien  VARCHAR(12)   NULL,                  -- quan hệ "Trích tiền từ" (chỉ khi ThanhToan)
    LoaiGD        ENUM('ChiTieu', 'ThanhToan') NOT NULL,
    SoTien        DECIMAL(15,0) NOT NULL,
    ThoiGian      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MaGD),
    KEY idx_gd_thoigian (ThoiGian),
    CONSTRAINT fk_gd_kh FOREIGN KEY (MaKH)         REFERENCES KhachHang (MaKH),
    CONSTRAINT fk_gd_nv FOREIGN KEY (MaNV)         REFERENCES NhanVien (MaNV),
    CONSTRAINT fk_gd_td FOREIGN KEY (MaTK_TinDung) REFERENCES TaiKhoanTinDung (MaTK),
    CONSTRAINT fk_gd_gt FOREIGN KEY (MaTK_GuiTien) REFERENCES TaiKhoanGuiTien (MaTK),
    CONSTRAINT ck_gd_sotien CHECK (SoTien > 0),
    CONSTRAINT ck_gd_loai   CHECK (   (LoaiGD = 'ThanhToan' AND MaTK_GuiTien IS NOT NULL)
                                   OR (LoaiGD = 'ChiTieu'   AND MaTK_GuiTien IS NULL))
) ENGINE = InnoDB;


-- =====================================================================
-- 2. HÀM VÀ VIEW HỖ TRỢ
-- =====================================================================
DELIMITER $$

-- Dư nợ hiện tại của một tài khoản tín dụng = tổng chi tiêu - tổng thanh toán.
CREATE FUNCTION fn_DuNo(p_MaTK VARCHAR(12))
RETURNS DECIMAL(15,0)
READS SQL DATA
BEGIN
    DECLARE v_duno DECIMAL(15,0);
    SELECT COALESCE(SUM(CASE LoaiGD WHEN 'ChiTieu' THEN SoTien ELSE -SoTien END), 0)
      INTO v_duno
      FROM GiaoDich
     WHERE MaTK_TinDung = p_MaTK;
    RETURN v_duno;
END$$

DELIMITER ;

-- Thông tin tài khoản tín dụng kèm dư nợ tại thời điểm truy vấn.
CREATE VIEW v_DuNoTinDung AS
SELECT td.MaTK,
       tk.MaKH,
       kh.Ten      AS TenKH,
       tk.NgayTao,
       td.HanMuc,
       COALESCE(SUM(CASE gd.LoaiGD WHEN 'ChiTieu' THEN gd.SoTien
                                   WHEN 'ThanhToan' THEN -gd.SoTien END), 0) AS DuNo
  FROM TaiKhoanTinDung td
  JOIN TaiKhoan  tk ON tk.MaTK = td.MaTK
  JOIN KhachHang kh ON kh.MaKH = tk.MaKH
  LEFT JOIN GiaoDich gd ON gd.MaTK_TinDung = td.MaTK
 GROUP BY td.MaTK, tk.MaKH, kh.Ten, tk.NgayTao, td.HanMuc;


-- =====================================================================
-- 3. TRIGGER
--    MySQL không có ASSERTION nên các ràng buộc phức tạp được cài bằng trigger.
--    Lỗi được báo bằng SIGNAL SQLSTATE '45000' kèm thông báo tiếng Việt;
--    ứng dụng chỉ cần hiển thị lại thông báo này cho người dùng.
-- =====================================================================
DELIMITER $$

-- 3.1 Tạo tài khoản: chỉ nhân viên kinh doanh; mỗi khách hàng tối đa 2 TK tín dụng, 3 TK gửi tiền.
CREATE TRIGGER trg_TaiKhoan_bi
BEFORE INSERT ON TaiKhoan
FOR EACH ROW
BEGIN
    DECLARE v_vitri VARCHAR(50);
    DECLARE v_so    INT;

    SELECT ViTri INTO v_vitri FROM NhanVien WHERE MaNV = NEW.MaNV_Tao;
    IF v_vitri IS NULL OR v_vitri <> 'Kinh doanh' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chỉ nhân viên kinh doanh mới được tạo tài khoản cho khách hàng';
    END IF;

    SELECT COUNT(*) INTO v_so
      FROM TaiKhoan
     WHERE MaKH = NEW.MaKH AND LoaiTK = NEW.LoaiTK;

    IF NEW.LoaiTK = 'TinDung' AND v_so >= 2 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Mỗi khách hàng chỉ được mở tối đa 2 tài khoản tín dụng';
    ELSEIF NEW.LoaiTK = 'GuiTien' AND v_so >= 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Mỗi khách hàng chỉ được mở tối đa 3 tài khoản gửi tiền';
    END IF;
END$$

-- 3.2 Bảng lớp con phải khớp loại tài khoản ở bảng lớp cha.
CREATE TRIGGER trg_TaiKhoanTinDung_bi
BEFORE INSERT ON TaiKhoanTinDung
FOR EACH ROW
BEGIN
    DECLARE v_loai VARCHAR(10);
    SELECT LoaiTK INTO v_loai FROM TaiKhoan WHERE MaTK = NEW.MaTK;
    IF v_loai IS NULL OR v_loai <> 'TinDung' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Tài khoản không tồn tại hoặc không phải tài khoản tín dụng';
    END IF;
END$$

CREATE TRIGGER trg_TaiKhoanGuiTien_bi
BEFORE INSERT ON TaiKhoanGuiTien
FOR EACH ROW
BEGIN
    DECLARE v_loai VARCHAR(10);
    SELECT LoaiTK INTO v_loai FROM TaiKhoan WHERE MaTK = NEW.MaTK;
    IF v_loai IS NULL OR v_loai <> 'GuiTien' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Tài khoản không tồn tại hoặc không phải tài khoản gửi tiền';
    END IF;
END$$

-- 3.3 Giao dịch: kiểm tra hạn mức, dư nợ, chủ tài khoản gửi tiền và số dư tối thiểu.
CREATE TRIGGER trg_GiaoDich_bi
BEFORE INSERT ON GiaoDich
FOR EACH ROW
BEGIN
    DECLARE v_hanmuc   DECIMAL(15,0);
    DECLARE v_duno     DECIMAL(15,0);
    DECLARE v_chu_gt   VARCHAR(10);
    DECLARE v_sodu     DECIMAL(15,0);
    DECLARE v_toithieu DECIMAL(15,0);
    DECLARE v_msg      VARCHAR(128);

    IF NEW.SoTien IS NULL OR NEW.SoTien <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số tiền giao dịch phải lớn hơn 0';
    END IF;

    SELECT HanMuc INTO v_hanmuc FROM TaiKhoanTinDung WHERE MaTK = NEW.MaTK_TinDung;
    IF v_hanmuc IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tài khoản tín dụng không tồn tại';
    END IF;
    SET v_duno = fn_DuNo(NEW.MaTK_TinDung);

    IF NEW.LoaiGD = 'ChiTieu' THEN
        IF NEW.MaTK_GuiTien IS NOT NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Giao dịch chi tiêu không dùng tài khoản gửi tiền';
        END IF;
        -- tổng nợ (gồm cả giao dịch đang thực hiện) không vượt hạn mức
        IF v_duno + NEW.SoTien > v_hanmuc THEN
            SET v_msg = CONCAT('Vượt hạn mức: nợ ', FORMAT(v_duno, 0), ' + ',
                               FORMAT(NEW.SoTien, 0), ' > ', FORMAT(v_hanmuc, 0));
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
        END IF;
    ELSE
        IF NEW.MaTK_GuiTien IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Giao dịch thanh toán phải chỉ rõ tài khoản gửi tiền';
        END IF;
        IF NEW.SoTien > v_duno THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Số tiền thanh toán lớn hơn dư nợ hiện tại';
        END IF;

        SELECT tk.MaKH, tk.SoDu, gt.SoDuToiThieu
          INTO v_chu_gt, v_sodu, v_toithieu
          FROM TaiKhoan tk
          JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
         WHERE tk.MaTK = NEW.MaTK_GuiTien;

        IF v_chu_gt IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tài khoản gửi tiền không tồn tại';
        END IF;
        -- thanh toán hộ người khác: TK tín dụng có thể của người khác, nhưng tiền phải của chính mình
        IF v_chu_gt <> NEW.MaKH THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Chỉ được thanh toán từ tài khoản gửi tiền của chính mình';
        END IF;
        IF v_sodu - NEW.SoTien < v_toithieu THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Số dư còn lại sau thanh toán thấp hơn số dư tối thiểu';
        END IF;
    END IF;
END$$

-- 3.4 Sau khi ghi giao dịch thanh toán thì trừ tiền ở tài khoản gửi tiền.
--     (Dư nợ tự giảm vì được tính từ bảng GiaoDich.)
CREATE TRIGGER trg_GiaoDich_ai
AFTER INSERT ON GiaoDich
FOR EACH ROW
BEGIN
    IF NEW.LoaiGD = 'ThanhToan' THEN
        UPDATE TaiKhoan
           SET SoDu = SoDu - NEW.SoTien
         WHERE MaTK = NEW.MaTK_GuiTien;
    END IF;
END$$

-- 3.5 Giao dịch đã ghi thì không được sửa/xóa (để dư nợ và số dư luôn khớp nhau).
CREATE TRIGGER trg_GiaoDich_bu
BEFORE UPDATE ON GiaoDich
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được sửa giao dịch đã ghi nhận';
END$$

CREATE TRIGGER trg_GiaoDich_bd
BEFORE DELETE ON GiaoDich
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được xóa giao dịch đã ghi nhận';
END$$

DELIMITER ;


-- =====================================================================
-- 4. STORED PROCEDURE
--    Mỗi procedure chạy trong một transaction: lỗi ở bất kỳ bước nào
--    (kể cả lỗi do trigger) thì ROLLBACK toàn bộ và báo lại lỗi cho nơi gọi.
-- =====================================================================
DELIMITER $$

-- 4.1 Mở tài khoản tín dụng (bảng cha + bảng con trong cùng transaction).
CREATE PROCEDURE sp_MoTaiKhoanTinDung(
    IN p_MaTK    VARCHAR(12),
    IN p_MaKH    VARCHAR(10),
    IN p_MaNV    VARCHAR(10),      -- nhân viên kinh doanh tạo tài khoản
    IN p_NgayTao DATE,             -- NULL = hôm nay
    IN p_HanMuc  DECIMAL(15,0)
)
BEGIN
    DECLARE v_khoa VARCHAR(10);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    -- khóa dòng khách hàng để hai lần mở tài khoản song song không vượt quá giới hạn
    SELECT MaKH INTO v_khoa FROM KhachHang WHERE MaKH = p_MaKH FOR UPDATE;

    INSERT INTO TaiKhoan (MaTK, MaKH, MaNV_Tao, LoaiTK, SoDu, NgayTao)
    VALUES (p_MaTK, p_MaKH, p_MaNV, 'TinDung', 0, COALESCE(p_NgayTao, CURDATE()));

    INSERT INTO TaiKhoanTinDung (MaTK, HanMuc)
    VALUES (p_MaTK, p_HanMuc);
    COMMIT;
END$$

-- 4.2 Mở tài khoản gửi tiền: số dư ban đầu = số tiền gửi lần đầu.
CREATE PROCEDURE sp_MoTaiKhoanGuiTien(
    IN p_MaTK            VARCHAR(12),
    IN p_MaKH            VARCHAR(10),
    IN p_MaNV            VARCHAR(10),      -- nhân viên kinh doanh tạo tài khoản
    IN p_NgayTao         DATE,             -- NULL = hôm nay
    IN p_LaiSuatThang    DECIMAL(5,2),     -- % / tháng
    IN p_SoDuToiThieu    DECIMAL(15,0),
    IN p_SoTienGuiLanDau DECIMAL(15,0)
)
BEGIN
    DECLARE v_khoa VARCHAR(10);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT MaKH INTO v_khoa FROM KhachHang WHERE MaKH = p_MaKH FOR UPDATE;

    INSERT INTO TaiKhoan (MaTK, MaKH, MaNV_Tao, LoaiTK, SoDu, NgayTao)
    VALUES (p_MaTK, p_MaKH, p_MaNV, 'GuiTien', p_SoTienGuiLanDau, COALESCE(p_NgayTao, CURDATE()));

    INSERT INTO TaiKhoanGuiTien (MaTK, LaiSuatThang, SoDuToiThieu, SoTienGuiLanDau)
    VALUES (p_MaTK, p_LaiSuatThang, p_SoDuToiThieu, p_SoTienGuiLanDau);
    COMMIT;
END$$

-- 4.3 Chi tiêu trên tài khoản tín dụng (tăng dư nợ, không vượt hạn mức).
CREATE PROCEDURE sp_ChiTieu(
    IN p_MaKH         VARCHAR(10),         -- khách hàng thực hiện
    IN p_MaNV         VARCHAR(10),         -- nhân viên hỗ trợ
    IN p_MaTK_TinDung VARCHAR(12),
    IN p_SoTien       DECIMAL(15,0),
    IN p_ThoiGian     DATETIME             -- NULL = bây giờ
)
BEGIN
    DECLARE v_khoa VARCHAR(12);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    -- khóa tài khoản tín dụng để hai giao dịch song song không cùng vượt hạn mức
    SELECT MaTK INTO v_khoa FROM TaiKhoanTinDung WHERE MaTK = p_MaTK_TinDung FOR UPDATE;

    INSERT INTO GiaoDich (MaKH, MaNV, MaTK_TinDung, MaTK_GuiTien, LoaiGD, SoTien, ThoiGian)
    VALUES (p_MaKH, p_MaNV, p_MaTK_TinDung, NULL, 'ChiTieu', p_SoTien, COALESCE(p_ThoiGian, NOW()));
    COMMIT;
END$$

-- 4.4 Thanh toán tài khoản tín dụng bằng tiền từ tài khoản gửi tiền (truy vấn số 5).
--     Có thể thanh toán cho tài khoản tín dụng của người khác.
--     Các ràng buộc được kiểm tra trong trigger trg_GiaoDich_bi.
CREATE PROCEDURE sp_ThanhToan(
    IN p_MaKH         VARCHAR(10),         -- khách hàng thực hiện (chủ tài khoản gửi tiền)
    IN p_MaNV         VARCHAR(10),         -- nhân viên hỗ trợ
    IN p_MaTK_TinDung VARCHAR(12),         -- tài khoản tín dụng được thanh toán
    IN p_MaTK_GuiTien VARCHAR(12),         -- tài khoản gửi tiền bị trừ tiền
    IN p_SoTien       DECIMAL(15,0),
    IN p_ThoiGian     DATETIME             -- NULL = bây giờ
)
BEGIN
    DECLARE v_khoa VARCHAR(12);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    -- luôn khóa theo thứ tự: tín dụng trước, gửi tiền sau (tránh deadlock)
    SELECT MaTK INTO v_khoa FROM TaiKhoanTinDung WHERE MaTK = p_MaTK_TinDung FOR UPDATE;
    SELECT MaTK INTO v_khoa FROM TaiKhoanGuiTien WHERE MaTK = p_MaTK_GuiTien FOR UPDATE;

    INSERT INTO GiaoDich (MaKH, MaNV, MaTK_TinDung, MaTK_GuiTien, LoaiGD, SoTien, ThoiGian)
    VALUES (p_MaKH, p_MaNV, p_MaTK_TinDung, p_MaTK_GuiTien, 'ThanhToan', p_SoTien,
            COALESCE(p_ThoiGian, NOW()));
    COMMIT;
END$$

DELIMITER ;


-- =====================================================================
-- 5. DỮ LIỆU MẪU
--    Tài khoản và giao dịch được nhập qua stored procedure nên mọi ràng buộc
--    ở trên đều được kiểm tra khi nạp dữ liệu.
-- =====================================================================

-- 5.1 Nhân viên (NV001, NV002, NV003, NV008 là nhân viên kinh doanh)
INSERT INTO NhanVien (MaNV, CMT, Ten, NgaySinh, DiaChi, BacNghe, ThamNien, ViTri) VALUES
    ('NV001', '001085000001', 'Nguyễn Văn An', '1985-03-12', '12 Lê Thánh Tông, Hoàn Kiếm, Hà Nội', 5, 8, 'Kinh doanh'),
    ('NV002', '001090000002', 'Trần Thị Bình', '1990-07-25', '45 Trần Thái Tông, Cầu Giấy, Hà Nội', 4, 5, 'Kinh doanh'),
    ('NV003', '001092000003', 'Lê Minh Cường', '1992-11-02', '78 Nguyễn Trãi, Thanh Xuân, Hà Nội', 3, 3, 'Kinh doanh'),
    ('NV004', '001088000004', 'Phạm Thu Dung', '1988-01-19', '23 Giải Phóng, Hai Bà Trưng, Hà Nội', 4, 6, 'Giao dịch viên'),
    ('NV005', '001095000005', 'Hoàng Văn Em', '1995-05-30', '9 Trần Duy Hưng, Cầu Giấy, Hà Nội', 2, 2, 'Giao dịch viên'),
    ('NV006', '001087000006', 'Vũ Thị Giang', '1987-09-08', '31 Tây Sơn, Đống Đa, Hà Nội', 5, 7, 'Kế toán'),
    ('NV007', '001980000007', 'Đặng Quốc Hùng', '1980-12-15', '5 Láng Hạ, Ba Đình, Hà Nội', 7, 15, 'Quản lý chi nhánh'),
    ('NV008', '001997000008', 'Bùi Thanh Lan', '1997-04-04', '17 Kim Mã, Ba Đình, Hà Nội', 1, 1, 'Kinh doanh');

-- 5.2 Khách hàng
INSERT INTO KhachHang (MaKH, CMT, Ten, NgaySinh, DiaChi) VALUES
    ('KH001', '001091000101', 'Nguyễn Hoàng Nam', '1991-04-10', '56 Tôn Đức Thắng, Đống Đa, Hà Nội'),
    ('KH002', '001088000102', 'Trần Thị Hạnh', '1988-08-22', '102 Xuân Thủy, Cầu Giấy, Hà Nội'),
    ('KH003', '001079000103', 'Lê Văn Phúc', '1979-02-14', '15 Phố Huế, Hai Bà Trưng, Hà Nội'),
    ('KH004', '001095000104', 'Phạm Thị Mai', '1995-12-01', '88 Nguyễn Chí Thanh, Đống Đa, Hà Nội'),
    ('KH005', '001083000105', 'Hoàng Đức Thắng', '1983-06-18', '21 Hoàng Quốc Việt, Cầu Giấy, Hà Nội'),
    ('KH006', '001098000106', 'Vũ Thị Lan Anh', '1998-09-09', '7 Minh Khai, Hai Bà Trưng, Hà Nội'),
    ('KH007', '001086000107', 'Đỗ Quang Huy', '1986-03-27', '64 Nguyễn Văn Cừ, Long Biên, Hà Nội'),
    ('KH008', '001093000108', 'Bùi Thị Ngọc', '1993-07-07', '39 Lạc Long Quân, Tây Hồ, Hà Nội'),
    ('KH009', '001075000109', 'Ngô Văn Tuấn', '1975-10-30', '11 Đội Cấn, Ba Đình, Hà Nội'),
    ('KH010', '001090000110', 'Dương Thị Thu', '1990-01-15', '72 Nguyễn Lương Bằng, Đống Đa, Hà Nội'),
    ('KH011', '001000000111', 'Lý Minh Khoa', '2000-05-20', '5 Ngõ 120 Hoàng Mai, Hoàng Mai, Hà Nội'),
    ('KH012', '001082000112', 'Phan Thị Yến', '1982-11-11', '90 Nguyễn Khánh Toàn, Cầu Giấy, Hà Nội');

-- 5.3 Tài khoản tín dụng (MaTK, MaKH, nhân viên tạo, ngày tạo, hạn mức)
CALL sp_MoTaiKhoanTinDung('TKT001', 'KH001', 'NV001', '2026-08-03', 50000000);
CALL sp_MoTaiKhoanTinDung('TKT002', 'KH001', 'NV001', '2026-09-10', 30000000);
CALL sp_MoTaiKhoanTinDung('TKT003', 'KH002', 'NV002', '2026-08-12', 40000000);
CALL sp_MoTaiKhoanTinDung('TKT004', 'KH003', 'NV003', '2026-08-20', 100000000);
CALL sp_MoTaiKhoanTinDung('TKT005', 'KH004', 'NV001', '2026-09-02', 20000000);
CALL sp_MoTaiKhoanTinDung('TKT006', 'KH005', 'NV002', '2026-09-05', 60000000);
CALL sp_MoTaiKhoanTinDung('TKT007', 'KH007', 'NV001', '2026-09-25', 80000000);
CALL sp_MoTaiKhoanTinDung('TKT008', 'KH008', 'NV002', '2026-10-03', 25000000);
CALL sp_MoTaiKhoanTinDung('TKT009', 'KH009', 'NV003', '2026-10-08', 150000000);
CALL sp_MoTaiKhoanTinDung('TKT010', 'KH010', 'NV001', '2026-10-12', 15000000);
CALL sp_MoTaiKhoanTinDung('TKT011', 'KH012', 'NV003', '2026-10-25', 45000000);

-- 5.4 Tài khoản gửi tiền (MaTK, MaKH, nhân viên tạo, ngày tạo, lãi suất %/tháng,
--     số dư tối thiểu, số tiền gửi lần đầu)
CALL sp_MoTaiKhoanGuiTien('TKG001', 'KH001', 'NV001', '2026-08-03', 0.50, 1000000, 150000000);
CALL sp_MoTaiKhoanGuiTien('TKG002', 'KH001', 'NV001', '2026-09-10', 0.55, 1000000, 50000000);
CALL sp_MoTaiKhoanGuiTien('TKG003', 'KH002', 'NV002', '2026-08-12', 0.50, 500000, 80000000);
CALL sp_MoTaiKhoanGuiTien('TKG004', 'KH003', 'NV003', '2026-08-20', 0.60, 2000000, 300000000);
CALL sp_MoTaiKhoanGuiTien('TKG016', 'KH003', 'NV001', '2026-09-15', 0.55, 1000000, 70000000);
CALL sp_MoTaiKhoanGuiTien('TKG005', 'KH004', 'NV001', '2026-09-02', 0.45, 500000, 25000000);
CALL sp_MoTaiKhoanGuiTien('TKG006', 'KH005', 'NV002', '2026-09-05', 0.50, 1000000, 120000000);
CALL sp_MoTaiKhoanGuiTien('TKG007', 'KH005', 'NV002', '2026-10-01', 0.55, 1000000, 60000000);
CALL sp_MoTaiKhoanGuiTien('TKG008', 'KH005', 'NV003', '2026-10-15', 0.60, 1000000, 40000000);
CALL sp_MoTaiKhoanGuiTien('TKG009', 'KH006', 'NV003', '2026-09-18', 0.45, 500000, 15000000);
CALL sp_MoTaiKhoanGuiTien('TKG010', 'KH007', 'NV001', '2026-09-25', 0.50, 1000000, 200000000);
CALL sp_MoTaiKhoanGuiTien('TKG011', 'KH008', 'NV002', '2026-10-03', 0.50, 500000, 35000000);
CALL sp_MoTaiKhoanGuiTien('TKG012', 'KH009', 'NV003', '2026-10-08', 0.60, 2000000, 500000000);
CALL sp_MoTaiKhoanGuiTien('TKG013', 'KH010', 'NV001', '2026-10-12', 0.45, 500000, 20000000);
CALL sp_MoTaiKhoanGuiTien('TKG014', 'KH011', 'NV002', '2026-10-20', 0.50, 500000, 10000000);
CALL sp_MoTaiKhoanGuiTien('TKG015', 'KH012', 'NV003', '2026-10-25', 0.55, 1000000, 90000000);

-- 5.5 Giao dịch theo đúng thứ tự thời gian (ChiTieu / ThanhToan)
--     Có một giao dịch thanh toán hộ: KH006 trả nợ cho tài khoản tín dụng TKT004 của KH003.
CALL sp_ChiTieu('KH001', 'NV004', 'TKT001', 12000000, '2026-08-10 09:15:00');
CALL sp_ChiTieu('KH001', 'NV004', 'TKT001', 8000000, '2026-08-15 14:30:00');
CALL sp_ChiTieu('KH002', 'NV005', 'TKT003', 15000000, '2026-08-18 10:00:00');
CALL sp_ChiTieu('KH003', 'NV004', 'TKT004', 40000000, '2026-08-25 11:20:00');
CALL sp_ThanhToan('KH001', 'NV005', 'TKT001', 'TKG001', 5000000, '2026-09-02 16:45:00');
CALL sp_ChiTieu('KH002', 'NV004', 'TKT003', 10000000, '2026-09-05 09:30:00');
CALL sp_ChiTieu('KH004', 'NV006', 'TKT005', 5000000, '2026-09-08 13:10:00');
CALL sp_ChiTieu('KH001', 'NV005', 'TKT002', 20000000, '2026-09-12 10:40:00');
CALL sp_ThanhToan('KH002', 'NV004', 'TKT003', 'TKG003', 10000000, '2026-09-15 15:00:00');
CALL sp_ChiTieu('KH005', 'NV008', 'TKT006', 30000000, '2026-09-20 11:00:00');
CALL sp_ChiTieu('KH007', 'NV005', 'TKT007', 45000000, '2026-09-28 09:00:00');
CALL sp_ThanhToan('KH003', 'NV004', 'TKT004', 'TKG004', 15000000, '2026-09-30 14:00:00');
CALL sp_ChiTieu('KH008', 'NV006', 'TKT008', 12000000, '2026-10-04 10:30:00');
CALL sp_ChiTieu('KH003', 'NV005', 'TKT004', 30000000, '2026-10-06 16:20:00');
CALL sp_ChiTieu('KH009', 'NV004', 'TKT009', 60000000, '2026-10-09 09:45:00');
CALL sp_ThanhToan('KH005', 'NV004', 'TKT006', 'TKG006', 10000000, '2026-10-10 11:15:00');
CALL sp_ChiTieu('KH010', 'NV006', 'TKT010', 9000000, '2026-10-14 15:30:00');
CALL sp_ThanhToan('KH007', 'NV004', 'TKT007', 'TKG010', 20000000, '2026-10-16 10:10:00');
CALL sp_ThanhToan('KH006', 'NV005', 'TKT004', 'TKG009', 5000000, '2026-10-18 14:50:00');
CALL sp_ChiTieu('KH001', 'NV007', 'TKT001', 25000000, '2026-10-22 09:20:00');
CALL sp_ChiTieu('KH012', 'NV006', 'TKT011', 30000000, '2026-10-26 13:40:00');
CALL sp_ThanhToan('KH008', 'NV005', 'TKT008', 'TKG011', 7000000, '2026-10-28 11:05:00');
CALL sp_ChiTieu('KH009', 'NV004', 'TKT009', 50000000, '2026-10-30 16:00:00');


-- =====================================================================
-- 6. CÁC TRUY VẤN THEO ĐỀ BÀI
-- =====================================================================

-- ---------------------------------------------------------------------
-- TRUY VẤN 1. Lương của nhân viên kinh doanh theo từng tháng.
--   Mỗi tài khoản tín dụng tạo ra: +500.000.
--   Mỗi tài khoản gửi tiền tạo ra: +2% số tiền khách gửi lần đầu.
--   Liệt kê đủ mọi nhân viên kinh doanh ở mọi tháng có phát sinh (không có tài khoản thì lương = 0).
--   Muốn xem một tháng cụ thể: thêm điều kiện  AND m.Thang = '2026-10'  vào WHERE.
-- ---------------------------------------------------------------------
SELECT nv.MaNV,
       nv.Ten,
       m.Thang,
       COUNT(CASE WHEN tk.LoaiTK = 'TinDung' THEN 1 END)                     AS SoTKTinDung,
       COUNT(CASE WHEN tk.LoaiTK = 'GuiTien' THEN 1 END)                     AS SoTKGuiTien,
       COUNT(CASE WHEN tk.LoaiTK = 'TinDung' THEN 1 END) * 500000            AS TienTKTinDung,
       ROUND(0.02 * COALESCE(SUM(gt.SoTienGuiLanDau), 0), 0)                 AS TienTKGuiTien,
       COUNT(CASE WHEN tk.LoaiTK = 'TinDung' THEN 1 END) * 500000
         + ROUND(0.02 * COALESCE(SUM(gt.SoTienGuiLanDau), 0), 0)             AS Luong
  FROM NhanVien nv
 CROSS JOIN (SELECT DISTINCT DATE_FORMAT(NgayTao, '%Y-%m') AS Thang FROM TaiKhoan) m
  LEFT JOIN TaiKhoan tk
         ON tk.MaNV_Tao = nv.MaNV
        AND DATE_FORMAT(tk.NgayTao, '%Y-%m') = m.Thang
  LEFT JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
 WHERE nv.ViTri = 'Kinh doanh'
 GROUP BY nv.MaNV, nv.Ten, m.Thang
 ORDER BY m.Thang, nv.MaNV;


-- ---------------------------------------------------------------------
-- TRUY VẤN 2. Tên khách hàng và số tiền giao dịch trên mỗi tài khoản tín dụng
--   mà họ thực hiện trong khoảng từ ngày bắt đầu đến ngày kết thúc (gồm cả hai ngày).
--   Đổi hai biến bên dưới để xem khoảng thời gian khác.
-- ---------------------------------------------------------------------
SET @tu_ngay  = '2026-09-01';
SET @den_ngay = '2026-10-15';

-- 2a. Tổng hợp theo (khách hàng thực hiện, tài khoản tín dụng)
SELECT kh.MaKH,
       kh.Ten                                                              AS TenKhachHang,
       gd.MaTK_TinDung,
       chu.Ten                                                             AS ChuTaiKhoan,
       COUNT(*)                                                            AS SoGiaoDich,
       SUM(CASE WHEN gd.LoaiGD = 'ChiTieu'   THEN gd.SoTien ELSE 0 END)    AS TongChiTieu,
       SUM(CASE WHEN gd.LoaiGD = 'ThanhToan' THEN gd.SoTien ELSE 0 END)    AS TongThanhToan,
       SUM(gd.SoTien)                                                      AS TongTienGiaoDich
  FROM GiaoDich gd
  JOIN KhachHang kh  ON kh.MaKH = gd.MaKH
  JOIN TaiKhoan  tk  ON tk.MaTK = gd.MaTK_TinDung
  JOIN KhachHang chu ON chu.MaKH = tk.MaKH
 WHERE gd.ThoiGian >= @tu_ngay
   AND gd.ThoiGian <  DATE_ADD(@den_ngay, INTERVAL 1 DAY)
 GROUP BY kh.MaKH, kh.Ten, gd.MaTK_TinDung, chu.Ten
 ORDER BY kh.Ten, gd.MaTK_TinDung;

-- 2b. Cách hiểu khác: liệt kê từng giao dịch trong khoảng thời gian
SELECT kh.Ten AS TenKhachHang, gd.MaTK_TinDung, gd.MaGD, gd.LoaiGD, gd.SoTien, gd.ThoiGian
  FROM GiaoDich gd
  JOIN KhachHang kh ON kh.MaKH = gd.MaKH
 WHERE gd.ThoiGian >= @tu_ngay
   AND gd.ThoiGian <  DATE_ADD(@den_ngay, INTERVAL 1 DAY)
 ORDER BY kh.Ten, gd.MaTK_TinDung, gd.ThoiGian;


-- ---------------------------------------------------------------------
-- TRUY VẤN 3. Thông tin các tài khoản tín dụng cùng tổng số nợ tồn đọng
--   tại thời điểm truy vấn, sắp xếp giảm dần theo dư nợ.
-- ---------------------------------------------------------------------
SELECT v.MaTK,
       v.MaKH,
       v.TenKH,
       v.NgayTao,
       v.HanMuc,
       v.DuNo,
       v.HanMuc - v.DuNo AS HanMucConLai
  FROM v_DuNoTinDung v
 ORDER BY v.DuNo DESC, v.MaTK;


-- ---------------------------------------------------------------------
-- TRUY VẤN 4. Thông tin 10 khách hàng có tổng số tiền gửi
--   (tổng số dư các tài khoản gửi tiền) nhiều nhất.
-- ---------------------------------------------------------------------
SELECT kh.MaKH,
       kh.CMT,
       kh.Ten,
       kh.NgaySinh,
       kh.DiaChi,
       COUNT(gt.MaTK) AS SoTKGuiTien,
       SUM(tk.SoDu)   AS TongTienGui
  FROM KhachHang kh
  JOIN TaiKhoan tk         ON tk.MaKH = kh.MaKH
  JOIN TaiKhoanGuiTien gt  ON gt.MaTK = tk.MaTK
 GROUP BY kh.MaKH, kh.CMT, kh.Ten, kh.NgaySinh, kh.DiaChi
 ORDER BY TongTienGui DESC, kh.MaKH
 LIMIT 10;


-- ---------------------------------------------------------------------
-- TRUY VẤN 5. Thực hiện giao dịch thanh toán tài khoản tín dụng từ tài khoản gửi tiền.
--   CALL sp_ThanhToan(MaKH thực hiện, MaNV hỗ trợ, TK tín dụng, TK gửi tiền, số tiền, thời gian);
--   Thời gian = NULL thì lấy thời điểm hiện tại.
-- ---------------------------------------------------------------------

-- Trước khi thanh toán
SELECT MaTK, TenKH, HanMuc, DuNo FROM v_DuNoTinDung WHERE MaTK IN ('TKT001', 'TKT009');
SELECT MaTK, MaKH, SoDu FROM TaiKhoan WHERE MaTK IN ('TKG001', 'TKG007');

-- 5.1 KH001 trả 10.000.000 cho tài khoản tín dụng của chính mình từ tài khoản gửi tiền của mình
CALL sp_ThanhToan('KH001', 'NV004', 'TKT001', 'TKG001', 10000000, NULL);

-- 5.2 KH005 thanh toán hộ 20.000.000 cho tài khoản tín dụng TKT009 của KH009
--     (tiền lấy từ tài khoản gửi tiền TKG007 của KH005)
CALL sp_ThanhToan('KH005', 'NV005', 'TKT009', 'TKG007', 20000000, NULL);

-- Sau khi thanh toán: dư nợ giảm 10 triệu và 20 triệu, số dư gửi tiền giảm tương ứng
SELECT MaTK, TenKH, HanMuc, DuNo FROM v_DuNoTinDung WHERE MaTK IN ('TKT001', 'TKT009');
SELECT MaTK, MaKH, SoDu FROM TaiKhoan WHERE MaTK IN ('TKG001', 'TKG007');


-- =====================================================================
-- 7. KIỂM THỬ CÁC RÀNG BUỘC
--    Bỏ dấu "--" ở đầu từng lệnh rồi chạy riêng; mỗi lệnh phải báo lỗi như ghi chú
--    và dữ liệu không bị thay đổi. (Để comment để file chạy liền mạch một lần.)
-- =====================================================================

-- (a) Chi tiêu vượt hạn mức: TKT010 đang nợ 9 triệu, hạn mức 15 triệu
-- CALL sp_ChiTieu('KH010', 'NV004', 'TKT010', 10000000, NULL);
--     -> Vượt hạn mức: nợ 9,000,000 + 10,000,000 > 15,000,000

-- (b) Thanh toán làm số dư gửi tiền thấp hơn mức tối thiểu: TKG014 có 10 triệu, tối thiểu 500 nghìn
-- CALL sp_ThanhToan('KH011', 'NV004', 'TKT004', 'TKG014', 9600000, NULL);
--     -> Số dư còn lại sau thanh toán thấp hơn số dư tối thiểu

-- (c) Dùng tài khoản gửi tiền của người khác để trả nợ (TKG003 là của KH002)
-- CALL sp_ThanhToan('KH001', 'NV004', 'TKT001', 'TKG003', 1000000, NULL);
--     -> Chỉ được thanh toán từ tài khoản gửi tiền của chính mình

-- (d) Thanh toán nhiều hơn dư nợ: TKT005 chỉ nợ 5 triệu
-- CALL sp_ThanhToan('KH003', 'NV004', 'TKT005', 'TKG004', 6000000, NULL);
--     -> Số tiền thanh toán lớn hơn dư nợ hiện tại

-- (e) Mở tài khoản tín dụng thứ 3 cho KH001 (đã có TKT001, TKT002)
-- CALL sp_MoTaiKhoanTinDung('TKT099', 'KH001', 'NV001', '2026-11-01', 10000000);
--     -> Mỗi khách hàng chỉ được mở tối đa 2 tài khoản tín dụng

-- (f) Mở tài khoản gửi tiền thứ 4 cho KH005 (đã có TKG006, TKG007, TKG008)
-- CALL sp_MoTaiKhoanGuiTien('TKG099', 'KH005', 'NV001', '2026-11-01', 0.50, 1000000, 5000000);
--     -> Mỗi khách hàng chỉ được mở tối đa 3 tài khoản gửi tiền

-- (g) Nhân viên không phải nhân viên kinh doanh (NV004 là giao dịch viên) tạo tài khoản
-- CALL sp_MoTaiKhoanGuiTien('TKG098', 'KH006', 'NV004', '2026-11-01', 0.50, 500000, 5000000);
--     -> Chỉ nhân viên kinh doanh mới được tạo tài khoản cho khách hàng

-- (h) Sửa / xóa giao dịch đã ghi
-- DELETE FROM GiaoDich WHERE MaGD = 1;
--     -> Không được xóa giao dịch đã ghi nhận
