import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  Building2,
  ChevronRight,
  Eye,
  FilePen,
  Info,
  Send,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// ── Page ─────────────────────────────────────────────────────────────────────

export function TransferRequestPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const state      = location.state as { patientName?: string; hospital?: string } | null

  const patientName = state?.patientName ?? "Michael T. Nkeng"
  const hospital    = state?.hospital    ?? "Douala General Hospital"

  const [reason,      setReason]      = useState("")
  const [accessLevel, setAccessLevel] = useState<"view" | "edit">("view")
  const [submitting,  setSubmitting]  = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error("Reason required", { description: "Please provide a reason for this transfer request." })
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success("Request submitted", { description: "Your access request has been sent to the source facility." })
      navigate("/transfers")
    }, 800)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/transfers" className="hover:text-foreground">Transfers</Link>
        <ChevronRight size={14} />
        <span className="text-foreground">Request Form</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Request Patient Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Transfer Access Request</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target patient card */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{patientName}</p>
              <p className="text-xs text-muted-foreground">ID: PT-8820-A</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <Building2 size={14} className="shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Source Facility: <span className="font-medium text-foreground">{hospital}</span>
            </span>
          </div>
        </div>

        {/* Reason for transfer */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="reason" className="text-sm font-semibold text-foreground">
              Reason for Transfer <span className="text-destructive">*</span>
            </label>
          </div>
          <Textarea
            id="reason"
            placeholder="Describe the clinical reason for requesting this patient's records…"
            rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="resize-none"
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info size={12} /> This reason will be logged in the audit trail.
          </p>
        </div>

        {/* Access level */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Requested Access Level <span className="text-destructive">*</span>
          </p>
          <RadioGroup
            value={accessLevel}
            onValueChange={v => setAccessLevel(v as "view" | "edit")}
            className="space-y-2"
          >
            <div className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${accessLevel === "view" ? "border-primary bg-primary/5" : "border-border"}`}>
              <RadioGroupItem value="view" id="view" className="mt-0.5" />
              <div>
                <Label htmlFor="view" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <Eye size={15} className="text-primary" /> View Only
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Read-only access to historical records, labs, and imaging.
                </p>
              </div>
            </div>
            <div className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${accessLevel === "edit" ? "border-primary bg-primary/5" : "border-border"}`}>
              <RadioGroupItem value="edit" id="edit" className="mt-0.5" />
              <div>
                <Label htmlFor="edit" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <FilePen size={15} className="text-primary" /> View &amp; Edit
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Full clinical privileges to append notes and modify treatment plans.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/transfers")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            <Send size={15} /> Submit Access Request
          </Button>
        </div>
      </form>
    </div>
  )
}
