import { useState } from "react"
import { Search, CheckCircle, Clock, XCircle, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────

type HospitalStatus = "Active" | "Suspended" | "Pending"

interface Hospital {
  id: string
  name: string
  region: string
  type: string
  status: HospitalStatus
  registeredDate: string
}

// ── Mock data ─────────────────────────────────────────────────

const HOSPITALS: Hospital[] = [
  { id: "1", name: "Central Hospital Yaoundé", region: "Centre", type: "Public General", status: "Active", registeredDate: "12 Jan 2023" },
  { id: "2", name: "Laquintinie Hospital Douala", region: "Littoral", type: "Public General", status: "Active", registeredDate: "15 Jan 2023" },
  { id: "3", name: "Baptist Hospital Mutengene", region: "South West", type: "Mission", status: "Active", registeredDate: "20 Jan 2023" },
  { id: "4", name: "General Hospital Yaoundé", region: "Centre", type: "Reference", status: "Active", registeredDate: "05 Feb 2023" },
  { id: "5", name: "Regional Hospital Bamenda", region: "North West", type: "Regional", status: "Suspended", registeredDate: "10 Feb 2023" },
  { id: "6", name: "Shisong Cardiac Centre", region: "North West", type: "Specialized", status: "Active", registeredDate: "18 Mar 2023" },
  { id: "7", name: "Bafoussam Regional Hospital", region: "West", type: "Regional", status: "Pending", registeredDate: "22 Apr 2023" },
  { id: "8", name: "Garoua Regional Hospital", region: "North", type: "Regional", status: "Active", registeredDate: "05 May 2023" },
  { id: "9", name: "Maroua District Hospital", region: "Far North", type: "Public General", status: "Active", registeredDate: "12 Jun 2023" },
  { id: "10", name: "Ebolowa Provincial Hospital", region: "South", type: "Provincial", status: "Active", registeredDate: "30 Jun 2023" },
]

const PAGE_SIZE = 8

// ── Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: HospitalStatus }) {
  if (status === "Active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 px-2.5 py-1 text-xs font-medium text-[#10B981]">
        <CheckCircle size={12} />
        Active
      </span>
    )
  }
  if (status === "Suspended") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
        <XCircle size={12} />
        Suspended
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/15 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
      <Clock size={12} />
      Pending
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function AllHospitalsPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const filtered = HOSPITALS.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.region.toLowerCase().includes(search.toLowerCase()) ||
    h.type.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Page header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">All Hospitals</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search hospitals..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Search size={48} className="opacity-30" />
            <p className="text-sm">No hospitals found matching &ldquo;{search}&rdquo;.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hospital Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registered Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((hospital) => (
                  <tr key={hospital.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{hospital.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{hospital.region}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{hospital.type}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={hospital.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{hospital.registeredDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`View ${hospital.name}`}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className={cn(
          "flex items-center justify-between border-t border-border bg-card px-6 py-4",
          filtered.length === 0 && "hidden"
        )}>
          <span className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} hospitals
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
