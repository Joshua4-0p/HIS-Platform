import { useNavigate, useSearchParams } from "react-router-dom"
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Download,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

// ── Types ─────────────────────────────────────────────────────────────────────

type JobState = "processing" | "error" | "complete"

interface ErrorRow {
  row: number
  column: string
  description: string
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ERRORS: ErrorRow[] = [
  { row: 42,  column: "patient_dob",    description: "Invalid date format (expected YYYY-MM-DD)" },
  { row: 105, column: "blood_type",     description: "Value 'X' is not in allowed list (A, B, AB, O)" },
  { row: 213, column: "mrn",            description: "Duplicate entry found in system database" },
  { row: 488, column: "admission_date", description: "Date cannot be in the future" },
]

const MOCK_SUMMARY = {
  total:      2500,
  inserted:   2244,
  duplicates: 234,
  failed:     22,
}

// ── State A — Processing ──────────────────────────────────────────────────────

function ProcessingState() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-8 size-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <h2 className="text-xl font-semibold text-foreground">Processing your file…</h2>
      <div className="mt-6 w-full max-w-md">
        <Progress value={49} className="h-2.5" />
        <p className="mt-2 text-sm text-muted-foreground">1,243 of 2,500 rows processed</p>
      </div>
      <p className="mt-6 max-w-sm text-sm text-muted-foreground">
        Do not close this window. You will receive an email notification when processing is complete.
      </p>
      {/* Demo nav */}
      <DemoNav />
    </div>
  )
}

// ── State B — Error ───────────────────────────────────────────────────────────

function ErrorState() {
  const navigate = useNavigate()

  function handleDownloadReport() {
    const headers = ["Row", "Column", "Error Description"]
    const lines = [
      headers.join(","),
      ...MOCK_ERRORS.map(
        (e) => `${e.row},"${e.column}","${e.description.replace(/"/g, '""')}"`,
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "his_upload_error_report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <AlertOctagon size={52} className="mb-4 text-destructive" />
      <h2 className="text-xl font-semibold text-foreground">File Rejected — Validation Errors</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your file could not be processed due to the following errors. Please review the details
        below, correct your data, and attempt the upload again.
      </p>

      {/* Error table */}
      <div className="mt-6 w-full overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-muted">
              <tr>
                {["Row", "Column", "Error Description"].map((h) => (
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
              {MOCK_ERRORS.map((err) => (
                <tr key={err.row} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{err.row}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{err.column}</td>
                  <td className="px-4 py-3 text-sm text-destructive">{err.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
          <span className="text-xs text-muted-foreground">Showing 4 of 12 errors</span>
          <span className="text-xs text-muted-foreground">Download report for full details</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleDownloadReport}
          className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-destructive px-6 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
        >
          <Download size={16} /> Download Error Report
        </button>
        <Button onClick={() => navigate("/bulk-upload")}>Try Again</Button>
      </div>
      <DemoNav />
    </div>
  )
}

// ── State C — Complete ────────────────────────────────────────────────────────

function CompleteState() {
  const navigate = useNavigate()

  function handleDownloadReport() {
    const lines = [
      "Metric,Value",
      `Total Processed,${MOCK_SUMMARY.total}`,
      `Inserted,${MOCK_SUMMARY.inserted}`,
      `Skipped (Duplicates),${MOCK_SUMMARY.duplicates}`,
      `Failed,${MOCK_SUMMARY.failed}`,
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "his_upload_summary_report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = [
    { label: "Total Processed",      value: MOCK_SUMMARY.total,      color: "text-primary",     icon: null },
    { label: "Inserted",             value: MOCK_SUMMARY.inserted,    color: "text-[#10B981]",   icon: <CheckCircle size={16} className="text-[#10B981]" /> },
    { label: "Skipped (Duplicates)", value: MOCK_SUMMARY.duplicates,  color: "text-[#F59E0B]",   icon: <AlertTriangle size={16} className="text-[#F59E0B]" /> },
    { label: "Failed",               value: MOCK_SUMMARY.failed,      color: "text-destructive", icon: <XCircle size={16} className="text-destructive" /> },
  ]

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <CheckCircle size={52} className="mb-4 text-[#10B981]" />
      <h2 className="text-xl font-semibold text-foreground">Upload Complete</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your file has been processed successfully.
      </p>

      {/* Summary stat grid */}
      <div className="mt-6 grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
              {s.icon}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        A full summary report has been sent to your email address.
      </p>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={handleDownloadReport}
          className="gap-2 border-primary text-primary hover:bg-primary/5"
        >
          <Download size={16} /> Download Detailed Report
        </Button>
        <Button variant="ghost" className="text-primary" onClick={() => navigate("/bulk-upload")}>
          Upload Another File
        </Button>
      </div>
      <DemoNav />
    </div>
  )
}

// ── Demo navigation helper (dev-only) ─────────────────────────────────────────

function DemoNav() {
  const [, setSearchParams] = useSearchParams()
  return (
    <div className="mt-8 border-t border-border pt-4">
      <p className="mb-2 text-xs text-muted-foreground">Demo state switcher</p>
      <div className="flex gap-2">
        {(["processing", "error", "complete"] as JobState[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSearchParams({ state: s })}
            className="rounded border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function EtlStatusPage() {
  const [searchParams] = useSearchParams()
  const state = (searchParams.get("state") ?? "processing") as JobState

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Upload Status</h1>

      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 shadow-sm">
        {state === "processing" && <ProcessingState />}
        {state === "error"      && <ErrorState />}
        {state === "complete"   && <CompleteState />}
      </div>
    </div>
  )
}
