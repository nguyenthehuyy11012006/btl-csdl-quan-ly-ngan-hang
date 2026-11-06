import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Lương nhân viên kinh doanh", page_icon="💼", layout="wide")
st.title("💼 Lương nhân viên kinh doanh theo tháng")
st.caption(
    "Lương = 500.000 × số tài khoản tín dụng đã tạo "
    "+ 2% × tổng tiền gửi lần đầu của các tài khoản gửi tiền đã tạo trong tháng."
)

try:
    ds_thang = [r["Thang"] for r in query("SELECT DISTINCT Thang FROM v_LuongNVKD ORDER BY Thang DESC")]
    thang = st.selectbox("Chọn tháng", ds_thang)
    rows = query(
        """
        SELECT MaNV, Ten, SoTKTinDung, SoTKGuiTien, CAST(Luong AS SIGNED) AS Luong
          FROM v_LuongNVKD
         WHERE Thang = %s
         ORDER BY Luong DESC, MaNV
        """,
        (thang,),
    )
except DBError as e:
    st.error(str(e))
    st.stop()

tong = sum(r["Luong"] for r in rows)
st.metric("Tổng lương tháng " + thang, f"{tong:,}".replace(",", ".") + " đ")

st.dataframe(
    rows,
    hide_index=True,
    column_config={
        "MaNV": "Mã NV",
        "Ten": "Tên",
        "SoTKTinDung": "Số TK tín dụng",
        "SoTKGuiTien": "Số TK gửi tiền",
        "Luong": st.column_config.NumberColumn("Lương (đồng)", format="localized"),
    },
)
