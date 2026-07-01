import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertTriangle, ChevronLeft, Lock, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

const REASON_MIN_CHARS = 10

function LockedField({ label, value, textarea }: { label: string; value: string; textarea?: boolean }) {
  const base =
    "w-full cursor-not-allowed select-none rounded border border-border bg-muted py-2.5 pl-10 pr-3 text-sm text-muted-foreground opacity-70 focus:outline-none"
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Lock
          size={15}
          className={cn(
            "pointer-events-none absolute left-3 text-muted-foreground/60",
            textarea ? "top-3" : "top-1/2 -translate-y-1/2"
          )}
        />
        {textarea ? (
          <textarea readOnly value={value} title={label} className={cn(base, "h-20 resize-none")} />
        ) : (
          <input readOnly type="text" value={value} title={label} className={base} />
        )}
      </div>
    </div>
  )
}

// ── Lab Result Correction ─────────────────────────────────────────

interface LabResultDetail {
  testName: string
  resultDisplay: string
  unit: string
  referenceRange: string
  status: string
  testedAt: string
  technician: string
  patientName: string
}

function LabResultCorrectionForm({ patientId, resultId }: { patientId: string; resultId: string }) {
  const navigate = useNavigate()
  const [original, setOriginal] = useState<LabResultDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newValue, setNewValue] = useState("")
  const [newTestedAt, setNewTestedAt] = useState("")
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("his_id_token")
    fetch(`${API_BASE}/laboratory/results/${resultId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.result) {
          setOriginal(data.result)
          setNewValue(data.result.resultDisplay ?? "")
          setNewTestedAt(
            data.result.testedAt
              ? new Date(data.result.testedAt).toISOString().slice(0, 16)
              : ""
          )
        }
      })
      .catch(() => toast.error("Failed to load lab result"))
      .finally(() => setLoading(false))
  }, [resultId])

  const reasonError = submitted && reason.trim().length < REASON_MIN_CHARS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (reason.trim().length < REASON_MIN_CHARS) return
    const val = Number(newValue)
    if (isNaN(val)) { toast.error("Result value must be a number"); return }

    setSaving(true)
    const token = localStorage.getItem("his_id_token")
    try {
      const res = await fetch(`${API_BASE}/laboratory/results/${resultId}/correct`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resultValue: val,
          dateTimeTested: newTestedAt ? new Date(newTestedAt).toISOString() : undefined,
          reason: reason.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Correction failed", { description: json.error ?? "Please try again." })
        return
      }
      toast.success("Result Corrected", {
        description: "The original result has been preserved and the correction recorded.",
      })
      navigate(`/laboratory/results/${json.result.id}`)
    } catch {
      toast.error("Network error", { description: "Check your connection and try again." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading result…</p>
  if (!original) return <p className="text-sm text-destructive">Result not found.</p>

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 border-b border-border bg-[#F59E0B]/8 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
          <p className="text-sm text-foreground">
            The original result will be preserved. This correction creates a new, versioned entry linked to the original.
          </p>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">Original Result</h2>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Locked</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LockedField label="Patient" value={original.patientName} />
            <LockedField label="Test" value={original.testName} />
            <LockedField label="Original Value" value={`${original.resultDisplay} ${original.unit}`} />
            <LockedField label="Reference Range" value={original.referenceRange} />
            <LockedField label="Status" value={original.status} />
            <LockedField
              label="Tested At"
              value={original.testedAt ? new Date(original.testedAt).toLocaleString() : ""}
            />
          </div>
        </div>

        <hr className="mx-6 border-border" />

        <div className="p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Corrected Values</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                New Result Value ({original.unit}) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                step="any"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Date/Time Tested</label>
              <Input
                type="datetime-local"
                value={newTestedAt}
                onChange={(e) => setNewTestedAt(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="flex items-baseline gap-1 text-sm font-medium text-foreground">
                Correction Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Provide a detailed clinical justification for this correction…"
                className={cn("resize-y", reasonError && "border-destructive focus-visible:ring-destructive")}
              />
              <div className="flex items-center justify-between">
                {reasonError ? (
                  <p className="text-xs text-destructive">Reason must be at least {REASON_MIN_CHARS} characters.</p>
                ) : (
                  <span />
                )}
                <span className={cn("text-xs text-muted-foreground", reason.length > 0 && reason.length < REASON_MIN_CHARS && "text-[#F59E0B]")}>
                  {reason.length} / {REASON_MIN_CHARS} minimum
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => navigate(`/laboratory/results/${resultId}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Save size={16} />
            {saving ? "Saving…" : "Save Correction"}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Encounter Amendment (original generic page) ───────────────────

const ORIGINAL_ENCOUNTER = {
  encounterDate: "Oct 12, 2023 - 09:45 AM",
  careUnit: "Cardiology - Ward B",
  chiefComplaint:
    "Patient reports severe chest pain radiating to left arm, shortness of breath, and mild dizziness persisting for 2 hours.",
  clinician: "Dr. Sarah Jenkins, MD",
}

const CARE_UNITS = [
  "Cardiology - Ward A",
  "Cardiology - Ward B",
  "Emergency Department",
  "Intensive Care Unit (ICU)",
  "General Medicine",
]

function EncounterAmendForm({ patientId }: { patientId: string }) {
  const navigate = useNavigate()
  const [encounterDate, setEncounterDate] = useState("2023-10-12T09:45")
  const [careUnit, setCareUnit] = useState(ORIGINAL_ENCOUNTER.careUnit)
  const [chiefComplaint, setChiefComplaint] = useState(ORIGINAL_ENCOUNTER.chiefComplaint)
  const [clinician, setClinician] = useState(ORIGINAL_ENCOUNTER.clinician)
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const reasonError = submitted && reason.length < REASON_MIN_CHARS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (reason.trim().length < REASON_MIN_CHARS) return

    setSaving(true)
    const token = localStorage.getItem("his_id_token")
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/amend/encounter/placeholder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          originalData: ORIGINAL_ENCOUNTER,
          amendedData: { encounterDate, careUnit, chiefComplaint, clinician },
          reason: reason.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Amendment failed", { description: json.error ?? "Please try again." })
        return
      }
      toast.success("Amendment Submitted", {
        description: "The original record has been preserved and the amendment has been recorded.",
      })
      navigate(`/patients/${patientId}`)
    } catch {
      toast.error("Network error", { description: "Check your connection and try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 border-b border-border bg-[#F59E0B]/8 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
          <p className="text-sm text-foreground">
            You are viewing the original record. Edits below will create an amendment - the original will be preserved.
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">Original Record</h2>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Original</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LockedField label="Encounter Date" value={ORIGINAL_ENCOUNTER.encounterDate} />
            <LockedField label="Care Unit" value={ORIGINAL_ENCOUNTER.careUnit} />
            <div className="md:col-span-2">
              <LockedField label="Chief Complaint" value={ORIGINAL_ENCOUNTER.chiefComplaint} textarea />
            </div>
            <div className="md:col-span-2">
              <LockedField label="Attending Clinician" value={ORIGINAL_ENCOUNTER.clinician} />
            </div>
          </div>
        </div>

        <hr className="mx-6 border-border" />

        <div className="p-6">
          <h2 className="mb-6 text-base font-semibold text-foreground">Amendment Values</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Encounter Date</label>
              <Input type="datetime-local" value={encounterDate} onChange={(e) => setEncounterDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Care Unit</label>
              <select
                value={careUnit}
                onChange={(e) => setCareUnit(e.target.value)}
                title="Care Unit"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CARE_UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Chief Complaint</label>
              <Textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={3} className="resize-none" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Attending Clinician</label>
              <Input type="text" value={clinician} onChange={(e) => setClinician(e.target.value)} placeholder="Search clinician…" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="flex items-baseline gap-1 text-sm font-medium text-foreground">
                Amendment Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Provide a detailed clinical justification for this amendment…"
                className={cn("resize-y", reasonError && "border-destructive focus-visible:ring-destructive")}
              />
              <div className="flex items-center justify-between">
                {reasonError ? (
                  <p className="text-xs text-destructive">Amendment reason must be at least {REASON_MIN_CHARS} characters.</p>
                ) : <span />}
                <span className={cn("text-xs text-muted-foreground", reason.length > 0 && reason.length < REASON_MIN_CHARS && "text-[#F59E0B]")}>
                  {reason.length} / {REASON_MIN_CHARS} minimum
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => navigate(`/patients/${patientId}`)}>Cancel</Button>
          <Button type="submit" disabled={saving} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Save size={16} />
            {saving ? "Submitting…" : "Submit Amendment"}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Page shell ────────────────────────────────────────────────────

export function AmendClinicalRecordPage() {
  const { id = "", recordType = "encounter", recordId = "" } = useParams<{
    id: string; recordType: string; recordId: string
  }>()

  const backHref =
    recordType === "lab_result" && recordId
      ? `/laboratory/results/${recordId}`
      : `/patients/${id}`

  const backLabel = recordType === "lab_result" ? "Lab Result" : "Patient Profile"
  const pageTitle = recordType === "lab_result" ? "Correct Lab Result" : "Amend Clinical Record"
  const pageDesc =
    recordType === "lab_result"
      ? "The original result will be preserved. Corrections are version-linked for audit traceability."
      : "The original record will be preserved. Your edits create a traceable amendment."

  return (
    <div className="space-y-4">
      <Link to={backHref} className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80">
        <ChevronLeft size={16} /> {backLabel}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{pageDesc}</p>
      </div>
      {recordType === "lab_result" ? (
        <LabResultCorrectionForm patientId={id} resultId={recordId} />
      ) : (
        <EncounterAmendForm patientId={id} />
      )}
    </div>
  )
}
