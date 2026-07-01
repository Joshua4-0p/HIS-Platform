import { useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  Download,
  FileText,
  Filter,
  Minus,
  PieChart as PieIcon,
  RotateCcw,
  TrendingUp,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ── Mock data (matches Stitch design) ────────────────────────────────────────

const MONTHLY_DATA = [
  { month: "Jan", label: "January 2026",  cardiology: 542, neurology: 380 },
  { month: "Feb", label: "February 2026", cardiology: 630, neurology: 450 },
  { month: "Mar", label: "March 2026",    cardiology: 780, neurology: 590 },
  { month: "Apr", label: "April 2026",    cardiology: 710, neurology: 550 },
  { month: "May", label: "May 2026",      cardiology: 760, neurology: 580 },
  { month: "Jun", label: "June 2026",     cardiology: 820, neurology: 620 },
]

// Pre-compute totals for each row
const TABLE_ROWS = MONTHLY_DATA.map((r, i) => {
  const total = r.cardiology + r.neurology
  const prevTotal = i === 0 ? null : MONTHLY_DATA[i - 1].cardiology + MONTHLY_DATA[i - 1].neurology
  const pct = prevTotal == null ? null : Math.round(((total - prevTotal) / prevTotal) * 100)
  return { ...r, total, pct }
})

const SUMMARY_CARDIOLOGY = MONTHLY_DATA.reduce((s, r) => s + r.cardiology, 0)
const SUMMARY_NEUROLOGY  = MONTHLY_DATA.reduce((s, r) => s + r.neurology,  0)
const SUMMARY_TOTAL      = SUMMARY_CARDIOLOGY + SUMMARY_NEUROLOGY
const SUMMARY_AVG        = Math.round(SUMMARY_TOTAL / MONTHLY_DATA.length)

// ── ShadCN ChartConfig ────────────────────────────────────────────────────────

const CHART_CONFIG = {
  cardiology: { label: "Cardiology", color: "#0D9488" },
  neurology:  { label: "Neurology",  color: "#6bd8cb" },
} satisfies ChartConfig

const PIE_DATA = [
  { name: "Cardiology", value: SUMMARY_CARDIOLOGY, fill: "#0D9488" },
  { name: "Neurology",  value: SUMMARY_NEUROLOGY,  fill: "#6bd8cb" },
]

const PIE_CONFIG = {
  Cardiology: { label: "Cardiology", color: "#0D9488" },
  Neurology:  { label: "Neurology",  color: "#6bd8cb" },
} satisfies ChartConfig

// ── Age group options ─────────────────────────────────────────────────────────

const AGE_GROUPS = [
  { id: "age-0-14",  label: "0–14"  },
  { id: "age-15-29", label: "15–29" },
  { id: "age-30-44", label: "30–44" },
  { id: "age-45-59", label: "45–59" },
  { id: "age-60",    label: "60+"   },
]

type ChartType = "bar" | "line" | "pie"

// ── PNG export ────────────────────────────────────────────────────────────────

function exportChartAsPng(ref: { current: HTMLDivElement | null }, filename: string) {
  const container = ref.current
  if (!container) return
  const svg = container.querySelector("svg")
  if (!svg) return

  const { width, height } = container.getBoundingClientRect()
  if (!width || !height) return

  const docStyle = getComputedStyle(document.documentElement)
  const mutedFg  = docStyle.getPropertyValue("--muted-foreground").trim()
  const border   = docStyle.getPropertyValue("--border").trim()

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("width",  String(Math.round(width)))
  clone.setAttribute("height", String(Math.round(height)))
  clone.setAttribute("xmlns",  "http://www.w3.org/2000/svg")

  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style")
  styleEl.textContent = `:root{--muted-foreground:${mutedFg};--border:${border}}`
  clone.insertBefore(styleEl, clone.firstChild)

  const svgData = new XMLSerializer().serializeToString(clone)
  const url     = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }))

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width  = Math.round(width)
    canvas.height = Math.round(height)
    const ctx = canvas.getContext("2d")
    if (!ctx) { URL.revokeObjectURL(url); return }
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    const a    = document.createElement("a")
    a.download = filename
    a.href     = canvas.toDataURL("image/png")
    a.click()
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
}

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCsv() {
  const headers = "Month,Cardiology Encounters,Neurology Encounters,Total"
  const rows = TABLE_ROWS.map(
    (r) => `${r.label},${r.cardiology},${r.neurology},${r.total}`,
  )
  const summary = `Summary,${SUMMARY_CARDIOLOGY},${SUMMARY_NEUROLOGY},${SUMMARY_TOTAL}`
  const csv = [headers, ...rows, summary].join("\n")
  const a = document.createElement("a")
  a.download = "encounters-by-unit.csv"
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  a.click()
}

// ── Trend cell component ──────────────────────────────────────────────────────

function TrendCell({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <td className="px-4 py-3 text-center text-muted-foreground">
        <Minus size={14} className="mx-auto" />
      </td>
    )
  }
  const up = pct >= 0
  return (
    <td className={`px-4 py-3 text-center font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
      <span className="inline-flex items-center justify-center gap-0.5">
        {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        {Math.abs(pct)}%
      </span>
    </td>
  )
}

// ── Page component ────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const chartRef = useRef<HTMLDivElement>(null)

  // Filter state
  const [dateFrom,     setDateFrom]     = useState("")
  const [dateTo,       setDateTo]       = useState("")
  const [unit,         setUnit]         = useState("all")
  const [diagnosis,    setDiagnosis]    = useState("all")
  const [region,       setRegion]       = useState("all")
  const [testType,     setTestType]     = useState("all")
  const [selectedAges, setSelectedAges] = useState<string[]>([])
  const [groupBy,      setGroupBy]      = useState("month")

  // Chart state
  const [chartType, setChartType] = useState<ChartType>("bar")

  function handleAgeGroup(id: string, checked: boolean) {
    setSelectedAges((prev) =>
      checked ? [...prev, id] : prev.filter((a) => a !== id),
    )
  }

  function handleReset() {
    setDateFrom(""); setDateTo("")
    setUnit("all"); setDiagnosis("all"); setRegion("all"); setTestType("all")
    setSelectedAges([])
    setGroupBy("month")
  }

  const dateLabel =
    dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : "Jan–Jun 2026"

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics &amp; Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter and visualise clinical data across your facility.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex items-start gap-6">

        {/* ── Left filter panel ──────────────────────────────────────────── */}
        <aside className="w-70 shrink-0 self-start sticky top-22">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">

            {/* Panel header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Query Builder</h2>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>

            <div className="space-y-5">

              {/* Date Range */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date Range
                </p>
                <div className="space-y-2">
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full text-sm"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Clinical Unit */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clinical Unit
                </Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="neurology">Neurology</SelectItem>
                    <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="obstetrics">Obstetrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Diagnosis Category */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Diagnosis Category
                </Label>
                <Select value={diagnosis} onValueChange={setDiagnosis}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="cardiovascular">Cardiovascular Disease</SelectItem>
                    <SelectItem value="respiratory">Respiratory Illness</SelectItem>
                    <SelectItem value="malaria">Malaria</SelectItem>
                    <SelectItem value="trauma">Trauma</SelectItem>
                    <SelectItem value="diabetes">Diabetes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Patient Age Group */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Patient Age Group
                </p>
                <div className="space-y-2">
                  {AGE_GROUPS.map((ag) => (
                    <div key={ag.id} className="flex items-center gap-2">
                      <Checkbox
                        id={ag.id}
                        checked={selectedAges.includes(ag.id)}
                        onCheckedChange={(c) => handleAgeGroup(ag.id, !!c)}
                      />
                      <Label
                        htmlFor={ag.id}
                        className="cursor-pointer text-sm font-normal text-foreground"
                      >
                        {ag.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Patient Region / District */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Patient Region / District
                </Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="centre">Centre Region</SelectItem>
                    <SelectItem value="littoral">Littoral Region</SelectItem>
                    <SelectItem value="west">West Region</SelectItem>
                    <SelectItem value="far-north">Far North Region</SelectItem>
                    <SelectItem value="south-west">South West Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Test Type */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Test Type
                </Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All Test Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Test Types</SelectItem>
                    <SelectItem value="fbc">Full Blood Count (FBC)</SelectItem>
                    <SelectItem value="malaria">Malaria RDT</SelectItem>
                    <SelectItem value="lft">Liver Function Test (LFT)</SelectItem>
                    <SelectItem value="hba1c">HbA1c</SelectItem>
                    <SelectItem value="glucose">Blood Glucose</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Group Results By */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Group Results By
                </p>
                <RadioGroup
                  value={groupBy}
                  onValueChange={setGroupBy}
                  className="flex gap-4"
                >
                  {(["Day", "Week", "Month"] as const).map((v) => (
                    <div key={v} className="flex items-center gap-1.5">
                      <RadioGroupItem value={v.toLowerCase()} id={`group-${v}`} />
                      <Label
                        htmlFor={`group-${v}`}
                        className="cursor-pointer text-sm font-normal text-foreground"
                      >
                        {v}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              <Button className="w-full">Apply Filters</Button>

            </div>
          </div>
        </aside>

        {/* ── Right panel — always shows chart + table ───────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* Chart type tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-2">
            <Tabs
              value={chartType}
              onValueChange={(v) => setChartType(v as ChartType)}
              className="w-full"
            >
              <TabsList className="bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="bar"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground"
                >
                  <BarChart2 size={15} /> Bar Chart
                </TabsTrigger>
                <TabsTrigger
                  value="line"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground"
                >
                  <TrendingUp size={15} /> Line Chart
                </TabsTrigger>
                <TabsTrigger
                  value="pie"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground"
                >
                  <PieIcon size={15} /> Pie Chart
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Chart canvas card */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            {/* Chart header */}
            <div className="mb-6 flex items-start justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Encounters by Clinical Unit
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-sm text-primary border border-transparent hover:border-primary/20"
                onClick={() => exportChartAsPng(chartRef, "encounters-by-unit.png")}
              >
                <Download size={15} /> Export as PNG
              </Button>
            </div>

            {/* Chart — ref wraps ChartContainer so querySelector('svg') works */}
            <div ref={chartRef}>

              {chartType === "bar" && (
                <ChartContainer config={CHART_CONFIG} className="h-80 w-full">
                  <BarChart
                    data={MONTHLY_DATA}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickMargin={4}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="cardiology" fill="var(--color-cardiology)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="neurology"  fill="var(--color-neurology)"  radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}

              {chartType === "line" && (
                <ChartContainer config={CHART_CONFIG} className="h-80 w-full">
                  <LineChart
                    data={MONTHLY_DATA}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickMargin={4}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="cardiology"
                      stroke="var(--color-cardiology)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-cardiology)", r: 4 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="neurology"
                      stroke="var(--color-neurology)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-neurology)", r: 4 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}

              {chartType === "pie" && (
                <ChartContainer config={PIE_CONFIG} className="h-80 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={PIE_DATA}
                      cx="50%"
                      cy="47%"
                      innerRadius={90}
                      outerRadius={140}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {PIE_DATA.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}

            </div>
          </div>

          {/* Data table */}
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-lg font-semibold text-foreground">Tabular Data</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-sm"
                onClick={downloadCsv}
              >
                <FileText size={14} /> Download as CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Month
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Cardiology Encounters
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Neurology Encounters
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {TABLE_ROWS.map((r) => (
                    <tr key={r.month} className="transition-colors hover:bg-accent/50">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {r.label}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {r.cardiology.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {r.neurology.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                        {r.total.toLocaleString()}
                      </td>
                      <TrendCell pct={r.pct} />
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-primary/5">
                    <td className="px-4 py-3 text-sm font-semibold text-primary">
                      Summary
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-primary">
                      {SUMMARY_CARDIOLOGY.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-primary">
                      {SUMMARY_NEUROLOGY.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-primary">
                      {SUMMARY_TOTAL.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-primary">
                      Avg: {SUMMARY_AVG.toLocaleString()}/mo
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
