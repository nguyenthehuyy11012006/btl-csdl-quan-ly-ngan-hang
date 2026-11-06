import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Tăng trưởng khách hàng", page_icon="📈", layout="wide")
st.title("📈 Tăng trưởng khách hàng")
st.caption("Số khách hàng mới đăng ký theo ngày, tháng và năm (chỉ tính những kỳ có khách hàng đăng ký).")


def chay(sql, tham_so=None):
    try:
        return query(sql, tham_so)
    except DBError as e:
        st.error(str(e))
        st.stop()


tab_ngay, tab_thang, tab_nam = st.tabs(["Theo ngày", "Theo tháng", "Theo năm"])

# ------------------------- Theo ngày -------------------------
with tab_ngay:
    rows = chay(
        """
        SELECT NgayDangKy AS Ngay, COUNT(*) AS SoKhachMoi
          FROM KhachHang
         GROUP BY NgayDangKy
         ORDER BY NgayDangKy
        """
    )
    st.caption(f"{len(rows)} ngày có khách hàng đăng ký, tổng cộng {sum(r['SoKhachMoi'] for r in rows)} khách hàng.")
    st.dataframe(
        rows,
        hide_index=True,
        column_config={
            "Ngay": st.column_config.DateColumn("Ngày đăng ký", format="DD/MM/YYYY"),
            "SoKhachMoi": "Số khách mới",
        },
    )

# ------------------------- Theo tháng -------------------------
with tab_thang:
    rows = chay(
        """
        SELECT t.Thang,
               t.SoKhachMoi,
               CAST(SUM(t.SoKhachMoi) OVER (ORDER BY t.Thang) AS SIGNED) AS LuyKe,
               t.SoKhachMoi - LAG(t.SoKhachMoi) OVER (ORDER BY t.Thang) AS ChenhLech
          FROM (SELECT DATE_FORMAT(NgayDangKy, '%Y-%m') AS Thang, COUNT(*) AS SoKhachMoi
                  FROM KhachHang
                 GROUP BY DATE_FORMAT(NgayDangKy, '%Y-%m')) t
         ORDER BY t.Thang
        """
    )
    c1, c2 = st.columns(2)
    with c1:
        st.caption("Khách hàng mới mỗi tháng")
        st.bar_chart([{"Tháng": r["Thang"], "Khách mới": r["SoKhachMoi"]} for r in rows], x="Tháng", y="Khách mới")
    with c2:
        st.caption("Tổng số khách hàng tích lũy")
        st.line_chart([{"Tháng": r["Thang"], "Tích lũy": r["LuyKe"]} for r in rows], x="Tháng", y="Tích lũy")
    st.dataframe(
        rows,
        hide_index=True,
        column_config={
            "Thang": "Tháng", "SoKhachMoi": "Số khách mới", "LuyKe": "Số khách tích lũy",
            "ChenhLech": "Chênh lệch so với tháng trước",
        },
    )
    st.caption("Tháng đầu tiên chưa có tháng trước để so sánh nên ô chênh lệch để trống.")

# ------------------------- Theo năm -------------------------
with tab_nam:
    rows = chay(
        """
        SELECT t.Nam,
               t.SoKhachMoi,
               CAST(SUM(t.SoKhachMoi) OVER (ORDER BY t.Nam) AS SIGNED) AS LuyKe
          FROM (SELECT YEAR(NgayDangKy) AS Nam, COUNT(*) AS SoKhachMoi
                  FROM KhachHang
                 GROUP BY YEAR(NgayDangKy)) t
         ORDER BY t.Nam
        """
    )
    st.bar_chart([{"Năm": str(r["Nam"]), "Khách mới": r["SoKhachMoi"]} for r in rows], x="Năm", y="Khách mới")
    for r in rows:
        r["Nam"] = str(r["Nam"])
    st.dataframe(
        rows,
        hide_index=True,
        column_config={"Nam": "Năm", "SoKhachMoi": "Số khách mới", "LuyKe": "Số khách tích lũy"},
    )
