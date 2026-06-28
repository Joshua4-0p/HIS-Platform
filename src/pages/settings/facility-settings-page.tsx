import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { API_BASE } from "@/lib/api"

const REGIONS = [
  "Centre", "Littoral", "North West", "South West", "West", "North", "Far North", "Adamawa", "East", "South",
]

export function FacilitySettingsPage() {
  const [facilityName, setFacilityName] = useState("")
  const [address, setAddress] = useState("")
  const [region, setRegion] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem("his_id_token")

  useEffect(() => {
    fetch(`${API_BASE}/settings/facility`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setFacilityName(data.facilityName ?? "")
        setAddress(data.address ?? "")
        setRegion(data.region ?? "")
        setPhone(data.contactPhone ?? "")
        setEmail(data.contactEmail ?? "")
      })
      .catch(() => toast.error("Failed to load facility settings."))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/settings/facility`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ facilityName, address, region, contactPhone: phone, contactEmail: email }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Update failed", { description: json.error ?? "Please try again." })
        return
      }
      toast.success("Facility profile updated successfully.")
    } catch {
      toast.error("Network error. Please check your connection.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-40 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Facility Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your facility's profile and contact information.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-2xl rounded-lg border border-border bg-card shadow-sm">
          <div className="space-y-5 p-6">

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">Facility Name</Label>
              <Input
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="e.g. Central Hospital Yaoundé"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">Physical Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Street address, City, Region, Country"
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">Region / District</Label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a region</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium text-foreground">Contact Phone Number</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+237 000 000 000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium text-foreground">Contact Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@hospital.cm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-border bg-muted/20 px-6 py-4">
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
