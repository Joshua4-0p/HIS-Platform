import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Pencil,
  Phone,
  Pill,
  Plus,
  Printer,
  ShieldAlert,
  Stethoscope,
  User,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────

type ConsentStatus = "Granted" | "Pending" | "Refused"
type TabId =
  | "Timeline"
  | "Encounters"
  | "Lab Results"
  | "Prescriptions"
  | "Appointments"
  | "Amendments"

const TABS: TabId[] = [
  "Timeline",
  "Encounters",
  "Lab Results",
  "Prescriptions",
  "Appointments",
  "Amendments",
]

// ── Mock patient ──────────────────────────────────────────────────

const MOCK_PATIENT = {
  name: "Ayuk Emmanuel",
  initials: "AE",
  pid: "HIS-001234",
  dob: "1985-03-22",
  age: 39,
  phone: "+237 671 234 567",
  region: "South West",
  sex: "Male",
  consentStatus: "Granted" as ConsentStatus,
  bloodGroup: "O+",
  nid: "1122334455",
  allergies: ["Penicillin", "Peanuts"],
  conditions: ["Hypertension", "Type 2 Diabetes"],
}

// ── Mock timeline events ──────────────────────────────────────────

const TIMELINE_EVENTS = [
  {
    id: "e1",
    type: "Encounter",
    title: "Routine Follow-up",
    date: "Today, 10:30 AM",
    body: "Patient reports stable blood pressure readings at home. Adherent to current medication regimen. Mild fatigue noted in the evenings.",
    meta: [
      { icon: "stethoscope", label: "Dr. Sarah Jenkins" },
      { icon: "building", label: "Cardiology Wing" },
    ],
    dot: "bg-primary",
    accent: "bg-primary",
    badge: { label: "Encounter", color: "bg-primary/10 text-primary" },
    encounterId: "enc-001",
  },
  {
    id: "e2",
    type: "Lab",
    title: "Comprehensive Metabolic Panel",
    date: "Yesterday, 14:15 PM",
    labValues: [
      { name: "Fasting Glucose", value: "126", unit: "mg/dL", flag: "critical" },
      { name: "HbA1c", value: "6.8", unit: "%", flag: "abnormal" },
    ],
    dot: "bg-destructive",
    accent: "bg-destructive",
    badge: { label: "Lab Result", color: "bg-destructive/10 text-destructive", warn: true },
  },
  {
    id: "e3",
    type: "Prescription",
    title: "Medication Adjusted",
    date: "Oct 12, 2023",
    drug: {
      name: "Metformin HCL 500mg",
      instruction:
        "Take 1 tablet by mouth twice a day with meals. Dispense: 60. Refills: 3.",
    },
    dot: "bg-[#8B5CF6]",
    accent: "bg-[#8B5CF6]",
    badge: { label: "Prescription", color: "bg-[#8B5CF6]/10 text-[#8B5CF6]" },
  },
  {
    id: "e4",
    type: "Appointment",
    title: "Annual Physical",
    date: "Sep 05, 2023",
    status: "Completed",
    dot: "bg-[#3B82F6]",
    accent: "bg-[#3B82F6]",
    badge: { label: "Appointment", color: "bg-[#3B82F6]/10 text-[#3B82F6]" },
  },
]

// ── Mock table data ───────────────────────────────────────────────

const MOCK_ENCOUNTERS = [
  { id: "enc-001", date: "Today, 10:30",    complaint: "Stable blood pressure, mild fatigue",                 clinician: "Dr. Sarah Jenkins", unit: "Cardiology Wing",   diagnoses: 2 },
  { id: "enc-002", date: "Oct 12, 2023",    complaint: "Severe chest pain, shortness of breath",              clinician: "Dr. Sarah Jenkins", unit: "Emergency Dept.",   diagnoses: 1 },
  { id: "enc-003", date: "Aug 05, 2023",    complaint: "Persistent headache and blurred vision",              clinician: "Dr. Ekane Paul",    unit: "Neurology",         diagnoses: 1 },
  { id: "enc-004", date: "May 20, 2023",    complaint: "Routine follow-up for hypertension management",       clinician: "Dr. Sarah Jenkins", unit: "Cardiology Wing",   diagnoses: 2 },
  { id: "enc-005", date: "Feb 14, 2023",    complaint: "Fatigue and swelling in lower limbs",                 clinician: "Dr. Mbi Alice",     unit: "Internal Medicine", diagnoses: 1 },
  { id: "enc-006", date: "Nov 30, 2022",    complaint: "Annual physical examination and diabetes review",     clinician: "Dr. Sarah Jenkins", unit: "General OPD",       diagnoses: 0 },
]

const ENC_PAGE_SIZE = 3
const MOCK_LABS = [
  { id: "l1", date: "Yesterday", test: "Comprehensive Metabolic Panel", result: "Abnormal", unit: "—",       status: "Abnormal", requestedBy: "Dr. Jenkins" },
  { id: "l2", date: "Oct 12, 2023", test: "Complete Blood Count",           result: "Normal",   unit: "—",       status: "Normal",   requestedBy: "Dr. Jenkins" },
]
const MOCK_PRESCRIPTIONS = [
  { id: "rx1", date: "Oct 12, 2023", medication: "Metformin HCL 500mg", dosage: "500 mg", frequency: "Twice daily", route: "Oral", duration: "90 days", prescriber: "Dr. Jenkins" },
]
const MOCK_APPOINTMENTS = [
  { id: "a1", datetime: "Today, 10:30 AM", type: "Follow-up",  clinician: "Dr. Jenkins", unit: "Cardiology", status: "Scheduled" },
  { id: "a2", datetime: "Sep 05, 2023",     type: "Physical",   clinician: "Dr. Jenkins", unit: "General",    status: "Completed" },
]

// ── Consent status badge (left card, full-width) ──────────────────

function ConsentBanner({ status }: { status: ConsentStatus }) {
  if (status === "Granted")
    return (
      <div className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#10B981]/20 bg-[#10B981]/15 px-3 py-1.5 text-xs font-medium text-[#10B981]">
        <CheckCircle size={14} /> Consent Granted
      </div>
    )
  if (status === "Pending")
    return (
      <div className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/15 px-3 py-1.5 text-xs font-medium text-[#F59E0B]">
        <Clock size={14} /> Consent Pending
      </div>
    )
  return (
    <div className="flex w-full items-center justify-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/15 px-3 py-1.5 text-xs font-medium text-destructive">
      <XCircle size={14} /> Consent Refused
    </div>
  )
}

// ── Left-border accent card (timeline) ───────────────────────────

function TimelineCard({
  event,
  patientId,
}: {
  event: (typeof TIMELINE_EVENTS)[number]
  patientId: string
}) {
  return (
    <div className="relative pl-8 md:pl-10">
      {/* Node dot */}
      <div
        className={cn(
          "absolute -left-2.25 top-1 size-4 rounded-full border-4 border-card",
          event.dot
        )}
      />
      {/* Card */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        {/* Left accent */}
        <div className={cn("absolute bottom-0 left-0 top-0 w-1", event.accent)} />

        {/* Encounter */}
        {event.type === "Encounter" && (
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide", event.badge.color)}>
                  {event.badge.label}
                </span>
                <span className="text-base font-semibold text-foreground">{event.title}</span>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={13} /> {event.date}
              </span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{event.body}</p>
            <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Stethoscope size={14} /> {event.meta![0].label}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Building2 size={14} /> {event.meta![1].label}
                </span>
              </div>
              <Link
                to={`/patients/${patientId}/encounters/${event.encounterId}`}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                View <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Lab result */}
        {event.type === "Lab" && (
          <div className="bg-destructive/5 p-4 sm:p-5">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className={cn("flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide", event.badge.color)}>
                  <AlertTriangle size={11} /> {event.badge.label}
                </span>
                <span className="text-base font-semibold text-foreground">{event.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{event.date}</span>
            </div>
            <div className="mb-2 grid grid-cols-1 gap-4 rounded border border-border bg-card p-3 sm:grid-cols-2">
              {event.labValues!.map((lv) => (
                <div key={lv.name}>
                  <span className="mb-1 block text-xs text-muted-foreground">{lv.name}</span>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-lg font-bold", lv.flag === "critical" ? "text-destructive" : "text-[#F59E0B]")}>{lv.value}</span>
                    <span className="text-xs text-muted-foreground">{lv.unit}</span>
                    <ArrowUp size={14} className={lv.flag === "critical" ? "text-destructive" : "text-[#F59E0B]"} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View Full Report <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Prescription */}
        {event.type === "Prescription" && (
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide", event.badge.color)}>
                  {event.badge.label}
                </span>
                <span className="text-base font-semibold text-foreground">{event.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{event.date}</span>
            </div>
            <div className="flex items-start gap-3 rounded border border-border/50 bg-muted/30 p-3">
              <Pill size={20} className="mt-0.5 shrink-0 text-[#8B5CF6]" />
              <div>
                <p className="text-sm font-medium text-foreground">{event.drug!.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{event.drug!.instruction}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end border-t border-border/50 pt-3">
              <button type="button" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Appointment */}
        {event.type === "Appointment" && (
          <div className="p-4 opacity-75 sm:p-5">
            <div className="mb-1 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide", event.badge.color)}>
                  {event.badge.label}
                </span>
                <span className="text-base font-medium text-foreground">{event.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{event.date}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <CheckCircle size={14} className="text-[#10B981]" />
              <span className="text-sm text-muted-foreground">Completed successfully</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Appointment status badge ──────────────────────────────────────

function ApptStatus({ status }: { status: string }) {
  if (status === "Scheduled")
    return <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Scheduled</span>
  if (status === "Completed")
    return <span className="inline-flex items-center rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs font-medium text-[#10B981]">Completed</span>
  return <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive line-through">Cancelled</span>
}

function LabStatus({ status }: { status: string }) {
  if (status === "Normal")   return <span className="inline-flex items-center rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs font-medium text-[#10B981]">Normal</span>
  if (status === "Abnormal") return <span className="inline-flex items-center rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">Abnormal</span>
  return <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Critical</span>
}

// ── Page ──────────────────────────────────────────────────────────

export function PatientProfilePage() {
  const { id = "1" } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabId>("Timeline")
  const [encPage,   setEncPage]   = useState(1)

  const patient = MOCK_PATIENT
  const consentRefused = patient.consentStatus === "Refused"

  const encTotalPages = Math.max(1, Math.ceil(MOCK_ENCOUNTERS.length / ENC_PAGE_SIZE))
  const encStart      = (encPage - 1) * ENC_PAGE_SIZE
  const encPageRows   = MOCK_ENCOUNTERS.slice(encStart, encStart + ENC_PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Patient Record</h1>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2 border-border">
            <Printer size={16} /> Print
          </Button>
          {!consentRefused && (
            <Link to={`/patients/${id}/encounters/new`}>
              <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={16} /> New Encounter
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col items-start gap-6 lg:flex-row">
        {/* ── Left column (sticky) ── */}
        <div className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:w-70">

          {/* Profile card */}
          <div className="relative flex flex-col items-center rounded-lg border border-border bg-card p-6 shadow-sm">
            {/* Consent banner */}
            <ConsentBanner status={patient.consentStatus} />

            {/* Consent refused banner — shown immediately below the badge per UI-009 */}
            {consentRefused && (
              <div className="mt-3 flex w-full items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                Clinical data entry is blocked for this patient due to refused consent.
              </div>
            )}

            {/* Avatar */}
            <div className="mb-4 mt-4 flex size-24 items-center justify-center rounded-full border-2 border-card bg-primary text-3xl font-bold text-primary-foreground">
              {patient.initials}
            </div>

            <h2 className="mb-1 text-center text-xl font-semibold text-foreground">{patient.name}</h2>
            <span className="mb-6 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
              PID: {patient.pid}
            </span>

            {/* Details grid */}
            <div className="w-full space-y-3 border-t border-border pt-4">
              {[
                { icon: <CalendarDays size={15} />, label: "DOB", value: `${patient.dob} (${patient.age}y)` },
                { icon: <Phone size={15} />,        label: "Phone",  value: patient.phone },
                { icon: <MapPin size={15} />,       label: "Region", value: patient.region },
                { icon: <User size={15} />,         label: "Sex",    value: patient.sex },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {row.icon} {row.label}
                  </span>
                  <span className="font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-5 w-full space-y-1 border-t border-border pt-4">
              <Link
                to={`/patients/${id}/consent`}
                className="flex w-full items-center justify-center gap-2 rounded py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <Pencil size={15} /> Update Consent
              </Link>
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50">
                <Pencil size={15} /> Update Profile
              </button>
            </div>
          </div>

          {/* Clinical Markers card */}
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
              <Activity size={18} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Clinical Markers</h3>
            </div>
            <div className="space-y-5 p-5">
              {/* Blood + NID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded border border-border/50 bg-muted/40 p-3">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Blood Group</span>
                  <span className="text-lg font-bold text-destructive">{patient.bloodGroup}</span>
                </div>
                <div className="rounded border border-border/50 bg-muted/40 p-3">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">NID</span>
                  <span className="text-sm font-medium text-foreground">{patient.nid}</span>
                </div>
              </div>

              {/* Allergies */}
              <div>
                <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <AlertTriangle size={12} className="text-destructive" /> Known Allergies
                </span>
                {patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((a) => (
                      <span key={a} className="rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">None recorded</span>
                )}
              </div>

              {/* Chronic Conditions */}
              <div>
                <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Activity size={12} className="text-[#F59E0B]" /> Chronic Conditions
                </span>
                {patient.conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.conditions.map((c) => (
                      <span key={c} className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/15 px-2.5 py-1 text-xs font-medium text-[#B45309]">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">None recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column (clinical canvas) ── */}
        <div className="min-h-150 min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          {/* Tab nav */}
          <div className="hide-scrollbar overflow-x-auto border-b border-border">
            <nav className="flex px-4">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "whitespace-nowrap border-b-2 px-4 py-4 text-sm font-medium transition-colors",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Timeline tab ── */}
          {activeTab === "Timeline" && (
            <div className="p-6">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Clinical History</h3>
                <button type="button" className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Filter size={15} /> Filter
                </button>
              </div>

              {/* Timeline */}
              {TIMELINE_EVENTS.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border">
                  <Activity size={40} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No clinical records yet.</p>
                </div>
              ) : (
                <>
                  <div className="relative ml-3 space-y-8 border-l-2 border-border pb-4 md:ml-4">
                    {TIMELINE_EVENTS.map((event) => (
                      <TimelineCard key={event.id} event={event} patientId={id} />
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <button type="button" className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5">
                      Load Older Records
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Encounters tab ── */}
          {activeTab === "Encounters" && (
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Encounters</h3>
                {!consentRefused && (
                  <Link to={`/patients/${id}/encounters/new`}>
                    <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus size={14} /> New Encounter
                    </Button>
                  </Link>
                )}
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        {["Date", "Presenting Complaint", "Clinician", "Unit", "Diagnoses", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {encPageRows.map((enc) => (
                        <tr key={enc.id} className="hover:bg-muted/30">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{enc.date}</td>
                          <td className="max-w-xs px-4 py-3 text-sm text-foreground">{enc.complaint}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{enc.clinician}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{enc.unit}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{enc.diagnoses}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link to={`/patients/${id}/encounters/${enc.id}`} className="text-xs font-medium text-primary hover:underline">
                                View
                              </Link>
                              <Link to={`/patients/${id}/amend`} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                                Amend
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {encStart + 1}–{Math.min(encStart + ENC_PAGE_SIZE, MOCK_ENCOUNTERS.length)} of {MOCK_ENCOUNTERS.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEncPage(p => Math.max(1, p - 1))}
                      disabled={encPage <= 1}
                      className="flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <span className="min-w-14 text-center text-xs text-muted-foreground">
                      {encPage} / {encTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEncPage(p => Math.min(encTotalPages, p + 1))}
                      disabled={encPage >= encTotalPages}
                      className="flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Lab Results tab ── */}
          {activeTab === "Lab Results" && (
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Lab Results</h3>
                {!consentRefused && (
                  <Button size="sm" variant="outline" className="gap-2">
                    <Plus size={14} /> Request Lab
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      {["Date", "Test Name", "Result", "Unit", "Status", "Requested By", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MOCK_LABS.map((lab) => (
                      <tr key={lab.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{lab.date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{lab.test}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{lab.result}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{lab.unit}</td>
                        <td className="px-4 py-3"><LabStatus status={lab.status} /></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{lab.requestedBy}</td>
                        <td className="px-4 py-3"><button type="button" className="text-xs font-medium text-primary hover:underline">View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Prescriptions tab ── */}
          {activeTab === "Prescriptions" && (
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Prescriptions</h3>
                {!consentRefused && (
                  <Button size="sm" variant="outline" className="gap-2">
                    <Plus size={14} /> New Prescription
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      {["Date", "Medication", "Dosage", "Frequency", "Route", "Duration", "Prescriber"].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MOCK_PRESCRIPTIONS.map((rx) => (
                      <tr key={rx.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{rx.date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{rx.medication}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{rx.dosage}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{rx.frequency}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{rx.route}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{rx.duration}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{rx.prescriber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Appointments tab ── */}
          {activeTab === "Appointments" && (
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Appointments</h3>
                {!consentRefused && (
                  <Link to="/appointments/new">
                    <Button size="sm" variant="outline" className="gap-2">
                      <Plus size={14} /> Book Appointment
                    </Button>
                  </Link>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      {["Date / Time", "Type", "Clinician", "Unit", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MOCK_APPOINTMENTS.map((appt) => (
                      <tr key={appt.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{appt.datetime}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{appt.type}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{appt.clinician}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{appt.unit}</td>
                        <td className="px-4 py-3"><ApptStatus status={appt.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Amendments tab ── */}
          {activeTab === "Amendments" && (
            <div className="p-6">
              <h3 className="mb-6 text-lg font-semibold text-foreground">Amendments</h3>
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border">
                <Activity size={40} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No amendments have been recorded for this patient.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
