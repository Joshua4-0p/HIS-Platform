import { useState, useEffect, useMemo, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  CalendarPlus,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { API_BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────

type ApptType = "Consultation" | "Follow-up" | "Laboratory" | "Procedure"

interface Appointment {
  id: string
  patientId: string
  patientName: string
  clinicianId: string
  clinician: string
  type: ApptType
  unit: string
  date: string       // "YYYY-MM-DD"
  startMin: number   // minutes from midnight (WAT)
  durationMin: number
  status: "Scheduled" | "Cancelled"
  cancellationReason?: string | null
}

// ── Calendar constants ────────────────────────────────────────

const HOUR_PX   = 60
const HOUR_PX_W = 72
const START_H   = 7
const END_H     = 20

const TYPE_STYLES = {
  "Consultation": { bg: "bg-[#0D9488]/15", border: "border-l-[#0D9488]", text: "text-[#0D9488]", badge: "bg-[#0D9488]/10 text-[#0D9488]" },
  "Follow-up":    { bg: "bg-[#6366F1]/15", border: "border-l-[#6366F1]", text: "text-[#6366F1]", badge: "bg-[#6366F1]/10 text-[#6366F1]" },
  "Laboratory":   { bg: "bg-[#3B82F6]/15", border: "border-l-[#3B82F6]", text: "text-[#3B82F6]", badge: "bg-[#3B82F6]/10 text-[#3B82F6]" },
  "Procedure":    { bg: "bg-[#8B5CF6]/15", border: "border-l-[#8B5CF6]", text: "text-[#8B5CF6]", badge: "bg-[#8B5CF6]/10 text-[#8B5CF6]" },
} satisfies Record<ApptType, { bg: string; border: string; text: string; badge: string }>

const CANCELLED_STYLE = {
  bg: "bg-destructive/10", border: "border-l-destructive", text: "text-destructive", badge: "bg-destructive/10 text-destructive",
}

const APPT_TYPES: ApptType[] = ["Consultation", "Follow-up", "Laboratory", "Procedure"]

// ── API helpers ───────────────────────────────────────────────

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("his_id_token")}` }
}

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

const TODAY_STR = toDateStr(NOW)

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
  const gridH    = (END_H - START_H) * HOUR_PX

  const nowMin = NOW.getHours() * 60 + NOW.getMinutes()
  const nowTop = nowMin - START_H * 60
  const showNow = dateKey === TODAY_STR && nowTop > 0 && nowTop < gridH

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-y-auto max-h-[780px]">
        <div className="flex h-195">
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

          <div className="relative flex-1">
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

            {showNow && (
              <div
                ref={(el) => { if (el) el.style.top = `${nowTop}px` }}
                className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-destructive"
              >
                <div className="absolute -left-1 -top-1.25 size-2.5 rounded-full bg-destructive" />
              </div>
            )}

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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
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

      <div className="overflow-y-auto max-h-130">
        <div className="flex h-234">
          <div className="w-14 shrink-0 border-r border-border bg-muted/30">
            {WEEKLY_HOURS.map((slot) => (
              <div key={slot} className="h-18 border-b border-border/30 pr-2 pt-1 text-right">
                <span className="text-xs text-muted-foreground">{fmtMin(slot)}</span>
              </div>
            ))}
          </div>

          {days.map((d) => {
            const ds = toDateStr(d)
            const dayAppts = appts.filter(a => a.date === ds)
            return (
              <div
                key={d.toISOString()}
                className="relative h-234 flex-1 border-r border-border last:border-r-0"
              >
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

// ── Cancel Appointment Dialog ─────────────────────────────────

interface CancelDialogProps {
  appt: Appointment | null
  onClose: () => void
  onConfirmed: (id: string) => void
}

function CancelAppointmentDialog({ appt, onClose, onConfirmed }: CancelDialogProps) {
  const [reason,    setReason]    = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const reasonErr = submitted && !reason.trim()

  function handleClose() { setReason(""); setSubmitted(false); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!reason.trim() || !appt) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/appointments/${appt.id}/cancel`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body:    JSON.stringify({ cancellationReason: reason.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.message ?? "Failed to cancel appointment.")
        setSaving(false)
        return
      }
      onConfirmed(appt.id)
      toast.info("Appointment Cancelled", { description: "The appointment has been cancelled." })
      handleClose()
    } catch {
      toast.error("Network error — please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!appt) return null

  const s = TYPE_STYLES[appt.type] ?? CANCELLED_STYLE

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

          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Keep Appointment
            </Button>
            <Button type="submit" variant="destructive" className="gap-2" disabled={saving}>
              <CalendarX size={16} /> {saving ? "Cancelling…" : "Cancel Appointment"}
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
  const [appts,      setAppts]      = useState<Appointment[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filterClin, setFilterClin] = useState("")
  const [filterUnit, setFilterUnit] = useState("")
  const [filterType, setFilterType] = useState("")
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null)

  const currentDate = useMemo(() => addDays(NOW, offset), [offset])
  const weekStart   = useMemo(() => getMonday(currentDate), [currentDate])

  // Fetch appointments from API whenever the visible date range changes
  const fetchAppts = useCallback(async () => {
    setLoading(true)
    try {
      let url: string
      if (view === "week") {
        url = `${API_BASE}/appointments?view=week&week=${toDateStr(weekStart)}`
      } else {
        url = `${API_BASE}/appointments?view=day&date=${toDateStr(currentDate)}`
      }
      const res  = await fetch(url, { headers: authHeader() })
      const data = await res.json()
      if (res.ok) setAppts(data.appointments ?? [])
    } catch { /* silently ignore */ }
    finally { setLoading(false) }
  }, [view, currentDate, weekStart])

  useEffect(() => { fetchAppts() }, [fetchAppts])

  // Derive unique clinician names from loaded data for the filter dropdown
  const uniqueClinicians = useMemo(
    () => [...new Set(appts.map(a => a.clinician))].sort(),
    [appts],
  )
  const uniqueUnits = useMemo(
    () => [...new Set(appts.map(a => a.unit))].sort(),
    [appts],
  )

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

  function handleCancelled(id: string) {
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelled" as const } : a))
    setCancelAppt(null)
  }

  const dateLabel = view === "week"
    ? `${fmtShortDate(weekStart)} – ${fmtShortDate(addDays(weekStart, 6))}`
    : fmtFullDate(currentDate)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Appointments</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <Link to="/appointments/new">
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <CalendarPlus size={16} /> New Appointment
          </Button>
        </Link>
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
          {uniqueClinicians.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filterUnit}
          onChange={e => setFilterUnit(e.target.value)}
          title="Filter by Unit"
          className="min-w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Units</option>
          {uniqueUnits.map(u => <option key={u} value={u}>{u}</option>)}
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

        {loading && (
          <span className="ml-auto text-xs text-muted-foreground animate-pulse">Loading…</span>
        )}
      </div>

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

      <CancelAppointmentDialog
        appt={cancelAppt}
        onClose={() => setCancelAppt(null)}
        onConfirmed={handleCancelled}
      />
    </div>
  )
}
