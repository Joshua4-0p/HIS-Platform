import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Droplets,
  FileText,
  FlaskConical,
  Heart,
  Info,
  Lock,
  Pencil,
  Pill,
  Plus,
  Scale,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  Wind,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ── Types ─────────────────────────────────────────────────────

type DiagSeverity = "Mild" | "Moderate" | "Severe"
type DiagStatus   = "Active" | "Resolved" | "Suspected"
type LabUrgency   = "Routine" | "Urgent"
type LabStatus    = "Pending" | "Completed"

interface Diagnosis {
  id: string
  condition: string
  icd10: string
  severity: DiagSeverity
  status: DiagStatus
  clinician: string
  date: string
}

interface VitalSigns {
  temperature: number
  bpSys: number
  bpDia: number
  pulse: number
  respiratoryRate: number
  spo2: number
  weight: number
  recordedAt: string
}

interface Prescription {
  id: string
  medication: string
  dosage: string
  frequency: string
  route: string
  duration: string
  prescriber: string
  date: string
}

interface LabRequest {
  id: string
  test: string
  requested: string
  urgency: LabUrgency
  status: LabStatus
  result: string | null
}

// ── Style maps ────────────────────────────────────────────────

const SEV_STYLES = {
  Mild:     "bg-[#10B981]/10 text-[#10B981]",
  Moderate: "bg-[#F59E0B]/10 text-[#78350F]",
  Severe:   "bg-[#EF4444]/10 text-[#EF4444]",
} satisfies Record<DiagSeverity, string>

const DST_STYLES = {
  Active:    "bg-primary/10 text-primary",
  Resolved:  "bg-[#10B981]/10 text-[#10B981]",
  Suspected: "bg-[#F59E0B]/10 text-[#78350F]",
} satisfies Record<DiagStatus, string>

// ── Mock data ─────────────────────────────────────────────────

const MOCK_ENCOUNTER = {
  id:                 "ENC-20260618",
  date:               "June 18, 2026",
  time:               "09:30",
  unit:               "Internal Medicine",
  complaint:          "Persistent headache and fatigue over the past two weeks, with associated nausea and mild fever.",
  clinician:          "Dr. Ekane Paul",
  clinicianInitials:  "EP",
  status:             "In Progress",
  isOwnEncounter:     true,
}

const MOCK_IS_HOSPITAL_ADMIN = false

const INIT_DIAGNOSES: Diagnosis[] = [
  { id: "d1", condition: "Malaria",          icd10: "B54",   severity: "Moderate", status: "Active",   clinician: "Dr. Ekane Paul", date: "2026-06-18" },
  { id: "d2", condition: "Anaemia",           icd10: "D64.9", severity: "Mild",     status: "Active",   clinician: "Dr. Ekane Paul", date: "2026-06-18" },
  { id: "d3", condition: "Acute Bronchitis",  icd10: "J20.9", severity: "Mild",     status: "Resolved", clinician: "Dr. Mbi Alice",  date: "2026-03-12" },
]

const MOCK_VITALS: VitalSigns = {
  temperature:     38.4,
  bpSys:           118,
  bpDia:           76,
  pulse:           88,
  respiratoryRate: 18,
  spo2:            97,
  weight:          72.5,
  recordedAt:      "09:45",
}

const INIT_PRESCRIPTIONS: Prescription[] = [
  { id: "p1", medication: "Artemether-Lumefantrine", dosage: "80/480mg", frequency: "Twice daily",       route: "Oral", duration: "3 days", prescriber: "Dr. Ekane Paul", date: "2026-06-18" },
  { id: "p2", medication: "Paracetamol",             dosage: "500mg",    frequency: "Three times daily", route: "Oral", duration: "5 days", prescriber: "Dr. Ekane Paul", date: "2026-06-18" },
]

const INIT_LAB_REQUESTS: LabRequest[] = [
  { id: "l1", test: "Malaria RDT",     requested: "09:35", urgency: "Urgent",  status: "Completed", result: "Positive (P. falciparum)" },
  { id: "l2", test: "Full Blood Count", requested: "09:35", urgency: "Routine", status: "Pending",   result: null },
]

// ── Vital trends data ─────────────────────────────────────────

const VITAL_HISTORY = [
  { day: "Mon", temp: 37.8, pulse: 92, bpSys: 128, spo2: 95 },
  { day: "Tue", temp: 38.2, pulse: 88, bpSys: 122, spo2: 96 },
  { day: "Wed", temp: 38.4, pulse: 88, bpSys: 120, spo2: 97 },
  { day: "Thu", temp: 38.1, pulse: 84, bpSys: 118, spo2: 97 },
  { day: "Fri", temp: 37.6, pulse: 82, bpSys: 116, spo2: 98 },
  { day: "Sat", temp: 37.3, pulse: 80, bpSys: 115, spo2: 98 },
  { day: "Sun", temp: 37.2, pulse: 79, bpSys: 114, spo2: 98 },
]

type ChartMetric = "Temperature" | "Pulse" | "BP Systolic" | "SpO₂"

const CHART_CFG = {
  Temperature:   { dataKey: "temp",  color: "#F59E0B", unit: "°C",  domain: [35.5, 40.5] as [number, number] },
  Pulse:         { dataKey: "pulse", color: "#EF4444", unit: "bpm", domain: [55,  115]   as [number, number] },
  "BP Systolic": { dataKey: "bpSys", color: "#3B82F6", unit: "mmHg", domain: [95, 155]  as [number, number] },
  "SpO₂":       { dataKey: "spo2",  color: "#10B981", unit: "%",   domain: [88, 102]   as [number, number] },
} satisfies Record<ChartMetric, { dataKey: string; color: string; unit: string; domain: [number, number] }>

const FREQ_OPTIONS  = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "As needed", "Other"]
const ROUTE_OPTIONS = ["Oral", "Intravenous (IV)", "Intramuscular (IM)", "Topical", "Inhaled", "Other"]
const LAB_TESTS     = ["Full Blood Count", "Malaria RDT", "Urinalysis", "Blood Glucose", "Liver Function Test", "Renal Function Test", "Chest X-Ray", "ECG"]

// ── Helpers ───────────────────────────────────────────────────

function spo2ValueClass(v: number): string {
  if (v >= 95) return "text-[#10B981]"
  if (v >= 90) return "text-[#F59E0B]"
  return "text-destructive"
}

function tempValueClass(v: number): string {
  return v > 37.5 ? "text-[#F59E0B]" : "text-foreground"
}

// ── SegmentedControl ─────────────────────────────────────────

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex w-full rounded-md border border-input bg-muted p-1">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "flex-1 rounded-sm py-1.5 text-sm transition-colors",
            value === o
              ? "bg-primary font-medium text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

// ── VitalCard ─────────────────────────────────────────────────

function VitalCard({
  icon,
  label,
  value,
  unit,
  note,
  valueClass = "text-foreground",
  warning = false,
  recordedAt,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  note: string
  valueClass?: string
  warning?: boolean
  recordedAt: string
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded bg-muted text-muted-foreground">
            {icon}
          </div>
          <h3 className="text-sm font-medium text-foreground">{label}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{recordedAt}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-4xl font-bold", valueClass)}>{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          {warning && <AlertTriangle size={14} className="text-destructive" />}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              warning ? "bg-destructive" : "bg-[#10B981]",
            )}
          />
          {note}
        </p>
      </div>
    </div>
  )
}

// ── AddDiagnosisDialog ────────────────────────────────────────

function AddDiagnosisDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (d: Diagnosis) => void
}) {
  const [condition, setCondition] = useState("")
  const [icd10,     setIcd10]     = useState("")
  const [severity,  setSeverity]  = useState<DiagSeverity>("Mild")
  const [status,    setStatus]    = useState<DiagStatus>("Active")
  const [submitted, setSubmitted] = useState(false)

  const condErr = submitted && !condition.trim()

  function reset() {
    setCondition(""); setIcd10(""); setSeverity("Mild"); setStatus("Active"); setSubmitted(false)
  }
  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!condition.trim()) return
    onAdd({
      id:        `d-${Date.now()}`,
      condition,
      icd10,
      severity,
      status,
      clinician: "Dr. Ekane Paul",
      date:      new Date().toISOString().split("T")[0],
    })
    toast.success("Diagnosis Added", {
      description: "The diagnosis has been recorded on this encounter.",
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-primary" />
            <DialogTitle className="text-lg font-semibold">Add Diagnosis</DialogTitle>
          </div>
        </DialogHeader>

        <TooltipProvider>
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4 p-6">
              {/* Condition */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Condition Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Malaria, Hypertension, Type 2 Diabetes..."
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  className={cn(condErr && "border-destructive")}
                />
                {condErr && (
                  <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                    <AlertCircle size={12} /> Required.
                  </p>
                )}
              </div>

              {/* ICD-10 */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-sm font-medium text-foreground">
                  ICD-10 Code{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={13} className="cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-56 text-xs">
                      The International Classification of Diseases 10th revision code. Leave blank if unknown.
                    </TooltipContent>
                  </Tooltip>
                </label>
                <Input
                  placeholder="e.g. B54"
                  value={icd10}
                  onChange={e => setIcd10(e.target.value)}
                  className="max-w-40"
                />
              </div>

              {/* Severity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Severity <span className="text-destructive">*</span>
                </label>
                <SegmentedControl<DiagSeverity>
                  options={["Mild", "Moderate", "Severe"]}
                  value={severity}
                  onChange={setSeverity}
                />
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Status <span className="text-destructive">*</span>
                </label>
                <SegmentedControl<DiagStatus>
                  options={["Active", "Resolved", "Suspected"]}
                  value={status}
                  onChange={setStatus}
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Add Diagnosis
              </Button>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}

// ── RecordVitalsDialog ────────────────────────────────────────

function RecordVitalsDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (v: VitalSigns) => void
}) {
  const [temp,  setTemp]  = useState("")
  const [bpSys, setBpSys] = useState("")
  const [bpDia, setBpDia] = useState("")
  const [pulse, setPulse] = useState("")
  const [resp,  setResp]  = useState("")
  const [spo2,  setSpo2]  = useState("")
  const [wt,    setWt]    = useState("")

  function reset() {
    setTemp(""); setBpSys(""); setBpDia(""); setPulse(""); setResp(""); setSpo2(""); setWt("")
  }
  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSaved({
      temperature:     parseFloat(temp)  || 0,
      bpSys:           parseInt(bpSys)   || 0,
      bpDia:           parseInt(bpDia)   || 0,
      pulse:           parseInt(pulse)   || 0,
      respiratoryRate: parseInt(resp)    || 0,
      spo2:            parseInt(spo2)    || 0,
      weight:          parseFloat(wt)    || 0,
      recordedAt:      new Date().toTimeString().slice(0, 5),
    })
    toast.success("Vital Signs Recorded", {
      description: "Vital signs have been saved to this encounter.",
    })
    handleClose()
  }

  const numCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-120 gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Activity size={18} className="text-primary" />
            </div>
            <DialogTitle className="text-lg font-semibold">Record Vital Signs</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="max-h-135 overflow-x-hidden overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              {/* Temperature */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Temperature</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.0"
                    value={temp}
                    onChange={e => setTemp(e.target.value)}
                    className={numCls}
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">
                    °C
                  </span>
                </div>
              </div>

              {/* Pulse */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Pulse Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="72"
                    value={pulse}
                    onChange={e => setPulse(e.target.value)}
                    className={numCls}
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">
                    bpm
                  </span>
                </div>
              </div>

              {/* Blood Pressure — spans both columns */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Blood Pressure</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="120"
                    value={bpSys}
                    onChange={e => setBpSys(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-lg font-bold text-muted-foreground">/</span>
                  <input
                    type="number"
                    placeholder="80"
                    value={bpDia}
                    onChange={e => setBpDia(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">mmHg</span>
                </div>
              </div>

              {/* Respiratory Rate */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Respiratory Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="16"
                    value={resp}
                    onChange={e => setResp(e.target.value)}
                    className={numCls}
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">
                    brpm
                  </span>
                </div>
              </div>

              {/* SpO2 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Oxygen Saturation</label>
                <div className="relative">
                  <input
                    type="number"
                    max={100}
                    placeholder="98"
                    value={spo2}
                    onChange={e => setSpo2(e.target.value)}
                    className={numCls}
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>

              {/* Weight */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Weight</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="70.0"
                    value={wt}
                    onChange={e => setWt(e.target.value)}
                    className={numCls}
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">
                    kg
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Activity size={16} /> Save Vital Signs
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── AddPrescriptionDialog ─────────────────────────────────────

function AddPrescriptionDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (p: Prescription) => void
}) {
  const [medication, setMedication] = useState("")
  const [dosage,     setDosage]     = useState("")
  const [frequency,  setFrequency]  = useState("")
  const [route,      setRoute]      = useState("")
  const [duration,   setDuration]   = useState("")
  const [submitted,  setSubmitted]  = useState(false)

  const errs = {
    medication: submitted && !medication.trim(),
    dosage:     submitted && !dosage.trim(),
    frequency:  submitted && !frequency,
    route:      submitted && !route,
    duration:   submitted && !duration.trim(),
  }

  function reset() {
    setMedication(""); setDosage(""); setFrequency(""); setRoute(""); setDuration(""); setSubmitted(false)
  }
  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!medication.trim() || !dosage.trim() || !frequency || !route || !duration.trim()) return
    onAdd({
      id:         `p-${Date.now()}`,
      medication,
      dosage,
      frequency,
      route,
      duration,
      prescriber: "Dr. Ekane Paul",
      date:       new Date().toISOString().split("T")[0],
    })
    toast.success("Prescription Added", {
      description: "The prescription has been recorded on this encounter.",
    })
    handleClose()
  }

  const selCls = (err?: boolean) =>
    cn(
      "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
      err ? "border-destructive" : "border-input",
    )

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-125 gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Pill size={18} className="text-primary" />
            <DialogTitle className="text-lg font-semibold">Write Prescription</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 p-6">
            {/* Medication */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Medication Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Amoxicillin, Paracetamol, Metformin..."
                value={medication}
                onChange={e => setMedication(e.target.value)}
                className={cn(errs.medication && "border-destructive")}
              />
              {errs.medication && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Required.
                </p>
              )}
            </div>

            {/* Dosage */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Dosage <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. 500mg, 10ml"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                className={cn(errs.dosage && "border-destructive")}
              />
              {errs.dosage && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Required.
                </p>
              )}
            </div>

            {/* Frequency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Frequency <span className="text-destructive">*</span>
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                title="Frequency"
                className={selCls(errs.frequency)}
              >
                <option value="">Select frequency...</option>
                {FREQ_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {errs.frequency && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Required.
                </p>
              )}
            </div>

            {/* Route */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Route of Administration <span className="text-destructive">*</span>
              </label>
              <select
                value={route}
                onChange={e => setRoute(e.target.value)}
                title="Route"
                className={selCls(errs.route)}
              >
                <option value="">Select route...</option>
                {ROUTE_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {errs.route && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Required.
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Duration <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. 7 days, 2 weeks"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className={cn(errs.duration && "border-destructive")}
              />
              {errs.duration && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Required.
                </p>
              )}
            </div>

            {/* Prescribing Clinician (read-only) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Prescribing Clinician
              </label>
              <div className="relative flex items-center">
                <Input
                  value="Dr. Ekane Paul"
                  readOnly
                  disabled
                  className="cursor-not-allowed bg-muted pr-10 opacity-80"
                />
                <Lock
                  size={14}
                  className="pointer-events-none absolute right-3 text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Pill size={16} /> Add Prescription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── RequestLabDialog ──────────────────────────────────────────

function RequestLabDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (l: LabRequest) => void
}) {
  const [test,      setTest]      = useState("")
  const [urgency,   setUrgency]   = useState<LabUrgency>("Routine")
  const [submitted, setSubmitted] = useState(false)

  const testErr = submitted && !test

  function reset() { setTest(""); setUrgency("Routine"); setSubmitted(false) }
  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!test) return
    onAdd({
      id:        `l-${Date.now()}`,
      test,
      requested: new Date().toTimeString().slice(0, 5),
      urgency,
      status:    "Pending",
      result:    null,
    })
    toast.success("Lab Test Requested", {
      description: `${test} has been added to the lab work queue.`,
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-primary" />
            <DialogTitle className="text-lg font-semibold">Request Lab Test</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 p-6">
            {/* Test Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Test Name <span className="text-destructive">*</span>
              </label>
              <select
                value={test}
                onChange={e => setTest(e.target.value)}
                title="Test Name"
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                  testErr ? "border-destructive" : "border-input",
                )}
              >
                <option value="">Select test...</option>
                {LAB_TESTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {testErr && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Required.
                </p>
              )}
            </div>

            {/* Urgency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Urgency</label>
              <SegmentedControl<LabUrgency>
                options={["Routine", "Urgent"]}
                value={urgency}
                onChange={setUrgency}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FlaskConical size={16} /> Request Test
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── VitalTrendsChart ─────────────────────────────────────────

function VitalTrendsChart() {
  const [metric, setMetric] = useState<ChartMetric>("Temperature")
  const cfg = CHART_CFG[metric]

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">Vital Trends (7 Days)</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(CHART_CFG) as ChartMetric[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                metric === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={VITAL_HISTORY}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148,163,184,0.15)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fill: "#64748B", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={cfg.domain}
            tick={{ fill: "#64748B", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}`}
            width={40}
          />
          <RechartsTooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#f1f5f9",
            }}
            formatter={(value: number | string) => [`${value} ${cfg.unit}`, metric]}
            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
            cursor={{ stroke: cfg.color, strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Line
            type="monotone"
            dataKey={cfg.dataKey}
            stroke={cfg.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: cfg.color, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-2 text-right text-xs text-muted-foreground">
        Unit: {cfg.unit} · 7-day trend ending today
      </p>
    </div>
  )
}

// ── Tab type ──────────────────────────────────────────────────

type Tab = "overview" | "diagnoses" | "vitals" | "prescriptions" | "lab"

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",      label: "Overview"      },
  { key: "diagnoses",     label: "Diagnoses"     },
  { key: "vitals",        label: "Vital Signs"   },
  { key: "prescriptions", label: "Prescriptions" },
  { key: "lab",           label: "Lab Requests"  },
]

// ── Table heading helper ──────────────────────────────────────

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export function EncounterDetailPage() {
  const { id = "HIS-001234" } = useParams()
  const enc = MOCK_ENCOUNTER

  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(INIT_DIAGNOSES)
  const [vitals,    setVitals]    = useState<VitalSigns | null>(MOCK_VITALS)
  const [prescs,    setPrescs]    = useState<Prescription[]>(INIT_PRESCRIPTIONS)
  const [labReqs,   setLabReqs]   = useState<LabRequest[]>(INIT_LAB_REQUESTS)

  const [showAddDx,  setShowAddDx]  = useState(false)
  const [showVitals, setShowVitals] = useState(false)
  const [showRx,     setShowRx]     = useState(false)
  const [showLab,    setShowLab]    = useState(false)

  return (
    <div className="space-y-4">
      {/* ── Page header ── */}
      <div>
        <Link
          to={`/patients/${id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft size={16} /> Patient Profile
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Encounter — {enc.date}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Stethoscope size={16} />
              {enc.clinician} · {enc.unit}
            </p>
          </div>
          {(enc.isOwnEncounter || MOCK_IS_HOSPITAL_ADMIN) && (
            <Link
              to={`/patients/${id}/amend/encounter/${enc.id}`}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Pencil size={16} /> Amend this Encounter
            </Link>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-6 border-b border-border">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-2 py-3 text-sm font-medium transition-colors",
              activeTab === key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-lg font-semibold text-foreground">
            <FileText size={18} className="text-primary" />
            Encounter Summary
          </h2>
          <div className="grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-5">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date &amp; Time
                </p>
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <Clock size={14} className="text-primary" />
                  {enc.date}, {enc.time}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clinical Unit
                </p>
                <p className="text-sm text-foreground">{enc.unit}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Attending Clinician
                </p>
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Stethoscope size={14} /> {enc.clinician}
                </p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Encounter ID
                </p>
                <p className="font-mono text-sm text-foreground">{enc.id}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Presenting Complaint
                </p>
                <div className="rounded-lg border border-border bg-muted p-3">
                  <p className="text-sm italic text-foreground">"{enc.complaint}"</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F59E0B]/15 px-2 py-1 text-xs font-medium text-[#78350F]">
                  <Clock size={12} /> {enc.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Diagnoses tab ── */}
      {activeTab === "diagnoses" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Diagnoses</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Active and historical conditions recorded for this encounter.
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/5"
              onClick={() => setShowAddDx(true)}
            >
              <Plus size={16} /> Add Diagnosis
            </Button>
          </div>

          {diagnoses.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card">
              <Stethoscope size={40} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No diagnoses recorded yet.</p>
              <button
                type="button"
                onClick={() => setShowAddDx(true)}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                + Add Diagnosis
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <TH>Condition</TH>
                      <TH>ICD-10</TH>
                      <TH>Severity</TH>
                      <TH>Status</TH>
                      <TH>Recorded By</TH>
                      <TH>Date</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {diagnoses.map(d => (
                      <tr key={d.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <p
                            className={cn(
                              "text-sm font-medium text-foreground",
                              d.status === "Resolved" && "opacity-60 line-through",
                            )}
                          >
                            {d.condition}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded border border-border px-2 py-0.5 font-mono text-xs text-foreground">
                            {d.icd10 || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-block rounded px-2 py-0.5 text-xs font-medium",
                              SEV_STYLES[d.severity],
                            )}
                          >
                            {d.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                              DST_STYLES[d.status],
                            )}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {d.clinician}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {d.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <AddDiagnosisDialog
            open={showAddDx}
            onClose={() => setShowAddDx(false)}
            onAdd={d => setDiagnoses(prev => [...prev, d])}
          />
        </>
      )}

      {/* ── Vital Signs tab ── */}
      {activeTab === "vitals" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Vital Signs</h2>
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/5"
              onClick={() => setShowVitals(true)}
            >
              <Activity size={16} /> Record Vital Signs
            </Button>
          </div>

          {!vitals ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card">
              <Activity size={40} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No vital signs recorded.</p>
              <button
                type="button"
                onClick={() => setShowVitals(true)}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Record Vital Signs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <VitalCard
                icon={<Thermometer size={18} />}
                label="Temperature"
                value={vitals.temperature.toFixed(1)}
                unit="°C"
                note={vitals.temperature > 37.5 ? "Elevated — possible fever" : "Normal range (36.5–37.5°C)"}
                valueClass={tempValueClass(vitals.temperature)}
                warning={vitals.temperature > 38.5}
                recordedAt={vitals.recordedAt}
              />
              <VitalCard
                icon={<Heart size={18} />}
                label="Blood Pressure"
                value={`${vitals.bpSys}/${vitals.bpDia}`}
                unit="mmHg"
                note="Within normal range"
                recordedAt={vitals.recordedAt}
              />
              <VitalCard
                icon={<Activity size={18} />}
                label="Pulse Rate"
                value={String(vitals.pulse)}
                unit="bpm"
                note="Regular rhythm"
                recordedAt={vitals.recordedAt}
              />
              <VitalCard
                icon={<Wind size={18} />}
                label="Respiratory Rate"
                value={String(vitals.respiratoryRate)}
                unit="breaths/min"
                note="Unlabored breathing"
                recordedAt={vitals.recordedAt}
              />
              <VitalCard
                icon={<Droplets size={18} />}
                label="Oxygen Saturation"
                value={`${vitals.spo2}%`}
                unit="SpO₂"
                note={
                  vitals.spo2 >= 95
                    ? "Room air — normal"
                    : vitals.spo2 >= 90
                      ? "Monitor closely"
                      : "Critical — immediate intervention required"
                }
                valueClass={spo2ValueClass(vitals.spo2)}
                warning={vitals.spo2 < 90}
                recordedAt={vitals.recordedAt}
              />
              <VitalCard
                icon={<Scale size={18} />}
                label="Weight"
                value={vitals.weight.toFixed(1)}
                unit="kg"
                note="Recorded this visit"
                recordedAt={vitals.recordedAt}
              />
            </div>
          )}

          <VitalTrendsChart />

          <RecordVitalsDialog
            open={showVitals}
            onClose={() => setShowVitals(false)}
            onSaved={v => setVitals(v)}
          />
        </>
      )}

      {/* ── Prescriptions tab ── */}
      {activeTab === "prescriptions" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Prescriptions</h2>
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/5"
              onClick={() => setShowRx(true)}
            >
              <Plus size={16} /> Add Prescription
            </Button>
          </div>

          {prescs.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card">
              <Pill size={40} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No prescriptions recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <TH>Medication</TH>
                      <TH>Dosage</TH>
                      <TH>Frequency</TH>
                      <TH>Route</TH>
                      <TH>Duration</TH>
                      <TH>Prescriber</TH>
                      <TH>Date</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {prescs.map(p => (
                      <tr key={p.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {p.medication}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{p.dosage}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{p.frequency}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{p.route}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{p.duration}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.prescriber}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <AddPrescriptionDialog
            open={showRx}
            onClose={() => setShowRx(false)}
            onAdd={p => setPrescs(prev => [...prev, p])}
          />
        </>
      )}

      {/* ── Lab Requests tab ── */}
      {activeTab === "lab" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Lab Requests</h2>
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/5"
              onClick={() => setShowLab(true)}
            >
              <Plus size={16} /> Request Lab Test
            </Button>
          </div>

          {labReqs.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card">
              <FlaskConical size={40} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No lab tests requested yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <TH>Test Name</TH>
                      <TH>Requested</TH>
                      <TH>Urgency</TH>
                      <TH>Status</TH>
                      <TH>Result</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {labReqs.map(l => (
                      <tr key={l.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {l.test}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {l.requested}
                        </td>
                        <td className="px-4 py-3">
                          {l.urgency === "Urgent" ? (
                            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-[#F59E0B]/10 text-[#78350F]">
                              <AlertTriangle size={10} /> Urgent
                            </span>
                          ) : (
                            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                              Routine
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {l.status === "Pending" ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#F59E0B]/10 text-[#78350F]">
                              <Clock size={10} /> Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#10B981]/10 text-[#10B981]">
                              <CheckCircle size={10} /> Completed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {l.result ?? <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <RequestLabDialog
            open={showLab}
            onClose={() => setShowLab(false)}
            onAdd={l => setLabReqs(prev => [...prev, l])}
          />
        </>
      )}
    </div>
  )
}
