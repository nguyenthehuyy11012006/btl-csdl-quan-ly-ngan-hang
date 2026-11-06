import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Tài khoản tín dụng và dư nợ", page_icon="💳", layout="wide")
st.title("💳 Tài khoản tín dụng và dư nợ")
st.caption(
    "Dư nợ = tổng chi tiêu − tổng thanh toán, tính tại thời điểm truy vấn. "
    "Sắp xếp giảm dần theo dư nợ."
)

try:
    rows = query(
        """
        SELECT MaTK, MaKH, TenKH, NgayTao,
               CAST(HanMuc AS SIGNED) AS HanMuc,
               CAST(DuNo AS SIGNED) AS DuNo,
               CAST(HanMuc - DuNo AS SIGNED) AS HanMucConLai
          FROM v_DuNoTinDung
         ORDER BY DuNo DESC, MaTK
        """
    )
except DBError as e:
    st.error(str(e))
    st.stop()

for r in rows:
    r["DaDung"] = round(r["DuNo"] * 100 / r["HanMuc"], 1)


def dong(x):
    return f"{x:,}".replace(",", ".") + " đ"


c1, c2, c3 = st.columns(3)
c1.metric("Số tài khoản tín dụng", len(rows))
c2.metric("Tổng dư nợ", dong(sum(r["DuNo"] for r in rows)))
c3.metric("Tổng hạn mức", dong(sum(r["HanMuc"] for r in rows)))

tien = lambda ten: st.column_config.NumberColumn(ten, format="localized")

st.dataframe(
    rows,
    hide_index=True,
    column_order=["MaTK", "MaKH", "TenKH", "NgayTao", "HanMuc", "DuNo", "HanMucConLai", "DaDung"],
    column_config={
        "MaTK": "Mã TK",
        "MaKH": "Mã KH",
        "TenKH": "Chủ tài khoản",
        "NgayTao": st.column_config.DateColumn("Ngày tạo", format="DD/MM/YYYY"),
        "HanMuc": tien("Hạn mức"),
        "DuNo": tien("Dư nợ"),
        "HanMucConLai": tien("Hạn mức còn lại"),
        "DaDung": st.column_config.ProgressColumn(
            "Đã dùng hạn mức (%)", min_value=0, max_value=100, format="%.1f"
        ),
    },
)
