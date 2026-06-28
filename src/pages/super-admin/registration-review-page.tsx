import { useState, useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle, Clock, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────

interface HospitalDetail {
  id: string
  name: string
  address: string
  region: string
  facilityType: string
  submittedDate: string
  status: "Pending" | "Approved" | "Rejected"
  adminName: string
  adminEmail: string
  decisionBy?: string
  decisionDate?: string
  rejectionReason?: string
}

// ── Status Badge ──────────────────────────────────────────────

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const base = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border"
  if (status === "Pending") {
    return (
      <span className={cn(base, "bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]", large && "text-sm px-4 py-2")}>
        <Clock size={large ? 14 : 12} />
        Pending Review
      </span>
    )
  }
  if (status === "Approved") {
    return (
      <span className={cn(base, "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30", large && "text-sm px-4 py-2")}>
        <CheckCircle size={large ? 14 : 12} />
        Approved
      </span>
    )
  }
  return (
    <span className={cn(base, "bg-destructive/10 text-destructive border-destructive/30", large && "text-sm px-4 py-2")}>
      <XCircle size={large ? 14 : 12} />
      Rejected
    </span>
  )
}

// ── Label-value pair ──────────────────────────────────────────

function DataPair({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "md:col-span-2")}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function RegistrationReviewPage() {
  const { id = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reg, setReg] = useState<HospitalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const token = localStorage.getItem("his_id_token")

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/hospitals/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setReg(data))
      .catch(() => toast.error("Failed to load hospital details."))
      .finally(() => setLoading(false))
  }, [id, token])

  async function handleApprove() {
    if (!reg) return
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/hospitals/${reg.id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Approval failed", { description: json.error ?? "Please try again." })
        return
      }
      setReg((prev) => prev ? { ...prev, status: "Approved", decisionBy: "Super Admin", decisionDate: new Date().toISOString().split("T")[0] } : prev)
      toast.success("Registration Approved", {
        description: `${reg.name} is now active. Temp password: ${json.tempPassword}`,
        duration: 10000,
      })
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleConfirmReject() {
    if (!reg) return
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/hospitals/${reg.id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Rejection failed", { description: json.error ?? "Please try again." })
        return
      }
      setReg((prev) => prev ? {
        ...prev, status: "Rejected",
        decisionBy: "Super Admin", decisionDate: new Date().toISOString().split("T")[0],
        rejectionReason,
      } : prev)
      setShowConfirmDialog(false)
      setShowRejectForm(false)
      toast.info("Registration Rejected", {
        description: `${reg.name} has been rejected.`,
      })
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-40 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (!reg) {
    return (
      <div className="flex flex-col items-center gap-4 py-40 text-muted-foreground">
        <p className="text-sm">Hospital not found.</p>
        <Link to="/super-admin/registrations" className="text-sm text-primary hover:underline">
          Back to Registrations
        </Link>
      </div>
    )
  }

  const isPending = reg.status === "Pending"

  return (
    <div className="space-y-6">
      {/* Back link + title */}
      <div className="flex flex-col gap-3">
        <Link
          to="/super-admin/registrations"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft size={16} />
          Hospital Registrations
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Review Registration — {reg.name}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* LEFT — Facility Information (7/12) */}
        <div className="overflow-hidden rounded-lg border border-border bg-card lg:col-span-7">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Facility Information</h2>
            <StatusBadge status={reg.status} />
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-7 p-6 md:grid-cols-2">
            <DataPair label="Facility Name" value={reg.name} />
            <DataPair label="Region" value={reg.region} />
            <DataPair label="Physical Address" value={reg.address} fullWidth />
            <DataPair label="Facility Type" value={reg.facilityType} />
            <DataPair label="Date Submitted" value={reg.submittedDate} />

            <div className="h-px bg-border md:col-span-2" />

            <DataPair label="Administrator Name" value={reg.adminName ?? "—"} />
            <DataPair label="Administrator Email" value={reg.adminEmail} />

            {!isPending && (
              <>
                <div className="h-px bg-border md:col-span-2" />
                <DataPair label="Decision By" value={reg.decisionBy ?? "Super Admin"} />
                <DataPair label="Decision Date" value={reg.decisionDate ?? "—"} />
                {reg.status === "Rejected" && reg.rejectionReason && (
                  <DataPair label="Rejection Reason" value={reg.rejectionReason} fullWidth />
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT — Review Decision (5/12) */}
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border bg-muted/30 px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Review Decision</h2>
            </div>

            <div className="p-6">
              {isPending ? (
                <div className="flex flex-col gap-5">
                  <p className="text-sm text-muted-foreground">
                    Please review the facility details carefully. Approving this registration will grant the administrator full access to the clinical system under this facility profile.
                  </p>

                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={actionLoading}
                      onClick={handleApprove}
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      Approve Registration
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full gap-2"
                      disabled={actionLoading}
                      onClick={() => setShowRejectForm((v) => !v)}
                    >
                      <XCircle size={16} />
                      Reject Registration
                    </Button>
                  </div>

                  {showRejectForm && (
                    <div className="flex flex-col gap-3 border-t border-border pt-5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Rejection Reason</label>
                        <span className="text-xs font-normal text-destructive">Required</span>
                      </div>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this registration is being rejected."
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { setShowRejectForm(false); setRejectionReason("") }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={rejectionReason.trim().length === 0 || actionLoading}
                          onClick={() => setShowConfirmDialog(true)}
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <StatusBadge status={reg.status} large />
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Decision recorded by <span className="font-medium text-foreground">{reg.decisionBy ?? "Super Admin"}</span>
                    </p>
                    {reg.decisionDate && (
                      <p className="text-xs text-muted-foreground">on {reg.decisionDate}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/super-admin/registrations")}
                  >
                    Back to List
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10">
                <XCircle size={16} className="text-destructive" />
              </div>
              Reject Hospital Registration
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will deny system access for{" "}
              <strong className="text-foreground">{reg.name}</strong>. The administrator will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded border border-[#F59E0B] bg-[#F59E0B]/15 p-2 text-xs text-[#78350F]">
            This action revokes all access immediately.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleConfirmReject}
            >
              Reject Registration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
