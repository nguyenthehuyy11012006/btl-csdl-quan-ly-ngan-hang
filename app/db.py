import os
from contextlib import contextmanager

import pymysql
from dotenv import load_dotenv
from pymysql.cursors import DictCursor

load_dotenv()


class DBError(Exception):
    """Lỗi hiển thị được cho người dùng (từ trigger/procedure hoặc kết nối)."""


_THONG_BAO = {
    3819: "Dữ liệu vi phạm ràng buộc CHECK của bảng",
    1062: "Giá trị bị trùng (mã hoặc CMT đã tồn tại)",
    1452: "Mã tham chiếu không tồn tại",
    1451: "Không thể xóa/sửa vì dữ liệu đang được tham chiếu",
    1045: "Sai tên đăng nhập hoặc mật khẩu MySQL (kiểm tra file .env)",
    1049: "Chưa có CSDL quan_ly_ngan_hang, hãy chạy file .sql trước",
    2003: "Không kết nối được MySQL (kiểm tra MySQL đã chạy chưa, DB_HOST/DB_PORT)",
}


def _dich_loi(e):
    ma = e.args[0] if e.args else None
    if ma == 1644:  # SIGNAL SQLSTATE '45000': giữ nguyên thông báo tiếng Việt
        return DBError(e.args[1])
    return DBError(_THONG_BAO.get(ma, f"Lỗi CSDL ({ma}): {e}"))


@contextmanager
def _cursor():
    try:
        conn = pymysql.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "quan_ly_ngan_hang"),
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=True,  # procedure tự quản lý transaction
        )
    except pymysql.MySQLError as e:
        raise _dich_loi(e) from e
    try:
        with conn.cursor() as cur:
            yield cur
    except pymysql.MySQLError as e:
        raise _dich_loi(e) from e
    finally:
        conn.close()


def query(sql, params=None):
    """Chạy SELECT, trả về list[dict]."""
    with _cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def call(proc, args=()):
    """Gọi stored procedure; trả về kết quả nếu procedure có SELECT."""
    with _cursor() as cur:
        cur.callproc(proc, args)
        rows = cur.fetchall()
        while cur.nextset():
            pass
        return rows
