from datetime import date

import streamlit as st

from db import DBError, call, query

st.set_page_config(page_title="Mở tài khoản", page_icon="🏦", layout="wide")
st.title("🏦 Mở tài khoản cho khách hàng")
st.caption(
    "Chỉ nhân viên kinh doanh được tạo tài khoản. "
    "Mỗi khách hàng mở tối đa 2 tài khoản tín dụng và 3 tài khoản gửi tiền."
)

if "thong_bao" in st.session_state:
    st.success(st.session_state.pop("thong_bao"))

GIOI_HAN = {"TinDung": 2, "GuiTien": 3}
TEN_LOAI = {"TinDung": "Tài khoản tín dụng", "GuiTien": "Tài khoản gửi tiền"}


def ma_ke_tiep(tien_to):
    ds = query("SELECT MaTK FROM TaiKhoan WHERE MaTK LIKE %s", (tien_to + "%",))
    so = [int(r["MaTK"][len(tien_to):]) for r in ds if r["MaTK"][len(tien_to):].isdigit()]
    return f"{tien_to}{max(so, default=0) + 1:03d}"


try:
    khach = query("SELECT MaKH, Ten, NgayDangKy FROM KhachHang ORDER BY MaKH")
    nvkd = query("SELECT MaNV, Ten FROM NhanVien WHERE ViTri = 'Kinh doanh' ORDER BY MaNV")
except DBError as e:
    st.error(str(e))
    st.stop()

kh = {r["MaKH"]: r for r in khach}
ma_kh = st.selectbox("Khách hàng", list(kh), format_func=lambda m: f"{m} – {kh[m]['Ten']}")
ngay_dk = kh[ma_kh]["NgayDangKy"]

try:
    dem = {"TinDung": 0, "GuiTien": 0}
    for r in query(
        "SELECT LoaiTK, COUNT(*) AS n FROM TaiKhoan WHERE MaKH = %s GROUP BY LoaiTK", (ma_kh,)
    ):
        dem[r["LoaiTK"]] = r["n"]
except DBError as e:
    st.error(str(e))
    st.stop()

c1, c2 = st.columns(2)
for cot, loai_tk in ((c1, "TinDung"), (c2, "GuiTien")):
    gh = GIOI_HAN[loai_tk]
    cot.metric(TEN_LOAI[loai_tk] + " đã mở", f"{dem[loai_tk]} / {gh}")
    cot.progress(min(dem[loai_tk] / gh, 1.0))
if ngay_dk:
    st.caption(f"Ngày đăng ký của khách hàng: {ngay_dk:%d/%m/%Y} (ngày tạo tài khoản không được trước ngày này).")

st.divider()
loai = st.radio("Loại tài khoản cần mở", list(TEN_LOAI), format_func=TEN_LOAI.get, horizontal=True)
day = dem[loai] >= GIOI_HAN[loai]
if day:
    st.error(f"Khách hàng đã mở đủ {GIOI_HAN[loai]} {TEN_LOAI[loai].lower()}, không thể mở thêm.")

try:
    goi_y = ma_ke_tiep("TKT" if loai == "TinDung" else "TKG")
except DBError as e:
    st.error(str(e))
    st.stop()

ma_tk = st.text_input("Mã tài khoản", value=goi_y, max_chars=12, key=f"ma_{goi_y}")
nv = {r["MaNV"]: r["Ten"] for r in nvkd}
ma_nv = st.selectbox(
    "Nhân viên kinh doanh tạo tài khoản (chỉ liệt kê nhân viên kinh doanh)",
    list(nv),
    format_func=lambda m: f"{m} – {nv[m]}",
)
ngay_tao = st.date_input("Ngày tạo", value=date.today(), format="DD/MM/YYYY")
if ngay_dk and ngay_tao < ngay_dk:
    st.warning("Ngày tạo đang trước ngày đăng ký của khách hàng, CSDL sẽ từ chối.")

if loai == "TinDung":
    han_muc = st.number_input("Hạn mức tín dụng (đồng)", min_value=1, value=10_000_000, step=1_000_000)
else:
    lai_suat = st.number_input("Lãi suất hàng tháng (%)", min_value=0.0, value=0.5, step=0.05, format="%.2f")
    toi_thieu = st.number_input("Số dư tối thiểu (đồng)", min_value=0, value=500_000, step=100_000)
    gui_dau = st.number_input("Số tiền gửi lần đầu (đồng)", min_value=0, value=1_000_000, step=100_000)
    if gui_dau < toi_thieu:
        st.warning("Số tiền gửi lần đầu phải lớn hơn hoặc bằng số dư tối thiểu, CSDL sẽ từ chối.")

if st.button("Mở tài khoản", type="primary", disabled=day):
    try:
        if loai == "TinDung":
            call("sp_MoTaiKhoanTinDung", (ma_tk, ma_kh, ma_nv, ngay_tao, han_muc))
        else:
            call("sp_MoTaiKhoanGuiTien", (ma_tk, ma_kh, ma_nv, ngay_tao, lai_suat, toi_thieu, gui_dau))
    except DBError as e:
        st.error(str(e))
    else:
        st.session_state["thong_bao"] = f"Đã mở {TEN_LOAI[loai].lower()} {ma_tk} cho khách hàng {ma_kh}."
        st.rerun()
