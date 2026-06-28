import { useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AuthLayout, HISLogo } from "@/components/auth/auth-layout"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useState } from "react"
import { API_BASE } from "@/lib/api"

const CAMEROON_REGIONS = [
  "Adamawa",
  "Centre",
  "East",
  "Far North",
  "Littoral",
  "North",
  "North West",
  "South",
  "South West",
  "West",
]

const FACILITY_TYPES = ["Public", "Private", "Mission"] as const

const schema = z
  .object({
    facilityName: z.string().min(1, "Facility name is required."),
    address: z.string().min(1, "Physical address is required."),
    region: z.string().min(1, "Region / District is required."),
    facilityType: z.enum(FACILITY_TYPES, { message: "Please select a facility type." }),
    adminName: z.string().min(1, "Administrator full name is required."),
    adminEmail: z
      .string()
      .min(1, "Administrator email is required.")
      .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Please enter a valid email address."),
    adminEmailConfirm: z.string().min(1, "Please confirm the email address."),
  })
  .refine((d) => d.adminEmail === d.adminEmailConfirm, {
    message: "Email addresses do not match.",
    path: ["adminEmailConfirm"],
  })

type FormValues = z.infer<typeof schema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="size-3 shrink-0" />
      {message}
    </p>
  )
}

export function RegisterHospitalPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { facilityType: undefined },
  })

  async function onSubmit(data: FormValues) {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/hospitals/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityName: data.facilityName,
          address: data.address,
          region: data.region,
          facilityType: data.facilityType,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Registration failed", { description: json.error ?? "Please try again." })
        return
      }
      toast.success("Registration submitted", {
        description: "Your application is pending Super Admin review. Check your email for next steps.",
      })
      navigate("/verify-email")
    } catch {
      toast.error("Network error", { description: "Check your connection and try again." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <HISLogo subtitle="Healthcare Information System" />

      <div className="w-full max-w-[560px] rounded-lg bg-card shadow-md">
        <div className="p-10">
          <h1 className="text-2xl font-semibold text-foreground">Register Your Facility</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Complete this form to request access to the HIS platform. Your registration will be
            reviewed by the Super Admin before activation.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            {/* ── Facility Details ── */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Facility Details</h2>
                <Separator className="mt-2" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="facilityName">Facility Name *</Label>
                <Input
                  id="facilityName"
                  placeholder="e.g. Bamenda Regional Hospital"
                  aria-invalid={!!errors.facilityName}
                  {...register("facilityName")}
                />
                <FieldError message={errors.facilityName?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Physical Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Enter the facility's full physical address..."
                  rows={3}
                  aria-invalid={!!errors.address}
                  {...register("address")}
                />
                <FieldError message={errors.address?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="region">Region / District *</Label>
                <Controller
                  name="region"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="region"
                        className="w-full"
                        aria-invalid={!!errors.region}
                      >
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMEROON_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.region?.message} />
              </div>

              <div className="space-y-1.5">
                <Label>Facility Type *</Label>
                <Controller
                  name="facilityType"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-3"
                    >
                      {FACILITY_TYPES.map((type) => (
                        <label
                          key={type}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors select-none",
                            field.value === type
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted text-foreground"
                          )}
                        >
                          <RadioGroupItem value={type} className="sr-only" />
                          {type}
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                />
                <FieldError message={errors.facilityType?.message} />
              </div>
            </div>

            {/* ── Administrator Account ── */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Administrator Account</h2>
                <Separator className="mt-2" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminName">Administrator Full Name *</Label>
                <Input
                  id="adminName"
                  placeholder="e.g. Dr. Marie Fotso"
                  aria-invalid={!!errors.adminName}
                  {...register("adminName")}
                />
                <FieldError message={errors.adminName?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminEmail">Administrator Email Address *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@yourhospital.cm"
                  aria-invalid={!!errors.adminEmail}
                  {...register("adminEmail")}
                />
                <FieldError message={errors.adminEmail?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminEmailConfirm">Confirm Email Address *</Label>
                <Input
                  id="adminEmailConfirm"
                  type="email"
                  placeholder="admin@yourhospital.cm"
                  aria-invalid={!!errors.adminEmailConfirm}
                  {...register("adminEmailConfirm")}
                />
                <FieldError message={errors.adminEmailConfirm?.message} />
              </div>
            </div>

            {/* Terms notice */}
            <div className="flex items-start gap-2 rounded-md border border-[#F59E0B] bg-[#F59E0B]/10 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#F59E0B]" />
              <p className="text-xs text-muted-foreground">
                By registering, you agree that all data will be processed in accordance with{" "}
                <span className="font-medium text-foreground">
                  Cameroon Data Protection Law No. 2010/012
                </span>
                .
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Registration"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
