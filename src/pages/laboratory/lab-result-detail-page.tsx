import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  Pencil,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const API_BASE = "https://hvwwgec7n2.execute-api.us-east-1.amazonaws.com"

function authHeader(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem("his_id_token") ?? ""}` }
}

// ── Types ───────────────────────────────────────────────────────────────

type ResultStatus = "Normal" | "Abnormal" | "Critical"

interface Amendment {
  amendedAt: string
  amendedBy: string
  originalValue: string
  reason: string
}

interface LabResult {
  id: string
  patientId: string
  patientNumber: string
  patientName: string
  testName: string
  resultDisplay: string
  unit: string
  referenceRange: string
  status: ResultStatus
  breachNote?: string | null
  testedAt: string
  technician: string
  encounterId: string | null
  encPatientId: string
  isOwnResult: boolean
  amendments?: Amendment[]
  documentUrl?: string | null
}

// ── Status badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ResultStatus }) {
  if (status === "Normal")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#10B981]/10 px-3 py-1.5 text-sm font-medium text-[#10B981]">
        <CheckCircle size={14} /> Normal
      </span>
    )
  if (status === "Abnormal")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F59E0B]/10 px-3 py-1.5 text-sm font-medium text-[#78350F]">
        <AlertTriangle size={14} /> Abnormal
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
      <AlertOctagon size={14} /> Critical
    </span>
  )
}

// ── Breach alert box ─────────────────────────────────────────────────────

function BreachBox({ status, note }: { status: ResultStatus; note: string }) {
  const isCritical = status === "Critical"
  return (
    <div
      role="alert"
      className={cn(
        "mt-4 flex items-start gap-3 rounded-md border p-3",
        isCritical ? "border-destructive bg-destructive/10" : "border-[#F59E0B] bg-[#F59E0B]/10",
      )}
    >
      {isCritical ? (
        <AlertOctagon size={18} className="mt-0.5 shrink-0 text-destructive" />
      ) : (
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#78350F]" />
      )}
      <p className="text-sm text-foreground">{note}</p>
    </div>
  )
}

// ── Document preview dialog ───────────────────────────────────────────────

function DocumentPreviewDialog({
  open, onClose, documentUrl,
}: {
  open: boolean; onClose: () => void; documentUrl: string
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="flex h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <DialogTitle className="text-lg font-semibold">Lab Result Document</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={documentUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Download size={14} /> Download
              </a>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ExternalLink size={14} /> Open in New Tab
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted/20">
          <iframe src={documentUrl} title="Lab Result Document" className="h-full w-full border-0" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export function LabResultDetailPage() {
  const { resultId } = useParams<{ resultId: string }>()
  const [result,         setResult]         = useState<LabResult | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [showDocPreview, setShowDocPreview] = useState(false)

  useEffect(() => {
    if (!resultId) return
    setLoading(true)
    fetch(`${API_BASE}/laboratory/results/${resultId}`, { headers: authHeader() })
      .then(r => r.json())
      .then((data: { result: LabResult }) => setResult(data.result))
      .catch(() => setError("Failed to load lab result."))
      .finally(() => setLoading(false))
  }, [resultId])

  if (loading) {
    return (
      <div className="space-y-4">
        <Link to="/laboratory/queue" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft size={14} /> Lab Work Queue
        </Link>
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-card">
          <FlaskConical size={32} className="animate-pulse text-muted-foreground/40" />
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="space-y-4">
        <Link to="/laboratory/queue" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft size={14} /> Lab Work Queue
        </Link>
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-card">
          <p className="text-sm text-muted-foreground">{error ?? "Lab result not found."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/laboratory/queue" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft size={14} /> Lab Work Queue
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Lab Result</h1>
        <StatusBadge status={result.status} />
      </div>

      <div className="relative rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient</p>
            <p className="mt-1 text-sm text-foreground">
              {result.patientName} — {result.patientNumber}
            </p>
            <Link
              to={`/patients/${result.patientId}`}
              className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View Patient <ExternalLink size={12} />
            </Link>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Test Name</p>
            <p className="mt-1 text-sm font-medium text-foreground">{result.testName}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Result Value</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {result.resultDisplay}
              {result.unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{result.unit}</span>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{result.referenceRange}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date &amp; Time</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {new Date(result.testedAt).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lab Technician</p>
            <p className="mt-1 text-sm font-medium text-foreground">{result.technician}</p>
          </div>
        </div>

        {result.breachNote && result.status !== "Normal" && (
          <BreachBox status={result.status} note={result.breachNote} />
        )}

        {result.documentUrl && (
          <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Lab Result Document</p>
                <p className="text-xs text-muted-foreground">PDF attachment · uploaded with this result</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDocPreview(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FileText size={14} /> Preview
              </button>
              <a
                href={result.documentUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Download size={14} /> Download
              </a>
            </div>
          </div>
        )}

        <hr className="my-6 border-border" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Linked Encounter:</p>
            {result.encounterId ? (
              <Link
                to={`/patients/${result.encPatientId}/encounters/${result.encounterId}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View Encounter <ArrowRight size={14} />
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">None</span>
            )}
          </div>

          {result.isOwnResult && (
            <Link
              to={`/patients/${result.patientId}/amend/lab_result/${result.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              <Pencil size={13} /> Amend this Result
            </Link>
          )}
        </div>
      </div>

      {result.documentUrl && (
        <DocumentPreviewDialog
          open={showDocPreview}
          onClose={() => setShowDocPreview(false)}
          documentUrl={result.documentUrl}
        />
      )}

      {result.amendments && result.amendments.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Amendment History</h2>
          <hr className="mb-4 border-border" />
          <div className="space-y-3">
            {result.amendments.map((am, i) => (
              <div key={i} className="rounded-r-lg border-l-4 border-[#F59E0B]/60 py-2 pl-4 pr-2">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Original
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(am.amendedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mb-0.5 text-sm">
                  Result Value:{" "}
                  <span className="text-muted-foreground line-through">{am.originalValue}</span>
                  {" "}
                  <span className="font-medium text-foreground">{result.resultDisplay} {result.unit}</span>
                </p>
                <p className="text-sm">
                  Amended by: <span className="text-muted-foreground">{am.amendedBy}</span>
                </p>
                {am.reason && (
                  <div className="mt-2 rounded-md bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Reason</p>
                    <p className="mt-0.5 text-sm text-foreground">{am.reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
