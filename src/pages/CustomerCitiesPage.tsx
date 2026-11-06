import { useEffect, useMemo, useState } from 'react'
import { Building2, RefreshCw } from 'lucide-react'

export default function CustomerCitiesPage() {
  const [rows, setRows] = useState<CityRecord[]>([])
  const [threshold, setThreshold] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    if (!window.fhbank) { setError('Mở FHBank bằng Electron để tải thống kê.'); setLoading(false); return }
    setLoading(true); setError('')
    window.fhbank.customerAnalytics.cities().then((data) => { if (!cancelled) setRows(data) }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu thành phố.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [retry])
  const highlight = useMemo(() => rows.filter((row) => Number(row.TyLe) >= threshold), [rows, threshold])
  const max = Math.max(1, ...rows.map((row) => Number(row.TyLe)))
  const total = rows.reduce((sum, row) => sum + Number(row.SoKhachHang), 0)
  return <div className="page-content report-page">
    <div className="page-heading-row"><div><p className="eyebrow">FHBANK · PHÂN BỐ KHÁCH HÀNG</p><h1>Theo thành phố</h1><p className="page-subtitle">Tỷ trọng hồ sơ khách hàng trong từng thành phố.</p></div><button className="refresh-button" onClick={() => setRetry((n) => n + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''}/>Làm mới</button></div>
    {error && <div className="customer-error"><strong>Không tải được thống kê</strong><span>{error}</span><button onClick={() => setRetry((n) => n + 1)}>Thử lại</button></div>}
    <section className="glass-card city-controls"><label><span>Ngưỡng tỷ lệ nổi bật</span><input type="range" min="0" max="100" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))}/><strong>{threshold}% khách hàng</strong></label></section>
    <section className="report-metrics"><article className="report-metric glass-card"><span className="report-metric-icon teal"><Building2 size={17}/></span><p>Tổng khách hàng</p><strong>{loading ? '—' : total}</strong><small>Đếm hồ sơ theo thành phố</small></article><article className="report-metric glass-card"><span className="report-metric-icon violet"><Building2 size={17}/></span><p>Số thành phố</p><strong>{loading ? '—' : rows.length}</strong><small>Địa điểm có khách hàng</small></article><article className="report-metric glass-card"><span className="report-metric-icon amber"><Building2 size={17}/></span><p>Đạt ngưỡng</p><strong>{loading ? '—' : highlight.length}</strong><small>Tỷ lệ từ {threshold}% trở lên</small></article></section>
    <section className="glass-card city-board"><div className="growth-board-heading"><div><span className="income-board-icon"><Building2 size={17}/></span><div><h2>Phân bố theo thành phố</h2><p>Tỷ lệ = số khách hàng tại thành phố / tổng khách hàng.</p></div></div><span className="credit-count">{highlight.length} thành phố nổi bật</span></div>
      {loading ? <div className="report-empty">Đang tải thống kê…</div> : !rows.length ? <div className="report-empty">Chưa có dữ liệu khách hàng.</div> : <div className="city-ranking">{rows.map((row, index) => <article className={`city-ranking-row ${Number(row.TyLe) >= threshold ? 'highlight' : ''}`} key={row.ThanhPho}><span className="city-place">{String(index + 1).padStart(2, '0')}</span><div className="city-name"><strong>{row.ThanhPho}</strong><small>{row.SoKhachHang} khách hàng</small></div><div className="city-bar"><div><i style={{ width: `${Number(row.TyLe) / max * 100}%` }}/></div></div><strong className="city-rate">{Number(row.TyLe).toLocaleString('vi-VN')}%</strong></article>)}</div>}
    </section><div className="page-footer"><span>FHBank Management</span><span>Đếm theo KhachHang.ThanhPho</span></div>
  </div>
}
