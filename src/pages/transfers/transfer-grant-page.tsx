import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  FilePen,
  Info,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ── Mock hospital registry ────────────────────────────────────────────────────

const MOCK_HOSPITALS = [
  "Douala General Hospital",
  "Yaoundé Central Hospital",
  "Bamenda Regional Hospital",
  "Bafoussam Regional Hospital",
  "Buea Regional Hospital",
  "Limbé District Hospital",
  "Bertoua Regional Hospital",
  "Ngaoundéré Regional Hospital",
  "Ebolowa Regional Hospital",
  "Maroua Regional Hospital",
  "Garoua Regional Hospital",
  "Kumba District Hospital",
  "Kribi District Hospital",
  "Édéa District Hospital",
  "Nkongsamba District Hospital",
]

// ── Page ─────────────────────────────────────────────────────────────────────

export function TransferGrantPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const state = location.state as {
    patientName?: string
    patientId?:   string
    patientDob?:  string
  } | null

  const patientName = state?.patientName ?? "ED Ebai, David M."
  const patientId   = state?.patientId   ?? "PT-8839201"
  const patientDob  = state?.patientDob  ?? "14/05/1982"

  // Hospital combobox
  const [hospitalQuery,    setHospitalQuery]    = useState("")
  const [selectedHospital, setSelectedHospital] = useState("")
  const [dropdownOpen,     setDropdownOpen]     = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  const filteredHospitals = hospitalQuery.trim() === ""
    ? MOCK_HOSPITALS
    : MOCK_HOSPITALS.filter(h =>
        h.toLowerCase().includes(hospitalQuery.toLowerCase())
      )

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  function selectHospital(name: string) {
    setSelectedHospital(name)
    setHospitalQuery(name)
    setDropdownOpen(false)
  }

  function clearHospital() {
    setSelectedHospital("")
    setHospitalQuery("")
    setDropdownOpen(false)
  }

  // Other form fields
  const [accessLevel, setAccessLevel] = useState<"view" | "consult">("view")
  const [duration,    setDuration]    = useState("7")
  const [submitting,  setSubmitting]  = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedHospital) {
      toast.error("Hospital required", { description: "Please select a receiving hospital from the list." })
      return
    }
    if (!duration || Number(duration) < 1 || Number(duration) > 90) {
      toast.error("Invalid duration", { description: "Duration must be between 1 and 90 days." })
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success("Access Granted", {
        description: `${selectedHospital} has been granted ${accessLevel === "view" ? "View Only" : "View & Consult"} access to ${patientName}'s records for ${duration} day${Number(duration) === 1 ? "" : "s"}. The receiving hospital has been notified.`,
        duration: 6000,
      })
      navigate(-1)
    }, 800)
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        to="/transfers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Grant Patient Access to Another Hospital
        </h1>
      </div>

      {/* Patient record card */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Patient Record</p>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{patientName}</p>
            <p className="text-xs text-muted-foreground">
              ID: {patientId} &bull; DOB: {patientDob}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Receiving hospital — searchable combobox */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Receiving Hospital <span className="text-destructive">*</span>
          </label>
          <div className="relative" ref={comboboxRef}>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search and select a hospital…"
                value={hospitalQuery}
                onChange={e => {
                  setHospitalQuery(e.target.value)
                  setSelectedHospital("")
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                className={cn(
                  "pl-9 pr-8",
                  selectedHospital ? "text-foreground font-medium" : "",
                )}
                autoComplete="off"
              />
              {hospitalQuery && (
                <button
                  type="button"
                  onClick={clearHospital}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear hospital"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown list */}
            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                {filteredHospitals.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No hospitals found matching &ldquo;{hospitalQuery}&rdquo;
                  </div>
                ) : (
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {filteredHospitals.map(name => (
                      <li key={name}>
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); selectHospital(name) }}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                            selectedHospital === name
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-foreground",
                          )}
                        >
                          {name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {selectedHospital && (
            <p className="text-xs text-muted-foreground">
              Selected: <span className="font-medium text-primary">{selectedHospital}</span>
            </p>
          )}
        </div>

        {/* Access level */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Access Level <span className="text-destructive">*</span>
          </p>
          <RadioGroup
            value={accessLevel}
            onValueChange={v => setAccessLevel(v as "view" | "consult")}
            className="space-y-2"
          >
            <div className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${accessLevel === "view" ? "border-primary bg-primary/5" : "border-border"}`}>
              <RadioGroupItem value="view" id="grant-view" className="mt-0.5" />
              <div>
                <Label htmlFor="grant-view" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <Eye size={15} className="text-primary" /> View Only
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Can read results but cannot amend or add notes.
                </p>
              </div>
            </div>
            <div className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${accessLevel === "consult" ? "border-primary bg-primary/5" : "border-border"}`}>
              <RadioGroupItem value="consult" id="grant-consult" className="mt-0.5" />
              <div>
                <Label htmlFor="grant-consult" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <FilePen size={15} className="text-primary" /> View &amp; Consult
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Can read results and append clinical consultation notes.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Duration */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  htmlFor="duration"
                  className="inline-flex cursor-default items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  Access Duration (Days) <span className="text-destructive">*</span>
                  <Info size={13} className="text-muted-foreground" />
                </label>
              </TooltipTrigger>
              <TooltipContent>
                <p>Access auto-expires after this many days. Default is 7 days.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2">
            <Input
              id="duration"
              type="number"
              min={1}
              max={90}
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">days from today</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Maximum 90 days. Access auto-revokes upon expiration.
          </p>
        </div>

        {/* Info note */}
        <div className="flex gap-2 rounded-lg border border-[#0D9488] bg-[#0D9488]/10 p-4">
          <Info size={15} className="mt-0.5 shrink-0 text-[#0D9488]" />
          <p className="text-sm text-foreground">
            This grants immediate access to the selected hospital&apos;s clinical staff to view this
            patient&apos;s historical and active laboratory results across the network. The receiving
            hospital will be notified automatically.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            <CheckCircle size={15} /> Grant Access
          </Button>
        </div>
      </form>
    </div>
  )
}
