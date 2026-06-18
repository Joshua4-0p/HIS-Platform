import { Activity, Calendar, FlaskConical, Users } from "lucide-react"

// Placeholder dashboard — role-specific dashboards built in Phase 12
export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Here's an overview of today's activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Patients Registered"
          value="1,284"
          icon={Users}
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          label="Today's Appointments"
          value="38"
          icon={Calendar}
          color="text-indigo-500"
          bg="bg-indigo-500/10"
        />
        <StatCard
          label="Encounters This Month"
          value="412"
          icon={Activity}
          color="text-[#10B981]"
          bg="bg-[#10B981]/10"
        />
        <StatCard
          label="Pending Lab Results"
          value="7"
          icon={FlaskConical}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B]/10"
        />
      </div>

      {/* Placeholder content area */}
      <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <Activity size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-sm font-medium text-foreground">
          Role-specific dashboards are built in Phase 12.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Doctor · Nurse · Lab Technician · Receptionist · Hospital Admin · Ministry Officer
        </p>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ElementType
  color: string
  bg: string
}

function StatCard({ label, value, icon: Icon, color, bg }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className={`flex size-9 items-center justify-center rounded-lg ${bg}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      <p className="mt-3 text-4xl font-bold text-foreground">{value}</p>
    </div>
  )
}
