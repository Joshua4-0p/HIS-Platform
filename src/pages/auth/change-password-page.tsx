import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, CheckCircle, Eye, EyeOff, Info, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout, HISLogo } from "@/components/auth/auth-layout"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"
import { toast } from "sonner"

const schema = z
  .object({
    tempPassword: z.string().min(1, "Temporary password is required."),
    newPassword: z.string().min(1, "New password is required."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

interface PolicyItem {
  id: string
  label: string
  test: (v: string) => boolean
}

const POLICIES: PolicyItem[] = [
  { id: "length", label: "At least 10 characters", test: (v) => v.length >= 10 },
  { id: "upper", label: "Contains an uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "number", label: "Contains a number", test: (v) => /[0-9]/.test(v) },
  { id: "special", label: "Contains a special character", test: (v) => /[^a-zA-Z0-9]/.test(v) },
]

function getStrength(password: string) {
  const passed = POLICIES.filter((p) => p.test(password)).length
  if (passed === 0) return { score: 0 }
  if (passed === 1) return { score: 1 }
  if (passed <= 3) return { score: 2 }
  return { score: 3 }
}

function StrengthBar({ password }: { password: string }) {
  const { score } = getStrength(password)
  if (!password) return null
  const color = score === 1 ? "bg-destructive" : score === 2 ? "bg-[#F59E0B]" : "bg-[#10B981]"
  return (
    <div className="mt-2 flex gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= score ? color : "bg-border")}
        />
      ))}
    </div>
  )
}

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // email + session injected by login page on NEW_PASSWORD_REQUIRED challenge
  const { email, session } = (location.state ?? {}) as { email?: string; session?: string }
  const [showTemp, setShowTemp] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newPasswordValue, setNewPasswordValue] = useState("")
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    setIsLoading(true)
    setApiError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, session, newPassword: data.newPassword }),
      })
      if (!res.ok) {
        const json = await res.json()
        setApiError(json.error ?? "Failed to set password. Please try again.")
        return
      }
      const json = await res.json()
      // Store tokens from the successful challenge response
      if (json.accessToken) {
        localStorage.setItem("his_access_token", json.accessToken)
        localStorage.setItem("his_id_token", json.idToken)
        localStorage.setItem("his_refresh_token", json.refreshToken)
        localStorage.setItem("his_user", JSON.stringify(json.user))
      }
      toast.success("Password set successfully", {
        description: "Your permanent password has been saved.",
      })
      if (json.user?.isSuperAdmin) {
        navigate("/super-admin/dashboard")
      } else {
        navigate("/dashboard")
      }
    } catch {
      setApiError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <HISLogo />

      <div className="w-full max-w-[440px] rounded-lg bg-card shadow-md">
        <div className="p-10">
          {/* Amber notice banner */}
          <div className="mb-6 flex items-start gap-2 rounded-md border border-[#F59E0B] bg-[#F59E0B]/15 p-3 text-sm text-[#78350F]">
            <Info className="mt-0.5 size-4 shrink-0" />
            You are using a temporary password. Please set a permanent password to continue.
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-1">Set your password</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Create a strong permanent password for your account.
          </p>

          {apiError && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Temp password */}
            <div className="space-y-1.5">
              <Label htmlFor="tempPassword" className="text-sm font-medium">
                Temporary Password
              </Label>
              <div className="relative">
                <Input
                  id="tempPassword"
                  type={showTemp ? "text" : "password"}
                  aria-invalid={!!errors.tempPassword}
                  className="pr-10"
                  {...register("tempPassword")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowTemp((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showTemp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.tempPassword && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  {errors.tempPassword.message}
                </p>
              )}
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  aria-invalid={!!errors.newPassword}
                  className="pr-10"
                  {...register("newPassword", {
                    onChange: (e) => setNewPasswordValue(e.target.value),
                  })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  {errors.newPassword.message}
                </p>
              )}
              <StrengthBar password={newPasswordValue} />
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  aria-invalid={!!errors.confirmPassword}
                  className="pr-10"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Policy checklist */}
            {newPasswordValue && (
              <div className="space-y-1 rounded-md bg-muted p-3">
                {POLICIES.map((p) => {
                  const met = p.test(newPasswordValue)
                  return (
                    <p
                      key={p.id}
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        met ? "text-[#10B981]" : "text-muted-foreground"
                      )}
                    >
                      {met ? (
                        <CheckCircle className="size-3 shrink-0" />
                      ) : (
                        <XCircle className="size-3 shrink-0" />
                      )}
                      {p.label}
                    </p>
                  )
                })}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Setting password...
                </>
              ) : (
                "Set Password & Continue"
              )}
            </Button>
          </form>
        </div>
      </div>
    </AuthLayout>
  )
}
