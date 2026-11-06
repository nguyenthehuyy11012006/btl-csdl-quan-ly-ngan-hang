import streamlit as st

from db import DBError, query

st.set_page_config(page_title="Thống kê chi tiêu và dư nợ", page_icon="📊", layout="wide")
st.title("📊 Thống kê chi tiêu và dư nợ")
st.caption("Dư nợ = tổng chi tiêu − tổng thanh toán.")


def dong(x):
    return f"{x:,}".replace(",", ".") + " đ"


def tien(ten):
    return st.column_config.NumberColumn(ten, format="localized")


def chay(sql, tham_so=None):
    try:
        return query(sql, tham_so)
    except DBError as e:
        st.error(str(e))
        st.stop()


tong = chay(
    """
    SELECT CAST(COALESCE(SUM(CASE WHEN LoaiGD = 'ChiTieu'   THEN SoTien END), 0) AS SIGNED) AS ChiTieu,
           CAST(COALESCE(SUM(CASE WHEN LoaiGD = 'ThanhToan' THEN SoTien END), 0) AS SIGNED) AS ThanhToan
      FROM GiaoDich
    """
)[0]
du_no_tong = chay("SELECT CAST(COALESCE(SUM(DuNo), 0) AS SIGNED) AS DuNo FROM v_DuNoTinDung")[0]["DuNo"]

c1, c2, c3 = st.columns(3)
c1.metric("Tổng chi tiêu", dong(tong["ChiTieu"]))
c2.metric("Tổng thanh toán", dong(tong["ThanhToan"]))
c3.metric("Dư nợ hiện tại (mọi tài khoản tín dụng)", dong(du_no_tong))
if tong["ChiTieu"] - tong["ThanhToan"] != du_no_tong:
    st.error("Dư nợ không khớp với lịch sử giao dịch, hãy kiểm tra lại CSDL.")

tab_thang, tab_kh = st.tabs(["Theo tháng", "Theo khách hàng"])

# ------------------------- Theo tháng -------------------------
with tab_thang:
    thang = chay(
        """
        SELECT DATE_FORMAT(ThoiGian, '%Y-%m') AS Thang,
               COUNT(*) AS SoGiaoDich,
               CAST(SUM(CASE WHEN LoaiGD = 'ChiTieu'   THEN SoTien ELSE 0 END) AS SIGNED) AS ChiTieu,
               CAST(SUM(CASE WHEN LoaiGD = 'ThanhToan' THEN SoTien ELSE 0 END) AS SIGNED) AS ThanhToan
          FROM GiaoDich
         GROUP BY DATE_FORMAT(ThoiGian, '%Y-%m')
         ORDER BY Thang
        """
    )
    if not thang:
        st.info("Chưa có giao dịch nào.")
    else:
        st.bar_chart(
            [{"Tháng": r["Thang"], "Chi tiêu": r["ChiTieu"], "Thanh toán": r["ThanhToan"]} for r in thang],
            x="Tháng",
            y=["Chi tiêu", "Thanh toán"],
            y_label="Số tiền (đồng)",
            stack=False,
        )
        st.dataframe(
            thang,
            hide_index=True,
            column_order=["Thang", "SoGiaoDich", "ChiTieu", "ThanhToan"],
            column_config={
                "Thang": "Tháng", "SoGiaoDich": "Số giao dịch",
                "ChiTieu": tien("Chi tiêu"), "ThanhToan": tien("Thanh toán"),
            },
        )

# ------------------------- Theo khách hàng -------------------------
with tab_kh:
    kh = chay(
        """
        SELECT kh.MaKH, kh.Ten,
               COUNT(gd.MaGD) AS SoGiaoDich,
               CAST(COALESCE(SUM(CASE WHEN gd.LoaiGD = 'ChiTieu'   THEN gd.SoTien END), 0) AS SIGNED) AS ChiTieu,
               CAST(COALESCE(SUM(CASE WHEN gd.LoaiGD = 'ThanhToan' THEN gd.SoTien END), 0) AS SIGNED) AS ThanhToan
          FROM KhachHang kh
          LEFT JOIN GiaoDich gd ON gd.MaKH = kh.MaKH
         GROUP BY kh.MaKH, kh.Ten
         ORDER BY ChiTieu DESC, kh.MaKH
        """
    )
    du_no = {
        r["MaKH"]: r
        for r in chay(
            """
            SELECT MaKH, CAST(SUM(DuNo) AS SIGNED) AS DuNo, CAST(SUM(HanMuc) AS SIGNED) AS HanMuc
              FROM v_DuNoTinDung
             GROUP BY MaKH
            """
        )
    }
    for r in kh:
        d = du_no.get(r["MaKH"])
        r["DuNo"] = d["DuNo"] if d else 0
        r["HanMuc"] = d["HanMuc"] if d else 0

    st.caption(
        "Chi tiêu và thanh toán tính theo khách hàng thực hiện giao dịch. Dư nợ và hạn mức tính trên các "
        "tài khoản tín dụng của chính khách hàng đó, nên khi có thanh toán hộ thì dư nợ của một người "
        "không nhất thiết bằng chi tiêu − thanh toán của người đó."
    )
    co_tin_dung = [r for r in kh if r["HanMuc"] > 0]
    if co_tin_dung:
        st.bar_chart(
            [{"Khách hàng": r["Ten"], "Dư nợ": r["DuNo"], "Hạn mức": r["HanMuc"]} for r in co_tin_dung],
            x="Khách hàng",
            y=["Dư nợ", "Hạn mức"],
            y_label="Số tiền (đồng)",
            stack=False,
        )
    st.dataframe(
        kh,
        hide_index=True,
        column_order=["MaKH", "Ten", "SoGiaoDich", "ChiTieu", "ThanhToan", "DuNo", "HanMuc"],
        column_config={
            "MaKH": "Mã KH", "Ten": "Tên", "SoGiaoDich": "Số giao dịch",
            "ChiTieu": tien("Tổng chi tiêu"), "ThanhToan": tien("Tổng thanh toán"),
            "DuNo": tien("Dư nợ (TK của chính họ)"), "HanMuc": tien("Hạn mức (TK của chính họ)"),
        },
    )
