import { CheckCircle, Clock, History, Pill, User2, Wifi } from "lucide-react"
import { Link } from "react-router-dom"

// ── Mock data ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
})

type PatientStatus = "Arrived" | "Waiting" | "Completed"

const PATIENTS: { name: string; time: string; unit: string; status: PatientStatus }[] = [
  { name: "Amina Diallo",   time: "08:30", unit: "Ward A", status: "Arrived"   },
  { name: "Joseph Tabe",    time: "09:15", unit: "Ward B", status: "Waiting"   },
  { name: "Fatima Nkeng",   time: "10:00", unit: "Ward A", status: "Completed" },
  { name: "Emmanuel Fon",   time: "11:30", unit: "ICU",    status: "Waiting"   },
  { name: "Ngozi Okonkwo",  time: "13:00", unit: "Ward C", status: "Arrived"   },
]

const PENDING_VITALS = [
  { name: "Joseph Tabe",   time: "09:15" },
  { name: "Emmanuel Fon",  time: "11:30" },
]

const RECENT_UPDATES = [
  { patient: "Amina Diallo",  action: "Vital signs recorded",            time: "08:45 AM",  icon: "vitals"  },
  { patient: "Fatima Nkeng",  action: "Medication administered",          time: "10:15 AM",  icon: "med"     },
  { patient: "Ngozi Okonkwo", action: "Patient assessment completed",     time: "Yesterday", icon: "assess"  },
  { patient: "Marcus Johnson", action: "Vital signs recorded",            time: "Yesterday", icon: "vitals"  },
  { patient: "Chinwe Obi",    action: "Nursing note added",               time: "2 days ago",icon: "note"    },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PatientStatus, { cls: string; Icon: React.ElementType }> = {
  Arrived:   { cls: "bg-[#10B981]/10 text-[#10B981]",             Icon: CheckCircle },
  Waiting:   { cls: "bg-[#F59E0B]/10 text-[#78350F] dark:text-[#F59E0B]", Icon: Clock       },
  Completed: { cls: "bg-primary/10 text-primary",                  Icon: CheckCircle },
}

function UpdateIcon({ type }: { type: string }) {
  if (type === "med")    return <Pill    size={14} className="text-primary shrink-0" />
  if (type === "vitals") return <Wifi    size={14} className="text-[#10B981] shrink-0" />
  return                        <History size={14} className="text-muted-foreground shrink-0" />
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NurseDashboard() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Good morning, Sarah</h1>
        <p className="mt-1 text-sm text-muted-foreground">{TODAY}</p>
      </div>

      {/* Row 1 — Assigned Patients Today */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <User2 size={18} className="text-primary" />
              Assigned Patients Today
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{TODAY}</p>
          </div>
        </div>

        {PATIENTS.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No patients assigned for today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {["Patient Name", "Appointment Time", "Unit", "Status", "Action"].map(h => (
                    <th key={h} className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PATIENTS.map(p => {
                  const { cls, Icon } = STATUS_STYLES[p.status]
                  return (
                    <tr key={p.name} className="transition-colors hover:bg-accent/50">
                      <td className="py-3 pr-4 text-sm font-medium text-foreground">{p.name}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-foreground">{p.time}</td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">{p.unit}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
                          <Icon size={11} /> {p.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link to="/patients" className="text-sm text-primary hover:underline">
                          View Patient
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 2 — Pending Vitals + Recent Nursing Updates */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending Vitals */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Pending Vitals</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
            Patients with an encounter today but no vitals recorded.
          </p>

          {PENDING_VITALS.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md bg-[#10B981]/10 px-3 py-2.5">
              <CheckCircle size={15} className="text-[#10B981]" />
              <p className="text-sm text-[#10B981]">All patients have vitals recorded today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {PENDING_VITALS.map(v => (
                <div key={v.name} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.name}</p>
                    <p className="text-xs text-muted-foreground">Encounter at {v.time}</p>
                  </div>
                  <Link to="/patients" className="text-sm font-medium text-primary hover:underline">
                    Record Vitals
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Nursing Updates */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Recent Nursing Updates</h2>
          <p className="mb-4 text-xs text-muted-foreground">Last 5 patients interacted with</p>

          <div className="space-y-3">
            {RECENT_UPDATES.map((u, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <UpdateIcon type={u.icon} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.patient}</p>
                    <p className="text-xs text-muted-foreground">{u.action}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{u.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
