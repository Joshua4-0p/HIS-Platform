import { useState, useEffect } from "react"
import { Search, CheckCircle, Clock, Eye, Loader2, Plus, X, XCircle, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────

type HospitalStatus = "Active" | "Suspended" | "Pending"

interface Hospital {
  id: string
  name: string
  region: string
  type: string
  status: HospitalStatus
  registeredDate: string
}

const CAMEROON_REGIONS = [
  "Adamawa", "Centre", "East", "Far North", "Littoral",
  "North", "Northwest", "South", "Southwest", "West",
]

const PAGE_SIZE = 8

// ── Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: HospitalStatus }) {
  if (status === "Active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 px-2.5 py-1 text-xs font-medium text-[#10B981]">
        <CheckCircle size={12} />
        Active
      </span>
    )
  }
  if (status === "Suspended") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
        <XCircle size={12} />
        Suspended
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/15 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
      <Clock size={12} />
      Pending
    </span>
  )
}

// ── Register Hospital Modal ───────────────────────────────────

interface RegisterModalProps {
  onClose: () => void
  onSuccess: () => void
}

function RegisterHospitalModal({ onClose, onSuccess }: RegisterModalProps) {
  const [form, setForm] = useState({
    facilityName: "",
    address: "",
    region: "",
    facilityType: "",
    adminName: "",
    adminEmail: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { facilityName, address, region, facilityType, adminName, adminEmail } = form
    if (!facilityName || !address || !region || !facilityType || !adminName || !adminEmail) {
      setError("All fields are required.")
      return
    }
    setSubmitting(true)
    try {
      const token = localStorage.getItem("his_id_token")
      const res = await fetch(`${API_BASE}/hospitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to register hospital.")
        return
      }
      toast.success("Hospital registered", { description: `${facilityName} is now active.` })
      onSuccess()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Register Hospital</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rh-name">Facility Name</Label>
              <Input
                id="rh-name"
                placeholder="e.g. Bamenda Regional Hospital"
                value={form.facilityName}
                onChange={(e) => set("facilityName", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rh-address">Address</Label>
              <Input
                id="rh-address"
                placeholder="Street / quarter, City"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rh-region">Region</Label>
                <select
                  id="rh-region"
                  aria-label="Region"
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <option value="">Select region</option>
                  {CAMEROON_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rh-type">Facility Type</Label>
                <select
                  id="rh-type"
                  aria-label="Facility Type"
                  value={form.facilityType}
                  onChange={(e) => set("facilityType", e.target.value)}
                  className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <option value="">Select type</option>
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                  <option value="Mission">Mission</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rh-admin-name">Admin Full Name</Label>
              <Input
                id="rh-admin-name"
                placeholder="e.g. Dr. Jane Doe"
                value={form.adminName}
                onChange={(e) => set("adminName", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rh-admin-email">Admin Email</Label>
              <Input
                id="rh-admin-email"
                type="email"
                placeholder="admin@hospital.cm"
                value={form.adminEmail}
                onChange={(e) => set("adminEmail", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cognito will email a temporary password to this address.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Hospital"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function AllHospitalsPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  function fetchHospitals() {
    setLoading(true)
    const token = localStorage.getItem("his_id_token")
    fetch(`${API_BASE}/hospitals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setHospitals(
          (data.hospitals ?? []).map((h: Hospital & { facilityType: string; submittedDate: string }) => ({
            id: h.id,
            name: h.name,
            region: h.region,
            type: h.facilityType ?? h.type,
            status: h.status,
            registeredDate: h.registeredDate ?? h.submittedDate,
          }))
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHospitals()
  }, [])

  const filtered = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.region.toLowerCase().includes(search.toLowerCase()) ||
    h.type.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleRegistered() {
    setShowModal(false)
    fetchHospitals()
  }

  return (
    <div className="space-y-6">
      {/* Page header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">All Hospitals</h1>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search hospitals..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowModal(true)} className="shrink-0">
            <Plus size={16} />
            Register Hospital
          </Button>
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading hospitals...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Search size={48} className="opacity-30" />
            <p className="text-sm">{search ? `No hospitals found matching "${search}".` : "No hospitals registered yet."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hospital Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registered Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((hospital) => (
                  <tr key={hospital.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{hospital.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{hospital.region}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{hospital.type}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={hospital.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{hospital.registeredDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`View ${hospital.name}`}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className={cn(
          "flex items-center justify-between border-t border-border bg-card px-6 py-4",
          (loading || filtered.length === 0) && "hidden"
        )}>
          <span className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} hospitals
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Register Hospital Modal */}
      {showModal && (
        <RegisterHospitalModal
          onClose={() => setShowModal(false)}
          onSuccess={handleRegistered}
        />
      )}
    </div>
  )
}
