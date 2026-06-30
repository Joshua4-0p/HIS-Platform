import { useState, useEffect } from "react"
import { Plus, Pencil, Lock, Trash2, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"

// ── Granular permission definitions (REQ-F-010) ──────────────

interface Permission {
  key: string
  label: string
  description: string
}

interface PermissionGroup {
  group: string
  permissions: Permission[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: "Patients",
    permissions: [
      { key: "patient:create", label: "patient:create", description: "Register new patient records." },
      { key: "patient:read",   label: "patient:read",   description: "View patient demographic data and history." },
      { key: "patient:update", label: "patient:update", description: "Edit patient demographic and contact details." },
      { key: "patient:delete", label: "patient:delete", description: "Soft-deactivate patient records (retains audit trail)." },
      { key: "patient:amend",  label: "patient:amend",  description: "Submit versioned amendments to clinical records." },
    ],
  },
  {
    group: "Appointments",
    permissions: [
      { key: "appointment:create", label: "appointment:create", description: "Schedule new appointments." },
      { key: "appointment:read",   label: "appointment:read",   description: "View appointment calendar and details." },
      { key: "appointment:update", label: "appointment:update", description: "Reschedule or change appointment details." },
      { key: "appointment:cancel", label: "appointment:cancel", description: "Cancel scheduled appointments with a reason." },
    ],
  },
  {
    group: "Clinical Encounters",
    permissions: [
      { key: "encounter:create", label: "encounter:create", description: "Open a new clinical encounter record." },
      { key: "encounter:read",   label: "encounter:read",   description: "View encounter history and details." },
    ],
  },
  {
    group: "Diagnoses",
    permissions: [
      { key: "diagnosis:create", label: "diagnosis:create", description: "Record diagnoses against an encounter." },
      { key: "diagnosis:read",   label: "diagnosis:read",   description: "View patient diagnoses." },
    ],
  },
  {
    group: "Vital Signs",
    permissions: [
      { key: "vitals:create", label: "vitals:create", description: "Record vital sign observations." },
      { key: "vitals:read",   label: "vitals:read",   description: "View patient vital signs." },
    ],
  },
  {
    group: "Prescriptions",
    permissions: [
      { key: "prescription:create", label: "prescription:create", description: "Write medication prescriptions." },
      { key: "prescription:read",   label: "prescription:read",   description: "View prescriptions for assigned patients." },
    ],
  },
  {
    group: "Lab Results",
    permissions: [
      { key: "lab_result:create", label: "lab_result:create", description: "Record results for lab test requests." },
      { key: "lab_result:read",   label: "lab_result:read",   description: "View lab results." },
      { key: "lab_result:update", label: "lab_result:update", description: "Issue versioned corrections to lab results." },
    ],
  },
  {
    group: "Bulk Upload",
    permissions: [
      { key: "bulk_upload:create", label: "bulk_upload:create", description: "Upload bulk patient data via CSV." },
      { key: "bulk_upload:read",   label: "bulk_upload:read",   description: "View bulk upload history and status." },
    ],
  },
  {
    group: "Transfers",
    permissions: [
      { key: "transfer:request", label: "transfer:request", description: "Submit cross-hospital patient transfer requests." },
      { key: "transfer:approve", label: "transfer:approve", description: "Approve or deny incoming transfer requests." },
    ],
  },
  {
    group: "Analytics",
    permissions: [
      { key: "analytics:view", label: "analytics:view", description: "Access analytics dashboards and population reports." },
    ],
  },
  {
    group: "Staff Management",
    permissions: [
      { key: "staff:create",     label: "staff:create",     description: "Invite and create new staff accounts." },
      { key: "staff:read",       label: "staff:read",       description: "View staff list and individual profiles." },
      { key: "staff:update",     label: "staff:update",     description: "Edit staff details and activate accounts." },
      { key: "staff:deactivate", label: "staff:deactivate", description: "Deactivate and re-activate staff accounts." },
    ],
  },
  {
    group: "Role Management",
    permissions: [
      { key: "role:create", label: "role:create", description: "Create new custom hospital roles." },
      { key: "role:update", label: "role:update", description: "Edit role names, descriptions, and permissions." },
      { key: "role:delete", label: "role:delete", description: "Delete custom roles (cannot delete default roles)." },
      { key: "role:assign", label: "role:assign", description: "Assign roles to staff members." },
    ],
  },
]

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key))

// ── Types ─────────────────────────────────────────────────────

type RoleKind = "system" | "default" | "custom"

interface Role {
  id: string
  name: string
  description: string
  kind: RoleKind
  permissions: string[]
}

interface HistoryEntry {
  id: string
  date: string
  adminName: string
  targetName: string
  previousRole: string
  newRole: string
}

// ── Kind badge ────────────────────────────────────────────────

function KindBadge({ kind }: { kind: RoleKind }) {
  if (kind === "system")
    return <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">System</span>
  if (kind === "custom")
    return <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Custom</span>
  return null
}

// ── Page ──────────────────────────────────────────────────────

export function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"roles" | "history">("roles")
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const token = localStorage.getItem("his_id_token")

  useEffect(() => {
    if (activeTab !== "history") return
    setHistoryLoading(true)
    fetch(`${API_BASE}/roles/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setHistory(data.history ?? []))
      .catch(() => toast.error("Failed to load role history."))
      .finally(() => setHistoryLoading(false))
  }, [activeTab, token])

  useEffect(() => {
    fetch(`${API_BASE}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const loaded: Role[] = data.roles ?? []
        setRoles(loaded)
        if (loaded.length > 0) {
          const first = loaded[0]
          setSelectedId(first.id)
          setEditName(first.name)
          setEditDesc(first.description)
          setEditPerms(first.permissions)
        }
      })
      .catch(() => toast.error("Failed to load roles."))
      .finally(() => setLoading(false))
  }, [token])

  const selected = roles.find((r) => r.id === selectedId) ?? null

  // Editing state — mirrors selected role until saved
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editPerms, setEditPerms] = useState<string[]>([])

  function selectRole(role: Role) {
    setSelectedId(role.id)
    setEditName(role.name)
    setEditDesc(role.description)
    setEditPerms(role.permissions)
  }

  function togglePerm(key: string, checked: boolean) {
    setEditPerms((prev) => checked ? [...prev, key] : prev.filter((p) => p !== key))
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/roles/${selected.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc, permissionKeys: editPerms }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Save failed", { description: json.error })
        return
      }
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selected.id ? { ...r, name: editName, description: editDesc, permissions: editPerms } : r
        )
      )
      toast.success("Role Saved", {
        description: `"${editName}" updated. Changes apply immediately to all assigned users.`,
      })
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    if (!selected) return
    setEditName(selected.name)
    setEditDesc(selected.description)
    setEditPerms(selected.permissions)
    toast.info("Changes Discarded")
  }

  async function handleDeleteRole() {
    if (!selected || selected.kind !== "custom") return
    try {
      const res = await fetch(`${API_BASE}/roles/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error("Delete failed", { description: json.error })
        return
      }
      const next = roles.find((r) => r.id !== selected.id)
      setRoles((prev) => prev.filter((r) => r.id !== selected.id))
      if (next) selectRole(next)
      toast.success("Role Deleted")
    } catch {
      toast.error("Network error. Please try again.")
    }
  }

  async function handleCreateCustomRole() {
    try {
      const res = await fetch(`${API_BASE}/roles`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Custom Role",
          description: "Describe this role's purpose and scope.",
          permissionKeys: [],
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Create failed", { description: json.error })
        return
      }
      const newRole: Role = { id: json.id, name: "New Custom Role", description: "Describe this role's purpose and scope.", kind: "custom", permissions: [] }
      setRoles((prev) => [...prev, newRole])
      selectRole(newRole)
    } catch {
      toast.error("Network error. Please try again.")
    }
  }

  const isEditable = !!selected && selected.kind !== "system"

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-40 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading roles...</span>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-112px)] flex-col gap-6 overflow-hidden">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Role Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage permission roles for staff members.
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          {/* Tab row */}
          <div className="flex shrink-0 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={cn(
                "flex-1 py-3 text-center text-sm font-medium transition-colors",
                activeTab === "roles"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Roles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 py-3 text-center text-sm font-medium transition-colors",
                activeTab === "history"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Change History
            </button>
          </div>

          {/* ── Roles tab ── */}
          {activeTab === "roles" && (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => selectRole(role)}
                    className={cn(
                      "group w-full rounded-lg border p-3 text-left transition-all",
                      role.id === selectedId
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium",
                            role.id === selectedId ? "text-primary" : "text-foreground group-hover:text-primary"
                          )}>
                            {role.name}
                          </span>
                          <KindBadge kind={role.kind} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {role.permissions.length} Permission{role.permissions.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {/* Role actions */}
                      <div className={cn(
                        "flex shrink-0 gap-1",
                        role.id === selectedId ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
                      )}>
                        {role.kind === "system" ? (
                          <Lock size={14} className="text-muted-foreground" title="System role cannot be edited" />
                        ) : (
                          <>
                            <Pencil size={14} className="text-muted-foreground hover:text-primary" />
                            {role.kind === "custom" && (
                              <Trash2
                                size={14}
                                className="text-muted-foreground hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteRole() }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Create Custom Role button */}
              <div className="shrink-0 border-t border-border bg-muted/20 p-4">
                <button
                  type="button"
                  onClick={handleCreateCustomRole}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-primary py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                >
                  <Plus size={16} />
                  Create Custom Role
                </button>
              </div>
            </>
          )}

          {/* ── Change History tab ── */}
          {activeTab === "history" && (
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 border-b border-border bg-card">
                    <tr>
                      <th className="px-4 py-2 text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="px-4 py-2 text-xs font-semibold text-muted-foreground">Staff Member</th>
                      <th className="px-4 py-2 text-xs font-semibold text-muted-foreground">Change</th>
                      <th className="px-4 py-2 text-xs font-semibold text-muted-foreground">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No role changes recorded yet.
                        </td>
                      </tr>
                    ) : (
                      history.map((entry) => (
                        <tr key={entry.id} className="hover:bg-muted/40">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{entry.date}</td>
                          <td className="px-4 py-3 text-xs text-foreground">{entry.targetName}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground">
                              {entry.previousRole} <span className="text-foreground">→</span> {entry.newRole}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{entry.adminName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        {selected ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {/* Right header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-muted/20 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{editName}</h2>
                  <KindBadge kind={selected.kind} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modify permissions for this role. Changes will apply immediately to all assigned users.
                </p>
              </div>
              {selected.kind === "custom" && (
                <button
                  type="button"
                  onClick={handleDeleteRole}
                  title="Delete Role"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Role name + description inputs */}
            <div className="shrink-0 border-b border-border p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground">Role Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={!isEditable}
                    className="disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground">Description</Label>
                  <Input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    disabled={!isEditable}
                    className="disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Permissions — grouped accordion */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Permissions <span className="ml-1 text-xs font-normal text-muted-foreground">({editPerms.length}/{ALL_PERMISSION_KEYS.length})</span>
                </h3>
                {isEditable && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <span>Select All</span>
                    <Checkbox
                      checked={editPerms.length === ALL_PERMISSION_KEYS.length}
                      onCheckedChange={(checked) =>
                        setEditPerms(checked ? [...ALL_PERMISSION_KEYS] : [])
                      }
                    />
                  </label>
                )}
              </div>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => {
                  const groupKeys = group.permissions.map((p) => p.key)
                  const groupSelected = groupKeys.filter((k) => editPerms.includes(k)).length
                  return (
                    <div key={group.group} className="rounded-lg border border-border">
                      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                          {group.group}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{groupSelected}/{groupKeys.length}</span>
                          {isEditable && (
                            <Checkbox
                              checked={groupSelected === groupKeys.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditPerms((prev) => [...new Set([...prev, ...groupKeys])])
                                } else {
                                  setEditPerms((prev) => prev.filter((k) => !groupKeys.includes(k)))
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
                        {group.permissions.map((perm, i) => (
                          <div
                            key={perm.key}
                            className={cn(
                              "flex items-start gap-2.5 px-4 py-3 transition-colors",
                              isEditable && "hover:bg-muted/30",
                              i % 2 === 0 && i + 1 < group.permissions.length && "sm:border-r sm:border-border",
                            )}
                          >
                            <Checkbox
                              id={perm.key}
                              checked={editPerms.includes(perm.key)}
                              onCheckedChange={(checked) => isEditable && togglePerm(perm.key, !!checked)}
                              disabled={!isEditable}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <label
                                htmlFor={perm.key}
                                className={cn(
                                  "block font-mono text-xs font-semibold text-foreground",
                                  isEditable ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                                )}
                              >
                                {perm.label}
                              </label>
                              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{perm.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-card px-6 py-4">
              <Button type="button" variant="outline" onClick={handleDiscard} disabled={!isEditable}>
                Discard Changes
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!isEditable || saving}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Role
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a role to edit.</p>
          </div>
        )}
      </div>
    </div>
  )
}
