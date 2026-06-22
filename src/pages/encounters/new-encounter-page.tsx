import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertCircle, FileText, Info, Lock, ShieldAlert, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// ── Mock patient lookup ───────────────────────────────────────

interface MockPatient {
  id: string
  name: string
  initials: string
  dob: string
  age: number
  consentStatus: "Granted" | "Refused" | "Pending"
}

function mockPatient(id: string): MockPatient {
  return {
    id,
    name: "Ayuk Emmanuel",
    initials: "AE",
    dob: "14/08/1985",
    age: 40,
    consentStatus: "Granted",
  }
}

const UNITS = [
  "General Outpatient (OPD)",
  "Emergency Medicine",
  "Cardiology",
  "Internal Medicine",
  "General Surgery",
  "Laboratory",
]

// ── Page ──────────────────────────────────────────────────────

export function NewEncounterPage() {
  const { id = "HIS-001234" } = useParams()
  const navigate = useNavigate()
  const patient = mockPatient(id)
  const isRefused = patient.consentStatus === "Refused"

  const todayStr = new Date().toISOString().split("T")[0]
  const nowTime  = new Date().toTimeString().slice(0, 5)

  const [date,      setDate]      = useState(todayStr)
  const [time,      setTime]      = useState(nowTime)
  const [unit,      setUnit]      = useState("")
  const [complaint, setComplaint] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [saving,    setSaving]    = useState(false)

  const errs = {
    unit:      submitted && !unit,
    complaint: submitted && !complaint.trim(),
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!unit || !complaint.trim() || isRefused) return
    setSaving(true)
    setTimeout(() => {
      toast.success("Encounter Created", {
        description: "The clinical encounter has been recorded.",
      })
      navigate(`/patients/${id}`)
    }, 600)
  }

  const selCls = (err?: boolean) =>
    cn(
      "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
      err ? "border-destructive" : "border-input",
    )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/patients" className="transition-colors hover:text-primary">
          Patients
        </Link>
        <span>/</span>
        <Link to={`/patients/${id}`} className="transition-colors hover:text-primary">
          {id}
        </Link>
        <span>/</span>
        <span className="text-foreground">New Encounter</span>
      </nav>

      {/* Patient header */}
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {patient.initials}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">New Clinical Encounter</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {patient.name} · ID: {id} · DOB: {patient.dob} ({patient.age}Y)
          </p>
        </div>
      </div>

      {/* Consent refused guard */}
      {isRefused && (
        <div className="flex items-center gap-3 rounded-md border border-destructive bg-destructive/10 p-4">
          <ShieldAlert size={20} className="shrink-0 text-destructive" />
          <p className="text-sm font-medium text-foreground">
            This patient has refused consent. Clinical encounters cannot be created.
          </p>
        </div>
      )}

      {/* Form card */}
      <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {/* Card header */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-4">
          <Stethoscope size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Encounter Details</h2>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 p-6">
            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Encounter Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Encounter Time <span className="text-destructive">*</span>
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
            </div>

            {/* Clinical Unit */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Clinical Unit / Department <span className="text-destructive">*</span>
              </label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                title="Clinical Unit"
                className={selCls(errs.unit)}
              >
                <option value="">Select clinical unit...</option>
                {UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {errs.unit && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Required.
                </p>
              )}
            </div>

            {/* Presenting Complaint */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end justify-between">
                <label className="text-sm font-medium text-foreground">
                  Presenting Complaint &amp; Notes{" "}
                  <span className="text-destructive">*</span>
                </label>
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
              <Textarea
                rows={6}
                placeholder="Describe the patient's primary reason for visit, symptoms, and initial observations..."
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
                className={cn(
                  "resize-y",
                  errs.complaint && "border-destructive focus-visible:ring-destructive",
                )}
              />
              {errs.complaint && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Presenting complaint is required.
                </p>
              )}
            </div>

            {/* Attending Clinician (read-only) */}
            <div className="flex flex-col gap-1.5 border-t border-border pt-5">
              <label className="text-sm font-medium text-muted-foreground">
                Attending Clinician
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-3 flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  EP
                </div>
                <Input
                  value="Dr. Ekane Paul"
                  readOnly
                  disabled
                  className="cursor-not-allowed bg-muted pl-11 pr-10 opacity-80"
                />
                <Lock
                  size={14}
                  className="pointer-events-none absolute right-3 text-muted-foreground"
                />
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info size={12} /> Auto-populated based on current session.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/patients/${id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || isRefused}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FileText size={16} />
              {saving ? "Creating…" : "Create Encounter"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
