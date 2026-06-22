import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertCircle, Building2, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ── Mock results (name + hospital only — REQ-F-049) ───────────────────────────

interface SearchResult {
  id: string
  name: string
  hospital: string
}

const MOCK_RESULTS: SearchResult[] = [
  { id: "res-a", name: "Momo, Alaric",   hospital: "Douala General Hospital" },
  { id: "res-b", name: "Ndongo, Sarah",  hospital: "Yaoundé Central Hospital" },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export function TransferSearchPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [dob,      setDob]      = useState("")
  const [searched, setSearched] = useState(false)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearched(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Cross-Hospital Patient Transfer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search and request patient records from affiliated medical centers.
        </p>
      </div>

      {/* Privacy warning */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            Strict Privacy Rules Apply
          </p>
          <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-400">
            Due to regional data protection regulations, cross-hospital search results are heavily
            redacted. Identifying fields such as Date of Birth and National IDs are hidden until
            access is formally granted by the source institution.
          </p>
        </div>
      </div>

      {/* Search form */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Patient Lookup</h2>
        <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Patient Full Name</label>
            <Input
              placeholder="Enter patient full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Date of Birth</label>
            <Input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="gap-2">
              <Search size={16} /> Search Network
            </Button>
          </div>
        </form>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Search Results ({MOCK_RESULTS.length})
          </p>
          {MOCK_RESULTS.map(result => (
            <div
              key={result.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <User size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{result.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 size={11} /> {result.hospital}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  navigate("/transfers/request/new", {
                    state: { patientName: result.name, hospital: result.hospital },
                  })
                }
              >
                Request Access
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
