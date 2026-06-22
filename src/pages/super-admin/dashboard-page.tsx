import { Link } from "react-router-dom"
import {
  CheckCircle,
  Clock,
  Users,
  XCircle,
  ArrowRight,
  Download,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ── Mock data ─────────────────────────────────────────────────

const RECENT_REGISTRATIONS = [
  { id: "1", name: "Bamenda Regional Hospital",  region: "North West", type: "Public",  submittedOn: "2026-06-15", status: "Pending"  as const },
  { id: "2", name: "St Luke Catholic Hospital",  region: "Centre",     type: "Mission", submittedOn: "2026-06-14", status: "Approved" as const },
  { id: "3", name: "Yaoundé Private Clinic",     region: "Centre",     type: "Private", submittedOn: "2026-06-13", status: "Pending"  as const },
  { id: "4", name: "Douala General Hospital",    region: "Littoral",   type: "Public",  submittedOn: "2026-06-12", status: "Approved" as const },
  { id: "5", name: "Limbe District Hospital",    region: "South West", type: "Public",  submittedOn: "2026-06-11", status: "Rejected" as const },
]

const PLATFORM_HEALTH = [
  { label: "System Latency",  value: "14ms",        valueColor: "text-[#10B981]",  barWidth: "w-[85%]", barColor: "bg-[#10B981]" },
  { label: "Cloud Storage",   value: "1.2TB / 5TB", valueColor: "text-foreground", barWidth: "w-[24%]", barColor: "bg-primary"   },
]

const REGIONAL_COVERAGE = [
  { region: "Centre",     count: "08" },
  { region: "Littoral",   count: "06" },
  { region: "North West", count: "04" },
  { region: "South West", count: "05" },
]

type RegistrationStatus = "Pending" | "Approved" | "Rejected"

// ── Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: RegistrationStatus }) {
  if (status === "Pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/15 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
        <Clock size={12} /> Pending
      </span>
    )
  }
  if (status === "Approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 px-2.5 py-1 text-xs font-medium text-[#10B981]">
        <CheckCircle size={12} /> Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
      <XCircle size={12} /> Rejected
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
  function handleExportCsv() {
    toast.success("Export Started", {
      description: "Registration records are being exported as CSV. Your download will begin shortly.",
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Page header with Export CSV button ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Super Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of health infrastructure and system registration requests.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <Download size={16} className="text-muted-foreground" />
          Export as CSV
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Pending Registrations"
          value={7}
          subtext="+2 since yesterday"
          iconBg="bg-[#F59E0B]/10"
          icon={<Clock size={20} className="text-[#F59E0B]" />}
          href="/super-admin/registrations"
        />
        <StatCard
          label="Active Hospitals"
          value={23}
          subtext="Stable uptime"
          iconBg="bg-[#10B981]/10"
          icon={<CheckCircle size={20} className="text-[#10B981]" />}
          href="/super-admin/hospitals"
        />
        <StatCard
          label="Total Staff Accounts"
          value={148}
          subtext="Across all regions"
          iconBg="bg-primary/10"
          icon={<Users size={20} className="text-primary" />}
        />
      </div>

      {/* ── Recent Registration Requests ── */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Registration Requests</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-border bg-muted">
              <tr>
                {["Hospital Name", "Region/District", "Facility Type", "Submitted On", "Status", "Action"].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      "px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      i === 5 && "text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
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

        <div className="flex items-center justify-between border-t border-border bg-card px-6 py-3">
          <p className="text-xs text-muted-foreground">Showing 5 of 7 requests</p>
          <Link
            to="/super-admin/registrations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View All Registrations <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* ── Platform Health + Regional Coverage ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Platform Health */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold text-foreground">Platform Health</h3>

          <div className="space-y-5">
            {PLATFORM_HEALTH.map((metric) => (
              <div key={metric.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
                  <span className={cn("text-xs font-bold", metric.valueColor)}>{metric.value}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", metric.barColor, metric.barWidth)} />
                </div>
              </div>
            ))}

            {/* Active Admin Sessions — value only, no bar */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Active Admin Sessions</span>
              <span className="text-xs font-bold text-[#F59E0B]">12</span>
            </div>
          </div>

          {/* Sync status */}
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-start gap-3">
              <div className="mt-1.5 size-2 shrink-0 rounded-full bg-[#10B981]" />
              <div>
                <p className="text-xs font-semibold text-foreground">Data Synced Successfully</p>
                <p className="text-[10px] text-muted-foreground">Last sync: 2 minutes ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Coverage */}
        <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:col-span-2">
          {/* Decorative dot-grid background */}
          <div className="dot-grid-bg absolute inset-0 opacity-[0.04]" />
          {/* Teal gradient wash */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-muted/10" />

          <div className="relative z-10 flex h-full flex-col p-6">
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Regional Coverage</h3>
            </div>
            <p className="mb-8 text-xs text-muted-foreground">
              Distribution of registered facilities by province.
            </p>

            <div className="mt-auto grid grid-cols-2 gap-3 md:grid-cols-4">
              {REGIONAL_COVERAGE.map((r) => (
                <div
                  key={r.region}
                  className="rounded-lg border border-border bg-card/90 p-4 backdrop-blur-sm transition-shadow hover:shadow-sm"
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {r.region}
                  </p>
                  <p className="text-2xl font-bold text-primary">{r.count}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">facilities</p>
                </div>
              ))}
            </div>

            {/* Totals footer */}
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-xs text-muted-foreground">Total registered across all regions</span>
              <span className="text-sm font-bold text-primary">23 hospitals</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
