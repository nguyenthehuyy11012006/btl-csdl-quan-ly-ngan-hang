import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Xếp hạng thu nhập nhân viên", page_icon="🥇", layout="wide")
st.title("🥇 Xếp hạng nhân viên kinh doanh theo thu nhập")
st.caption(
    "Thu nhập = 500.000 × số tài khoản tín dụng đã tạo + 2% × tổng tiền gửi lần đầu "
    "của các tài khoản gửi tiền đã tạo. Đồng hạng thì cùng thứ hạng."
)


def tien(ten):
    return st.column_config.NumberColumn(ten, format="localized")


def chay(sql, tham_so=None):
    try:
        return query(sql, tham_so)
    except DBError as e:
        st.error(str(e))
        st.stop()


ds_thang = [r["Thang"] for r in chay("SELECT DISTINCT Thang FROM v_LuongNVKD ORDER BY Thang")]
if not ds_thang:
    st.info("Chưa có dữ liệu để xếp hạng.")
    st.stop()

tab_thang, tab_khoang = st.tabs(["Trong một tháng", "Trong một khoảng tháng"])

with tab_thang:
    thang = st.selectbox("Chọn tháng", ds_thang[::-1], key="xh_thang")
    rows = chay(
        """
        SELECT RANK() OVER (ORDER BY Luong DESC) AS XepHang,
               MaNV, Ten, SoTKTinDung, SoTKGuiTien, CAST(Luong AS SIGNED) AS Luong
          FROM v_LuongNVKD
         WHERE Thang = %s
         ORDER BY XepHang, MaNV
        """,
        (thang,),
    )
    st.dataframe(
        rows,
        hide_index=True,
        column_order=["XepHang", "MaNV", "Ten", "SoTKTinDung", "SoTKGuiTien", "Luong"],
        column_config={
            "XepHang": "Hạng", "MaNV": "Mã NV", "Ten": "Tên",
            "SoTKTinDung": "Số TK tín dụng đã tạo", "SoTKGuiTien": "Số TK gửi tiền đã tạo",
            "Luong": tien("Thu nhập (đồng)"),
        },
    )

with tab_khoang:
    c1, c2 = st.columns(2)
    tu = c1.selectbox("Từ tháng", ds_thang, index=0, key="xh_tu")
    den = c2.selectbox("Đến tháng", ds_thang, index=len(ds_thang) - 1, key="xh_den")
    if tu > den:
        st.error("Tháng bắt đầu phải trước hoặc bằng tháng kết thúc.")
    else:
        rows = chay(
            """
            SELECT RANK() OVER (ORDER BY SUM(Luong) DESC) AS XepHang,
                   MaNV, Ten,
                   CAST(SUM(SoTKTinDung) AS SIGNED) AS TongTKTinDung,
                   CAST(SUM(SoTKGuiTien) AS SIGNED) AS TongTKGuiTien,
                   CAST(SUM(Luong) AS SIGNED) AS TongThuNhap
              FROM v_LuongNVKD
             WHERE Thang BETWEEN %s AND %s
             GROUP BY MaNV, Ten
             ORDER BY XepHang, MaNV
            """,
            (tu, den),
        )
        st.dataframe(
            rows,
            hide_index=True,
            column_order=["XepHang", "MaNV", "Ten", "TongTKTinDung", "TongTKGuiTien", "TongThuNhap"],
            column_config={
                "XepHang": "Hạng", "MaNV": "Mã NV", "Ten": "Tên",
                "TongTKTinDung": "Tổng TK tín dụng đã tạo", "TongTKGuiTien": "Tổng TK gửi tiền đã tạo",
                "TongThuNhap": tien("Tổng thu nhập (đồng)"),
            },
        )
