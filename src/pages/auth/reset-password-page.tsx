import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout, HISLogo } from "@/components/auth/auth-layout"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const schema = z
  .object({
    password: z.string().min(1, "New password is required."),
    confirm: z.string().min(1, "Please confirm your password."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
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
  if (passed === 0) return { label: "", score: 0 }
  if (passed === 1) return { label: "Weak", score: 1 }
  if (passed <= 3) return { label: "Fair", score: 2 }
  return { label: "Strong", score: 3 }
}

function StrengthBar({ password }: { password: string }) {
  const { label, score } = getStrength(password)
  if (!password) return null

  const segmentColor =
    score === 1 ? "bg-destructive" : score === 2 ? "bg-[#F59E0B]" : "bg-[#10B981]"

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i <= score ? segmentColor : "bg-border"
            )}
          />
        ))}
      </div>
      {label && (
        <p
          className={cn(
            "text-xs font-medium",
            score === 1 ? "text-destructive" : score === 2 ? "text-[#F59E0B]" : "text-[#10B981]"
          )}
        >
          {label}
        </p>
      )}
    </div>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordValue, setPasswordValue] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(_data: FormValues) {
    const allPassed = POLICIES.every((p) => p.test(_data.password))
    if (!allPassed) return

    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setIsLoading(false)
    toast.success("Password updated", {
      description: "Your password has been set. Please sign in.",
    })
    navigate("/login")
  }

  return (
    <AuthLayout>
      <HISLogo />

      <div className="w-full max-w-[400px] rounded-lg bg-card shadow-md">
        <div className="p-10">
          <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Your new password must be at least 10 characters and include an uppercase letter, a
            number, and a special character.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register("password", {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  {errors.password.message}
                </p>
              )}
              <StrengthBar password={passwordValue} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  aria-invalid={!!errors.confirm}
                  className="pr-10"
                  {...register("confirm")}
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
              {errors.confirm && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  {errors.confirm.message}
                </p>
              )}
            </div>

            {/* Policy checklist */}
            {passwordValue && (
              <div className="space-y-1 rounded-md bg-muted p-3">
                {POLICIES.map((p) => {
                  const met = p.test(passwordValue)
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
                "Set New Password"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remember it?{" "}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
