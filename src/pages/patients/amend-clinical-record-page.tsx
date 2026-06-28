import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertTriangle, ChevronLeft, Lock, Search, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

// ── Mock original record ──────────────────────────────────────────

const ORIGINAL_RECORD = {
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

const REASON_MIN_CHARS = 10

// ── Locked read-only field ────────────────────────────────────────

function LockedField({
  label,
  value,
  textarea,
}: {
  label: string
  value: string
  textarea?: boolean
}) {
  const baseClass =
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
          <textarea
            readOnly
            value={value}
            title={label}
            className={cn(baseClass, "h-20 resize-none")}
          />
        ) : (
          <input
            readOnly
            type="text"
            value={value}
            title={label}
            className={baseClass}
          />
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export function AmendClinicalRecordPage() {
  const { id = "", recordType = "encounter", recordId = "" } = useParams<{
    id: string; recordType: string; recordId: string
  }>()
  const navigate = useNavigate()

  // Amendment values (editable copies of original)
  const [encounterDate, setEncounterDate] = useState("2023-10-12T09:45")
  const [careUnit, setCareUnit] = useState("Cardiology - Ward B")
  const [chiefComplaint, setChiefComplaint] = useState(ORIGINAL_RECORD.chiefComplaint)
  const [clinician, setClinician] = useState(ORIGINAL_RECORD.clinician)
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
    const amendRecordType = recordType || "encounter"
    // Use a placeholder UUID when no real recordId is available (demo mode)
    const amendRecordId = recordId || "00000000-0000-0000-0000-000000000000"
    const originalData = {
      encounterDate: ORIGINAL_RECORD.encounterDate,
      careUnit:      ORIGINAL_RECORD.careUnit,
      chiefComplaint: ORIGINAL_RECORD.chiefComplaint,
      clinician:     ORIGINAL_RECORD.clinician,
    }
    const amendedData = { encounterDate, careUnit, chiefComplaint, clinician }

    try {
      const res = await fetch(
        `${API_BASE}/patients/${id}/amend/${amendRecordType}/${amendRecordId}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ originalData, amendedData, reason: reason.trim() }),
        },
      )
      const json = await res.json()
      if (!res.ok) {
        toast.error("Amendment failed", { description: json.error ?? "Please try again." })
        return
      }
      toast.success("Amendment Submitted", {
        description: "The original record has been preserved and the amendment has been recorded.",
      })
      navigate(`/patients/${id}`)
    } catch {
      toast.error("Network error", { description: "Check your connection and try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Back button above form ── */}
      <Link
        to={`/patients/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
      >
        <ChevronLeft size={16} /> Patient Profile
      </Link>

      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Amend Clinical Record</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The original record will be preserved. Your edits create a traceable amendment.
        </p>
      </div>

      {/* ── Form card ── */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">

          {/* Amber warning banner */}
          <div className="flex items-start gap-3 border-b border-border bg-[#F59E0B]/8 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
            <p className="text-sm text-foreground">
              You are viewing the original record. Edits below will create an amendment — the original will be preserved.
            </p>
          </div>

          {/* ── Section A: Original Record (read-only) ── */}
          <div className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">Original Record</h2>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Original
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <LockedField label="Encounter Date" value={ORIGINAL_RECORD.encounterDate} />
              <LockedField label="Care Unit"      value={ORIGINAL_RECORD.careUnit} />
              <div className="md:col-span-2">
                <LockedField label="Chief Complaint" value={ORIGINAL_RECORD.chiefComplaint} textarea />
              </div>
              <div className="md:col-span-2">
                <LockedField label="Attending Clinician" value={ORIGINAL_RECORD.clinician} />
              </div>
            </div>
          </div>

          <hr className="mx-6 border-border" />

          {/* ── Section B: Amendment Values (editable) ── */}
          <div className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Amendment Values</h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Encounter Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Encounter Date</label>
                <Input
                  type="datetime-local"
                  value={encounterDate}
                  onChange={(e) => setEncounterDate(e.target.value)}
                />
              </div>

              {/* Care Unit */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Care Unit</label>
                <select
                  value={careUnit}
                  onChange={(e) => setCareUnit(e.target.value)}
                  title="Care Unit"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CARE_UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Chief Complaint */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Chief Complaint</label>
                <Textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Attending Clinician (searchable) */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Attending Clinician</label>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type="text"
                    value={clinician}
                    onChange={(e) => setClinician(e.target.value)}
                    className="pl-9"
                    placeholder="Search clinician..."
                  />
                </div>
              </div>

              {/* Amendment Reason (required, min 10 chars) */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="flex items-baseline gap-1 text-sm font-medium text-foreground">
                  Amendment Reason <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Provide a detailed clinical justification for this amendment..."
                  className={cn(
                    "resize-y",
                    reasonError && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <div className="flex items-center justify-between">
                  {reasonError ? (
                    <p className="text-xs text-destructive">
                      Amendment reason must be at least {REASON_MIN_CHARS} characters.
                    </p>
                  ) : (
                    <span />
                  )}
                  <span
                    className={cn(
                      "text-xs text-muted-foreground",
                      reason.length > 0 && reason.length < REASON_MIN_CHARS && "text-[#F59E0B]"
                    )}
                  >
                    {reason.length} / {REASON_MIN_CHARS} minimum
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
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
              disabled={saving}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save size={16} />
              {saving ? "Submitting…" : "Submit Amendment"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
