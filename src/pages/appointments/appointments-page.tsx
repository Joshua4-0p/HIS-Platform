import { useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  CalendarPlus,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Clock,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ── Types ─────────────────────────────────────────────────────

type ApptType = "Consultation" | "Follow-up" | "Laboratory" | "Procedure"

interface Appointment {
  id: string
  patientName: string
  clinician: string
  type: ApptType
  unit: string
  date: string       // "YYYY-MM-DD"
  startMin: number   // minutes from midnight
  durationMin: number
  status: "Scheduled" | "Cancelled"
}

// ── Calendar constants ────────────────────────────────────────

const HOUR_PX   = 60   // pixels per hour in daily view  (1 min = 1 px)
const HOUR_PX_W = 72   // pixels per hour in weekly view
const START_H   = 7    // grid starts at 07:00
const END_H     = 20   // grid ends   at 20:00

const TYPE_STYLES = {
  "Consultation": { bg: "bg-[#0D9488]/15", border: "border-l-[#0D9488]", text: "text-[#0D9488]", badge: "bg-[#0D9488]/10 text-[#0D9488]" },
  "Follow-up":    { bg: "bg-[#6366F1]/15", border: "border-l-[#6366F1]", text: "text-[#6366F1]", badge: "bg-[#6366F1]/10 text-[#6366F1]" },
  "Laboratory":   { bg: "bg-[#3B82F6]/15", border: "border-l-[#3B82F6]", text: "text-[#3B82F6]", badge: "bg-[#3B82F6]/10 text-[#3B82F6]" },
  "Procedure":    { bg: "bg-[#8B5CF6]/15", border: "border-l-[#8B5CF6]", text: "text-[#8B5CF6]", badge: "bg-[#8B5CF6]/10 text-[#8B5CF6]" },
} satisfies Record<ApptType, { bg: string; border: string; text: string; badge: string }>

const CANCELLED_STYLE = {
  bg: "bg-destructive/10", border: "border-l-destructive", text: "text-destructive", badge: "bg-destructive/10 text-destructive",
}

const CLINICIANS  = ["Dr. Ekane Paul", "Dr. Mbi Alice", "Dr. Tabi John"]
const UNITS       = ["General OPD", "Cardiology", "Laboratory", "Surgery", "General Medicine"]
const APPT_TYPES: ApptType[] = ["Consultation", "Follow-up", "Laboratory", "Procedure"]

// ── Date helpers ──────────────────────────────────────────────

const NOW = new Date()

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0]
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getMonday(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - day + (day === 0 ? -6 : 1))
  return r
}

function fmtMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function fmtFullDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function fmtDayCode(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()
}

// ── Slot label arrays ─────────────────────────────────────────

const DAILY_SLOTS: number[] = []
for (let h = START_H; h < END_H; h++) {
  DAILY_SLOTS.push(h * 60)
  DAILY_SLOTS.push(h * 60 + 30)
}

const WEEKLY_HOURS: number[] = []
for (let h = START_H; h < END_H; h++) WEEKLY_HOURS.push(h * 60)

// Time options for the create-appointment select
const TIME_OPTIONS: string[] = []
for (let h = START_H; h < END_H; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`)
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`)
}

// ── Mock appointments ─────────────────────────────────────────

const TODAY_STR    = toDateStr(NOW)
const TOMORROW_STR = toDateStr(addDays(NOW, 1))
const DAY2_STR     = toDateStr(addDays(NOW, 2))

const SEED_APPTS: Appointment[] = [
  { id: "a1", patientName: "Ayuk Emmanuel",     clinician: "Dr. Ekane Paul", type: "Consultation", unit: "General OPD",   date: TODAY_STR,    startMin: 8*60,     durationMin: 45, status: "Scheduled" },
  { id: "a2", patientName: "Biya Nkeng Marie",  clinician: "Dr. Mbi Alice",  type: "Follow-up",    unit: "Cardiology",    date: TODAY_STR,    startMin: 9*60+30,  durationMin: 30, status: "Scheduled" },
  { id: "a3", patientName: "Fon Peter Ngwa",    clinician: "Dr. Ekane Paul", type: "Laboratory",   unit: "Laboratory",    date: TODAY_STR,    startMin: 10*60,    durationMin: 60, status: "Scheduled" },
  { id: "a4", patientName: "Tanyi Ebot Julius", clinician: "Dr. Mbi Alice",  type: "Consultation", unit: "General OPD",   date: TODAY_STR,    startMin: 11*60+30, durationMin: 30, status: "Cancelled" },
  { id: "a5", patientName: "Ngo Helen Fru",     clinician: "Dr. Tabi John",  type: "Procedure",    unit: "Surgery",       date: TOMORROW_STR, startMin: 9*60,     durationMin: 90, status: "Scheduled" },
  { id: "a6", patientName: "Mbah Collins Che",  clinician: "Dr. Ekane Paul", type: "Follow-up",    unit: "Cardiology",    date: DAY2_STR,     startMin: 14*60,    durationMin: 45, status: "Scheduled" },
]

// ── Daily appointment block ───────────────────────────────────

function DailyBlock({
  appt,
  onRequestCancel,
}: {
  appt: Appointment
  onRequestCancel: (a: Appointment) => void
}) {
  const isCancelled = appt.status === "Cancelled"
  const s = isCancelled ? CANCELLED_STYLE : TYPE_STYLES[appt.type]

  // 1 min = 1 px (HOUR_PX = 60, so each minute = HOUR_PX/60 = 1 px)
  const topPx    = appt.startMin - START_H * 60
  const heightPx = appt.durationMin

  return (
    <div
      ref={(el) => { if (el) { el.style.top = `${topPx}px`; el.style.height = `${heightPx}px` } }}
      className={cn(
        "absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md border-l-4 px-2 py-1 transition-shadow hover:shadow-md",
        s.bg,
        s.border,
        isCancelled && "cursor-default opacity-50"
      )}
      role="button"
      tabIndex={0}
      aria-label={`${appt.patientName} — ${appt.type}`}
      onClick={() => { if (!isCancelled) onRequestCancel(appt) }}
      onKeyDown={(e) => { if (e.key === "Enter" && !isCancelled) onRequestCancel(appt) }}
    >
      <p className={cn(
        "truncate text-sm font-medium leading-tight text-foreground",
        isCancelled && "text-muted-foreground line-through",
      )}>
        {appt.patientName}
      </p>
      {heightPx >= 36 && (
        <p className={cn("mt-0.5 truncate text-xs", s.text)}>
          {appt.clinician} · {appt.type}
        </p>
      )}
      {heightPx >= 52 && (
        <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", s.badge)}>
          {fmtMin(appt.startMin)} – {fmtMin(appt.startMin + appt.durationMin)}
        </span>
      )}
    </div>
  )
}

// ── Daily calendar view ───────────────────────────────────────

function DailyView({
  dateKey,
  appts,
  onRequestCancel,
}: {
  dateKey: string
  appts: Appointment[]
  onRequestCancel: (a: Appointment) => void
}) {
  const dayAppts = appts.filter(a => a.date === dateKey)
  const gridH    = (END_H - START_H) * HOUR_PX  // 780 px

  const nowMin = NOW.getHours() * 60 + NOW.getMinutes()
  const nowTop = nowMin - START_H * 60
  const showNow = dateKey === TODAY_STR && nowTop > 0 && nowTop < gridH

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-y-auto max-h-[780px]">
        <div className="flex h-195">

          {/* Time labels */}
          <div className="w-16 shrink-0 border-r border-border bg-muted/30">
            {DAILY_SLOTS.map((slot) => (
              <div key={slot} className="h-[30px] border-b border-border/30">
                {slot % 60 === 0 ? (
                  <span className="block pr-2 pt-0.5 text-right text-xs text-muted-foreground">
                    {fmtMin(slot)}
                  </span>
                ) : (
                  <span className="block pr-2 pt-0.5 text-right text-[10px] text-muted-foreground/40">
                    {fmtMin(slot)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Appointment grid */}
          <div className="relative flex-1">
            {/* Slot dividers — flex-col overlay avoids per-row inline top */}
            <div className="pointer-events-none absolute inset-0 flex flex-col">
              {DAILY_SLOTS.map((slot) => (
                <div
                  key={slot}
                  className={cn(
                    "h-7.5 shrink-0 border-b",
                    slot % 60 === 0 ? "border-border/50" : "border-dashed border-border/25",
                  )}
                />
              ))}
            </div>

            {/* Current time indicator */}
            {showNow && (
              <div
                ref={(el) => { if (el) el.style.top = `${nowTop}px` }}
                className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-destructive"
              >
                <div className="absolute -left-1 -top-1.25 size-2.5 rounded-full bg-destructive" />
              </div>
            )}

            {/* Appointment blocks */}
            {dayAppts.map(a => (
              <DailyBlock key={a.id} appt={a} onRequestCancel={onRequestCancel} />
            ))}

            {dayAppts.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <Clock size={36} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No appointments scheduled for this day.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Weekly appointment block ──────────────────────────────────

function WeeklyBlock({ appt }: { appt: Appointment }) {
  const isCancelled = appt.status === "Cancelled"
  const s = isCancelled ? CANCELLED_STYLE : TYPE_STYLES[appt.type]

  const topPx    = (appt.startMin - START_H * 60) * (HOUR_PX_W / 60)
  const heightPx = Math.max(appt.durationMin * (HOUR_PX_W / 60), 18)

  return (
    <div
      ref={(el) => { if (el) { el.style.top = `${topPx}px`; el.style.height = `${heightPx}px` } }}
      className={cn(
        "absolute inset-x-0.5 overflow-hidden rounded border-l-2 px-1 py-0.5",
        s.bg,
        s.border,
        isCancelled && "opacity-50",
      )}
      title={`${appt.patientName} — ${appt.type} with ${appt.clinician}, ${fmtMin(appt.startMin)}`}
    >
      <p className={cn(
        "truncate text-[10px] font-medium leading-tight text-foreground",
        isCancelled && "line-through",
      )}>
        {appt.patientName}
      </p>
      {heightPx > 24 && (
        <p className={cn("truncate text-[9px] leading-tight", s.text)}>{appt.type}</p>
      )}
    </div>
  )
}

// ── Weekly calendar view ──────────────────────────────────────

function WeeklyView({
  weekStart,
  appts,
}: {
  weekStart: Date
  appts: Appointment[]
}) {
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const gridH = (END_H - START_H) * HOUR_PX_W  // 936 px

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {/* Day header row */}
      <div className="flex border-b border-border bg-muted/50">
        <div className="w-14 shrink-0 border-r border-border" />
        {days.map((d) => {
          const isToday = toDateStr(d) === TODAY_STR
          return (
            <div key={d.toISOString()} className="flex-1 border-r border-border py-2 text-center last:border-r-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {fmtDayCode(d)}
              </p>
              <p className={cn(
                "mx-auto mt-0.5 flex size-6 items-center justify-center text-sm font-bold",
                isToday && "rounded-full bg-primary text-primary-foreground",
                !isToday && "text-foreground",
              )}>
                {d.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div className="overflow-y-auto max-h-130">
        <div className="flex h-234">

          {/* Hour labels */}
          <div className="w-14 shrink-0 border-r border-border bg-muted/30">
            {WEEKLY_HOURS.map((slot) => (
              <div key={slot} className="h-18 border-b border-border/30 pr-2 pt-1 text-right">
                <span className="text-xs text-muted-foreground">{fmtMin(slot)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const ds = toDateStr(d)
            const dayAppts = appts.filter(a => a.date === ds)
            return (
              <div
                key={d.toISOString()}
                className="relative h-234 flex-1 border-r border-border last:border-r-0"
              >
                {/* Slot dividers — flex-col overlay avoids per-row inline top */}
                <div className="pointer-events-none absolute inset-0 flex flex-col">
                  {WEEKLY_HOURS.map((slot) => (
                    <div key={slot} className="h-18 shrink-0 border-b border-border/30" />
                  ))}
                </div>
                {dayAppts.map(a => <WeeklyBlock key={a.id} appt={a} />)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Create Appointment Dialog ─────────────────────────────────

interface CreateDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (a: Appointment) => void
}

function CreateAppointmentDialog({ open, onClose, onCreated }: CreateDialogProps) {
  const [patient,   setPatient]   = useState("")
  const [date,      setDate]      = useState(TODAY_STR)
  const [time,      setTime]      = useState("")
  const [type,      setType]      = useState<ApptType | "">("")
  const [clinician, setClinician] = useState("")
  const [unit,      setUnit]      = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [saving,    setSaving]    = useState(false)

  // Simulated conflict: Dr. Ekane Paul at 08:00
  const hasConflict = clinician === "Dr. Ekane Paul" && time === "08:00"

  const errs = {
    patient:   submitted && !patient.trim(),
    date:      submitted && !date,
    time:      submitted && !time,
    type:      submitted && !type,
    clinician: submitted && !clinician,
    unit:      submitted && !unit,
  }

  function reset() {
    setPatient(""); setDate(TODAY_STR); setTime(""); setType("")
    setClinician(""); setUnit(""); setSubmitted(false); setSaving(false)
  }

  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!patient || !date || !time || !type || !clinician || !unit || hasConflict) return
    setSaving(true)
    setTimeout(() => {
      const [h, m] = time.split(":").map(Number)
      onCreated({
        id: `new-${Date.now()}`,
        patientName: patient,
        clinician,
        type: type as ApptType,
        unit,
        date,
        startMin: h * 60 + m,
        durationMin: 30,
        status: "Scheduled",
      })
      toast.success("Appointment Created", { description: "The appointment has been scheduled." })
      reset(); onClose()
    }, 500)
  }

  const selClass = (err?: boolean) => cn(
    "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
    err ? "border-destructive" : "border-input",
  )

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-140 gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-lg font-semibold text-foreground">Create Appointment</DialogTitle>
          <p className="text-sm text-muted-foreground">Schedule a new clinical engagement.</p>
        </DialogHeader>

        <TooltipProvider>
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 p-6">

            {/* Conflict warning */}
            {hasConflict && (
              <div className="flex items-start gap-2 rounded-md border border-[#F59E0B] bg-[#F59E0B]/15 p-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                <p className="text-sm text-[#78350F]">
                  <strong>{clinician}</strong> already has an appointment at this time: Ayuk Emmanuel — Consultation, 08:00–08:45. Please select a different time.
                </p>
              </div>
            )}

            {/* Patient */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Patient <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Search by name or Patient ID..."
                value={patient}
                onChange={e => setPatient(e.target.value)}
                className={cn(errs.patient && "border-destructive")}
              />
              {errs.patient && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> Patient is required.
                </p>
              )}
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Appointment Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={cn(errs.date && "border-destructive")}
                />
                {errs.date && <p className="flex items-center gap-1 text-xs text-[#DC2626]"><AlertCircle size={12} />Required.</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Appointment Time <span className="text-destructive">*</span>
                </label>
                <select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  title="Appointment Time"
                  className={selClass(errs.time || hasConflict)}
                >
                  <option value="">Select time...</option>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errs.time && <p className="flex items-center gap-1 text-xs text-[#DC2626]"><AlertCircle size={12} />Required.</p>}
              </div>
            </div>

            {/* Appointment Type */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-sm font-medium text-foreground">
                Appointment Type <span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={13} className="cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60 text-xs">
                    Defines the clinical purpose of this visit. Choose Follow-up for return visits, Laboratory for test-only appointments, or Procedure for scheduled interventions.
                  </TooltipContent>
                </Tooltip>
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as ApptType)}
                title="Appointment Type"
                className={selClass(errs.type)}
              >
                <option value="">Select type...</option>
                {APPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errs.type && <p className="flex items-center gap-1 text-xs text-[#DC2626]"><AlertCircle size={12} />Required.</p>}
            </div>

            {/* Clinician + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Assigned Clinician <span className="text-destructive">*</span>
                </label>
                <select
                  value={clinician}
                  onChange={e => setClinician(e.target.value)}
                  title="Assigned Clinician"
                  className={selClass(errs.clinician)}
                >
                  <option value="">Select clinician...</option>
                  {CLINICIANS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errs.clinician && <p className="flex items-center gap-1 text-xs text-[#DC2626]"><AlertCircle size={12} />Required.</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-sm font-medium text-foreground">
                  Clinical Unit <span className="text-destructive">*</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={13} className="cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-60 text-xs">
                      The ward or department responsible for this appointment. This determines which team's schedule the appointment appears on.
                    </TooltipContent>
                  </Tooltip>
                </label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  title="Clinical Unit"
                  className={selClass(errs.unit)}
                >
                  <option value="">Select unit...</option>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {errs.unit && <p className="flex items-center gap-1 text-xs text-[#DC2626]"><AlertCircle size={12} />Required.</p>}
              </div>
            </div>

          </div>

          <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || hasConflict}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CalendarPlus size={16} />
              {saving ? "Scheduling…" : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}

// ── Cancel Appointment Dialog ─────────────────────────────────

interface CancelDialogProps {
  appt: Appointment | null
  onClose: () => void
  onConfirmed: (id: string) => void
}

function CancelAppointmentDialog({ appt, onClose, onConfirmed }: CancelDialogProps) {
  const [reason,    setReason]    = useState("")
  const [submitted, setSubmitted] = useState(false)
  const reasonErr = submitted && !reason.trim()

  function handleClose() { setReason(""); setSubmitted(false); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!reason.trim()) return
    onConfirmed(appt!.id)
    toast.info("Appointment Cancelled", { description: "The appointment has been cancelled." })
    handleClose()
  }

  if (!appt) return null

  const s = TYPE_STYLES[appt.type]

  return (
    <Dialog open={!!appt} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10">
              <CalendarX size={18} className="text-destructive" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">Cancel Appointment</DialogTitle>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 p-6">
            {/* Appointment summary */}
            <div className="rounded-md border border-border bg-muted p-3">
              <dl className="grid grid-cols-[76px_1fr] gap-x-3 gap-y-1.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient</dt>
                <dd className="text-sm font-medium text-foreground">{appt.patientName}</dd>

                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</dt>
                <dd>
                  <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", s.badge)}>
                    {appt.type}
                  </span>
                </dd>

                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</dt>
                <dd className="text-sm text-muted-foreground">
                  {appt.date} · {fmtMin(appt.startMin)} – {fmtMin(appt.startMin + appt.durationMin)}
                </dd>

                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clinician</dt>
                <dd className="text-sm text-muted-foreground">{appt.clinician}</dd>
              </dl>
            </div>

            {/* Cancellation reason */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Cancellation Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for cancellation..."
                className={cn("resize-none", reasonErr && "border-destructive focus-visible:ring-destructive")}
              />
              {reasonErr && (
                <p className="flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle size={12} /> A cancellation reason is required.
                </p>
              )}
            </div>
          </div>

          {/* Footer: Keep on left, Cancel on right */}
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Keep Appointment
            </Button>
            <Button type="submit" variant="destructive" className="gap-2">
              <CalendarX size={16} /> Cancel Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get("view") === "week" ? "week" : "day"

  const [offset,     setOffset]     = useState(0)
  const [appts,      setAppts]      = useState<Appointment[]>(SEED_APPTS)
  const [filterClin, setFilterClin] = useState("")
  const [filterUnit, setFilterUnit] = useState("")
  const [filterType, setFilterType] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null)

  const currentDate = useMemo(() => addDays(NOW, offset), [offset])
  const weekStart   = useMemo(() => getMonday(currentDate), [currentDate])

  const filtered = useMemo(() => appts.filter(a => {
    if (filterClin && a.clinician !== filterClin) return false
    if (filterUnit && a.unit !== filterUnit) return false
    if (filterType && a.type !== filterType) return false
    return true
  }), [appts, filterClin, filterUnit, filterType])

  const hasFilter = !!(filterClin || filterUnit || filterType)

  function setView(v: "day" | "week") {
    setSearchParams(v === "week" ? { view: "week" } : {})
  }

  function navigate(dir: number) {
    setOffset(o => o + dir * (view === "week" ? 7 : 1))
  }

  function handleCreated(a: Appointment) {
    setAppts(prev => [...prev, a])
  }

  function handleCancelled(id: string) {
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelled" as const } : a))
    setCancelAppt(null)
  }

  const dateLabel = view === "week"
    ? `${fmtShortDate(weekStart)} – ${fmtShortDate(addDays(weekStart, 6))}`
    : fmtFullDate(currentDate)

  return (
    <div className="space-y-4">
      {/* Page title */}
      <h1 className="text-2xl font-semibold text-foreground">Appointments</h1>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">

        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-60 text-center text-sm font-medium text-foreground">
            {dateLabel}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRight size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
            onClick={() => setOffset(0)}
          >
            Today
          </Button>
        </div>

        {/* View toggle */}
        <div className="inline-flex rounded-md bg-muted p-1">
          {(["day", "week"] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                view === v
                  ? "bg-primary font-medium text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "day" ? "Daily" : "Weekly"}
            </button>
          ))}
        </div>

        {/* New Appointment */}
        <Button
          type="button"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setShowCreate(true)}
        >
          <CalendarPlus size={16} /> New Appointment
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <select
          value={filterClin}
          onChange={e => setFilterClin(e.target.value)}
          title="Filter by Clinician"
          className="min-w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Clinicians</option>
          {CLINICIANS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filterUnit}
          onChange={e => setFilterUnit(e.target.value)}
          title="Filter by Unit"
          className="min-w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Units</option>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          title="Filter by Type"
          className="min-w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Types</option>
          {APPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {hasFilter && (
          <button
            type="button"
            onClick={() => { setFilterClin(""); setFilterUnit(""); setFilterType("") }}
            className="ml-auto text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Calendar */}
      {view === "day" ? (
        <DailyView
          dateKey={toDateStr(currentDate)}
          appts={filtered}
          onRequestCancel={setCancelAppt}
        />
      ) : (
        <WeeklyView
          weekStart={weekStart}
          appts={filtered}
        />
      )}

      {/* Dialogs */}
      <CreateAppointmentDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
      <CancelAppointmentDialog
        appt={cancelAppt}
        onClose={() => setCancelAppt(null)}
        onConfirmed={handleCancelled}
      />
    </div>
  )
}
