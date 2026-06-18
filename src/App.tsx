import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"

// Auth pages — Phase 1 (no shell)
import { LoginPage } from "@/pages/auth/login-page"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password-page"
import { ResetPasswordPage } from "@/pages/auth/reset-password-page"
import { ChangePasswordPage } from "@/pages/auth/change-password-page"
import { RegisterHospitalPage } from "@/pages/auth/register-hospital-page"
import { EmailVerificationPage } from "@/pages/auth/email-verification-page"

// Authenticated shell — Phase 2
import { AppShell } from "@/components/layout/app-shell"

// Authenticated pages — Phase 2 dashboard placeholder
import { DashboardPage } from "@/pages/dashboard/dashboard-page"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public: redirect root ── */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Auth routes — Phase 1 (no shell) ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/register-hospital" element={<RegisterHospitalPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />

        {/* ── Authenticated routes — Phase 2+ (inside AppShell) ── */}
        <Route path="/dashboard" element={<AppShell><DashboardPage /></AppShell>} />

        {/* Stub routes — filled in during their respective phases */}
        <Route path="/patients/*"     element={<AppShell><Stub title="Patients" /></AppShell>} />
        <Route path="/appointments/*" element={<AppShell><Stub title="Appointments" /></AppShell>} />
        <Route path="/encounters/*"   element={<AppShell><Stub title="Encounters" /></AppShell>} />
        <Route path="/laboratory/*"   element={<AppShell><Stub title="Laboratory" /></AppShell>} />
        <Route path="/bulk-upload/*"  element={<AppShell><Stub title="Bulk Upload" /></AppShell>} />
        <Route path="/transfers/*"    element={<AppShell><Stub title="Patient Transfers" /></AppShell>} />
        <Route path="/analytics/*"    element={<AppShell><Stub title="Analytics & Reports" /></AppShell>} />
        <Route path="/staff/*"        element={<AppShell><Stub title="Staff Management" /></AppShell>} />
        <Route path="/audit/*"        element={<AppShell><Stub title="Audit Log" /></AppShell>} />
        <Route path="/notifications"  element={<AppShell><Stub title="Notifications" /></AppShell>} />
        <Route path="/settings/*"     element={<AppShell><Stub title="Settings" /></AppShell>} />
        <Route path="/super-admin/*"  element={<AppShell><Stub title="Super Admin" /></AppShell>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Global toast notifications */}
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  )
}

// ── Stub page — replaced when each phase is built ────────────
function Stub({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <div className="flex min-h-100 items-center justify-center rounded-lg border border-dashed border-border bg-card">
        <p className="text-sm text-muted-foreground">This module is built in a later phase.</p>
      </div>
    </div>
  )
}
