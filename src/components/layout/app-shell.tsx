import { useState, useEffect, useCallback, type ReactNode } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { API_BASE } from "@/lib/api"
import {
  AlertOctagon,
  ArrowLeftRight,
  BarChart2,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  Stethoscope,
  Sun,
  Upload,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

// ── Types ────────────────────────────────────────────────────

export interface AppUser {
  name: string
  initials: string
  role: string
  hospital?: string
}

export interface Notification {
  id: string
  type: "critical_lab" | "transfer" | "appointment" | "etl" | "staff" | "system"
  title: string
  body: string
  timestamp: string
  read: boolean
}

// ── Nav items ────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/appointments", icon: Calendar, label: "Appointments" },
  { to: "/encounters", icon: Stethoscope, label: "Encounters" },
  { to: "/laboratory", icon: FlaskConical, label: "Laboratory" },
  { to: "/bulk-upload", icon: Upload, label: "Bulk Upload" },
  { to: "/transfers", icon: ArrowLeftRight, label: "Transfers" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/audit", icon: Shield, label: "Audit Log" },
] as const

// System Settings sub-nav (Hospital Admin)
const SETTINGS_NAV_ITEMS = [
  { to: "/staff", icon: UserCog, label: "Staff Management" },
  { to: "/staff/roles", icon: Shield, label: "Role Management" },
  { to: "/settings/facility", icon: Settings, label: "Facility Settings" },
] as const

const SUPER_ADMIN_NAV_ITEMS = [
  { to: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/super-admin/registrations", icon: ClipboardList, label: "Hospital Registrations" },
  { to: "/super-admin/hospitals", icon: Building2, label: "All Hospitals" },
  { to: "/super-admin/settings", icon: Settings, label: "System Settings" },
] as const

// ── Notification icon ────────────────────────────────────────

function NotifIcon({ type }: { type: Notification["type"] }) {
  switch (type) {
    case "critical_lab":
      return <AlertOctagon size={16} className="shrink-0 text-destructive" />
    case "transfer":
      return <ArrowLeftRight size={16} className="shrink-0 text-primary" />
    case "appointment":
      return <Calendar size={16} className="shrink-0 text-indigo-500" />
    case "etl":
      return <Upload size={16} className="shrink-0 text-[#10B981]" />
    case "staff":
      return <UserPlus size={16} className="shrink-0 text-muted-foreground" />
    default:
      return <CheckCircle2 size={16} className="shrink-0 text-muted-foreground" />
  }
}

// ── Notification Panel ────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

function NotificationPanel({ open, onClose, notifications, onMarkRead, onMarkAllRead }: NotificationPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />}

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 flex w-[360px] flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-white leading-none">
                {unreadCount} New
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close notifications"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Bell size={48} className="opacity-30" />
              <p className="text-sm">No notifications.</p>
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => onMarkRead(notif.id)}
                  className={cn(
                    "relative w-full border-b border-border px-4 py-3.5 text-left transition-colors flex gap-3",
                    notif.read ? "bg-card hover:bg-accent" : "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  {!notif.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                  )}
                  <div className="mt-0.5 shrink-0">
                    <NotifIcon type={notif.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-snug">{notif.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{notif.body}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{notif.timestamp}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-3 flex flex-col gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Mark all as read
            </button>
          )}
          <Link
            to="/notifications"
            onClick={onClose}
            className="w-full rounded-md py-2 text-sm font-medium text-primary text-center transition-colors hover:bg-primary/5"
          >
            View All Notifications
          </Link>
        </div>
      </div>
    </>
  )
}

// ── Session Timeout Banner ───────────────────────────────────

function SessionTimeoutBanner({ onStayLoggedIn }: { onStayLoggedIn: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-md border border-[#F59E0B] bg-[#F59E0B]/15 px-4 py-3">
      <AlertOctagon size={16} className="shrink-0 text-[#F59E0B]" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#78350F]">Session Expiring Soon</p>
        <p className="text-xs text-[#92400E]">Your session expires in 2 minutes due to inactivity.</p>
      </div>
      <Button
        size="sm"
        className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onStayLoggedIn}
      >
        Stay Logged In
      </Button>
    </div>
  )
}

// ── JWT helpers (browser-safe, no Buffer) ────────────────────

function getTokenExpiry(idToken: string): number | null {
  try {
    const b64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(b64)) as { exp?: number }
    return exp ?? null
  } catch {
    return null
  }
}

function storedUser(): AppUser {
  try {
    const raw = localStorage.getItem('his_user')
    if (!raw) return DEFAULT_USER
    const u = JSON.parse(raw) as { name?: string; role?: string; hospitalId?: string }
    const name = u.name || 'User'
    const initials = name.split(' ').map((p: string) => p[0] ?? '').join('').toUpperCase().slice(0, 2) || 'U'
    return { name, initials, role: u.role || 'Staff', hospital: u.hospitalId }
  } catch {
    return DEFAULT_USER
  }
}

// ── Topbar ───────────────────────────────────────────────────

interface TopbarProps {
  user: AppUser
  unreadCount: number
  onBellClick: () => void
  onLogout: () => void
}

function Topbar({ user, unreadCount, onBellClick, onLogout }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4">
      {/* Left — Logo */}
      <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary">
          <div className="size-3.5 rounded-sm bg-primary-foreground/90" />
        </div>
        <span className="text-base font-semibold text-foreground">HIS</span>
      </Link>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Role badge */}
        <span className="rounded border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {user.role}
        </span>

        {/* Search */}
        <button className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <Search size={13} />
          <span>Search</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notification bell */}
        <button
          onClick={onBellClick}
          aria-label="Notifications"
          className="relative rounded-md p-1.5 text-foreground transition-colors hover:bg-accent"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account menu"
              className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {user.initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings/profile" className="cursor-pointer">My Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings/password" className="cursor-pointer">Change Password</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={onLogout}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

// ── Sidebar ──────────────────────────────────────────────────

interface SidebarProps {
  user: AppUser
  navVariant?: "hospital" | "super-admin"
  onLogout: () => void
}

function Sidebar({ user, navVariant = "hospital", onLogout }: SidebarProps) {
  const isSuper = navVariant === "super-admin"
  const items = isSuper ? SUPER_ADMIN_NAV_ITEMS : NAV_ITEMS

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 flex w-60 flex-col border-r border-border bg-card">
      {isSuper ? (
        /* Super Admin — portal label */
        <div className="shrink-0 border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Super Admin</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Platform Administration</p>
        </div>
      ) : (
        <>
          {/* Hospital Admin Portal header */}
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Portal</p>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{user.hospital ?? "Central Hospital"}</p>
          </div>

          {/* New Admission CTA */}
          <div className="shrink-0 px-3 pt-3 pb-2">
            <Button
              type="button"
              size="sm"
              className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
              onClick={() => navigate("/patients/new")}
            >
              <Plus size={14} />
              New Admission
            </Button>
          </div>
        </>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="space-y-0.5">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                )
              }
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* System Settings group — hospital nav only */}
        {!isSuper && (
          <div className="mt-4">
            <div className="mb-1 flex items-center gap-2 px-3 py-1">
              <Settings size={14} className="shrink-0 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Settings</span>
            </div>
            <div className="space-y-0.5">
              {SETTINGS_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/staff"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
                    )
                  }
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Bottom — Logout */}
      <div className="shrink-0 border-t border-border px-2 py-2">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

// ── AppShell ─────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode
  user?: AppUser           // overrides localStorage read; omit to auto-read from stored JWT
  navVariant?: "hospital" | "super-admin"
  showSessionWarning?: boolean
  notifications?: Notification[]
}

const DEFAULT_USER: AppUser = {
  name: "Hospital Admin",
  initials: "JD",
  role: "Hospital Admin",
  hospital: "Central Hospital South",
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "critical_lab",
    title: "New Lab Results Available",
    body: "Urgent CMP results for patient #89234 (Miller, T.) are now available for review.",
    timestamp: "Just now",
    read: false,
  },
  {
    id: "2",
    type: "transfer",
    title: "Vitals Alert",
    body: "Patient in Bed 4A showing sustained tachycardia. Nursing staff alerted.",
    timestamp: "10 mins ago",
    read: false,
  },
  {
    id: "3",
    type: "appointment",
    title: "Schedule Update",
    body: "Dr. Chen has requested a consult transfer for 14:00 today.",
    timestamp: "1 hour ago",
    read: false,
  },
  {
    id: "4",
    type: "system",
    title: "System Update Complete",
    body: "HIS version 4.2 has been successfully deployed.",
    timestamp: "Yesterday",
    read: true,
  },
]

export function AppShell({
  children,
  user: userProp,
  navVariant = "hospital",
  showSessionWarning = false,
  notifications: initialNotifications = DEFAULT_NOTIFICATIONS,
}: AppShellProps) {
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [sessionWarning, setSessionWarning] = useState(showSessionWarning)
  // Read real user from localStorage; fall back to prop then DEFAULT_USER
  const [resolvedUser] = useState<AppUser>(() => userProp ?? storedUser())

  const unreadCount = notifications.filter((n) => !n.read).length

  // ── Logout: invalidate Cognito session, clear storage, redirect ──
  const handleLogout = useCallback(async () => {
    const accessToken = localStorage.getItem('his_access_token')
    if (accessToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: '{}',
        })
      } catch { /* always clear locally even if network fails */ }
    }
    localStorage.removeItem('his_access_token')
    localStorage.removeItem('his_id_token')
    localStorage.removeItem('his_refresh_token')
    localStorage.removeItem('his_user')
    localStorage.removeItem('his_permissions')
    navigate('/login')
  }, [navigate])

  // ── Session timeout: warn 2 min before JWT expiry (UI-008 / COM-003) ──
  useEffect(() => {
    const idToken = localStorage.getItem('his_id_token')
    if (!idToken) return
    const exp = getTokenExpiry(idToken)
    if (!exp) return
    const warnAt = exp * 1000 - 2 * 60 * 1000
    const delay = warnAt - Date.now()
    if (delay <= 0) { setSessionWarning(true); return }
    const timer = setTimeout(() => setSessionWarning(true), delay)
    return () => clearTimeout(timer)
  }, [])

  // ── Silent refresh: call /auth/refresh, update tokens, reset warning ──
  const handleStayLoggedIn = useCallback(async () => {
    const refreshToken = localStorage.getItem('his_refresh_token')
    if (!refreshToken) { handleLogout(); return }
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) throw new Error('refresh failed')
      const json = await res.json() as { accessToken: string; idToken: string; expiresIn: number }
      localStorage.setItem('his_access_token', json.accessToken)
      localStorage.setItem('his_id_token', json.idToken)
      setSessionWarning(false)
      // Re-arm the 2-min warning for the new token
      const exp = getTokenExpiry(json.idToken)
      if (exp) {
        const delay = exp * 1000 - 2 * 60 * 1000 - Date.now()
        if (delay > 0) setTimeout(() => setSessionWarning(true), delay)
      }
    } catch {
      handleLogout()
    }
  }, [handleLogout])

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar user={resolvedUser} unreadCount={unreadCount} onBellClick={() => setNotifOpen((v) => !v)} onLogout={handleLogout} />

      <Sidebar user={resolvedUser} navVariant={navVariant} onLogout={handleLogout} />

      {/* Main — offset for topbar (pt-14) and sidebar (pl-52) */}
      <main className="min-h-screen pl-60 pt-16">
        <div className="p-6">
          {sessionWarning && (
            <SessionTimeoutBanner onStayLoggedIn={handleStayLoggedIn} />
          )}
          {children}
        </div>
      </main>

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </div>
  )
}
