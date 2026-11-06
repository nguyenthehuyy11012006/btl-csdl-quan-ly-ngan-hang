import { useEffect, useState } from 'react'
import { CalendarDays, Crown, Medal, RefreshCw, Trophy } from 'lucide-react'

const currency = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (value: number | string) => `${currency.format(Number(value) || 0)} ₫`

export default function EmployeeRankingPage() {
  const [months, setMonths] = useState<string[]>([])
  const [mode, setMode] = useState<'month' | 'range'>('month')
  const [month, setMonth] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<EmployeeRankRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!window.fhbank) {
      setError('Hãy mở FHBank bằng Electron để tải báo cáo.')
      setLoading(false)
      return () => { cancelled = true }
    }
    window.fhbank.reports.employeeIncome()
      .then((data) => {
        if (cancelled) return
        const available = [...new Set(data.map((row) => row.Thang))]
        setMonths(available)
        setMonth((current) => available.includes(current) ? current : available[0] ?? '')
        setFrom((current) => available.includes(current) ? current : available.at(-1) ?? '')
        setTo((current) => available.includes(current) ? current : available[0] ?? '')
      })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không tải được danh sách kỳ lương.') })
    return () => { cancelled = true }
  }, [retry])

  useEffect(() => {
    let cancelled = false
    if (!months.length || !window.fhbank) return () => { cancelled = true }
    if (mode === 'range' && (!from || !to || from > to)) return () => { cancelled = true }
    setLoading(true)
    setError('')
    const period: { mode: 'month'; month: string } | { mode: 'range'; from: string; to: string } = mode === 'month' ? { mode, month } : { mode, from, to }
    window.fhbank.reports.employeeRanking(period)
      .then((data) => { if (!cancelled) setRows(data) })
      .catch((reason: unknown) => { if (!cancelled) { setRows([]); setError(reason instanceof Error ? reason.message : 'Không tải được xếp hạng thu nhập.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [mode, month, from, to, months, retry])

  const total = rows.reduce((sum, row) => sum + Number(row.ThuNhap), 0)
  const medalOrder = [rows[1], rows[0], rows[2]].filter(Boolean)
  const rangeInvalid = mode === 'range' && (!from || !to || from > to)

  return (
    <div className="page-content report-page">
      <div className="page-heading-row"><div><p className="eyebrow">FHBANK · HIỆU SUẤT KINH DOANH</p><h1>Xếp hạng nhân viên</h1><p className="page-subtitle">Xếp hạng theo thu nhập; nhân viên bằng thu nhập sẽ đồng hạng.</p></div><button className="refresh-button" onClick={() => setRetry((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} />Làm mới</button></div>
      <section className="ranking-controls glass-card"><div className="report-tabs"><button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Trong một tháng</button><button className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')}>Trong khoảng tháng</button></div>{mode === 'month' ? <label><CalendarDays size={15} /><span>Tháng</span><select value={month} onChange={(event) => setMonth(event.target.value)} disabled={!months.length}>{months.map((value) => <option key={value} value={value}>{value}</option>)}</select></label> : <div className="ranking-range"><label><span>Từ tháng</span><select value={from} onChange={(event) => setFrom(event.target.value)}>{months.slice().reverse().map((value) => <option key={value} value={value}>{value}</option>)}</select></label><span>đến</span><label><span>Đến tháng</span><select value={to} onChange={(event) => setTo(event.target.value)}>{months.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>}</section>
      {error && <div className="report-error">{error}<button onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
      {rangeInvalid && <div className="report-error mismatch">Tháng bắt đầu cần trước hoặc bằng tháng kết thúc.</div>}
      <section className="report-metrics"><ReportMetric label="Nhân viên được xếp hạng" value={loading ? '—' : String(rows.length)} note={mode === 'month' ? month : `${from} — ${to}`} icon={Trophy} tone="amber" /><ReportMetric label="Tổng thu nhập trong bảng" value={loading ? '—' : money(total)} note="Cộng thu nhập của nhân viên" icon={Medal} tone="teal" /><ReportMetric label="Mức thu nhập cao nhất" value={loading ? '—' : money(rows[0]?.ThuNhap ?? 0)} note="Hạng đầu trong kỳ" icon={Crown} tone="violet" /></section>
      <section className="ranking-board glass-card"><div className="income-board-heading"><div><span className="income-board-icon"><Trophy size={17} /></span><div><h2>Bảng xếp hạng</h2><p>{mode === 'month' ? `Kỳ ${month}` : `Từ ${from} đến ${to}`}</p></div></div><span className="credit-count">Thứ hạng đồng hạng được giữ nguyên</span></div>
        {loading ? <div className="report-empty">Đang tính thứ hạng…</div> : !error && rows.length === 0 ? <div className="report-empty">Không có dữ liệu thu nhập trong kỳ đã chọn.</div> : !error && <><div className="ranking-podium">{medalOrder.map((row) => { const rank = Number(row.XepHang); return <article className={`ranking-podium-card place-${rank}`} key={row.MaNV}><span className="podium-medal">{rank === 1 ? <Crown size={16} /> : <Medal size={16} />}<strong>#{rank}</strong></span><span className="ranking-avatar">{row.Ten.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('')}</span><strong>{row.Ten}</strong><small>{row.MaNV}</small><b>{money(row.ThuNhap)}</b></article>})}</div><div className="ranking-table-scroll"><table className="report-table"><thead><tr><th>Hạng</th><th>Nhân viên kinh doanh</th><th>Tài khoản tín dụng</th><th>Tài khoản gửi tiền</th><th>Thu nhập</th><th>Tỉ trọng</th></tr></thead><tbody>{rows.map((row) => <tr key={row.MaNV}><td><span className={`ranking-number ${Number(row.XepHang) <= 3 ? `top-${row.XepHang}` : ''}`}>#{row.XepHang}</span></td><td><strong>{row.Ten}</strong><small>{row.MaNV}</small></td><td>{row.SoTKTinDung}</td><td>{row.SoTKGuiTien}</td><td className="money-cell">{money(row.ThuNhap)}</td><td><span className="rank-share">{total ? (Number(row.ThuNhap) / total * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 0}%</span></td></tr>)}</tbody></table></div></>}
      </section>
      <div className="page-footer"><span>© 2026 FHBank Management</span><span>Nguồn dữ liệu: v_LuongNVKD</span></div>
    </div>
  )
}

function ReportMetric({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof Trophy; tone: string }) {
  return <article className="report-metric glass-card"><span className={`report-metric-icon ${tone}`}><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>
}
