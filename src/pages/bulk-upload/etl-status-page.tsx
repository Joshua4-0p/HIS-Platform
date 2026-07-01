import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Download,
  Loader2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { API_BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobStatus {
  id:                string
  status:            "processing" | "completed" | "failed"
  total_records:     number
  inserted_records:  number
  duplicate_records: number
  failed_records:    number
  error_report:      ErrorRow[] | null
  created_at:        string
  completed_at:      string | null
}

interface ErrorRow {
  row:         number
  column:      string
  description: string
}

// ── State A — Processing ──────────────────────────────────────────────────────

function ProcessingState({ job }: { job: JobStatus | null }) {
  const total     = job?.total_records     ?? 0
  const processed = (job?.inserted_records ?? 0) + (job?.duplicate_records ?? 0) + (job?.failed_records ?? 0)
  const pct       = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-8 size-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <h2 className="text-xl font-semibold text-foreground">Processing your file…</h2>
      {total > 0 && (
        <div className="mt-6 w-full max-w-md">
          <Progress value={pct} className="h-2.5" />
          <p className="mt-2 text-sm text-muted-foreground">
            {processed.toLocaleString()} of {total.toLocaleString()} rows processed
          </p>
        </div>
      )}
      <p className="mt-6 max-w-sm text-sm text-muted-foreground">
        Do not close this window. You will receive an email notification when processing is complete.
      </p>
    </div>
  )
}

// ── State B — Error ───────────────────────────────────────────────────────────

function ErrorState({ job }: { job: JobStatus }) {
  const navigate = useNavigate()
  const errors   = job.error_report ?? []

  function handleDownloadReport() {
    const headers = ["Row", "Column", "Error Description"]
    const lines = [
      headers.join(","),
      ...errors.map(
        (e) => `${e.row},"${e.column}","${e.description.replace(/"/g, '""')}"`,
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = "his_upload_error_report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const preview = errors.slice(0, 10)

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <AlertOctagon size={52} className="mb-4 text-destructive" />
      <h2 className="text-xl font-semibold text-foreground">File Rejected — Validation Errors</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your file could not be processed due to the following errors. Please review the details
        below, correct your data, and attempt the upload again.
      </p>

      {preview.length > 0 && (
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
                {preview.map((err, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{err.row}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{err.column}</td>
                    <td className="px-4 py-3 text-sm text-destructive">{err.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
            <span className="text-xs text-muted-foreground">
              Showing {preview.length} of {errors.length} error{errors.length !== 1 ? "s" : ""}
            </span>
            {errors.length > preview.length && (
              <span className="text-xs text-muted-foreground">Download report for full details</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {errors.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadReport}
            className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-destructive px-6 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
          >
            <Download size={16} /> Download Error Report
          </button>
        )}
        <Button onClick={() => navigate("/bulk-upload")}>Try Again</Button>
      </div>
    </div>
  )
}

// ── State C — Complete ────────────────────────────────────────────────────────

function CompleteState({ job }: { job: JobStatus }) {
  const navigate = useNavigate()

  function handleDownloadReport() {
    const lines = [
      "Metric,Value",
      `Total Processed,${job.total_records}`,
      `Inserted,${job.inserted_records}`,
      `Skipped (Duplicates),${job.duplicate_records}`,
      `Failed,${job.failed_records}`,
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = "his_upload_summary_report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = [
    { label: "Total Processed",      value: job.total_records,     color: "text-primary",     icon: null },
    { label: "Inserted",             value: job.inserted_records,  color: "text-[#10B981]",   icon: <CheckCircle size={16} className="text-[#10B981]" /> },
    { label: "Skipped (Duplicates)", value: job.duplicate_records, color: "text-[#F59E0B]",   icon: <AlertTriangle size={16} className="text-[#F59E0B]" /> },
    { label: "Failed",               value: job.failed_records,    color: "text-destructive", icon: <XCircle size={16} className="text-destructive" /> },
  ]

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <CheckCircle size={52} className="mb-4 text-[#10B981]" />
      <h2 className="text-xl font-semibold text-foreground">Upload Complete</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your file has been processed successfully.
      </p>

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
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function EtlStatusPage() {
  const { jobId }          = useParams<{ jobId: string }>()
  const [job, setJob]      = useState<JobStatus | null>(null)
  const [error, setError]  = useState<string | null>(null)
  const intervalRef        = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!jobId) return

    async function poll() {
      try {
        const token = localStorage.getItem("his_access_token")
        const res   = await fetch(`${API_BASE}/bulk-upload/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          setError(`Unable to fetch job status (${res.status})`)
          clearInterval(intervalRef.current!)
          return
        }
        const data = await res.json() as JobStatus
        setJob(data)

        // Stop polling once terminal state reached
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(intervalRef.current!)
        }
      } catch {
        setError("Network error — could not reach the server.")
        clearInterval(intervalRef.current!)
      }
    }

    void poll()
    intervalRef.current = setInterval(() => void poll(), 5000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [jobId])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Upload Status</h1>

      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 shadow-sm">
        {error ? (
          <div className="flex flex-col items-center py-8 text-center">
            <AlertOctagon size={52} className="mb-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : job === null ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Loading job status…</p>
          </div>
        ) : job.status === "processing" ? (
          <ProcessingState job={job} />
        ) : job.status === "failed" ? (
          <ErrorState job={job} />
        ) : (
          <CompleteState job={job} />
        )}
      </div>
    </div>
  )
}
