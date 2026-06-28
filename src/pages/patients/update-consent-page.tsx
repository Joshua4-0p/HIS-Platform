import { useState, useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { CheckCircle, Clock, XCircle, Info, AlertTriangle, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

type ConsentChoice = "Granted" | "Refused" | "Pending"

// ── Current status pill ───────────────────────────────────────────

function StatusPill({ consent, label }: { consent: ConsentChoice; label: string }) {
  if (consent === "Granted")
    return (
      <div className="inline-flex items-center gap-1.5 rounded border border-[#10B981]/20 bg-[#10B981]/15 px-2.5 py-1.5 text-xs font-medium text-[#10B981]">
        <CheckCircle size={13} /> {label}: Granted
      </div>
    )
  if (consent === "Pending")
    return (
      <div className="inline-flex items-center gap-1.5 rounded border border-[#F59E0B]/20 bg-[#F59E0B]/15 px-2.5 py-1.5 text-xs font-medium text-[#F59E0B]">
        <Clock size={13} /> {label}: Pending
      </div>
    )
  return (
    <div className="inline-flex items-center gap-1.5 rounded border border-destructive/20 bg-destructive/15 px-2.5 py-1.5 text-xs font-medium text-destructive">
      <XCircle size={13} /> {label}: Refused
    </div>
  )
}

// ── Card-row radio ────────────────────────────────────────────────

function ConsentRadioGroup({
  name,
  value,
  onChange,
}: {
  name: string
  value: ConsentChoice
  onChange: (v: ConsentChoice) => void
}) {
  return (
    <div className="space-y-3">
      {(["Granted", "Refused", "Pending"] as ConsentChoice[]).map((opt) => (
        <label
          key={opt}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40",
            value === opt && "border-primary bg-primary/5"
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="size-4 accent-primary"
          />
          <span className="text-sm text-foreground">{opt}</span>
        </label>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export function UpdateConsentPage() {
  const { id = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [patientName, setPatientName]       = useState("Patient")
  const [dataConsent, setDataConsent]       = useState<ConsentChoice>("Pending")
  const [reportingConsent, setReportingConsent] = useState<ConsentChoice>("Pending")
  const [saving, setSaving]                 = useState(false)

  // Load current consent from patient profile
  useEffect(() => {
    if (!id) return
    const token = localStorage.getItem("his_id_token")
    fetch(`${API_BASE}/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.name)                  setPatientName(data.name)
        if (data.consentPersonalData)   setDataConsent(data.consentPersonalData as ConsentChoice)
        if (data.consentPublicReporting) setReportingConsent(data.consentPublicReporting as ConsentChoice)
      })
      .catch(() => {})
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const token = localStorage.getItem("his_id_token")
    try {
      const res = await fetch(`${API_BASE}/patients/${id}/consent`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ consentPersonalData: dataConsent, consentReporting: reportingConsent }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Update failed", { description: json.error ?? "Please try again." })
        return
      }
      toast.success("Consent Updated", {
        description: `Consent for ${patientName} has been saved and logged per Cameroon Data Protection Law No. 2010/012.`,
      })
      navigate(`/patients/${id}`)
    } catch {
      toast.error("Network error", { description: "Check your connection and try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb / back link ── */}
      <Link
        to={`/patients/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
      >
        <ChevronLeft size={16} /> Patient Profile
      </Link>

      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Update Consent — {patientName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage patient data privacy settings.</p>
      </div>

      {/* ── Card (75 % of content width, centered) ── */}
      <div className="max-w-[560px]">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">

          {/* Current Status */}
          <section className="mb-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">Current Status</h2>
            <div className="flex flex-wrap gap-3">
              <StatusPill consent={dataConsent}      label="Data Storage" />
              <StatusPill consent={reportingConsent} label="Public Health" />
            </div>
          </section>

          <div className="mb-6 h-px w-full bg-border" />

          {/* Legal info notice */}
          <div className="mb-6 flex gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <Info size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <h3 className="mb-1 text-sm font-medium text-foreground">
                Cameroon Data Protection Law No. 2010/012
              </h3>
              <p className="text-xs text-muted-foreground">
                Explicit patient consent is required for the digital storage of personal medical
                records and for the anonymised transmission of data for public health surveillance.
                Consent changes are recorded with your name and the date of change.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Consent 1 */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-foreground">
                Consent for personal data storage
              </label>
              <ConsentRadioGroup
                name="data_consent"
                value={dataConsent}
                onChange={setDataConsent}
              />
            </div>

            {/* Consent 2 */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-foreground">
                Consent for anonymised public health reporting
              </label>
              <ConsentRadioGroup
                name="reporting_consent"
                value={reportingConsent}
                onChange={setReportingConsent}
              />
            </div>

            {/* Refused warning */}
            {(dataConsent === "Refused" || reportingConsent === "Refused") && (
              <div className="mb-6 flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
                <p className="text-xs text-muted-foreground">
                  If consent is set to Refused, the patient's record will remain readable but no new
                  clinical data can be added.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/patients/${id}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? "Saving…" : "Save Consent Update"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
