import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// ── Types ─────────────────────────────────────────────────────────────────────

type RequestStatus = "Pending" | "Approved" | "Denied"
type TabKey = "incoming" | "outgoing" | "active" | "expired"

interface TransferRow {
  id: string
  requestingHospital: string
  requestingPhysician: string
  patientName: string
  patientDob: string
  accessType: string
  received: string
  status: RequestStatus
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_TRANSFERS: TransferRow[] = [
  {
    id: "tr-001",
    requestingHospital: "Mercy General Hospital",
    requestingPhysician: "Dr. Sarah Jenkins",
    patientName: "Alvarez, Maria",
    patientDob: "1982-04-15",
    accessType: "Full Chart (72h)",
    received: "2 hours ago",
    status: "Pending",
  },
  {
    id: "tr-002",
    requestingHospital: "Valley View Clinic",
    requestingPhysician: "Dr. Robert Chen",
    patientName: "Smith, James T.",
    patientDob: "1955-11-02",
    accessType: "Imaging Only",
    received: "5 hours ago",
    status: "Pending",
  },
  {
    id: "tr-003",
    requestingHospital: "St. Jude Medical",
    requestingPhysician: "Dr. Emily Watts",
    patientName: "Johnson, Kevin",
    patientDob: "1990-08-22",
    accessType: "Lab Results",
    received: "Yesterday, 14:30",
    status: "Approved",
  },
  {
    id: "tr-004",
    requestingHospital: "Northside Rehab",
    requestingPhysician: "Admin Staff",
    patientName: "Williams, Brenda",
    patientDob: "1948-01-10",
    accessType: "Full Chart (Ongoing)",
    received: "Oct 24, 09:15",
    status: "Denied",
  },
]

const PAGE_SIZE = 10

// ── Active grants mock (REQ-F-053: revocation) ────────────────────────────────

interface ActiveGrant {
  id: string
  hospital: string
  patientName: string
  accessType: string
  expiresOn: string
}

const MOCK_ACTIVE_GRANTS: ActiveGrant[] = [
  { id: "ag-001", hospital: "St. Jude Medical",     patientName: "Johnson, Kevin", accessType: "Lab Results",    expiresOn: "Oct 25, 2023 at 09:41" },
  { id: "ag-002", hospital: "Mercy General",         patientName: "Diallo, Amina",  accessType: "Full Chart",     expiresOn: "Oct 26, 2023 at 14:00" },
  { id: "ag-003", hospital: "Valley View Clinic",    patientName: "Nkeng, Mary",    accessType: "Imaging Only",   expiresOn: "Oct 28, 2023 at 10:00" },
]

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RequestStatus }) {
  if (status === "Pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-0.5 text-xs font-medium text-[#78350F]">
        <Clock size={10} /> Pending
      </span>
    )
  if (status === "Approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
        <CheckCircle size={10} /> Approved
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
      <XCircle size={10} /> Denied
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; count?: number }[] = [
  { key: "incoming", label: "Incoming Requests", count: 12 },
  { key: "outgoing", label: "Outgoing Requests" },
  { key: "active",   label: "Active Grants" },
  { key: "expired",  label: "Expired Grants" },
]

export function TransfersListPage() {
  const navigate = useNavigate()
  const [activeTab,    setActiveTab]    = useState<TabKey>("incoming")
  const [page,         setPage]         = useState(1)
  const [revokedIds,   setRevokedIds]   = useState<Set<string>>(new Set())

  function handleRevoke(grant: ActiveGrant) {
    setRevokedIds(prev => new Set([...prev, grant.id]))
    toast.success("Access revoked", {
      description: `${grant.hospital}'s access to ${grant.patientName} has been revoked immediately.`,
    })
  }

  const totalPages = Math.max(1, Math.ceil(MOCK_TRANSFERS.length / PAGE_SIZE))
  const pageRows   = MOCK_TRANSFERS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Patient Transfers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage external requests and cross-facility patient data access.
          </p>
        </div>
        <Button onClick={() => navigate("/transfers/request/new")} className="gap-2">
          <Plus size={16} /> New Transfer Request
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Incoming</p>
              <p className="mt-1 text-4xl font-bold text-foreground">12</p>
              <p className="mt-1 text-xs text-[#10B981]">+3 today</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Clock size={20} className="text-[#F59E0B]" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Grants</p>
              <p className="mt-1 text-4xl font-bold text-foreground">148</p>
              <p className="mt-1 text-xs text-muted-foreground">total</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck size={20} className="text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Security audit alert */}
      <div className="flex items-center justify-between rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#F59E0B]" />
          <p className="text-sm font-medium text-[#78350F] dark:text-[#F59E0B]">
            Security Audit — Review expiring grants. 5 grants expire within 48 hours.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#78350F] underline-offset-2 hover:underline dark:text-[#F59E0B]"
        >
          Review <ArrowRight size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setPage(1) }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0 text-xs font-semibold text-primary">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table — Incoming / Outgoing / Expired */}
        {activeTab !== "active" && (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-border bg-muted">
                  <tr>
                    {["Requesting Hospital", "Patient Name", "Access Type", "Received", "Status", "Action"].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageRows.map(row => (
                    <tr key={row.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{row.requestingHospital}</p>
                        <p className="text-xs text-muted-foreground">{row.requestingPhysician}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{row.patientName}</p>
                        <p className="text-xs text-muted-foreground">DOB: {row.patientDob}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                        {row.accessType}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                        {row.received}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "Pending" ? (
                          <Link
                            to={`/transfers/requests/${row.id}`}
                            className="inline-flex items-center rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                          >
                            Review
                          </Link>
                        ) : (
                          <Link
                            to={`/transfers/requests/${row.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {row.status === "Approved" ? "View Details" : "View Reason"}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Grants table — REQ-F-053 revocation UI */}
        {activeTab === "active" && (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-border bg-muted">
                  <tr>
                    {["Receiving Hospital", "Patient Name", "Access Type", "Expires On", "Action"].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_ACTIVE_GRANTS.map(grant => {
                    const revoked = revokedIds.has(grant.id)
                    return (
                      <tr key={grant.id} className={`transition-colors hover:bg-muted/40 ${revoked ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{grant.hospital}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {grant.patientName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                          {grant.accessType}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {grant.expiresOn}
                        </td>
                        <td className="px-4 py-3">
                          {revoked ? (
                            <span className="text-xs text-muted-foreground">Revoked</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevoke(grant)}
                              className="inline-flex items-center gap-1 rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5"
                            >
                              <ShieldOff size={12} /> Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Showing 1 to {pageRows.length} of 24 requests
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="min-w-16 text-center text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
