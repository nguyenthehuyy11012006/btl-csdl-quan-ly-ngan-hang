import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Tỉ lệ khách hàng theo thành phố", page_icon="🏙️", layout="wide")
st.title("🏙️ Thành phố có tỉ lệ khách hàng cao")
st.caption("Tỉ lệ = số khách hàng của thành phố ÷ tổng số khách hàng của ngân hàng.")


def chay(sql, tham_so=None):
    try:
        return query(sql, tham_so)
    except DBError as e:
        st.error(str(e))
        st.stop()


def cot_ty_le():
    return st.column_config.NumberColumn("Tỉ lệ (%)", format="%.2f")


nguong = st.slider("Ngưỡng tỉ lệ khách hàng (%)", min_value=0, max_value=100, value=20)

tat_ca = chay(
    """
    SELECT ThanhPho, COUNT(*) AS SoKhachHang,
           ROUND(COUNT(*) * 100 / (SELECT COUNT(*) FROM KhachHang), 2) AS TyLe
      FROM KhachHang
     GROUP BY ThanhPho
     ORDER BY SoKhachHang DESC, ThanhPho
    """
)
cao = chay(
    """
    SELECT ThanhPho, COUNT(*) AS SoKhachHang,
           ROUND(COUNT(*) * 100 / (SELECT COUNT(*) FROM KhachHang), 2) AS TyLe
      FROM KhachHang
     GROUP BY ThanhPho
    HAVING COUNT(*) * 100 / (SELECT COUNT(*) FROM KhachHang) >= %s
     ORDER BY SoKhachHang DESC, ThanhPho
    """,
    (nguong,),
)
for r in tat_ca + cao:
    r["TyLe"] = float(r["TyLe"])

c1, c2, c3 = st.columns(3)
c1.metric("Tổng số khách hàng", sum(r["SoKhachHang"] for r in tat_ca))
c2.metric("Số thành phố", len(tat_ca))
c3.metric(f"Thành phố đạt từ {nguong}%", len(cao))

if cao:
    st.success("Thành phố có tỉ lệ khách hàng từ " + str(nguong) + "% trở lên: " + ", ".join(r["ThanhPho"] for r in cao))
    st.dataframe(
        cao,
        hide_index=True,
        column_config={"ThanhPho": "Thành phố", "SoKhachHang": "Số khách hàng", "TyLe": cot_ty_le()},
    )
else:
    st.info(f"Không có thành phố nào có tỉ lệ khách hàng từ {nguong}% trở lên.")

st.subheader("Tỉ lệ khách hàng của mọi thành phố")
st.bar_chart([{"Thành phố": r["ThanhPho"], "Tỉ lệ (%)": r["TyLe"]} for r in tat_ca], x="Thành phố", y="Tỉ lệ (%)")
st.dataframe(
    tat_ca,
    hide_index=True,
    column_config={"ThanhPho": "Thành phố", "SoKhachHang": "Số khách hàng", "TyLe": cot_ty_le()},
)
