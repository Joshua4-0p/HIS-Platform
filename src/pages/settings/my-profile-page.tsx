import { Link } from "react-router-dom"
import { Mail, Building2, CalendarDays, Info, KeyRound, CheckCircle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Mock current-user data — replace with auth store values when backend is wired
const MOCK_USER = {
  name:        "Sarah Jenkins",
  initials:    "SJ",
  email:       "sarah.jenkins@hiscameroon.org",
  role:        "Senior Nurse",
  hospital:    "Yaoundé General Hospital",
  memberSince: "March 2025",
  status:      "Active" as const,
}

export function MyProfilePage() {
  const user = MOCK_USER

  return (
    <div className="max-w-140 mx-auto flex flex-col gap-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>

      {/* Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">

        {/* Profile summary */}
        <div className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center border-b border-border">
          <Avatar className="w-16 h-16 text-xl shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
              {user.initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
              <Badge variant="secondary" className="shrink-0">{user.role}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail size={15} className="shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 size={15} className="shrink-0" />
              <span>{user.hospital}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <CalendarDays size={13} className="shrink-0" />
              <span>Member since {user.memberSince}</span>
            </div>
          </div>
        </div>

        {/* Account status */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-border">
          <span className="text-sm font-medium text-foreground">Account Status</span>
          <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
            <CheckCircle size={14} />
            <span>{user.status}</span>
          </div>
        </div>

        {/* Bottom section */}
        <div className="p-6 flex flex-col gap-4">
          {/* Info note */}
          <div className="flex items-start gap-2 bg-muted/50 p-3 rounded-lg border border-border">
            <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              To update your name, email, or role, contact your Hospital Administrator.
            </p>
          </div>

          {/* Change password link */}
          <Link
            to="/settings/password"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline w-fit"
          >
            <KeyRound size={16} />
            Change Password
          </Link>
        </div>
      </div>
    </div>
  )
}
