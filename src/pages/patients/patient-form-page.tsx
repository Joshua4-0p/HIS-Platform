import { useState, useRef, type KeyboardEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AlertCircle, AlertTriangle, Info, X, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ── Constants ─────────────────────────────────────────────────────

const REGIONS = [
  "Centre", "Littoral", "North West", "South West", "West",
  "North", "Far North", "Adamawa", "East", "South",
]

const RELATIONSHIPS = ["Parent", "Spouse", "Sibling", "Child", "Friend", "Guardian", "Other"]

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "Unknown"]

type ConsentChoice = "Granted" | "Refused" | "Pending"

// ── Mock duplicates (triggered when name contains "smithson") ─────

const MOCK_DUPLICATES = [
  {
    id: "dup1",
    name: "James A. Smithson",
    matchPct: 94,
    dob: "Aug 14, 1955",
    patientId: "CMR-8823-X",
    lastLocation: "Northwest Regional Clinic",
  },
  {
    id: "dup2",
    name: "J. Smithson",
    matchPct: 87,
    dob: "Aug 14, 1955",
    patientId: "CMR-1049-A",
    lastLocation: "City General Hospital",
  },
]

// ── Section Heading ───────────────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="border-b border-border pb-2">
      <h2 className="text-base font-semibold text-foreground">{label}</h2>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────

function Field({
  label,
  required,
  tooltip,
  error,
  children,
}: {
  label: string
  required?: boolean
  tooltip?: string
  error?: string
  children: React.ReactNode
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

// ── Tag Input ─────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(value: string) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput("")
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag(input)
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div
      className="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(tags.filter((t) => t !== tag))
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
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

// ── Duplicate Detection Dialog ────────────────────────────────────

function DuplicateDialog({
  open,
  onOpenChange,
  onCreateNew,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateNew: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="flex-row items-start gap-4 border-b border-border bg-muted/20 p-6">
          <AlertTriangle size={28} className="mt-0.5 shrink-0 text-[#F59E0B]" />
          <div>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Possible Duplicate Patient Detected
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              We found existing records with similar names and dates of birth. Please review before
              creating a new record.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Match cards */}
        <div className="flex flex-col gap-4 bg-background p-6">
          {MOCK_DUPLICATES.map((dup) => (
            <div
              key={dup.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="text-base font-semibold text-foreground">{dup.name}</span>
                  <span className="inline-flex items-center gap-1 rounded bg-[#F59E0B]/15 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                    {dup.matchPct}% Match
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <span className="block text-xs text-muted-foreground">DOB</span>
                    <span className="text-sm text-foreground">{dup.dob}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">Patient ID</span>
                    <span className="font-mono text-sm text-foreground">{dup.patientId}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs text-muted-foreground">Last Encounter Location</span>
                    <span className="text-sm text-foreground">{dup.lastLocation}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-2 border-primary text-primary hover:bg-primary/5 sm:w-auto"
                  onClick={() => onOpenChange(false)}
                >
                  Open Existing Record
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 border-t border-border bg-muted/20 p-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button
            className="w-full gap-2 bg-primary py-2.5 text-primary-foreground hover:bg-primary/90"
            onClick={onCreateNew}
          >
            <UserPlus size={18} />
            This is a different patient — Create New Record
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-sm text-primary hover:underline"
          >
            Cancel Registration
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Form errors ───────────────────────────────────────────────────

interface FormErrors {
  fullName?: string
  dob?: string
  sex?: string
  phone?: string
  region?: string
  address?: string
  emergencyName?: string
  emergencyPhone?: string
  relationship?: string
  consentData?: string
}

// ── Page ──────────────────────────────────────────────────────────

export function PatientFormPage() {
  const navigate = useNavigate()

  // Personal Information
  const [fullName, setFullName]   = useState("")
  const [dob, setDob]             = useState("")
  const [sex, setSex]             = useState<"Male" | "Female" | "Other" | "">("")
  const [phone, setPhone]         = useState("")
  const [region, setRegion]       = useState("")
  const [address, setAddress]     = useState("")

  // Emergency Contact
  const [emergencyName, setEmergencyName]   = useState("")
  const [emergencyPhone, setEmergencyPhone] = useState("")
  const [relationship, setRelationship]     = useState("")

  // Consent
  const [consentData, setConsentData]           = useState<ConsentChoice | "">("")
  const [consentReporting, setConsentReporting] = useState<ConsentChoice | "">("")

  // Optional Attributes
  const [nationalId, setNationalId]     = useState("")
  const [bloodGroup, setBloodGroup]     = useState("")
  const [allergies, setAllergies]       = useState<string[]>([])
  const [conditions, setConditions]     = useState<string[]>([])

  // UI State
  const [errors, setErrors]                   = useState<FormErrors>({})
  const [submitted, setSubmitted]             = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!fullName.trim())       e.fullName      = "Full name is required."
    if (!dob)                   e.dob           = "Date of birth is required."
    if (!sex)                   e.sex           = "Biological sex is required."
    if (!phone.trim())          e.phone         = "Telephone number is required."
    if (!region)                e.region        = "Region / District is required."
    if (!address.trim())        e.address       = "Residential address is required."
    if (!emergencyName.trim())  e.emergencyName  = "Emergency contact name is required."
    if (!emergencyPhone.trim()) e.emergencyPhone = "Emergency contact phone is required."
    if (!relationship)          e.relationship   = "Relationship is required."
    if (!consentData)           e.consentData    = "Personal data storage consent is required."
    return e
  }

  function registerPatient() {
    const pid = `CMR-${String(Math.floor(10000 + Math.random() * 90000))}`
    toast.success("Patient Registered", {
      description: `${fullName} has been registered successfully. Patient ID: ${pid}.`,
    })
    navigate("/patients")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // Mock duplicate detection: trigger when name contains "smithson"
    if (fullName.toLowerCase().includes("smithson")) {
      setShowDuplicateDialog(true)
      return
    }

    registerPatient()
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/patients" className="hover:text-foreground">
            Patients
          </Link>
          <span>/</span>
          <span className="text-foreground">Register New Patient</span>
        </nav>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Register New Patient</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter complete demographic and clinical details to create a new patient record.
          </p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="max-w-[720px] rounded-lg border border-border bg-card shadow-sm">
            <div className="space-y-8 p-6">

              {/* ── Personal Information ── */}
              <div className="space-y-5">
                <SectionHeading label="Personal Information" />

                <Field label="Full Name" required error={submitted ? errors.fullName : undefined}>
                  <Input
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={cn(
                      submitted && errors.fullName && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Date of Birth" required error={submitted ? errors.dob : undefined}>
                    <Input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className={cn(
                        submitted && errors.dob && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                  </Field>

                  <Field label="Biological Sex" required error={submitted ? errors.sex : undefined}>
                    <div className="flex h-10 items-center gap-6">
                      {(["Male", "Female", "Other"] as const).map((opt) => (
                        <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="biological-sex"
                            value={opt}
                            checked={sex === opt}
                            onChange={() => setSex(opt)}
                            className="size-4 accent-primary"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Telephone Number"
                    required
                    error={submitted ? errors.phone : undefined}
                  >
                    <Input
                      type="tel"
                      placeholder="+237 6 00 00 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={cn(
                        submitted && errors.phone && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                  </Field>

                  <Field
                    label="Region / District"
                    required
                    error={submitted ? errors.region : undefined}
                  >
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={cn(
                        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                        submitted && errors.region && "border-destructive focus:ring-destructive"
                      )}
                    >
                      <option value="">Select a region</option>
                      {REGIONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field
                  label="Residential Address"
                  required
                  error={submitted ? errors.address : undefined}
                >
                  <Textarea
                    placeholder="Full residential address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className={cn(
                      "resize-none",
                      submitted && errors.address && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </Field>
              </div>

              {/* ── Emergency Contact ── */}
              <div className="space-y-5">
                <SectionHeading label="Emergency Contact" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field
                    label="Contact Name"
                    required
                    error={submitted ? errors.emergencyName : undefined}
                  >
                    <Input
                      placeholder="Full name"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className={cn(
                        submitted && errors.emergencyName && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                  </Field>

                  <Field
                    label="Contact Phone"
                    required
                    error={submitted ? errors.emergencyPhone : undefined}
                  >
                    <Input
                      type="tel"
                      placeholder="+237 6 00 00 00 00"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className={cn(
                        submitted && errors.emergencyPhone && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                  </Field>

                  <Field
                    label="Relationship"
                    required
                    error={submitted ? errors.relationship : undefined}
                  >
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className={cn(
                        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                        submitted && errors.relationship && "border-destructive focus:ring-destructive"
                      )}
                    >
                      <option value="">Select</option>
                      {RELATIONSHIPS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* ── Consent (Required) ── */}
              <div className="space-y-5">
                <SectionHeading label="Consent (Required)" />

                {/* Amber compliance banner — border-l-4 per phases.md spec */}
                <div className="flex items-start gap-3 rounded-md border-l-4 border-[#F59E0B] bg-[#F59E0B]/10 p-4">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                  <p className="text-sm text-foreground">
                    Patient consent must be recorded before this registration can be saved.{" "}
                    <span className="text-muted-foreground">
                      (Cameroon Data Protection Law No. 2010/012)
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Field
                    label="Personal Data Storage"
                    required
                    error={submitted ? errors.consentData : undefined}
                  >
                    <RadioGroup
                      value={consentData}
                      onValueChange={(v) => setConsentData(v as ConsentChoice)}
                      className="gap-2"
                    >
                      {(["Granted", "Refused", "Pending"] as ConsentChoice[]).map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`consent-data-${opt}`} />
                          <Label
                            htmlFor={`consent-data-${opt}`}
                            className="cursor-pointer text-sm font-normal"
                          >
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </Field>

                  <Field
                    label="Anonymised Public Health Reporting"
                    tooltip="Controls whether this patient's anonymised data can be included in population-level public health reports."
                  >
                    <RadioGroup
                      value={consentReporting}
                      onValueChange={(v) => setConsentReporting(v as ConsentChoice)}
                      className="gap-2"
                    >
                      {(["Granted", "Refused", "Pending"] as ConsentChoice[]).map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`consent-reporting-${opt}`} />
                          <Label
                            htmlFor={`consent-reporting-${opt}`}
                            className="cursor-pointer text-sm font-normal"
                          >
                            {opt}
                          </Label>
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
                      {BLOOD_GROUPS.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field
                  label="Known Allergies"
                  tooltip="Type an allergy and press Enter to add it as a tag. You can add multiple allergies."
                >
                  <TagInput
                    tags={allergies}
                    onChange={setAllergies}
                    placeholder="Add allergy and press Enter..."
                  />
                </Field>

                <Field
                  label="Chronic Conditions"
                  tooltip="Type a condition and press Enter to add it as a tag. You can add multiple chronic conditions."
                >
                  <TagInput
                    tags={conditions}
                    onChange={setConditions}
                    placeholder="Add condition and press Enter..."
                  />
                </Field>
              </div>
            </div>

            {/* Form footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => navigate("/patients")}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus size={16} />
                Register Patient
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Duplicate Detection Dialog (Page 5.3) ── */}
      <DuplicateDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        onCreateNew={() => {
          setShowDuplicateDialog(false)
          registerPatient()
        }}
      />
    </TooltipProvider>
  )
}
