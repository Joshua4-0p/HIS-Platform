import { Calendar, CalendarPlus, Upload, UserPlus } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

// ── Mock data ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
})

const STATS = { appointments: 42, registrations: 128, uploads: 3 }

const APPT_COLORS: Record<string, string> = {
  Consultation: "bg-primary/10 text-primary",
  "Follow-up":  "bg-[#6366F1]/10 text-[#6366F1]",
  Laboratory:   "bg-[#3B82F6]/10 text-[#3B82F6]",
  Procedure:    "bg-[#8B5CF6]/10 text-[#8B5CF6]",
}

const SCHEDULE = [
  { time: "08:00", patient: "Amina Diallo",   pid: "PT-8839201", type: "Consultation", clinician: "Dr. J. Elong"  },
  { time: "09:00", patient: "Joseph Tabe",     pid: "PT-7723109", type: "Follow-up",    clinician: "Dr. S. Ngo"    },
  { time: "10:30", patient: "Fatima Nkeng",    pid: "PT-9934521", type: "Laboratory",   clinician: "Dr. J. Elong"  },
  { time: "11:00", patient: "Emmanuel Fon",    pid: "PT-6612088", type: "Procedure",    clinician: "Dr. M. Kamga"  },
  { time: "13:00", patient: "Ngozi Okonkwo",   pid: "PT-5501293", type: "Consultation", clinician: "Dr. J. Elong"  },
  { time: "14:30", patient: "Pierre Mvondo",   pid: "PT-4490112", type: "Follow-up",    clinician: "Dr. S. Ngo"    },
  { time: "15:00", patient: "Chinwe Obi",      pid: "PT-3381004", type: "Consultation", clinician: "Dr. M. Kamga"  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function ReceptionistDashboard() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Good morning, Sarah</h1>
        <p className="mt-1 text-sm text-muted-foreground">{TODAY}</p>
      </div>

      {/* Row 1 — 3 KPI stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Appointments Today */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Appointments Today
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Calendar size={18} className="text-primary" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">{STATS.appointments}</p>
        </div>

        {/* Patients Registered This Week */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Patients Registered This Week
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#10B981]/10">
              <UserPlus size={18} className="text-[#10B981]" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">{STATS.registrations}</p>
        </div>

        {/* Pending Bulk Upload Jobs */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pending Bulk Upload Jobs
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Upload size={18} className="text-[#F59E0B]" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-foreground">{STATS.uploads}</p>
        </div>
      </div>

      {/* Row 2 — Today's Appointment Schedule */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Today&apos;s Appointment Schedule</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Showing upcoming appointments for all clinical units
            </p>
          </div>
          <Button size="sm" asChild>
            <Link to="/appointments">
              <CalendarPlus size={15} /> New Appointment
            </Link>
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-muted">
                {["Time", "Patient Name", "Type", "Clinician", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SCHEDULE.map(row => (
                <tr key={row.time + row.patient} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{row.time}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{row.patient}</p>
                    <p className="text-xs text-muted-foreground">{row.pid}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${APPT_COLORS[row.type] ?? "bg-secondary text-secondary-foreground"}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.clinician}</td>
                  <td className="px-4 py-3">
                    <Link to="/appointments" className="text-sm text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 border-t border-border pt-3 text-right">
          <Link to="/appointments" className="text-sm text-primary hover:underline">
            View Full Schedule →
          </Link>
        </div>
      </div>
    </div>
  )
}
