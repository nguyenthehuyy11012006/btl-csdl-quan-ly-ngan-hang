from datetime import date

import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Giao dịch tín dụng theo ngày", page_icon="🧾", layout="wide")
st.title("🧾 Giao dịch tín dụng theo khoảng ngày")
st.caption("Tên khách hàng và số tiền giao dịch trên mỗi tài khoản tín dụng mà họ thực hiện (tính cả hai ngày đầu và cuối).")

khoang = st.date_input(
    "Chọn khoảng ngày (ngày bắt đầu – ngày kết thúc)",
    value=(date(2026, 9, 1), date(2026, 10, 15)),
    format="DD/MM/YYYY",
)
if len(khoang) != 2:
    st.info("Hãy chọn đủ ngày bắt đầu và ngày kết thúc.")
    st.stop()
tu_ngay, den_ngay = khoang

try:
    tong_hop = query(
        """
        SELECT kh.MaKH,
               kh.Ten AS TenKhachHang,
               gd.MaTK_TinDung,
               chu.Ten AS ChuTaiKhoan,
               COUNT(*) AS SoGiaoDich,
               CAST(SUM(CASE WHEN gd.LoaiGD = 'ChiTieu'   THEN gd.SoTien ELSE 0 END) AS SIGNED) AS TongChiTieu,
               CAST(SUM(CASE WHEN gd.LoaiGD = 'ThanhToan' THEN gd.SoTien ELSE 0 END) AS SIGNED) AS TongThanhToan,
               CAST(SUM(gd.SoTien) AS SIGNED) AS TongTienGiaoDich
          FROM GiaoDich gd
          JOIN KhachHang kh  ON kh.MaKH = gd.MaKH
          JOIN TaiKhoan  tk  ON tk.MaTK = gd.MaTK_TinDung
          JOIN KhachHang chu ON chu.MaKH = tk.MaKH
         WHERE gd.ThoiGian >= %s
           AND gd.ThoiGian <  DATE_ADD(%s, INTERVAL 1 DAY)
         GROUP BY kh.MaKH, kh.Ten, gd.MaTK_TinDung, chu.Ten
         ORDER BY kh.Ten, gd.MaTK_TinDung
        """,
        (tu_ngay, den_ngay),
    )
    chi_tiet = query(
        """
        SELECT kh.Ten AS TenKhachHang, gd.MaTK_TinDung, gd.MaGD, gd.LoaiGD,
               CAST(gd.SoTien AS SIGNED) AS SoTien, gd.ThoiGian
          FROM GiaoDich gd
          JOIN KhachHang kh ON kh.MaKH = gd.MaKH
         WHERE gd.ThoiGian >= %s
           AND gd.ThoiGian <  DATE_ADD(%s, INTERVAL 1 DAY)
         ORDER BY kh.Ten, gd.MaTK_TinDung, gd.ThoiGian
        """,
        (tu_ngay, den_ngay),
    )
except DBError as e:
    st.error(str(e))
    st.stop()

if not tong_hop:
    st.warning("Không có giao dịch nào trong khoảng ngày đã chọn.")
    st.stop()

tien = lambda ten: st.column_config.NumberColumn(ten, format="localized")

tab1, tab2 = st.tabs(["Tổng hợp theo tài khoản", "Từng giao dịch"])
with tab1:
    st.dataframe(
        tong_hop,
        hide_index=True,
        column_order=["MaKH", "TenKhachHang", "MaTK_TinDung", "ChuTaiKhoan",
                      "SoGiaoDich", "TongChiTieu", "TongThanhToan", "TongTienGiaoDich"],
        column_config={
            "MaKH": "Mã KH",
            "TenKhachHang": "Khách hàng thực hiện",
            "MaTK_TinDung": "TK tín dụng",
            "ChuTaiKhoan": "Chủ tài khoản",
            "SoGiaoDich": "Số giao dịch",
            "TongChiTieu": tien("Tổng chi tiêu"),
            "TongThanhToan": tien("Tổng thanh toán"),
            "TongTienGiaoDich": tien("Tổng tiền giao dịch"),
        },
    )
with tab2:
    st.dataframe(
        chi_tiet,
        hide_index=True,
        column_order=["TenKhachHang", "MaTK_TinDung", "MaGD", "LoaiGD", "SoTien", "ThoiGian"],
        column_config={
            "TenKhachHang": "Khách hàng",
            "MaTK_TinDung": "TK tín dụng",
            "MaGD": "Mã GD",
            "LoaiGD": "Loại GD",
            "SoTien": tien("Số tiền"),
            "ThoiGian": st.column_config.DatetimeColumn("Thời gian", format="DD/MM/YYYY HH:mm"),
        },
    )
