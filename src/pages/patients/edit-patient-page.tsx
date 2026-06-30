import { useState, useEffect, useRef, type KeyboardEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertCircle, AlertTriangle, Info, X, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { API_BASE } from "@/lib/api"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ── Constants ─────────────────────────────────────────────────────

const REGIONS = [
  "Centre", "Littoral", "North West", "South West", "West",
  "North", "Far North", "Adamawa", "East", "South",
]

const RELATIONSHIPS = ["Parent", "Spouse", "Sibling", "Child", "Friend", "Guardian", "Other"]

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "Unknown"]

type ConsentChoice = "Granted" | "Refused" | "Pending"

// ── Shared UI helpers ─────────────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="border-b border-border pb-2">
      <h2 className="text-base font-semibold text-foreground">{label}</h2>
    </div>
  )
}

function Field({
  label, required, tooltip, error, children,
}: {
  label: string; required?: boolean; tooltip?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger type="button" className="text-muted-foreground">
              <Info size={13} />
            </TooltipTrigger>
            <TooltipContent className="max-w-56 text-xs">{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  )
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("")
  const ref = useRef<HTMLInputElement>(null)

  function addTag(value: string) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput("")
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addTag(input) }
    else if (e.key === "Backspace" && !input && tags.length > 0) onChange(tags.slice(0, -1))
  }

  return (
    <div
      className="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      onClick={() => ref.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)) }} className="text-muted-foreground hover:text-foreground">
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

// ── Form errors ───────────────────────────────────────────────────

interface FormErrors {
  fullName?: string
  phone?: string
  region?: string
  address?: string
  emergencyName?: string
  emergencyPhone?: string
  relationship?: string
}

// ── Page ──────────────────────────────────────────────────────────

export function EditPatientPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Read-only identity fields (loaded from API, not editable)
  const [patientNumber, setPatientNumber] = useState("")
  const [dob, setDob]                     = useState("")
  const [sex, setSex]                     = useState("")

  // Editable fields
  const [fullName, setFullName]               = useState("")
  const [phone, setPhone]                     = useState("")
  const [region, setRegion]                   = useState("")
  const [address, setAddress]                 = useState("")
  const [emergencyName, setEmergencyName]     = useState("")
  const [emergencyPhone, setEmergencyPhone]   = useState("")
  const [relationship, setRelationship]       = useState("")
  const [consentData, setConsentData]         = useState<ConsentChoice | "">("")
  const [consentReporting, setConsentReporting] = useState<ConsentChoice | "">("")
  const [nationalId, setNationalId]           = useState("")
  const [bloodGroup, setBloodGroup]           = useState("")
  const [allergies, setAllergies]             = useState<string[]>([])
  const [conditions, setConditions]           = useState<string[]>([])

  const [loadingData, setLoadingData] = useState(true)
  const [errors, setErrors]           = useState<FormErrors>({})
  const [submitted, setSubmitted]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => {
    if (!id) return
    const token = localStorage.getItem("his_id_token")
    fetch(`${API_BASE}/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        setPatientNumber(String(data.patientId ?? ""))
        setDob(String(data.dob ?? ""))
        setSex(String(data.sex ?? ""))
        setFullName(String(data.name ?? ""))
        setPhone(String(data.phone ?? ""))
        setRegion(String(data.region ?? ""))
        setAddress(String(data.address ?? ""))
        setEmergencyName(String(data.emergencyName ?? ""))
        setEmergencyPhone(String(data.emergencyPhone ?? ""))
        setRelationship(String(data.relationship ?? ""))
        setConsentData((data.consentData as ConsentChoice) ?? "")
        setConsentReporting((data.consentReporting as ConsentChoice) ?? "")
        setNationalId(String(data.nationalId ?? ""))
        setBloodGroup(String(data.bloodGroup ?? ""))
        setAllergies((data.allergies as string[]) ?? [])
        setConditions((data.conditions as string[]) ?? [])
      })
      .catch(() => toast.error("Failed to load patient data."))
      .finally(() => setLoadingData(false))
  }, [id])

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!fullName.trim())       e.fullName       = "Full name is required."
    if (!phone.trim())          e.phone          = "Telephone number is required."
    if (!region)                e.region         = "Region / District is required."
    if (!address.trim())        e.address        = "Residential address is required."
    if (!emergencyName.trim())  e.emergencyName  = "Emergency contact name is required."
    if (!emergencyPhone.trim()) e.emergencyPhone = "Emergency contact phone is required."
    if (!relationship)          e.relationship   = "Relationship is required."
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    const token = localStorage.getItem("his_id_token")
    try {
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName, phone, region, address,
          emergencyName, emergencyPhone, relationship,
          consentData: consentData || undefined,
          consentReporting: consentReporting || undefined,
          nationalId: nationalId || undefined,
          bloodGroup: bloodGroup || undefined,
          allergies:  allergies.length ? allergies : undefined,
          conditions: conditions.length ? conditions : undefined,
        }),
      })
      const json = await res.json() as { message?: string; error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update patient.")
        return
      }
      toast.success("Patient record updated successfully.")
      navigate(`/patients/${id}`)
    } catch {
      toast.error("Network error. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-8 w-72 rounded" />
        <div className="max-w-[720px] rounded-lg border border-border bg-card p-6 shadow-sm space-y-5">
          {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/patients" className="hover:text-foreground">Patients</Link>
          <span>/</span>
          <Link to={`/patients/${id}`} className="hover:text-foreground">{fullName || "Patient"}</Link>
          <span>/</span>
          <span className="text-foreground">Edit</span>
        </nav>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Patient Record</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update demographic and contact details. Clinical records must be amended through the amendment flow.
          </p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="max-w-[720px] rounded-lg border border-border bg-card shadow-sm">
            <div className="space-y-8 p-6">

              {/* ── Identity (read-only) ── */}
              <div className="space-y-5">
                <SectionHeading label="Identity (Read-Only)" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Patient Number">
                    <Input value={patientNumber} readOnly className="bg-muted/50 text-muted-foreground" />
                  </Field>
                  <Field label="Date of Birth">
                    <Input value={dob} readOnly className="bg-muted/50 text-muted-foreground" />
                  </Field>
                  <Field label="Biological Sex">
                    <Input value={sex} readOnly className="bg-muted/50 text-muted-foreground" />
                  </Field>
                </div>
              </div>

              {/* ── Personal Information ── */}
              <div className="space-y-5">
                <SectionHeading label="Personal Information" />

                <Field label="Full Name" required error={submitted ? errors.fullName : undefined}>
                  <Input
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={cn(submitted && errors.fullName && "border-destructive focus-visible:ring-destructive")}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Telephone Number" required error={submitted ? errors.phone : undefined}>
                    <Input
                      type="tel"
                      placeholder="+237 6 00 00 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={cn(submitted && errors.phone && "border-destructive focus-visible:ring-destructive")}
                    />
                  </Field>

                  <Field label="Region / District" required error={submitted ? errors.region : undefined}>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={cn(
                        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                        submitted && errors.region && "border-destructive focus:ring-destructive"
                      )}
                    >
                      <option value="">Select a region</option>
                      {REGIONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Residential Address" required error={submitted ? errors.address : undefined}>
                  <Textarea
                    placeholder="Full residential address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className={cn("resize-none", submitted && errors.address && "border-destructive focus-visible:ring-destructive")}
                  />
                </Field>
              </div>

              {/* ── Emergency Contact ── */}
              <div className="space-y-5">
                <SectionHeading label="Emergency Contact" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Contact Name" required error={submitted ? errors.emergencyName : undefined}>
                    <Input
                      placeholder="Full name"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className={cn(submitted && errors.emergencyName && "border-destructive focus-visible:ring-destructive")}
                    />
                  </Field>

                  <Field label="Contact Phone" required error={submitted ? errors.emergencyPhone : undefined}>
                    <Input
                      type="tel"
                      placeholder="+237 6 00 00 00 00"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className={cn(submitted && errors.emergencyPhone && "border-destructive focus-visible:ring-destructive")}
                    />
                  </Field>

                  <Field label="Relationship" required error={submitted ? errors.relationship : undefined}>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className={cn(
                        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                        submitted && errors.relationship && "border-destructive focus:ring-destructive"
                      )}
                    >
                      <option value="">Select</option>
                      {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              {/* ── Consent ── */}
              <div className="space-y-5">
                <SectionHeading label="Consent" />

                <div className="flex items-start gap-3 rounded-md border-l-4 border-[#F59E0B] bg-[#F59E0B]/10 p-4">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                  <p className="text-sm text-foreground">
                    Consent changes take effect immediately for all subsequent data processing.{" "}
                    <span className="text-muted-foreground">(Cameroon Data Protection Law No. 2010/012)</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Field label="Personal Data Storage">
                    <RadioGroup value={consentData} onValueChange={(v) => setConsentData(v as ConsentChoice)} className="gap-2">
                      {(["Granted", "Refused", "Pending"] as ConsentChoice[]).map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`cd-${opt}`} />
                          <Label htmlFor={`cd-${opt}`} className="cursor-pointer text-sm font-normal">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </Field>

                  <Field
                    label="Anonymised Public Health Reporting"
                    tooltip="Controls whether anonymised data may be included in population-level reports."
                  >
                    <RadioGroup value={consentReporting} onValueChange={(v) => setConsentReporting(v as ConsentChoice)} className="gap-2">
                      {(["Granted", "Refused", "Pending"] as ConsentChoice[]).map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`cr-${opt}`} />
                          <Label htmlFor={`cr-${opt}`} className="cursor-pointer text-sm font-normal">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </Field>
                </div>
              </div>

              {/* ── Optional Attributes ── */}
              <div className="space-y-5">
                <SectionHeading label="Optional Attributes" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="National ID Number">
                    <Input
                      placeholder="ID Number"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                    />
                  </Field>

                  <Field label="Blood Group">
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select Group</option>
                      {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Known Allergies" tooltip="Press Enter or comma to add each allergy.">
                  <TagInput tags={allergies} onChange={setAllergies} placeholder="Type an allergy and press Enter..." />
                </Field>

                <Field label="Chronic Conditions" tooltip="Press Enter or comma to add each condition.">
                  <TagInput tags={conditions} onChange={setConditions} placeholder="Type a condition and press Enter..." />
                </Field>
              </div>
            </div>

            {/* ── Form actions ── */}
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
              <Link to={`/patients/${id}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  )
}
