import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Top 10 khách hàng tiền gửi", page_icon="🏆", layout="wide")
st.title("🏆 Top 10 khách hàng có tổng tiền gửi nhiều nhất")
st.caption("Tổng tiền gửi = tổng số dư của tất cả tài khoản gửi tiền của khách hàng.")

try:
    rows = query(
        """
        SELECT kh.MaKH, kh.CMT, kh.Ten, kh.NgaySinh, kh.DiaChi,
               COUNT(gt.MaTK) AS SoTKGuiTien,
               CAST(SUM(tk.SoDu) AS SIGNED) AS TongTienGui
          FROM KhachHang kh
          JOIN TaiKhoan tk        ON tk.MaKH = kh.MaKH
          JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
         GROUP BY kh.MaKH, kh.CMT, kh.Ten, kh.NgaySinh, kh.DiaChi
         ORDER BY TongTienGui DESC, kh.MaKH
         LIMIT 10
        """
    )
except DBError as e:
    st.error(str(e))
    st.stop()

if not rows:
    st.warning("Chưa có khách hàng nào có tài khoản gửi tiền.")
    st.stop()

for i, r in enumerate(rows, start=1):
    r["Hang"] = i

st.dataframe(
    rows,
    hide_index=True,
    column_order=["Hang", "MaKH", "Ten", "CMT", "NgaySinh", "DiaChi", "SoTKGuiTien", "TongTienGui"],
    column_config={
        "Hang": "Hạng",
        "MaKH": "Mã KH",
        "Ten": "Tên",
        "CMT": "CMT",
        "NgaySinh": st.column_config.DateColumn("Ngày sinh", format="DD/MM/YYYY"),
        "DiaChi": "Địa chỉ",
        "SoTKGuiTien": "Số TK gửi tiền",
        "TongTienGui": st.column_config.NumberColumn("Tổng tiền gửi (đồng)", format="localized"),
    },
)
