import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BriefcaseBusiness, Plus, RefreshCw, Save, Trash2, UserRound } from 'lucide-react'

const positions = ['Kinh doanh', 'Giao dịch viên', 'Kế toán', 'Quản lý chi nhánh']
const dateValue = (value: string | Date) => {
  if (typeof value === 'string') return value.slice(0, 10)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

const blank = (): EmployeeRecord => ({ MaNV: '', CMT: '', Ten: '', NgaySinh: '1995-01-01', DiaChi: '', BacNghe: 1, ThamNien: 0, ViTri: positions[0] })

export default function EmployeesPage() {
  const [rows, setRows] = useState<EmployeeRecord[]>([])
  const [form, setForm] = useState<EmployeeRecord>(blank())
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('Tất cả')
  const [query, setQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async (keep = true) => {
    if (!window.fhbank) { setError('Hãy mở FHBank bằng ứng dụng desktop để tải dữ liệu.'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const data = await window.fhbank.employees.list()
      setRows(data)
      setForm((current) => keep ? data.find((row) => row.MaNV === current.MaNV) ?? (data[0] ?? blank()) : data[0] ?? blank())
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh sách nhân viên.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load(false) }, [])

  const availablePositions = useMemo(() => [...new Set([...positions, ...rows.map((row) => row.ViTri)])], [rows])
  const shown = rows.filter((row) => (filter === 'Tất cả' || row.ViTri === filter) && `${row.MaNV} ${row.Ten} ${row.CMT}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')))
  const nextId = `NV${String(Math.max(0, ...rows.map((row) => Number(row.MaNV.slice(2)) || 0)) + 1).padStart(3, '0')}`
  const update = (key: keyof EmployeeRecord, value: string | number) => setForm((current) => ({ ...current, [key]: value }))

  const beginCreate = () => { setCreating(true); setConfirmDelete(false); setForm({ ...blank(), MaNV: nextId }); setError(''); setNotice('') }
  const select = (row: EmployeeRecord) => { setCreating(false); setConfirmDelete(false); setForm({ ...row, NgaySinh: dateValue(row.NgaySinh) }); setError(''); setNotice('') }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('')
    setSaving(true)
    try {
      await window.fhbank!.employees.save({ action: creating ? 'create' : 'update', ...form, NgaySinh: dateValue(form.NgaySinh), BacNghe: Number(form.BacNghe), ThamNien: Number(form.ThamNien) })
      setNotice(creating ? `Đã thêm nhân viên ${form.MaNV}.` : `Đã cập nhật nhân viên ${form.MaNV}.`)
      setCreating(false)
      await load(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được nhân viên.') }
    finally { setSaving(false) }
  }

  async function remove() {
    setError(''); setNotice(''); setSaving(true)
    try {
      await window.fhbank!.employees.save({ action: 'delete', MaNV: form.MaNV })
      setNotice(`Đã xóa nhân viên ${form.MaNV}.`); setConfirmDelete(false); await load(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xóa được nhân viên.') }
    finally { setSaving(false) }
  }

  return <div className="page-content report-page">
    <div className="page-heading-row"><div><p className="eyebrow">FHBANK · QUẢN TRỊ NHÂN SỰ</p><h1>Quản lý nhân viên</h1><p className="page-subtitle">Tra cứu hồ sơ, thêm mới và cập nhật nhân viên ngân hàng.</p></div><button className="refresh-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''}/>Làm mới</button></div>
    {error && <div className="customer-error"><strong>Chưa thể hoàn tất</strong><span>{error}</span></div>}{notice && <div className="account-success"><UserRound size={17}/><span>{notice}</span></div>}
    <div className="employee-workspace">
      <section className="glass-card employee-list-card"><div className="customer-panel-heading"><div><h2>Danh sách nhân viên</h2><p>{rows.length} hồ sơ trong cơ sở dữ liệu</p></div><span className="customer-panel-icon"><BriefcaseBusiness size={17}/></span></div>
        <div className="employee-list-controls"><input placeholder="Tìm mã, tên hoặc CMT…" value={query} onChange={(e) => setQuery(e.target.value)}/><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>Tất cả</option>{availablePositions.map((position) => <option key={position}>{position}</option>)}</select></div>
        <div className="employee-list">{loading ? <div className="customer-list-empty">Đang tải nhân viên…</div> : shown.map((row) => <button key={row.MaNV} className={`employee-list-row ${!creating && form.MaNV === row.MaNV ? 'selected' : ''}`} onClick={() => select(row)}><span className="customer-avatar"><UserRound size={16}/></span><span className="customer-result-copy"><strong>{row.Ten}</strong><small>{row.MaNV} · {row.ViTri}</small></span></button>)}</div>
        <button className="employee-add-button" onClick={beginCreate}><Plus size={15}/>Thêm nhân viên</button>
      </section>
      <section className="glass-card employee-edit-card"><div className="customer-panel-heading"><div><h2>{creating ? 'Thêm nhân viên' : `Hồ sơ ${form.MaNV || ''}`}</h2><p>{creating ? 'Nhập thông tin hồ sơ nhân viên mới.' : 'Chỉnh sửa thông tin nhân viên đã chọn.'}</p></div><span className="customer-panel-icon"><UserRound size={17}/></span></div>
        {!creating && !form.MaNV ? <div className="customer-detail-empty"><h2>Chọn hồ sơ nhân viên</h2><p>Chọn một người trong danh sách hoặc thêm hồ sơ mới.</p></div> : <form onSubmit={(event) => void submit(event)}>
          <div className="account-fields-grid employee-fields">
            <label className="account-field"><span>Mã nhân viên</span><input required value={form.MaNV} onChange={(e) => update('MaNV', e.target.value.toUpperCase())} disabled={!creating}/></label>
            <label className="account-field"><span>Số CMT/CCCD</span><input required maxLength={12} value={form.CMT} onChange={(e) => update('CMT', e.target.value)}/></label>
            <label className="account-field"><span>Họ và tên</span><input required maxLength={100} value={form.Ten} onChange={(e) => update('Ten', e.target.value)}/></label>
            <label className="account-field"><span>Ngày sinh</span><input required type="date" value={dateValue(form.NgaySinh)} onChange={(e) => update('NgaySinh', e.target.value)}/></label>
            <label className="account-field employee-wide"><span>Địa chỉ</span><input required maxLength={255} value={form.DiaChi} onChange={(e) => update('DiaChi', e.target.value)}/></label>
            <label className="account-field"><span>Bậc nghề</span><input required type="number" min="1" max="255" value={Number(form.BacNghe)} onChange={(e) => update('BacNghe', Number(e.target.value))}/></label>
            <label className="account-field"><span>Thâm niên (năm)</span><input required type="number" min="0" max="255" value={Number(form.ThamNien)} onChange={(e) => update('ThamNien', Number(e.target.value))}/></label>
            <label className="account-field"><span>Vị trí công việc</span><select value={form.ViTri} onChange={(e) => update('ViTri', e.target.value)}>{availablePositions.map((position) => <option key={position}>{position}</option>)}</select></label>
          </div>
          <div className="employee-form-actions"><button className="filter-submit account-submit" type="submit" disabled={saving || loading}><Save size={14}/>{saving ? 'Đang lưu…' : creating ? 'Thêm hồ sơ' : 'Lưu thay đổi'}</button>{!creating && form.MaNV && <button type="button" className="employee-delete-button" onClick={() => setConfirmDelete((value) => !value)}><Trash2 size={14}/>Xóa nhân viên</button>}</div>
          {confirmDelete && <div className="employee-delete-confirm"><strong>Xóa {form.MaNV}?</strong><span>Chỉ xóa được nếu nhân viên chưa tạo tài khoản và chưa hỗ trợ giao dịch.</span><div><button type="button" onClick={() => setConfirmDelete(false)}>Hủy</button><button type="button" disabled={saving} onClick={() => void remove()}>Xác nhận xóa</button></div></div>}
        </form>}
      </section>
    </div>
    <div className="page-footer"><span>FHBank Management</span><span>Ràng buộc khóa ngoại được cơ sở dữ liệu thực thi</span></div>
  </div>
}
