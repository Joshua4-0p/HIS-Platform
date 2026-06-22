import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  ClipboardList,
  Clock,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_REQUEST = {
  patientName:          "Eleanor Rigby",
  patientId:            "PT-88492-MR",
  requestingFacility:   "Northside General Hospital",
  requestingPhysician:  "Dr. Sarah Jenkins, Cardiology",
  accessType:           "Full Chart (View Only)",
  dateRequested:        "Oct 24, 2023 • 09:41 AM",
  requestedRecords:     ["Lab Results", "Imaging", "Consult Notes"],
  reason:
    "Patient is presenting with acute arrhythmia requiring specialized electrophysiology consultation. Requesting complete cardiac history, recent Holter monitor data, and all relevant lab work from the past 6 months to avoid redundant testing and expedite care plan.",
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TransferReviewPage() {
  const { id } = useParams()
  const [duration,  setDuration]  = useState("7")
  const [decision,  setDecision]  = useState<"approved" | "denied" | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [decisionDate, setDecisionDate] = useState("")

  void id

  function handleDecision(action: "approved" | "denied") {
    if (action === "approved" && (!duration || Number(duration) < 1)) {
      toast.error("Duration required", { description: "Please enter a valid access duration." })
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      setDecisionDate(now)
      setDecision(action)
      if (action === "approved") {
        toast.success("Access granted", { description: `Patient records shared for ${duration} day(s).` })
      } else {
        toast.info("Request denied", { description: "The requesting facility has been notified." })
      }
    }, 600)
  }

  // Computed expiry for approved decisions
  const expiryDate = decision === "approved" && duration
    ? new Date(Date.now() + Number(duration) * 86_400_000).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : null

  return (
    <div className="space-y-6">
      {/* Back — text-primary per spec */}
      <Link
        to="/transfers"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
      >
        <ArrowLeft size={15} /> Patient Transfers
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transfer Access Request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage access request for patient record transfer.
          </p>
        </div>
        {decision ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              decision === "approved"
                ? "bg-[#10B981]/10 text-[#10B981]"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {decision === "approved" ? (
              <><CheckCircle size={13} /> Approved</>
            ) : (
              <><XCircle size={13} /> Denied</>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-semibold text-[#78350F] dark:text-[#F59E0B]">
            <Clock size={13} /> Pending Review
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Request details */}
        <div className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-sm lg:col-span-2">
          {/* Heading — text-lg per spec */}
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ClipboardList size={18} className="text-primary" /> Request Details
          </h2>
          <Separator />
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Patient Name",          value: MOCK_REQUEST.patientName },
              { label: "Patient ID",            value: MOCK_REQUEST.patientId },
              { label: "Requesting Physician",  value: MOCK_REQUEST.requestingPhysician },
              { label: "Date Requested",        value: MOCK_REQUEST.dateRequested },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
              </div>
            ))}
            {/* Access Type — badge display */}
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Access Type</dt>
              <dd className="mt-1">
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {MOCK_REQUEST.accessType}
                </span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">Requesting Facility</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Building2 size={13} className="text-muted-foreground" />
                {MOCK_REQUEST.requestingFacility}
              </dd>
            </div>
          </dl>

          {/* Requested records */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Requested Records</p>
            <div className="flex flex-wrap gap-2">
              {MOCK_REQUEST.requestedRecords.map(rec => (
                <span
                  key={rec}
                  className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                >
                  {rec}
                </span>
              ))}
            </div>
          </div>

          {/* Reason — bg-muted rounded-md per spec */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Reason for Transfer</p>
            <div className="rounded-md bg-muted p-3 text-sm text-foreground">
              {MOCK_REQUEST.reason}
            </div>
          </div>
        </div>

        {/* Decision panel */}
        <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Decision Panel</h2>
          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Grant Access Duration</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-24"
                disabled={!!decision}
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Access will automatically revoke after this period.
            </p>
          </div>

          {/* HIPAA notice */}
          <div className="flex items-center gap-2 rounded-md bg-[#10B981]/10 px-3 py-2">
            <ShieldCheck size={15} className="text-[#10B981]" />
            <span className="text-xs font-medium text-[#10B981]">HIPAA Compliant Transfer</span>
          </div>
          <p className="text-xs text-muted-foreground">
            This action will be logged in the audit trail.
          </p>

          <div className="space-y-2 pt-2">
            <Button
              className="w-full gap-2"
              onClick={() => handleDecision("approved")}
              disabled={!!decision || loading}
            >
              <CheckCircle size={15} /> Approve Access
            </Button>

            {/* Deny — two-step confirmation dialog per UI-010 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={!!decision || loading}
                >
                  <XCircle size={15} /> Deny Request
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deny Transfer Request</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will deny{" "}
                    <strong>{MOCK_REQUEST.requestingFacility}</strong>&apos;s access to{" "}
                    <strong>{MOCK_REQUEST.patientName}</strong>&apos;s records. The requesting
                    facility will be notified. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDecision("denied")}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Deny Request
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Post-decision detail rows */}
          {decision && (
            <dl className="space-y-3 rounded-md border border-border bg-muted/40 p-4 pt-3">
              {decision === "approved" ? (
                <>
                  <div>
                    <dt className="text-xs text-muted-foreground">Approved by</dt>
                    <dd className="text-sm font-medium text-foreground">Dr. J. Elong (You)</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Approved on</dt>
                    <dd className="text-sm font-medium text-foreground">{decisionDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Expires on</dt>
                    <dd className="text-sm font-medium text-[#10B981]">{expiryDate}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-xs text-muted-foreground">Denied by</dt>
                    <dd className="text-sm font-medium text-foreground">Dr. J. Elong (You)</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Denied on</dt>
                    <dd className="text-sm font-medium text-foreground">{decisionDate}</dd>
                  </div>
                </>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}
