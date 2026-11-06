import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet } from 'lucide-react'

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

export default function TransactionEntryPage({ kind }: { kind: 'spending' | 'payment' }) {
  const [data, setData] = useState<TransactionEntryOptions | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [creditAccountId, setCreditAccountId] = useState('')
  const [depositAccountId, setDepositAccountId] = useState('')
  const [amount, setAmount] = useState('100000')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    if (!window.fhbank) { setError('Hãy mở FHBank bằng ứng dụng desktop để tải dữ liệu.'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const result = await window.fhbank.transactions.entryOptions()
      setData(result)
      setCustomerId((current) => result.customers.some((row) => row.MaKH === current) ? current : result.customers[0]?.MaKH ?? '')
      setEmployeeId((current) => result.employees.some((row) => row.MaNV === current) ? current : result.employees[0]?.MaNV ?? '')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh sách giao dịch.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const customer = data?.customers.find((row) => row.MaKH === customerId)
  const creditAccounts = useMemo(() => (data?.creditAccounts ?? []).filter((row) => row.TrangThai === 'HoatDong' && (kind === 'payment' || row.MaKH === customerId)), [data, customerId, kind])
  const depositAccounts = useMemo(() => (data?.depositAccounts ?? []).filter((row) => row.TrangThai === 'HoatDong' && row.MaKH === customerId), [data, customerId])
  useEffect(() => { setCreditAccountId((current) => creditAccounts.some((row) => row.MaTK === current) ? current : creditAccounts[0]?.MaTK ?? '') }, [creditAccounts])
  useEffect(() => { setDepositAccountId((current) => depositAccounts.some((row) => row.MaTK === current) ? current : depositAccounts[0]?.MaTK ?? '') }, [depositAccounts])

  const selectedCredit = creditAccounts.find((row) => row.MaTK === creditAccountId)
  const selectedDeposit = depositAccounts.find((row) => row.MaTK === depositAccountId)
  const value = Number(amount)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('')
    if (!selectedCredit || (kind === 'payment' && !selectedDeposit)) { setError('Không có đủ tài khoản đang hoạt động để thực hiện giao dịch.'); return }
    if (!Number.isSafeInteger(value) || value <= 0) { setError('Số tiền phải là số nguyên dương.'); return }
    if (kind === 'spending' && value > Number(selectedCredit.ConLai)) { setError('Số tiền vượt hạn mức còn lại của tài khoản tín dụng.'); return }
    if (kind === 'payment' && value > Number(selectedDeposit?.SoDu)) { setError('Số tiền vượt số dư tài khoản gửi tiền.'); return }
    setSaving(true)
    try {
      const result = await window.fhbank!.transactions.record({ kind, customerId, employeeId, creditAccountId, amount: value, ...(kind === 'payment' ? { depositAccountId } : {}) })
      setNotice(kind === 'spending' ? `Đã ghi chi tiêu ${money.format(result.amount)} ₫ lên ${result.creditAccountId}.` : `Đã ghi thanh toán ${money.format(result.amount)} ₫ từ ${result.depositAccountId} vào ${result.creditAccountId}.`)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không ghi được giao dịch.') }
    finally { setSaving(false) }
  }

  const spending = kind === 'spending'
  const Icon = spending ? ArrowUpRight : ArrowDownLeft
  return <div className="page-content report-page">
    <div className="page-heading-row"><div><p className="eyebrow">FHBANK · GIAO DỊCH</p><h1>{spending ? 'Ghi chi tiêu' : 'Thanh toán tín dụng'}</h1><p className="page-subtitle">{spending ? 'Ghi khoản chi lên tài khoản tín dụng của khách hàng.' : 'Thanh toán dư nợ bằng tài khoản gửi tiền của khách hàng.'}</p></div><button className="refresh-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''}/>Làm mới dữ liệu</button></div>
    {error && <div className="customer-error"><strong>Chưa thể hoàn tất</strong><span>{error}</span></div>}
    {notice && <div className="account-success"><Icon size={18}/><span>{notice}</span></div>}
    <form className="transaction-entry-layout" onSubmit={(event) => void submit(event)}>
      <section className="glass-card account-form-card"><div className="customer-panel-heading"><div><h2>Thông tin giao dịch</h2><p>Kiểm tra chủ tài khoản, số dư và hạn mức trước khi ghi.</p></div><span className="customer-panel-icon"><Icon size={18}/></span></div>
        <div className="account-fields-grid transaction-fields">
          <label className="account-field"><span>{spending ? 'Khách hàng' : 'Người thanh toán'}</span><select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{data?.customers.map((row) => <option key={row.MaKH} value={row.MaKH}>{row.MaKH} · {row.Ten}</option>)}</select></label>
          <label className="account-field"><span>Nhân viên hỗ trợ</span><select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{data?.employees.map((row) => <option key={row.MaNV} value={row.MaNV}>{row.MaNV} · {row.Ten} ({row.ViTri})</option>)}</select></label>
          <label className="account-field"><span>{spending ? 'Tài khoản tín dụng của khách hàng' : 'Tài khoản tín dụng được thanh toán'}</span><select required value={creditAccountId} onChange={(e) => setCreditAccountId(e.target.value)}><option value="">Chọn tài khoản tín dụng</option>{creditAccounts.map((row) => <option key={row.MaTK} value={row.MaTK}>{row.MaTK} · chủ {row.MaKH} · dư nợ {money.format(Number(row.DuNo))} ₫</option>)}</select></label>
          {kind === 'payment' && <label className="account-field"><span>Tài khoản gửi tiền trích tiền</span><select required value={depositAccountId} onChange={(e) => setDepositAccountId(e.target.value)}><option value="">Chọn tài khoản gửi tiền</option>{depositAccounts.map((row) => <option key={row.MaTK} value={row.MaTK}>{row.MaTK} · số dư {money.format(Number(row.SoDu))} ₫</option>)}</select></label>}
          <label className="account-field"><span>Số tiền (₫)</span><input required type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}/></label>
        </div>
        <div className="account-submit-row"><span>Giao dịch sẽ được xác minh và ghi bởi stored procedure MySQL.</span><button className="filter-submit account-submit" type="submit" disabled={saving || loading || !data || !selectedCredit || (kind === 'payment' && !selectedDeposit)}>{saving ? 'Đang xử lý…' : spending ? 'Ghi chi tiêu' : 'Ghi thanh toán'}</button></div>
      </section>
      <aside className="glass-card account-summary-card"><span className="account-summary-icon"><Wallet size={20}/></span><p className="eyebrow">KIỂM TRA TRƯỚC KHI GHI</p><h2>{customer?.Ten || 'Chưa chọn khách hàng'}</h2><span className="account-summary-id">{customer?.MaKH || '—'}</span><div className="account-summary-divider"/><dl><div><dt>Tài khoản tín dụng</dt><dd>{selectedCredit?.MaTK ?? '—'}</dd></div><div><dt>Dư nợ hiện tại</dt><dd>{selectedCredit ? `${money.format(Number(selectedCredit.DuNo))} ₫` : '—'}</dd></div><div><dt>{spending ? 'Hạn mức còn lại' : 'Cần thanh toán'}</dt><dd>{selectedCredit ? `${money.format(Number(selectedCredit.ConLai))} ₫` : '—'}</dd></div>{kind === 'payment' && <div><dt>Số dư tài khoản nguồn</dt><dd>{selectedDeposit ? `${money.format(Number(selectedDeposit.SoDu))} ₫` : '—'}</dd></div>}<div><dt>Số tiền giao dịch</dt><dd>{money.format(value || 0)} ₫</dd></div></dl><p className="account-summary-note">{spending ? 'Không thể chi vượt hạn mức còn lại. Tài khoản bị đóng băng sẽ không được chọn.' : 'Chủ tài khoản gửi tiền là người thực hiện thanh toán; cơ sở dữ liệu kiểm tra quyền và số dư.'}</p></aside>
    </form>
    <div className="page-footer"><span>FHBank Management</span><span>Ghi giao dịch thông qua stored procedure</span></div>
  </div>
}
