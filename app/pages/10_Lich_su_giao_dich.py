from datetime import date

import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Lịch sử giao dịch", page_icon="📜", layout="wide")
st.title("📜 Lịch sử giao dịch")
st.caption("Mọi giao dịch chi tiêu và thanh toán trên tài khoản tín dụng, mới nhất xếp trước.")

LOAI = {"ChiTieu": "Chi tiêu", "ThanhToan": "Thanh toán"}


def dong(x):
    return f"{x:,}".replace(",", ".") + " đ"


def chay(sql, tham_so=None):
    try:
        return query(sql, tham_so)
    except DBError as e:
        st.error(str(e))
        st.stop()


moc = chay("SELECT DATE(MIN(ThoiGian)) AS tu, DATE(MAX(ThoiGian)) AS den FROM GiaoDich")[0]
tu_mac_dinh = moc["tu"] or date.today()
den_mac_dinh = max(moc["den"] or date.today(), date.today())
ten_kh = {r["MaKH"]: r["Ten"] for r in chay("SELECT MaKH, Ten FROM KhachHang ORDER BY MaKH")}
ds_td = [r["MaTK"] for r in chay("SELECT MaTK FROM TaiKhoanTinDung ORDER BY MaTK")]

c1, c2, c3 = st.columns(3)
ma_kh = c1.selectbox(
    "Khách hàng thực hiện", ["Tất cả"] + list(ten_kh),
    format_func=lambda m: m if m == "Tất cả" else f"{m} – {ten_kh[m]}",
)
ma_td = c2.selectbox("Tài khoản tín dụng", ["Tất cả"] + ds_td)
loai = c3.selectbox("Loại giao dịch", ["Tất cả"] + list(LOAI.values()))
khoang = st.date_input(
    "Khoảng ngày", value=(tu_mac_dinh, den_mac_dinh), format="DD/MM/YYYY"
)
if len(khoang) != 2:
    st.info("Hãy chọn đủ ngày bắt đầu và ngày kết thúc.")
    st.stop()
tu_ngay, den_ngay = khoang

dieu_kien = ["gd.ThoiGian >= %s", "gd.ThoiGian < DATE_ADD(%s, INTERVAL 1 DAY)"]
tham_so = [tu_ngay, den_ngay]
if ma_kh != "Tất cả":
    dieu_kien.append("gd.MaKH = %s")
    tham_so.append(ma_kh)
if ma_td != "Tất cả":
    dieu_kien.append("gd.MaTK_TinDung = %s")
    tham_so.append(ma_td)
if loai != "Tất cả":
    dieu_kien.append("gd.LoaiGD = %s")
    tham_so.append({v: k for k, v in LOAI.items()}[loai])

rows = chay(
    """
    SELECT gd.MaGD, gd.ThoiGian, gd.LoaiGD, gd.MaKH, kh.Ten AS TenKH,
           gd.MaTK_TinDung, tk.MaKH AS MaChu, chu.Ten AS TenChu,
           gd.MaTK_GuiTien, gd.MaNV, nv.Ten AS TenNV,
           CAST(gd.SoTien AS SIGNED) AS SoTien
      FROM GiaoDich gd
      JOIN KhachHang kh  ON kh.MaKH = gd.MaKH
      JOIN TaiKhoan  tk  ON tk.MaTK = gd.MaTK_TinDung
      JOIN KhachHang chu ON chu.MaKH = tk.MaKH
      JOIN NhanVien  nv  ON nv.MaNV = gd.MaNV
     WHERE """ + " AND ".join(dieu_kien) + """
     ORDER BY gd.ThoiGian DESC, gd.MaGD DESC
    """,
    tuple(tham_so),
)

if not rows:
    st.info("Không có giao dịch nào khớp với bộ lọc.")
    st.stop()

tong_chi = sum(r["SoTien"] for r in rows if r["LoaiGD"] == "ChiTieu")
tong_tt = sum(r["SoTien"] for r in rows if r["LoaiGD"] == "ThanhToan")
m1, m2, m3 = st.columns(3)
m1.metric("Số giao dịch", len(rows))
m2.metric("Tổng chi tiêu", dong(tong_chi))
m3.metric("Tổng thanh toán", dong(tong_tt))

for r in rows:
    r["ThanhHo"] = "Có" if r["LoaiGD"] == "ThanhToan" and r["MaKH"] != r["MaChu"] else ""
    r["LoaiGD"] = LOAI[r["LoaiGD"]]
    r["MaTK_GuiTien"] = r["MaTK_GuiTien"] or ""

st.dataframe(
    rows,
    hide_index=True,
    column_order=["MaGD", "ThoiGian", "LoaiGD", "TenKH", "MaTK_TinDung", "TenChu",
                  "ThanhHo", "MaTK_GuiTien", "TenNV", "SoTien"],
    column_config={
        "MaGD": "Mã GD",
        "ThoiGian": st.column_config.DatetimeColumn("Thời gian", format="DD/MM/YYYY HH:mm"),
        "LoaiGD": "Loại",
        "TenKH": "Khách hàng thực hiện",
        "MaTK_TinDung": "TK tín dụng",
        "TenChu": "Chủ TK tín dụng",
        "ThanhHo": "Thanh toán hộ",
        "MaTK_GuiTien": "TK gửi tiền (nguồn tiền)",
        "TenNV": "Nhân viên hỗ trợ",
        "SoTien": st.column_config.NumberColumn("Số tiền (đồng)", format="localized"),
    },
)
