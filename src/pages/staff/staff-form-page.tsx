import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertCircle, Info } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ── Permission map per role ───────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "Hospital Admin":   ["patient:read", "patient:write", "patient:amend", "staff:manage", "role:assign", "analytics:view", "audit:view"],
  "Doctor":           ["patient:read", "patient:write", "diagnosis:write", "prescription:write", "lab_result:read", "appointment:write"],
  "Nurse":            ["patient:read", "patient:write", "lab_result:read", "appointment:write"],
  "Laboratory Tech":  ["patient:read", "lab_result:read", "lab_result:write"],
  "Receptionist":     ["patient:read", "patient:write", "appointment:write"],
  "Data Clerk":       ["patient:read", "patient:write"],
}

const ROLES = Object.keys(ROLE_PERMISSIONS)

const REGIONS = [
  "Centre", "Littoral", "North West", "South West", "West", "North", "Far North", "Adamawa", "East", "South",
]

const CLINICAL_UNITS = [
  "General Medicine", "Paediatrics", "Maternity", "Surgery", "Emergency", "Laboratory", "Radiology",
]

// ── Mock existing staff (for edit mode) ──────────────────────

const MOCK_STAFF: Record<string, {
  name: string; email: string; jobTitle: string; region: string; role: string; unit?: string
}> = {
  "1": { name: "Dr. Jane Smith", email: "jane.smith@his.med", jobTitle: "Chief Physician", region: "North West", role: "Doctor" },
  "2": { name: "Michael Johnson", email: "m.johnson@his.med", jobTitle: "Administrator", region: "Centre", role: "Hospital Admin" },
  "3": { name: "Robert Williams", email: "r.williams@his.med", jobTitle: "Nursing Staff", region: "South West", role: "Nurse", unit: "General Medicine" },
}

// ── Field validation state ────────────────────────────────────

interface FieldErrors {
  name?: string
  email?: string
  jobTitle?: string
  region?: string
  role?: string
}

// ── Section heading — plain text + divider (matches Stitch) ──

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="border-b border-border pb-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────

function Field({
  label, required, tooltip, error, children
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger type="button" className="text-muted-foreground">
                <Info size={13} />
              </TooltipTrigger>
              <TooltipContent className="max-w-52 text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

// ── Page ──────────────────────────────────────────────────────

export function StaffFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const existing = id ? MOCK_STAFF[id] : undefined

  const [name, setName] = useState(existing?.name ?? "")
  const [email, setEmail] = useState(existing?.email ?? "")
  const [jobTitle, setJobTitle] = useState(existing?.jobTitle ?? "")
  const [region, setRegion] = useState(existing?.region ?? "")
  const [role, setRole] = useState(existing?.role ?? "")
  const [unit, setUnit] = useState(existing?.unit ?? "")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const isNurse = role === "Nurse"
  const permissions = ROLE_PERMISSIONS[role] ?? []

  function validate(): FieldErrors {
    const e: FieldErrors = {}
    if (!name.trim()) e.name = "Full name is required to create a staff record."
    if (!email.trim()) e.email = "Email address is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address."
    if (!jobTitle.trim()) e.jobTitle = "Job title is required."
    if (!region) e.region = "Region / Facility is required."
    if (!role) e.role = "System role is required."
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    toast.success(isEdit ? "Staff Account Updated" : "Staff Account Created", {
      description: isEdit
        ? `${name}'s account has been updated successfully.`
        : `${name} has been added. A temporary password will be sent to ${email}.`,
    })
    navigate("/staff")
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/staff" className="hover:text-foreground">Staff Management</Link>
          <span>/</span>
          <span className="text-foreground">{isEdit ? "Edit Staff Member" : "New Staff Member"}</span>
        </nav>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isEdit ? "Edit Staff Member" : "Create Staff Member"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit
              ? "Update this staff member's information and system access level."
              : "Add a new staff account and configure their system access level."}
          </p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="max-w-2xl rounded-lg border border-border bg-card shadow-sm">
            <div className="space-y-8 p-6">

              {/* ── Personal Information ── */}
              <div className="space-y-5">
                <SectionHeading label="Personal Information" />

                <Field
                  label="Full Name"
                  required
                  error={submitted ? errors.name : undefined}
                >
                  <Input
                    type="text"
                    placeholder="e.g. Dr. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(submitted && errors.name && "border-destructive focus-visible:ring-destructive")}
                  />
                </Field>

                <Field
                  label="Email Address"
                  required
                  error={submitted ? errors.email : undefined}
                >
                  <Input
                    type="email"
                    placeholder="sarah.jenkins@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(submitted && errors.email && "border-destructive focus-visible:ring-destructive")}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Job Title"
                    tooltip="Enter the staff member's official job title as it appears on their contract."
                    error={submitted ? errors.jobTitle : undefined}
                  >
                    <Input
                      type="text"
                      placeholder="e.g. Cardiologist"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className={cn(submitted && errors.jobTitle && "border-destructive focus-visible:ring-destructive")}
                    />
                  </Field>

                  <Field
                    label="Region / Facility"
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
                      <option value="">Select facility</option>
                      {REGIONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              {/* ── Access & Role ── */}
              <div className="space-y-5">
                <SectionHeading label="Access & Role" />

                <Field
                  label="System Role"
                  required
                  error={submitted ? errors.role : undefined}
                >
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={cn(
                      "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                      submitted && errors.role && "border-destructive focus:ring-destructive"
                    )}
                  >
                    <option value="">Select a role</option>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>

                {/* Permission preview pills */}
                {permissions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {permissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ward Head Nurse unit — only when role = Nurse */}
                {isNurse && (
                  <Field
                    label="Primary Unit Assignment"
                    tooltip="Designates this nurse as the Ward Head Nurse for the selected unit. They will receive critical lab result alerts for patients in that unit (REQ-F-041). If no unit is selected, the nurse is a general nurse with no ward-head routing."
                  >
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select Unit (optional)</option>
                      {CLINICAL_UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </Field>
                )}
              </div>
            </div>

            {/* Form footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => navigate("/staff")}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                {isEdit ? "Save Changes" : "Create Staff Account"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  )
}
