import { useState, useEffect } from "react"
import {
  AlertOctagon,
  ArrowLeftRight,
  Calendar,
  Upload,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ── Types ──────────────────────────────────────────────────────
type Tab = "all" | "unread" | "critical" | "system"

interface Notification {
  id: number
  tab: Tab[]
  unread: boolean
  iconBg: string
  iconColor: string
  Icon: React.ElementType
  title: string
  body: string
  time: string
  actionLabel: string
}

// ── Mock data ──────────────────────────────────────────────────
const NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    tab: ["all", "unread", "critical"],
    unread: true,
    iconBg: "bg-destructive/15",
    iconColor: "text-destructive",
    Icon: AlertOctagon,
    title: "Critical Lab Result: Patient #4592",
    body: "Elevated Troponin levels detected for John Doe. Immediate clinical review required in Ward B.",
    time: "10 mins ago",
    actionLabel: "View Result",
  },
  {
    id: 2,
    tab: ["all", "unread"],
    unread: true,
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    Icon: ArrowLeftRight,
    title: "Patient Transfer Initiated",
    body: "Sarah Jenkins is being transferred from ER to ICU. Bed 04 has been assigned and prepped.",
    time: "1 hr ago",
    actionLabel: "Track Transfer",
  },
  {
    id: 3,
    tab: ["all"],
    unread: false,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    Icon: Calendar,
    title: "Schedule Update: Dr. Smith",
    body: "Three new consults have been added to your afternoon block. Please review the updated itinerary.",
    time: "Yesterday, 14:30",
    actionLabel: "View Schedule",
  },
  {
    id: 4,
    tab: ["all", "system"],
    unread: false,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    Icon: Upload,
    title: "Nightly ETL Process Completed",
    body: "The daily synchronization with the central repository was successful. 4,021 records updated.",
    time: "Yesterday, 03:00",
    actionLabel: "System Logs",
  },
  {
    id: 5,
    tab: ["all", "system"],
    unread: false,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    Icon: UserPlus,
    title: "New Staff Orientation",
    body: "Reminder: Orientation for new nursing staff begins at 10 AM in the main conference room.",
    time: "Oct 24, 09:00",
    actionLabel: "View Details",
  },
]

// ── Page ───────────────────────────────────────────────────────
export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [dateFrom, setDateFrom] = useState("2023-10-01")
  const [dateTo, setDateTo] = useState("2023-10-31")

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "critical", label: "Critical" },
    { key: "system", label: "System" },
  ]

  const visible = NOTIFICATIONS.filter((n) => n.tab.includes(activeTab))

  // REQ-F-065: poll GET /notifications every 15 s for unread items
  useEffect(() => {
    const poll = setInterval(() => {
      // TODO: fetch("/api/notifications").then(res => res.json()).then(setNotifications)
    }, 15_000)
    return () => clearInterval(poll)
  }, [])

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Manage and review your recent alerts and updates.
          </p>
        </div>

        {/* Date range + Mark all */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="flex items-center pl-3 pr-2 py-1.5 border-r border-border bg-muted/50 text-muted-foreground">
              <CalendarDays size={14} className="mr-1" />
              <span className="text-xs font-medium">From</span>
            </div>
            <input
              type="date"
              title="Filter from date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-transparent text-sm border-none focus:ring-0 focus:outline-none text-foreground scheme-light dark:scheme-dark"
            />
            <div className="flex items-center px-2 py-1.5 border-l border-r border-border bg-muted/50 text-muted-foreground">
              <span className="text-xs font-medium">To</span>
            </div>
            <input
              type="date"
              title="Filter to date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-transparent text-sm border-none focus:ring-0 focus:outline-none text-foreground scheme-light dark:scheme-dark"
            />
          </div>
          <Button type="button" variant="outline" size="sm">
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border -mb-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-primary font-bold text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="bg-card border border-border rounded-lg shadow-sm flex flex-col">
        {visible.map((n, idx) => (
          <div
            key={n.id}
            className={`relative flex items-start gap-4 p-5 border-l-4 group hover:bg-muted/40 transition-colors ${
              idx < visible.length - 1 ? "border-b border-border" : ""
            } ${n.unread ? "bg-primary/5 border-l-primary" : "border-l-transparent"}`}
          >
            {/* Icon circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.iconBg}`}
            >
              <n.Icon size={18} className={n.iconColor} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-bold text-foreground truncate">{n.title}</h3>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">{n.time}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
              <a
                href="#"
                className="inline-block mt-2 text-sm text-primary hover:underline font-medium"
                onClick={(e) => e.preventDefault()}
              >
                {n.actionLabel}
              </a>
            </div>

            {/* Unread dot */}
            {n.unread && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </div>
        ))}

        {visible.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No notifications in this category.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Showing 1 to 5 of 42 entries</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled
            className="px-3 py-1.5 border border-border rounded bg-card text-foreground hover:bg-muted text-sm flex items-center disabled:opacity-50"
          >
            <ChevronLeft size={16} className="mr-1" /> Previous
          </button>
          {[1, 2, 3].map((p) => (
            <button
              key={p}
              type="button"
              className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium border ${
                p === 1
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
          <span className="px-1 text-muted-foreground">...</span>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded text-sm border border-border bg-card text-foreground hover:bg-muted"
          >
            9
          </button>
          <button
            type="button"
            className="px-3 py-1.5 border border-border rounded bg-card text-foreground hover:bg-muted text-sm flex items-center"
          >
            Next <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
