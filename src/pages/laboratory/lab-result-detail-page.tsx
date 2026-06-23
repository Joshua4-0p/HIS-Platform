import { useState } from "react"
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

const MOCK_IS_HOSPITAL_ADMIN = false

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
  patientName: string
  testName: string
  resultDisplay: string
  unit: string
  referenceRange: string
  status: ResultStatus
  breachNote?: string
  testedAt: string
  technician: string
  encounterId: string
  encPatientId: string
  isOwnResult: boolean
  amendments?: Amendment[]
  documentUrl?: string
}

// ── Mock results ────────────────────────────────────────────────────────

const MOCK_RESULTS: LabResult[] = [
  {
    id: "res-001",
    patientId:   "HIS-001234",
    patientName: "Ayuk Emmanuel",
    testName:    "HbA1c",
    resultDisplay: "8.3",
    unit:          "%",
    referenceRange: "Normal: 4.0 – 5.6%",
    status: "Abnormal",
    breachNote: "Result is 2.7% above the upper limit of normal (5.6%).",
    testedAt:    "Yesterday, 15:10",
    technician:  "Mbah John",
    encounterId: "enc-007",
    encPatientId: "HIS-001234",
    isOwnResult: true,
    documentUrl: "/documents/lab-result-hba1c-sample.pdf",
  },
  {
    id: "res-002",
    patientId:   "HIS-001239",
    patientName: "Ashu Grace",
    testName:    "Full Blood Count",
    resultDisplay: "6.1",
    unit:          "g/dL",
    referenceRange: "Normal: 11.0 – 16.0 g/dL",
    status: "Critical",
    breachNote: "Result is 4.9 g/dL below the lower limit of normal (11.0 g/dL). Critical low — immediate intervention required.",
    testedAt:    "Yesterday, 16:20",
    technician:  "Mbah John",
    encounterId: "enc-003",
    encPatientId: "HIS-001239",
    isOwnResult: true,
    amendments: [
      {
        amendedAt:     "Yesterday, 16:45",
        amendedBy:     "Mbah John",
        originalValue: "6.4 g/dL",
        reason:        "Corrected after re-run of sample — initial centrifugation error identified by senior technician.",
      },
    ],
  },
  {
    id: "res-003",
    patientId:   "HIS-001240",
    patientName: "Che Perpetua",
    testName:    "Malaria RDT",
    resultDisplay: "0.4",
    unit:          "index",
    referenceRange: "Normal: < 1.0 index",
    status: "Normal",
    testedAt:    "Yesterday, 17:05",
    technician:  "Mbah John",
    encounterId: "enc-008",
    encPatientId: "HIS-001240",
    isOwnResult: true,
  },
  {
    id: "res-004",
    patientId:   "HIS-001241",
    patientName: "Ndoh Francis",
    testName:    "Creatinine",
    resultDisplay: "2.8",
    unit:          "mg/dL",
    referenceRange: "Normal: 0.6 – 1.2 mg/dL",
    status: "Critical",
    breachNote: "Result is 1.6 mg/dL above the upper limit of normal (1.2 mg/dL). Critical high — renal function at risk.",
    testedAt:    "Oct 10, 2023, 14:30",
    technician:  "Che Basil",
    encounterId: "enc-009",
    encPatientId: "HIS-001241",
    isOwnResult: false,
  },
  {
    id: "res-005",
    patientId:   "HIS-001242",
    patientName: "Lum Adeline",
    testName:    "Fasting Blood Glucose",
    resultDisplay: "5.4",
    unit:          "mmol/L",
    referenceRange: "Normal: 3.9 – 6.1 mmol/L",
    status: "Normal",
    testedAt:    "Oct 09, 2023, 11:20",
    technician:  "Mbah John",
    encounterId: "enc-010",
    encPatientId: "HIS-001242",
    isOwnResult: true,
  },
]

// ── Status badge (large, for detail view) ──────────────────────────────

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

// ── Breach alert box ────────────────────────────────────────────────────

function BreachBox({ status, note }: { status: ResultStatus; note: string }) {
  const isCritical = status === "Critical"
  return (
    <div
      role="alert"
      className={cn(
        "mt-4 flex items-start gap-3 rounded-md border p-3",
        isCritical
          ? "border-destructive bg-destructive/10"
          : "border-[#F59E0B] bg-[#F59E0B]/10",
      )}
    >
      {isCritical ? (
        <AlertOctagon size={18} className="mt-0.5 shrink-0 text-destructive" />
      ) : (
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#78350F]" />
      )}
      <p className={cn("text-sm", isCritical ? "text-foreground" : "text-foreground")}>{note}</p>
    </div>
  )
}

// ── Document preview dialog ─────────────────────────────────────────────

function DocumentPreviewDialog({
  open,
  onClose,
  documentUrl,
}: {
  open: boolean
  onClose: () => void
  documentUrl: string
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
          <iframe
            src={documentUrl}
            title="Lab Result Document"
            className="h-full w-full border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export function LabResultDetailPage() {
  const { resultId } = useParams<{ resultId: string }>()
  const result = MOCK_RESULTS.find(r => r.id === resultId)
  const [showDocPreview, setShowDocPreview] = useState(false)

  if (!result) {
    return (
      <div className="space-y-4">
        <Link to="/laboratory/queue" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft size={14} /> Lab Work Queue
        </Link>
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-card">
          <p className="text-sm text-muted-foreground">Lab result not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/laboratory/queue" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft size={14} /> Lab Work Queue
      </Link>

      {/* Title row with inline status badge */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Lab Result</h1>
        <StatusBadge status={result.status} />
      </div>

      {/* Detail card */}
      <div className="relative rounded-lg border border-border bg-card p-6 shadow-sm">
        {/* Result details grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">

          {/* Patient */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient</p>
            <p className="mt-1 text-sm text-foreground">
              {result.patientName} — {result.patientId}
            </p>
            <Link
              to={`/patients/${result.patientId}`}
              className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View Patient <ExternalLink size={12} />
            </Link>
          </div>

          {/* Test name */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Test Name</p>
            <p className="mt-1 text-sm font-medium text-foreground">{result.testName}</p>
          </div>

          {/* Result value — larger text */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Result Value</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {result.resultDisplay}
              {result.unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{result.unit}</span>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{result.referenceRange}</p>
          </div>

          {/* Date & time */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date &amp; Time</p>
            <p className="mt-1 text-sm font-medium text-foreground">{result.testedAt}</p>
          </div>

          {/* Lab technician */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lab Technician</p>
            <p className="mt-1 text-sm font-medium text-foreground">{result.technician}</p>
          </div>
        </div>

        {/* Breach box — shown for Abnormal or Critical */}
        {result.breachNote && result.status !== "Normal" && (
          <BreachBox status={result.status} note={result.breachNote} />
        )}

        {/* Attached document — shown when a file was uploaded with the result */}
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

        {/* Footer row: linked encounter + amend link */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Linked Encounter:</p>
            <Link
              to={`/patients/${result.encPatientId}/encounters/${result.encounterId}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View Encounter <ArrowRight size={14} />
            </Link>
          </div>

          {/* Amend link — only shown for original author or Hospital Admin (REQ-F-028) */}
          {(result.isOwnResult || MOCK_IS_HOSPITAL_ADMIN) && (
            <Link
              to={`/patients/${result.patientId}/amend/lab_result/${result.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              <Pencil size={13} /> Amend this Result
            </Link>
          )}
        </div>
      </div>

      {/* Document preview dialog */}
      {result.documentUrl && (
        <DocumentPreviewDialog
          open={showDocPreview}
          onClose={() => setShowDocPreview(false)}
          documentUrl={result.documentUrl}
        />
      )}

      {/* Amendment history — shown only if the result has been amended */}
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
                  <span className="text-xs text-muted-foreground">{am.amendedAt}</span>
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
                <div className="mt-2 rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="mt-0.5 text-sm text-foreground">{am.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
