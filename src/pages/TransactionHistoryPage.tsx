import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Filter, History, Search } from 'lucide-react'

const currency = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (value: number | string) => `${currency.format(Number(value) || 0)} ₫`
const dateTime = (value: string | Date) => (value instanceof Date ? value : new Date(value)).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

export default function TransactionHistoryPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kind, setKind] = useState('')
  const [keyword, setKeyword] = useState('')
  const [applied, setApplied] = useState({ from: '', to: '', kind: '', keyword: '' })
  const [rows, setRows] = useState<TransactionHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    if (!window.fhbank) {
      setError('Hãy mở FHBank bằng Electron để truy vấn dữ liệu.')
      setLoading(false)
      return () => { cancelled = true }
    }
    window.fhbank.transactions.history(applied)
      .then((data) => { if (!cancelled) setRows(data) })
      .catch((reason: unknown) => { if (!cancelled) { setRows([]); setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử giao dịch.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [applied, retry])

  const spending = rows.filter((row) => row.LoaiGD === 'ChiTieu').reduce((sum, row) => sum + Number(row.SoTien), 0)
  const payments = rows.filter((row) => row.LoaiGD === 'ThanhToan').reduce((sum, row) => sum + Number(row.SoTien), 0)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApplied({ from, to, kind, keyword: keyword.trim() })
  }

  return (
    <div className="page-content report-page">
      <div className="page-heading-row"><div><p className="eyebrow">FHBANK · TRA CỨU GIAO DỊCH</p><h1>Lịch sử giao dịch</h1><p className="page-subtitle">Xem các khoản chi tiêu và thanh toán đã ghi nhận, mới nhất ở trên.</p></div><span className="history-count"><History size={16} />{loading ? 'Đang tải…' : `${rows.length} giao dịch`}</span></div>
      <form className="history-filter glass-card" onSubmit={submit}><label className="history-search"><Search size={16} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm mã giao dịch, khách hàng, tài khoản…" /></label><label><span>Từ ngày</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><span>Đến ngày</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label><span>Loại giao dịch</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">Tất cả</option><option value="ChiTieu">Chi tiêu</option><option value="ThanhToan">Thanh toán</option></select></label><button className="filter-submit" type="submit" disabled={Boolean((from && !to) || (!from && to) || (from && to && from > to))}><Filter size={15} />Lọc</button></form>
      {error && <div className="report-error">{error}<button onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
      <section className="report-metrics"><ReportMetric label="Số giao dịch" value={loading ? '—' : String(rows.length)} hint="Khớp với bộ lọc" icon={History} tone="violet" /><ReportMetric label="Tổng chi tiêu" value={loading ? '—' : money(spending)} hint="Làm tăng dư nợ" icon={ArrowUpRight} tone="rose" /><ReportMetric label="Tổng thanh toán" value={loading ? '—' : money(payments)} hint="Làm giảm dư nợ" icon={ArrowDownLeft} tone="teal" /></section>
      <section className="report-table-card glass-card"><div className="report-table-heading"><div><h2>Giao dịch đã ghi nhận</h2><p>{from || to ? `${from || '…'} — ${to || '…'}` : 'Tất cả thời gian'}</p></div><span className="credit-count">Tối đa 1.000 kết quả</span></div>
        {loading ? <div className="report-empty">Đang tải lịch sử…</div> : !error && rows.length === 0 ? <div className="report-empty">Không có giao dịch khớp với bộ lọc.</div> : !error && <div className="report-table-scroll"><table className="report-table history-table"><thead><tr><th>Mã GD / Thời gian</th><th>Người thực hiện</th><th>Tài khoản tín dụng</th><th>Chủ tài khoản</th><th>Nguồn tiền</th><th>Nhân viên</th><th>Loại</th><th>Số tiền</th></tr></thead><tbody>{rows.map((row) => { const paidForOther = row.LoaiGD === 'ThanhToan' && row.MaKH !== row.MaChu; return <tr key={String(row.MaGD)}><td><strong>#{row.MaGD}</strong><small>{dateTime(row.ThoiGian)}</small></td><td><strong>{row.TenKH}</strong><small>{row.MaKH}</small></td><td>{row.MaTK_TinDung}</td><td>{row.TenChu}{paidForOther && <span className="paid-for-other">Trả hộ</span>}</td><td>{row.MaTK_GuiTien || '—'}</td><td>{row.TenNV}</td><td><span className={`transaction-kind ${row.LoaiGD === 'ChiTieu' ? 'spend' : 'payment'}`}>{row.LoaiGD === 'ChiTieu' ? 'Chi tiêu' : 'Thanh toán'}</span></td><td className="money-cell">{money(row.SoTien)}</td></tr>})}</tbody></table></div>}
      </section>
      <div className="page-footer"><span>© 2026 FHBank Management</span><span>Nguồn dữ liệu: GiaoDich</span></div>
    </div>
  )
}

function ReportMetric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof History; tone: string }) {
  return <article className="report-metric glass-card"><span className={`report-metric-icon ${tone}`}><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{hint}</small></article>
}
