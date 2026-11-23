import { useEffect, useState, type FormEvent } from 'react'
import { Banknote, RefreshCw, Wallet } from 'lucide-react'
import ActionErrorDialog from '../components/ActionErrorDialog'

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

export default function DepositEntryPage() {
  const [data, setData] = useState<TransactionEntryOptions | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('100000')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    if (!window.fhbank) { setError('Hãy mở FHBank bằng ứng dụng desktop để tải dữ liệu.'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const result = await window.fhbank.transactions.entryOptions()
      setData(result)
      setCustomerId((v) => result.customers.some((x) => x.MaKH === v) ? v : result.customers[0]?.MaKH ?? '')
      setEmployeeId((v) => result.employees.some((x) => x.MaNV === v) ? v : result.employees[0]?.MaNV ?? '')
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được danh sách tài khoản.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const customer = data?.customers.find((x) => x.MaKH === customerId)
  const accounts = (data?.depositAccounts ?? []).filter((x) => x.TrangThai === 'HoatDong' && x.MaKH === customerId)
  useEffect(() => { setAccountId((v) => accounts.some((x) => x.MaTK === v) ? v : accounts[0]?.MaTK ?? '') }, [customerId, data])
  const selected = accounts.find((x) => x.MaTK === accountId)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('')
    const value = Number(amount)
    if (!selected) { setError('Khách hàng chưa có tài khoản gửi tiền đang hoạt động.'); return }
    if (!Number.isSafeInteger(value) || value <= 0) { setError('Số tiền phải là số nguyên dương.'); return }
    setSaving(true)
    try {
      const result = await window.fhbank!.deposits.record({ customerId, employeeId, accountId, amount: value })
      setNotice(`Đã nộp ${money.format(result.amount)} ₫ vào tài khoản ${result.accountId}.`)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Không ghi được giao dịch gửi tiền.') }
    finally { setSaving(false) }
  }

  return <div className="page-content report-page">
    <div className="page-heading-row"><div><p className="eyebrow">FHBANK · GIAO DỊCH</p><h1>Gửi tiền vào tài khoản</h1><p className="page-subtitle">Nộp thêm tiền vào tài khoản gửi tiền của khách hàng.</p></div><button className="refresh-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/>Làm mới dữ liệu</button></div>
    {error && <div className="customer-error"><strong>Chưa thể hoàn tất</strong><span>{error}</span></div>}
    {notice && <ActionErrorDialog variant="success" message={notice} onClose={() => setNotice('')} />}
    <form className="transaction-entry-layout" onSubmit={(e) => void submit(e)}>
      <section className="glass-card account-form-card"><div className="customer-panel-heading"><div><h2>Thông tin giao dịch</h2><p>Chỉ tài khoản gửi tiền đang hoạt động mới nhận tiền.</p></div><span className="customer-panel-icon"><Banknote size={18}/></span></div>
        <div className="account-fields-grid transaction-fields">
          <label className="account-field"><span>Khách hàng</span><select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{data?.customers.map((x) => <option key={x.MaKH} value={x.MaKH}>{x.MaKH} · {x.Ten}</option>)}</select></label>
          <label className="account-field"><span>Nhân viên hỗ trợ</span><select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{data?.employees.map((x) => <option key={x.MaNV} value={x.MaNV}>{x.MaNV} · {x.Ten} ({x.ViTri})</option>)}</select></label>
          <label className="account-field"><span>Tài khoản gửi tiền nhận tiền</span><select required value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Chọn tài khoản</option>{accounts.map((x) => <option key={x.MaTK} value={x.MaTK}>{x.MaTK} · số dư {money.format(Number(x.SoDu))} ₫</option>)}</select></label>
          <label className="account-field"><span>Số tiền (₫)</span><input required type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}/></label>
        </div>
        <div className="account-submit-row"><span>Số dư được cộng và lưu biên nhận giao dịch trong CSDL.</span><button className="filter-submit account-submit" type="submit" disabled={saving || loading || !selected}>{saving ? 'Đang xử lý…' : 'Xác nhận gửi tiền'}</button></div>
      </section>
      <aside className="glass-card account-summary-card"><span className="account-summary-icon"><Wallet size={20}/></span><p className="eyebrow">XÁC NHẬN NỘP TIỀN</p><h2>{customer?.Ten || 'Chưa chọn khách hàng'}</h2><span className="account-summary-id">{customer?.MaKH || '-'}</span><div className="account-summary-divider"/><dl><div><dt>Tài khoản nhận</dt><dd>{selected?.MaTK ?? '-'}</dd></div><div><dt>Số dư hiện tại</dt><dd>{selected ? `${money.format(Number(selected.SoDu))} ₫` : '-'}</dd></div><div><dt>Số tiền nộp</dt><dd>{money.format(Number(amount) || 0)} ₫</dd></div><div><dt>Số dư sau khi nộp</dt><dd>{selected ? `${money.format(Number(selected.SoDu) + (Number(amount) || 0))} ₫` : '-'}</dd></div></dl><p className="account-summary-note">Tài khoản đóng băng không thể nhận giao dịch. Nhân viên hỗ trợ và chủ tài khoản được ghi nhận cùng biên nhận.</p></aside>
    </form>
    <div className="page-footer"><span>FHBank Management</span><span>Giao dịch gửi tiền có biên nhận riêng</span></div>
  </div>
}
