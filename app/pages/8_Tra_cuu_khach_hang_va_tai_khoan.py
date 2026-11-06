import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Tra cứu khách hàng và tài khoản", page_icon="🔎", layout="wide")
st.title("🔎 Tra cứu khách hàng và tài khoản")

TRANG_THAI = {"HoatDong": "Hoạt động", "DongBang": "Đóng băng"}
LOAI = {"TinDung": "Tín dụng", "GuiTien": "Gửi tiền"}


def tien(ten):
    return st.column_config.NumberColumn(ten, format="localized")


def ngay(ten):
    return st.column_config.DateColumn(ten, format="DD/MM/YYYY")


def chay(sql, tham_so=None):
    """Chạy truy vấn; nếu lỗi thì báo lỗi tiếng Việt và dừng trang."""
    try:
        return query(sql, tham_so)
    except DBError as e:
        st.error(str(e))
        st.stop()


tab_kh, tab_tk = st.tabs(["Khách hàng", "Tài khoản"])

# ------------------------- Tab khách hàng -------------------------
with tab_kh:
    tu_khoa = st.text_input("Tìm theo mã, tên hoặc CMT (để trống để xem tất cả)", key="tim_kh")
    kw = f"%{tu_khoa.strip()}%"
    ds = chay(
        """
        SELECT MaKH, Ten, CMT, NgaySinh, DiaChi, ThanhPho, NgayDangKy
          FROM KhachHang
         WHERE MaKH LIKE %s OR Ten LIKE %s OR CMT LIKE %s
         ORDER BY MaKH
        """,
        (kw, kw, kw),
    )
    st.caption(f"Tìm thấy {len(ds)} khách hàng.")
    st.dataframe(
        ds,
        hide_index=True,
        column_order=["MaKH", "Ten", "CMT", "NgaySinh", "DiaChi", "ThanhPho", "NgayDangKy"],
        column_config={
            "MaKH": "Mã KH", "Ten": "Tên", "CMT": "CMT", "NgaySinh": ngay("Ngày sinh"),
            "DiaChi": "Địa chỉ", "ThanhPho": "Thành phố", "NgayDangKy": ngay("Ngày đăng ký"),
        },
    )

    if ds:
        ten = {r["MaKH"]: r["Ten"] for r in ds}
        ma_kh = st.selectbox(
            "Xem các tài khoản của khách hàng", list(ten),
            format_func=lambda m: f"{m} – {ten[m]}", key="chon_kh",
        )

        st.subheader("Tài khoản tín dụng")
        td = chay(
            """
            SELECT v.MaTK, tk.TrangThai, v.NgayTao,
                   CAST(v.HanMuc AS SIGNED) AS HanMuc,
                   CAST(v.DuNo AS SIGNED) AS DuNo,
                   CAST(v.HanMuc - v.DuNo AS SIGNED) AS HanMucConLai
              FROM v_DuNoTinDung v
              JOIN TaiKhoan tk ON tk.MaTK = v.MaTK
             WHERE v.MaKH = %s
             ORDER BY v.MaTK
            """,
            (ma_kh,),
        )
        for r in td:
            r["TrangThai"] = TRANG_THAI[r["TrangThai"]]
        if td:
            st.dataframe(
                td, hide_index=True,
                column_order=["MaTK", "TrangThai", "NgayTao", "HanMuc", "DuNo", "HanMucConLai"],
                column_config={
                    "MaTK": "Mã TK", "TrangThai": "Trạng thái", "NgayTao": ngay("Ngày tạo"),
                    "HanMuc": tien("Hạn mức"), "DuNo": tien("Dư nợ"),
                    "HanMucConLai": tien("Hạn mức còn lại"),
                },
            )
        else:
            st.info("Khách hàng chưa mở tài khoản tín dụng nào.")

        st.subheader("Tài khoản gửi tiền")
        gt = chay(
            """
            SELECT tk.MaTK, tk.TrangThai, tk.NgayTao,
                   CAST(tk.SoDu AS SIGNED) AS SoDu,
                   gt.LaiSuatThang,
                   CAST(gt.SoDuToiThieu AS SIGNED) AS SoDuToiThieu,
                   CAST(gt.SoTienGuiLanDau AS SIGNED) AS SoTienGuiLanDau
              FROM TaiKhoan tk
              JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
             WHERE tk.MaKH = %s
             ORDER BY tk.MaTK
            """,
            (ma_kh,),
        )
        for r in gt:
            r["TrangThai"] = TRANG_THAI[r["TrangThai"]]
            r["LaiSuatThang"] = float(r["LaiSuatThang"])
        if gt:
            st.dataframe(
                gt, hide_index=True,
                column_order=["MaTK", "TrangThai", "NgayTao", "SoDu", "LaiSuatThang",
                              "SoDuToiThieu", "SoTienGuiLanDau"],
                column_config={
                    "MaTK": "Mã TK", "TrangThai": "Trạng thái", "NgayTao": ngay("Ngày tạo"),
                    "SoDu": tien("Số dư"),
                    "LaiSuatThang": st.column_config.NumberColumn("Lãi suất (%/tháng)", format="%.2f"),
                    "SoDuToiThieu": tien("Số dư tối thiểu"),
                    "SoTienGuiLanDau": tien("Số tiền gửi lần đầu"),
                },
            )
        else:
            st.info("Khách hàng chưa mở tài khoản gửi tiền nào.")

# ------------------------- Tab tài khoản -------------------------
with tab_tk:
    c1, c2, c3 = st.columns([2, 1, 1])
    tu_khoa2 = c1.text_input("Tìm theo mã tài khoản, mã KH hoặc tên chủ tài khoản", key="tim_tk")
    loai = c2.selectbox("Loại tài khoản", ["Tất cả"] + list(LOAI.values()))
    trang_thai = c3.selectbox("Trạng thái", ["Tất cả"] + list(TRANG_THAI.values()))

    kw2 = f"%{tu_khoa2.strip()}%"
    dieu_kien = ["(tk.MaTK LIKE %s OR kh.MaKH LIKE %s OR kh.Ten LIKE %s)"]
    tham_so = [kw2, kw2, kw2]
    if loai != "Tất cả":
        dieu_kien.append("tk.LoaiTK = %s")
        tham_so.append({v: k for k, v in LOAI.items()}[loai])
    if trang_thai != "Tất cả":
        dieu_kien.append("tk.TrangThai = %s")
        tham_so.append({v: k for k, v in TRANG_THAI.items()}[trang_thai])

    tk = chay(
        """
        SELECT tk.MaTK, tk.LoaiTK, tk.MaKH, kh.Ten AS TenKH, tk.TrangThai, tk.NgayTao,
               tk.MaNV_Tao, CAST(tk.SoDu AS SIGNED) AS SoDu,
               CAST(td.HanMuc AS SIGNED) AS HanMuc,
               gt.LaiSuatThang,
               CAST(gt.SoDuToiThieu AS SIGNED) AS SoDuToiThieu
          FROM TaiKhoan tk
          JOIN KhachHang kh ON kh.MaKH = tk.MaKH
          LEFT JOIN TaiKhoanTinDung td ON td.MaTK = tk.MaTK
          LEFT JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
         WHERE """ + " AND ".join(dieu_kien) + """
         ORDER BY tk.MaTK
        """,
        tuple(tham_so),
    )
    for r in tk:
        r["LoaiTK"] = LOAI[r["LoaiTK"]]
        r["TrangThai"] = TRANG_THAI[r["TrangThai"]]
        if r["LaiSuatThang"] is not None:
            r["LaiSuatThang"] = float(r["LaiSuatThang"])
    st.caption(f"Tìm thấy {len(tk)} tài khoản.")
    if tk:
        st.dataframe(
            tk, hide_index=True,
            column_order=["MaTK", "LoaiTK", "MaKH", "TenKH", "TrangThai", "NgayTao",
                          "MaNV_Tao", "SoDu", "HanMuc", "LaiSuatThang", "SoDuToiThieu"],
            column_config={
                "MaTK": "Mã TK", "LoaiTK": "Loại", "MaKH": "Mã KH", "TenKH": "Chủ tài khoản",
                "TrangThai": "Trạng thái", "NgayTao": ngay("Ngày tạo"), "MaNV_Tao": "NV tạo",
                "SoDu": tien("Số dư"), "HanMuc": tien("Hạn mức"),
                "LaiSuatThang": st.column_config.NumberColumn("Lãi suất (%/tháng)", format="%.2f"),
                "SoDuToiThieu": tien("Số dư tối thiểu"),
            },
        )
