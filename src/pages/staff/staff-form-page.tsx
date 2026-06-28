import { useState, useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertCircle, Info, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

// ── Constants ─────────────────────────────────────────────────

const REGIONS = [
  "Centre", "Littoral", "North West", "South West", "West", "North", "Far North", "Adamawa", "East", "South",
]

const CLINICAL_UNITS = [
  "General Medicine", "Paediatrics", "Maternity", "Surgery", "Emergency", "Laboratory", "Radiology",
]

// ── Types ─────────────────────────────────────────────────────

interface RoleOption {
  id: string
  name: string
  permissions: string[]
}

interface FieldErrors {
  name?: string
  email?: string
  jobTitle?: string
  region?: string
  role?: string
}

// ── Field components ──────────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="border-b border-border pb-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  )
}

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

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [region, setRegion] = useState("")
  const [roleId, setRoleId] = useState("")
  const [unit, setUnit] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [roles, setRoles] = useState<RoleOption[]>([])

  const token = localStorage.getItem("his_id_token")

  // Load roles from API
  useEffect(() => {
    fetch(`${API_BASE}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setRoles(data.roles ?? []))
      .catch(() => {})
  }, [token])

  // Load existing staff if editing
  useEffect(() => {
    if (!isEdit || !id) return
    fetch(`${API_BASE}/staff/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setName(data.fullName ?? "")
        setEmail(data.email ?? "")
        setJobTitle(data.jobTitle ?? "")
        setRegion(data.regionDistrict ?? "")
        setRoleId(data.roleId ?? "")
        setUnit(data.wardHeadUnit ?? "")
      })
      .catch(() => toast.error("Failed to load staff member."))
      .finally(() => setLoading(false))
  }, [id, isEdit, token])

  const selectedRole = roles.find((r) => r.id === roleId)
  const isNurse = selectedRole?.name === "Nurse"
  const permissions = selectedRole?.permissions ?? []

  function validate(): FieldErrors {
    const e: FieldErrors = {}
    if (!name.trim()) e.name = "Full name is required to create a staff record."
    if (!email.trim()) e.email = "Email address is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address."
    if (!jobTitle.trim()) e.jobTitle = "Job title is required."
    if (!region) e.region = "Region / Facility is required."
    if (!roleId) e.role = "System role is required."
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const url = isEdit ? `${API_BASE}/staff/${id}` : `${API_BASE}/staff`
      const method = isEdit ? "PUT" : "POST"
      const body = isEdit
        ? { fullName: name, jobTitle, regionDistrict: region, wardHeadUnit: unit || undefined }
        : { fullName: name, email, jobTitle, regionDistrict: region, roleId, wardHeadUnit: unit || undefined }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(isEdit ? "Update failed" : "Creation failed", { description: json.error ?? "Please try again." })
        return
      }

      if (!isEdit && json.tempPassword) {
        toast.success("Staff Account Created", {
          description: `${name} added. Temp password: ${json.tempPassword}`,
          duration: 15000,
        })
      } else {
        toast.success(isEdit ? "Staff Account Updated" : "Staff Account Created", {
          description: isEdit
            ? `${name}'s account has been updated successfully.`
            : `${name} has been added to the system.`,
        })
      }
      navigate("/staff")
    } catch {
      toast.error("Network error. Please check your connection.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-40 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
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
                    disabled={isEdit}
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
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    disabled={isEdit}
                    className={cn(
                      "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                      submitted && errors.role && "border-destructive focus:ring-destructive"
                    )}
                  >
                    <option value="">Select a role</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
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

                {/* Ward Head Nurse unit */}
                {isNurse && (
                  <Field
                    label="Primary Unit Assignment"
                    tooltip="Designates this nurse as the Ward Head Nurse for the selected unit. They will receive critical lab result alerts for patients in that unit (REQ-F-041)."
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
              <Button
                type="submit"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={submitting}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {isEdit ? "Save Changes" : "Create Staff Account"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  )
}
