import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react'

type Tab = 'eligible' | 'frozen' | 'active'
const kinds: Record<string, string> = { TinDung: 'Tín dụng', GuiTien: 'Gửi tiền' }
const fmtDate = (value: string | Date) => value instanceof Date ? value.toLocaleString('vi-VN') : new Date(value).toLocaleString('vi-VN')

export default function AccountFreezePage() {
  const [months, setMonths] = useState(6)
  const [tab, setTab] = useState<Tab>('eligible')
  const [data, setData] = useState<AccountActivityData | null>(null)
  const [selected, setSelected] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const refresh = async () => {
    if (!window.fhbank) { setError('Mở FHBank bằng Electron để tải trạng thái tài khoản.'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const result = await window.fhbank.accountAdmin.activity(months)
      setData(result)
      const rows = tab === 'eligible' ? result.eligible : tab === 'frozen' ? result.frozen : result.active
      setSelected((current) => rows.some((row) => row.MaTK === current) ? current : rows[0]?.MaTK ?? '')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được tình trạng tài khoản.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [months, retry])
  const rows = useMemo(() => tab === 'eligible' ? data?.eligible ?? [] : tab === 'frozen' ? data?.frozen ?? [] : data?.active ?? [], [tab, data])
  const selectedRow = rows.find((row) => row.MaTK === selected)
  const updateStatus = async (action: 'freeze' | 'unfreeze') => {
    if (!selectedRow) return
    setSaving(true); setError(''); setNotice('')
    try {
      await window.fhbank!.accountAdmin.changeStatus({ action, accountId: selectedRow.MaTK })
      setNotice(action === 'freeze' ? `Đã đóng băng tài khoản ${selectedRow.MaTK}.` : `Đã mở băng tài khoản ${selectedRow.MaTK}.`)
      setConfirm(false); setBulkConfirm(false); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thay đổi được trạng thái tài khoản.') }
    finally { setSaving(false) }
  }
  const bulkFreeze = async () => {
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await window.fhbank!.accountAdmin.changeStatus({ action: 'freeze-inactive', months })
      setNotice(`Đã đóng băng ${result.affected ?? 0} tài khoản không hoạt động từ ${months} tháng.`)
      setBulkConfirm(false); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không đóng băng được các tài khoản đủ điều kiện.') }
    finally { setSaving(false) }
  }

  return <div className="page-content report-page">
    <div className="page-heading-row"><div><p className="eyebrow">FHBANK · KIỂM SOÁT TÀI KHOẢN</p><h1>Đóng băng tài khoản</h1><p className="page-subtitle">Theo dõi hoạt động và thay đổi trạng thái qua stored procedure.</p></div><button className="refresh-button" onClick={() => setRetry((n) => n + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''}/>Làm mới</button></div>
    {error && <div className="customer-error"><strong>Chưa thể hoàn tất</strong><span>{error}</span></div>}{notice && <div className="account-success"><ShieldCheck size={17}/><span>{notice}</span></div>}
    <section className="glass-card freeze-controls"><label><span>Không hoạt động từ</span><input type="number" min="1" max="60" value={months} onChange={(e) => setMonths(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}/><span>tháng</span></label><div className="report-tabs"><button className={tab === 'eligible' ? 'active' : ''} onClick={() => { setTab('eligible'); setConfirm(false) }}>Đủ điều kiện ({data?.eligible.length ?? 0})</button><button className={tab === 'frozen' ? 'active' : ''} onClick={() => { setTab('frozen'); setConfirm(false) }}>Đang đóng băng ({data?.frozen.length ?? 0})</button><button className={tab === 'active' ? 'active' : ''} onClick={() => { setTab('active'); setConfirm(false) }}>Tài khoản hoạt động ({data?.active.length ?? 0})</button></div></section>
    <section className="glass-card freeze-board"><div className="report-table-heading"><div><span className="income-board-icon"><ShieldCheck size={17}/></span><div><h2>{tab === 'eligible' ? 'Tài khoản đủ điều kiện đóng băng' : tab === 'frozen' ? 'Tài khoản đang đóng băng' : 'Tất cả tài khoản đang hoạt động'}</h2><p>Hoạt động gần nhất hoặc ngày tạo nếu chưa có giao dịch.</p></div></div>{tab === 'eligible' && rows.length > 0 && <button className="freeze-action danger" onClick={() => setBulkConfirm((v) => !v)} disabled={saving}><ShieldOff size={14}/>Đóng băng đủ điều kiện</button>}</div>
      {bulkConfirm && <div className="freeze-confirm"><strong>Xác nhận đóng băng hàng loạt?</strong><span>Stored procedure sẽ đóng băng tất cả tài khoản đang hoạt động đã không có giao dịch từ {months} tháng. Tài khoản đủ điều kiện: {data?.eligible.length ?? 0}.</span><div><button onClick={() => setBulkConfirm(false)}>Hủy</button><button onClick={() => void bulkFreeze()} disabled={saving}>{saving ? 'Đang xử lý…' : 'Xác nhận đóng băng'}</button></div></div>}
      {loading ? <div className="report-empty">Đang tải hoạt động tài khoản…</div> : !rows.length ? <div className="report-empty">{tab === 'eligible' ? `Không có tài khoản đang hoạt động nào không giao dịch từ ${months} tháng.` : tab === 'frozen' ? 'Hiện không có tài khoản bị đóng băng.' : 'Không có tài khoản đang hoạt động.'}</div> : <div className="freeze-table-scroll"><table className="report-table"><thead><tr><th>Tài khoản</th><th>Chủ tài khoản</th><th>Loại</th><th>Trạng thái</th><th>Số giao dịch</th><th>Hoạt động gần nhất</th><th>Không hoạt động</th></tr></thead><tbody>{rows.map((row) => <tr key={row.MaTK} className={row.MaTK === selected ? 'selected-row' : ''} onClick={() => { setSelected(row.MaTK); setConfirm(false) }}><td><strong>{row.MaTK}</strong></td><td>{row.TenKH}<small>{row.MaKH}</small></td><td>{kinds[row.LoaiTK] || row.LoaiTK}</td><td><span className={`account-status ${row.TrangThai === 'HoatDong' ? 'active' : 'frozen'}`}>{row.TrangThai === 'HoatDong' ? 'Hoạt động' : 'Đóng băng'}</span></td><td>{row.SoGiaoDich}</td><td>{fmtDate(row.HoatDongCuoi)}</td><td>{row.SoThang} tháng</td></tr>)}</tbody></table></div>}
      {!loading && selectedRow && <div className="freeze-manual-actions"><span>Đã chọn <strong>{selectedRow.MaTK}</strong></span><button className={`freeze-action ${tab === 'frozen' ? '' : 'danger'}`} onClick={() => setConfirm((v) => !v)} disabled={saving}>{tab === 'frozen' ? <ShieldCheck size={14}/> : <ShieldOff size={14}/>}{tab === 'frozen' ? 'Mở băng tài khoản' : 'Đóng băng tài khoản'}</button></div>}
      {confirm && selectedRow && <div className="freeze-confirm"><strong>{tab === 'frozen' ? 'Xác nhận mở băng?' : 'Xác nhận đóng băng?'}</strong><span>{selectedRow.MaTK} · {selectedRow.TenKH}. Trạng thái sẽ được cập nhật ngay trong cơ sở dữ liệu.</span><div><button onClick={() => setConfirm(false)}>Hủy</button><button onClick={() => void updateStatus(tab === 'frozen' ? 'unfreeze' : 'freeze')} disabled={saving}>{saving ? 'Đang xử lý…' : 'Xác nhận'}</button></div></div>}
    </section><div className="page-footer"><span>FHBank Management</span><span>Nguồn hoạt động: v_HoatDongTaiKhoan</span></div>
  </div>
}
