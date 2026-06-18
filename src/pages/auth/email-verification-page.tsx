import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthLayout, HISLogo } from "@/components/auth/auth-layout"
import { toast } from "sonner"

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams()
  const [resending, setResending] = useState(false)

  const isVerified = searchParams.get("verified") === "true"
  const email = searchParams.get("email") ?? "your registered email"

  async function handleResend() {
    setResending(true)
    await new Promise((r) => setTimeout(r, 1000))
    setResending(false)
    toast.success("Verification email resent", {
      description: `A new link has been sent to ${email}.`,
    })
  }

  return (
    <AuthLayout>
      <HISLogo />

      <div className="w-full max-w-[400px] rounded-lg bg-card shadow-md">
        <div className="p-10 flex flex-col items-center text-center">
          {isVerified ? (
            /* ── Verified state ── */
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-[#10B981]/10 mb-4">
                <CheckCircle className="size-8 text-[#10B981]" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Email Verified</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Your email has been verified. Your registration is now{" "}
                <span className="font-medium text-foreground">pending Super Admin approval</span>.
                You will receive an email when your account is activated.
              </p>
            </>
          ) : (
            /* ── Pending state ── */
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Clock className="size-8 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Check your email</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                We sent a verification link to{" "}
                <span className="font-semibold text-foreground">{email}</span>. Click the link to
                confirm your email address and complete registration.
              </p>

              <div className="mt-6 w-full space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={resending}
                  onClick={handleResend}
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </Button>

                {/* Demo toggle — remove in production */}
                <a
                  href="/verify-email?verified=true"
                  className="block text-xs text-muted-foreground underline-offset-4 hover:underline text-center"
                >
                  [Demo] Simulate verified state →
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
