import { useEffect, useMemo, useState } from 'react'
import { Banknote, Crown, Medal, RefreshCw, Trophy, Wallet } from 'lucide-react'

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const formatMoney = (value: number | string) => `${money.format(Number(value) || 0)} ₫`

export default function TopDepositsPage() {
  const [customers, setCustomers] = useState<TopDepositCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    if (!window.fhbank) {
      setError('Không tìm thấy dịch vụ desktop. Hãy mở FHBank bằng Electron.')
      setLoading(false)
      return () => { cancelled = true }
    }
    window.fhbank.deposits.topCustomers()
      .then((rows) => { if (!cancelled) setCustomers(rows) })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setCustomers([])
          setError(reason instanceof Error ? reason.message : 'Không tải được bảng xếp hạng tiền gửi.')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [retry])

  const totalTop = useMemo(() => customers.reduce((sum, customer) => sum + Number(customer.TongTienGui), 0), [customers])
  const maximum = Number(customers[0]?.TongTienGui ?? 0)
  const podium = [customers[1], customers[0], customers[2]].filter(Boolean)

  return (
    <div className="page-content deposits-page">
      <div className="page-heading-row">
        <div><p className="eyebrow">FHBANK · PHÂN TÍCH TIỀN GỬI</p><h1>Top khách hàng tiền gửi</h1><p className="page-subtitle">Xếp hạng theo tổng số dư của tất cả tài khoản gửi tiền.</p></div>
        <button className="refresh-button" onClick={() => setRetry((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} />Làm mới</button>
      </div>

      <section className="deposit-overview">
        <div className="deposit-overview-copy"><span className="deposit-overview-kicker"><Trophy size={14} /> BẢNG XẾP HẠNG</span><h2>Những khách hàng<br /><em>gửi tiền nhiều nhất.</em></h2><p>Số dư được cộng từ các tài khoản tiền gửi hiện có của từng khách hàng.</p></div>
        <div className="deposit-overview-stat"><span>Top 10 đang nắm giữ</span><strong>{loading ? '—' : formatMoney(totalTop)}</strong><small>Tổng số dư của các khách hàng trong bảng</small></div>
        <div className="deposit-overview-art" aria-hidden="true"><div className="deposit-orbit" /><div className="deposit-coin coin-one"><Banknote size={19} /></div><div className="deposit-coin coin-two"><Wallet size={17} /></div><div className="deposit-trophy"><Trophy size={39} /></div></div>
      </section>

      {error && <div className="deposit-error"><span>{error}</span><button onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
      {loading && <div className="deposit-empty glass-card">Đang tải bảng xếp hạng…</div>}
      {!loading && !error && customers.length === 0 && <div className="deposit-empty glass-card">Chưa có khách hàng nào có tài khoản gửi tiền.</div>}

      {!loading && !error && customers.length > 0 && (
        <>
          <section className="deposit-podium" aria-label="Ba khách hàng đứng đầu">
            {podium.map((customer) => {
              const rank = customers.findIndex((item) => item.MaKH === customer.MaKH) + 1
              return <article className={`podium-card rank-${rank} glass-card`} key={customer.MaKH}><span className="podium-medal">{rank === 1 ? <Crown size={17} /> : <Medal size={17} />}<strong>#{rank}</strong></span><div className="podium-avatar">{customer.Ten.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('')}</div><h3>{customer.Ten}</h3><p>{customer.MaKH} · {customer.SoTKGuiTien} tài khoản</p><strong className="podium-amount">{formatMoney(customer.TongTienGui)}</strong><div className="podium-bar" /></article>
            })}
          </section>

          <section className="deposit-ranking glass-card">
            <div className="deposit-ranking-heading"><div><h2>Danh sách xếp hạng</h2><p>Top {customers.length} khách hàng theo tổng số dư tiền gửi</p></div><span className="deposit-ranking-count"><Trophy size={14} />{customers.length} khách hàng</span></div>
            <div className="deposit-ranking-list">{customers.map((customer, index) => {
              const rank = index + 1
              const amount = Number(customer.TongTienGui) || 0
              const share = totalTop ? amount / totalTop * 100 : 0
              return <div className="deposit-ranking-row" key={customer.MaKH}><span className={`deposit-rank rank-${rank}`}>{String(rank).padStart(2, '0')}</span><div className="deposit-customer"><span className="deposit-avatar">{customer.Ten.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('')}</span><span><strong>{customer.Ten}</strong><small>{customer.MaKH} · {customer.SoTKGuiTien} tài khoản gửi tiền</small></span></div><div className="deposit-share"><div><span>Tỉ trọng trong top 10</span><small>{share.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</small></div><div className="deposit-share-track"><i style={{ width: `${maximum ? amount / maximum * 100 : 0}%` }} /></div></div><strong className="deposit-row-amount">{formatMoney(amount)}</strong></div>
            })}</div>
          </section>
          <div className="page-footer"><span>© 2026 FHBank Management</span><span>Nguồn dữ liệu: TaiKhoanGuiTien</span></div>
        </>
      )}
    </div>
  )
}
