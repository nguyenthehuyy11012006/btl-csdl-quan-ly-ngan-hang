import streamlit as st

from db import DBError, call, query

st.set_page_config(page_title="Thanh toán tín dụng", page_icon="💸", layout="wide")
st.title("💸 Thanh toán tài khoản tín dụng")
st.caption(
    "Khách hàng dùng tiền trong tài khoản gửi tiền của chính mình để thanh toán "
    "cho một tài khoản tín dụng (có thể là của người khác)."
)

if "thong_bao" in st.session_state:
    st.success(st.session_state.pop("thong_bao"))


def dong(x):
    return f"{x:,}".replace(",", ".") + " đ"


try:
    khach = query("SELECT MaKH, Ten FROM KhachHang ORDER BY MaKH")
    nhan_vien = query("SELECT MaNV, Ten, ViTri FROM NhanVien ORDER BY MaNV")
    tin_dung = query(
        """
        SELECT v.MaTK, v.TenKH, CAST(v.HanMuc AS SIGNED) AS HanMuc,
               CAST(v.DuNo AS SIGNED) AS DuNo, tk.TrangThai
          FROM v_DuNoTinDung v
          JOIN TaiKhoan tk ON tk.MaTK = v.MaTK
         ORDER BY v.MaTK
        """
    )
except DBError as e:
    st.error(str(e))
    st.stop()

# ---- 1. Khách hàng và tài khoản gửi tiền (chỉ của chính khách hàng) ----
st.subheader("1. Nguồn tiền")
ten_kh = {r["MaKH"]: r["Ten"] for r in khach}
ma_kh = st.selectbox(
    "Khách hàng thực hiện", list(ten_kh), format_func=lambda m: f"{m} – {ten_kh[m]}"
)

try:
    gui_tien = query(
        """
        SELECT tk.MaTK, tk.TrangThai,
               CAST(tk.SoDu AS SIGNED) AS SoDu,
               CAST(gt.SoDuToiThieu AS SIGNED) AS SoDuToiThieu
          FROM TaiKhoan tk
          JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
         WHERE tk.MaKH = %s
         ORDER BY tk.MaTK
        """,
        (ma_kh,),
    )
except DBError as e:
    st.error(str(e))
    st.stop()

bi_khoa = [r["MaTK"] for r in gui_tien if r["TrangThai"] != "HoatDong"]
if bi_khoa:
    st.warning("Tài khoản gửi tiền đang bị đóng băng, không dùng được: " + ", ".join(bi_khoa))
gt = {r["MaTK"]: r for r in gui_tien if r["TrangThai"] == "HoatDong"}
if not gt:
    st.error("Khách hàng này không có tài khoản gửi tiền nào đang hoạt động.")
    st.stop()
ma_gt = st.selectbox(
    "Tài khoản gửi tiền (chỉ hiện tài khoản của chính khách hàng)",
    list(gt),
    format_func=lambda m: f"{m} – số dư {dong(gt[m]['SoDu'])}",
)

# ---- 2. Tài khoản tín dụng cần thanh toán (có thể của người khác) ----
st.subheader("2. Tài khoản tín dụng cần thanh toán")
td = {r["MaTK"]: r for r in tin_dung if r["TrangThai"] == "HoatDong" and r["DuNo"] > 0}
td_khoa = [r["MaTK"] for r in tin_dung if r["TrangThai"] != "HoatDong"]
if td_khoa:
    st.warning("Tài khoản tín dụng đang bị đóng băng, không thanh toán được: " + ", ".join(td_khoa))
if not td:
    st.info("Hiện không có tài khoản tín dụng nào đang hoạt động mà còn dư nợ.")
    st.stop()
ma_td = st.selectbox(
    "Tài khoản tín dụng (có thể của người khác)",
    list(td),
    format_func=lambda m: f"{m} – {td[m]['TenKH']} – dư nợ {dong(td[m]['DuNo'])}",
)

# ---- Thông tin ràng buộc hiện sẵn ----
tk_gui, tk_td = gt[ma_gt], td[ma_td]
toi_da = min(tk_td["DuNo"], tk_gui["SoDu"] - tk_gui["SoDuToiThieu"])

c1, c2, c3, c4 = st.columns(4)
c1.metric("Dư nợ hiện tại", dong(tk_td["DuNo"]))
c2.metric("Hạn mức tín dụng", dong(tk_td["HanMuc"]))
c3.metric("Số dư tài khoản gửi", dong(tk_gui["SoDu"]))
c4.metric("Số dư tối thiểu phải giữ", dong(tk_gui["SoDuToiThieu"]))
if toi_da > 0:
    st.info(f"Số tiền thanh toán tối đa lúc này: **{dong(toi_da)}**")
else:
    st.warning("Với tài khoản gửi tiền này, hiện không thể thanh toán vì số dư không vượt quá số dư tối thiểu.")

# ---- 3. Số tiền và nhân viên hỗ trợ ----
st.subheader("3. Số tiền và nhân viên hỗ trợ")
so_tien = st.number_input(
    "Số tiền thanh toán (đồng)", min_value=1, value=100_000, step=100_000
)
if so_tien > tk_td["DuNo"]:
    st.warning("Số tiền lớn hơn dư nợ hiện tại của tài khoản tín dụng.")
elif tk_gui["SoDu"] - so_tien < tk_gui["SoDuToiThieu"]:
    st.warning("Số dư còn lại sau thanh toán sẽ thấp hơn số dư tối thiểu.")
st.caption("Bạn vẫn có thể bấm Thanh toán dù vượt giới hạn: CSDL sẽ từ chối và báo lý do.")

nv = {r["MaNV"]: r for r in nhan_vien}
ma_nv = st.selectbox(
    "Nhân viên hỗ trợ",
    list(nv),
    format_func=lambda m: f"{m} – {nv[m]['Ten']} ({nv[m]['ViTri']})",
)

if st.button("Thanh toán", type="primary"):
    try:
        call("sp_ThanhToan", (ma_kh, ma_nv, ma_td, ma_gt, so_tien, None))
    except DBError as e:
        st.error(str(e))
    else:
        st.session_state["thong_bao"] = (
            f"Đã thanh toán {dong(so_tien)} cho tài khoản {ma_td} từ tài khoản gửi tiền {ma_gt}."
        )
        st.rerun()
