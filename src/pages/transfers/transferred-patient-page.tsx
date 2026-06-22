import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  AlertTriangle,
  ArrowUp,
  Building2,
  Calendar,
  Clock,
  FileText,
  FlaskConical,
  Heart,
  Pill,
  RefreshCw,
  Thermometer,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

// ── Mock data ─────────────────────────────────────────────────────────────────

const PATIENT = {
  name:             "Amina Diallo",
  id:               "PT-84920-CM",
  sex:              "Female",
  age:              34,
  dob:              "12-May-1989",
  expiresOn:        "Oct 24, 2023 at 14:00",
  originFacility:   "General Hospital Yaoundé",
  transferDate:     "Oct 10, 2023",
  referringPhysician: "Dr. M. Kamga (Cardiology)",
  transferReason:   "Specialized cardiac evaluation and potential intervention not available at origin facility.",
}

const VITALS = [
  { label: "BP",         value: "145/90",  unit: "",    icon: <Heart size={14} className="text-destructive" />,  trend: "up" },
  { label: "Heart Rate", value: "88",      unit: "bpm", icon: <Heart size={14} className="text-primary" />,      trend: null },
  { label: "Temp",       value: "37.1",    unit: "°C",  icon: <Thermometer size={14} className="text-[#F59E0B]" />, trend: null },
  { label: "SpO₂",       value: "96",      unit: "%",   icon: <ArrowUp size={14} className="text-[#10B981]" />,  trend: null },
]

const PROBLEMS = [
  { name: "Essential Hypertension", year: 2021, note: "Currently poorly controlled based on recent vitals from origin facility." },
  { name: "Unstable Angina",        year: 2023, note: "Primary reason for transfer. Requiring cardiology consult." },
]

const ENCOUNTERS = [
  { date: "Oct 08, 2023", type: "Emergency Dept Visit", provider: "Dr. M. Kamga" },
  { date: "Sep 15, 2023", type: "Outpatient Clinic",    provider: "Dr. S. Olinga" },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export function TransferredPatientPage() {
  const { patientId } = useParams()
  const [tab, setTab] = useState("overview")
  void patientId

  function handleRenew() {
    toast.info("Renewal request sent", { description: "The source facility will be notified." })
  }

  return (
    <div className="space-y-6">
      {/* Expiry warning banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#F59E0B]" />
          <div>
            <p className="text-sm font-semibold text-[#78350F] dark:text-[#F59E0B]">
              View-Only Access — Expiring Transfer Access
            </p>
            <p className="text-xs text-[#92400E] dark:text-[#FCD34D]">
              Expires On: {PATIENT.expiresOn}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRenew}
          className="gap-1.5 border-[#F59E0B] text-[#78350F] hover:bg-[#F59E0B]/10 dark:text-[#F59E0B]"
        >
          <RefreshCw size={13} /> Request Renewal
        </Button>
      </div>

      {/* Patient header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <User size={28} className="text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{PATIENT.name}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Transferred
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              ID: {PATIENT.id} &bull; {PATIENT.sex} &bull; {PATIENT.age} yrs (DOB: {PATIENT.dob})
            </p>
            <p className="mt-1 text-xs text-[#F59E0B]">
              You have view-only access to this patient&apos;s records.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileText size={14} /> Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: transfer details + vitals + alerts */}
        <div className="space-y-4">
          {/* Transfer details */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
              <Building2 size={15} className="text-primary" /> Transfer Details
            </h2>
            <Separator className="mb-3" />
            <dl className="space-y-2">
              {[
                { label: "Originating Facility",   value: PATIENT.originFacility },
                { label: "Transfer Date",           value: PATIENT.transferDate },
                { label: "Referring Physician",     value: PATIENT.referringPhysician },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-muted-foreground">Reason for Transfer</dt>
                <dd className="text-sm text-foreground">{PATIENT.transferReason}</dd>
              </div>
            </dl>
          </div>

          {/* Latest vitals */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Heart size={15} className="text-primary" /> Latest Vitals
              </h2>
              <p className="text-xs text-muted-foreground">Recorded: 10 Oct</p>
            </div>
            <Separator className="mb-3" />
            <div className="grid grid-cols-2 gap-3">
              {VITALS.map(v => (
                <div key={v.label} className="rounded-md bg-muted/50 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">{v.icon}</div>
                  <p className="text-base font-bold text-foreground">
                    {v.value}
                    {v.unit && <span className="text-xs font-normal text-muted-foreground"> {v.unit}</span>}
                    {v.trend === "up" && <ArrowUp size={12} className="inline ml-0.5 text-destructive" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{v.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active alerts */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h2 className="flex items-center gap-2 mb-2 text-sm font-semibold text-destructive">
              <AlertTriangle size={15} /> Active Alerts
            </h2>
            <div className="flex items-start gap-2">
              <Pill size={14} className="mt-0.5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">Penicillin Allergy</p>
                <p className="text-xs text-muted-foreground">Severe anaphylactic reaction documented.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: tabs */}
        <div className="lg:col-span-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="encounters">Encounters</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="labs">Lab Results</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground">Active Problems</h2>
                <Separator />
                {PROBLEMS.map(p => (
                  <div key={p.name} className="rounded-md border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <span className="text-xs text-muted-foreground">Diagnosed: {p.year}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
                  </div>
                ))}

                <h2 className="mt-4 text-sm font-semibold text-foreground">Recent Encounters (Transferred)</h2>
                <Separator />
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr>
                        {["Date", "Type", "Provider", "Action"].map(h => (
                          <th
                            key={h}
                            className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ENCOUNTERS.map(enc => (
                        <tr key={enc.date} className="transition-colors hover:bg-muted/30">
                          <td className="py-2.5 pr-4 text-sm text-muted-foreground">{enc.date}</td>
                          <td className="py-2.5 pr-4 text-sm font-medium text-foreground">{enc.type}</td>
                          <td className="py-2.5 pr-4 text-sm text-muted-foreground">{enc.provider}</td>
                          <td className="py-2.5">
                            <button type="button" className="text-sm text-primary hover:underline">
                              View Note
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {(["encounters", "medications", "labs", "documents"] as const).map(t => (
              <TabsContent key={t} value={t}>
                <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card">
                  {t === "encounters" && <Calendar size={32} className="text-muted-foreground/40" />}
                  {t === "medications" && <Pill size={32} className="text-muted-foreground/40" />}
                  {t === "labs" && <FlaskConical size={32} className="text-muted-foreground/40" />}
                  {t === "documents" && <FileText size={32} className="text-muted-foreground/40" />}
                  <p className="text-sm text-muted-foreground capitalize">{t} — view-only access</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
