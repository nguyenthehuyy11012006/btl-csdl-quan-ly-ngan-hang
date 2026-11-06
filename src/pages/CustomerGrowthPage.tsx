import { useEffect, useState } from 'react'
import { ChartNoAxesCombined, RefreshCw } from 'lucide-react'

type View = 'day' | 'month' | 'year'
export default function CustomerGrowthPage() {
  const [view, setView] = useState<View>('month')
  const [data, setData] = useState<CustomerGrowthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    if (!window.fhbank) { setError('Mở FHBank bằng Electron để tải báo cáo.'); setLoading(false); return }
    setLoading(true); setError('')
    window.fhbank.customerAnalytics.growth().then((result) => { if (!cancelled) setData(result) }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không tải được báo cáo tăng trưởng.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [retry])
  const rows = view === 'day' ? data?.daily ?? [] : view === 'month' ? data?.monthly ?? [] : data?.yearly ?? []
  const max = Math.max(1, ...rows.map((row) => Number('SoKhachMoi' in row ? row.SoKhachMoi : 0)))
  const total = (data?.daily ?? []).reduce((sum, row) => sum + Number(row.SoKhachMoi), 0)
  const dateLabel = (value: string | Date) => value instanceof Date ? value.toLocaleDateString('vi-VN') : String(value).slice(0, 10)
  return <div className="page-content report-page">
    <div className="page-heading-row"><div><p className="eyebrow">FHBANK · PHÂN TÍCH KHÁCH HÀNG</p><h1>Tăng trưởng khách hàng</h1><p className="page-subtitle">Số hồ sơ đăng ký mới theo ngày, tháng và năm.</p></div><button className="refresh-button" onClick={() => setRetry((n) => n + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''}/>Làm mới</button></div>
    {error && <div className="customer-error"><strong>Không tải được báo cáo</strong><span>{error}</span><button onClick={() => setRetry((n) => n + 1)}>Thử lại</button></div>}
    <section className="report-metrics"><article className="report-metric glass-card"><span className="report-metric-icon teal"><ChartNoAxesCombined size={17}/></span><p>Tổng khách hàng mới</p><strong>{loading ? '—' : total.toLocaleString('vi-VN')}</strong><small>Tổng số hồ sơ theo ngày đăng ký</small></article><article className="report-metric glass-card"><span className="report-metric-icon violet"><ChartNoAxesCombined size={17}/></span><p>Kỳ có đăng ký mới</p><strong>{loading ? '—' : String((data?.monthly ?? []).length)}</strong><small>Các tháng có khách hàng đăng ký</small></article><article className="report-metric glass-card"><span className="report-metric-icon amber"><ChartNoAxesCombined size={17}/></span><p>Kỳ đang xem</p><strong>{rows.length}</strong><small>{view === 'day' ? 'Ngày có đăng ký' : view === 'month' ? 'Tháng có đăng ký' : 'Năm có đăng ký'}</small></article></section>
    <section className="glass-card growth-board"><div className="growth-board-heading"><div><span className="income-board-icon"><ChartNoAxesCombined size={17}/></span><div><h2>Diễn biến đăng ký</h2><p>Chỉ hiển thị các kỳ có khách hàng mới.</p></div></div><div className="report-tabs"><button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Theo ngày</button><button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Theo tháng</button><button className={view === 'year' ? 'active' : ''} onClick={() => setView('year')}>Theo năm</button></div></div>
      {loading ? <div className="report-empty">Đang tải báo cáo…</div> : !rows.length ? <div className="report-empty">Chưa có dữ liệu đăng ký.</div> : <><div className="growth-bars">{rows.map((row) => { const label = 'Ngay' in row ? dateLabel(row.Ngay) : 'Thang' in row ? row.Thang : String(row.Nam); const count = Number(row.SoKhachMoi); const cum = 'LuyKe' in row ? Number(row.LuyKe) : null; return <div className="growth-bar-row" key={label}><span>{label}</span><div className="growth-bar-track"><i style={{ width: `${Math.max(2, count / max * 100)}%` }}/></div><strong>{count}</strong>{cum !== null && <small>Tích lũy {cum}{'ChenhLech' in row && row.ChenhLech != null ? ` · ${Number(row.ChenhLech) > 0 ? '+' : ''}${row.ChenhLech} so với kỳ trước` : ''}</small>}</div> })}</div><div className="report-table-scroll"><table className="report-table"><thead><tr><th>{view === 'day' ? 'Ngày' : view === 'month' ? 'Tháng' : 'Năm'}</th><th>Khách hàng mới</th>{view !== 'day' && <th>Tích lũy</th>}{view === 'month' && <th>Chênh lệch</th>}</tr></thead><tbody>{rows.map((row) => <tr key={'Ngay' in row ? dateLabel(row.Ngay) : 'Thang' in row ? row.Thang : String(row.Nam)}><td>{'Ngay' in row ? dateLabel(row.Ngay) : 'Thang' in row ? row.Thang : row.Nam}</td><td>{row.SoKhachMoi}</td>{'LuyKe' in row && <td>{row.LuyKe}</td>}{'ChenhLech' in row && <td>{row.ChenhLech ?? '—'}</td>}</tr>)}</tbody></table></div></>}
    </section><div className="page-footer"><span>FHBank Management</span><span>Khách hàng được nhóm theo NgayDangKy</span></div>
  </div>
}
