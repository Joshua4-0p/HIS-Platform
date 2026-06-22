import { ArrowRight, FlaskConical, History, Stethoscope } from "lucide-react"
import { Link } from "react-router-dom"
import { Separator } from "@/components/ui/separator"

// ── Mock data ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
})

const APPOINTMENTS = [
  { time: "08:30", patient: "Amina Diallo",     type: "Consultation", unit: "Cardiology" },
  { time: "09:15", patient: "Joseph Tabe",       type: "Follow-up",    unit: "General Medicine" },
  { time: "10:00", patient: "Fatima Nkeng",      type: "Laboratory",   unit: "Pediatrics" },
  { time: "11:30", patient: "Emmanuel Fon",      type: "Procedure",    unit: "Surgery" },
  { time: "14:00", patient: "Ngozi Okonkwo",     type: "Consultation", unit: "Neurology" },
  { time: "15:30", patient: "Pierre Mvondo",     type: "Follow-up",    unit: "Endocrinology" },
]

const PENDING_LABS = [
  { patient: "Amina Diallo",  test: "Full Blood Count",       requested: "Today",     urgent: true  },
  { patient: "Joseph Tabe",   test: "HbA1c",                  requested: "Yesterday", urgent: false },
  { patient: "Fatima Nkeng",  test: "Malaria RDT",            requested: "Today",     urgent: true  },
  { patient: "Ngozi Okonkwo", test: "Liver Function Test",    requested: "2 days ago",urgent: false },
]

const RECENT_DIAGNOSES = [
  { patient: "Marcus Johnson",  condition: "Essential Hypertension",      date: "Oct 24" },
  { patient: "Chinwe Obi",      condition: "Type 2 Diabetes Mellitus",    date: "Oct 24" },
  { patient: "David Mwangi",    condition: "Malaria (P. falciparum)",     date: "Oct 23" },
  { patient: "Sarah Ngono",     condition: "Upper Respiratory Infection", date: "Oct 23" },
  { patient: "Pierre Mvondo",   condition: "Anaemia — Iron-Deficiency",   date: "Oct 22" },
  { patient: "Amina Diallo",    condition: "Atrial Fibrillation",         date: "Oct 22" },
  { patient: "Joseph Tabe",     condition: "Hyperglycaemia",              date: "Oct 21" },
  { patient: "Emmanuel Fon",    condition: "Appendicitis (acute)",        date: "Oct 21" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const APPT_COLORS: Record<string, string> = {
  Consultation: "bg-primary/10 text-primary",
  "Follow-up":  "bg-[#6366F1]/10 text-[#6366F1]",
  Laboratory:   "bg-[#3B82F6]/10 text-[#3B82F6]",
  Procedure:    "bg-[#8B5CF6]/10 text-[#8B5CF6]",
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DoctorDashboard() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Good morning, Dr. Elong</h1>
        <p className="mt-1 text-sm text-muted-foreground">{TODAY}</p>
      </div>

      {/* Row 1 — Today's Appointments */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Stethoscope size={18} className="text-primary" />
            Today&apos;s Appointments
            <span className="ml-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {APPOINTMENTS.length} Scheduled
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">{TODAY}</p>
        </div>

        <div className="divide-y divide-border">
          {APPOINTMENTS.map((appt) => (
            <div key={appt.time + appt.patient} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <span className="w-14 shrink-0 font-mono text-sm text-foreground">{appt.time}</span>
                <span className="text-sm font-medium text-foreground">{appt.patient}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${APPT_COLORS[appt.type] ?? "bg-secondary text-secondary-foreground"}`}>
                  {appt.type}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">{appt.unit}</span>
                <button type="button" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  Open <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-border pt-3 text-right">
          <Link to="/appointments" className="text-sm text-primary hover:underline">
            View All Schedule →
          </Link>
        </div>
      </div>

      {/* Row 2 — Pending Labs + Recent Diagnoses */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending Lab Results */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <FlaskConical size={18} className="text-primary" />
            Pending Lab Results
          </h2>

          {PENDING_LABS.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2">
              <FlaskConical size={36} className="text-muted-foreground opacity-40" />
              <p className="text-xs text-muted-foreground">No pending lab results.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {PENDING_LABS.map((lab) => (
                <div
                  key={lab.patient + lab.test}
                  className={`flex items-center justify-between py-3 ${lab.urgent ? "bg-destructive/5 -mx-5 px-5" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{lab.patient}</p>
                    <p className="text-xs text-muted-foreground">{lab.test} · {lab.requested}</p>
                  </div>
                  <Link to="/laboratory/queue" className="text-sm text-primary hover:underline">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Diagnoses */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <History size={18} className="text-primary" />
            Recent Diagnoses
          </h2>

          <div className="space-y-3">
            {RECENT_DIAGNOSES.slice(0, 8).map((dx) => (
              <div key={dx.patient + dx.condition} className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{dx.patient}</p>
                  <p className="text-xs text-muted-foreground">{dx.condition}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{dx.date}</span>
              </div>
            ))}
          </div>

          <Separator className="mt-4" />
          <div className="mt-3 text-right">
            <Link to="/encounters" className="text-sm text-primary hover:underline">
              View All History →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
