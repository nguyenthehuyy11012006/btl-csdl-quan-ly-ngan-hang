import { useEffect, useMemo, useState } from 'react'
import CustomerLookupPage from './pages/CustomerLookupPage'
import CreditAccountsPage from './pages/CreditAccountsPage'
import TopDepositsPage from './pages/TopDepositsPage'
import TransactionDatePage from './pages/TransactionDatePage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import SpendingDebtPage from './pages/SpendingDebtPage'
import EmployeeIncomePage from './pages/EmployeeIncomePage'
import EmployeeRankingPage from './pages/EmployeeRankingPage'
import OpenAccountPage from './pages/OpenAccountPage'
import TransactionEntryPage from './pages/TransactionEntryPage'
import EmployeesPage from './pages/EmployeesPage'
import LimitAlertsPage from './pages/LimitAlertsPage'
import CustomerGrowthPage from './pages/CustomerGrowthPage'
import CustomerCitiesPage from './pages/CustomerCitiesPage'
import AccountFreezePage from './pages/AccountFreezePage'
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, Bell,
  BriefcaseBusiness, Building2, CalendarDays, ChartNoAxesCombined, ChevronDown,
  CircleAlert, CreditCard, LayoutDashboard, Menu, Moon, MoreHorizontal,
  Search, Settings2, ShieldCheck, Sun, Users, Wallet, X,
} from 'lucide-react'

type Theme = 'light' | 'dark'
type MenuItem = { id: string; label: string; icon: typeof LayoutDashboard; description: string }
type MenuGroup = { label: string; items: MenuItem[] }

const menuGroups: MenuGroup[] = [
  {
    label: 'TỔNG QUAN',
    items: [{ id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, description: 'Tình hình hoạt động ngân hàng' }],
  },
  {
    label: 'KHÁCH HÀNG',
    items: [
      { id: 'customers', label: 'Tra cứu khách hàng', icon: Users, description: 'Hồ sơ khách hàng và danh sách tài khoản' },
      { id: 'growth', label: 'Tăng trưởng khách hàng', icon: ChartNoAxesCombined, description: 'Khách hàng đăng ký theo ngày, tháng và năm' },
      { id: 'cities', label: 'Theo thành phố', icon: Building2, description: 'Phân bố khách hàng theo thành phố' },
    ],
  },
  {
    label: 'TÀI KHOẢN',
    items: [
      { id: 'accounts', label: 'Mở tài khoản', icon: Wallet, description: 'Mở tài khoản tín dụng hoặc gửi tiền' },
      { id: 'credit', label: 'Tài khoản & dư nợ', icon: CreditCard, description: 'Tra cứu hạn mức và dư nợ tín dụng' },
      { id: 'top-deposits', label: 'Top tiền gửi', icon: Banknote, description: 'Khách hàng có tổng tiền gửi cao nhất' },
      { id: 'limit-alerts', label: 'Cảnh báo hạn mức', icon: CircleAlert, description: 'Tài khoản tín dụng gần chạm hạn mức' },
      { id: 'freeze', label: 'Đóng băng tài khoản', icon: ShieldCheck, description: 'Quản lý tài khoản không hoạt động' },
    ],
  },
  {
    label: 'GIAO DỊCH',
    items: [
      { id: 'spending', label: 'Ghi chi tiêu', icon: ArrowUpRight, description: 'Ghi nhận chi tiêu trên tài khoản tín dụng' },
      { id: 'payments', label: 'Thanh toán tín dụng', icon: ArrowDownLeft, description: 'Thanh toán dư nợ từ tài khoản gửi tiền' },
      { id: 'history', label: 'Lịch sử giao dịch', icon: Activity, description: 'Tra cứu các giao dịch đã ghi nhận' },
      { id: 'daily-transactions', label: 'Giao dịch theo ngày', icon: CalendarDays, description: 'Thống kê giao dịch trong khoảng thời gian' },
    ],
  },
  {
    label: 'BÁO CÁO & QUẢN TRỊ',
    items: [
      { id: 'debt-report', label: 'Chi tiêu & dư nợ', icon: ChartNoAxesCombined, description: 'Thống kê chi tiêu, thanh toán và dư nợ' },
      { id: 'employee-income', label: 'Thu nhập nhân viên', icon: BriefcaseBusiness, description: 'Lương nhân viên kinh doanh theo tháng' },
      { id: 'employee-ranking', label: 'Xếp hạng nhân viên', icon: Users, description: 'Xếp hạng theo mức thu nhập' },
      { id: 'employees', label: 'Quản lý nhân viên', icon: Settings2, description: 'Thêm, sửa, xóa và tra cứu nhân viên' },
    ],
  },
]

function readSavedTheme(): Theme {
  try {
    return localStorage.getItem('bank-ui-theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function App() {
  const [theme, setTheme] = useState<Theme>(readSavedTheme)
  const [activeId, setActiveId] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('bank-ui-theme', theme) } catch { /* Storage can be unavailable in restricted contexts. */ }
  }, [theme])

  const allItems = useMemo(() => menuGroups.flatMap((group) => group.items), [])
  const activeItem = allItems.find((item) => item.id === activeId) ?? allItems[0]
  const filteredGroups = menuGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.label.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))),
  })).filter((group) => group.items.length > 0)

  return (
    <main className="desktop-scene min-h-screen p-3 md:p-5">
      <div className="app-window flex min-h-[calc(100vh-1.5rem)] overflow-hidden md:min-h-[calc(100vh-2.5rem)]">
        <aside className={`sidebar glass-panel ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <div className="brand-row">
            <div className="brand-mark"><Building2 size={20} strokeWidth={2.5} /></div>
            <div className="brand-copy"><span className="brand-name">FHBank</span><span className="brand-caption">BANK MANAGEMENT</span></div>
            <button className="icon-button mobile-close" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          </div>

          <div className="workspace-pill"><span className="workspace-dot" /><span>Chi nhánh trung tâm</span><ChevronDown size={14} /></div>

          {searchOpen && (
            <div className="sidebar-search"><Search size={15} /><input autoFocus placeholder="Tìm chức năng..." value={search} onChange={(event) => setSearch(event.target.value)} /><button aria-label="Đóng tìm kiếm" onClick={() => { setSearchOpen(false); setSearch('') }}><X size={14} /></button></div>
          )}

          <nav className="sidebar-nav" aria-label="Điều hướng chính">
            {filteredGroups.map((group) => (
              <section className="nav-group" key={group.label}>
                <p className="nav-label">{group.label}</p>
                <div className="nav-items">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <button key={item.id} className={`nav-item ${activeId === item.id ? 'nav-item-active' : ''}`} onClick={() => { setActiveId(item.id); setSidebarOpen(false) }} title={item.label}>
                        <Icon size={17} strokeWidth={1.9} /><span>{item.label}</span>{activeId === item.id && <span className="active-indicator" />}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
            {filteredGroups.length === 0 && <p className="empty-search">Không tìm thấy chức năng phù hợp.</p>}
          </nav>

          <div className="sidebar-bottom">
            <button className="nav-item settings-link" onClick={() => setActiveId('settings')}><Settings2 size={17} /><span>Cài đặt</span></button>
            <div className="profile-card"><div className="profile-avatar">AD</div><div className="profile-copy"><strong>Quản trị viên</strong><span>Điều hành hệ thống</span></div><MoreHorizontal size={18} className="profile-more" /></div>
          </div>
        </aside>

        {sidebarOpen && <button className="mobile-scrim" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}

        <section className="main-area">
          <header className="topbar">
            <div className="topbar-left">
              <button className="icon-button menu-toggle" aria-label="Mở menu" onClick={() => setSidebarOpen((open) => !open)}><Menu size={19} /></button>
              <div className="breadcrumbs"><span>Ngân hàng</span><span className="breadcrumb-divider">/</span><strong>{activeItem.label}</strong></div>
            </div>
            <div className="topbar-actions">
              <button className="icon-button search-toggle" aria-label="Tìm chức năng" onClick={() => { setSearchOpen((open) => !open); setSidebarOpen(true) }}><Search size={18} /></button>
              <button className="icon-button notification-button" aria-label="Thông báo"><Bell size={18} /><i /></button>
              <span className="topbar-divider" />
              <button className="theme-toggle" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}>
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}<span>{theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
              </button>
              <div className="topbar-user"><div className="profile-avatar small-avatar">AD</div><span>Admin</span><ChevronDown size={14} /></div>
            </div>
          </header>

          <div className="content-scroll">
            {activeId === 'dashboard' ? <Dashboard onNavigate={setActiveId} /> : activeId === 'customers' ? <CustomerLookupPage /> : activeId === 'accounts' ? <OpenAccountPage /> : activeId === 'spending' ? <TransactionEntryPage kind="spending" /> : activeId === 'payments' ? <TransactionEntryPage kind="payment" /> : activeId === 'employees' ? <EmployeesPage /> : activeId === 'growth' ? <CustomerGrowthPage /> : activeId === 'cities' ? <CustomerCitiesPage /> : activeId === 'limit-alerts' ? <LimitAlertsPage /> : activeId === 'freeze' ? <AccountFreezePage /> : activeId === 'credit' ? <CreditAccountsPage /> : activeId === 'top-deposits' ? <TopDepositsPage /> : activeId === 'daily-transactions' ? <TransactionDatePage /> : activeId === 'history' ? <TransactionHistoryPage /> : activeId === 'debt-report' ? <SpendingDebtPage /> : activeId === 'employee-income' ? <EmployeeIncomePage /> : activeId === 'employee-ranking' ? <EmployeeRankingPage /> : <FeaturePlaceholder item={activeItem} />}
          </div>
        </section>
      </div>
    </main>
  )
}

function Dashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [summaryError, setSummaryError] = useState('')
  useEffect(() => {
    let cancelled = false
    window.fhbank?.dashboard.summary().then((value) => { if (!cancelled) setSummary(value) }).catch((reason: unknown) => { if (!cancelled) setSummaryError(reason instanceof Error ? reason.message : 'Không tải được số liệu tổng quan.') })
    return () => { cancelled = true }
  }, [])
  const fmt = (value?: number) => value === undefined ? '—' : new Intl.NumberFormat('vi-VN').format(value)
  const shortcuts = [
    { id: 'customers', label: 'Tra cứu khách hàng', icon: Users },
    { id: 'accounts', label: 'Mở tài khoản', icon: Wallet },
    { id: 'payments', label: 'Thanh toán tín dụng', icon: CreditCard },
    { id: 'history', label: 'Lịch sử giao dịch', icon: Activity },
  ]

  return (
    <div className="page-content">
      <div className="page-heading-row">
        <div><p className="eyebrow">THỨ SÁU, 06 THÁNG 11, 2026 <span className="eyebrow-dot" /> CHI NHÁNH TRUNG TÂM</p><h1>Tổng quan</h1><p className="page-subtitle">Chào mừng trở lại. Đây là không gian quản lý ngân hàng của bạn.</p></div>
        <button className="date-chip"><CalendarDays size={16} />Hôm nay<ChevronDown size={14} /></button>
      </div>

      <section className="welcome-banner">
        <div className="welcome-copy"><span className="welcome-kicker">FHBANK · QUẢN LÝ NGÂN HÀNG</span><h2>Mọi hoạt động,<br /><em>trong tầm kiểm soát.</em></h2><p>Các công cụ quản lý khách hàng, tài khoản và giao dịch được sắp xếp ngay trong tầm tay.</p><button className="banner-button" onClick={() => onNavigate('customers')}>Khám phá chức năng <ArrowRight size={16} /></button></div>
        <div className="banner-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-glass-card"><div className="art-card-icon"><Building2 size={22} /></div><div className="art-lines"><span /><span /><span /></div><div className="art-card-foot"><i /><i /><i /><i /><i /><i /></div></div><div className="art-float float-one"><ShieldCheck size={18} /></div><div className="art-float float-two"><Activity size={18} /></div></div>
        <div className="banner-glow" />
      </section>

      <div className="section-heading"><div><h2>Toàn cảnh hệ thống</h2><p>Khu vực hiển thị số liệu sẽ được kết nối cơ sở dữ liệu ở task tiếp theo.</p></div><button className="text-action" onClick={() => onNavigate('debt-report')}>Xem báo cáo <ArrowRight size={15} /></button></div>

      <section className="metrics-grid" aria-label="Các chỉ số tổng quan">
        <MetricCard label="Khách hàng" value={fmt(summary?.customers)} detail={summaryError || 'Tổng hồ sơ'} icon={Users} tone="teal" change="Hồ sơ" />
        <MetricCard label="Tài khoản đang hoạt động" value={fmt(summary?.activeAccounts)} detail="Tài khoản còn hiệu lực" icon={Wallet} tone="violet" change="Đang hoạt động" />
        <MetricCard label="Dư nợ tín dụng" value={summary ? `${fmt(summary.debt)} ₫` : '—'} detail="Tổng dư nợ hiện tại" icon={CreditCard} tone="amber" change="Tổng dư nợ" />
        <MetricCard label="Giao dịch trong tháng" value={fmt(summary?.monthlyTransactions)} detail="Tháng hiện tại" icon={Activity} tone="rose" change="Tháng hiện tại" />
      </section>

      <section className="dashboard-grid">
        <div className="glass-card quick-card"><div className="card-heading"><div><h3>Truy cập nhanh</h3><p>Bắt đầu với một tác vụ phổ biến</p></div><span className="card-heading-icon"><ArrowRight size={16} /></span></div><div className="shortcut-grid">{shortcuts.map(({ id, label, icon: Icon }) => <button className="shortcut-item" key={id} onClick={() => onNavigate(id)}><span className="shortcut-icon"><Icon size={18} /></span><span>{label}</span><ArrowRight className="shortcut-arrow" size={15} /></button>)}</div></div>
        <DatabaseStatusCard />
      </section>

      <div className="page-footer"><span>© 2026 FHBank Management</span><span>Được thiết kế cho vận hành ngân hàng</span></div>
    </div>
  )
}

function DatabaseStatusCard() {
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<{
    state: 'checking' | 'connected' | 'error'
    database?: string | null
    version?: string | null
    message: string
  }>({ state: 'checking', message: 'Đang kiểm tra kết nối MySQL…' })

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const api = window.fhbank
      if (!api) {
        setStatus({ state: 'error', message: 'Hãy mở ứng dụng desktop để kiểm tra MySQL.' })
        return
      }
      setStatus({ state: 'checking', message: 'Đang kiểm tra kết nối MySQL…' })
      try {
        const result = await api.database.check()
        if (!cancelled) setStatus({
          state: result.connected ? 'connected' : 'error',
          database: result.database,
          version: result.version,
          message: result.message,
        })
      } catch {
        if (!cancelled) setStatus({ state: 'error', message: 'Không gọi được dịch vụ MySQL trong ứng dụng.' })
      }
    }
    void check()
    return () => { cancelled = true }
  }, [attempt])

  const badgeText = status.state === 'checking' ? 'Đang kiểm tra' : status.state === 'connected' ? 'Đã kết nối' : 'Chưa kết nối'
  const databaseDetail = status.state === 'connected'
    ? `${status.database} · MySQL ${status.version?.split(' ')[0] ?? ''}`
    : status.message

  return (
    <div className="glass-card status-card">
      <div className="card-heading">
        <div><h3>Tình trạng kết nối</h3><p>Trạng thái ứng dụng và dữ liệu</p></div>
        <span className={`status-badge ${status.state}`}><i />{badgeText}</span>
      </div>
      <div className="status-row">
        <span className="status-symbol"><ShieldCheck size={17} /></span>
        <div><strong>Giao diện desktop</strong><small>Electron · React · TypeScript</small></div>
        <span className="status-check">Đang hoạt động</span>
      </div>
      <div className="status-row">
        <span className={`status-symbol ${status.state === 'connected' ? '' : 'muted'}`}><Building2 size={17} /></span>
        <div><strong>Cơ sở dữ liệu MySQL</strong><small>{databaseDetail}</small></div>
        {status.state === 'error' && <button className="retry-button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button>}
        {status.state === 'connected' && <span className="status-check">Đang hoạt động</span>}
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail, icon: Icon, tone, change }: { label: string; value: string; detail: string; icon: typeof Users; tone: string; change: string }) {
  return <article className="metric-card glass-card"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><span className="metric-menu"><MoreHorizontal size={18} /></span><p className="metric-label">{label}</p><strong className="metric-value">{value}</strong><div className="metric-meta"><span>{change}</span><span className="metric-separator">·</span><span>{detail}</span></div><div className={`metric-sparkline ${tone}`}><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></article>
}

function FeaturePlaceholder({ item }: { item: MenuItem }) {
  const Icon = item.icon
  return <div className="page-content feature-page"><div className="page-heading-row"><div><p className="eyebrow">FHBANK · KHÔNG GIAN NGHIỆP VỤ</p><h1>{item.label}</h1><p className="page-subtitle">{item.description}</p></div><span className="feature-heading-icon"><Icon size={22} /></span></div><div className="feature-empty glass-card"><div className="empty-illustration"><Icon size={26} /></div><h2>Không gian chức năng đã sẵn sàng</h2><p>Màn hình <strong>{item.label}</strong> sẽ được triển khai và kiểm thử ở task chuyển chức năng tương ứng. Các nghiệp vụ hiện có trong dự án sẽ là cơ sở để hoàn thiện màn hình này.</p><div className="feature-tags"><span>Giao diện React</span><span>Thiết kế glassmorphism</span><span>Sẵn sàng tích hợp MySQL</span></div></div><div className="page-footer"><span>© 2026 FHBank Management</span><span>Task 1 · Khung ứng dụng</span></div></div>
}

export default App
