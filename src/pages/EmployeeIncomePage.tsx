import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Banknote, CalendarDays, CreditCard, RefreshCw, Wallet } from 'lucide-react'

const currency = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (value: number | string) => `${currency.format(Number(value) || 0)} ₫`

export default function EmployeeIncomePage() {
  const [rows, setRows] = useState<EmployeeIncomeRecord[]>([])
  const [month, setMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    if (!window.fhbank) {
      setError('Hãy mở FHBank bằng Electron để tải báo cáo.')
      setLoading(false)
      return () => { cancelled = true }
    }
    window.fhbank.reports.employeeIncome()
      .then((data) => {
        if (!cancelled) {
          setRows(data)
          setMonth((current) => data.some((row) => row.Thang === current) ? current : data[0]?.Thang ?? '')
        }
      })
      .catch((reason: unknown) => { if (!cancelled) { setRows([]); setError(reason instanceof Error ? reason.message : 'Không tải được báo cáo thu nhập nhân viên.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [retry])

  const months = useMemo(() => [...new Set(rows.map((row) => row.Thang))], [rows])
  const monthRows = rows.filter((row) => row.Thang === month).sort((a, b) => Number(b.Luong) - Number(a.Luong))
  const total = monthRows.reduce((sum, row) => sum + Number(row.Luong), 0)
  const creditCount = monthRows.reduce((sum, row) => sum + Number(row.SoTKTinDung), 0)
  const depositCount = monthRows.reduce((sum, row) => sum + Number(row.SoTKGuiTien), 0)
  const maxIncome = Number(monthRows[0]?.Luong ?? 0)

  return (
    <div className="page-content report-page">
      <div className="page-heading-row"><div><p className="eyebrow">FHBANK · THU NHẬP KINH DOANH</p><h1>Thu nhập nhân viên</h1><p className="page-subtitle">Hoa hồng mở tài khoản theo tháng, tính từ view v_LuongNVKD.</p></div><button className="refresh-button" onClick={() => setRetry((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} />Làm mới</button></div>
      <section className="report-filter glass-card"><div className="report-filter-title"><CalendarDays size={17} /><div><strong>Kỳ lương</strong><span>Chọn tháng muốn xem</span></div></div><label className="income-month-select"><span>Tháng</span><select value={month} onChange={(event) => setMonth(event.target.value)} disabled={months.length === 0}><option value="" disabled>Chọn tháng</option>{months.map((value) => <option value={value} key={value}>{value}</option>)}</select></label></section>
      {error && <div className="report-error">{error}<button onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
      <section className="report-metrics"><ReportMetric label="Tổng thu nhập" value={loading ? '—' : money(total)} hint={month || 'Tháng đã chọn'} icon={Banknote} tone="teal" /><ReportMetric label="Tài khoản tín dụng mở" value={loading ? '—' : String(creditCount)} hint="500.000 ₫ mỗi tài khoản" icon={CreditCard} tone="violet" /><ReportMetric label="Tài khoản gửi tiền mở" value={loading ? '—' : String(depositCount)} hint="2% số tiền gửi lần đầu" icon={Wallet} tone="amber" /></section>
      <section className="income-board glass-card"><div className="income-board-heading"><div><span className="income-board-icon"><BriefcaseBusiness size={17} /></span><div><h2>Hoa hồng theo nhân viên</h2><p>{month ? `Kỳ ${month}` : 'Chọn một kỳ lương'}</p></div></div><span className="credit-count">{monthRows.length} nhân viên kinh doanh</span></div>
        {loading ? <div className="report-empty">Đang tải bảng lương…</div> : !error && monthRows.length === 0 ? <div className="report-empty">Không có dữ liệu thu nhập trong kỳ này.</div> : !error && <div className="income-list">{monthRows.map((row, index) => { const percent = maxIncome ? Number(row.Luong) / maxIncome * 100 : 0; return <article className="income-row" key={row.MaNV}><span className={`income-rank ${index < 3 ? `top-${index + 1}` : ''}`}>{String(index + 1).padStart(2, '0')}</span><div className="income-employee"><span className="income-avatar">{row.Ten.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('')}</span><span><strong>{row.Ten}</strong><small>{row.MaNV}</small></span></div><div className="income-breakdown"><span><CreditCard size={12} />{row.SoTKTinDung} tín dụng</span><span><Wallet size={12} />{row.SoTKGuiTien} tiền gửi</span></div><div className="income-progress"><div><i style={{ width: `${percent}%` }} /></div><span>{percent.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}% mức cao nhất</span></div><strong className="income-amount">{money(row.Luong)}</strong></article>})}</div>}
        <div className="income-formula"><strong>Cách tính</strong><span>500.000 ₫ × số tài khoản tín dụng</span><span>+ 2% × tiền gửi lần đầu</span></div>
      </section>
      <div className="page-footer"><span>© 2026 FHBank Management</span><span>Nguồn dữ liệu: v_LuongNVKD</span></div>
    </div>
  )
}

function ReportMetric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof Banknote; tone: string }) {
  return <article className="report-metric glass-card"><span className={`report-metric-icon ${tone}`}><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{hint}</small></article>
}
