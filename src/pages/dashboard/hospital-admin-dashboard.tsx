import { Download, FlaskConical, Info, Stethoscope, UserCog, Users } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ── Mock data ─────────────────────────────────────────────────────────────────

const STATS = {
  registrations: 1248,
  encounters:    3892,
  labTat:        4.2,
  staff:         412,
}

const DIAGNOSES = [
  { name: "Malaria",       count: 342 },
  { name: "Hypertension",  count: 287 },
  { name: "Type 2 DM",     count: 201 },
  { name: "URI",           count: 178 },
  { name: "Anaemia",       count: 156 },
]

const TREND = [
  { month: "Jun", encounters: 312 },
  { month: "Jul", encounters: 298 },
  { month: "Aug", encounters: 401 },
  { month: "Sep", encounters: 387 },
  { month: "Oct", encounters: 412 },
  { month: "Nov", encounters: 445 },
]

const STAFF_ACTIVITY = [
  { initials: "AS", name: "Dr. Alice Smith",   role: "Doctor",          encounters: 142, lastActive: "10 mins ago"   },
  { initials: "BJ", name: "Nurse Bob Jones",   role: "Nurse",           encounters: 315, lastActive: "2 hours ago"   },
  { initials: "CD", name: "Dr. Charlie Davis", role: "Doctor",          encounters:  89, lastActive: "Yesterday"     },
  { initials: "EK", name: "Tech Elena Kohl",   role: "Lab Technician",  encounters: 210, lastActive: "Today 08:00"   },
  { initials: "MF", name: "Maria Fonkeng",     role: "Receptionist",    encounters: 178, lastActive: "30 mins ago"   },
]

// ── Tooltip styling for Recharts ──────────────────────────────────────────────

function ChartTooltipBox({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{payload[0].value.toLocaleString()}</p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HospitalAdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Hospital Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Central Hospital, Yaoundé</p>
      </div>

      {/* Row 1 — 4 KPI stat cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {/* Patient Registrations */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Patient Registrations This Month
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Users size={18} className="text-primary" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">
            {STATS.registrations.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#10B981]">+12% vs last month</p>
        </div>

        {/* Clinical Encounters */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Clinical Encounters This Month
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Stethoscope size={18} className="text-primary" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">
            {STATS.encounters.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#10B981]">+5.2% vs last month</p>
        </div>

        {/* Average Lab TAT */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <UiTooltip>
                <TooltipTrigger asChild>
                  <p className="inline-flex cursor-default items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Avg Lab Turnaround <Info size={12} className="text-muted-foreground" />
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-56">
                  <p>Average time between lab test request and result submission, for tests completed this month.</p>
                </TooltipContent>
              </UiTooltip>
            </TooltipProvider>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#10B981]/10">
              <FlaskConical size={18} className="text-[#10B981]" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">{STATS.labTat}</p>
          <p className="text-sm text-muted-foreground">hours</p>
        </div>

        {/* Active Staff */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active Staff Members
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <UserCog size={18} className="text-primary" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">{STATS.staff}</p>
          <p className="mt-1 text-xs text-[#10B981]">98% present today</p>
        </div>
      </div>

      {/* Row 2 — Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 5 Diagnoses (horizontal bar chart) */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Top 5 Diagnoses This Month</h2>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
              <Download size={13} /> Export PNG
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={DIAGNOSES}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltipBox />} cursor={{ fill: "#0D9488", fillOpacity: 0.08 }} />
              <Legend
                formatter={(v) => <span className="text-xs font-medium text-foreground">{v}</span>}
                wrapperStyle={{ paddingTop: 12 }}
              />
              <Bar dataKey="count" name="Cases" fill="#0D9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Encounters Trend (line chart) */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Encounters Trend</h2>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
              <Download size={13} /> Export PNG
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={TREND} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltipBox />} cursor={{ stroke: "#E2E8F0" }} />
              <Legend
                formatter={(v) => <span className="text-xs font-medium text-foreground">{v}</span>}
                wrapperStyle={{ paddingTop: 12 }}
              />
              <Line
                type="monotone"
                dataKey="encounters"
                name="Encounters"
                stroke="#0D9488"
                strokeWidth={2}
                dot={{ fill: "#0D9488", r: 4 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 — Staff Activity Table */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Staff Activity This Month</h2>
        <Separator className="mb-4" />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-muted">
                {["Staff Name", "Role", "Encounters This Month", "Last Active"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STAFF_ACTIVITY.map(s => (
                <tr key={s.name} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {s.initials}
                      </div>
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{s.encounters}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{s.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
