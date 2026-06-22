import { useState } from "react"
import { Search, Lock, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// ── Types ──────────────────────────────────────────────────────
type ActionType =
  | "READ"
  | "CREATE"
  | "UPDATE"
  | "AMEND"
  | "DELETE"
  | "CONSENT_CHANGE"
  | "TRANSFER_GRANT"
  | "TRANSFER_REVOKE"

interface AuditEntry {
  id: number
  timestamp: string
  staff: string
  patient: string
  action: ActionType
  resource: string
  ip: string
}

// ── Mock data ──────────────────────────────────────────────────
const AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: 1,
    timestamp: "2023-10-27 14:32:01",
    staff: "Dr. A. Biloa",
    patient: "P-8921 (Kamga, M.)",
    action: "READ",
    resource: "Vitals/Observation",
    ip: "192.168.1.45",
  },
  {
    id: 2,
    timestamp: "2023-10-27 14:28:15",
    staff: "RN. E. Talla",
    patient: "P-8921 (Kamga, M.)",
    action: "UPDATE",
    resource: "Nursing Notes",
    ip: "192.168.1.112",
  },
  {
    id: 3,
    timestamp: "2023-10-27 13:10:44",
    staff: "Dr. S. Ndi",
    patient: "P-4402 (Ondoa, P.)",
    action: "AMEND",
    resource: "Prescription/Rx",
    ip: "10.0.5.22",
  },
  {
    id: 4,
    timestamp: "2023-10-27 11:05:09",
    staff: "SysAdmin_01",
    patient: "P-1055 (Etoa, J.)",
    action: "DELETE",
    resource: "Duplicate Record",
    ip: "10.0.1.5",
  },
  {
    id: 5,
    timestamp: "2023-10-27 09:45:22",
    staff: "Reg. C. Mba",
    patient: "P-9100 (Fouda, L.)",
    action: "CREATE",
    resource: "Patient Demographics",
    ip: "192.168.2.14",
  },
  {
    id: 6,
    timestamp: "2023-10-26 16:20:00",
    staff: "Dr. A. Biloa",
    patient: "P-8921 (Kamga, M.)",
    action: "CONSENT_CHANGE",
    resource: "Privacy Preferences",
    ip: "192.168.1.45",
  },
  {
    id: 7,
    timestamp: "2023-10-26 15:55:12",
    staff: "HIM Dept",
    patient: "P-2210 (Njoya, I.)",
    action: "TRANSFER_GRANT",
    resource: "External Specialist",
    ip: "10.0.1.88",
  },
  {
    id: 8,
    timestamp: "2023-10-26 10:12:33",
    staff: "Dr. A. Biloa",
    patient: "P-2210 (Njoya, I.)",
    action: "TRANSFER_REVOKE",
    resource: "External Specialist",
    ip: "192.168.1.45",
  },
]

// ── Badge colors per action type ───────────────────────────────
const ACTION_BADGE: Record<ActionType, string> = {
  READ:           "bg-muted text-muted-foreground",
  CREATE:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  UPDATE:         "bg-primary/15 text-primary",
  AMEND:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE:         "bg-destructive/15 text-destructive",
  CONSENT_CHANGE:  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  TRANSFER_GRANT:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  TRANSFER_REVOKE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
}

// ── Page ───────────────────────────────────────────────────────
export function AuditPage() {
  const [patientSearch, setPatientSearch] = useState("")
  const [staff, setStaff] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Clinical Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          All patient data access and modification events recorded by this facility. This log is
          immutable and cannot be modified.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Patient identifier */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-foreground mb-1">
              Patient Identifier
            </label>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="ID, Name, or Phone"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Staff member */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Staff Member</label>
            <div className="relative">
              <select
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
                title="Filter by staff member"
                className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Staff</option>
                <option value="dr_biloa">Dr. A. Biloa</option>
                <option value="rn_talla">RN. E. Talla</option>
                <option value="dr_ndi">Dr. S. Ndi</option>
                <option value="sysadmin">SysAdmin_01</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Action type */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Action Type</label>
            <div className="relative">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                title="Filter by action type"
                className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Actions</option>
                <option value="READ">READ</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="AMEND">AMEND</option>
                <option value="DELETE">DELETE</option>
                <option value="CONSENT_CHANGE">CONSENT_CHANGE</option>
                <option value="TRANSFER_GRANT">TRANSFER_GRANT</option>
                <option value="TRANSFER_REVOKE">TRANSFER_REVOKE</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Date range */}
          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm scheme-light dark:scheme-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm scheme-light dark:scheme-dark"
              />
            </div>
          </div>

          {/* Search button */}
          <div className="md:col-span-2 flex justify-end">
            <Button type="button" className="w-full gap-2 h-10">
              <Search size={15} />
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-225">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Timestamp (WAT)
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Staff Member
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Patient
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Action Type
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Resource
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {AUDIT_ENTRIES.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4 text-xs font-mono text-foreground">
                    {entry.timestamp}
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground">{entry.staff}</td>
                  <td className="py-3 px-4 text-sm text-foreground">{entry.patient}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_BADGE[entry.action]}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{entry.resource}</td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground text-right">
                    {entry.ip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table pagination */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Showing 1 to 7 of 1,024 entries</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="p-1.5 rounded text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                className={`w-8 h-8 rounded text-sm font-medium flex items-center justify-center ${
                  p === 1
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="px-2 text-muted-foreground">...</span>
            <button
              type="button"
              className="w-8 h-8 rounded text-sm text-muted-foreground hover:bg-muted flex items-center justify-center"
            >
              147
            </button>
            <button
              type="button"
              className="p-1.5 rounded text-muted-foreground hover:bg-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Immutability notice */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border flex items-start gap-3">
        <Lock size={18} className="text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">
            Strict Immutability Enforced
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This audit log is cryptographically sealed and append-only. Modification, deletion, or
            tampering with these records is technically restricted and strictly prohibited under the
            Cameroon Data Protection Law No. 2010/012 relating to cybersecurity and cybercrime.
          </p>
        </div>
      </div>
    </div>
  )
}
