import { useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

export function SystemConfigPage() {
  const [sessionTimeout,    setSessionTimeout]    = useState(60)
  const [transferDuration,  setTransferDuration]  = useState(7)
  const [emailTime,         setEmailTime]         = useState("08:00")

  function handleSave() {
    toast.success("Configuration saved.", {
      description: "System settings have been updated and will take effect immediately.",
    })
  }

  return (
    <div className="max-w-160 mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">System Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Super Admin global settings across all hospitals.
        </p>
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">

        {/* 1 — Platform Settings */}
        <section className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">1. Platform Settings</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="platform-name">Platform Name</Label>
            <Input
              id="platform-name"
              value="Healthcare Information System (HIS)"
              disabled
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Read-only in the current MVP release.</p>
          </div>
        </section>

        <Separator />

        {/* 2 — Session & Security */}
        <section className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">2. Session &amp; Security</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-timeout">Default Session Timeout</Label>
            <div className="flex items-center gap-3">
              <Input
                id="session-timeout"
                type="number"
                min={5}
                max={480}
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-foreground">minutes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Staff sessions will expire after this many minutes of inactivity.
            </p>
          </div>
        </section>

        <Separator />

        {/* 3 — Transfer Defaults */}
        <section className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">3. Transfer Defaults</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-duration">Default Transfer Grant Duration</Label>
            <div className="flex items-center gap-3">
              <Input
                id="transfer-duration"
                type="number"
                min={1}
                max={90}
                value={transferDuration}
                onChange={(e) => setTransferDuration(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Default access duration pre-filled when approving transfer requests.
            </p>
          </div>
        </section>

        <Separator />

        {/* 4 — Notifications */}
        <section className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">4. Notifications</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-time">Daily Summary Email Time</Label>
            <div className="flex items-center gap-3">
              <Input
                id="email-time"
                type="time"
                value={emailTime}
                onChange={(e) => setEmailTime(e.target.value)}
                className="w-36 scheme-light dark:scheme-dark"
              />
              <span className="text-sm text-foreground">WAT (West Africa Time, UTC+1)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Time at which daily summary emails are dispatched to hospital administrators.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save size={15} />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  )
}
