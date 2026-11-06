import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

export default function LimitAlertsPage() {
  const [threshold, setThreshold] = useState(80)
  const [rows, setRows] = useState<LimitAlertRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    if (!window.fhbank) { setError('Mở FHBank bằng Electron để tải cảnh báo.'); setLoading(false); return }
    setLoading(true); setError('')
    window.fhbank.accountAdmin.limitAlerts(threshold).then((data) => { if (!cancelled) setRows(data) }).catch((reason: unknown) => { if (!cancelled) { setRows([]); setError(reason instanceof Error ? reason.message : 'Không tải được cảnh báo.') } }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [threshold, retry])
  const atLimit = rows.filter((row) => Number(row.TyLe) >= 100).length
  return <div className="page-content report-page">
    <div className="page-heading-row"><div><p className="eyebrow">FHBANK · KIỂM SOÁT RỦI RO</p><h1>Cảnh báo hạn mức</h1><p className="page-subtitle">Theo dõi tài khoản tín dụng đã sử dụng đến ngưỡng cảnh báo.</p></div><button className="refresh-button" onClick={() => setRetry((n) => n + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''}/>Làm mới</button></div>
    <section className="glass-card alert-controls"><label><span>Ngưỡng cảnh báo</span><input type="range" min="1" max="100" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))}/><strong>{threshold}% hạn mức đã dùng</strong></label><span className="alert-controls-note">Tỷ lệ được tính từ dư nợ / hạn mức.</span></section>
    {error && <div className="customer-error"><strong>Không tải được cảnh báo</strong><span>{error}</span><button onClick={() => setRetry((n) => n + 1)}>Thử lại</button></div>}
    <section className="report-metrics"><Metric label="Tài khoản được cảnh báo" value={loading ? '—' : String(rows.length)} note={`Đã dùng từ ${threshold}% trở lên`} tone="amber"/><Metric label="Đã chạm hoặc vượt hạn mức" value={loading ? '—' : String(atLimit)} note="Dư nợ bằng hoặc lớn hơn hạn mức" tone="rose"/></section>
    <section className="glass-card alert-table-card"><div className="report-table-heading"><div><span className="income-board-icon"><AlertTriangle size={16}/></span><div><h2>Danh sách cần theo dõi</h2><p>Sắp xếp theo tỷ lệ sử dụng cao nhất.</p></div></div><span className="credit-count">{rows.length} tài khoản</span></div>
      {loading ? <div className="report-empty">Đang tải cảnh báo…</div> : !error && !rows.length ? <div className="report-empty">Không có tài khoản nào đạt ngưỡng {threshold}%.</div> : !error && <div className="report-table-scroll"><table className="report-table"><thead><tr><th>Tài khoản</th><th>Chủ tài khoản</th><th>Trạng thái</th><th>Hạn mức</th><th>Dư nợ</th><th>Còn lại</th><th>Đã dùng</th></tr></thead><tbody>{rows.map((row) => <tr key={row.MaTK}><td><strong>{row.MaTK}</strong><small>{row.MaKH}</small></td><td>{row.TenKH}</td><td><span className={`account-status ${row.TrangThai === 'HoatDong' ? 'active' : 'frozen'}`}>{row.TrangThai === 'HoatDong' ? 'Hoạt động' : 'Đóng băng'}</span></td><td>{money.format(Number(row.HanMuc))} ₫</td><td>{money.format(Number(row.DuNo))} ₫</td><td>{money.format(Number(row.HanMucConLai))} ₫</td><td><div className="alert-progress"><div><i style={{ width: `${Math.min(100, Number(row.TyLe))}%` }}/></div><strong>{Number(row.TyLe).toLocaleString('vi-VN')}%</strong></div></td></tr>)}</tbody></table></div>}
    </section><div className="page-footer"><span>FHBank Management</span><span>Nguồn: v_DuNoTinDung</span></div>
  </div>
}
function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) { return <article className="report-metric glass-card"><span className={`report-metric-icon ${tone}`}><AlertTriangle size={17}/></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article> }
