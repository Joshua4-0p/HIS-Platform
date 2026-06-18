import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout, HISLogo } from "@/components/auth/auth-layout"

const schema = z.object({
  email: z
    .string()
    .min(1, "Email address is required.")
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Please enter a valid email address."),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setIsLoading(false)
    setSentTo(data.email)
  }

  return (
    <AuthLayout>
      <HISLogo />

      <div className="w-full max-w-[400px] rounded-lg bg-card shadow-md">
        <div className="p-10">
          {/* Back link */}
          <Link
            to="/login"
            className="mb-6 flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to Login
          </Link>

          {sentTo ? (
            /* Success state */
            <div className="space-y-4">
              <div className="rounded-md border border-[#10B981] bg-[#10B981]/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="size-5 text-[#10B981] shrink-0" />
                  <p className="text-sm font-semibold text-foreground">Check your inbox</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  A password reset link has been sent to{" "}
                  <span className="font-semibold text-foreground">{sentTo}</span>. The link expires
                  in 30 minutes.
                </p>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Didn't receive it?{" "}
                <button
                  type="button"
                  onClick={() => setSentTo(null)}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Resend
                </button>
              </p>
            </div>
          ) : (
            /* Form state */
            <>
              <h1 className="text-2xl font-semibold text-foreground">Reset your password</h1>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">
                Enter your email and we will send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
