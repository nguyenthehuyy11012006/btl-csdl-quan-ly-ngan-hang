import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Quản lý ngân hàng", page_icon="🏦", layout="wide")
st.title("🏦 Hệ thống quản lý ngân hàng")
st.caption("BTL Cơ sở dữ liệu – Project 3")

try:
    rows = query("""
        SELECT 'NhanVien' AS Bang, COUNT(*) AS SoDong FROM NhanVien
        UNION ALL SELECT 'KhachHang', COUNT(*) FROM KhachHang
        UNION ALL SELECT 'TaiKhoan', COUNT(*) FROM TaiKhoan
        UNION ALL SELECT 'TaiKhoanTinDung', COUNT(*) FROM TaiKhoanTinDung
        UNION ALL SELECT 'TaiKhoanGuiTien', COUNT(*) FROM TaiKhoanGuiTien
        UNION ALL SELECT 'GiaoDich', COUNT(*) FROM GiaoDich
    """)
except DBError as e:
    st.error(str(e))
    st.stop()

st.success("Đã kết nối CSDL quan_ly_ngan_hang")
st.dataframe(rows, hide_index=True)
