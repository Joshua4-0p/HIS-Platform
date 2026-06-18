import { Link } from "react-router-dom"
import { CheckCircle, Clock, Users, XCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Mock data ─────────────────────────────────────────────────

const RECENT_REGISTRATIONS = [
  { id: "1", name: "Bamenda Regional Hospital", region: "North West", type: "Public", submittedOn: "2026-06-15", status: "Pending" as const },
  { id: "2", name: "St Luke Catholic Hospital", region: "Centre", type: "Mission", submittedOn: "2026-06-14", status: "Approved" as const },
  { id: "3", name: "Yaoundé Private Clinic", region: "Centre", type: "Private", submittedOn: "2026-06-13", status: "Pending" as const },
  { id: "4", name: "Douala General Hospital", region: "Littoral", type: "Public", submittedOn: "2026-06-12", status: "Approved" as const },
  { id: "5", name: "Limbe District Hospital", region: "South West", type: "Public", submittedOn: "2026-06-11", status: "Rejected" as const },
]

type RegistrationStatus = "Pending" | "Approved" | "Rejected"

// ── Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: RegistrationStatus }) {
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

// ── Stat Card ─────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  subtext?: string
  icon: React.ReactNode
  iconBg: string
  href?: string
}

function StatCard({ label, value, subtext, icon, iconBg, href }: StatCardProps) {
  const inner = (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-4xl font-bold text-foreground">{value}</p>
          {subtext && <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>}
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  )

  if (href) return <Link to={href} className="block transition-opacity hover:opacity-90">{inner}</Link>
  return inner
}

// ── Page ──────────────────────────────────────────────────────

export function SuperAdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Super Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of platform activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Pending Registrations"
          value={7}
          subtext="Awaiting review"
          iconBg="bg-[#F59E0B]/10"
          icon={<Clock size={20} className="text-[#F59E0B]" />}
          href="/super-admin/registrations"
        />
        <StatCard
          label="Active Hospitals"
          value={23}
          iconBg="bg-[#10B981]/10"
          icon={<CheckCircle size={20} className="text-[#10B981]" />}
          href="/super-admin/hospitals"
        />
        <StatCard
          label="Total Staff Accounts"
          value={148}
          iconBg="bg-primary/10"
          icon={<Users size={20} className="text-primary" />}
        />
      </div>

      {/* Recent Registration Requests */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Registration Requests</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hospital Name</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region/District</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Facility Type</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted On</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_REGISTRATIONS.map((reg) => (
                <tr key={reg.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{reg.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{reg.region}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{reg.type}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{reg.submittedOn}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={reg.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/super-admin/registrations/${reg.id}`}
                      className="inline-flex items-center justify-center rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border bg-card px-6 py-3">
          <Link
            to="/super-admin/registrations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View All Registrations
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
