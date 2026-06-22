# HIS Platform — Google Stitch UI Build Phases

**Healthcare Information System (HIS) | University of Buea**

This document instructs Google Stitch on how to build every page of the HIS platform UI across 15 sequential phases. Each phase covers a focused module. Pages within a phase must be built together so that links, modals, and navigation flows connect correctly.

---

## GLOBAL DESIGN INSTRUCTION (Apply to Every Phase, Every Page)

Before building any page, load and strictly follow the **HIS Design System** specification. The key rules to enforce on every screen:

- **Font:** Inter, sans-serif
- **Background canvas:** `#F8F9FA` (soft cool gray)
- **Card surfaces:** `#FFFFFF` (white)
- **Primary action color:** `#0D9488` (Clinical Teal) — all primary buttons, active nav, links, focus rings
- **Destructive actions:** `#EF4444` (Red) — delete buttons, critical alerts, revoke actions
- **Warnings / abnormal:** `#F59E0B` (Amber) — warning badges, pending states
- **Normal / success:** `#10B981` (Green) — normal results, completed actions
- **Body text:** `#0F172A` (Charcoal)
- **Labels / captions:** `#64748B` (Slate gray)
- **Borders / dividers:** `#E2E8F0`
- **Border radius:** `0.5rem` on all cards, inputs, buttons
- **Color + Icon rule:** Every clinical state badge must pair an icon with color (never color alone). Use Lucide React icons.
- **Responsive range:** All pages must render correctly from 768px (tablet) to 1920px (desktop).
- **Layout shell:** All authenticated pages (Phases 2–15) use the fixed Sidebar (240 px) + Topbar (64 px) shell defined in the design system. The page content area sits to the right of the sidebar and below the topbar.

> ### ⚠ STITCH SHELL REMINDER — READ THIS BEFORE DESIGNING ANY AUTHENTICATED PAGE
>
> **Google Stitch frequently generates page designs WITHOUT the platform Sidebar and Topbar.** This is always wrong for authenticated pages. Every page in Phases 2–15 MUST include:
> - **Sidebar (240 px wide, left edge):** HIS Portal logo at top, vertical nav links with the correct active item highlighted in teal, bottom-anchored System Settings link.
> - **Topbar (64 px tall, top edge):** HIS Portal wordmark on the left, search bar in center, notification bell + user avatar on the right.
> - **Page content area:** fills the remaining space — width = `100vw − 240 px`, height = `100vh − 64 px`, with `p-6` inner padding.
>
> The ONLY exception is Phase 1 (Login, Forgot Password, Reset Password, Register Hospital) — those pages have no shell.
>
> **If a Stitch design for Phase 2–15 shows a page without the sidebar and topbar, that design is incomplete. Always add them.**

---

## PHASE 1 — Authentication & Public Pages

**Module:** Auth
**SRS Coverage:** UI-001, UI-008, REQ-F-001, REQ-F-002, REQ-F-005, COM-003

These are the only pages rendered outside the authenticated shell. No sidebar. No topbar. Centered card layout on the `#F8F9FA` canvas.

---

### Page 1.1 — Login Page

**Route:** `/login`
**SRS:** UI-001, UI-008, COM-003

**Layout:**
- Full-page centered layout. Canvas background `#F8F9FA`.
- A single white card (`#FFFFFF`, `rounded-lg`, `shadow-md`, width `400px`, padding `40px`) centered vertically and horizontally.
- Above the card: HIS logo (teal icon + "HIS" wordmark) and subtitle "Healthcare Information System".

**Card contents (top to bottom):**
1. Page heading: `text-2xl font-semibold text-foreground` — "Welcome back"
2. Subtext: `text-sm text-muted-foreground` — "Sign in to your account"
3. Form field: **Email Address** — label `text-sm font-medium`, input with placeholder "your@email.com", border `#E2E8F0`, focus ring teal
4. Form field: **Password** — label `text-sm font-medium`, password input with show/hide toggle icon (`Eye` / `EyeOff` Lucide icon) on the right side of the input
5. Row below password field: left-aligned nothing, right-aligned "Forgot Password?" link in `text-sm font-medium text-primary underline-offset-4 hover:underline`
6. **Sign In** button — full width, teal background (`bg-primary`), white text, `text-sm font-medium`
7. Session duration notice (UI-001): `text-xs text-muted-foreground` centered below the button with a `Clock` Lucide icon (size 12) inline — text reads: "Sessions expire after 60 minutes of inactivity."

**Error state (inline validation, UI-003):**
- If email is blank on submit: red border on email input + `AlertCircle` icon (size 12) + `text-xs text-[#DC2626]` message "Email address is required." below the field.
- If password is blank: same pattern below the password field.
- If credentials are wrong: an amber banner above the form inside the card — `bg-[#F59E0B]/15 border border-[#F59E0B] rounded-md p-3 text-sm text-[#78350F]` with `AlertTriangle` icon — "Invalid email or password. Please try again."

**States to show:** default empty state, filled state, error state (wrong credentials), loading state (button shows spinner while submitting).

---

### Page 1.2 — Forgot Password Page

**Route:** `/forgot-password`
**SRS:** UI-001

**Layout:** Same centered card layout as Login (`400px` card).

**Card contents:**
1. Back link at top: `← Back to Login` — `text-sm text-primary` with `ArrowLeft` Lucide icon
2. Heading: "Reset your password" — `text-2xl font-semibold text-foreground`
3. Subtext: `text-sm text-muted-foreground` — "Enter your email and we will send you a reset link."
4. Form field: **Email Address** — same styling as login
5. **Send Reset Link** button — full width, teal, `text-sm font-medium`

**Success state (after submission):**
- Replace form with a green confirmation box: `bg-[#10B981]/10 border border-[#10B981] rounded-md p-4` containing `CheckCircle` icon (teal, size 20) + heading "Check your inbox" + subtext "A password reset link has been sent to **{email}**. The link expires in 30 minutes."
- Below the box: "Didn't receive it? Resend" link in `text-sm text-primary`.

---

### Page 1.3 — Reset Password Page

**Route:** `/reset-password`
**SRS:** UI-001, REQ-F-005

**Layout:** Same centered card layout (`400px` card).

**Card contents:**
1. Heading: "Set a new password" — `text-2xl font-semibold text-foreground`
2. Subtext: `text-sm text-muted-foreground` — "Your new password must be at least 10 characters and include an uppercase letter, a number, and a special character."
3. Form field: **New Password** — password input with show/hide toggle
4. Form field: **Confirm New Password** — password input with show/hide toggle
5. Password strength indicator: a horizontal progress bar below the New Password field. 3 segments — Weak (red), Fair (amber), Strong (green). Updates live as the user types.
6. **Set New Password** button — full width, teal

**Validation states:** If passwords do not match, show `AlertCircle` + `text-xs text-[#DC2626]` "Passwords do not match." below the confirm field. If password fails policy, show specific rule checklist (uppercase ✓/✗, number ✓/✗, special character ✓/✗, minimum 10 chars ✓/✗) using `CheckCircle` (green) and `XCircle` (red) icons.

---

### Page 1.4 — First Login: Force Password Change

**Route:** `/change-password` (shown automatically after first login with temp password)
**SRS:** REQ-F-005

**Layout:** Same centered card layout (`440px` card).

**Card contents:**
1. An amber info banner at the top of the card: `bg-[#F59E0B]/15 border border-[#F59E0B] rounded-md p-3 text-sm` with `Info` icon — "You are using a temporary password. Please set a permanent password to continue."
2. Form field: **Temporary Password** — password input
3. Form field: **New Password** — password input with show/hide toggle
4. Form field: **Confirm New Password** — password input with show/hide toggle
5. Password policy checklist (same as Page 1.3)
6. **Set Password & Continue** button — full width, teal

---

### Page 1.5 — Hospital Self-Registration

**Route:** `/register-hospital`
**SRS:** REQ-F-001, REQ-F-002

**Layout:** Centered card on `#F8F9FA`, wider card (`560px`), enough vertical space to scroll.

**Card contents:**
1. HIS logo + "Register Your Facility" heading `text-2xl font-semibold`
2. Subtext: `text-sm text-muted-foreground` — "Complete this form to request access to the HIS platform. Your registration will be reviewed by the Super Admin before activation."
3. Section heading "Facility Details" — `text-base font-semibold text-foreground` with `--border` divider below
4. Form fields:
   - **Facility Name** (required) — text input
   - **Physical Address** (required) — textarea, 3 rows
   - **Region / District** (required) — dropdown select
   - **Facility Type** (required) — radio group: Public / Private / Mission (displayed as 3 pill-style radio buttons)
5. Section heading "Administrator Account" — same heading style + divider
6. Form fields:
   - **Administrator Full Name** (required) — text input
   - **Administrator Email Address** (required) — email input
   - **Confirm Email Address** (required) — email input
7. Terms notice: `text-xs text-muted-foreground` — "By registering, you agree that all data will be processed in accordance with Cameroon Data Protection Law No. 2010/012."
8. **Submit Registration** button — full width, teal

**Inline validation (UI-003):** Each required field shows `AlertCircle` + red error message below on blur if empty.

---

### Page 1.6 — Email Verification Confirmation

**Route:** `/verify-email`
**SRS:** REQ-F-002

**Layout:** Centered card (`400px`). Two states to design:

**Pending state (before link is clicked):**
- `Clock` icon (teal, size 40) centered at top of card
- Heading: "Check your email"
- Body: `text-sm text-muted-foreground` — "We sent a verification link to **{email}**. Click the link to confirm your email address and complete registration."
- "Resend verification email" link below

**Verified state (after link is clicked — what the user lands on):**
- `CheckCircle` icon (green `#10B981`, size 40)
- Heading: "Email Verified"
- Body: "Your email has been verified. Your registration is now pending Super Admin approval. You will receive an email when your account is activated."
- No button — this is a terminal state.

---

## PHASE 2 — Application Shell & Navigation

**Module:** Shell
**SRS Coverage:** UI-002, UI-005, UI-008, UI-011, REQ-F-009, REQ-F-064, REQ-F-065

This phase defines the authenticated application shell that wraps every page in Phases 3–15. Build this shell once and reuse it as the container for all subsequent pages.

**⚠ Stitch shell reminder:** This phase IS the shell itself. When Stitch designs any page from Phase 3 onwards, the Sidebar (240 px) and Topbar (64 px) built here must always be present. Stitch often omits them — never skip them.

---

### Page 2.1 — Application Shell (Authenticated Layout)

**This is a layout template, not a standalone page.**

**Topbar (height 64px, `bg-card`, `border-b border-border`):**
- Left: HIS logo (teal icon + "HIS" wordmark in `text-lg font-semibold text-foreground`)
- Center: empty (or breadcrumb on inner pages)
- Right (left to right): Role badge pill → Notification bell → Avatar dropdown

**Role badge pill:**
- Rounded pill, `bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1`
- Shows current user's role: e.g., "Hospital Admin", "Doctor", "Lab Technician"

**Notification bell (REQ-F-064 / REQ-F-065):**
- `Bell` Lucide icon, size 20, `text-foreground`
- When unread count > 0: red circle badge (`bg-destructive text-white text-[10px] font-bold`) top-right of icon
- Show two states: (a) no unread — bell only, (b) 3 unread — badge showing "3"

**Avatar dropdown trigger:**
- Circle avatar (initials fallback if no photo), size 32px, `bg-primary text-primary-foreground text-xs font-semibold`
- Dropdown on click: "My Profile", "Change Password", divider, "Sign Out" (red text + `LogOut` icon)

**Sidebar (width 240px on `lg`+, 64px icon-only on `md`, `bg-card`, `border-r border-border`):**

Show two variants:
- **Full sidebar (lg+):** Logo area at top (48px height), then navigation list, then user info at bottom
- **Collapsed sidebar (md):** Icon-only, no text labels, same icon set

**Navigation items** — show all possible items (visibility is role-filtered at runtime):
- Dashboard — `LayoutDashboard` icon
- Patients — `Users` icon
- Appointments — `Calendar` icon
- Encounters — `Stethoscope` icon
- Laboratory — `FlaskConical` icon
- Bulk Upload — `Upload` icon
- Transfers — `ArrowLeftRight` icon
- Analytics — `BarChart2` icon
- Staff Management — `UserCog` icon
- Audit Log — `Shield` icon
- Settings — `Settings` icon

Each nav item: Default state `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent`. Active state: `bg-primary text-primary-foreground`.

**Main content area:**
- `flex-1 bg-background overflow-y-auto p-6`
- Contains the page-specific content

**Session Timeout Warning Banner (UI-008):**
- Shown at the very top of the main content area when JWT is 2 minutes from expiry
- `bg-[#F59E0B]/15 border border-[#F59E0B] rounded-md px-4 py-3 flex items-center justify-between mb-6`
- Left: `Clock` icon (amber) + `text-sm font-medium text-[#78350F]` — "Your session expires in 2 minutes."
- Right: "Stay Logged In" button — `variant="outline"` small teal-bordered button

**Notification Slide-Over Panel:**
- Triggered by clicking the bell icon
- Slides in from the right (width 360px), overlay `bg-black/50`
- Header row: "Notifications" `text-lg font-semibold` (left) + "Mark all as read" link `text-sm text-primary` (right, only shown when unread count > 0) + close `X` button (far right)
- "View All Notifications" teal ghost link at the bottom of the panel — navigates to Page 14.1
- List of notification items:
  - Unread: `bg-primary/5` background + teal left border stripe (3px); clicking the item marks it as read and updates its style to the read state
  - Read: white background
  - Each item: icon (varies by type) + title `text-sm font-medium` + body `text-xs text-muted-foreground` + timestamp `text-xs text-muted-foreground` right-aligned

---

## PHASE 3 — Super Admin Module

**Module:** Super Admin
**SRS Coverage:** REQ-F-003, REQ-F-004, REQ-F-006

The Super Admin sees a minimal shell — their role badge shows "Super Admin". Their sidebar shows only: Dashboard, Hospital Registrations, All Hospitals, System Settings.

**⚠ Stitch shell reminder:** Every page in this phase must include the Super Admin Sidebar (240 px) + Topbar (64 px). Stitch often generates these pages without the sidebar and top navigation bar — always add them.

---

### Page 3.1 — Super Admin Dashboard

**Route:** `/super-admin/dashboard`

**Layout:** Page title "Super Admin Dashboard" `text-2xl font-semibold`. Then a 3-column stat card row:
- Card 1: "Pending Registrations" — count in `text-4xl font-bold text-foreground` + `Clock` icon amber — links to pending list
- Card 2: "Active Hospitals" — count in `text-4xl font-bold text-foreground` + `CheckCircle` icon green
- Card 3: "Total Staff Accounts" — count in `text-4xl font-bold text-foreground` + `Users` icon teal

Below: a table card "Recent Registration Requests" — columns: Hospital Name | Region | Type | Submitted On | Status | Action. Status badges: Pending (amber + Clock), Approved (green + CheckCircle), Rejected (red + XCircle). Action: "Review" teal outline button.

---

### Page 3.2 — Pending Hospital Registrations List

**Route:** `/super-admin/registrations`

**Layout:** Page title "Hospital Registrations". Filter tabs row: "All" | "Pending" | "Approved" | "Rejected" — tab pills, active tab has teal underline and `text-primary`.

Below: a data table (white card, `shadow-sm`):
- Table header: `text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted`
- Columns: Hospital Name | Region/District | Facility Type | Administrator Email | Submitted Date | Status | Actions
- Status column uses semantic badges (same as above)
- Actions column: "Review" button (teal outline, small)
- Empty state (no registrations): centered `Building2` Lucide icon (gray, size 48) + "No registrations found" `text-sm text-muted-foreground`

---

### Page 3.3 — Hospital Registration Review / Approval

**Route:** `/super-admin/registrations/{id}`

**Layout:** Back link "← Hospital Registrations" at top. Then two-column layout:

**Left column (details panel, white card):**
- Section: "Facility Information" with all submitted fields in label-value pairs (`text-xs text-muted-foreground` label, `text-sm text-foreground` value)
- Section: "Administrator Account" — name, email
- Section: "Submission Details" — submitted date, current status badge

**Right column (action panel, white card):**
- Card title: "Review Decision"
- Current status badge (large, centered)
- If status is Pending:
  - **Approve Registration** button (full width, `variant="default"` teal, `CheckCircle` icon left)
  - **Reject Registration** button (full width, `variant="destructive"` red, `XCircle` icon left) — triggers two-step confirmation dialog (UI-010)
- Rejection reason field appears only when rejecting: textarea labelled "Rejection Reason (required)" with placeholder "Explain why this registration is being rejected..."
- If already approved/rejected: show decision details (who acted, when, reason if rejected)

**Confirmation dialog for Reject (UI-010):**
- Dialog title: "Reject Hospital Registration"
- Body: "This will deny access to the HIS platform for **{hospital name}**. The administrator will be notified by email."
- Cancel (outline, left) + Reject (destructive red, right)

---

### Page 3.4 — All Hospitals List

**Route:** `/super-admin/hospitals`

**Layout:** Page title "All Hospitals". Search input at top right — `Search hospitals...` placeholder. Data table:
- Columns: Hospital Name | Region | Type | Status | Registered Date | Actions
- Status: Active (green), Suspended (red), Pending (amber)
- Actions: "View" icon button

---

## PHASE 4 — Staff Management & RBAC

**Module:** Staff Management
**SRS Coverage:** REQ-F-008, REQ-F-009, REQ-F-010, REQ-F-011, REQ-F-012, REQ-F-013, REQ-F-014

Visible to Hospital Admin only. Sidebar shows: Staff Management, Role Management.

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 4.1 — Staff List

**Route:** `/staff`

**Layout:** Page title "Staff Management". Top row: search input (left) + "Add Staff Member" button (right, teal, `UserPlus` icon).

Filter row below: "All Roles" dropdown | "All Regions" dropdown | "Status: All / Active / Deactivated" toggle.

Data table (white card):
- Columns: Name | Email | Role | Region | Status | Created | Actions
- Role: shown as a pill badge `bg-secondary text-secondary-foreground text-xs`
- Status: Active (green + CheckCircle) / Deactivated (red + XCircle)
- Actions column: Edit icon button (pencil) + Deactivate icon button (UserX, red, shown only if active)
- Deactivated rows: entire row text in `text-muted-foreground opacity-60`

Empty state: `Users` icon (gray, 48px) centered + "No staff members yet. Add your first staff member to get started."

---

### Page 4.2 — Create / Edit Staff Account Form

**Route:** `/staff/new` and `/staff/{id}/edit`

**Layout:** Page title "Add Staff Member" (or "Edit Staff Member"). White card form, max-width `640px`.

Form sections:

**Section "Personal Information"** (divider heading):
- Full Name (required)
- Email Address (required)
- Job Title (required)
- Region / District (required) — dropdown

**Section "Access & Role"** (divider heading):
- Assigned Role (required) — dropdown listing all available roles for this hospital: Hospital Admin, Doctor, Nurse, Laboratory Technician, Receptionist, Data Clerk, + any custom roles. Note: "Pharmacist" does NOT appear.
- Role permissions preview: below the dropdown, show a read-only list of permissions granted by the selected role as small pill badges (`text-xs bg-secondary text-secondary-foreground`). Updates dynamically when role changes.
- **Ward Head Nurse for Unit** (conditional — only shown when Assigned Role = "Nurse") — dropdown of clinical units with placeholder "Select unit (optional)". `Info` tooltip (UI-011): "Designates this nurse as the Ward Head Nurse for the selected unit. They will receive critical lab result alerts for patients in that unit (REQ-F-041)." If no unit is selected, the nurse is a general nurse with no ward-head routing.

**Form footer:** Cancel (outline) button left + "Create Staff Account" (teal) button right.

**Inline validation (UI-003):** Red borders + `AlertCircle` + message below each empty required field on submit attempt.

**Tooltip examples (UI-011):** "Job Title" field has an `Info` icon tooltip: "Enter the staff member's official job title as it appears on their contract."

---

### Page 4.3 — Role Management (Custom Roles)

**Route:** `/staff/roles`

**Layout:** Page title "Role Management". Two-column layout:

**Left panel — Roles List** (white card):
- Tab row at top of panel: "Roles" | "Change History" — teal active underline
- **Roles tab:** List of all roles with name + permission count badge. Default roles marked with a "Default" gray pill (cannot be deleted). Custom roles have an Edit (pencil) and Delete (trash) icon action. "+ Create Custom Role" button at the bottom (teal outline, full width).
- **Change History tab (REQ-F-014):** Table of all role assignment changes — columns: Timestamp (WAT) | Administrator | Staff Member | Previous Role | New Role. Read-only, no actions. Sorted newest first. Satisfies REQ-F-014.

**Right panel — Role Detail / Builder** (white card):
- Shows selected role details
- Role name input (editable for custom roles, read-only for defaults)
- **Permissions grid:** 3-column grid of all atomic permissions as toggle checkboxes:
  - `patient:read`, `patient:write`, `patient:amend`
  - `diagnosis:write`, `lab_result:read`, `lab_result:write`
  - `prescription:write`, `appointment:write`, `analytics:view`
  - `staff:manage`, `role:assign`, `transfer:request`, `transfer:approve`
- Each permission checkbox: label `text-sm font-medium text-foreground` + small `text-xs text-muted-foreground` description below
- For default roles: all checkboxes are disabled (read-only)
- Footer: "Save Role" teal button (only active for custom roles)

---

### Page 4.4 — Deactivate Staff Confirmation Dialog

**Not a standalone page — a modal triggered from Staff List.**
**SRS:** REQ-F-013, UI-010

- Dialog title: "Deactivate Staff Account"
- Body: "This will immediately revoke all access for **{staff name}** and invalidate their active sessions. Their historical records and audit logs will be preserved."
- Warning note in amber: `bg-[#F59E0B]/15 border border-[#F59E0B] rounded p-2 text-xs text-[#78350F]` — "This action revokes all Cognito sessions immediately."
- Cancel (outline, left) + "Deactivate Account" (destructive red, `UserX` icon, right)

---

### Page 4.5 — Facility Settings

**Route:** `/settings/facility`

**Layout:** Page title "Facility Settings". White card form:
- Facility Name (editable)
- Physical Address (editable textarea)
- Region / District (editable dropdown)
- Contact Phone Number
- Contact Email Address

Footer: "Save Changes" teal button (right-aligned).

Toast on success: "Facility profile updated successfully."

---

## PHASE 5 — Patient Registration & Search

**Module:** Patients
**SRS Coverage:** REQ-F-015, REQ-F-016, REQ-F-019, REQ-F-020, REQ-F-021, REQ-F-022, REQ-F-024

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 5.1 — Patient Search Page

**Route:** `/patients`

**Layout:** Page title "Patients". Top row: large search input (left, with `Search` Lucide icon inside, placeholder "Search by name, phone number, or Patient ID...") + "Register New Patient" button (right, teal, `UserPlus` icon).

Below search: search results area.

**Empty / initial state:**
- Centered `Search` icon (gray, 48px) + "Search for a patient above to view their record." `text-sm text-muted-foreground`

**Searching state (after keystroke with debounce):**
- Show 3 skeleton loading rows (gray animated pulse) while results load

**Results state:**
- Table showing: Patient ID | Name | DOB | Phone | Region | Registered | Consent Status | Actions
- Consent Status column: badge using consent color mapping (Granted=green+CheckCircle, Pending=amber+Clock, Refused=red+XCircle)
- Actions: "View Profile" teal outline button

**No results state:**
- `UserX` icon (gray) + "No patients found matching your search." + "Register as new patient?" teal link

---

### Page 5.2 — Register New Patient Form

**Route:** `/patients/new`

**Layout:** Page title "Register New Patient". White card form, max-width `720px`.

**Section "Personal Information":**
- Full Name (required) — text input
- Date of Birth (required) — date picker
- Biological Sex (required) — radio: Male / Female / Other
- Telephone Number (required) — tel input
- Residential Address (required) — textarea, 2 rows
- Region / District (required) — dropdown

**Section "Emergency Contact":**
- Contact Name (required) — text input
- Contact Phone (required) — tel input
- Relationship (required) — dropdown: Parent / Spouse / Sibling / Child / Friend / Guardian / Other

**Section "Consent (Required before saving)":**
- Prominent amber info banner: `bg-[#F59E0B]/15 border-l-4 border-[#F59E0B] p-4 rounded` — `AlertTriangle` icon + "Patient consent must be recorded before this registration can be saved. (Cameroon Data Protection Law No. 2010/012)"
- Consent for personal data storage (required) — radio: Granted / Refused / Pending
- Consent for anonymised public health reporting — radio: Granted / Refused / Pending

**Section "Optional Attributes":**
- National ID Number — text input
- Blood Group — dropdown: A+, A−, B+, B−, AB+, AB−, O+, O−, Unknown
- Known Allergies — multi-value tag input (type and press Enter to add tags) + `Info` tooltip (UI-011): "Type an allergy and press Enter to add it as a tag. You can add multiple allergies."
- Chronic Conditions — multi-value tag input + `Info` tooltip (UI-011): "Type a condition and press Enter to add it as a tag. You can add multiple chronic conditions."

**Form footer:** Cancel (outline, left) + "Register Patient" (teal, right)

---

### Page 5.3 — Duplicate Detection Dialog

**Not a page — a modal that appears automatically when a potential duplicate is detected during registration.**
**SRS:** REQ-F-020

**Design:**
- Modal title: "Possible Duplicate Patient Detected" with `AlertTriangle` icon (amber)
- Subtext: "We found existing records with similar names and dates of birth. Please review before creating a new record."
- List of matched records (up to 3 shown): each as a card showing Name | DOB | Patient ID | Region | `text-xs text-muted-foreground` similarity note "87% match"
- Each record has a "Open Existing Record" teal outline button
- Divider with "OR" text
- "This is a different patient — Create New Record" teal button (full width)
- "Cancel" link below (gray)

---

## PHASE 6 — Patient Profile & Consent Management

**Module:** Patient Profile
**SRS Coverage:** REQ-F-015, REQ-F-016, REQ-F-017, REQ-F-023, REQ-F-024, REQ-F-025, REQ-F-026, REQ-F-027

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 6.1 — Patient Profile Page

**Route:** `/patients/{id}`

**Layout:** Two-column layout inside the shell.

**Left column (280px, sticky):**
White card with patient summary:
- Patient avatar circle (initials, teal background)
- Name `text-xl font-semibold`
- Patient ID: `text-xs text-muted-foreground` "PID-000123"
- DOB + Age: `text-sm text-foreground`
- Phone: `text-sm text-foreground`
- Region: `text-sm text-foreground`
- **Consent Status indicator (UI-009):** large badge, full width of card, at the top of the summary — Granted (green, `CheckCircle`), Pending (amber, `Clock`), Refused (red, `XCircle`). Must be highly visible.
- If consent is **Refused**: below the badge, a red warning banner: "Clinical data entry is blocked for this patient due to refused consent." — no Create Encounter / Lab Result / Prescription buttons are shown anywhere.
- "Update Consent" link — `text-sm text-primary` with `Pencil` icon

Below patient summary card:
- "Optional Attributes" card showing blood group, allergies (as tags), chronic conditions (as tags), NID.

**Right column (flex-1):**
Tab bar at top: "Timeline" | "Encounters" | "Lab Results" | "Prescriptions" | "Appointments" | "Amendments"

Active tab underline in teal.

**Timeline tab (default):**
- Reverse-chronological list of all events (encounters, labs, prescriptions, appointments)
- Each event: colored left border (teal=encounter, green=lab normal, amber=lab abnormal, red=lab critical, blue=appointment, purple=prescription)
- Event card: date + type + brief summary + "View" link
- Empty state: "No clinical records yet."

**Encounters tab:**
- Table: Date | Presenting Complaint | Clinician | Unit | Diagnoses count | Actions
- "New Encounter" button (teal, top right) — only shown if consent is Granted or Pending

**Lab Results tab:**
- Table: Date | Test Name | Result | Unit | Status | Requested By | Actions
- Status badge: Normal (green), Abnormal (amber), Critical (red)

**Prescriptions tab:**
- Table: Date | Medication | Dosage | Frequency | Route | Duration | Prescriber

**Appointments tab:**
- Table: Date/Time | Type | Clinician | Unit | Status
- Status: Scheduled (teal), Completed (green), Cancelled (red with strikethrough)

**Amendments tab:**
- Table: Date | Original Record Type | Amended By | Reason (truncated) | "View" link

---

### Page 6.2 — Update Patient Consent Page

**Route:** `/patients/{id}/consent`

**Layout:** Page title "Update Consent — {Patient Name}". White card, max-width `560px`.

- Current consent status at top: large badge
- Info note: `text-sm text-muted-foreground` — "Consent changes are recorded with your name and the date of change per Cameroon Data Protection Law No. 2010/012."
- Consent for personal data storage: radio (Granted / Refused / Pending) — current value pre-selected
- Consent for anonymised public health reporting: radio — current value pre-selected
- Note below: "If consent is set to Refused, the patient's record will remain readable but no new clinical data can be added."
- Footer: Cancel (outline) + "Save Consent Update" (teal)

---

### Page 6.3 — Clinical Record Amendment Form

**Route:** `/patients/{id}/amend/{record_type}/{record_id}`
**SRS:** REQ-F-025, REQ-F-026, REQ-F-027

**Layout:** Page title "Amend Clinical Record". Two-section white card:

**Section "Original Record (Read-Only)":**
- Amber banner at top: "You are viewing the original record. Edits below will create an amendment — the original will be preserved."
- All original fields shown as read-only with `bg-muted` background and `text-muted-foreground opacity-70` text to indicate they are locked.
- "Original" label badge in `text-xs font-medium text-muted-foreground bg-muted rounded px-2 py-0.5` on the section.

**Section "Amendment Values":**
- Same fields as the original record, now editable (white background)
- **Amendment Reason** (required, min 10 characters) — textarea with character counter below showing "X / 10 minimum"

**Permission guard (REQ-F-028):** The "Amend" link that navigates to this page must only be rendered if the currently logged-in user is the original author of the record OR holds the Hospital Admin role. Do not show the amend action to any other user, regardless of whether they hold `patient:amend` permission.

**Footer:** Cancel (outline) + "Submit Amendment" (teal)

**Toast on success:** `toast.success('Amendment Submitted', { description: 'The original record has been preserved and the amendment has been recorded.' })`

---

## PHASE 7 — Appointment Scheduling

**Module:** Appointments
**SRS Coverage:** REQ-F-029, REQ-F-030, REQ-F-031, REQ-F-032, REQ-F-033

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 7.1 — Appointment Calendar — Daily View

**Route:** `/appointments`

**Layout:** Page title "Appointments". Top row: Date navigator (← [Date] →) + "Daily" / "Weekly" view toggle tabs + "New Appointment" button (teal, `CalendarPlus` icon).

Filter row: "All Clinicians" dropdown | "All Units" dropdown | "All Types" dropdown

**Daily calendar:**
- Left column: time slots from 07:00 to 20:00 in 30-minute increments, `text-xs text-muted-foreground`
- Main area: appointment blocks as colored cards in the time grid
  - Each appointment block: Patient Name `text-sm font-medium` + Clinician `text-xs text-muted-foreground` + Type badge
  - Colors: Consultation (teal `#0D9488`), Follow-up (indigo `#6366F1`), Laboratory (blue `#3B82F6`), Procedure (purple `#8B5CF6`). **Do not use amber for appointment types** — amber is reserved for clinical warning states only per the Design System.
  - Cancelled appointments: shown with a red strikethrough overlay and `opacity-50`
- Empty slots: subtle `bg-muted` grid lines only

---

### Page 7.2 — Appointment Calendar — Weekly View

**Route:** `/appointments?view=week`

**Layout:** Same top controls. Calendar shows Mon–Sun columns, time slots on left (fewer increments for space). Appointment blocks span the correct column and time range. Smaller text size on blocks (`text-xs`). Use same color coding as daily view: Consultation (teal `#0D9488`), Follow-up (indigo `#6366F1`), Laboratory (blue `#3B82F6`), Procedure (purple `#8B5CF6`). Amber is NOT used for any appointment type.

---

### Page 7.3 — Create Appointment Form

**Route:** `/appointments/new` (or modal triggered from calendar)

**Layout:** Modal dialog (or full page at `560px`).

- **Patient** (required) — searchable patient lookup input: type to search, shows dropdown of results with Patient ID + name + DOB
- **Appointment Date** (required) — date picker
- **Appointment Time** (required) — time picker, 30-minute increments
- **Appointment Type** (required) — dropdown: Consultation / Follow-up / Laboratory / Procedure
- **Assigned Clinician** (required) — searchable staff dropdown (shows Doctors and Nurses only)
- **Clinical Unit** (required) — text or dropdown

**Double-booking conflict warning:**
If a conflict is detected on selecting the clinician + date + time: an amber banner below the time field: `AlertTriangle` icon + "Dr. {Name} already has an appointment at this time: **{conflicting appointment summary}**. Please select a different time."

**Footer:** Cancel (outline) + "Create Appointment" (teal)

---

### Page 7.4 — Cancel Appointment Confirmation

**Not standalone — a modal triggered from the calendar or appointment list.**
**SRS:** REQ-F-032

- Dialog title: "Cancel Appointment"
- Summary of the appointment being cancelled (patient, date/time, type, clinician) in a muted box
- **Cancellation Reason** (required) — textarea, placeholder "Enter reason for cancellation..."
- Inline validation: if empty on submit, `AlertCircle` + "A cancellation reason is required."
- Footer: "Keep Appointment" (outline, left) + "Cancel Appointment" (destructive red, `CalendarX` icon, right)

---

## PHASE 8 — Clinical Encounter Management

**Module:** Clinical Encounter
**SRS Coverage:** REQ-F-034, REQ-F-035, REQ-F-036, REQ-F-037, REQ-F-038

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 8.1 — Create Clinical Encounter Form

**Route:** `/patients/{id}/encounters/new`
**SRS:** REQ-F-034

**Layout:** Page title "New Clinical Encounter — {Patient Name}". White card, max-width `720px`.

Consent guard: If patient consent is Refused, show a full-width red banner at the top of the form and disable the submit button: `AlertOctagon` icon + "This patient has refused consent. Clinical encounters cannot be created."

Form sections:

**Section "Encounter Details":**
- Encounter Date (required) — date picker, defaults to today
- Encounter Time (required) — time picker, defaults to now
- Clinical Unit (required) — dropdown
- Presenting Complaint (required) — textarea, 3 rows
- Attending Clinician — pre-populated with logged-in clinician's name (read-only field, teal `text-primary`, `Lock` icon to indicate auto-populated)
- Link to Appointment — optional dropdown: "Select appointment for today (optional)" showing today's appointments for this patient if any exist

**Footer:** Cancel (outline) + "Create Encounter" (teal)

---

### Page 8.2 — Encounter Detail Page

**Route:** `/patients/{id}/encounters/{encounter_id}`
**SRS:** REQ-F-034–REQ-F-038

**Layout:** Page title "Encounter — {Date}" with clinician name and unit as subtitle `text-sm text-muted-foreground`.

Tabs: "Overview" | "Diagnoses" | "Vital Signs" | "Prescriptions" | "Lab Requests"

**Overview tab:**
- Encounter summary card: Date, Time, Clinician (with `Stethoscope` icon), Clinical Unit, Presenting Complaint
- "Amend Encounter" link — only render this link if the currently logged-in user is the original author of the encounter (encounter.staff_id = current user) OR holds the Hospital Admin role. Do not show to any other user even if they hold `patient:amend` permission (REQ-F-028).

**Diagnoses tab:**
- Table: Condition | ICD-10 | Severity | Status | Recorded By | Date
- Severity badge: Mild (green), Moderate (amber), Severe (red)
- Status badge: Active (teal), Resolved (green), Suspected (amber)
- "+ Add Diagnosis" button (teal outline, top right)

**Vital Signs tab:**
- Grid of vital sign metric cards using the Clinical Data Display Rule from the design system:
  - Temperature: value `text-4xl font-bold` + unit "°C" `text-sm text-muted-foreground`
  - Blood Pressure: "120/80" + "mmHg"
  - Pulse Rate: value + "bpm"
  - Respiratory Rate: value + "breaths/min"
  - Oxygen Saturation: value + "%" — color: green if ≥95%, amber if 90–94%, red if <90%
  - Weight: value + "kg"
- "Record Vital Signs" button (teal outline, top right) — opens form if no vitals recorded yet

**Prescriptions tab:**
- Table: Medication | Dosage | Frequency | Route | Duration | Prescriber | Date
- "+ Add Prescription" button (teal outline)

**Lab Requests tab:**
- Table: Test Name | Requested | Status (Pending/Completed) | Result (if completed)
- "+ Request Lab Test" button (teal outline)

---

### Page 8.3 — Add Diagnosis Form

**Triggered as a modal or slide-over from the Diagnoses tab.**

- Condition Name (required) — text input with autocomplete suggestions
- ICD-10 Code (optional) — text input with `Info` tooltip (UI-011): "The International Classification of Diseases 10th revision code. Leave blank if unknown."
- Severity (required) — segmented control: Mild / Moderate / Severe
- Status (required) — segmented control: Active / Resolved / Suspected

Footer: Cancel + "Add Diagnosis" (teal)

**Toast on success:** `toast.success('Diagnosis Added', { description: 'The diagnosis has been recorded on this encounter.' })`

---

### Page 8.4 — Record Vital Signs Form

**Triggered as a modal from Vital Signs tab.**

- Temperature (°C) — number input
- Blood Pressure Systolic (mmHg) — number input
- Blood Pressure Diastolic (mmHg) — number input
- Pulse Rate (bpm) — number input
- Respiratory Rate (breaths/min) — number input
- Oxygen Saturation (%) — number input
- Weight (kg) — number input

Each field has `text-xs text-muted-foreground` unit label to the right of the input.
Footer: Cancel + "Save Vital Signs" (teal)

**Toast on success:** `toast.success('Vital Signs Recorded', { description: 'Vital signs have been saved to this encounter.' })`

---

### Page 8.5 — Write Prescription Form

**Triggered as a modal from Prescriptions tab.**

- Medication Name (required) — text input with autocomplete
- Dosage (required) — text input, e.g. "500mg"
- Frequency (required) — dropdown: Once daily / Twice daily / Three times daily / Four times daily / As needed / Other
- Route of Administration (required) — dropdown: Oral / IV / IM / Topical / Inhaled / Other
- Duration (required) — text input, e.g. "7 days"
- Prescribing Clinician — pre-populated, read-only (auto-populated from session, `Lock` icon)

Footer: Cancel + "Add Prescription" (teal)

**Toast on success:** `toast.success('Prescription Added', { description: 'The prescription has been recorded on this encounter.' })`

---

### Page 8.6 — Request Lab Test Form

**Triggered as a modal from Lab Requests tab.**

- Test Name (required) — dropdown from predefined test list (e.g., Full Blood Count, Malaria RDT, Liver Function Test, HBA1C, Creatinine, etc.)
- Clinical Urgency — radio: Routine / Urgent
- Notes to Lab (optional) — textarea, 2 rows

Footer: Cancel + "Submit Lab Request" (teal)

**Toast on success:** `toast.success('Lab Test Requested', { description: 'The request has been sent to the lab work queue.' })`

---

## PHASE 9 — Laboratory Results Management

**Module:** Laboratory
**SRS Coverage:** REQ-F-039, REQ-F-040, REQ-F-041, REQ-F-042, REQ-F-043

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 9.1 — Lab Work Queue

**Route:** `/laboratory/queue`
**SRS:** REQ-F-043

**Layout:** Page title "Lab Work Queue". Filter row: "All Tests" / "Pending" / "Completed" toggle + search input.

Table (white card):
- Columns: Request Time | Patient Name | Patient ID | Test Name | Requested By | Urgency | Status | Action
- Urgency badge: Routine (gray), Urgent (amber + `AlertTriangle`)
- Status: Pending (amber + `Clock`), Completed (green + `CheckCircle`)
- Action: "Enter Result" teal button (only on Pending rows)
- Rows sorted by request time ascending (oldest first)

---

### Page 9.2 — Enter Lab Result Form

**Route:** `/laboratory/results/new/{request_id}`
**SRS:** REQ-F-039, REQ-F-040

**Layout:** Page title "Enter Lab Result". White card, max-width `560px`.

At top: read-only summary of the request in a muted box — Patient name + ID, Test name, Requested by, Request time.

Form:
- Test Name — pre-populated, read-only
- Result Value (required) — number input
- Unit of Measurement — pre-populated from test type, read-only (e.g., "g/dL", "mmol/L")
- Reference Range — shown as `text-xs text-muted-foreground` below the result input: "Normal range: 4.0 – 5.5 g/dL"
- Date and Time of Test (required) — date-time picker, defaults to now
- Laboratory Technician ID — pre-populated from session, read-only with `Lock` icon

**Live preview of result status:**
As the user types a value, show a preview badge below the result field:
- Within range: `CheckCircle` + "Normal" (green)
- Outside normal range: `AlertTriangle` + "Abnormal" (amber)
- In critical range: `AlertOctagon` + "Critical" (red)

**Critical result warning:**
If the entered value falls in the critical range, an alert box appears below the preview: `bg-destructive/10 border border-destructive rounded p-3 text-sm text-foreground` — `AlertOctagon` icon (`text-destructive`) + "This is a critical value. Upon submission, the attending clinician and ward head nurse will be immediately notified by in-app notification and email."

Footer: Cancel (outline) + "Submit Result" (teal)

**Toast on success:** `toast.success('Result Submitted', { description: 'Lab result saved. Notifications sent to the requesting clinician.' })`

---

### Page 9.3 — Lab Result Detail View

**Route:** `/laboratory/results/{result_id}`

**Layout:** Page title "Lab Result" with status badge inline. White card.

Top section: result details in label-value pairs:
- Patient, Test Name, Result Value + Unit, Reference Range, Date & Time, Lab Technician
- **Status badge (large):** Normal / Abnormal / Critical using full semantic styling (icon + color)

If Abnormal or Critical: amber/red info box showing the reference range and breach amount.

Link to parent encounter (if linked): "View Encounter →"

**Amend Result link (REQ-F-028):** Only render if the currently logged-in user is the original lab technician who submitted the result (result.staff_id = current user) OR holds the Hospital Admin role.

Amendment history section at bottom (if result has been amended): shows Original and Amended values per REQ-F-027 design pattern.

---

## PHASE 10 — Bulk Data Ingestion

**Module:** Bulk Upload
**SRS Coverage:** REQ-F-044, REQ-F-045, REQ-F-046, REQ-F-047, REQ-F-048

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 10.1 — Bulk Data Upload Page

**Route:** `/bulk-upload`

**Layout:** Page title "Bulk Patient Data Upload". Accessible to Data Clerk and Hospital Admin.

**Step 1 — Download Template:**
White card with `Download` Lucide icon (teal, 48px) centered.
- Heading: "Step 1: Download the CSV Template" `text-lg font-semibold`
- Body: `text-sm text-muted-foreground` — "Download the official template and fill in your patient records. Do not modify column headers."
- "Download CSV Template" button (teal outline, `Download` icon)

**Step 2 — Upload CSV:**
White card below:
- Heading: "Step 2: Upload Your Completed CSV"
- Drag-and-drop zone: `border-2 border-dashed border-border rounded-lg p-12 text-center bg-muted/40 hover:bg-muted/60 cursor-pointer`
  - `Upload` Lucide icon (gray, 48px)
  - "Drag and drop your CSV file here" `text-sm font-medium text-foreground`
  - "or click to browse files" `text-xs text-muted-foreground`
  - "Accepted format: .csv only. Maximum file size: 10 MB." `text-xs text-muted-foreground`
- Once file is selected: replace drop zone content with file name + size + green `CheckCircle` + "Remove" link
- "Upload & Process" button (teal, full width, disabled until file is selected)

---

### Page 10.2 — ETL Processing Status Page

**Route:** `/bulk-upload/status/{job_id}`
**SRS:** REQ-F-045, REQ-F-046

**Layout:** Page title "Processing Upload". White card.

**States to design:**

**Processing state:**
- Large animated spinner (teal)
- "Processing your file..." `text-lg font-semibold text-foreground`
- Progress bar (teal fill, animated): shows percentage or row count
- `text-sm text-muted-foreground` — "Do not close this window. You will receive an email when processing is complete."

**Validation error state (file rejected before processing):**
- `AlertOctagon` icon (red, 48px)
- Heading: "File Rejected — Validation Errors"
- Error list table: Row / Column | Error Description
- "Download Error Report" button (red outline)
- "Try Again" button (teal) — returns to upload page

**Completed state:**
- `CheckCircle` icon (green, 48px)
- Heading: "Upload Complete"
- Summary stats in a 3-column card grid:
  - Total Processed (teal number)
  - Successfully Inserted (green number + `CheckCircle`)
  - Duplicates Skipped (amber number + `AlertTriangle`)
  - Failed Rows (red number + `XCircle`)
- Note: "A full report has been sent to your email."
- "Download Detailed Report" button + "Upload Another File" link

---

## PHASE 11 — Cross-Hospital Patient Transfer Workflow

**Module:** Transfers
**SRS Coverage:** REQ-F-049, REQ-F-050, REQ-F-051, REQ-F-052, REQ-F-053, REQ-F-054, REQ-F-055, REQ-F-056, REQ-F-057

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 11.1 — Cross-Hospital Patient Search

**Route:** `/transfers/search`
**SRS:** REQ-F-049

**Layout:** Page title "Cross-Hospital Patient Transfer". White card.

- Info note at top: `text-sm text-muted-foreground` with `Info` icon — "Search for a patient registered at another hospital. Only the patient's name and source hospital are visible until access is granted."
- Search fields: Patient Full Name (live debounced search, 300ms debounce per UI-004) + Date of Birth — side by side. Results update automatically 300ms after the last keystroke; no "Search" button. Show 3 skeleton loading rows while results load.
- Results appear below as cards showing ONLY: Patient Name | Source Hospital Name | "Request Access" teal button
- **No clinical details visible** — the result cards must not show DOB, phone, address, or any clinical data

---

### Page 11.2 — Submit Transfer Access Request Form

**Route:** `/transfers/request/new`
**SRS:** REQ-F-050

**Layout:** Modal or page, max-width `520px`. White card.

- Patient summary at top (name + source hospital, read-only muted box)
- Reason for Transfer (required) — textarea, placeholder "Describe the clinical reason for requesting access to this patient's records..."
- Access Type (required) — radio, styled as cards:
  - **VIEW_ONLY** — `Eye` icon + "View Only" heading + "Read patient records without making any changes." description
  - **VIEW_AND_EDIT** — `Edit` icon + "View & Edit" heading + "View records and add new clinical data for this patient." description
- Footer: Cancel (outline) + "Submit Access Request" (teal)

**Toast on success:** `toast.success('Access Request Submitted', { description: 'The source hospital has been notified of your request.' })`

---

### Page 11.3 — Transfer Requests List (Incoming)

**Route:** `/transfers`

**Layout:** Page title "Patient Transfers". Tab row: "Incoming Requests" | "Outgoing Requests" | "Active Grants" | "Expired Grants"

**Incoming Requests tab:**
Table columns: Requesting Hospital | Patient Name | Access Type Requested | Received | Status | Action
- Status: Pending (amber), Approved (green), Denied (red)
- Action: "Review" button on Pending rows

**Outgoing Requests tab:**
Table columns: Patient Name | Source Hospital | Access Type | Submitted | Status
- Status uses same badges

**Active Grants tab:**
Table columns: Patient Name | Source Hospital | Access Type | Granted | Expires | Action
- Expiry column: if expiry within 24 hours — amber text + `Clock` icon warning
- Action: "Revoke" (red outline, `ShieldOff` icon) for source hospital admins; "Renew" link for receiving hospital

**Expired Grants tab (REQ-F-056):** Shows grants that have passed their expiry date. Allows the receiving hospital to submit a renewal request even after expiry.
Table columns: Patient Name | Source Hospital | Access Type | Expired On | Action
- All rows use `text-muted-foreground` styling to indicate inactive state
- Action: "Request Renewal" teal outline button — opens Page 11.2 with patient pre-populated

---

### Page 11.4 — Transfer Request Review / Approval

**Route:** `/transfers/requests/{id}`
**SRS:** REQ-F-052, REQ-F-053

**Layout:** Back link + Page title "Transfer Access Request". Two-column layout:

**Left column — Request Details (white card):**
- Requesting hospital name + contact
- Patient name (source hospital's patient)
- Access type requested badge
- Reason for transfer (full text)
- Request received timestamp

**Right column — Decision Panel (white card):**
- If Pending:
  - "Access Duration" — field showing default "7 days" with ability to change (number input + "days")
  - "Approve Access" button (full width, teal, `CheckCircle` icon)
  - "Deny Request" button (full width, destructive red, `XCircle` icon) — triggers confirmation dialog (UI-010)
- If already decided: shows decision, who made it, when, and any notes

**Toast on approve:** `toast.success('Access Approved', { description: 'The requesting hospital can now access this patient\'s records.' })`
**Toast on deny:** `toast.info('Request Denied', { description: 'The requesting hospital has been notified.' })`

---

### Page 11.5 — Transferred Patient Record View

**Route:** `/transfers/patients/{patient_id}`
**SRS:** REQ-F-055

**Layout:** Same as Patient Profile page (Phase 6, Page 6.1) but with an **Access Expiry Banner** at the very top of the right column, always visible:

- Banner: `bg-[#F59E0B]/15 border border-[#F59E0B] rounded-md px-4 py-3 flex items-center justify-between mb-4`
- Left: `Clock` icon (amber) + `text-sm font-medium text-[#78350F]` — "Access Expires On: **{date and time}**"
- Right: "Request Renewal" teal outline button (links to Page 11.2)

If access type is VIEW_ONLY: disable all "Add", "New", or "Amend" buttons. Show `text-xs text-muted-foreground` note below disabled buttons: "You have view-only access to this patient's records."

---

### Page 11.6 — Proactive Transfer Grant (Source Hospital Initiates)

**Route:** `/transfers/grant/new` (also reachable via "Grant Access to Another Hospital" button on Patient Profile Page 6.1)
**SRS:** REQ-F-057

**Entry point on Patient Profile (Page 6.1):** Add a "Grant Access to Another Hospital" teal outline button with `ArrowLeftRight` icon in the left column of the patient summary card, visible only to Hospital Admin. This button opens Page 11.6 with the patient pre-populated.

**Layout:** Page title "Grant Patient Access to Another Hospital". White card, max-width `560px`.

- **Patient** (required) — if opened from patient profile, pre-populated read-only patient name + ID in a muted box. If opened directly, searchable patient lookup input (same pattern as Page 7.3).
- **Receiving Hospital** (required) — search input: type hospital name to search across all registered hospitals. Shows dropdown of results: Hospital Name | Region | Type. Select one.
- **Access Type** (required) — radio, styled as cards (same as Page 11.2):
  - **VIEW_ONLY** — `Eye` icon + "View Only" + "The receiving hospital can read records without making changes."
  - **VIEW_AND_EDIT** — `Edit` icon + "View & Edit" + "The receiving hospital can view and add new clinical data."
- **Access Duration** (required) — number input + "days" label, default pre-filled to 7. `Info` tooltip (UI-011): "The grant will automatically expire after this many days. The receiving hospital can request a renewal."
- Info note: `text-sm text-muted-foreground` with `Info` icon — "This grants the selected hospital immediate access to this patient's records without requiring them to submit an access request."

**Footer:** Cancel (outline) + "Grant Access" (teal, `CheckCircle` icon)

**Toast on success:** `toast.success('Access Granted', { description: 'The receiving hospital now has access to this patient\'s records.' })`

---

## PHASE 12 — Role-Specific Dashboards

**Module:** Dashboard
**SRS Coverage:** REQ-F-058, REQ-F-059, REQ-F-060, REQ-F-063, UI-002

Each role's dashboard loads automatically on login (UI-002). All dashboards use the `text-4xl font-bold text-foreground` + `text-sm text-muted-foreground` two-layer metric pattern from the design system.

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 12.1 — Doctor Dashboard

**Route:** `/dashboard` (when role = Doctor)
**SRS:** REQ-F-059

**Layout:** Page title "Good morning, Dr. {Name}" `text-2xl font-semibold`.

**Row 1 — Today's Appointments (white card, full width):**
- Card title: "Today's Appointments" `text-lg font-semibold` + date subtitle
- Appointment list: time | patient name | type badge | unit | "Open" link
- Empty state: "No appointments scheduled for today."

**Row 2 — Two cards side by side:**
- **Pending Lab Results (left):** table of pending lab results for the doctor's patients. Columns: Patient | Test | Requested. "View" link per row. Urgent results highlighted in red.
- **Recent Diagnoses (right):** list of the 10 most recent diagnoses recorded by this doctor. Each: patient name + condition + date.

---

### Page 12.2 — Nurse Dashboard

**Route:** `/dashboard` (when role = Nurse)

**Row 1 — Assigned Patients Today (white card):**
- Table: Patient Name | Appointment Time | Unit | Status
- "View Patient" link per row

**Row 2 — Two cards:**
- **Pending Vitals:** patients who have an encounter today but no vitals recorded yet
- **Recent Nursing Notes / Updates:** last 5 patients the nurse interacted with

---

### Page 12.3 — Lab Technician Dashboard

**Route:** `/dashboard` (when role = Lab Technician)

**Row 1 — 3 stat cards:**
- Pending Tests today (amber + `Clock`)
- Completed Tests today (green + `CheckCircle`)
- Critical Results flagged (red + `AlertOctagon`)

**Row 2 — Work Queue preview (white card):**
- Same as the Lab Work Queue page (Phase 9, Page 9.1) but showing only today's items, with a "View Full Queue" link

---

### Page 12.4 — Receptionist / Data Clerk Dashboard

**Route:** `/dashboard` (when role = Receptionist or Data Clerk)

**Row 1 — 3 stat cards:**
- Appointments today
- Patients registered this week
- Pending bulk upload jobs

**Row 2 — Today's Appointment Schedule (white card):**
- Time-ordered list of today's appointments with patient name + type + clinician
- "New Appointment" button at top right

---

### Page 12.5 — Hospital Admin Dashboard

**Route:** `/dashboard` (when role = Hospital Admin)
**SRS:** REQ-F-060

**Row 1 — 4 stat cards — use responsive grid: `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4`:**
- Patient Registrations this month — `text-4xl font-bold text-foreground`
- Clinical Encounters this month — `text-4xl font-bold text-foreground`
- Average Lab Turnaround — `text-4xl font-bold text-foreground` + unit `text-sm text-muted-foreground` "hours" + `Info` tooltip (UI-011): "Average time between lab test request and result submission, for tests completed this month."
- Active Staff Members — `text-4xl font-bold text-foreground`

**Row 2 — Two charts side by side (white cards, Recharts):**
- **Top 5 Diagnoses (bar chart):** diagnosis name on Y-axis, count on X-axis. Teal bars. Legend + axis labels. "PNG Export" ghost button with `Download` icon at top-right (UI-007).
- **Monthly Encounters Trend (line chart):** X=months, Y=encounter count. Teal line. Legend + axis labels. "PNG Export" ghost button with `Download` icon at top-right (UI-007).

**Row 3 — Staff Activity Summary (white card, table):**
- Columns: Staff Name | Role | Encounters This Month | Last Active

---

### Page 12.6 — Ministry / Public Health Officer Dashboard

**Route:** `/dashboard` (when role = Ministry Officer)
**SRS:** REQ-F-063

**Anonymisation notice:** `bg-[#0D9488]/10 border border-[#0D9488] rounded-md p-3 mb-6 text-sm text-foreground` — `Info` icon + "This dashboard displays anonymised aggregate data only. No individual patient identifiers are included. Data shown represents only patients who have consented to public health reporting."

**Row 1 — 3 stat cards:**
- Total Cases by Disease Category (this month)
- Total Admissions (this month)
- Hospitals Reporting

**Row 2 — Disease Category Bar Chart (white card, full width):**
- X=disease categories, Y=case count. Multi-hospital aggregated. Teal bars. Legend + axis labels. PNG export.

**Row 3 — Monthly Admission Trend (line chart, left) + Regional Distribution Table (right):**
- Line chart card: monthly trend, teal line. Legend + axis labels. "PNG Export" ghost button with `Download` icon at top-right (UI-007).
- Regional table: Region/District | Case Count | % of Total — sorted descending

---

## PHASE 13 — Analytics & Filter Query Builder

**Module:** Analytics
**SRS Coverage:** REQ-F-061, REQ-F-062, UI-007

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 13.1 — Analytics Filter & Query Builder

**Route:** `/analytics`

**Layout:** Page title "Analytics & Reports".

**Left sidebar panel (280px, white card, sticky):**
Section title: "Filters" `text-lg font-semibold`

Filter groups:
- **Date Range** — "From" date picker + "To" date picker
- **Clinical Unit** — multi-select dropdown
- **Diagnosis Category** — multi-select dropdown
- **Patient Age Group** — checkboxes: 0–14 | 15–29 | 30–44 | 45–59 | 60+
- **Patient Region/District** — multi-select dropdown
- **Test Type** — multi-select dropdown (for lab analytics)
- **Group Results By** — radio: Day / Week / Month

Filter action row: "Apply Filters" (teal, full width) + "Reset" link

**Main content area (flex-1):**

**Chart type selector tabs (UI-006):** "Bar Chart" | "Line Chart" | "Pie Chart" — tab row with icon indicators (`BarChart2`, `TrendingUp`, `PieChart`). Active tab is teal, switching chart type updates the display without reload.

**Chart canvas (white card):**
- Recharts chart of the selected type renders here
- Title: dynamically generated from filter selections
- Legend (below chart, centered, `text-xs font-medium text-foreground` per design system)
- Axis labels on both axes (`text-xs text-muted-foreground`)
- Threshold breach data points in amber or red per Chart Color Rules
- "Export as PNG" ghost button with `Download` icon at top-right of card

**Empty state (no filters applied):** `BarChart2` icon (gray, 64px) centered + "Apply filters to generate a report."

**Data table below chart:**
- Tabular version of chart data for reference
- "Download as CSV" button (outline, `Download` icon)

---

## PHASE 14 — Notifications & Clinical Audit Log

**Module:** Notifications + Audit
**SRS Coverage:** REQ-F-064, REQ-F-065, REQ-F-068, REQ-F-069, REQ-F-070, REQ-F-071

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 14.1 — Notifications Full List Page

**Route:** `/notifications`

**Layout:** Page title "Notifications". Tab row: "All" | "Unread" | "Critical" | "System".

Filter: Date Range dropdowns.

Notification list (white card):
- Each notification is a card row:
  - Left: colored icon based on type:
    - Critical lab: `AlertOctagon` (red)
    - Transfer request: `ArrowLeftRight` (teal)
    - Appointment change: `Calendar` (indigo)
    - ETL complete: `Upload` (green)
    - Staff account: `UserPlus` (gray)
  - Center: Title `text-sm font-medium text-foreground` + body `text-xs text-muted-foreground` + timestamp `text-xs text-muted-foreground` (right-aligned)
  - Unread: left border stripe `border-l-4 border-primary bg-primary/5`
  - Read: white background
- "Mark All as Read" button at top right

**Empty state:** `Bell` icon (gray, 48px) + "No notifications."

---

### Page 14.2 — Clinical Audit Log

**Route:** `/audit`
**SRS:** REQ-F-068, REQ-F-069, REQ-F-070

Accessible only to Hospital Admin.

**Layout:** Page title "Clinical Audit Log". Description: `text-sm text-muted-foreground` — "All patient data access and modification events recorded by this facility. This log is immutable and cannot be modified."

**Filter bar (white card):**
Horizontal filter row:
- Patient search (by name or ID)
- Staff member dropdown
- Action Type dropdown (READ / CREATE / UPDATE / AMEND / DELETE / TRANSFER_GRANT / TRANSFER_REVOKE / CONSENT_CHANGE)
- Date From + Date To pickers
- "Search" teal button

**Results table (white card):**
Columns: Timestamp (WAT) | Staff Member | Patient | Action Type | Resource | IP Address

- Action Type badges: `text-xs font-medium` with color:
  - READ: gray
  - CREATE: green
  - AMEND: amber
  - DELETE: red
  - TRANSFER_GRANT / TRANSFER_REVOKE: indigo
  - CONSENT_CHANGE: teal
- Table is read-only — no edit, delete, or action buttons anywhere (REQ-F-070)
- Immutability notice at bottom of page: `text-xs text-muted-foreground` — `Lock` icon + "Audit log entries are immutable and append-only in accordance with Cameroon Data Protection Law No. 2010/012."

Pagination: "Previous" / "Next" with page count.

---

## PHASE 15 — Settings & Account Management

**Module:** Settings
**SRS Coverage:** REQ-F-005, REQ-F-013, UI-001

**⚠ Stitch shell reminder:** Every page in this phase must include the platform Sidebar (240 px) + Topbar (64 px). Stitch often omits these — always include them.

---

### Page 15.1 — Change Password

**Route:** `/settings/password`

**Layout:** Page title "Change Password". White card, max-width `480px`.

Form:
- Current Password (required) — password input with show/hide toggle
- New Password (required) — password input with show/hide + password strength bar
- Confirm New Password (required) — password input with show/hide
- Password policy checklist (live, same as Page 1.3)

Footer: "Update Password" (teal, right-aligned)

Toast on success: "Password updated successfully. Please use your new password on next login."

---

### Page 15.2 — My Profile / Account Settings

**Route:** `/settings/profile`

**Layout:** Page title "My Profile". White card, max-width `560px`.

Read-only section at top:
- Name `text-xl font-semibold`
- Email `text-sm text-muted-foreground`
- Role badge pill
- Hospital name `text-sm text-muted-foreground`
- "Account created" date `text-xs text-muted-foreground`

Below: "Account Status" badge — Active (green) or Deactivated (red).

Note: `text-xs text-muted-foreground` — "To update your name, email, or role, contact your Hospital Administrator."

"Change Password" link (teal) — links to Page 15.1.

---

### Page 15.3 — Super Admin: System Configuration (if applicable)

**Route:** `/super-admin/settings`

**Layout:** Page title "System Configuration". White card.

Settings groups:
- **Platform Name** — text input (read-only for MVP)
- **Default Session Timeout** — number input + "minutes" label
- **Default Transfer Grant Duration** — number input + "days" label
- **Daily Summary Email Time** — time picker, WAT timezone shown

Footer: "Save Configuration" (teal)

---

## PHASES SUMMARY TABLE

| Phase | Module | Pages | SRS Coverage |
| --- | --- | --- | --- |
| 1 | Authentication & Public | 6 pages | UI-001, REQ-F-001, REQ-F-002, REQ-F-005 |
| 2 | Application Shell | 1 shell template | UI-002, UI-008, REQ-F-064, REQ-F-065 |
| 3 | Super Admin | 4 pages | REQ-F-003, REQ-F-004, REQ-F-006 |
| 4 | Staff & RBAC | 5 pages | REQ-F-008–REQ-F-014 |
| 5 | Patient Registration & Search | 3 pages | REQ-F-019–REQ-F-022 |
| 6 | Patient Profile & Consent | 3 pages | REQ-F-015–REQ-F-017, REQ-F-023–REQ-F-027 |
| 7 | Appointment Scheduling | 4 pages | REQ-F-029–REQ-F-033 |
| 8 | Clinical Encounter | 6 pages | REQ-F-034–REQ-F-038 |
| 9 | Laboratory Results | 3 pages | REQ-F-039–REQ-F-043 |
| 10 | Bulk Data Ingestion | 2 pages | REQ-F-044–REQ-F-048 |
| 11 | Patient Transfer Workflow | 6 pages | REQ-F-049–REQ-F-057 |
| 12 | Role-Specific Dashboards | 6 pages | REQ-F-058–REQ-F-060, REQ-F-063 |
| 13 | Analytics & Query Builder | 1 page | REQ-F-061, REQ-F-062 |
| 14 | Notifications & Audit Log | 2 pages | REQ-F-064–REQ-F-071 |
| 15 | Settings & Account | 3 pages | REQ-F-005, UI-001 |

**Total: 59 pages / screens** *(+1 Page 11.6 added for REQ-F-057 proactive transfer grant)*

---

*End of HIS Platform — Google Stitch Build Phases*
*Healthcare Information System v2.0 | University of Buea — Department of Computer Engineering*
