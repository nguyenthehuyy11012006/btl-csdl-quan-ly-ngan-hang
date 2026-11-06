import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BadgeCheck, Building2, CreditCard, RefreshCw, Wallet } from 'lucide-react'

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dateText = (value: string | Date) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('vi-VN')
}
const dateInput = (value: string | Date) => {
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  return String(value).slice(0, 10)
}

export default function OpenAccountPage() {
  const [options, setOptions] = useState<AccountOpeningOptions | null>(null)
  const [type, setType] = useState<'credit' | 'deposit'>('credit')
  const [customerId, setCustomerId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [createdAt, setCreatedAt] = useState(today())
  const [accountId, setAccountId] = useState('')
  const [creditLimit, setCreditLimit] = useState('50000000')
  const [monthlyRate, setMonthlyRate] = useState('0.5')
  const [minimumBalance, setMinimumBalance] = useState('500000')
  const [initialDeposit, setInitialDeposit] = useState('1000000')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const refresh = async () => {
    if (!window.fhbank) { setError('Hãy mở FHBank bằng ứng dụng desktop để tải dữ liệu.'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const data = await window.fhbank.accounts.openingOptions()
      setOptions(data)
      setCustomerId((current) => data.customers.some((row) => row.MaKH === current) ? current : data.customers[0]?.MaKH ?? '')
      setEmployeeId((current) => data.salesStaff.some((row) => row.MaNV === current) ? current : data.salesStaff[0]?.MaNV ?? '')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh sách khách hàng và nhân viên.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  const nextNumber = type === 'credit' ? options?.nextCreditNumber : options?.nextDepositNumber
  const suggestedId = `${type === 'credit' ? 'TKT' : 'TKG'}${String(nextNumber ?? 1).padStart(3, '0')}`
  useEffect(() => { setAccountId(suggestedId) }, [suggestedId])

  const customer = options?.customers.find((row) => row.MaKH === customerId)
  const customerCounts = useMemo(() => {
    const target = type === 'credit' ? 'TinDung' : 'GuiTien'
    return Number(options?.counts.find((row) => row.MaKH === customerId && row.LoaiTK === target)?.SoLuong ?? 0)
  }, [options, type, customerId])
  const maximum = type === 'credit' ? 2 : 3
  const reachedLimit = customerCounts >= maximum
  const tooEarly = Boolean(customer && createdAt < dateInput(customer.NgayDangKy))

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!options || !customerId || !employeeId) { setError('Cần có khách hàng và nhân viên kinh doanh trước khi mở tài khoản.'); return }
    if (reachedLimit) { setError(`Khách hàng đã đạt giới hạn ${maximum} tài khoản ${type === 'credit' ? 'tín dụng' : 'gửi tiền'}.`); return }
    if (tooEarly) { setError('Ngày mở tài khoản không thể trước ngày đăng ký khách hàng.'); return }
    setSubmitting(true)
    try {
      const input: OpenAccountInput = type === 'credit'
        ? { type, accountId, customerId, employeeId, createdAt, creditLimit: Number(creditLimit) }
        : { type, accountId, customerId, employeeId, createdAt, monthlyRate: Number(monthlyRate), minimumBalance: Number(minimumBalance), initialDeposit: Number(initialDeposit) }
      const result = await window.fhbank!.accounts.open(input)
      setSuccess(`Đã mở tài khoản ${result.accountId} cho khách hàng ${result.customerId}.`)
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không mở được tài khoản.') }
    finally { setSubmitting(false) }
  }

  return <div className="page-content report-page">
    <div className="page-heading-row"><div><p className="eyebrow">FHBANK · QUẢN LÝ TÀI KHOẢN</p><h1>Mở tài khoản</h1><p className="page-subtitle">Tạo tài khoản tín dụng hoặc gửi tiền theo quy trình nghiệp vụ hiện có.</p></div><button className="refresh-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} />Làm mới dữ liệu</button></div>
    {error && <div className="customer-error"><strong>Chưa thể hoàn tất</strong><span>{error}</span></div>}
    {success && <div className="account-success"><BadgeCheck size={18}/><span>{success}</span></div>}
    {loading && !options ? <div className="glass-card account-loading">Đang tải danh sách khách hàng và nhân viên…</div> : <form className="account-opening-layout" onSubmit={(event) => void submit(event)}>
      <section className="glass-card account-form-card">
        <div className="customer-panel-heading"><div><h2>Thông tin tài khoản</h2><p>Chọn loại tài khoản và điền các thông tin mở mới.</p></div><span className="customer-panel-icon"><Building2 size={18}/></span></div>
        <div className="account-type-grid">
          <button type="button" className={`account-type-choice ${type === 'credit' ? 'selected' : ''}`} onClick={() => setType('credit')}><CreditCard size={19}/><span><strong>Tín dụng</strong><small>Hạn mức và dư nợ</small></span></button>
          <button type="button" className={`account-type-choice ${type === 'deposit' ? 'selected' : ''}`} onClick={() => setType('deposit')}><Wallet size={19}/><span><strong>Gửi tiền</strong><small>Số dư và lãi suất</small></span></button>
        </div>
        <div className="account-fields-grid">
          <label className="account-field"><span>Khách hàng</span><select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!options?.customers.length}><option value="">Chọn khách hàng</option>{options?.customers.map((row) => <option key={row.MaKH} value={row.MaKH}>{row.MaKH} · {row.Ten}</option>)}</select></label>
          <label className="account-field"><span>Nhân viên kinh doanh</span><select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!options?.salesStaff.length}><option value="">Chọn nhân viên</option>{options?.salesStaff.map((row) => <option key={row.MaNV} value={row.MaNV}>{row.MaNV} · {row.Ten}</option>)}</select></label>
          <label className="account-field"><span>Mã tài khoản</span><input required value={accountId} onChange={(e) => setAccountId(e.target.value.toUpperCase())} placeholder={suggestedId}/><small>Mã gợi ý tiếp theo: {suggestedId}</small></label>
          <label className="account-field"><span>Ngày mở</span><input required type="date" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)}/>{tooEarly && <small className="field-warning">Ngày mở trước ngày đăng ký khách hàng.</small>}</label>
          {type === 'credit' ? <label className="account-field"><span>Hạn mức tín dụng (₫)</span><input required type="number" min="1" step="1" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)}/></label> : <>
            <label className="account-field"><span>Lãi suất tháng (%)</span><input required type="number" min="0" max="999.99" step="0.01" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)}/></label>
            <label className="account-field"><span>Số dư tối thiểu (₫)</span><input required type="number" min="0" step="1" value={minimumBalance} onChange={(e) => setMinimumBalance(e.target.value)}/></label>
            <label className="account-field"><span>Số tiền gửi lần đầu (₫)</span><input required type="number" min="0" step="1" value={initialDeposit} onChange={(e) => setInitialDeposit(e.target.value)}/></label>
          </>}
        </div>
        <div className="account-submit-row"><span>Thao tác sẽ được xác nhận bởi cơ sở dữ liệu.</span><button className="filter-submit account-submit" type="submit" disabled={submitting || loading || !options || reachedLimit}>{submitting ? 'Đang xử lý…' : `Mở tài khoản ${type === 'credit' ? 'tín dụng' : 'gửi tiền'}`}</button></div>
      </section>
      <aside className="glass-card account-summary-card"><span className="account-summary-icon">{type === 'credit' ? <CreditCard size={20}/> : <Wallet size={20}/>}</span><p className="eyebrow">TÓM TẮT HỒ SƠ</p><h2>{customer?.Ten || 'Chưa chọn khách hàng'}</h2><span className="account-summary-id">{customer?.MaKH || '—'}</span><div className="account-summary-divider"/><dl><div><dt>Ngày đăng ký</dt><dd>{customer ? dateText(customer.NgayDangKy) : '—'}</dd></div><div><dt>Tài khoản cùng loại</dt><dd>{customerCounts} / {maximum}</dd></div><div><dt>Loại tài khoản</dt><dd>{type === 'credit' ? 'Tín dụng' : 'Gửi tiền'}</dd></div><div><dt>Mã tài khoản dự kiến</dt><dd>{accountId || suggestedId}</dd></div>{type === 'credit' ? <div><dt>Hạn mức</dt><dd>{money.format(Number(creditLimit) || 0)} ₫</dd></div> : <div><dt>Tiền gửi ban đầu</dt><dd>{money.format(Number(initialDeposit) || 0)} ₫</dd></div>}</dl>{reachedLimit && <p className="account-limit-alert">Khách hàng đã đạt giới hạn số tài khoản loại này.</p>}<p className="account-summary-note">Stored procedure và các ràng buộc trong MySQL sẽ quyết định kết quả cuối cùng.</p></aside>
    </form>}
    <div className="page-footer"><span>FHBank Management</span><span>Mở tài khoản được xử lý qua stored procedure</span></div>
  </div>
}
