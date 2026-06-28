import { useState, useRef, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Search, CalendarPlus, AlertTriangle, ChevronDown, X, User,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { API_BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────

interface Patient  { id: string; patientId: string; name: string }
interface Staffler { id: string; fullName: string; jobTitle: string; roleName: string }

// ── API auth helper ───────────────────────────────────────────

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("his_id_token")}` }
}

// Time options 07:00–19:30 in 30-minute increments
const TIME_OPTIONS: string[] = []
for (let h = 7; h < 20; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`)
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`)
}

export function CreateAppointmentPage() {
  const navigate = useNavigate()

  // Patient combobox
  const [query,           setQuery]           = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientResults,  setPatientResults]  = useState<Patient[]>([])
  const [dropdownOpen,    setDropdownOpen]    = useState(false)
  const [searching,       setSearching]       = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Staff list for clinician select
  const [staffList, setStaffList]    = useState<Staffler[]>([])
  const [staffLoading, setStaffLoading] = useState(true)

  // Form fields
  const today = new Date().toISOString().split("T")[0]
  const [date,            setDate]            = useState(today)
  const [time,            setTime]            = useState("09:00")
  const [appointmentType, setAppointmentType] = useState("")
  const [clinicianId,     setClinicianId]     = useState("")
  const [unit,            setUnit]            = useState("")
  const [notes,           setNotes]           = useState("")

  // Submit state
  const [saving,    setSaving]    = useState(false)
  const [conflict,  setConflict]  = useState<{ id: string; patientName: string; dateTime: string } | null>(null)

  // ── Load staff list on mount ──────────────────────────────

  useEffect(() => {
    async function loadStaff() {
      try {
        const res  = await fetch(`${API_BASE}/staff`, { headers: authHeader() })
        const data = await res.json()
        if (res.ok) {
          const active = (data.staff ?? []).filter((s: Record<string, unknown>) => s.is_active)
          setStaffList(active.map((s: Record<string, unknown>) => ({
            id:       s.id as string,
            fullName: s.full_name as string,
            jobTitle: s.job_title as string,
            roleName: s.role_name as string,
          })))
        }
      } catch { /* silently ignore */ }
      finally { setStaffLoading(false) }
    }
    loadStaff()
  }, [])

  // ── Patient search with 300 ms debounce ──────────────────

  const searchPatients = useCallback(async (q: string) => {
    if (!q.trim()) { setPatientResults([]); return }
    setSearching(true)
    try {
      const res  = await fetch(
        `${API_BASE}/patients?q=${encodeURIComponent(q)}`,
        { headers: authHeader() },
      )
      const data = await res.json()
      if (res.ok) {
        setPatientResults(
          (data.patients ?? []).map((p: Record<string, unknown>) => ({
            id:        p.id as string,
            patientId: p.patientId as string,
            name:      p.name as string,
          })),
        )
      }
    } catch { /* silently ignore */ }
    finally { setSearching(false) }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setPatientResults([]); return }
    debounceRef.current = setTimeout(() => searchPatients(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, searchPatients])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  function selectPatient(p: Patient) {
    setSelectedPatient(p)
    setQuery(p.name)
    setDropdownOpen(false)
    setPatientResults([])
  }

  function clearPatient() {
    setSelectedPatient(null)
    setQuery("")
    setDropdownOpen(false)
    setPatientResults([])
  }

  // Derive the conflict warning: we only know a conflict occurred after a 409 from POST
  const hasConflict = conflict !== null

  // ── Submit ────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedPatient) {
      toast.error("Please select a patient before creating the appointment.")
      return
    }
    if (!appointmentType) {
      toast.error("Please select an appointment type.")
      return
    }
    if (!clinicianId) {
      toast.error("Please select a clinician.")
      return
    }
    if (!unit) {
      toast.error("Please select a clinical unit.")
      return
    }

    setSaving(true)
    setConflict(null)

    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          patientId:    selectedPatient.id,
          date,
          time,
          type:         appointmentType,
          clinicianId,
          clinicalUnit: unit,
          notes,
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        setConflict(data.conflictingAppointment ?? { id: "", patientName: "another patient", dateTime: "" })
        toast.warning("Scheduling conflict detected. Please select a different time.")
        return
      }

      if (!res.ok) {
        toast.error(data.message ?? "Failed to create appointment.")
        return
      }

      const appt = data.appointment
      toast.success(
        `Appointment created for ${selectedPatient.name} on ${appt?.date ?? date} at ${time}.`,
      )
      navigate("/appointments")
    } catch {
      toast.error("Network error — please try again.")
    } finally {
      setSaving(false)
    }
  }

  // ── Derive the selected clinician name ────────────────────

  const selectedClinician = staffList.find(s => s.id === clinicianId)

  return (
    <div className="max-w-160 mx-auto flex flex-col gap-6">
      <Link
        to="/appointments"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
      >
        <ArrowLeft size={18} />
        Back to Appointments
      </Link>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-muted/30">
          <h1 className="text-2xl font-semibold text-foreground">Create Appointment</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule a new clinical engagement.</p>
        </div>

        {/* Conflict warning */}
        {hasConflict && (
          <div
            role="alert"
            className="border-l-4 border-[#F59E0B] bg-[#F59E0B]/10 px-6 py-4 flex items-start gap-3"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
            <div>
              <h3 className="text-sm font-bold text-[#78350F] dark:text-[#F59E0B]">
                Scheduling Conflict Detected
              </h3>
              <p className="text-sm text-[#78350F] dark:text-[#F59E0B] mt-1">
                {selectedClinician?.fullName ?? "This clinician"} already has an appointment at
                this time: {conflict?.patientName}. Please select a different time.
              </p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">

          {/* Patient combobox */}
          <div>
            <Label className="mb-1.5 block">Patient <span className="text-destructive">*</span></Label>
            <div className="relative" ref={comboboxRef}>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="text"
                placeholder="Type name or Patient ID to search…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedPatient(null)
                  setConflict(null)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                className={`pl-10 pr-8 ${selectedPatient ? "text-foreground font-medium" : ""}`}
                autoComplete="off"
              />
              {selectedPatient && (
                <button
                  type="button"
                  onClick={clearPatient}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear selection"
                >
                  <X size={14} />
                </button>
              )}

              {dropdownOpen && query.trim() && (
                <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                  {searching ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground animate-pulse">
                      Searching…
                    </div>
                  ) : patientResults.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <User size={14} />
                      No patients found matching &ldquo;{query}&rdquo;
                    </div>
                  ) : (
                    <ul className="max-h-52 overflow-y-auto py-1">
                      {patientResults.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); selectPatient(p) }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors ${
                              selectedPatient?.id === p.id
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">
                              {p.patientId}
                            </span>
                            <span>{p.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {selectedPatient && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Selected:{" "}
                <span className="text-primary font-medium">
                  {selectedPatient.patientId} — {selectedPatient.name}
                </span>
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-1.5 block">Appointment Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setConflict(null) }}
                className="scheme-light dark:scheme-dark"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Appointment Time <span className="text-destructive">*</span></Label>
              <div className="relative">
                <select
                  value={time}
                  onChange={(e) => { setTime(e.target.value); setConflict(null) }}
                  title="Appointment time"
                  className={`w-full appearance-none px-3 py-2 pr-8 border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 transition-colors ${
                    hasConflict
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-primary"
                  }`}
                >
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Appointment type */}
          <div>
            <Label className="mb-1.5 block">Appointment Type <span className="text-destructive">*</span></Label>
            <div className="relative">
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                title="Appointment type"
                className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="" disabled>Select type…</option>
                <option value="consultation">Consultation</option>
                <option value="follow-up">Follow-up</option>
                <option value="laboratory">Laboratory</option>
                <option value="procedure">Procedure</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Clinician + Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-1.5 block">Assigned Clinician <span className="text-destructive">*</span></Label>
              <div className="relative">
                <select
                  value={clinicianId}
                  onChange={(e) => { setClinicianId(e.target.value); setConflict(null) }}
                  title="Assigned clinician"
                  disabled={staffLoading}
                  className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="" disabled>
                    {staffLoading ? "Loading staff…" : "Select clinician…"}
                  </option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.roleName ?? s.jobTitle})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Clinical Unit <span className="text-destructive">*</span></Label>
              <div className="relative">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  title="Clinical unit"
                  className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="" disabled>Select unit…</option>
                  <option value="General OPD">General OPD</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Emergency">Emergency</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1.5 block">
              Additional Notes{" "}
              <span className="font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Optional notes for the clinician…"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
          <Link to="/appointments">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="button"
            disabled={saving || hasConflict}
            onClick={handleSubmit}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CalendarPlus size={16} />
            {saving ? "Scheduling…" : "Create Appointment"}
          </Button>
        </div>
      </div>
    </div>
  )
}
