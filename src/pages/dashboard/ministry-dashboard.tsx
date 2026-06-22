import { Activity, BarChart2, Building2, Download, Info } from "lucide-react"
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

// ── Mock data ─────────────────────────────────────────────────────────────────

const STATS = { cases: 142854, admissions: 28491, hospitals: 412 }

const DISEASE_CATEGORIES = [
  { category: "Malaria",        count: 3842 },
  { category: "Respiratory",    count: 2301 },
  { category: "Cardiovascular", count: 1987 },
  { category: "Diabetes",       count: 1654 },
  { category: "Digestive",      count: 1203 },
  { category: "HIV/AIDS",       count:  987 },
]

const MONTHLY_TREND = [
  { month: "May", admissions: 2312 },
  { month: "Jun", admissions: 2587 },
  { month: "Jul", admissions: 2401 },
  { month: "Aug", admissions: 2698 },
  { month: "Sep", admissions: 2891 },
  { month: "Oct", admissions: 2941 },
]

const REGIONS = [
  { region: "Centre Region",    cases: 34521, pct: "24.2%" },
  { region: "Littoral Region",  cases: 28901, pct: "20.2%" },
  { region: "West Region",      cases: 19823, pct: "13.9%" },
  { region: "Far North Region", cases: 17654, pct: "12.4%" },
  { region: "South West Region",cases: 14312, pct: "10.0%" },
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

export function MinistryDashboard() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Public Health Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ministry / Public Health Officer View</p>
      </div>

      {/* Anonymisation notice — always visible */}
      <div className="flex items-start gap-3 rounded-md border border-[#0D9488] bg-[#0D9488]/10 p-3">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          This dashboard displays anonymised aggregate data only. No individual patient identifiers
          are included. Data shown represents only patients who have consented to public health
          reporting.
        </p>
      </div>

      {/* Row 1 — 3 KPI stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Total Cases */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Cases (This Month)
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <BarChart2 size={18} className="text-primary" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">
            {STATS.cases.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#10B981]">+4.2% vs last month</p>
        </div>

        {/* Total Admissions */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Admissions (This Month)
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#10B981]/10">
              <Activity size={18} className="text-[#10B981]" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">
            {STATS.admissions.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#10B981]">+1.8% vs last month</p>
        </div>

        {/* Hospitals Reporting */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hospitals Reporting
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#6366F1]/10">
              <Building2 size={18} className="text-[#6366F1]" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">{STATS.hospitals}</p>
          <p className="mt-1 text-xs text-muted-foreground">of 425 facilities — 97%</p>
        </div>
      </div>

      {/* Row 2 — Disease Category Bar Chart (full width) */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Disease Categories This Month</h2>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <Download size={13} /> Export PNG
          </Button>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={DISEASE_CATEGORIES} margin={{ top: 0, right: 16, left: 0, bottom: 24 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<ChartTooltipBox />} cursor={{ fill: "#0D9488", fillOpacity: 0.08 }} />
            <Legend
              formatter={(v) => <span className="text-xs font-medium text-foreground">{v}</span>}
              wrapperStyle={{ paddingTop: 12 }}
            />
            <Bar dataKey="count" name="Cases" fill="#0D9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-muted-foreground">
          Aggregated across all reporting hospitals.
        </p>
      </div>

      {/* Row 3 — Trend + Regional Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly Admissions Trend */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Monthly Admissions Trend</h2>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
              <Download size={13} /> Export PNG
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MONTHLY_TREND} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
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
                width={48}
              />
              <Tooltip content={<ChartTooltipBox />} cursor={{ stroke: "#E2E8F0" }} />
              <Legend
                formatter={(v) => <span className="text-xs font-medium text-foreground">{v}</span>}
                wrapperStyle={{ paddingTop: 12 }}
              />
              <Line
                type="monotone"
                dataKey="admissions"
                name="Admissions"
                stroke="#0D9488"
                strokeWidth={2}
                dot={{ fill: "#0D9488", r: 4 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Regional Distribution Table */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Regional Distribution</h2>
          <Separator className="mb-4" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-muted">
                  {["Region / District", "Case Count", "% of Total"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {REGIONS.map((r, i) => (
                  <tr
                    key={r.region}
                    className={`transition-colors hover:bg-accent/50 ${i === 0 ? "bg-primary/5" : ""}`}
                  >
                    <td className={`px-4 py-3 text-sm ${i === 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                      {r.region}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {r.cases.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
