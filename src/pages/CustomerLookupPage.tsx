import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Banknote, CalendarDays, CreditCard, MapPin, Search, UserRound, Users, Wallet } from 'lucide-react'

function formatDate(value: string | Date | undefined) {
  if (!value) return '—'
  if (value instanceof Date) return value.toLocaleDateString('vi-VN')
  const [year, month, day] = value.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function formatMoney(value: number | string | undefined) {
  return `${Number(value ?? 0).toLocaleString('vi-VN')} ₫`
}

function statusLabel(value: CustomerAccountRecord['TrangThai']) {
  return value === 'DongBang' ? 'Đóng băng' : 'Hoạt động'
}

export default function CustomerLookupPage() {
  const [term, setTerm] = useState('')
  const [submittedTerm, setSubmittedTerm] = useState('')
  const [retry, setRetry] = useState(0)
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [accounts, setAccounts] = useState<CustomerAccounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setAccounts(null)
    if (!window.fhbank) {
      setError('Không tìm thấy dịch vụ desktop. Hãy mở FHBank bằng Electron.')
      setLoading(false)
      return () => { cancelled = true }
    }

    window.fhbank.customers.search(submittedTerm)
      .then((rows) => {
        if (cancelled) return
        setCustomers(rows)
        setSelectedId((current) => rows.some((row) => row.MaKH === current) ? current : rows[0]?.MaKH ?? '')
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setCustomers([])
        setSelectedId('')
        setError(reason instanceof Error ? reason.message : 'Không tải được danh sách khách hàng.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [submittedTerm, retry])

  useEffect(() => {
    let cancelled = false
    if (!selectedId || !window.fhbank) {
      setAccounts(null)
      setDetailError('')
      return () => { cancelled = true }
    }
    setDetailLoading(true)
    setDetailError('')
    setAccounts(null)
    window.fhbank.customers.accounts(selectedId)
      .then((result) => { if (!cancelled) setAccounts(result) })
      .catch((reason: unknown) => {
        if (cancelled) return
        setAccounts(null)
        setDetailError(reason instanceof Error ? reason.message : 'Không tải được tài khoản khách hàng.')
      })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedId])

  const selected = customers.find((customer) => customer.MaKH === selectedId)

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedTerm(term.trim())
    setRetry((value) => value + 1)
  }

  return (
    <div className="page-content customer-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">FHBANK · QUẢN LÝ KHÁCH HÀNG</p>
          <h1>Tra cứu khách hàng</h1>
          <p className="page-subtitle">Tìm hồ sơ và xem các tài khoản thuộc về khách hàng.</p>
        </div>
        <div className="customer-total"><Users size={17} /><span>{loading ? 'Đang tải…' : `${customers.length} hồ sơ`}</span></div>
      </div>

      <div className="customer-workspace">
        <section className="customer-list-card glass-card">
          <div className="customer-panel-heading"><div><h2>Danh sách khách hàng</h2><p>Tìm theo mã, tên hoặc số CMT</p></div><span className="customer-panel-icon"><Users size={17} /></span></div>
          <form className="customer-search-form" onSubmit={submitSearch}>
            <Search size={17} />
            <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Nhập thông tin cần tìm…" aria-label="Tìm khách hàng" />
            <button type="submit" aria-label="Tìm kiếm"><Search size={16} /></button>
          </form>
          {error && <div className="customer-error"><strong>Chưa tải được dữ liệu</strong><span>{error}</span><button onClick={() => setRetry((value) => value + 1)}>Thử kết nối lại</button></div>}
          {loading && <div className="customer-list-empty">Đang tải danh sách khách hàng…</div>}
          {!loading && !error && customers.length === 0 && <div className="customer-list-empty">Không tìm thấy khách hàng phù hợp.</div>}
          {!loading && !error && customers.length > 0 && (
            <div className="customer-results">
              {customers.map((customer) => (
                <button key={customer.MaKH} className={`customer-result ${customer.MaKH === selectedId ? 'selected' : ''}`} onClick={() => setSelectedId(customer.MaKH)}>
                  <span className="customer-avatar"><UserRound size={17} /></span>
                  <span className="customer-result-copy"><strong>{customer.Ten}</strong><small>{customer.MaKH} · {customer.CMT}</small></span>
                  <span className="customer-result-city">{customer.ThanhPho}</span>
                </button>
              ))}
            </div>
          )}
          {!loading && !error && customers.length === 100 && <p className="customer-limit-note">Đang hiển thị tối đa 100 kết quả. Hãy nhập thêm từ khóa để thu hẹp tìm kiếm.</p>}
        </section>

        <section className="customer-detail-card glass-card">
          {!selected && !loading && !error && <div className="customer-detail-empty"><span className="customer-detail-icon"><Users size={22} /></span><h2>Chọn một khách hàng</h2><p>Thông tin hồ sơ và tài khoản sẽ hiển thị tại đây.</p></div>}
          {loading && <div className="customer-detail-empty"><span className="customer-detail-icon"><Search size={22} /></span><h2>Đang tìm hồ sơ</h2><p>Vui lòng chờ trong giây lát.</p></div>}
          {error && <div className="customer-detail-empty"><span className="customer-detail-icon"><Users size={22} /></span><h2>Chưa có dữ liệu để hiển thị</h2><p>Kết nối MySQL để xem hồ sơ khách hàng.</p></div>}
          {selected && (
            <>
              <div className="customer-profile-heading"><span className="customer-profile-avatar"><UserRound size={23} /></span><div><p>HỒ SƠ KHÁCH HÀNG</p><h2>{selected.Ten}</h2><span>{selected.MaKH}</span></div><span className="customer-active-badge"><i /> Đang quản lý</span></div>
              <div className="customer-info-grid">
                <div className="customer-info-item"><span><CreditCard size={14} />Số CMT</span><strong>{selected.CMT}</strong></div>
                <div className="customer-info-item"><span><CalendarDays size={14} />Ngày sinh</span><strong>{formatDate(selected.NgaySinh)}</strong></div>
                <div className="customer-info-item"><span><MapPin size={14} />Thành phố</span><strong>{selected.ThanhPho}</strong></div>
                <div className="customer-info-item"><span><CalendarDays size={14} />Ngày đăng ký</span><strong>{formatDate(selected.NgayDangKy)}</strong></div>
                <div className="customer-info-item customer-address"><span><MapPin size={14} />Địa chỉ</span><strong>{selected.DiaChi}</strong></div>
              </div>

              <div className="customer-accounts-heading"><div><h3>Tài khoản</h3><p>Các sản phẩm ngân hàng của khách hàng</p></div>{accounts && <span>{accounts.creditAccounts.length + accounts.depositAccounts.length} tài khoản</span>}</div>
              {detailLoading && <div className="customer-list-empty compact">Đang tải tài khoản…</div>}
              {detailError && <div className="customer-error compact"><span>{detailError}</span></div>}
              {accounts && !detailLoading && (
                <div className="account-sections">
                  <AccountSection title="Tín dụng" icon="credit" empty={accounts.creditAccounts.length === 0} emptyText="Chưa có tài khoản tín dụng." >
                    {accounts.creditAccounts.map((account) => <article className="account-card" key={account.MaTK}><div className="account-card-heading"><span className="account-kind credit"><CreditCard size={15} /></span><div><strong>{account.MaTK}</strong><small>Tài khoản tín dụng</small></div><span className={`account-status ${account.TrangThai === 'DongBang' ? 'frozen' : ''}`}>{statusLabel(account.TrangThai)}</span></div><div className="account-values"><div><span>Dư nợ</span><strong>{formatMoney(account.DuNo)}</strong></div><div><span>Hạn mức</span><strong>{formatMoney(account.HanMuc)}</strong></div><div><span>Còn lại</span><strong>{formatMoney(account.HanMucConLai)}</strong></div></div></article>)}
                  </AccountSection>
                  <AccountSection title="Tiền gửi" icon="deposit" empty={accounts.depositAccounts.length === 0} emptyText="Chưa có tài khoản gửi tiền.">
                    {accounts.depositAccounts.map((account) => <article className="account-card" key={account.MaTK}><div className="account-card-heading"><span className="account-kind deposit"><Banknote size={15} /></span><div><strong>{account.MaTK}</strong><small>Tài khoản gửi tiền</small></div><span className={`account-status ${account.TrangThai === 'DongBang' ? 'frozen' : ''}`}>{statusLabel(account.TrangThai)}</span></div><div className="account-values deposit-values"><div><span>Số dư</span><strong>{formatMoney(account.SoDu)}</strong></div><div><span>Lãi suất tháng</span><strong>{Number(account.LaiSuatThang ?? 0).toLocaleString('vi-VN')}%</strong></div><div><span>Số dư tối thiểu</span><strong>{formatMoney(account.SoDuToiThieu)}</strong></div></div></article>)}
                  </AccountSection>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <div className="page-footer"><span>© 2026 FHBank Management</span><span>Dữ liệu lấy trực tiếp từ MySQL</span></div>
    </div>
  )
}

function AccountSection({ title, icon, children, empty, emptyText }: { title: string; icon: 'credit' | 'deposit'; children: ReactNode; empty: boolean; emptyText: string }) {
  const Icon = icon === 'credit' ? CreditCard : Wallet
  return <section className="account-section"><div className="account-section-heading"><span className={`account-section-icon ${icon}`}><Icon size={15} /></span><h4>{title}</h4></div>{empty ? <p className="account-empty">{emptyText}</p> : <div className="account-card-list">{children}</div>}</section>
}
