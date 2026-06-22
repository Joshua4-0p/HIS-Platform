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
    if (reason.trim().length < 20) {
      toast.error("Reason too short", { description: "Please provide at least 20 characters describing the clinical reason." })
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success("Access Request Submitted", { description: "The source hospital has been notified of your request." })
      navigate("/transfers")
    }, 800)
  }

  return (
    <div className="mx-auto max-w-130 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/transfers" className="hover:text-foreground">Transfers</Link>
        <ChevronRight size={14} />
        <span className="text-foreground">Request Form</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Request Patient Access</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target patient summary */}
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground">Target Patient</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {patientName}
            <ShieldCheck size={14} className="text-primary" />
          </p>
          <p className="text-xs text-muted-foreground">ID: PT-8820-A</p>
          <div className="mt-2 flex items-center gap-1.5">
            <Building2 size={13} className="shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
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
