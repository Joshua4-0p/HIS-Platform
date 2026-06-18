import type { ReactNode } from "react"
import { Activity } from "lucide-react"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="force-light min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
      {children}
    </div>
  )
}

export function HISLogo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
          <Activity className="size-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground tracking-tight">HIS</span>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {subtitle ?? "Healthcare Information System"}
      </p>
    </div>
  )
}
