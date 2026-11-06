const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const mysql = require('mysql2/promise')
const dotenv = require('dotenv')

app.setName('FHBank')

function loadDatabaseConfig() {
  const configDirectory = app.isPackaged
    ? app.getPath('userData')
    : path.join(app.getAppPath(), 'app')
  dotenv.config({ path: path.join(configDirectory, '.env') })

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quan_ly_ngan_hang',
    charset: 'utf8mb4',
    connectTimeout: 5000,
  }
}

async function checkDatabaseConnection() {
  let connection
  const config = loadDatabaseConfig()

  try {
    connection = await mysql.createConnection(config)
    const [rows] = await connection.query('SELECT DATABASE() AS databaseName, VERSION() AS version')
    return {
      connected: true,
      database: rows[0].databaseName,
      version: rows[0].version,
      message: 'Connected to database.',
    }
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : undefined
    let message = 'Không thể kết nối MySQL. Hãy kiểm tra cấu hình và trạng thái máy chủ.'

    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'PROTOCOL_CONNECTION_LOST') {
      message = 'Không kết nối được MySQL. Hãy kiểm tra MySQL đang chạy và DB_HOST/DB_PORT.'
    } else if (code === 'ER_ACCESS_DENIED_ERROR') {
      message = 'MySQL từ chối đăng nhập. Hãy kiểm tra DB_USER và DB_PASSWORD trong app/.env.'
    } else if (code === 'ER_BAD_DB_ERROR') {
      message = 'Chưa có cơ sở dữ liệu quan_ly_ngan_hang. Hãy chạy file SQL khởi tạo trước.'
    }

    return { connected: false, database: null, version: null, message }
  } finally {
    if (connection) await connection.end().catch(() => {})
  }
}

async function searchCustomers(_event, term = '') {
  const config = loadDatabaseConfig()
  const keyword = String(term).trim().slice(0, 80)
  const pattern = `%${keyword}%`
  const connection = await mysql.createConnection(config)
  try {
    const [rows] = await connection.execute(
      `SELECT MaKH, Ten, CMT, NgaySinh, DiaChi, ThanhPho, NgayDangKy
         FROM KhachHang
        WHERE MaKH LIKE ? OR Ten LIKE ? OR CMT LIKE ?
        ORDER BY Ten, MaKH
        LIMIT 100`,
      [pattern, pattern, pattern],
    )
    return rows
  } catch {
    throw new Error('Không thể tìm khách hàng. Hãy kiểm tra kết nối và cơ sở dữ liệu MySQL.')
  } finally {
    await connection.end()
  }
}

async function getCustomerAccounts(_event, customerId) {
  const id = String(customerId || '').trim().slice(0, 10)
  if (!id) throw new Error('Invalid customer id.')
  const config = loadDatabaseConfig()
  const connection = await mysql.createConnection(config)
  try {
    const [creditAccounts] = await connection.execute(
      `SELECT v.MaTK, tk.TrangThai, v.NgayTao,
              CAST(v.HanMuc AS SIGNED) AS HanMuc,
              CAST(v.DuNo AS SIGNED) AS DuNo,
              CAST(v.HanMuc - v.DuNo AS SIGNED) AS HanMucConLai
         FROM v_DuNoTinDung v
         JOIN TaiKhoan tk ON tk.MaTK = v.MaTK
        WHERE v.MaKH = ?
        ORDER BY v.MaTK`,
      [id],
    )
    const [depositAccounts] = await connection.execute(
      `SELECT tk.MaTK, tk.TrangThai, tk.NgayTao,
              CAST(tk.SoDu AS SIGNED) AS SoDu,
              gt.LaiSuatThang,
              CAST(gt.SoDuToiThieu AS SIGNED) AS SoDuToiThieu,
              CAST(gt.SoTienGuiLanDau AS SIGNED) AS SoTienGuiLanDau
         FROM TaiKhoan tk
         JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
        WHERE tk.MaKH = ?
        ORDER BY tk.MaTK`,
      [id],
    )
    return { creditAccounts, depositAccounts }
  } catch {
    throw new Error('Không thể tải tài khoản khách hàng. Hãy kiểm tra cấu trúc cơ sở dữ liệu.')
  } finally {
    await connection.end()
  }
}

async function listCreditAccounts() {
  const config = loadDatabaseConfig()
  const connection = await mysql.createConnection(config)
  try {
    const [rows] = await connection.execute(
      `SELECT v.MaTK, v.MaKH, v.TenKH, tk.TrangThai, v.NgayTao,
              CAST(v.HanMuc AS SIGNED) AS HanMuc,
              CAST(v.DuNo AS SIGNED) AS DuNo,
              CAST(v.HanMuc - v.DuNo AS SIGNED) AS HanMucConLai,
              ROUND(v.DuNo * 100 / v.HanMuc, 1) AS DaDung
         FROM v_DuNoTinDung v
         JOIN TaiKhoan tk ON tk.MaTK = v.MaTK
        ORDER BY v.DuNo DESC, v.MaTK`,
    )
    return rows
  } catch {
    throw new Error('Không thể tải tài khoản tín dụng. Hãy kiểm tra kết nối và cấu trúc cơ sở dữ liệu.')
  } finally {
    await connection.end()
  }
}

async function listTopDepositCustomers() {
  const config = loadDatabaseConfig()
  const connection = await mysql.createConnection(config)
  try {
    const [rows] = await connection.execute(
      `SELECT kh.MaKH, kh.CMT, kh.Ten, kh.NgaySinh, kh.DiaChi,
              COUNT(gt.MaTK) AS SoTKGuiTien,
              CAST(SUM(tk.SoDu) AS SIGNED) AS TongTienGui
         FROM KhachHang kh
         JOIN TaiKhoan tk ON tk.MaKH = kh.MaKH
         JOIN TaiKhoanGuiTien gt ON gt.MaTK = tk.MaTK
        GROUP BY kh.MaKH, kh.CMT, kh.Ten, kh.NgaySinh, kh.DiaChi
        ORDER BY TongTienGui DESC, kh.MaKH
        LIMIT 10`,
    )
    return rows
  } catch {
    throw new Error('Không thể tải bảng xếp hạng tiền gửi từ MySQL.')
  } finally {
    await connection.end()
  }
}

async function withReadConnection(action, failureMessage) {
  let connection
  try {
    connection = await mysql.createConnection(loadDatabaseConfig())
    return await action(connection)
  } catch {
    throw new Error(failureMessage)
  } finally {
    if (connection) await connection.end().catch(() => {})
  }
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

async function getTransactionsByDateRange(_event, range = {}) {
  const { from, to } = range
  if (!validDate(from) || !validDate(to) || from > to) throw new Error('Khoảng ngày không hợp lệ.')
  return withReadConnection(async (connection) => {
    const [summary] = await connection.execute(
      `SELECT kh.MaKH, kh.Ten AS TenKhachHang, gd.MaTK_TinDung,
              chu.Ten AS ChuTaiKhoan, COUNT(*) AS SoGiaoDich,
              CAST(SUM(CASE WHEN gd.LoaiGD = 'ChiTieu' THEN gd.SoTien ELSE 0 END) AS SIGNED) AS TongChiTieu,
              CAST(SUM(CASE WHEN gd.LoaiGD = 'ThanhToan' THEN gd.SoTien ELSE 0 END) AS SIGNED) AS TongThanhToan,
              CAST(SUM(gd.SoTien) AS SIGNED) AS TongTienGiaoDich
         FROM GiaoDich gd
         JOIN KhachHang kh ON kh.MaKH = gd.MaKH
         JOIN TaiKhoan tk ON tk.MaTK = gd.MaTK_TinDung
         JOIN KhachHang chu ON chu.MaKH = tk.MaKH
        WHERE gd.ThoiGian >= ? AND gd.ThoiGian < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY kh.MaKH, kh.Ten, gd.MaTK_TinDung, chu.Ten
        ORDER BY kh.Ten, gd.MaTK_TinDung`,
      [from, to],
    )
    const [details] = await connection.execute(
      `SELECT kh.Ten AS TenKhachHang, gd.MaTK_TinDung, gd.MaGD, gd.LoaiGD,
              CAST(gd.SoTien AS SIGNED) AS SoTien, gd.ThoiGian
         FROM GiaoDich gd JOIN KhachHang kh ON kh.MaKH = gd.MaKH
        WHERE gd.ThoiGian >= ? AND gd.ThoiGian < DATE_ADD(?, INTERVAL 1 DAY)
        ORDER BY kh.Ten, gd.MaTK_TinDung, gd.ThoiGian`,
      [from, to],
    )
    return { summary, details }
  }, 'Không thể tải giao dịch trong khoảng ngày đã chọn.')
}

async function getTransactionHistory(_event, filters = {}) {
  const conditions = []
  const params = []
  if (filters.from || filters.to) {
    if (!validDate(filters.from) || !validDate(filters.to) || filters.from > filters.to) throw new Error('Khoảng ngày không hợp lệ.')
    conditions.push('gd.ThoiGian >= ?', 'gd.ThoiGian < DATE_ADD(?, INTERVAL 1 DAY)')
    params.push(filters.from, filters.to)
  }
  if (filters.kind && ['ChiTieu', 'ThanhToan'].includes(filters.kind)) {
    conditions.push('gd.LoaiGD = ?')
    params.push(filters.kind)
  }
  const keyword = String(filters.keyword || '').trim().slice(0, 80)
  if (keyword) {
    conditions.push('(kh.Ten LIKE ? OR gd.MaKH LIKE ? OR gd.MaTK_TinDung LIKE ? OR CAST(gd.MaGD AS CHAR) LIKE ?)')
    const pattern = `%${keyword}%`
    params.push(pattern, pattern, pattern, pattern)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return withReadConnection(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT gd.MaGD, gd.ThoiGian, gd.LoaiGD, gd.MaKH, kh.Ten AS TenKH,
              gd.MaTK_TinDung, tk.MaKH AS MaChu, chu.Ten AS TenChu,
              gd.MaTK_GuiTien, gd.MaNV, nv.Ten AS TenNV,
              CAST(gd.SoTien AS SIGNED) AS SoTien
         FROM GiaoDich gd
         JOIN KhachHang kh ON kh.MaKH = gd.MaKH
         JOIN TaiKhoan tk ON tk.MaTK = gd.MaTK_TinDung
         JOIN KhachHang chu ON chu.MaKH = tk.MaKH
         JOIN NhanVien nv ON nv.MaNV = gd.MaNV
         ${where}
        ORDER BY gd.ThoiGian DESC, gd.MaGD DESC
        LIMIT 1000`,
      params,
    )
    return rows
  }, 'Không thể tải lịch sử giao dịch từ MySQL.')
}

async function getSpendingDebtReport() {
  return withReadConnection(async (connection) => {
    const [totals] = await connection.execute(
      `SELECT CAST(COALESCE(SUM(CASE WHEN LoaiGD = 'ChiTieu' THEN SoTien END), 0) AS SIGNED) AS ChiTieu,
              CAST(COALESCE(SUM(CASE WHEN LoaiGD = 'ThanhToan' THEN SoTien END), 0) AS SIGNED) AS ThanhToan
         FROM GiaoDich`,
    )
    const [debtTotal] = await connection.execute(
      'SELECT CAST(COALESCE(SUM(DuNo), 0) AS SIGNED) AS DuNo FROM v_DuNoTinDung',
    )
    const [monthly] = await connection.execute(
      `SELECT DATE_FORMAT(ThoiGian, '%Y-%m') AS Thang, COUNT(*) AS SoGiaoDich,
              CAST(SUM(CASE WHEN LoaiGD = 'ChiTieu' THEN SoTien ELSE 0 END) AS SIGNED) AS ChiTieu,
              CAST(SUM(CASE WHEN LoaiGD = 'ThanhToan' THEN SoTien ELSE 0 END) AS SIGNED) AS ThanhToan
         FROM GiaoDich GROUP BY DATE_FORMAT(ThoiGian, '%Y-%m') ORDER BY Thang`,
    )
    const [customers] = await connection.execute(
      `SELECT kh.MaKH, kh.Ten, COUNT(gd.MaGD) AS SoGiaoDich,
              CAST(COALESCE(SUM(CASE WHEN gd.LoaiGD = 'ChiTieu' THEN gd.SoTien END), 0) AS SIGNED) AS ChiTieu,
              CAST(COALESCE(SUM(CASE WHEN gd.LoaiGD = 'ThanhToan' THEN gd.SoTien END), 0) AS SIGNED) AS ThanhToan,
              CAST(COALESCE(MAX(d.DuNo), 0) AS SIGNED) AS DuNo,
              CAST(COALESCE(MAX(d.HanMuc), 0) AS SIGNED) AS HanMuc
         FROM KhachHang kh
         LEFT JOIN GiaoDich gd ON gd.MaKH = kh.MaKH
         LEFT JOIN (SELECT MaKH, SUM(DuNo) AS DuNo, SUM(HanMuc) AS HanMuc
                      FROM v_DuNoTinDung GROUP BY MaKH) d ON d.MaKH = kh.MaKH
        GROUP BY kh.MaKH, kh.Ten
        ORDER BY ChiTieu DESC, kh.MaKH`,
    )
    return { totals: totals[0], debtTotal: debtTotal[0].DuNo, monthly, customers }
  }, 'Không thể tải báo cáo chi tiêu và dư nợ.')
}

async function getEmployeeIncomeData() {
  return withReadConnection(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT Thang, MaNV, Ten, SoTKTinDung, SoTKGuiTien,
              CAST(Luong AS SIGNED) AS Luong
         FROM v_LuongNVKD
        ORDER BY Thang DESC, Luong DESC, MaNV`,
    )
    return rows
  }, 'Không thể tải báo cáo thu nhập nhân viên.')
}

async function getEmployeeRanking(_event, period = {}) {
  const { mode, month, from, to } = period
  if (mode === 'month') {
    if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) throw new Error('Tháng xếp hạng không hợp lệ.')
    return withReadConnection(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT RANK() OVER (ORDER BY Luong DESC) AS XepHang,
                MaNV, Ten, SoTKTinDung, SoTKGuiTien, CAST(Luong AS SIGNED) AS ThuNhap
           FROM v_LuongNVKD WHERE Thang = ? ORDER BY XepHang, MaNV`,
        [month],
      )
      return rows
    }, 'Không thể tải xếp hạng thu nhập theo tháng.')
  }
  if (typeof from !== 'string' || typeof to !== 'string' || !/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to) || from > to) {
    throw new Error('Khoảng tháng xếp hạng không hợp lệ.')
  }
  return withReadConnection(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT RANK() OVER (ORDER BY SUM(Luong) DESC) AS XepHang,
              MaNV, Ten,
              CAST(SUM(SoTKTinDung) AS SIGNED) AS SoTKTinDung,
              CAST(SUM(SoTKGuiTien) AS SIGNED) AS SoTKGuiTien,
              CAST(SUM(Luong) AS SIGNED) AS ThuNhap
         FROM v_LuongNVKD WHERE Thang BETWEEN ? AND ?
        GROUP BY MaNV, Ten ORDER BY XepHang, MaNV`,
      [from, to],
    )
    return rows
  }, 'Không thể tải xếp hạng thu nhập trong khoảng tháng.')
}

async function getAccountOpeningOptions() {
  return withReadConnection(async (connection) => {
    const [customers] = await connection.execute('SELECT MaKH, Ten, NgayDangKy FROM KhachHang ORDER BY MaKH')
    const [salesStaff] = await connection.execute("SELECT MaNV, Ten FROM NhanVien WHERE ViTri = 'Kinh doanh' ORDER BY MaNV")
    const [counts] = await connection.execute('SELECT MaKH, LoaiTK, COUNT(*) AS SoLuong FROM TaiKhoan GROUP BY MaKH, LoaiTK')
    const [creditMax] = await connection.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(MaTK, 4) AS UNSIGNED)), 0) AS So FROM TaiKhoan WHERE MaTK REGEXP '^TKT[0-9]+$'")
    const [depositMax] = await connection.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(MaTK, 4) AS UNSIGNED)), 0) AS So FROM TaiKhoan WHERE MaTK REGEXP '^TKG[0-9]+$'")
    return {
      customers,
      salesStaff,
      counts,
      nextCreditNumber: Number(creditMax[0].So) + 1,
      nextDepositNumber: Number(depositMax[0].So) + 1,
    }
  }, 'Không thể tải danh sách khách hàng và nhân viên.')
}

async function openAccount(_event, input = {}) {
  const type = input.type
  const accountId = String(input.accountId || '').trim()
  const customerId = String(input.customerId || '').trim()
  const employeeId = String(input.employeeId || '').trim()
  const createdAt = input.createdAt
  const prefix = type === 'credit' ? 'TKT' : type === 'deposit' ? 'TKG' : ''
  if (!prefix) throw new Error('Loại tài khoản không hợp lệ.')
  if (!new RegExp(`^${prefix}\\d{1,9}$`).test(accountId)) throw new Error('Mã tài khoản không đúng định dạng.')
  if (!/^KH\d{3,7}$/.test(customerId) || !/^NV\d{3,7}$/.test(employeeId)) throw new Error('Khách hàng hoặc nhân viên không hợp lệ.')
  if (!validDate(createdAt)) throw new Error('Ngày tạo tài khoản không hợp lệ.')

  const connection = await mysql.createConnection(loadDatabaseConfig())
  try {
    if (type === 'credit') {
      const limit = Number(input.creditLimit)
      if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Hạn mức tín dụng phải là số nguyên dương.')
      await connection.query('CALL sp_MoTaiKhoanTinDung(?, ?, ?, ?, ?)', [accountId, customerId, employeeId, createdAt, limit])
    } else {
      const rate = Number(input.monthlyRate)
      const minimum = Number(input.minimumBalance)
      const initial = Number(input.initialDeposit)
      if (!Number.isFinite(rate) || rate < 0 || rate > 999.99) throw new Error('Lãi suất tháng không hợp lệ.')
      if (!Number.isSafeInteger(minimum) || minimum < 0) throw new Error('Số dư tối thiểu không hợp lệ.')
      if (!Number.isSafeInteger(initial) || initial < minimum) throw new Error('Số tiền gửi lần đầu phải lớn hơn hoặc bằng số dư tối thiểu.')
      await connection.query('CALL sp_MoTaiKhoanGuiTien(?, ?, ?, ?, ?, ?, ?)', [accountId, customerId, employeeId, createdAt, rate.toFixed(2), minimum, initial])
    }
    return { success: true, accountId, customerId, type }
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ER_DUP_ENTRY') throw new Error('Mã tài khoản đã tồn tại. Hãy làm mới mã rồi thử lại.')
    if (error && typeof error === 'object' && ['ER_SIGNAL_EXCEPTION', '1644'].includes(String(error.code || error.errno))) {
      throw new Error(error.sqlMessage || error.message || 'Cơ sở dữ liệu từ chối mở tài khoản.')
    }
    if (error && typeof error === 'object' && ['ER_NO_REFERENCED_ROW_2', 'ER_CHECK_CONSTRAINT_VIOLATED'].includes(error.code)) {
      throw new Error('Khách hàng hoặc nhân viên không hợp lệ, hoặc dữ liệu vi phạm ràng buộc.')
    }
    if (error instanceof Error && !error.code) throw error
    throw new Error('Không thể mở tài khoản. Hãy kiểm tra dữ liệu và kết nối MySQL.')
  } finally {
    await connection.end().catch(() => {})
  }
}

async function getTransactionEntryOptions() {
  return withReadConnection(async (connection) => {
    const [customers] = await connection.execute('SELECT MaKH, Ten FROM KhachHang ORDER BY MaKH')
    const [employees] = await connection.execute('SELECT MaNV, Ten, ViTri FROM NhanVien ORDER BY MaNV')
    const [creditAccounts] = await connection.execute(`SELECT tk.MaTK, tk.MaKH, tk.TrangThai,
      CAST(v.HanMuc AS SIGNED) AS HanMuc, CAST(v.DuNo AS SIGNED) AS DuNo,
      CAST(v.HanMuc - v.DuNo AS SIGNED) AS ConLai
      FROM TaiKhoanTinDung td JOIN TaiKhoan tk ON tk.MaTK=td.MaTK
      JOIN v_DuNoTinDung v ON v.MaTK=td.MaTK ORDER BY tk.MaTK`)
    const [depositAccounts] = await connection.execute(`SELECT tk.MaTK, tk.MaKH, tk.TrangThai,
      CAST(tk.SoDu AS SIGNED) AS SoDu FROM TaiKhoanGuiTien gt
      JOIN TaiKhoan tk ON tk.MaTK=gt.MaTK ORDER BY tk.MaTK`)
    return { customers, employees, creditAccounts, depositAccounts }
  }, 'Không tải được tài khoản và danh sách hỗ trợ giao dịch.')
}

async function recordBankTransaction(_event, input = {}) {
  const kind = input.kind
  const customerId = String(input.customerId || '').trim()
  const employeeId = String(input.employeeId || '').trim()
  const creditId = String(input.creditAccountId || '').trim()
  const amount = Number(input.amount)
  if (!['spending', 'payment'].includes(kind)) throw new Error('Loại giao dịch không hợp lệ.')
  if (!/^KH\d{3,7}$/.test(customerId) || !/^NV\d{3,7}$/.test(employeeId)) throw new Error('Khách hàng hoặc nhân viên không hợp lệ.')
  if (!/^TKT\d{1,9}$/.test(creditId)) throw new Error('Mã tài khoản tín dụng không hợp lệ.')
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Số tiền phải là số nguyên dương.')
  let depositId = null
  if (kind === 'payment') {
    depositId = String(input.depositAccountId || '').trim()
    if (!/^TKG\d{1,9}$/.test(depositId)) throw new Error('Mã tài khoản gửi tiền không hợp lệ.')
  }
  const connection = await mysql.createConnection(loadDatabaseConfig())
  try {
    if (kind === 'spending') await connection.query('CALL sp_ChiTieu(?, ?, ?, ?, ?)', [customerId, employeeId, creditId, amount, null])
    else await connection.query('CALL sp_ThanhToan(?, ?, ?, ?, ?, ?)', [customerId, employeeId, creditId, depositId, amount, null])
    return { success: true, kind, customerId, creditAccountId: creditId, depositAccountId: depositId, amount }
  } catch (error) {
    if (error && typeof error === 'object' && ['ER_SIGNAL_EXCEPTION', '1644'].includes(String(error.code || error.errno))) throw new Error(error.sqlMessage || error.message || 'Cơ sở dữ liệu từ chối giao dịch.')
    if (error && typeof error === 'object' && ['ER_NO_REFERENCED_ROW_2', 'ER_CHECK_CONSTRAINT_VIOLATED'].includes(error.code)) throw new Error('Thông tin tài khoản hoặc giao dịch không thỏa ràng buộc dữ liệu.')
    throw new Error('Không ghi được giao dịch. Hãy kiểm tra trạng thái tài khoản và kết nối MySQL.')
  } finally { await connection.end().catch(() => {}) }
}

async function listEmployees() {
  return withReadConnection(async (connection) => {
    const [rows] = await connection.execute('SELECT MaNV, CMT, Ten, NgaySinh, DiaChi, BacNghe, ThamNien, ViTri FROM NhanVien ORDER BY MaNV')
    return rows
  }, 'Không tải được danh sách nhân viên.')
}

async function saveEmployee(_event, input = {}) {
  const action = input.action
  const id = String(input.MaNV || '').trim()
  if (!['create', 'update', 'delete'].includes(action)) throw new Error('Thao tác nhân viên không hợp lệ.')
  if (!/^NV\d{3,7}$/.test(id)) throw new Error('Mã nhân viên cần có dạng NV và các chữ số.')
  const connection = await mysql.createConnection(loadDatabaseConfig())
  try {
    if (action === 'delete') {
      await connection.execute('DELETE FROM NhanVien WHERE MaNV = ?', [id])
      return { success: true, action, MaNV: id }
    }
    const cmt = String(input.CMT || '').trim()
    const name = String(input.Ten || '').trim()
    const birthDate = input.NgaySinh
    const address = String(input.DiaChi || '').trim()
    const level = Number(input.BacNghe)
    const tenure = Number(input.ThamNien)
    const position = String(input.ViTri || '').trim()
    if (!/^\d{9,12}$/.test(cmt) || !name || name.length > 100 || !address || address.length > 255 || !position || position.length > 50) throw new Error('Vui lòng nhập đủ thông tin; CMT gồm 9–12 chữ số.')
    if (!validDate(birthDate) || !Number.isInteger(level) || level < 1 || level > 255 || !Number.isInteger(tenure) || tenure < 0 || tenure > 255) throw new Error('Ngày sinh, bậc nghề hoặc thâm niên không hợp lệ.')
    if (action === 'create') await connection.execute('INSERT INTO NhanVien (MaNV,CMT,Ten,NgaySinh,DiaChi,BacNghe,ThamNien,ViTri) VALUES (?,?,?,?,?,?,?,?)', [id,cmt,name,birthDate,address,level,tenure,position])
    else await connection.execute('UPDATE NhanVien SET CMT=?,Ten=?,NgaySinh=?,DiaChi=?,BacNghe=?,ThamNien=?,ViTri=? WHERE MaNV=?', [cmt,name,birthDate,address,level,tenure,position,id])
    return { success: true, action, MaNV: id }
  } catch (error) {
    if (error instanceof Error && !error.code) throw error
    if (error && typeof error === 'object' && ['ER_DUP_ENTRY'].includes(error.code)) throw new Error('Mã nhân viên hoặc CMT đã được sử dụng.')
    if (error && typeof error === 'object' && ['ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED'].includes(error.code)) throw new Error('Không thể xóa nhân viên đã tạo tài khoản hoặc hỗ trợ giao dịch.')
    throw new Error('Không lưu được thông tin nhân viên. Hãy kiểm tra lại dữ liệu.')
  } finally { await connection.end().catch(() => {}) }
}

async function getDashboardSummary() {
  return withReadConnection(async (connection) => {
    const [[customers]] = await connection.execute('SELECT COUNT(*) AS total FROM KhachHang')
    const [[accounts]] = await connection.execute("SELECT COUNT(*) AS total FROM TaiKhoan WHERE TrangThai='HoatDong'")
    const [[debt]] = await connection.execute('SELECT CAST(COALESCE(SUM(DuNo),0) AS SIGNED) AS total FROM v_DuNoTinDung')
    const [[transactions]] = await connection.execute('SELECT COUNT(*) AS total FROM GiaoDich WHERE ThoiGian >= DATE_FORMAT(CURRENT_DATE, "%Y-%m-01") AND ThoiGian < DATE_ADD(DATE_FORMAT(CURRENT_DATE, "%Y-%m-01"), INTERVAL 1 MONTH)')
    return { customers: Number(customers.total), activeAccounts: Number(accounts.total), debt: Number(debt.total), monthlyTransactions: Number(transactions.total) }
  }, 'Không tải được số liệu tổng quan.')
}

async function getCustomerGrowth() {
  return withReadConnection(async (connection) => {
    const [daily] = await connection.execute('SELECT NgayDangKy AS Ngay, COUNT(*) AS SoKhachMoi FROM KhachHang GROUP BY NgayDangKy ORDER BY NgayDangKy')
    const [monthly] = await connection.execute(`SELECT t.Thang, t.SoKhachMoi,
      CAST(SUM(t.SoKhachMoi) OVER (ORDER BY t.Thang) AS SIGNED) AS LuyKe,
      t.SoKhachMoi - LAG(t.SoKhachMoi) OVER (ORDER BY t.Thang) AS ChenhLech
      FROM (SELECT DATE_FORMAT(NgayDangKy,'%Y-%m') AS Thang, COUNT(*) AS SoKhachMoi FROM KhachHang GROUP BY DATE_FORMAT(NgayDangKy,'%Y-%m')) t ORDER BY t.Thang`)
    const [yearly] = await connection.execute(`SELECT t.Nam, t.SoKhachMoi,
      CAST(SUM(t.SoKhachMoi) OVER (ORDER BY t.Nam) AS SIGNED) AS LuyKe
      FROM (SELECT YEAR(NgayDangKy) AS Nam, COUNT(*) AS SoKhachMoi FROM KhachHang GROUP BY YEAR(NgayDangKy)) t ORDER BY t.Nam`)
    return { daily, monthly, yearly }
  }, 'Không tải được báo cáo tăng trưởng khách hàng.')
}

async function getCityDistribution() {
  return withReadConnection(async (connection) => {
    const [rows] = await connection.execute(`SELECT ThanhPho, COUNT(*) AS SoKhachHang,
      ROUND(COUNT(*) * 100 / NULLIF((SELECT COUNT(*) FROM KhachHang),0),2) AS TyLe
      FROM KhachHang GROUP BY ThanhPho ORDER BY SoKhachHang DESC, ThanhPho`)
    return rows
  }, 'Không tải được thống kê khách hàng theo thành phố.')
}

async function getLimitAlerts(_event, threshold = 80) {
  const value = Number(threshold)
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('Ngưỡng cảnh báo cần từ 1 đến 100%.')
  return withReadConnection(async (connection) => {
    const [rows] = await connection.execute(`SELECT v.MaTK, v.MaKH, v.TenKH, tk.TrangThai,
      CAST(v.HanMuc AS SIGNED) AS HanMuc, CAST(v.DuNo AS SIGNED) AS DuNo,
      CAST(v.HanMuc-v.DuNo AS SIGNED) AS HanMucConLai,
      ROUND(v.DuNo*100/NULLIF(v.HanMuc,0),1) AS TyLe
      FROM v_DuNoTinDung v JOIN TaiKhoan tk ON tk.MaTK=v.MaTK
      WHERE v.DuNo*100 >= ?*v.HanMuc ORDER BY TyLe DESC,v.MaTK`, [value])
    return rows
  }, 'Không tải được cảnh báo hạn mức.')
}

async function getAccountActivity(_event, months = 6) {
  const value = Number(months)
  if (!Number.isInteger(value) || value < 1 || value > 60) throw new Error('Khoảng không hoạt động cần từ 1 đến 60 tháng.')
  return withReadConnection(async (connection) => {
    const [all] = await connection.execute(`SELECT MaTK, MaKH, TenKH, LoaiTK, TrangThai, NgayTao, SoGiaoDich, HoatDongCuoi,
      TIMESTAMPDIFF(MONTH,HoatDongCuoi,NOW()) AS SoThang
      FROM v_HoatDongTaiKhoan ORDER BY HoatDongCuoi,MaTK`)
    const [eligible] = await connection.execute(`SELECT MaTK, MaKH, TenKH, LoaiTK, TrangThai, NgayTao, SoGiaoDich, HoatDongCuoi,
      TIMESTAMPDIFF(MONTH,HoatDongCuoi,NOW()) AS SoThang
      FROM v_HoatDongTaiKhoan WHERE TrangThai='HoatDong' AND HoatDongCuoi <= DATE_SUB(NOW(), INTERVAL ? MONTH)
      ORDER BY HoatDongCuoi,MaTK`, [value])
    const frozen = all.filter((row) => row.TrangThai === 'DongBang')
    const active = all.filter((row) => row.TrangThai === 'HoatDong')
    return { eligible, frozen, active }
  }, 'Không tải được tình trạng hoạt động tài khoản.')
}

async function changeAccountStatus(_event, input = {}) {
  const id = String(input.accountId || '').trim()
  const action = input.action
  if (!['freeze', 'unfreeze', 'freeze-inactive'].includes(action) || (action !== 'freeze-inactive' && !/^TK[GT]\d{1,9}$/.test(id))) throw new Error('Thông tin đóng băng/mở băng không hợp lệ.')
  const connection = await mysql.createConnection(loadDatabaseConfig())
  try {
    if (action === 'freeze-inactive') {
      const months = Number(input.months)
      if (!Number.isInteger(months) || months < 1 || months > 60) throw new Error('Khoảng không hoạt động cần từ 1 đến 60 tháng.')
      const [sets] = await connection.query('CALL sp_DongBangTaiKhoanKhongHoatDong(?)', [months])
      return { success: true, action, affected: Number(sets?.[0]?.[0]?.SoTaiKhoanBiDongBang ?? 0) }
    }
    await connection.query(action === 'freeze' ? 'CALL sp_DongBangTaiKhoan(?)' : 'CALL sp_MoBangTaiKhoan(?)', [id])
    return { success: true, action, accountId: id }
  } catch (error) {
    if (error instanceof Error && !error.code) throw error
    if (error && typeof error === 'object' && ['ER_SIGNAL_EXCEPTION', '1644'].includes(String(error.code || error.errno))) throw new Error(error.sqlMessage || error.message || 'Cơ sở dữ liệu từ chối thay đổi trạng thái.')
    throw new Error('Không thay đổi được trạng thái tài khoản.')
  } finally { await connection.end().catch(() => {}) }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#eaf5f4',
    title: 'FHBank',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const devUrl = process.env.ELECTRON_START_URL
  if (devUrl) {
    window.loadURL(devUrl)
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('database:check', checkDatabaseConnection)
  ipcMain.handle('customers:search', searchCustomers)
  ipcMain.handle('customers:accounts', getCustomerAccounts)
  ipcMain.handle('accounts:opening-options', getAccountOpeningOptions)
  ipcMain.handle('accounts:open', openAccount)
  ipcMain.handle('transactions:entry-options', getTransactionEntryOptions)
  ipcMain.handle('transactions:record', recordBankTransaction)
  ipcMain.handle('employees:list', listEmployees)
  ipcMain.handle('employees:save', saveEmployee)
  ipcMain.handle('dashboard:summary', getDashboardSummary)
  ipcMain.handle('customers:growth', getCustomerGrowth)
  ipcMain.handle('customers:cities', getCityDistribution)
  ipcMain.handle('accounts:limit-alerts', getLimitAlerts)
  ipcMain.handle('accounts:activity', getAccountActivity)
  ipcMain.handle('accounts:change-status', changeAccountStatus)
  ipcMain.handle('credit-accounts:list', listCreditAccounts)
  ipcMain.handle('deposits:top-customers', listTopDepositCustomers)
  ipcMain.handle('transactions:by-date-range', getTransactionsByDateRange)
  ipcMain.handle('transactions:history', getTransactionHistory)
  ipcMain.handle('reports:spending-debt', getSpendingDebtReport)
  ipcMain.handle('reports:employee-income', getEmployeeIncomeData)
  ipcMain.handle('reports:employee-ranking', getEmployeeRanking)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
