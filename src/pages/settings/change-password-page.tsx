import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, CheckCircle, XCircle, Lock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

// ── Password policy rules ──────────────────────────────────────
function checkPolicy(pw: string) {
  return {
    length:    pw.length >= 10,
    uppercase: /[A-Z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^A-Za-z0-9]/.test(pw),
  }
}

function strengthLabel(pw: string): { label: string; color: string; widthClass: string } {
  const r = checkPolicy(pw)
  const passed = Object.values(r).filter(Boolean).length
  if (pw.length === 0) return { label: "",       color: "bg-border",      widthClass: "w-0"    }
  if (passed <= 1)     return { label: "Weak",   color: "bg-destructive", widthClass: "w-1/4"  }
  if (passed === 2)    return { label: "Weak",   color: "bg-destructive", widthClass: "w-1/3"  }
  if (passed === 3)    return { label: "Fair",   color: "bg-amber-400",   widthClass: "w-2/3"  }
  return                      { label: "Strong", color: "bg-emerald-500", widthClass: "w-full" }
}

// ── Sub-components ─────────────────────────────────────────────
function PasswordField({
  id, label, placeholder, value, onChange,
  autoComplete = "new-password", onBlur, error, fieldTitle,
}: {
  id: string; label: string; placeholder: string
  value: string; onChange: (v: string) => void
  autoComplete?: string
  onBlur?: () => void
  error?: string
  fieldTitle?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`pr-10 ${error ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
          autoComplete={autoComplete}
          title={fieldTitle}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  )
}

function RuleRow({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {pass
        ? <CheckCircle size={15} className="text-emerald-500 shrink-0" />
        : <XCircle    size={15} className="text-muted-foreground/50 shrink-0" />}
      <span className={`text-xs ${pass ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export function ChangePasswordPage() {
  const navigate = useNavigate()

  const [current, setCurrent]               = useState("")
  const [newPw,   setNewPw]                 = useState("")
  const [confirm, setConfirm]               = useState("")
  const [currentBlurred, setCurrentBlurred] = useState(false)

  const policy   = checkPolicy(newPw)
  const strength = strengthLabel(newPw)
  const allPass  = Object.values(policy).every(Boolean)
  const matches  = newPw === confirm && confirm.length > 0
  const canSubmit = current.length > 0 && allPass && matches

  const currentError = currentBlurred && current.length === 0
    ? "Current password is required."
    : undefined

  function handleSubmit() {
    if (!canSubmit) return
    toast.success("Password updated successfully.", {
      description: "Please use your new password on next login.",
    })
    navigate("/settings/profile")
  }

  function handleCancel() {
    setCurrent(""); setNewPw(""); setConfirm("")
    navigate("/settings/profile")
  }

  return (
    <div className="max-w-120 mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Change Password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ensure your account is using a long, random password to stay secure.
        </p>
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 flex flex-col gap-6">

          {/* Current password */}
          <PasswordField
            id="current-password"
            label="Current Password"
            placeholder="Enter current password"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
            onBlur={() => setCurrentBlurred(true)}
            error={currentError}
            fieldTitle="Enter your current account password to verify your identity."
          />

          <Separator />

          {/* New password */}
          <PasswordField
            id="new-password"
            label="New Password"
            placeholder="Enter new password (min. 10 characters)"
            value={newPw}
            onChange={setNewPw}
            autoComplete="new-password"
            fieldTitle="Must be at least 10 characters with an uppercase letter, a number, and a special character."
          />

          {/* Strength + policy panel */}
          {newPw.length > 0 && (
            <div className="flex flex-col gap-4 bg-muted/50 p-4 rounded-lg border border-border">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground">Password Strength</span>
                  <span className={`text-xs font-semibold ${
                    strength.label === "Strong" ? "text-emerald-500"
                    : strength.label === "Fair" ? "text-amber-500"
                    : "text-destructive"
                  }`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.widthClass}`}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <RuleRow pass={policy.length}    label="Minimum 10 characters" />
                <RuleRow pass={policy.uppercase} label="At least one uppercase letter" />
                <RuleRow pass={policy.number}    label="At least one number" />
                <RuleRow pass={policy.special}   label="At least one special character" />
              </div>
            </div>
          )}

          {/* Confirm password */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <ConfirmField
                confirm={confirm}
                setConfirm={setConfirm}
                matches={matches}
                newPw={newPw}
              />
            </div>
            {confirm.length > 0 && !matches && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                <AlertCircle size={12} /> Passwords do not match.
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Lock size={15} />
            Update Password
          </Button>
        </div>
      </div>
    </div>
  )
}

// Separate component so Confirm field has its own show/hide state
function ConfirmField({
  confirm, setConfirm, matches, newPw,
}: {
  confirm: string; setConfirm: (v: string) => void
  matches: boolean; newPw: string
}) {
  const [show, setShow] = useState(false)
  return (
    <>
      <Input
        id="confirm-password"
        type={show ? "text" : "password"}
        placeholder="Re-enter new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className={`pr-10 ${confirm.length > 0 && newPw.length > 0
          ? matches
            ? "border-emerald-500 focus-visible:ring-emerald-500/20"
            : "border-destructive focus-visible:ring-destructive/20"
          : ""}`}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </>
  )
}
