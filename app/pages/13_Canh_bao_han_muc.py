import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Cảnh báo hạn mức", page_icon="🚨", layout="wide")
st.title("🚨 Cảnh báo tài khoản tín dụng gần hạn mức")
st.caption("Liệt kê tài khoản tín dụng có dư nợ đạt từ ngưỡng đã chọn trở lên so với hạn mức.")

TRANG_THAI = {"HoatDong": "Hoạt động", "DongBang": "Đóng băng"}


def tien(ten):
    return st.column_config.NumberColumn(ten, format="localized")


nguong = st.slider("Ngưỡng cảnh báo (% hạn mức đã dùng)", min_value=1, max_value=100, value=80)

try:
    rows = query(
        """
        SELECT v.MaTK, v.MaKH, v.TenKH, tk.TrangThai,
               CAST(v.HanMuc AS SIGNED) AS HanMuc,
               CAST(v.DuNo AS SIGNED) AS DuNo,
               CAST(v.HanMuc - v.DuNo AS SIGNED) AS HanMucConLai
          FROM v_DuNoTinDung v
          JOIN TaiKhoan tk ON tk.MaTK = v.MaTK
         WHERE v.DuNo * 100 >= %s * v.HanMuc
        """,
        (nguong,),
    )
except DBError as e:
    st.error(str(e))
    st.stop()

for r in rows:
    r["TyLe"] = round(r["DuNo"] * 100 / r["HanMuc"], 1)
    r["MucCanhBao"] = "Đã chạm hạn mức" if r["DuNo"] >= r["HanMuc"] else "Gần hạn mức"
    r["TrangThai"] = TRANG_THAI[r["TrangThai"]]
rows.sort(key=lambda r: (-r["TyLe"], r["MaTK"]))

if not rows:
    st.success(f"Không có tài khoản tín dụng nào đã dùng từ {nguong}% hạn mức trở lên.")
    st.stop()

cham = sum(1 for r in rows if r["MucCanhBao"] == "Đã chạm hạn mức")
c1, c2 = st.columns(2)
c1.metric("Số tài khoản bị cảnh báo", len(rows))
c2.metric("Trong đó đã chạm hạn mức", cham)
st.warning(f"Có {len(rows)} tài khoản tín dụng đã dùng từ {nguong}% hạn mức trở lên.")

st.dataframe(
    rows,
    hide_index=True,
    column_order=["MaTK", "TenKH", "TrangThai", "HanMuc", "DuNo", "HanMucConLai", "TyLe", "MucCanhBao"],
    column_config={
        "MaTK": "Mã TK", "TenKH": "Chủ tài khoản", "TrangThai": "Trạng thái",
        "HanMuc": tien("Hạn mức"), "DuNo": tien("Dư nợ"), "HanMucConLai": tien("Hạn mức còn lại"),
        "TyLe": st.column_config.ProgressColumn(
            "Đã dùng hạn mức (%)", min_value=0, max_value=100, format="%.1f"
        ),
        "MucCanhBao": "Mức cảnh báo",
    },
)
