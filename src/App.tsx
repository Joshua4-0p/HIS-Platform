import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"

// Auth pages — Phase 1 (no shell)
import { LoginPage } from "@/pages/auth/login-page"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password-page"
import { ResetPasswordPage } from "@/pages/auth/reset-password-page"
import { ChangePasswordPage as ForceChangePasswordPage } from "@/pages/auth/change-password-page"
import { RegisterHospitalPage } from "@/pages/auth/register-hospital-page"
import { EmailVerificationPage } from "@/pages/auth/email-verification-page"

// Authenticated shell — Phase 2
import { AppShell } from "@/components/layout/app-shell"

// Phase 2 — placeholder dashboard (replaced in Phase 12)
import { DashboardPage } from "@/pages/dashboard/dashboard-page"

// Phase 3 — Super Admin
import { SuperAdminDashboardPage } from "@/pages/super-admin/dashboard-page"
import { RegistrationsListPage } from "@/pages/super-admin/registrations-list-page"
import { RegistrationReviewPage } from "@/pages/super-admin/registration-review-page"
import { AllHospitalsPage } from "@/pages/super-admin/all-hospitals-page"

// Phase 4 — Staff Management & RBAC
import { StaffListPage } from "@/pages/staff/staff-list-page"
import { StaffFormPage } from "@/pages/staff/staff-form-page"
import { RoleManagementPage } from "@/pages/staff/role-management-page"
import { FacilitySettingsPage }   from "@/pages/settings/facility-settings-page"
import { ChangePasswordPage }     from "@/pages/settings/change-password-page"
import { MyProfilePage }          from "@/pages/settings/my-profile-page"
import { SystemConfigPage }       from "@/pages/super-admin/system-config-page"

// Phase 5 — Patient Registration & Search
import { PatientSearchPage } from "@/pages/patients/patient-search-page"
import { PatientFormPage } from "@/pages/patients/patient-form-page"

// Phase 6 — Patient Profile & Consent Management
import { PatientProfilePage } from "@/pages/patients/patient-profile-page"
import { UpdateConsentPage } from "@/pages/patients/update-consent-page"
import { AmendClinicalRecordPage } from "@/pages/patients/amend-clinical-record-page"

// Phase 7 — Appointment Scheduling
import { AppointmentsPage } from "@/pages/appointments/appointments-page"
import { CreateAppointmentPage } from "@/pages/appointments/create-appointment-page"

// Phase 14 — Notifications & Clinical Audit Log
import { NotificationsPage } from "@/pages/notifications/notifications-page"
import { AuditPage } from "@/pages/audit/audit-page"

// Phase 8 — Clinical Encounter Management
import { EncountersDashboardPage } from "@/pages/encounters/encounters-dashboard-page"
import { NewEncounterPage } from "@/pages/encounters/new-encounter-page"
import { EncounterDetailPage } from "@/pages/encounters/encounter-detail-page"

// Phase 9 — Laboratory Results Management
import { LabWorkQueuePage }    from "@/pages/laboratory/lab-work-queue-page"
import { EnterLabResultPage }  from "@/pages/laboratory/enter-lab-result-page"
import { LabResultDetailPage } from "@/pages/laboratory/lab-result-detail-page"

// Phase 10 — Bulk Data Ingestion
import { BulkUploadPage } from "@/pages/bulk-upload/bulk-upload-page"
import { EtlStatusPage }  from "@/pages/bulk-upload/etl-status-page"

// Phase 13 — Analytics & Filter Query Builder
import { AnalyticsPage } from "@/pages/analytics/analytics-page"

// Phase 11 — Cross-Hospital Patient Transfer Workflow
import { TransferSearchPage }     from "@/pages/transfers/transfer-search-page"
import { TransferRequestPage }    from "@/pages/transfers/transfer-request-page"
import { TransferReviewPage }     from "@/pages/transfers/transfer-review-page"
import { TransfersListPage }      from "@/pages/transfers/transfers-list-page"
import { TransferredPatientPage } from "@/pages/transfers/transferred-patient-page"
import { TransferGrantPage }      from "@/pages/transfers/transfer-grant-page"

// ── User presets ──────────────────────────────────────────────


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
        <Route path="/change-password" element={<ForceChangePasswordPage />} />
        <Route path="/register-hospital" element={<RegisterHospitalPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />

        {/* ── Hospital staff routes — Phase 2+ (standard shell) ── */}
        <Route path="/dashboard" element={<AppShell><DashboardPage /></AppShell>} />
        {/* ── Phase 5 — Patient Registration & Search ── */}
        <Route path="/patients"     element={<AppShell><PatientSearchPage /></AppShell>} />
        <Route path="/patients/new" element={<AppShell><PatientFormPage /></AppShell>} />
        {/* ── Phase 6 — Patient Profile & Consent Management ── */}
        <Route path="/patients/:id/consent"                    element={<AppShell><UpdateConsentPage /></AppShell>} />
        <Route path="/patients/:id/amend/:recordType/:recordId" element={<AppShell><AmendClinicalRecordPage /></AppShell>} />
        <Route path="/patients/:id/amend"                       element={<AppShell><AmendClinicalRecordPage /></AppShell>} />
        <Route path="/patients/:id"                             element={<AppShell><PatientProfilePage /></AppShell>} />
        {/* ── Phase 7 — Appointment Scheduling ── */}
        <Route path="/appointments/new" element={<AppShell><CreateAppointmentPage /></AppShell>} />
        <Route path="/appointments" element={<AppShell><AppointmentsPage /></AppShell>} />
        {/* ── Phase 8 — Clinical Encounter Management ── */}
        <Route path="/patients/:id/encounters/new"          element={<AppShell><NewEncounterPage /></AppShell>} />
        <Route path="/patients/:id/encounters/:encounterId" element={<AppShell><EncounterDetailPage /></AppShell>} />
        <Route path="/encounters"     element={<AppShell><EncountersDashboardPage /></AppShell>} />
        {/* ── Phase 9 — Laboratory Results Management ── */}
        <Route path="/laboratory/results/new/:requestId" element={<AppShell><EnterLabResultPage /></AppShell>} />
        <Route path="/laboratory/results/:resultId"      element={<AppShell><LabResultDetailPage /></AppShell>} />
        <Route path="/laboratory/queue"                  element={<AppShell><LabWorkQueuePage /></AppShell>} />
        <Route path="/laboratory"                        element={<AppShell><LabWorkQueuePage /></AppShell>} />
        {/* ── Phase 10 — Bulk Data Ingestion ── */}
        <Route path="/bulk-upload/status/:jobId" element={<AppShell><EtlStatusPage /></AppShell>} />
        <Route path="/bulk-upload"               element={<AppShell><BulkUploadPage /></AppShell>} />
        {/* ── Phase 11 — Cross-Hospital Patient Transfer Workflow ── */}
        <Route path="/transfers/patients/:patientId" element={<AppShell><TransferredPatientPage /></AppShell>} />
        <Route path="/transfers/requests/:id"        element={<AppShell><TransferReviewPage /></AppShell>} />
        <Route path="/transfers/request/new"         element={<AppShell><TransferRequestPage /></AppShell>} />
        <Route path="/transfers/grant/new"           element={<AppShell><TransferGrantPage /></AppShell>} />
        <Route path="/transfers/search"              element={<AppShell><TransferSearchPage /></AppShell>} />
        <Route path="/transfers"                     element={<AppShell><TransfersListPage /></AppShell>} />
        <Route path="/analytics"      element={<AppShell><AnalyticsPage /></AppShell>} />
        {/* ── Phase 4 — Staff Management & RBAC ── */}
        <Route path="/staff"              element={<AppShell><StaffListPage /></AppShell>} />
        <Route path="/staff/new"          element={<AppShell><StaffFormPage /></AppShell>} />
        <Route path="/staff/:id/edit"     element={<AppShell><StaffFormPage /></AppShell>} />
        <Route path="/staff/roles"        element={<AppShell><RoleManagementPage /></AppShell>} />
        <Route path="/settings/facility"  element={<AppShell><FacilitySettingsPage /></AppShell>} />
        <Route path="/settings/profile"   element={<AppShell><MyProfilePage /></AppShell>} />
        <Route path="/settings/password"  element={<AppShell><ChangePasswordPage /></AppShell>} />

        {/* ── Phase 14 — Notifications & Clinical Audit Log ── */}
        <Route path="/audit"         element={<AppShell><AuditPage /></AppShell>} />
        <Route path="/notifications" element={<AppShell><NotificationsPage /></AppShell>} />

        {/* ── Super Admin routes — Phase 3 (super-admin shell) ── */}
        <Route
          path="/super-admin/dashboard"
          element={
            <AppShell navVariant="super-admin">
              <SuperAdminDashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/super-admin/registrations/:id"
          element={
            <AppShell navVariant="super-admin">
              <RegistrationReviewPage />
            </AppShell>
          }
        />
        <Route
          path="/super-admin/registrations"
          element={
            <AppShell navVariant="super-admin">
              <RegistrationsListPage />
            </AppShell>
          }
        />
        <Route
          path="/super-admin/hospitals"
          element={
            <AppShell navVariant="super-admin">
              <AllHospitalsPage />
            </AppShell>
          }
        />
        <Route
          path="/super-admin/settings"
          element={
            <AppShell navVariant="super-admin">
              <SystemConfigPage />
            </AppShell>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Global toast notifications */}
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  )
}
