import { useState } from "react"
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

const PAGE_SIZE = 5

// ── Types ─────────────────────────────────────────────────────

type EncStatus = "Completed" | "In Progress" | "Missed"

interface EncounterRow {
  id: string
  patientId: string
  patientName: string
  patientInitials: string
  date: string
  complaint: string
  clinician: string
  unit: string
  diagnoses: number
  status: EncStatus
}

// ── Mock data ─────────────────────────────────────────────────

const ALL_ENCOUNTERS: EncounterRow[] = [
  { id: "enc-001", patientId: "HIS-001234", patientName: "Ayuk Emmanuel",    patientInitials: "AE", date: "Today, 10:30", complaint: "Stable blood pressure, mild fatigue",             clinician: "Dr. Ekane Paul",   unit: "Cardiology",       diagnoses: 2, status: "In Progress" },
  { id: "enc-002", patientId: "HIS-001235", patientName: "Nkeng Bernadette", patientInitials: "NB", date: "Today, 09:00", complaint: "High fever and chills since yesterday",            clinician: "Dr. Mbi Alice",    unit: "Internal Medicine", diagnoses: 1, status: "Completed"   },
  { id: "enc-003", patientId: "HIS-001236", patientName: "Fon Emmanuel",     patientInitials: "FE", date: "Today, 08:15", complaint: "Severe headache and blurred vision",              clinician: "Dr. Ekane Paul",   unit: "Neurology",        diagnoses: 0, status: "In Progress" },
  { id: "enc-004", patientId: "HIS-001237", patientName: "Mbah Claudette",   patientInitials: "MC", date: "Yesterday, 14:45", complaint: "Persistent dry cough for 3 weeks",           clinician: "Dr. Mbi Alice",    unit: "Pulmonology",      diagnoses: 2, status: "Completed"   },
  { id: "enc-005", patientId: "HIS-001238", patientName: "Tabi Innocent",    patientInitials: "TI", date: "Yesterday, 11:00", complaint: "Sharp abdominal pain after meals",           clinician: "Dr. Ekane Paul",   unit: "General Surgery",  diagnoses: 1, status: "Completed"   },
  { id: "enc-006", patientId: "HIS-001239", patientName: "Ashu Grace",       patientInitials: "AG", date: "Yesterday, 09:30", complaint: "Routine ante-natal check-up, 28 weeks",     clinician: "Dr. Nkamla Rose",  unit: "Obstetrics",       diagnoses: 0, status: "Missed"      },
  { id: "enc-007", patientId: "HIS-001234", patientName: "Ayuk Emmanuel",    patientInitials: "AE", date: "Oct 12, 2023",    complaint: "Severe chest pain, shortness of breath",      clinician: "Dr. Mbi Alice",    unit: "Emergency Dept.",  diagnoses: 3, status: "Completed"   },
  { id: "enc-008", patientId: "HIS-001240", patientName: "Che Perpetua",     patientInitials: "CP", date: "Oct 11, 2023",    complaint: "Painful urination and lower back pain",       clinician: "Dr. Nkamla Rose",  unit: "Urology",          diagnoses: 1, status: "Completed"   },
  { id: "enc-009", patientId: "HIS-001241", patientName: "Ndoh Francis",     patientInitials: "NF", date: "Oct 10, 2023",    complaint: "Follow-up for diabetic foot ulcer management", clinician: "Dr. Ekane Paul",   unit: "Internal Medicine", diagnoses: 2, status: "Missed"     },
  { id: "enc-010", patientId: "HIS-001242", patientName: "Lum Adeline",      patientInitials: "LA", date: "Oct 09, 2023",    complaint: "Dizziness and shortness of breath on exertion", clinician: "Dr. Mbi Alice",  unit: "Cardiology",       diagnoses: 1, status: "Completed"   },
]

// ── Metric cards ──────────────────────────────────────────────

const METRICS = [
  {
    label:   "Total This Week",
    value:   24,
    sub:     "+3 from last week",
    icon:    Stethoscope,
    iconCls: "text-primary",
    bgCls:   "bg-primary/10",
  },
  {
    label:   "Completed",
    value:   18,
    sub:     "75% completion rate",
    icon:    CheckCircle,
    iconCls: "text-[#10B981]",
    bgCls:   "bg-[#10B981]/10",
  },
  {
    label:   "In Progress",
    value:   3,
    sub:     "Active right now",
    icon:    Clock,
    iconCls: "text-[#F59E0B]",
    bgCls:   "bg-[#F59E0B]/10",
  },
  {
    label:   "Missed / No-show",
    value:   3,
    sub:     "Requires follow-up",
    icon:    XCircle,
    iconCls: "text-destructive",
    bgCls:   "bg-destructive/10",
  },
]

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

// ── Page ──────────────────────────────────────────────────────

function exportCSV(rows: EncounterRow[]) {
  const header = ["Patient", "Patient ID", "Date", "Complaint", "Clinician", "Unit", "Diagnoses", "Status"]
  const lines  = rows.map(e =>
    [e.patientName, e.patientId, e.date, `"${e.complaint}"`, e.clinician, e.unit, e.diagnoses, e.status].join(","),
  )
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = "encounters.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function EncountersDashboardPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<EncStatus | "All">("All")
  const [page,   setPage]   = useState(1)

  const filtered = ALL_ENCOUNTERS.filter(e => {
    const matchStatus = filter === "All" || e.status === filter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      e.patientName.toLowerCase().includes(q) ||
      e.patientId.toLowerCase().includes(q) ||
      e.complaint.toLowerCase().includes(q) ||
      e.clinician.toLowerCase().includes(q) ||
      e.unit.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
              <p className="mt-0.5 text-3xl font-bold text-foreground">{m.value}</p>
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
        {filtered.length === 0 ? (
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
                  <tr
                    key={enc.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    {/* Patient */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {enc.patientInitials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{enc.patientName}</p>
                          <p className="text-xs text-muted-foreground">{enc.patientId}</p>
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
    </div>
  )
}
