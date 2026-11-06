import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BadgeCheck, CalendarDays, CreditCard, RefreshCw, Search, Wallet } from 'lucide-react'

const currency = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (value: number | string) => `${currency.format(Number(value) || 0)} ₫`

function dateLabel(value: string | Date) {
  if (value instanceof Date) return value.toLocaleDateString('vi-VN')
  const [year, month, day] = value.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

export default function CreditAccountsPage() {
  const [accounts, setAccounts] = useState<CreditAccountSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    if (!window.fhbank) {
      setError('Không tìm thấy dịch vụ desktop. Hãy mở FHBank bằng Electron.')
      setLoading(false)
      return () => { cancelled = true }
    }
    window.fhbank.creditAccounts.list()
      .then((rows) => { if (!cancelled) setAccounts(rows) })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setAccounts([])
          setError(reason instanceof Error ? reason.message : 'Không tải được danh sách tài khoản tín dụng.')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [retry])

  const filtered = useMemo(() => accounts.filter((account) => {
    const matchesStatus = statusFilter === 'all' || account.TrangThai === statusFilter
    const text = `${account.MaTK} ${account.MaKH} ${account.TenKH}`.toLocaleLowerCase('vi')
    return matchesStatus && text.includes(search.trim().toLocaleLowerCase('vi'))
  }), [accounts, search, statusFilter])

  const totals = useMemo(() => accounts.reduce((result, account) => ({
    debt: result.debt + Number(account.DuNo),
    limit: result.limit + Number(account.HanMuc),
  }), { debt: 0, limit: 0 }), [accounts])
  const utilization = totals.limit ? Math.round(totals.debt / totals.limit * 1000) / 10 : 0

  return (
    <div className="page-content credit-page">
      <div className="page-heading-row">
        <div><p className="eyebrow">FHBANK · DANH MỤC TÍN DỤNG</p><h1>Tài khoản &amp; dư nợ</h1><p className="page-subtitle">Theo dõi dư nợ, hạn mức và trạng thái của từng tài khoản tín dụng.</p></div>
        <button className="refresh-button" onClick={() => setRetry((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} />Làm mới</button>
      </div>

      <section className="credit-metrics">
        <CreditMetric label="Tài khoản tín dụng" value={loading ? '—' : String(accounts.length)} note="Tổng số tài khoản" icon={CreditCard} tone="violet" />
        <CreditMetric label="Tổng dư nợ" value={loading ? '—' : money(totals.debt)} note="Dư nợ hiện tại" icon={Wallet} tone="teal" />
        <CreditMetric label="Tổng hạn mức" value={loading ? '—' : money(totals.limit)} note="Hạn mức khả dụng" icon={BadgeCheck} tone="amber" />
        <CreditMetric label="Tỉ lệ sử dụng" value={loading ? '—' : `${utilization.toLocaleString('vi-VN')}%`} note="Dư nợ / tổng hạn mức" icon={AlertCircle} tone="rose" />
      </section>

      <section className="credit-table-card glass-card">
        <div className="credit-table-heading"><div><h2>Danh sách tài khoản</h2><p>Dư nợ được tính từ tổng chi tiêu trừ tổng thanh toán.</p></div><span className="credit-count">{loading ? 'Đang tải…' : `${filtered.length} kết quả`}</span></div>
        <div className="credit-toolbar">
          <label className="credit-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã tài khoản, khách hàng…" /></label>
          <label className="credit-filter"><span>Trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tất cả</option><option value="HoatDong">Hoạt động</option><option value="DongBang">Đóng băng</option></select></label>
        </div>

        {error && <div className="credit-error"><AlertCircle size={17} /><div><strong>Không tải được dữ liệu</strong><span>{error}</span></div><button onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
        {loading && <div className="credit-empty">Đang tải tài khoản tín dụng…</div>}
        {!loading && !error && filtered.length === 0 && <div className="credit-empty">Không có tài khoản phù hợp với bộ lọc.</div>}
        {!loading && !error && filtered.length > 0 && (
          <div className="credit-table-scroll"><table className="credit-table"><thead><tr><th>Tài khoản / Khách hàng</th><th>Ngày tạo</th><th>Trạng thái</th><th>Dư nợ</th><th>Hạn mức</th><th>Còn lại</th><th>Mức sử dụng</th></tr></thead><tbody>
            {filtered.map((account) => {
              const percent = Number(account.DaDung) || 0
              const tone = percent >= 80 ? 'high' : percent >= 60 ? 'medium' : 'low'
              return <tr key={account.MaTK}><td><div className="credit-account-name"><span className="credit-row-icon"><CreditCard size={15} /></span><span><strong>{account.MaTK}</strong><small>{account.TenKH} · {account.MaKH}</small></span></div></td><td><span className="credit-date"><CalendarDays size={13} />{dateLabel(account.NgayTao)}</span></td><td><span className={`credit-status ${account.TrangThai === 'DongBang' ? 'frozen' : ''}`}><i />{account.TrangThai === 'DongBang' ? 'Đóng băng' : 'Hoạt động'}</span></td><td className="money-cell">{money(account.DuNo)}</td><td className="money-cell">{money(account.HanMuc)}</td><td className="money-cell">{money(account.HanMucConLai)}</td><td><div className="usage-cell"><div className="usage-label"><strong>{percent.toLocaleString('vi-VN')}%</strong><span>{percent >= 100 ? 'Đạt hạn mức' : percent >= 80 ? 'Gần hạn mức' : 'Trong ngưỡng'}</span></div><div className="usage-track"><span className={tone} style={{ width: `${Math.min(percent, 100)}%` }} /></div></div></td></tr>
            })}
          </tbody></table></div>
        )}
      </section>
      <div className="page-footer"><span>© 2026 FHBank Management</span><span>Nguồn dữ liệu: v_DuNoTinDung</span></div>
    </div>
  )
}

function CreditMetric({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof CreditCard; tone: string }) {
  return <article className="credit-metric glass-card"><span className={`credit-metric-icon ${tone}`}><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>
}
