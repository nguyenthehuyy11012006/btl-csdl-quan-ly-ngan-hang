import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ClipboardList, RefreshCw, Search } from 'lucide-react'

const currency = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (value: number | string) => `${currency.format(Number(value) || 0)} ₫`

function dateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export default function TransactionDatePage() {
  const [from, setFrom] = useState('2026-09-01')
  const [to, setTo] = useState('2026-10-15')
  const [applied, setApplied] = useState({ from: '2026-09-01', to: '2026-10-15' })
  const [report, setReport] = useState<TransactionDateReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [view, setView] = useState<'summary' | 'details'>('summary')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    if (!window.fhbank) {
      setError('Hãy mở FHBank bằng Electron để truy vấn dữ liệu.')
      setLoading(false)
      return () => { cancelled = true }
    }
    window.fhbank.transactions.byDateRange(applied)
      .then((data) => { if (!cancelled) setReport(data) })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không tải được giao dịch.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [applied, retry])

  const summary = report?.summary ?? []
  const details = report?.details ?? []
  const totalSpend = summary.reduce((sum, row) => sum + Number(row.TongChiTieu), 0)
  const totalPaid = summary.reduce((sum, row) => sum + Number(row.TongThanhToan), 0)

  return (
    <div className="page-content report-page">
      <div className="page-heading-row"><div><p className="eyebrow">FHBANK · GIAO DỊCH TÍN DỤNG</p><h1>Giao dịch theo ngày</h1><p className="page-subtitle">Tổng hợp giao dịch tín dụng theo khoảng thời gian, bao gồm cả hai ngày đầu và cuối.</p></div><button className="refresh-button" onClick={() => setRetry((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} />Làm mới</button></div>
      <section className="report-filter glass-card"><div className="report-filter-title"><CalendarDays size={17} /><div><strong>Khoảng thời gian</strong><span>Chọn ngày bắt đầu và ngày kết thúc</span></div></div><div className="date-range-controls"><label>Từ ngày<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><span className="date-range-separator">đến</span><label>Đến ngày<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="filter-submit" disabled={!from || !to || from > to} onClick={() => setApplied({ from, to })}><Search size={15} />Áp dụng</button></div></section>
      {error && <div className="report-error">{error}<button onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
      <section className="report-metrics"><ReportMetric label="Số giao dịch" value={loading ? '—' : String(details.length)} hint="Trong khoảng đã chọn" icon={ClipboardList} tone="violet" /><ReportMetric label="Tổng chi tiêu" value={loading ? '—' : money(totalSpend)} hint="Giao dịch chi tiêu" icon={ArrowUpRight} tone="rose" /><ReportMetric label="Tổng thanh toán" value={loading ? '—' : money(totalPaid)} hint="Giao dịch thanh toán" icon={ArrowDownLeft} tone="teal" /></section>
      <section className="report-table-card glass-card"><div className="report-table-heading"><div><h2>Hoạt động trong kỳ</h2><p>{applied.from} — {applied.to}</p></div><div className="report-tabs"><button className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>Theo tài khoản</button><button className={view === 'details' ? 'active' : ''} onClick={() => setView('details')}>Từng giao dịch</button></div></div>
        {loading ? <div className="report-empty">Đang tải giao dịch…</div> : !error && (view === 'summary' ? summary.length === 0 : details.length === 0) ? <div className="report-empty">Không có giao dịch trong khoảng thời gian này.</div> : !error && view === 'summary' ? <div className="report-table-scroll"><table className="report-table"><thead><tr><th>Khách hàng thực hiện</th><th>Tài khoản tín dụng</th><th>Chủ tài khoản</th><th>Số GD</th><th>Chi tiêu</th><th>Thanh toán</th><th>Tổng giao dịch</th></tr></thead><tbody>{summary.map((row, index) => <tr key={`${row.MaKH}-${row.MaTK_TinDung}-${index}`}><td><strong>{row.TenKhachHang}</strong><small>{row.MaKH}</small></td><td>{row.MaTK_TinDung}</td><td>{row.ChuTaiKhoan}</td><td>{row.SoGiaoDich}</td><td className="money-cell">{money(row.TongChiTieu)}</td><td className="money-cell">{money(row.TongThanhToan)}</td><td className="money-cell">{money(row.TongTienGiaoDich)}</td></tr>)}</tbody></table></div> : !error && <div className="report-table-scroll"><table className="report-table"><thead><tr><th>Thời gian</th><th>Khách hàng</th><th>Tài khoản tín dụng</th><th>Loại</th><th>Số tiền</th></tr></thead><tbody>{details.map((row) => <tr key={String(row.MaGD)}><td>{dateTime(row.ThoiGian)}</td><td>{row.TenKhachHang}</td><td>{row.MaTK_TinDung}</td><td><span className={`transaction-kind ${row.LoaiGD === 'ChiTieu' ? 'spend' : 'payment'}`}>{row.LoaiGD === 'ChiTieu' ? 'Chi tiêu' : 'Thanh toán'}</span></td><td className="money-cell">{money(row.SoTien)}</td></tr>)}</tbody></table></div>}
      </section>
      <div className="page-footer"><span>© 2026 FHBank Management</span><span>Nguồn dữ liệu: GiaoDich</span></div>
    </div>
  )
}

function ReportMetric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof ClipboardList; tone: string }) {
  return <article className="report-metric glass-card"><span className={`report-metric-icon ${tone}`}><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{hint}</small></article>
}
