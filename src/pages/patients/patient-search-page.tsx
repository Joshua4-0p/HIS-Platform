import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import {
  Search,
  UserPlus,
  CheckCircle,
  Clock,
  XCircle,
  UserX,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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

// ── Mock data ─────────────────────────────────────────────────────

const ALL_PATIENTS: Patient[] = [
  { id: "1",  patientId: "CMR-89214", name: "Aisha Ndiaye",        dob: "12/04/1985", phone: "+237 6 78 90 12 34", region: "Centre (Yaoundé)",       registered: "Oct 12, 2023", consentStatus: "Granted" },
  { id: "2",  patientId: "CMR-74102", name: "Jean-Pierre Eto'o",   dob: "05/11/1992", phone: "+237 6 99 11 22 33", region: "Littoral (Douala)",       registered: "Nov 04, 2023", consentStatus: "Pending" },
  { id: "3",  patientId: "CMR-90553", name: "Marie Abanda",        dob: "22/08/1978", phone: "+237 6 55 44 33 22", region: "West (Bafoussam)",        registered: "Sep 28, 2023", consentStatus: "Refused" },
  { id: "4",  patientId: "CMR-11209", name: "Paul Biya Jr.",       dob: "13/02/1945", phone: "+237 6 12 34 56 78", region: "South (Sangmélima)",      registered: "Jan 15, 2024", consentStatus: "Granted" },
  { id: "5",  patientId: "CMR-33417", name: "Fatima Moussa",       dob: "07/09/2000", phone: "+237 6 22 33 44 55", region: "North (Garoua)",          registered: "Feb 20, 2024", consentStatus: "Granted" },
  { id: "6",  patientId: "CMR-56789", name: "Emmanuel Njoya",      dob: "14/03/1975", phone: "+237 6 77 88 99 00", region: "Far North (Maroua)",      registered: "Mar 05, 2024", consentStatus: "Pending" },
  { id: "7",  patientId: "CMR-67890", name: "Grace Atanga",        dob: "29/12/1988", phone: "+237 6 44 55 66 77", region: "North West (Bamenda)",    registered: "Apr 10, 2024", consentStatus: "Granted" },
  { id: "8",  patientId: "CMR-78901", name: "Roger Mbappé",        dob: "18/07/1965", phone: "+237 6 11 22 33 44", region: "South West (Buea)",       registered: "May 01, 2024", consentStatus: "Refused" },
  { id: "9",  patientId: "CMR-90123", name: "Sylvie Bello",        dob: "03/06/1991", phone: "+237 6 55 11 22 33", region: "Adamawa (Ngaoundéré)",   registered: "Jun 12, 2024", consentStatus: "Granted" },
  { id: "10", patientId: "CMR-01234", name: "Théodore Nkemelu",   dob: "21/10/1983", phone: "+237 6 88 44 55 66", region: "East (Bertoua)",          registered: "Jul 01, 2024", consentStatus: "Pending" },
  { id: "11", patientId: "CMR-12345", name: "Brigitte Ewane",      dob: "09/01/1979", phone: "+237 6 33 77 88 99", region: "South (Ebolowa)",         registered: "Jul 18, 2024", consentStatus: "Granted" },
  { id: "12", patientId: "CMR-23456", name: "Cédric Kamdem",      dob: "17/05/1990", phone: "+237 6 66 22 11 44", region: "West (Dschang)",          registered: "Aug 04, 2024", consentStatus: "Granted" },
]

const PAGE_SIZE = 5

// ── Derived stats (from full dataset, not search results) ─────────

const STATS = {
  total: ALL_PATIENTS.length,
  granted: ALL_PATIENTS.filter((p) => p.consentStatus === "Granted").length,
  pendingOrRefused: ALL_PATIENTS.filter((p) => p.consentStatus !== "Granted").length,
  thisMonth: ALL_PATIENTS.filter((p) => {
    // Registered in the most recent month present in mock data
    return p.registered.startsWith("Aug") || p.registered.startsWith("Jul")
  }).length,
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
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [page, setPage] = useState(1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 300 ms debounce per UI-004
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) {
      setDebouncedQuery("")
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setIsSearching(false)
      setPage(1)
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  // When no query, show all patients; when query, filter
  const filtered = debouncedQuery
    ? ALL_PATIENTS.filter(
        (p) =>
          p.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          p.patientId.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          p.phone.includes(debouncedQuery)
      )
    : ALL_PATIENTS

  const totalResults = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const startIndex = (page - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalResults)
  const pageResults = filtered.slice(startIndex, endIndex)

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
          <Link to="/patients/new">
            <Button className="gap-2 whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus size={16} />
              Register New Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stat cards — always visible ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Patients" value={STATS.total} subtext="Registered in this facility"
          icon={<Users size={20} className="text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Consent Granted" value={STATS.granted} subtext="Active clinical records"
          icon={<CheckCircle size={20} className="text-[#10B981]" />} iconBg="bg-[#10B981]/10" />
        <StatCard label="Consent Pending / Refused" value={STATS.pendingOrRefused} subtext="Requires follow-up"
          icon={<AlertTriangle size={20} className="text-[#F59E0B]" />} iconBg="bg-[#F59E0B]/10" />
        <StatCard label="Registered This Month" value={STATS.thisMonth} subtext="New records this month"
          icon={<CalendarDays size={20} className="text-primary" />} iconBg="bg-primary/10" />
      </div>

      {/* ── Loading skeletons (only while debouncing a query) ── */}
      {isSearching && (
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

      {/* ── No results ── */}
      {!isSearching && debouncedQuery && filtered.length === 0 && (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card">
          <UserX size={48} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No patients found matching your search.</p>
          <Link to="/patients/new" className="text-sm font-medium text-primary hover:underline">
            Register as new patient?
          </Link>
        </div>
      )}

      {/* ── Patient table — shown always (all patients) or filtered ── */}
      {!isSearching && filtered.length > 0 && (
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
                      <Link to={`/patients/${patient.id}`}>
                        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                          View Profile
                        </Button>
                      </Link>
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
