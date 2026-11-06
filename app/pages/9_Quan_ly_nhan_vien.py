from datetime import date

import streamlit as st

from db import DBError, execute, query

st.set_page_config(page_title="Quản lý nhân viên", page_icon="👥", layout="wide")
st.title("👥 Quản lý nhân viên")
st.caption(
    "Xem, thêm, sửa và xóa nhân viên. Nhân viên đã tạo tài khoản "
    "hoặc hỗ trợ giao dịch thì không xóa được."
)

if "thong_bao" in st.session_state:
    st.success(st.session_state.pop("thong_bao"))

VI_TRI_MAC_DINH = ["Kinh doanh", "Giao dịch viên", "Kế toán", "Quản lý chi nhánh"]


def chay(sql, tham_so=None):
    try:
        return query(sql, tham_so)
    except DBError as e:
        st.error(str(e))
        st.stop()


def ghi(sql, tham_so, thong_bao):
    """Ghi vào CSDL; lỗi thì hiện nguyên thông báo, thành công thì tải lại trang."""
    try:
        execute(sql, tham_so)
    except DBError as e:
        st.error(str(e))
    else:
        st.session_state["thong_bao"] = thong_bao
        st.rerun()


ds = chay(
    "SELECT MaNV, CMT, Ten, NgaySinh, DiaChi, BacNghe, ThamNien, ViTri FROM NhanVien ORDER BY MaNV"
)
vi_tri = VI_TRI_MAC_DINH + sorted({r["ViTri"] for r in ds if r["ViTri"]} - set(VI_TRI_MAC_DINH))
nv = {r["MaNV"]: r for r in ds}

tab_ds, tab_them, tab_sua = st.tabs(["Danh sách", "Thêm nhân viên", "Sửa / xóa"])

# ------------------------- Danh sách -------------------------
with tab_ds:
    loc = st.selectbox("Lọc theo vị trí công việc", ["Tất cả"] + vi_tri, key="loc_vt")
    hien = [r for r in ds if loc == "Tất cả" or r["ViTri"] == loc]
    st.caption(f"{len(hien)} nhân viên.")
    st.dataframe(
        hien,
        hide_index=True,
        column_order=["MaNV", "Ten", "CMT", "NgaySinh", "DiaChi", "BacNghe", "ThamNien", "ViTri"],
        column_config={
            "MaNV": "Mã NV", "Ten": "Tên", "CMT": "CMT",
            "NgaySinh": st.column_config.DateColumn("Ngày sinh", format="DD/MM/YYYY"),
            "DiaChi": "Địa chỉ", "BacNghe": "Bậc nghề", "ThamNien": "Thâm niên (năm)",
            "ViTri": "Vị trí công việc",
        },
    )

# ------------------------- Thêm -------------------------
with tab_them:
    so = [int(m[2:]) for m in nv if m[2:].isdigit()]
    goi_y = f"NV{max(so, default=0) + 1:03d}"
    ma_moi = st.text_input("Mã nhân viên", value=goi_y, max_chars=10, key=f"them_ma_{goi_y}")
    cmt = st.text_input("CMT", max_chars=12, key=f"them_cmt_{goi_y}")
    ten = st.text_input("Họ và tên", max_chars=100, key=f"them_ten_{goi_y}")
    ngay_sinh = st.date_input(
        "Ngày sinh", value=date(1995, 1, 1), min_value=date(1950, 1, 1),
        max_value=date.today(), format="DD/MM/YYYY", key=f"them_ns_{goi_y}",
    )
    dia_chi = st.text_input("Địa chỉ", max_chars=255, key=f"them_dc_{goi_y}")
    bac = st.number_input("Bậc nghề (từ 1 trở lên)", min_value=1, value=1, step=1, key=f"them_bac_{goi_y}")
    tham_nien = st.number_input("Thâm niên (năm, từ 0 trở lên)", min_value=0, value=0, step=1, key=f"them_tn_{goi_y}")
    vt = st.selectbox("Vị trí công việc", vi_tri, key=f"them_vt_{goi_y}")

    if st.button("Thêm nhân viên", type="primary"):
        if not (ma_moi.strip() and cmt.strip() and ten.strip() and dia_chi.strip()):
            st.error("Mã nhân viên, CMT, họ tên và địa chỉ không được để trống.")
        else:
            ghi(
                """
                INSERT INTO NhanVien (MaNV, CMT, Ten, NgaySinh, DiaChi, BacNghe, ThamNien, ViTri)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (ma_moi.strip(), cmt.strip(), ten.strip(), ngay_sinh, dia_chi.strip(), bac, tham_nien, vt),
                f"Đã thêm nhân viên {ma_moi.strip()}.",
            )

# ------------------------- Sửa / xóa -------------------------
with tab_sua:
    ma = st.selectbox(
        "Chọn nhân viên", list(nv), format_func=lambda m: f"{m} – {nv[m]['Ten']}", key="sua_chon"
    )
    r = nv[ma]
    cmt2 = st.text_input("CMT", value=r["CMT"], max_chars=12, key=f"sua_cmt_{ma}")
    ten2 = st.text_input("Họ và tên", value=r["Ten"], max_chars=100, key=f"sua_ten_{ma}")
    ns2 = st.date_input(
        "Ngày sinh", value=r["NgaySinh"] or date(1995, 1, 1), min_value=date(1900, 1, 1),
        max_value=date.today(), format="DD/MM/YYYY", key=f"sua_ns_{ma}",
    )
    dc2 = st.text_input("Địa chỉ", value=r["DiaChi"], max_chars=255, key=f"sua_dc_{ma}")
    bac2 = st.number_input("Bậc nghề (từ 1 trở lên)", min_value=1, value=int(r["BacNghe"]), step=1, key=f"sua_bac_{ma}")
    tn2 = st.number_input("Thâm niên (năm, từ 0 trở lên)", min_value=0, value=int(r["ThamNien"]), step=1, key=f"sua_tn_{ma}")
    ds_vt = vi_tri if r["ViTri"] in vi_tri else vi_tri + [r["ViTri"]]
    vt2 = st.selectbox("Vị trí công việc", ds_vt, index=ds_vt.index(r["ViTri"]), key=f"sua_vt_{ma}")

    if st.button("Lưu thay đổi", type="primary"):
        if not (cmt2.strip() and ten2.strip() and dc2.strip()):
            st.error("CMT, họ tên và địa chỉ không được để trống.")
        else:
            ghi(
                """
                UPDATE NhanVien
                   SET CMT = %s, Ten = %s, NgaySinh = %s, DiaChi = %s,
                       BacNghe = %s, ThamNien = %s, ViTri = %s
                 WHERE MaNV = %s
                """,
                (cmt2.strip(), ten2.strip(), ns2, dc2.strip(), bac2, tn2, vt2, ma),
                f"Đã cập nhật nhân viên {ma}.",
            )

    st.divider()
    st.subheader("Xóa nhân viên")
    chac = st.checkbox("Tôi chắc chắn muốn xóa nhân viên này", key=f"xoa_chac_{ma}")
    if st.button("Xóa nhân viên", disabled=not chac):
        ghi("DELETE FROM NhanVien WHERE MaNV = %s", (ma,), f"Đã xóa nhân viên {ma}.")
