import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FlaskConical,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE = "https://hvwwgec7n2.execute-api.us-east-1.amazonaws.com"
const PAGE_SIZE = 5

function authHeader(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem("his_id_token") ?? ""}` }
}

// ── Types ───────────────────────────────────────────────────────────────

type LabUrgency = "Routine" | "Urgent"
type LabStatus  = "Pending" | "Completed"

interface LabRequest {
  id: string
  patientId: string
  patientName: string
  patientNumber: string
  requestTime: string
  testName: string
  requestedBy: string
  urgency: LabUrgency
  status: LabStatus
  resultId?: string | null
}

interface QueueStats {
  total: number
  pending: number
  completed: number
  urgent: number
}

// ── Stat card ────────────────────────────────────────────────────────────

function StatCard({ label, value, subtext, icon, iconBg }: {
  label: string; value: number; subtext?: string
  icon: React.ReactNode; iconBg: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-4xl font-bold text-foreground">{value}</p>
          {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ── CSV export ───────────────────────────────────────────────────────────

function exportCsv(rows: LabRequest[], filename: string) {
  const headers = ["Request Time", "Patient Name", "Patient ID", "Test Name", "Requested By", "Urgency", "Status"]
  const lines = [
    headers.join(","),
    ...rows.map(r =>
      [r.requestTime, r.patientName, r.patientNumber, r.testName, r.requestedBy, r.urgency, r.status]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Badges ───────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: LabUrgency }) {
  if (urgency === "Urgent")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-0.5 text-xs font-medium text-[#78350F]">
        <AlertTriangle size={10} /> Urgent
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
      Routine
    </span>
  )
}

function StatusBadge({ status }: { status: LabStatus }) {
  if (status === "Pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-0.5 text-xs font-medium text-[#78350F]">
        <Clock size={10} /> Pending
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
      <CheckCircle size={10} /> Completed
    </span>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export function LabWorkQueuePage() {
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [stats,    setStats]    = useState<QueueStats>({ total: 0, pending: 0, completed: 0, urgent: 0 })
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [filter,   setFilter]   = useState<LabStatus | "All">("All")
  const [search,   setSearch]   = useState("")
  const [page,     setPage]     = useState(1)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/laboratory/queue`, { headers: authHeader() })
      .then(r => r.json())
      .then((data: { stats: QueueStats; requests: LabRequest[] }) => {
        setStats(data.stats ?? { total: 0, pending: 0, completed: 0, urgent: 0 })
        setRequests(data.requests ?? [])
      })
      .catch(() => setError("Failed to load lab work queue."))
      .finally(() => setLoading(false))
  }, [])

  const filtered = requests.filter(r => {
    const matchStatus = filter === "All" || r.status === filter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      r.patientName.toLowerCase().includes(q) ||
      r.testName.toLowerCase().includes(q) ||
      (r.patientNumber ?? "").toLowerCase().includes(q) ||
      r.requestedBy.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Lab Work Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and process pending laboratory test requests, ordered oldest-first.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Requests" value={stats.total} subtext="All lab test requests"
          icon={<FlaskConical size={20} className="text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Pending" value={stats.pending} subtext="Awaiting results"
          icon={<Clock size={20} className="text-[#F59E0B]" />} iconBg="bg-[#F59E0B]/10" />
        <StatCard label="Completed" value={stats.completed} subtext="Results entered"
          icon={<CheckCircle size={20} className="text-[#10B981]" />} iconBg="bg-[#10B981]/10" />
        <StatCard label="Urgent Tests" value={stats.urgent} subtext="Requires priority attention"
          icon={<AlertTriangle size={20} className="text-destructive" />} iconBg="bg-destructive/10" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {(["All", "Pending", "Completed"] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); setPage(1) }}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                filter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "All" ? "All Tests" : f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by patient or test name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => exportCsv(filtered, "lab-work-queue.csv")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3">
            <FlaskConical size={40} className="animate-pulse text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Loading lab queue...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3">
            <FlaskConical size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No lab tests match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-border bg-muted">
                <tr>
                  {["Request Time", "Patient Name", "Patient ID", "Test Name", "Requested By", "Urgency", "Status", "Action"].map(
                    h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map(req => (
                  <tr key={req.id} className="transition-colors hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {new Date(req.requestTime).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">{req.patientName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{req.patientNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{req.testName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{req.requestedBy}</td>
                    <td className="px-4 py-3"><UrgencyBadge urgency={req.urgency} /></td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                    <td className="px-4 py-3">
                      {req.status === "Pending" ? (
                        <Link
                          to={`/laboratory/results/new/${req.id}`}
                          className="inline-flex items-center rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                        >
                          Enter Result
                        </Link>
                      ) : (
                        <Link
                          to={`/laboratory/results/${req.resultId}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View Result
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} requests
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="min-w-16 text-center text-xs text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
