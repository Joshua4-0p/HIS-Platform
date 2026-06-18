import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, AlertCircle, AlertTriangle, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout, HISLogo } from "@/components/auth/auth-layout"

const schema = z.object({
  email: z
    .string()
    .min(1, "Email address is required.")
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [credentialError, setCredentialError] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(_data: FormValues) {
    setIsLoading(true)
    setCredentialError(false)
    await new Promise((r) => setTimeout(r, 1500))
    setIsLoading(false)
    setCredentialError(true)
  }

  return (
    <AuthLayout>
      <HISLogo />

      <div className="w-full max-w-[400px] rounded-lg bg-card shadow-md">
        <div className="p-10">
          <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">Sign in to your account</p>

          {credentialError && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-[#F59E0B] bg-[#F59E0B]/15 p-3 text-sm text-[#78350F]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Invalid email or password. Please try again.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register("password")}
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
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Session notice */}
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3 shrink-0" />
              Sessions expire after 60 minutes of inactivity.
            </p>
          </form>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        New hospital?{" "}
        <Link
          to="/register-hospital"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Register your facility
        </Link>
      </p>
    </AuthLayout>
  )
}
