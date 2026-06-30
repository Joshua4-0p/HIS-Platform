import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'his_permissions'
const API_BASE = import.meta.env.VITE_API_BASE_URL as string ?? ''

function getStoredPermissions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>(getStoredPermissions)

  useEffect(() => {
    // If we already have permissions cached, skip the fetch
    if (permissions.length > 0) return

    const token = localStorage.getItem('his_id_token')
    if (!token) return

    fetch(`${API_BASE}/users/me/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { permissions?: string[] } | null) => {
        if (!json?.permissions) return
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json.permissions))
        setPermissions(json.permissions)
      })
      .catch(() => undefined)
  }, [permissions.length])

  const hasPermission = useCallback(
    (permission: string): boolean => permissions.includes(permission),
    [permissions],
  )

  const clearPermissions = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setPermissions([])
  }, [])

  return { permissions, hasPermission, clearPermissions }
}
