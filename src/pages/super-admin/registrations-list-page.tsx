import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Building2, CheckCircle, Clock, Loader2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────

type RegStatus = "Pending" | "Approved" | "Rejected"

interface Registration {
  id: string
  name: string
  region: string
  facilityType: string
  adminEmail: string
  submittedDate: string
  status: RegStatus
}

const TABS = ["All", "Pending", "Approved", "Rejected"] as const
type TabValue = typeof TABS[number]

// ── Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: RegStatus }) {
  if (status === "Pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/15 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
        <Clock size={12} />
        Pending
      </span>
    )
  }
  if (status === "Approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 px-2.5 py-1 text-xs font-medium text-[#10B981]">
        <CheckCircle size={12} />
        Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
      <XCircle size={12} />
      Rejected
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function RegistrationsListPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("All")
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("his_id_token")
    fetch(`${API_BASE}/hospitals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setRegistrations(data.hospitals ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeTab === "All"
    ? registrations
    : registrations.filter((r) => r.status === activeTab)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-semibold text-foreground">Hospital Registrations</h1>

      {/* Filter tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {tab !== "All" && (
                <span className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === tab ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {registrations.filter((r) => r.status === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading registrations...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Building2 size={48} className="opacity-30" />
            <p className="text-sm">No registrations found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hospital Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region/District</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Facility Type</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Administrator Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted Date</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((reg) => (
                  <tr key={reg.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-4 text-sm font-medium text-foreground">{reg.name}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{reg.region}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{reg.facilityType}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{reg.adminEmail}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{reg.submittedDate}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/super-admin/registrations/${reg.id}`}
                        className="inline-flex items-center justify-center rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
