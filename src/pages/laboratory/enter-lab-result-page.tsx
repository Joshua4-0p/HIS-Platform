import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  FileText,
  Lock,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MOCK_REQUESTS } from "./lab-work-queue-page"

// ── Test reference catalogue ────────────────────────────────────────────

interface TestRef {
  unit: string
  rangeDisplay: string
  normalMin: number
  normalMax: number
  criticalLow: number
  criticalHigh: number
}

const TEST_CATALOG: Record<string, TestRef> = {
  "Full Blood Count":      { unit: "g/dL",   rangeDisplay: "Normal: 11.0 – 16.0 g/dL",  normalMin: 11.0, normalMax: 16.0, criticalLow: 7.0,  criticalHigh: 20.0 },
  "Malaria RDT":           { unit: "index",  rangeDisplay: "Normal: < 1.0 index",         normalMin: 0,    normalMax: 1.0,  criticalLow: 0,    criticalHigh: 3.0  },
  "Fasting Blood Glucose": { unit: "mmol/L", rangeDisplay: "Normal: 3.9 – 6.1 mmol/L",   normalMin: 3.9,  normalMax: 6.1,  criticalLow: 2.5,  criticalHigh: 13.9 },
  "HbA1c":                 { unit: "%",      rangeDisplay: "Normal: 4.0 – 5.6%",          normalMin: 4.0,  normalMax: 5.6,  criticalLow: 3.0,  criticalHigh: 10.0 },
  "Creatinine":            { unit: "mg/dL",  rangeDisplay: "Normal: 0.6 – 1.2 mg/dL",    normalMin: 0.6,  normalMax: 1.2,  criticalLow: 0.1,  criticalHigh: 4.0  },
  "Liver Function Test":   { unit: "U/L",    rangeDisplay: "Normal: 7 – 56 U/L",          normalMin: 7,    normalMax: 56,   criticalLow: 0,    criticalHigh: 200  },
}

const FALLBACK_REF: TestRef = {
  unit: "",
  rangeDisplay: "Reference range not available",
  normalMin: 0,
  normalMax: 9999,
  criticalLow: 0,
  criticalHigh: 99999,
}

type ResultStatus = "Normal" | "Abnormal" | "Critical"

function classifyResult(value: number, ref: TestRef): ResultStatus {
  if (value < ref.criticalLow || value > ref.criticalHigh) return "Critical"
  if (value < ref.normalMin   || value > ref.normalMax)   return "Abnormal"
  return "Normal"
}

// ── Live status preview ─────────────────────────────────────────────────

function StatusPreview({ status }: { status: ResultStatus }) {
  if (status === "Normal")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1.5 text-sm font-medium text-[#10B981]">
        <CheckCircle size={15} /> Normal
      </span>
    )
  if (status === "Abnormal")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1.5 text-sm font-medium text-[#78350F]">
        <AlertTriangle size={15} /> Abnormal
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
      <AlertOctagon size={15} /> Critical
    </span>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export function EnterLabResultPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()

  const request = MOCK_REQUESTS.find(r => r.id === requestId)
  const ref      = request ? (TEST_CATALOG[request.testName] ?? FALLBACK_REF) : FALLBACK_REF

  const [resultValue, setResultValue] = useState("")
  const [testDate,    setTestDate]    = useState(() => new Date().toISOString().slice(0, 16))
  const [resultFile,  setResultFile]  = useState<File | null>(null)

  const numericValue = parseFloat(resultValue)
  const hasValue     = resultValue !== "" && !isNaN(numericValue)
  const status       = hasValue ? classifyResult(numericValue, ref) : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasValue) return
    toast.success("Result Submitted", {
      description: "Lab result saved. Notifications sent to the requesting clinician.",
    })
    navigate("/laboratory/queue")
  }

  if (!request) {
    return (
      <div className="space-y-4">
        <Link to="/laboratory/queue" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft size={14} /> Lab Work Queue
        </Link>
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-card">
          <p className="text-sm text-muted-foreground">Lab request not found.</p>
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

      <h1 className="text-2xl font-semibold text-foreground">Enter Lab Result</h1>

      {/* Form card */}
      <div className="mx-auto max-w-140 rounded-lg border border-border bg-card shadow-sm">
        <div className="p-6">

          {/* Request summary box */}
          <div className="mb-8 rounded-lg bg-muted p-4">
            <h2 className="mb-3 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Request Summary
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-0.5 text-xs text-muted-foreground">Patient</p>
                <p className="text-sm font-medium text-foreground">
                  {request.patientName}{" "}
                  <span className="font-normal text-muted-foreground">· {request.patientId}</span>
                </p>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-muted-foreground">Test Requested</p>
                <p className="text-sm font-medium text-foreground">{request.testName}</p>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-muted-foreground">Requested By</p>
                <p className="text-sm font-medium text-foreground">{request.requestedBy}</p>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-muted-foreground">Request Time</p>
                <p className="text-sm font-medium text-foreground">{request.requestTime}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form id="lab-result-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Test name – read-only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="test-name">
                Test Name
              </label>
              <input
                id="test-name"
                type="text"
                readOnly
                value={request.testName}
                className="w-full cursor-not-allowed rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Result value + live preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="result-value">
                Result Value <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  id="result-value"
                  type="number"
                  step="0.01"
                  required
                  placeholder="Enter numeric value"
                  value={resultValue}
                  onChange={e => setResultValue(e.target.value)}
                  className="w-full rounded-md border border-input bg-background py-2 pl-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {ref.unit && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    {ref.unit}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{ref.rangeDisplay}</p>
                {status && <StatusPreview status={status} />}
              </div>

              {/* Critical alert box */}
              {status === "Critical" && (
                <div className="flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 p-3 mt-1">
                  <AlertOctagon size={20} className="mt-0.5 shrink-0 text-destructive" />
                  <p className="text-sm text-foreground">
                    This is a critical value. Upon submission, the attending clinician and ward head nurse will be
                    immediately notified by in-app notification and email.
                  </p>
                </div>
              )}
            </div>

            {/* Date and time of test */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="test-datetime">
                Date and Time of Test <span className="text-destructive">*</span>
              </label>
              <input
                id="test-datetime"
                type="datetime-local"
                required
                value={testDate}
                onChange={e => setTestDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Document upload — optional PDF/Word attachment */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Lab Result Document{" "}
                <span className="font-normal text-muted-foreground">(optional — PDF or Word)</span>
              </label>
              {resultFile ? (
                <div className="flex items-center gap-3 rounded-md border border-input bg-muted px-4 py-2.5">
                  <FileText size={16} className="shrink-0 text-primary" />
                  <span className="flex-1 truncate text-sm text-foreground">{resultFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setResultFile(null)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="result-doc"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 px-4 py-6 transition-colors hover:bg-muted/50"
                >
                  <Upload size={24} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload <span className="font-medium text-primary">PDF or Word</span> document
                  </p>
                  <p className="text-xs text-muted-foreground">Max file size: 10 MB</p>
                  <input
                    id="result-doc"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={e => setResultFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>

            {/* Lab technician – auto-populated, read-only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="technician">
                Laboratory Technician
              </label>
              <div className="relative">
                <input
                  id="technician"
                  type="text"
                  readOnly
                  value="Mbah John (TECH-042)"
                  className={cn(
                    "w-full cursor-not-allowed rounded-md border border-input bg-muted py-2 pl-3 pr-10 text-sm text-primary focus:outline-none",
                  )}
                />
                <Lock size={14} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-muted-foreground" />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-border bg-muted/40 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate("/laboratory/queue")}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="lab-result-form"
            disabled={!hasValue}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <CheckCircle size={15} /> Submit Result
          </button>
        </div>
      </div>
    </div>
  )
}
