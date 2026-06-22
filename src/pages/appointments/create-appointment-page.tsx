import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Search, CalendarPlus, AlertTriangle, ChevronDown, X, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// ── Mock patient roster ────────────────────────────────────────
const MOCK_PATIENTS = [
  { id: "P-8921", name: "Kamga, Marcel" },
  { id: "P-4592", name: "Doe, John" },
  { id: "P-4402", name: "Ondoa, Pierre" },
  { id: "P-1055", name: "Etoa, Jacques" },
  { id: "P-9100", name: "Fouda, Lucie" },
  { id: "P-2210", name: "Njoya, Ibrahim" },
  { id: "P-3301", name: "Jenkins, Sarah" },
  { id: "P-5512", name: "Ayuk, Emmanuel" },
  { id: "P-7743", name: "Biya, Christelle" },
  { id: "P-6621", name: "Mba, Celestine" },
  { id: "P-1188", name: "Talla, Eric" },
  { id: "P-2934", name: "Ndi, Samuel" },
]

interface Patient { id: string; name: string }

export function CreateAppointmentPage() {
  const navigate = useNavigate()

  // Patient combobox state
  const [query, setQuery] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  // Rest of form state
  const [date, setDate] = useState("2026-06-18")
  const [time, setTime] = useState("09:00")
  const [appointmentType, setAppointmentType] = useState("")
  const [clinician, setClinician] = useState("Dr. Ekane Paul")
  const [unit, setUnit] = useState("")
  const [notes, setNotes] = useState("")

  // Conflict: 08:00 with Dr. Ekane Paul is already booked
  const hasConflict = time === "08:00" && clinician === "Dr. Ekane Paul"

  // Filtered patient list
  const filtered = query.trim() === ""
    ? MOCK_PATIENTS
    : MOCK_PATIENTS.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.id.toLowerCase().includes(query.toLowerCase())
      )

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  function selectPatient(p: Patient) {
    setSelectedPatient(p)
    setQuery(p.name)
    setDropdownOpen(false)
  }

  function clearPatient() {
    setSelectedPatient(null)
    setQuery("")
    setDropdownOpen(false)
  }

  function handleSubmit() {
    if (!selectedPatient) {
      toast.error("Please select a patient before creating the appointment.")
      return
    }
    if (!appointmentType) {
      toast.error("Please select an appointment type.")
      return
    }
    if (!unit) {
      toast.error("Please select a clinical unit.")
      return
    }
    if (hasConflict) return

    // In production this would POST to the API; for now we show success and redirect
    toast.success(`Appointment created for ${selectedPatient.name} on ${date} at ${time}.`)
    navigate("/appointments")
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Back link */}
      <Link
        to="/appointments"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
      >
        <ArrowLeft size={18} />
        Back to Appointments
      </Link>

      {/* Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-5 border-b border-border bg-muted/30">
          <h1 className="text-2xl font-semibold text-foreground">Create Appointment</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule a new clinical engagement.</p>
        </div>

        {/* Conflict warning */}
        {hasConflict && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-400 px-6 py-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Scheduling Conflict Detected
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Dr. Ekane Paul already has an appointment at this time: Ayuk Emmanuel —
                Consultation, 08:00–08:45. Please select a different time.
              </p>
            </div>
          </div>
        )}

        {/* Form body */}
        <div className="p-6 space-y-6">

          {/* Patient combobox */}
          <div>
            <Label className="mb-1.5 block">Patient</Label>
            <div className="relative" ref={comboboxRef}>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="text"
                placeholder="Type name or Patient ID to search…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedPatient(null)
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

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <User size={14} />
                      No patients found matching &ldquo;{query}&rdquo;
                    </div>
                  ) : (
                    <ul className="max-h-52 overflow-y-auto py-1">
                      {filtered.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); selectPatient(p) }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors ${
                              selectedPatient?.id === p.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                            }`}
                          >
                            <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{p.id}</span>
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
                Selected: <span className="text-primary font-medium">{selectedPatient.id} — {selectedPatient.name}</span>
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-1.5 block">Appointment Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="scheme-light dark:scheme-dark"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Appointment Time</Label>
              <div className="relative">
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  title="Appointment time"
                  className={`w-full appearance-none px-3 py-2 pr-8 border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 transition-colors ${
                    hasConflict
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-primary"
                  }`}
                >
                  <option value="07:30">07:30</option>
                  <option value="08:00">08:00</option>
                  <option value="08:30">08:30</option>
                  <option value="09:00">09:00</option>
                  <option value="09:30">09:30</option>
                  <option value="10:00">10:00</option>
                  <option value="10:30">10:30</option>
                  <option value="11:00">11:00</option>
                  <option value="11:30">11:30</option>
                  <option value="14:00">14:00</option>
                  <option value="14:30">14:30</option>
                  <option value="15:00">15:00</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Appointment type */}
          <div>
            <Label className="mb-1.5 block">Appointment Type</Label>
            <div className="relative">
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                title="Appointment type"
                className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="" disabled>Select type…</option>
                <option value="consultation">Consultation</option>
                <option value="followup">Follow-up</option>
                <option value="laboratory">Laboratory</option>
                <option value="procedure">Procedure</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Clinician + Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-1.5 block">Assigned Clinician</Label>
              <Input
                type="text"
                value={clinician}
                onChange={(e) => setClinician(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Clinical Unit</Label>
              <div className="relative">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  title="Clinical unit"
                  className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="" disabled>Select unit…</option>
                  <option value="general">General Medicine</option>
                  <option value="cardiology">Cardiology</option>
                  <option value="pediatrics">Pediatrics</option>
                  <option value="neurology">Neurology</option>
                  <option value="surgery">Surgery</option>
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
            />
          </div>
        </div>

        {/* Card footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
          <Link to="/appointments">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            disabled={hasConflict}
            onClick={handleSubmit}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CalendarPlus size={16} />
            Create Appointment
          </Button>
        </div>
      </div>
    </div>
  )
}
