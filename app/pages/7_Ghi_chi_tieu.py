import streamlit as st

from db import DBError, call, query

st.set_page_config(page_title="Ghi chi tiêu", page_icon="🛒", layout="wide")
st.title("🛒 Ghi chi tiêu trên tài khoản tín dụng")
st.caption("Chi tiêu làm tăng dư nợ. Tổng nợ (kể cả giao dịch đang thực hiện) không được vượt hạn mức tín dụng.")

if "thong_bao" in st.session_state:
    st.success(st.session_state.pop("thong_bao"))


def dong(x):
    return f"{x:,}".replace(",", ".") + " đ"


try:
    khach = query("SELECT MaKH, Ten FROM KhachHang ORDER BY MaKH")
    nhan_vien = query("SELECT MaNV, Ten, ViTri FROM NhanVien ORDER BY MaNV")
except DBError as e:
    st.error(str(e))
    st.stop()

ten_kh = {r["MaKH"]: r["Ten"] for r in khach}
ma_kh = st.selectbox(
    "Khách hàng thực hiện", list(ten_kh), format_func=lambda m: f"{m} – {ten_kh[m]}"
)

try:
    tin_dung = query(
        """
        SELECT v.MaTK, CAST(v.HanMuc AS SIGNED) AS HanMuc,
               CAST(v.DuNo AS SIGNED) AS DuNo, tk.TrangThai
          FROM v_DuNoTinDung v
          JOIN TaiKhoan tk ON tk.MaTK = v.MaTK
         WHERE v.MaKH = %s
         ORDER BY v.MaTK
        """,
        (ma_kh,),
    )
except DBError as e:
    st.error(str(e))
    st.stop()

bi_khoa = [r["MaTK"] for r in tin_dung if r["TrangThai"] != "HoatDong"]
if bi_khoa:
    st.warning("Tài khoản tín dụng đang bị đóng băng, không phát sinh giao dịch được: " + ", ".join(bi_khoa))
td = {r["MaTK"]: r for r in tin_dung if r["TrangThai"] == "HoatDong"}
if not td:
    st.error("Khách hàng này không có tài khoản tín dụng nào đang hoạt động.")
    st.stop()

ma_td = st.selectbox(
    "Tài khoản tín dụng (chỉ hiện tài khoản của chính khách hàng)",
    list(td),
    format_func=lambda m: f"{m} – hạn mức {dong(td[m]['HanMuc'])}",
)
tk = td[ma_td]
con_lai = tk["HanMuc"] - tk["DuNo"]

c1, c2, c3 = st.columns(3)
c1.metric("Dư nợ hiện tại", dong(tk["DuNo"]))
c2.metric("Hạn mức tín dụng", dong(tk["HanMuc"]))
c3.metric("Hạn mức còn lại", dong(con_lai))
st.progress(min(tk["DuNo"] / tk["HanMuc"], 1.0), text="Đã dùng hạn mức")

so_tien = st.number_input("Số tiền chi tiêu (đồng)", min_value=1, value=100_000, step=100_000)
if so_tien > con_lai:
    st.warning("Số tiền vượt hạn mức còn lại của tài khoản này.")
    st.caption("Bạn vẫn có thể bấm Ghi chi tiêu: CSDL sẽ từ chối và báo lý do.")

nv = {r["MaNV"]: r for r in nhan_vien}
ma_nv = st.selectbox(
    "Nhân viên hỗ trợ",
    list(nv),
    format_func=lambda m: f"{m} – {nv[m]['Ten']} ({nv[m]['ViTri']})",
)

if st.button("Ghi chi tiêu", type="primary"):
    try:
        call("sp_ChiTieu", (ma_kh, ma_nv, ma_td, so_tien, None))
    except DBError as e:
        st.error(str(e))
    else:
        st.session_state["thong_bao"] = f"Đã ghi chi tiêu {dong(so_tien)} trên tài khoản {ma_td}."
        st.rerun()
