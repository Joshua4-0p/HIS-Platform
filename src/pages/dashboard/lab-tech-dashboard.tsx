import { AlertOctagon, ArrowRight, CheckCircle, Clock } from "lucide-react"
import { Link } from "react-router-dom"

// ── Mock data ─────────────────────────────────────────────────────────────────

const STATS = { pending: 42, completed: 128, critical: 3 }

const TODAY_LABEL = new Date().toLocaleDateString("en-US", {
  year: "numeric", month: "short", day: "numeric",
})

type LabStatus  = "Pending" | "Completed"
type LabUrgency = "Routine" | "Urgent"

const QUEUE: {
  time: string; patient: string; pid: string; test: string
  requestedBy: string; urgency: LabUrgency; status: LabStatus
}[] = [
  { time: "07:45", patient: "Amina Diallo",  pid: "PT-8839201", test: "Full Blood Count",    requestedBy: "Dr. J. Elong", urgency: "Urgent",  status: "Pending"   },
  { time: "08:10", patient: "Joseph Tabe",   pid: "PT-7723109", test: "HbA1c",               requestedBy: "Dr. S. Ngo",   urgency: "Routine", status: "Pending"   },
  { time: "08:55", patient: "Fatima Nkeng",  pid: "PT-9934521", test: "Malaria RDT",          requestedBy: "Dr. J. Elong", urgency: "Urgent",  status: "Completed" },
  { time: "09:30", patient: "Marcus Johnson",pid: "PT-6612088", test: "Liver Function Test",  requestedBy: "Dr. M. Kamga", urgency: "Routine", status: "Pending"   },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function LabTechDashboard() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Lab Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Today: {TODAY_LABEL}</p>
      </div>

      {/* Row 1 — 3 KPI stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Pending */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pending Tests Today
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Clock size={18} className="text-[#F59E0B]" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-[#F59E0B]">{STATS.pending}</p>
        </div>

        {/* Completed */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completed Today
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#10B981]/10">
              <CheckCircle size={18} className="text-[#10B981]" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-[#10B981]">{STATS.completed}</p>
        </div>

        {/* Critical */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Critical Results
            </p>
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10">
              <AlertOctagon size={18} className="text-destructive" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold text-destructive">{STATS.critical}</p>
        </div>
      </div>

      {/* Row 2 — Work Queue Preview */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s Work Queue</h2>
          <Link to="/laboratory/queue" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View Full Queue <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-muted">
                {["Request Time", "Patient Name", "Patient ID", "Test Name", "Requested By", "Urgency", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {QUEUE.map(row => (
                <tr key={row.time + row.patient} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{row.time}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{row.patient}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.pid}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.test}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.requestedBy}</td>
                  <td className="px-4 py-3">
                    {row.urgency === "Urgent" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-0.5 text-xs font-medium text-[#78350F] dark:text-[#F59E0B]">
                        <AlertOctagon size={11} /> Urgent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        Routine
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "Pending" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-0.5 text-xs font-medium text-[#78350F] dark:text-[#F59E0B]">
                        <Clock size={11} /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
                        <CheckCircle size={11} /> Completed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "Pending" ? (
                      <Link to="/laboratory/results/new/1" className="text-sm font-medium text-primary hover:underline">
                        Enter Result
                      </Link>
                    ) : (
                      <Link to="/laboratory/results/1" className="text-sm text-muted-foreground hover:underline">
                        View Report
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Showing today&apos;s items only.</p>
      </div>
    </div>
  )
}
