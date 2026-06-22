import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Info, Search, User, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  name: string
  hospital: string
}

// ── Mock data (name + hospital only — REQ-F-049) ──────────────────────────────

const MOCK_RESULTS: SearchResult[] = [
  { id: "res-a", name: "Momo, Alaric",   hospital: "Douala General Hospital" },
  { id: "res-b", name: "Ndongo, Sarah",  hospital: "Yaoundé Central Hospital" },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export function TransferSearchPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [dob,      setDob]      = useState("")
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [results,  setResults]  = useState<SearchResult[]>([])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setLoading(true)
    setSearched(false)
    setTimeout(() => {
      const query = fullName.toLowerCase()
      setResults(MOCK_RESULTS.filter(r => r.name.toLowerCase().includes(query)))
      setLoading(false)
      setSearched(true)
    }, 700)
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

      {/* Privacy notice — teal banner per design spec */}
      <div className="flex gap-3 rounded-lg border border-[#0D9488] bg-[#0D9488]/10 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-[#0D9488]" />
        <p className="text-sm text-foreground">
          Due to regional data protection regulations, cross-hospital search results are heavily
          redacted. Identifying fields such as Date of Birth and National IDs are hidden until
          access is formally granted by the source institution.
        </p>
      </div>

      {/* Search form */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Patient Lookup</h2>
        <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Patient Full Name</label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground"
              />
              <Input
                placeholder="Enter patient full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Date of Birth</label>
            <Input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Helps narrow results for common names.</p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="gap-2" disabled={loading}>
              <Search size={16} /> Search Network
            </Button>
          </div>
        </form>
      </div>

      {/* Loading — skeleton rows */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state — before any search */}
      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card py-16">
          <Search size={48} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Enter a patient name to search across hospitals.
          </p>
        </div>
      )}

      {/* No-results state */}
      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card py-16">
          <UserX size={48} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No patients found at other hospitals matching your search.
          </p>
          <p className="text-xs text-muted-foreground">Try a different name or check spelling.</p>
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Search Results ({results.length})
          </p>
          {results.map(result => (
            <div
              key={result.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <User size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{result.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Source Hospital: {result.hospital}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5"
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
