import streamlit as st

from db import DBError, call, query

st.set_page_config(page_title="Đóng băng tài khoản", page_icon="🧊", layout="wide")
st.title("🧊 Đóng băng tài khoản")
st.caption(
    "Tài khoản đóng băng không phát sinh giao dịch được. Tài khoản từ N tháng không có giao dịch "
    "thì đủ điều kiện bị đóng băng; mở băng thì giao dịch lại được."
)

if "thong_bao" in st.session_state:
    st.success(st.session_state.pop("thong_bao"))

LOAI = {"TinDung": "Tín dụng", "GuiTien": "Gửi tiền"}


def chay(sql, tham_so=None):
    try:
        return query(sql, tham_so)
    except DBError as e:
        st.error(str(e))
        st.stop()


def goi(proc, args):
    """Gọi procedure. Trả về (thành công?, kết quả); lỗi thì hiện nguyên thông báo."""
    try:
        return True, call(proc, args)
    except DBError as e:
        st.error(str(e))
        return False, None


def bang_tai_khoan(rows):
    for r in rows:
        r["LoaiTK"] = LOAI[r["LoaiTK"]]
    st.dataframe(
        rows,
        hide_index=True,
        column_order=["MaTK", "TenKH", "LoaiTK", "NgayTao", "SoGiaoDich", "HoatDongCuoi", "SoThang"],
        column_config={
            "MaTK": "Mã TK", "TenKH": "Chủ tài khoản", "LoaiTK": "Loại",
            "NgayTao": st.column_config.DateColumn("Ngày tạo", format="DD/MM/YYYY"),
            "SoGiaoDich": "Số giao dịch",
            "HoatDongCuoi": st.column_config.DatetimeColumn("Hoạt động cuối", format="DD/MM/YYYY HH:mm"),
            "SoThang": "Số tháng không giao dịch",
        },
    )


tab_du, tab_bang, tab_tay = st.tabs(
    ["Đủ điều kiện đóng băng", "Đang bị đóng băng", "Đóng băng thủ công"]
)

# ------------------------- Đủ điều kiện -------------------------
with tab_du:
    so_thang = st.number_input("Số tháng không có giao dịch", min_value=1, max_value=60, value=6, step=1)
    du = chay(
        """
        SELECT MaTK, TenKH, LoaiTK, NgayTao, SoGiaoDich, HoatDongCuoi,
               TIMESTAMPDIFF(MONTH, HoatDongCuoi, NOW()) AS SoThang
          FROM v_HoatDongTaiKhoan
         WHERE TrangThai = 'HoatDong'
           AND HoatDongCuoi <= DATE_SUB(NOW(), INTERVAL %s MONTH)
         ORDER BY HoatDongCuoi, MaTK
        """,
        (int(so_thang),),
    )
    if not du:
        st.info(f"Không có tài khoản nào đang hoạt động mà đã từ {so_thang} tháng không có giao dịch.")
    else:
        st.warning(f"Có {len(du)} tài khoản đủ điều kiện bị đóng băng.")
        bang_tai_khoan(du)
        chac = st.checkbox("Tôi xác nhận đóng băng tất cả các tài khoản trên", key="chac_hang_loat")
        if st.button("Đóng băng hàng loạt", type="primary", disabled=not chac):
            ok, rows = goi("sp_DongBangTaiKhoanKhongHoatDong", (int(so_thang),))
            if ok:
                n = rows[0]["SoTaiKhoanBiDongBang"] if rows else 0
                st.session_state["thong_bao"] = f"Đã đóng băng {n} tài khoản."
                st.rerun()

# ------------------------- Đang bị đóng băng -------------------------
with tab_bang:
    bang = chay(
        """
        SELECT MaTK, TenKH, LoaiTK, NgayTao, SoGiaoDich, HoatDongCuoi,
               TIMESTAMPDIFF(MONTH, HoatDongCuoi, NOW()) AS SoThang
          FROM v_HoatDongTaiKhoan
         WHERE TrangThai = 'DongBang'
         ORDER BY MaTK
        """
    )
    if not bang:
        st.info("Hiện không có tài khoản nào bị đóng băng.")
    else:
        st.caption(f"{len(bang)} tài khoản đang bị đóng băng.")
        ds_ma = [r["MaTK"] for r in bang]
        ten = {r["MaTK"]: f"{r['MaTK']} – {r['TenKH']} ({r['LoaiTK']})" for r in bang}
        bang_tai_khoan(bang)
        ma_mo = st.selectbox("Chọn tài khoản cần mở băng", ds_ma, format_func=lambda m: ten[m], key="mo_chon")
        if st.button("Mở băng", type="primary"):
            ok, _ = goi("sp_MoBangTaiKhoan", (ma_mo,))
            if ok:
                st.session_state["thong_bao"] = f"Đã mở băng tài khoản {ma_mo}."
                st.rerun()

# ------------------------- Thủ công -------------------------
with tab_tay:
    hd = chay(
        """
        SELECT MaTK, TenKH, LoaiTK
          FROM v_HoatDongTaiKhoan
         WHERE TrangThai = 'HoatDong'
         ORDER BY MaTK
        """
    )
    if not hd:
        st.info("Không có tài khoản nào đang hoạt động.")
    else:
        ten2 = {r["MaTK"]: f"{r['MaTK']} – {r['TenKH']} ({LOAI[r['LoaiTK']]})" for r in hd}
        ma_dong = st.selectbox("Chọn tài khoản cần đóng băng", list(ten2), format_func=lambda m: ten2[m], key="dong_chon")
        if st.button("Đóng băng tài khoản này", type="primary"):
            ok, _ = goi("sp_DongBangTaiKhoan", (ma_dong,))
            if ok:
                st.session_state["thong_bao"] = f"Đã đóng băng tài khoản {ma_dong}."
                st.rerun()
