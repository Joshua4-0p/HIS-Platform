import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Search,
  UserPlus,
  CheckCircle,
  Clock,
  Download,
  XCircle,
  UserX,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  CalendarDays,
  Loader2,
  Pencil,
  UserMinus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────

type ConsentStatus = "Granted" | "Pending" | "Refused"

interface Patient {
  id: string
  patientId: string
  name: string
  dob: string
  phone: string
  region: string
  registered: string
  consentStatus: ConsentStatus
}

interface Stats {
  total: number
  granted: number
  pendingOrRefused: number
  thisMonth: number
}

const PAGE_SIZE = 5

// ── CSV export ────────────────────────────────────────────────────

function exportPatientsCsv(rows: Patient[], filename: string) {
  const headers = ["Patient ID", "Name", "DOB", "Phone", "Region", "Registered", "Consent Status"]
  const lines = [
    headers.join(","),
    ...rows.map(p =>
      [p.patientId, p.name, p.dob, p.phone, p.region, p.registered, p.consentStatus]
        .map(v => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Stat Card ─────────────────────────────────────────────────────

function StatCard({
  label, value, icon, iconBg, subtext,
}: { label: string; value: number | string; icon: React.ReactNode; iconBg: string; subtext?: string }) {
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

// ── Consent badge ─────────────────────────────────────────────────

function ConsentBadge({ status }: { status: ConsentStatus }) {
  if (status === "Granted")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 px-2.5 py-1 text-xs font-medium text-[#10B981]">
        <CheckCircle size={12} /> Granted
      </span>
    )
  if (status === "Pending")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/15 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
        <Clock size={12} /> Pending
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
      <XCircle size={12} /> Refused
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export function PatientSearchPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [query, setQuery]                   = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isSearching, setIsSearching]       = useState(false)
  const [page, setPage]                     = useState(1)
  const [patients, setPatients]             = useState<Patient[]>([])
  const [stats, setStats]                   = useState<Stats>({ total: 0, granted: 0, pendingOrRefused: 0, thisMonth: 0 })
  const [loading, setLoading]               = useState(true)
  const [deactivateTarget, setDeactivateTarget] = useState<Patient | null>(null)
  const [deactivating, setDeactivating]     = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchPatients(q?: string) {
    const token = localStorage.getItem("his_id_token")
    const url = q ? `${API_BASE}/patients?q=${encodeURIComponent(q)}` : `${API_BASE}/patients`
    try {
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) {
        setPatients(data.patients ?? [])
        if (data.stats) setStats(data.stats)
      }
    } catch { /* silently ignore */ }
  }

  // Initial load
  useEffect(() => {
    fetchPatients().finally(() => setLoading(false))
  }, [])

  // 300ms debounce per UI-004
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) {
      setDebouncedQuery("")
      setIsSearching(false)
      fetchPatients()
      return
    }
    setIsSearching(true)
    timerRef.current = setTimeout(async () => {
      setDebouncedQuery(query.trim())
      await fetchPatients(query.trim())
      setIsSearching(false)
      setPage(1)
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  async function handleDeactivate(patient: Patient) {
    setDeactivating(true)
    const token = localStorage.getItem("his_id_token")
    try {
      const res = await fetch(`${API_BASE}/patients/${patient.id}/deactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Deactivated via patient list" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string }
        toast.error(err.message ?? "Failed to deactivate patient.")
        return
      }
      toast.success(`${patient.name} has been deactivated.`)
      setDeactivateTarget(null)
      setPatients((prev) => prev.filter((p) => p.id !== patient.id))
      setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }))
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setDeactivating(false)
    }
  }

  const totalResults = patients.length
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const startIndex = (page - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalResults)
  const pageResults = patients.slice(startIndex, endIndex)

  function pageNumbers(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, "...", totalPages]
    if (page >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages]
    return [1, "...", page - 1, page, page + 1, "...", totalPages]
  }

  return (
    <div className="space-y-6">
      {/* ── Header row ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Patients</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, phone number, or Patient ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => exportPatientsCsv(patients, "patients.csv")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Download size={16} /> Export CSV
          </button>
          <Link to="/patients/new">
            <Button className="gap-2 whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus size={16} />
              Register New Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Patients" value={loading ? "—" : stats.total} subtext="Registered in this facility"
          icon={<Users size={20} className="text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Consent Granted" value={loading ? "—" : stats.granted} subtext="Active clinical records"
          icon={<CheckCircle size={20} className="text-[#10B981]" />} iconBg="bg-[#10B981]/10" />
        <StatCard label="Consent Pending / Refused" value={loading ? "—" : stats.pendingOrRefused} subtext="Requires follow-up"
          icon={<AlertTriangle size={20} className="text-[#F59E0B]" />} iconBg="bg-[#F59E0B]/10" />
        <StatCard label="Registered This Month" value={loading ? "—" : stats.thisMonth} subtext="New records this month"
          icon={<CalendarDays size={20} className="text-primary" />} iconBg="bg-primary/10" />
      </div>

      {/* ── Initial loading ── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading patients...</span>
        </div>
      )}

      {/* ── Search skeleton ── */}
      {!loading && isSearching && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted">
                {["Patient ID","Name","DOB","Phone","Region","Registered","Consent Status","Actions"].map((col) => (
                  <th key={col} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Deactivate confirmation dialog ── */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Deactivate Patient Record</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to deactivate <span className="font-medium text-foreground">{deactivateTarget.name}</span>?
              This patient will no longer appear in search results. The record is retained for audit purposes.
            </p>
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              Patient ID: {deactivateTarget.patientId}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeactivateTarget(null)} disabled={deactivating}>
                Cancel
              </Button>
              <Button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => handleDeactivate(deactivateTarget)}
                disabled={deactivating}
              >
                {deactivating ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                {deactivating ? "Deactivating..." : "Confirm Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── No results ── */}
      {!loading && !isSearching && debouncedQuery && patients.length === 0 && (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card">
          <UserX size={48} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No patients found matching your search.</p>
          <Link to="/patients/new" className="text-sm font-medium text-primary hover:underline">
            Register as new patient?
          </Link>
        </div>
      )}

      {/* ── Patient table ── */}
      {!loading && !isSearching && patients.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient ID</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">DOB</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Region</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consent Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageResults.map((patient) => (
                  <tr key={patient.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-foreground">{patient.patientId}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{patient.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{patient.dob}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{patient.phone}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{patient.region}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{patient.registered}</td>
                    <td className="px-4 py-3"><ConsentBadge status={patient.consentStatus} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/patients/${patient.id}`}>
                          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                            View
                          </Button>
                        </Link>
                        {hasPermission("patient:update") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/patients/${patient.id}/edit`)}
                          >
                            <Pencil size={14} />
                          </Button>
                        )}
                        {hasPermission("patient:delete") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setDeactivateTarget(patient)}
                          >
                            <UserMinus size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startIndex + 1}</span>–
              <span className="font-medium text-foreground">{endIndex}</span> of{" "}
              <span className="font-medium text-foreground">{totalResults}</span> results
            </p>
            <nav className="flex items-center gap-1">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex size-8 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              {pageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="flex size-8 items-center justify-center text-sm text-muted-foreground">…</span>
                ) : (
                  <button key={p} type="button" onClick={() => setPage(p as number)}
                    className={cn("flex size-8 items-center justify-center rounded border text-sm font-medium transition-colors",
                      p === page ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted")}>
                    {p}
                  </button>
                )
              )}
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex size-8 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
