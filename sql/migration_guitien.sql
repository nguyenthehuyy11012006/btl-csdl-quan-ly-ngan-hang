-- Apply to an existing quan_ly_ngan_hang database to enable deposit transactions.
USE quan_ly_ngan_hang;

CREATE TABLE IF NOT EXISTS GiaoDichGuiTien (
    MaGD         INT           NOT NULL AUTO_INCREMENT,
    MaKH         VARCHAR(10)   NOT NULL,
    MaNV         VARCHAR(10)   NOT NULL,
    MaTK_GuiTien VARCHAR(12)   NOT NULL,
    SoTien       DECIMAL(15,0) NOT NULL,
    ThoiGian     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MaGD),
    KEY idx_gdgt_thoigian (ThoiGian),
    CONSTRAINT fk_gdgt_kh FOREIGN KEY (MaKH) REFERENCES KhachHang (MaKH),
    CONSTRAINT fk_gdgt_nv FOREIGN KEY (MaNV) REFERENCES NhanVien (MaNV),
    CONSTRAINT fk_gdgt_tk FOREIGN KEY (MaTK_GuiTien) REFERENCES TaiKhoanGuiTien (MaTK),
    CONSTRAINT ck_gdgt_sotien CHECK (SoTien > 0)
) ENGINE = InnoDB;

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_GuiTien$$
CREATE PROCEDURE sp_GuiTien(
    IN p_MaKH VARCHAR(10),
    IN p_MaNV VARCHAR(10),
    IN p_MaTK_GuiTien VARCHAR(12),
    IN p_SoTien DECIMAL(15,0),
    IN p_ThoiGian DATETIME
)
BEGIN
    DECLARE v_chu VARCHAR(10);
    DECLARE v_trangthai VARCHAR(20);
    DECLARE v_sodu DECIMAL(15,0);
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_chu = NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_SoTien IS NULL OR p_SoTien <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'So tien nop phai lon hon 0';
    END IF;
    START TRANSACTION;
    SELECT tk.MaKH, tk.TrangThai, tk.SoDu
      INTO v_chu, v_trangthai, v_sodu
      FROM TaiKhoan tk
      JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
     WHERE tk.MaTK = p_MaTK_GuiTien FOR UPDATE;

    IF v_chu IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tai khoan gui tien khong ton tai';
    END IF;
    IF v_chu <> p_MaKH THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chi duoc nop tien vao tai khoan cua chinh khach hang';
    END IF;
    IF v_trangthai <> 'HoatDong' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tai khoan gui tien dang bi dong bang';
    END IF;
    IF v_sodu + p_SoTien > 999999999999999 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'So du sau khi nop vuot gioi han luu tru';
    END IF;

    UPDATE TaiKhoan SET SoDu = SoDu + p_SoTien WHERE MaTK = p_MaTK_GuiTien;
    INSERT INTO GiaoDichGuiTien (MaKH, MaNV, MaTK_GuiTien, SoTien, ThoiGian)
    VALUES (p_MaKH, p_MaNV, p_MaTK_GuiTien, p_SoTien, COALESCE(p_ThoiGian, NOW()));
    COMMIT;
END$$
DELIMITER ;
