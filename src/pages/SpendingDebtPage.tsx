import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, BarChart3, RefreshCw, Wallet } from 'lucide-react'

const currency = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (value: number | string) => `${currency.format(Number(value) || 0)} ₫`

export default function SpendingDebtPage() {
  const [report, setReport] = useState<SpendingDebtReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [tab, setTab] = useState<'monthly' | 'customer'>('monthly')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    if (!window.fhbank) {
      setError('Hãy mở FHBank bằng Electron để tải báo cáo.')
      setLoading(false)
      return () => { cancelled = true }
    }
    window.fhbank.reports.spendingDebt()
      .then((data) => { if (!cancelled) setReport(data) })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không tải được báo cáo chi tiêu và dư nợ.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [retry])

  const months = report?.monthly ?? []
  const customers = report?.customers ?? []
  const chartMax = useMemo(() => Math.max(1, ...months.flatMap((row) => [Number(row.ChiTieu), Number(row.ThanhToan)])), [months])
  const mismatch = report && Number(report.totals.ChiTieu) - Number(report.totals.ThanhToan) !== Number(report.debtTotal)

  return (
    <div className="page-content report-page">
      <div className="page-heading-row"><div><p className="eyebrow">FHBANK · PHÂN TÍCH TÍN DỤNG</p><h1>Chi tiêu &amp; dư nợ</h1><p className="page-subtitle">Theo dõi chi tiêu, thanh toán và dư nợ hiện tại trên toàn hệ thống.</p></div><button className="refresh-button" onClick={() => setRetry((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} />Làm mới</button></div>
      {error && <div className="report-error">{error}<button onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
      {mismatch && <div className="report-error mismatch">Tổng chi tiêu trừ tổng thanh toán chưa khớp với tổng dư nợ. Hãy kiểm tra dữ liệu giao dịch.</div>}
      <section className="report-metrics"><ReportMetric label="Tổng chi tiêu" value={loading ? '—' : money(report?.totals.ChiTieu ?? 0)} hint="Tăng dư nợ tín dụng" icon={ArrowUpRight} tone="rose" /><ReportMetric label="Tổng thanh toán" value={loading ? '—' : money(report?.totals.ThanhToan ?? 0)} hint="Giảm dư nợ tín dụng" icon={ArrowDownLeft} tone="teal" /><ReportMetric label="Dư nợ hiện tại" value={loading ? '—' : money(report?.debtTotal ?? 0)} hint="Tổng từ các tài khoản tín dụng" icon={Wallet} tone="violet" /></section>
      <section className="spending-report-card glass-card"><div className="spending-report-heading"><div><span className="spending-chart-icon"><BarChart3 size={17} /></span><div><h2>Hoạt động tín dụng</h2><p>Phân tích theo tháng hoặc theo khách hàng</p></div></div><div className="report-tabs"><button className={tab === 'monthly' ? 'active' : ''} onClick={() => setTab('monthly')}>Theo tháng</button><button className={tab === 'customer' ? 'active' : ''} onClick={() => setTab('customer')}>Theo khách hàng</button></div></div>
        {loading ? <div className="report-empty">Đang tổng hợp dữ liệu…</div> : tab === 'monthly' ? months.length === 0 ? <div className="report-empty">Chưa có giao dịch nào để thống kê.</div> : <div className="monthly-report-list">{months.map((row) => <div className="monthly-report-row" key={row.Thang}><div className="monthly-report-date"><strong>{row.Thang}</strong><small>{row.SoGiaoDich} giao dịch</small></div><div className="monthly-report-bars"><div className="monthly-bar-line"><span>Chi tiêu</span><div><i className="spend" style={{ width: `${Number(row.ChiTieu) / chartMax * 100}%` }} /></div><strong>{money(row.ChiTieu)}</strong></div><div className="monthly-bar-line"><span>Thanh toán</span><div><i className="payment" style={{ width: `${Number(row.ThanhToan) / chartMax * 100}%` }} /></div><strong>{money(row.ThanhToan)}</strong></div></div></div>)}</div> : <div className="report-table-scroll"><table className="report-table"><thead><tr><th>Khách hàng</th><th>Số GD đã thực hiện</th><th>Tổng chi tiêu*</th><th>Tổng thanh toán*</th><th>Dư nợ trên TK sở hữu</th><th>Hạn mức</th></tr></thead><tbody>{customers.map((row) => <tr key={row.MaKH}><td><strong>{row.Ten}</strong><small>{row.MaKH}</small></td><td>{row.SoGiaoDich}</td><td className="money-cell">{money(row.ChiTieu)}</td><td className="money-cell">{money(row.ThanhToan)}</td><td className="money-cell">{money(row.DuNo)}</td><td className="money-cell">{money(row.HanMuc)}</td></tr>)}</tbody></table><p className="report-footnote">* Chi tiêu và thanh toán tính theo người thực hiện giao dịch. Dư nợ và hạn mức tính theo tài khoản do chính khách hàng sở hữu; thanh toán hộ có thể khiến các tổng này khác nhau.</p></div>}
      </section>
      <div className="page-footer"><span>© 2026 FHBank Management</span><span>Nguồn dữ liệu: GiaoDich, v_DuNoTinDung</span></div>
    </div>
  )
}

function ReportMetric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof Wallet; tone: string }) {
  return <article className="report-metric glass-card"><span className={`report-metric-icon ${tone}`}><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{hint}</small></article>
}
