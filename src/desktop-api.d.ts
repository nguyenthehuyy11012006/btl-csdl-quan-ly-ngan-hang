export {}

declare global {
  interface Window {
    fhbank?: {
      database: {
        check: () => Promise<{
          connected: boolean
          database: string | null
          version: string | null
          message: string
        }>
      }
      customers: {
        search: (term: string) => Promise<CustomerRecord[]>
        accounts: (customerId: string) => Promise<CustomerAccounts>
      }
      accounts: {
        openingOptions: () => Promise<AccountOpeningOptions>
        open: (input: OpenAccountInput) => Promise<{ success: true; accountId: string; customerId: string; type: 'credit' | 'deposit' }>
      }
      creditAccounts: {
        list: () => Promise<CreditAccountSummary[]>
      }
      deposits: {
        topCustomers: () => Promise<TopDepositCustomer[]>
      }
      transactions: {
        entryOptions: () => Promise<TransactionEntryOptions>
        record: (input: TransactionEntryInput) => Promise<{ success: true; kind: 'spending' | 'payment'; customerId: string; creditAccountId: string; depositAccountId: string | null; amount: number }>
        byDateRange: (range: { from: string; to: string }) => Promise<TransactionDateReport>
        history: (filters: { from: string; to: string; kind: string; keyword: string }) => Promise<TransactionHistoryRecord[]>
      }
      reports: {
        spendingDebt: () => Promise<SpendingDebtReport>
        employeeIncome: () => Promise<EmployeeIncomeRecord[]>
        employeeRanking: (period: { mode: 'month'; month: string } | { mode: 'range'; from: string; to: string }) => Promise<EmployeeRankRecord[]>
      }
      employees: {
        list: () => Promise<EmployeeRecord[]>
        save: (input: EmployeeSaveInput) => Promise<{ success: true; action: 'create' | 'update' | 'delete'; MaNV: string }>
      }
      dashboard: { summary: () => Promise<DashboardSummary> }
      customerAnalytics: {
        growth: () => Promise<CustomerGrowthData>
        cities: () => Promise<CityRecord[]>
      }
      accountAdmin: {
        limitAlerts: (threshold: number) => Promise<LimitAlertRecord[]>
        activity: (months: number) => Promise<AccountActivityData>
        changeStatus: (input: { action: 'freeze' | 'unfreeze'; accountId: string } | { action: 'freeze-inactive'; months: number }) => Promise<{ success: true; action: string; accountId?: string; affected?: number }>
      }
    }
  }

  interface CustomerRecord {
    MaKH: string
    Ten: string
    CMT: string
    NgaySinh: string | Date
    DiaChi: string
    ThanhPho: string
    NgayDangKy: string | Date
  }

  interface AccountOpeningOptions {
    customers: Array<{ MaKH: string; Ten: string; NgayDangKy: string | Date }>
    salesStaff: Array<{ MaNV: string; Ten: string }>
    counts: Array<{ MaKH: string; LoaiTK: string; SoLuong: number | string }>
    nextCreditNumber: number
    nextDepositNumber: number
  }

  type OpenAccountInput = {
    type: 'credit'; accountId: string; customerId: string; employeeId: string; createdAt: string; creditLimit: number
  } | {
    type: 'deposit'; accountId: string; customerId: string; employeeId: string; createdAt: string; monthlyRate: number; minimumBalance: number; initialDeposit: number
  }

  interface CustomerAccountRecord {
    MaTK: string
    TrangThai: 'HoatDong' | 'DongBang'
    NgayTao: string | Date
    HanMuc?: number | string
    DuNo?: number | string
    HanMucConLai?: number | string
    SoDu?: number | string
    LaiSuatThang?: number | string
    SoDuToiThieu?: number | string
    SoTienGuiLanDau?: number | string
  }

  interface CustomerAccounts {
    creditAccounts: CustomerAccountRecord[]
    depositAccounts: CustomerAccountRecord[]
  }

  interface CreditAccountSummary {
    MaTK: string
    MaKH: string
    TenKH: string
    TrangThai: 'HoatDong' | 'DongBang'
    NgayTao: string | Date
    HanMuc: number | string
    DuNo: number | string
    HanMucConLai: number | string
    DaDung: number | string
  }

  interface TopDepositCustomer {
    MaKH: string
    CMT: string
    Ten: string
    NgaySinh: string | Date
    DiaChi: string
    SoTKGuiTien: number | string
    TongTienGui: number | string
  }

  interface TransactionDateSummary {
    MaKH: string
    TenKhachHang: string
    MaTK_TinDung: string
    ChuTaiKhoan: string
    SoGiaoDich: number | string
    TongChiTieu: number | string
    TongThanhToan: number | string
    TongTienGiaoDich: number | string
  }

  interface TransactionDateDetail {
    TenKhachHang: string
    MaTK_TinDung: string
    MaGD: number | string
    LoaiGD: 'ChiTieu' | 'ThanhToan'
    SoTien: number | string
    ThoiGian: string | Date
  }

  interface TransactionDateReport {
    summary: TransactionDateSummary[]
    details: TransactionDateDetail[]
  }

  interface TransactionHistoryRecord {
    MaGD: number | string
    ThoiGian: string | Date
    LoaiGD: 'ChiTieu' | 'ThanhToan'
    MaKH: string
    TenKH: string
    MaTK_TinDung: string
    MaChu: string
    TenChu: string
    MaTK_GuiTien: string | null
    MaNV: string
    TenNV: string
    SoTien: number | string
  }

  interface TransactionEntryOptions {
    customers: Array<{ MaKH: string; Ten: string }>
    employees: Array<{ MaNV: string; Ten: string; ViTri: string }>
    creditAccounts: Array<{ MaTK: string; MaKH: string; TrangThai: string; HanMuc: number | string; DuNo: number | string; ConLai: number | string }>
    depositAccounts: Array<{ MaTK: string; MaKH: string; TrangThai: string; SoDu: number | string }>
  }
  type TransactionEntryInput = { kind: 'spending' | 'payment'; customerId: string; employeeId: string; creditAccountId: string; amount: number; depositAccountId?: string }

  interface SpendingDebtReport {
    totals: { ChiTieu: number | string; ThanhToan: number | string }
    debtTotal: number | string
    monthly: Array<{ Thang: string; SoGiaoDich: number | string; ChiTieu: number | string; ThanhToan: number | string }>
    customers: Array<{ MaKH: string; Ten: string; SoGiaoDich: number | string; ChiTieu: number | string; ThanhToan: number | string; DuNo: number | string; HanMuc: number | string }>
  }

  interface EmployeeIncomeRecord {
    Thang: string
    MaNV: string
    Ten: string
    SoTKTinDung: number | string
    SoTKGuiTien: number | string
    Luong: number | string
  }
  interface EmployeeRecord { MaNV: string; CMT: string; Ten: string; NgaySinh: string | Date; DiaChi: string; BacNghe: number | string; ThamNien: number | string; ViTri: string }
  type EmployeeSaveInput = { action: 'delete'; MaNV: string } | { action: 'create' | 'update'; MaNV: string; CMT: string; Ten: string; NgaySinh: string; DiaChi: string; BacNghe: number; ThamNien: number; ViTri: string }
  interface DashboardSummary { customers: number; activeAccounts: number; debt: number; monthlyTransactions: number }
  interface CustomerGrowthData {
    daily: Array<{ Ngay: string | Date; SoKhachMoi: number | string }>
    monthly: Array<{ Thang: string; SoKhachMoi: number | string; LuyKe: number | string; ChenhLech: number | string | null }>
    yearly: Array<{ Nam: number | string; SoKhachMoi: number | string; LuyKe: number | string }>
  }
  interface CityRecord { ThanhPho: string; SoKhachHang: number | string; TyLe: number | string }
  interface LimitAlertRecord { MaTK: string; MaKH: string; TenKH: string; TrangThai: 'HoatDong' | 'DongBang'; HanMuc: number | string; DuNo: number | string; HanMucConLai: number | string; TyLe: number | string }
  interface AccountActivityRecord { MaTK: string; MaKH: string; TenKH: string; LoaiTK: 'TinDung' | 'GuiTien'; TrangThai: 'HoatDong' | 'DongBang'; NgayTao: string | Date; SoGiaoDich: number | string; HoatDongCuoi: string | Date; SoThang: number | string }
  interface AccountActivityData { eligible: AccountActivityRecord[]; frozen: AccountActivityRecord[]; active: AccountActivityRecord[] }

  interface EmployeeRankRecord {
    XepHang: number | string
    MaNV: string
    Ten: string
    SoTKTinDung: number | string
    SoTKGuiTien: number | string
    ThuNhap: number | string
  }
}
