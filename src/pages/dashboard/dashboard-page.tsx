import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DoctorDashboard }        from "./doctor-dashboard"
import { NurseDashboard }         from "./nurse-dashboard"
import { LabTechDashboard }       from "./lab-tech-dashboard"
import { ReceptionistDashboard }  from "./receptionist-dashboard"
import { HospitalAdminDashboard } from "./hospital-admin-dashboard"
import { MinistryDashboard }      from "./ministry-dashboard"

// ── Role options ──────────────────────────────────────────────────────────────

type Role = "hospital-admin" | "doctor" | "nurse" | "lab-tech" | "receptionist" | "ministry"

const ROLES: { value: Role; label: string }[] = [
  { value: "hospital-admin",  label: "Hospital Admin"              },
  { value: "doctor",          label: "Doctor"                      },
  { value: "nurse",           label: "Nurse"                       },
  { value: "lab-tech",        label: "Lab Technician"              },
  { value: "receptionist",    label: "Receptionist / Data Clerk"   },
  { value: "ministry",        label: "Ministry / Public Health Officer" },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [role, setRole] = useState<Role>("hospital-admin")

  return (
    <div className="space-y-6">
      {/* Demo role switcher — replaces JWT-based routing in production */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-2.5">
        <p className="text-xs font-medium text-muted-foreground shrink-0">Demo — viewing as:</p>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="h-8 w-56 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Role-specific dashboard */}
      {role === "doctor"         && <DoctorDashboard />}
      {role === "nurse"          && <NurseDashboard />}
      {role === "lab-tech"       && <LabTechDashboard />}
      {role === "receptionist"   && <ReceptionistDashboard />}
      {role === "hospital-admin" && <HospitalAdminDashboard />}
      {role === "ministry"       && <MinistryDashboard />}
    </div>
  )
}
