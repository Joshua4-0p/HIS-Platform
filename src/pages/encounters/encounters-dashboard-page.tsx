import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Search,
  Stethoscope,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

const PAGE_SIZE = 5

// ── Types ─────────────────────────────────────────────────────

type EncStatus = "Completed" | "In Progress" | "Missed"

interface EncounterRow {
  id: string
  patientId: string
  patientNumber: string
  patientName: string
  patientInitials: string
  date: string
  complaint: string
  clinician: string
  unit: string
  diagnoses: number
  status: EncStatus
}

interface Stats {
  total: number
  inProgress: number
  completed: number
  missed: number
}

// ── Auth ──────────────────────────────────────────────────────

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("his_id_token")}` }
}

// ── Helpers ───────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  if (sameDay(d, today)) return `Today, ${time}`
  if (sameDay(d, yesterday)) return `Yesterday, ${time}`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: EncStatus }) {
  if (status === "Completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
        <CheckCircle size={10} /> Completed
      </span>
    )
  if (status === "In Progress")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-0.5 text-xs font-medium text-[#78350F]">
        <Clock size={10} /> In Progress
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
      <AlertTriangle size={10} /> Missed
    </span>
  )
}

// ── CSV export ─────────────────────────────────────────────────

function exportCSV(rows: EncounterRow[]) {
  const header = ["Patient", "Patient ID", "Date", "Complaint", "Clinician", "Unit", "Diagnoses", "Status"]
  const lines  = rows.map(e =>
    [e.patientName, e.patientNumber, e.date, `"${e.complaint}"`, e.clinician, e.unit, e.diagnoses, e.status].join(","),
  )
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = "encounters.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page ──────────────────────────────────────────────────────

export function EncountersDashboardPage() {
  const [allRows,  setAllRows]  = useState<EncounterRow[]>([])
  const [stats,    setStats]    = useState<Stats>({ total: 0, inProgress: 0, completed: 0, missed: 0 })
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [search,   setSearch]   = useState("")
  const [filter,   setFilter]   = useState<EncStatus | "All">("All")
  const [page,     setPage]     = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${API_BASE}/encounters`, { headers: authHeader() })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        setStats(data.stats ?? { total: 0, inProgress: 0, completed: 0, missed: 0 })
        setAllRows(
          (data.encounters ?? []).map((e: Record<string, unknown>) => ({
            id:              e.id as string,
            patientId:       e.patientId as string,
            patientNumber:   e.patientNumber as string,
            patientName:     e.patientName as string,
            patientInitials: initials(e.patientName as string),
            date:            fmtDate(e.dateTime as string),
            complaint:       e.presentingComplaint as string,
            clinician:       (e.clinicianName as string) ?? "—",
            unit:            e.clinicalUnit as string,
            diagnoses:       Number(e.diagnosisCount ?? 0),
            status:          (e.status as EncStatus) ?? "Completed",
          })),
        )
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const filtered = allRows.filter(e => {
    const matchStatus = filter === "All" || e.status === filter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      e.patientName.toLowerCase().includes(q) ||
      e.patientNumber.toLowerCase().includes(q) ||
      e.complaint.toLowerCase().includes(q) ||
      e.clinician.toLowerCase().includes(q) ||
      e.unit.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const METRICS = [
    {
      label:   "Total This Week",
      value:   stats.total,
      sub:     "Encounters this week",
      icon:    Stethoscope,
      iconCls: "text-primary",
      bgCls:   "bg-primary/10",
    },
    {
      label:   "Completed",
      value:   stats.completed,
      sub:     `${completionPct}% completion rate`,
      icon:    CheckCircle,
      iconCls: "text-[#10B981]",
      bgCls:   "bg-[#10B981]/10",
    },
    {
      label:   "In Progress",
      value:   stats.inProgress,
      sub:     "Active today",
      icon:    Clock,
      iconCls: "text-[#F59E0B]",
      bgCls:   "bg-[#F59E0B]/10",
    },
    {
      label:   "Missed / No-show",
      value:   stats.missed,
      sub:     "Requires follow-up",
      icon:    XCircle,
      iconCls: "text-destructive",
      bgCls:   "bg-destructive/10",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Encounters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All clinical encounters across the facility — click a row to view full encounter details.
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Download size={15} /> Export as CSV
        </button>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map(m => (
          <div
            key={m.label}
            className="flex items-start gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", m.bgCls)}>
              <m.icon size={20} className={m.iconCls} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              <p className="mt-0.5 text-3xl font-bold text-foreground">
                {loading ? "—" : m.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patient, clinician, unit..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          {(["All", "In Progress", "Completed", "Missed"] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); setPage(1) }}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Encounters table ── */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3">
            <Activity size={40} className="animate-pulse text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Loading encounters…</p>
          </div>
        ) : error ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3">
            <AlertTriangle size={40} className="text-destructive/40" />
            <p className="text-sm text-muted-foreground">Failed to load encounters. {error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3">
            <Activity size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No encounters match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-border bg-muted">
                <tr>
                  {["Patient", "Date", "Presenting Complaint", "Clinician", "Unit", "Diagnoses", "Status", ""].map(
                    h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map(enc => (
                  <tr key={enc.id} className="group transition-colors hover:bg-muted/40">
                    {/* Patient */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {enc.patientInitials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{enc.patientName}</p>
                          <p className="text-xs text-muted-foreground">{enc.patientNumber}</p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {enc.date}
                    </td>

                    {/* Complaint */}
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="line-clamp-2 text-sm text-foreground">{enc.complaint}</p>
                    </td>

                    {/* Clinician */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {enc.clinician}
                    </td>

                    {/* Unit */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {enc.unit}
                    </td>

                    {/* Diagnoses */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {enc.diagnoses > 0 ? enc.diagnoses : <span className="text-muted-foreground/50">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={enc.status} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <Link
                        to={`/patients/${enc.patientId}/encounters/${enc.id}`}
                        className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                      >
                        View <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} encounters
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
      )}
    </div>
  )
}
