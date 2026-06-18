import { useState } from "react"
import { Link } from "react-router-dom"
import { UserPlus, Search, Pencil, UserX, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────

type StaffStatus = "Active" | "Deactivated"

interface StaffMember {
  id: string
  initials: string
  name: string
  email: string
  role: string
  region: string
  status: StaffStatus
  createdAt: string
}

// ── Mock data ─────────────────────────────────────────────────

const ALL_STAFF: StaffMember[] = [
  { id: "1",  initials: "JS", name: "Dr. Jane Smith",     email: "jane.smith@his.med",   role: "Doctor",               region: "North West",  status: "Active",      createdAt: "Oct 12, 2023" },
  { id: "2",  initials: "MJ", name: "Michael Johnson",   email: "m.johnson@his.med",    role: "Hospital Admin",       region: "Centre",      status: "Active",      createdAt: "Sep 05, 2023" },
  { id: "3",  initials: "RW", name: "Robert Williams",   email: "r.williams@his.med",   role: "Nurse",                region: "South West",  status: "Deactivated", createdAt: "Jul 22, 2023" },
  { id: "4",  initials: "EC", name: "Emily Chen",        email: "e.chen@his.med",       role: "Data Clerk",           region: "Littoral",    status: "Active",      createdAt: "Nov 01, 2023" },
  { id: "5",  initials: "PM", name: "Paul Mbah",         email: "p.mbah@his.med",       role: "Laboratory Tech",      region: "North West",  status: "Active",      createdAt: "Jan 10, 2024" },
  { id: "6",  initials: "AN", name: "Alice Ngo",         email: "a.ngo@his.med",        role: "Receptionist",         region: "Centre",      status: "Active",      createdAt: "Feb 14, 2024" },
  { id: "7",  initials: "BF", name: "Bertrand Fouda",    email: "b.fouda@his.med",      role: "Doctor",               region: "Littoral",    status: "Deactivated", createdAt: "Mar 20, 2024" },
  { id: "8",  initials: "CN", name: "Cécile Nguema",    email: "c.nguema@his.med",     role: "Nurse",                region: "Centre",      status: "Active",      createdAt: "Apr 02, 2024" },
  { id: "9",  initials: "DT", name: "David Tamba",       email: "d.tamba@his.med",      role: "Laboratory Tech",      region: "West",        status: "Active",      createdAt: "May 17, 2024" },
  { id: "10", initials: "EK", name: "Eva Kom",           email: "e.kom@his.med",        role: "Data Clerk",           region: "South West",  status: "Active",      createdAt: "Jun 03, 2024" },
  { id: "11", initials: "FA", name: "Frédéric Abah",   email: "f.abah@his.med",       role: "Hospital Admin",       region: "West",        status: "Active",      createdAt: "Jun 25, 2024" },
  { id: "12", initials: "GL", name: "Grâce Loko",       email: "g.loko@his.med",       role: "Receptionist",         region: "North",       status: "Active",      createdAt: "Jul 08, 2024" },
]

const ROLES = ["All Roles", "Hospital Admin", "Doctor", "Nurse", "Laboratory Tech", "Receptionist", "Data Clerk"]
const REGIONS = ["All Regions", "Centre", "Littoral", "North West", "South West", "West", "North"]
const STATUSES = ["All Statuses", "Active", "Deactivated"]

const PAGE_SIZE = 8

// ── Status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: StaffStatus }) {
  if (status === "Active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-xs font-medium text-[#10B981]">
        <CheckCircle size={12} />
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
      <XCircle size={12} />
      Deactivated
    </span>
  )
}

// ── Role badge ────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {role}
    </span>
  )
}

// ── Deactivate dialog ─────────────────────────────────────────

function DeactivateDialog({
  staff,
  open,
  onOpenChange,
  onConfirm,
}: {
  staff: StaffMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  if (!staff) return null
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <UserX size={18} className="text-destructive" />
            </div>
            Deactivate Staff Account
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-4 text-sm text-muted-foreground">
              <p>
                You are about to deactivate the staff account for{" "}
                <strong className="font-semibold text-foreground">{staff.name}</strong>. This action will
                immediately revoke their access to the HIS Portal and all associated clinical applications.
              </p>
              {/* Amber warning box */}
              <div className="flex items-start gap-3 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4">
                <XCircle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">Immediate Session Revocation</span>
                  <span className="text-xs text-muted-foreground">
                    This action revokes all active Cognito sessions immediately. The user will be forcibly
                    logged out of all connected devices and will be unable to log back in.
                  </span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
          >
            <UserX size={16} />
            Deactivate Account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function StaffListPage() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All Roles")
  const [regionFilter, setRegionFilter] = useState("All Regions")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [page, setPage] = useState(1)
  const [staff, setStaff] = useState(ALL_STAFF)
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null)

  const filtered = staff.filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    const matchesRole = roleFilter === "All Roles" || s.role === roleFilter
    const matchesRegion = regionFilter === "All Regions" || s.region === regionFilter
    const matchesStatus = statusFilter === "All Statuses" || s.status === statusFilter
    return matchesSearch && matchesRole && matchesRegion && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetFilters() {
    setSearch("")
    setRoleFilter("All Roles")
    setRegionFilter("All Regions")
    setStatusFilter("All Statuses")
    setPage(1)
  }

  function handleDeactivate() {
    if (!deactivateTarget) return
    setStaff((prev) =>
      prev.map((s) => s.id === deactivateTarget.id ? { ...s, status: "Deactivated" as const } : s)
    )
    toast.success("Account Deactivated", {
      description: `${deactivateTarget.name}'s access has been revoked and all sessions invalidated.`,
    })
    setDeactivateTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Staff Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage administrative and clinical staff access to the portal.
          </p>
        </div>
        <Link
          to="/staff/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <UserPlus size={16} />
          Add Staff Member
        </Link>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        {/* Search */}
        <div className="relative min-w-52 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>

        <span className="text-sm font-medium text-muted-foreground">Filters:</span>

        {/* Role */}
        <div className="relative min-w-36">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">▼</span>
        </div>

        {/* Region */}
        <div className="relative min-w-36">
          <select
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setPage(1) }}
            className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">▼</span>
        </div>

        {/* Status */}
        <div className="relative min-w-36">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">▼</span>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="ml-auto text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          Clear Filters
        </button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Search size={48} className="opacity-25" />
            <p className="text-sm">No staff members found.</p>
            <Link to="/staff/new" className="text-sm text-primary underline-offset-4 hover:underline">
              Add your first staff member
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Region</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((member) => (
                  <tr
                    key={member.id}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      member.status === "Deactivated" && "text-muted-foreground opacity-60"
                    )}
                  >
                    {/* Name with avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          member.status === "Active"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {member.initials}
                        </div>
                        <span className="text-sm font-medium text-foreground">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{member.region}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{member.createdAt}</td>
                    {/* Actions — always visible */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/staff/${member.id}/edit`}
                          title="Edit"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                        >
                          <Pencil size={16} />
                        </Link>
                        {member.status === "Active" && (
                          <button
                            type="button"
                            title="Deactivate"
                            onClick={() => setDeactivateTarget(member)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <UserX size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-card px-6 py-4">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} results
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .map((n, idx, arr) => (
                  <span key={n}>
                    {idx > 0 && arr[idx - 1] !== n - 1 && (
                      <span className="px-1 text-sm text-muted-foreground">…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        "min-w-8 rounded-md px-2 py-1 text-sm font-medium transition-colors",
                        n === page
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {n}
                    </button>
                  </span>
                ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deactivate dialog (UI-010) */}
      <DeactivateDialog
        staff={deactivateTarget}
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
      />
    </div>
  )
}
