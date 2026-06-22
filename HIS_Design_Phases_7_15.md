# HIS Platform — Detailed UI Design Specification: Phases 7–15

**Healthcare Information System (HIS) | University of Buea**
**Document Purpose:** Detailed Google Stitch design instructions for Phases 7–15. Every page, every state, every component. Read this before designing any screen in these phases.

---

## GLOBAL DESIGN TOKENS (Apply to Every Page, Every Phase)

These values are non-negotiable. Do not deviate.

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary / Clinical Teal | `#0D9488` | Primary buttons, active nav highlight, links, focus rings, teal icons |
| Canvas / Background | `#F8F9FA` | Page background behind all cards |
| Card Surface | `#FFFFFF` | All white card panels |
| Body Text | `#0F172A` | All primary readable text |
| Label / Caption | `#64748B` | Secondary text, field labels, captions, muted info |
| Border / Divider | `#E2E8F0` | Card borders, table row dividers, input borders at rest |
| Destructive | `#EF4444` | Delete/revoke/reject buttons, critical alert text |
| Warning / Abnormal | `#F59E0B` | Warning banners, pending states, amber badges |
| Warning Text (dark) | `#78350F` | Text inside amber warning banners |
| Success / Normal | `#10B981` | Success states, normal lab results, approved badges |
| Appointment: Follow-up | `#6366F1` | Follow-up appointment type blocks |
| Appointment: Laboratory | `#3B82F6` | Laboratory appointment type blocks |
| Appointment: Procedure | `#8B5CF6` | Procedure appointment type blocks |

> **Amber rule:** `#F59E0B` is **only** for clinical warning states (pending, abnormal, session expiry, consent pending). Never use it for appointment type color coding.

### Typography

| Class | Usage |
|---|---|
| `text-2xl font-semibold text-foreground` | Page titles (H1) |
| `text-xl font-semibold text-foreground` | Card headings, patient name |
| `text-lg font-semibold text-foreground` | Section headings within cards |
| `text-base font-semibold text-foreground` | Sub-section divider headings |
| `text-sm font-medium text-foreground` | Table cell primary text, form labels, notification titles |
| `text-sm text-muted-foreground` | Body copy, help text, subtitles |
| `text-xs text-muted-foreground` | Timestamps, reference ranges, field hints, table headers |
| `text-xs font-semibold uppercase tracking-wide text-muted-foreground` | Stat card labels above metric values |
| `text-4xl font-bold text-foreground` | KPI / metric value on stat cards and vital sign cards |
| `text-xs font-medium` | Badge text, pill labels |

**Font:** Inter, sans-serif — always.

### Spacing & Radius

- **Card inner padding:** `p-5` (stat cards) or `p-6` (form/detail cards)
- **Page outer padding:** `p-6` applied to the main content area
- **Card border radius:** `rounded-lg` (`0.5rem`)
- **Input / button border radius:** `rounded-md` (`0.375rem`)
- **Gap between grid items:** `gap-4` or `gap-6`
- **Section divider spacing:** `my-6` with an `<hr>` or `<Separator />`

### Shell Layout (Mandatory for All Authenticated Pages)

Every page in Phases 7–15 **must** render inside the Application Shell:

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR (h-16, full width, bg-card, border-b)       │
├──────────┬──────────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT AREA                       │
│ (w-60 lg │  pt-16 pl-16 lg:pl-60                    │
│  w-16 md)│  p-6 inner, bg-background               │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

- Topbar: 64px tall, `bg-card`, `border-b border-border`, `z-50`, fixed
- Sidebar: 240px on `lg+`, 64px icon-only on `md`, `bg-card`, `border-r border-border`, fixed from `top-16` to bottom, `z-40`
- Main area: `pt-16 pl-16 lg:pl-60`, background `bg-background` (`#F8F9FA`)
- Active sidebar item: `bg-primary text-primary-foreground`

**If Stitch generates a page without the Sidebar and Topbar, the design is incomplete. Always add them.**

### Common Component Patterns

**Status Badge (icon + color — never color alone):**
```
Granted / Approved / Normal / Active / Completed
  → bg-[#10B981]/10  text-[#10B981]  icon: CheckCircle
Pending / Warning / Abnormal / Routine
  → bg-[#F59E0B]/10  text-[#78350F]  icon: Clock or AlertTriangle
Refused / Rejected / Critical / Destructive / Deactivated
  → bg-[#EF4444]/10  text-[#EF4444]  icon: XCircle or AlertOctagon
Teal (Active encounter/transfer)
  → bg-primary/10    text-primary     icon: varies
Gray (Read / Neutral)
  → bg-secondary     text-secondary-foreground
```

**Inline Validation (on submit or blur):**
- Red border on the input: `border-destructive`
- Below the field: `AlertCircle` icon (size 12, `text-destructive`) + `text-xs text-[#DC2626]` error message

**Warning Banner (amber):**
```
bg-[#F59E0B]/15  border border-[#F59E0B]  rounded-md  p-3  text-sm  text-[#78350F]
Left: AlertTriangle icon (amber)
```

**Success Banner (green):**
```
bg-[#10B981]/10  border border-[#10B981]  rounded-md  p-4
Left: CheckCircle icon (teal/green)
```

**Critical/Error Banner (red):**
```
bg-destructive/10  border border-destructive  rounded-md  p-3  text-sm  text-foreground
Left: AlertOctagon icon (text-destructive)
```

**Info Banner (teal):**
```
bg-[#0D9488]/10  border border-[#0D9488]  rounded-md  p-3  text-sm  text-foreground
Left: Info icon
```

**Muted Read-Only Box:**
```
bg-muted  rounded-md  p-3
text-sm text-muted-foreground
Used for: pre-populated read-only summaries, locked fields
```

**Confirmation Dialog (two-step destructive action — UI-010):**
```
Dialog width: max-w-md
Header: title text-lg font-semibold + X close button
Body: descriptive warning text (text-sm text-foreground) + optional amber note
Footer: Cancel button (outline, left) + Destructive action button (variant="destructive", right)
```

**Read-Only Field with Lock Icon:**
```
Input with bg-muted text-primary cursor-not-allowed
Lock icon (size 14) inside input right slot
Label has text-sm font-medium
```

**Auto-populated / pre-filled field indicator:**
`text-primary` value text + `Lock` icon inside input right — visually communicates the field is system-filled

**Table Header Row:**
```
bg-muted  text-xs font-semibold uppercase tracking-wide text-muted-foreground  px-4 py-3
```

**Table Body Row:**
```
border-b border-border  px-4 py-3  text-sm text-foreground
Hover: bg-accent/50
```

**Empty State (centered inside a card):**
```
flex flex-col items-center justify-center  min-h-64  gap-3
Icon: size-12  text-muted-foreground  opacity-40
Heading: text-sm font-medium text-foreground
Body: text-xs text-muted-foreground
```

**Skeleton Loading Row:**
```
3 animated pulse rows: h-10 w-full bg-muted rounded animate-pulse
```

**Toast Messages:**
- Success: `toast.success('Title', { description: '...' })`
- Info: `toast.info('Title', { description: '...' })`
- Error: `toast.error('Title', { description: '...' })`
- Position: bottom-right, `richColors`

---

## PHASE 7 — Appointment Scheduling

**Module:** Appointments
**SRS Coverage:** REQ-F-029, REQ-F-030, REQ-F-031, REQ-F-032, REQ-F-033
**Shell:** Full Sidebar (240px) + Topbar (64px) required on every page.
**Active nav item:** Appointments (`Calendar` icon)

---

### Page 7.1 — Appointment Calendar — Daily View

**Route:** `/appointments`
**SRS:** REQ-F-029, REQ-F-030

#### Page Header Row

```
[Page title: "Appointments"  text-2xl font-semibold]
```

#### Controls Row (directly below title, flex justify-between items-center)

**Left group — Date Navigator:**
```
← chevron button (outline, size sm)
[Monday, 16 June 2026]  text-sm font-medium text-foreground  px-3
→ chevron button (outline, size sm)
"Today" ghost button (small, teal text) — resets to current date
```

**Center group — View Toggle:**
```
Segmented control tabs: "Daily" | "Weekly"
Active tab: bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium
Inactive tab: text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm
Wrapper: bg-muted rounded-md p-1 inline-flex
```

**Right:**
```
"New Appointment" button
  variant="default"  bg-primary  text-primary-foreground
  CalendarPlus icon (size 16, left of text)
  text-sm font-medium
```

#### Filter Row (below controls, bg-card rounded-lg border border-border p-3 flex gap-3)

```
[All Clinicians ▾]  [All Units ▾]  [All Types ▾]
Each: Select component, size sm, text-sm, min-w-[160px]
```

#### Daily Calendar Grid (white card, rounded-lg border border-border, overflow-hidden)

```
Layout: flex  (time column + main grid column)

Time column:
  width: 64px  shrink-0  border-r border-border  bg-muted/30
  Each slot: 30-minute increment, 07:00–20:00
  Slot height: 60px
  Label: text-xs text-muted-foreground  text-right  pr-3  pt-1

Main grid column:
  flex-1  relative  overflow-y-auto  max-h-[780px]
  Background: alternating subtle bg-muted/10 lines every 60px
```

**Appointment Block (inside main grid):**
```
Position: absolute  (calculated from time position)
Width: calc(100% - 8px)  margin: 0 4px
Padding: 6px 8px  rounded-md  text-sm  cursor-pointer
Border-left: 3px solid [type color]
Background: [type color]/15

Contents:
  Patient name: text-sm font-medium text-foreground  truncate
  Clinician: text-xs text-muted-foreground  truncate
  Type badge: inline text-xs font-medium rounded px-1.5 py-0.5

Appointment type colors (background/border):
  Consultation: bg-[#0D9488]/15  border-l-[#0D9488]
  Follow-up:    bg-[#6366F1]/15  border-l-[#6366F1]
  Laboratory:   bg-[#3B82F6]/15  border-l-[#3B82F6]
  Procedure:    bg-[#8B5CF6]/15  border-l-[#8B5CF6]

Cancelled state:
  opacity-50
  text-muted-foreground line-through on patient name
  Red diagonal overlay: bg-destructive/10 border-l-destructive
```

**Empty slot:** `bg-muted/5` grid lines only — no text, no card

---

### Page 7.2 — Appointment Calendar — Weekly View

**Route:** `/appointments?view=week`
**SRS:** REQ-F-029

Same controls row as Page 7.1 (date navigator + view toggle with "Weekly" active + "New Appointment" button).
Same filter row.

#### Weekly Calendar Grid (white card, rounded-lg border border-border)

```
Layout: grid with 8 columns (time column + 7 day columns)

Time column:
  width: 56px  border-r border-border  bg-muted/30
  Slots: 07:00–20:00, 1-hour increments (fewer than daily view)
  Slot height: 72px
  Label: text-xs text-muted-foreground  pr-2  text-right  pt-1

Day columns (Mon–Sun):
  flex-1  border-r border-border last:border-r-0

Day header row (sticky top):
  bg-muted/50  border-b border-border  py-2  text-center
  Day name: text-xs font-semibold text-muted-foreground uppercase
  Date number: text-sm font-bold text-foreground
  Today column: day number has bg-primary text-primary-foreground rounded-full w-6 h-6 mx-auto
```

**Appointment Block (weekly):**
```
Same color coding as daily view
text-xs (smaller than daily)
Shows: Patient name (truncate 1 line) + type badge
Cancelled: same opacity-50 + strikethrough + red border
```

**Hover on any block:** Tooltip showing full details (patient, clinician, time, unit)

---

### Page 7.3 — Create Appointment Form

**Route:** `/appointments/new` (or Dialog modal triggered from calendar "New Appointment" button)
**SRS:** REQ-F-031

**Layout:** Dialog modal, width `max-w-[560px]`, or full page at `560px` max-width centered card.

#### Dialog Header
```
"Create Appointment"  text-lg font-semibold
X close button (top right)
```

#### Form Fields (space-y-4)

**Patient (required):**
```
Label: "Patient"  text-sm font-medium
Searchable combobox input
Placeholder: "Search by name or Patient ID..."
On type (300ms debounce): dropdown list appears below
Dropdown row: [Patient ID] [Full Name] [DOB]  text-sm
No results: "No patients found." text-xs text-muted-foreground
```

**Appointment Date (required):**
```
Label: "Appointment Date"  text-sm font-medium
Date picker input  full-width
```

**Appointment Time (required):**
```
Label: "Appointment Time"  text-sm font-medium
Time picker dropdown — 30-minute increments (07:00, 07:30, 08:00 … 20:00)
```

**Double-Booking Conflict Warning** (appears between Time and Type fields when conflict detected):
```
bg-[#F59E0B]/15  border border-[#F59E0B]  rounded-md  p-3
AlertTriangle icon (amber, size 14, inline left)
text-sm text-[#78350F]
"Dr. {Name} already has an appointment at this time: {conflicting summary}.
 Please select a different time."
```

**Appointment Type (required):**
```
Label: "Appointment Type"  text-sm font-medium
Select dropdown: Consultation / Follow-up / Laboratory / Procedure
```

**Assigned Clinician (required):**
```
Label: "Assigned Clinician"  text-sm font-medium
Searchable dropdown — shows Doctors and Nurses only
Dropdown row: [Name] [Role badge]  text-sm
```

**Clinical Unit (required):**
```
Label: "Clinical Unit"  text-sm font-medium
Select dropdown or text input
```

#### Dialog Footer
```
flex justify-end gap-2
[Cancel]  variant="outline"
[Create Appointment]  variant="default"  bg-primary  CalendarPlus icon left
```

**Toast on success:** `toast.success('Appointment Created', { description: 'The appointment has been scheduled.' })`

---

### Page 7.4 — Cancel Appointment Confirmation Dialog

**Trigger:** "Cancel" action on a calendar block or appointment row. Not a standalone page.
**SRS:** REQ-F-032

#### Dialog (max-w-md)

**Header:**
```
CalendarX icon (text-destructive, size 20) + "Cancel Appointment"  text-lg font-semibold
```

**Appointment Summary Box (read-only muted box):**
```
bg-muted  rounded-md  p-3  mb-4  space-y-1
Patient: text-sm font-medium text-foreground
Date/Time: text-sm text-muted-foreground
Type badge inline
Clinician: text-sm text-muted-foreground
```

**Cancellation Reason (required):**
```
Label: "Cancellation Reason"  text-sm font-medium
Textarea  rows=3
Placeholder: "Enter reason for cancellation..."
Validation: if empty on submit → AlertCircle + text-xs text-[#DC2626] "A cancellation reason is required."
```

**Footer:**
```
[Keep Appointment]  variant="outline"  (left)
[Cancel Appointment]  variant="destructive"  CalendarX icon  (right)
```

---

## PHASE 8 — Clinical Encounter Management

**Module:** Clinical Encounter
**SRS Coverage:** REQ-F-034, REQ-F-035, REQ-F-036, REQ-F-037, REQ-F-038
**Shell:** Full Sidebar + Topbar required on all pages.
**Active nav item:** Encounters (`Stethoscope` icon)

---

### Page 8.1 — Create Clinical Encounter Form

**Route:** `/patients/{id}/encounters/new`
**SRS:** REQ-F-034

**Entry point:** "New Encounter" button on the Encounters tab of Patient Profile (Page 6.1).

**Layout:** Page title `"New Clinical Encounter — {Patient Name}"` `text-2xl font-semibold`. White card `max-w-[720px] mx-auto`.

#### Consent Guard Banner (shown only when patient consent = Refused)
```
Full-width  bg-destructive/10  border border-destructive  rounded-md  p-4  mb-6
flex items-center gap-3
AlertOctagon icon (text-destructive, size 20)
text-sm font-medium text-foreground:
  "This patient has refused consent. Clinical encounters cannot be created."
When shown: submit button is disabled (opacity-50 cursor-not-allowed)
```

#### Section: "Encounter Details"
```
Section heading: "Encounter Details"  text-base font-semibold text-foreground
Separator below heading
```

**Encounter Date (required):**
```
Label: "Encounter Date"
Date picker — defaults to today's date
```

**Encounter Time (required):**
```
Label: "Encounter Time"
Time picker — defaults to current time
```

**Clinical Unit (required):**
```
Label: "Clinical Unit"
Select dropdown — list of facility's clinical units
```

**Presenting Complaint (required):**
```
Label: "Presenting Complaint"
Textarea  rows=3
Placeholder: "Describe the patient's presenting complaint..."
```

**Attending Clinician (auto-populated, read-only):**
```
Label: "Attending Clinician"
Input value: logged-in user's full name
Read-only styling: bg-muted  text-primary  cursor-not-allowed
Right slot: Lock icon (size 14, text-muted-foreground)
Help text below: text-xs text-muted-foreground "Auto-populated from your login session."
```

**Link to Appointment (optional):**
```
Label: "Link to Appointment (optional)"
Select dropdown
Placeholder: "Select an appointment for today (optional)"
Options: today's appointments for this patient, if any
If no appointments today: placeholder shows "No appointments found for today"
```

#### Form Footer
```
border-t border-border  pt-4  flex justify-end gap-2
[Cancel]  variant="outline"  → navigates back to patient profile
[Create Encounter]  variant="default"  bg-primary
```

**Toast on success:** `toast.success('Encounter Created', { description: 'The clinical encounter has been recorded.' })`

---

### Page 8.2 — Encounter Detail Page

**Route:** `/patients/{id}/encounters/{encounter_id}`
**SRS:** REQ-F-034–REQ-F-038

**Entry point:** "View" link from Patient Profile Encounters tab, or Timeline tab.

#### Page Header
```
Back link: ← Patient Profile  text-sm text-primary  ArrowLeft icon
Page title: "Encounter — {Date}"  text-2xl font-semibold
Subtitle: "{Clinician Name}  ·  {Clinical Unit}"  text-sm text-muted-foreground  Stethoscope icon inline
```

#### Tab Bar
```
Tabs: "Overview" | "Diagnoses" | "Vital Signs" | "Prescriptions" | "Lab Requests"
Active tab: border-b-2 border-primary text-primary  font-medium
Inactive tab: text-muted-foreground hover:text-foreground
```

---

#### Overview Tab

**Encounter Summary Card (white card, p-5):**
```
Grid layout: 2 columns on md+, 1 column on sm

Items (label-value pairs):
  label: text-xs text-muted-foreground uppercase tracking-wide
  value: text-sm font-medium text-foreground

Row 1: Date | Time
Row 2: Clinical Unit | Presenting Complaint (full text, spans full width if needed)
Row 3: Attending Clinician (Stethoscope icon inline, text-primary)
```

**Amend Encounter Link (conditional — REQ-F-028):**
```
Shown only if: current logged-in user is the original author (encounter.staff_id === current user)
  OR current user holds Hospital Admin role.
Do NOT show to any other user even if they hold patient:amend permission.

Styling: text-sm text-primary  Pencil icon left  underline-offset-4 hover:underline
Text: "Amend this Encounter"
Navigates to: /patients/{id}/amend/encounter/{encounter_id}
```

---

#### Diagnoses Tab

**Top row:** flex justify-between items-center
```
Left: "Diagnoses"  text-lg font-semibold
Right: "+ Add Diagnosis"  variant="outline"  border-primary text-primary  PlusCircle icon  (only if consent ≠ Refused)
```

**Diagnoses Table (white card):**
```
Columns: Condition | ICD-10 | Severity | Status | Recorded By | Date
Header: bg-muted  text-xs font-semibold uppercase tracking-wide text-muted-foreground

Severity badges:
  Mild:     bg-[#10B981]/10  text-[#10B981]  (green)
  Moderate: bg-[#F59E0B]/10  text-[#78350F]  (amber)
  Severe:   bg-[#EF4444]/10  text-[#EF4444]  (red)

Status badges:
  Active:    bg-primary/10  text-primary  (teal)
  Resolved:  bg-[#10B981]/10  text-[#10B981]  (green)
  Suspected: bg-[#F59E0B]/10  text-[#78350F]  (amber)

ICD-10: text-xs font-mono text-muted-foreground (or "—" if not provided)
```

**Empty state:** `Stethoscope` icon (muted, 48px) + "No diagnoses recorded yet." + "+ Add Diagnosis" teal link

---

#### Vital Signs Tab

**Top row:**
```
Left: "Vital Signs"  text-lg font-semibold
Right: "Record Vital Signs"  variant="outline"  border-primary text-primary  Activity icon
  (shown when no vitals recorded yet, or always to allow updates)
```

**Vital Signs Grid (grid-cols-2 md:grid-cols-3, gap-4):**

Each metric card (white card, border, p-5):
```
Top: metric label  text-xs font-semibold uppercase tracking-wide text-muted-foreground
Middle: value  text-4xl font-bold text-foreground
Bottom: unit  text-sm text-muted-foreground

Special color rules for Oxygen Saturation:
  ≥ 95%:    text-[#10B981]  (green)
  90–94%:   text-[#F59E0B]  (amber)
  < 90%:    text-[#EF4444]  (red) + AlertTriangle icon inline

Metric cards:
  Temperature:       value + "°C"
  Blood Pressure:    "120/80"  + "mmHg"  (systolic/diastolic inline)
  Pulse Rate:        value + "bpm"
  Respiratory Rate:  value + "breaths/min"
  Oxygen Saturation: value + "%"  (with color rules above)
  Weight:            value + "kg"
```

**Empty state (no vitals yet):**
```
Single card with dashed border  min-h-48  flex items-center justify-center
Activity icon (muted, 40px) + "No vital signs recorded." + "Record Vital Signs" teal link
```

---

#### Prescriptions Tab

**Top row:**
```
Left: "Prescriptions"  text-lg font-semibold
Right: "+ Add Prescription"  variant="outline"  border-primary text-primary  Pill icon
```

**Prescriptions Table:**
```
Columns: Medication | Dosage | Frequency | Route | Duration | Prescriber | Date
text-sm text-foreground in cells
Prescriber: text-sm text-muted-foreground
Date: text-xs text-muted-foreground
```

**Empty state:** `Pill` icon (muted, 48px) + "No prescriptions recorded yet."

---

#### Lab Requests Tab

**Top row:**
```
Left: "Lab Requests"  text-lg font-semibold
Right: "+ Request Lab Test"  variant="outline"  border-primary text-primary  FlaskConical icon
```

**Lab Requests Table:**
```
Columns: Test Name | Requested | Urgency | Status | Result
Urgency: Routine (gray pill) | Urgent (amber + AlertTriangle)
Status: Pending (amber + Clock) | Completed (green + CheckCircle)
Result cell: shows result value + unit if completed, "—" if pending
```

**Empty state:** `FlaskConical` icon (muted, 48px) + "No lab tests requested yet."

---

### Page 8.3 — Add Diagnosis Form (Modal)

**Trigger:** "+ Add Diagnosis" button on Diagnoses tab.
**SRS:** REQ-F-035

**Dialog (max-w-md):**

**Header:** `Stethoscope` icon + "Add Diagnosis"

**Fields:**

**Condition Name (required):**
```
Label: "Condition Name"  text-sm font-medium
Text input with autocomplete suggestions (dropdown as user types)
Placeholder: "e.g. Malaria, Hypertension, Type 2 Diabetes..."
```

**ICD-10 Code (optional):**
```
Label: "ICD-10 Code (optional)"  text-sm font-medium
Text input  max-w-[160px]
Placeholder: "e.g. B54"
Right slot: Info icon (size 14, text-muted-foreground)
Tooltip on Info: "The International Classification of Diseases 10th revision code. Leave blank if unknown."
```

**Severity (required):**
```
Label: "Severity"  text-sm font-medium
Segmented control (inline, full-width):
  [Mild] [Moderate] [Severe]
Selected segment: bg-primary text-primary-foreground rounded-md
Unselected: bg-muted text-muted-foreground
```

**Status (required):**
```
Label: "Status"  text-sm font-medium
Segmented control:
  [Active] [Resolved] [Suspected]
Same styling as Severity control
```

**Footer:**
```
[Cancel]  variant="outline"
[Add Diagnosis]  variant="default"  bg-primary
```

**Toast:** `toast.success('Diagnosis Added', { description: 'The diagnosis has been recorded on this encounter.' })`

---

### Page 8.4 — Record Vital Signs Form (Modal)

**Trigger:** "Record Vital Signs" button on Vital Signs tab.
**SRS:** REQ-F-036

**Dialog (max-w-[480px]):**

**Header:** `Activity` icon + "Record Vital Signs"

**Fields (grid-cols-2 gap-4):**

Each field:
```
Label: text-sm font-medium  [metric name]
Number input + unit label to the right (text-xs text-muted-foreground)

Temperature:           number input + "°C"
Blood Pressure Sys.:   number input + "mmHg systolic"
Blood Pressure Dia.:   number input + "mmHg diastolic"
Pulse Rate:            number input + "bpm"
Respiratory Rate:      number input + "breaths/min"
Oxygen Saturation:     number input + "%"
Weight:                number input + "kg"
```

**Footer:**
```
[Cancel]  variant="outline"
[Save Vital Signs]  variant="default"  bg-primary
```

**Toast:** `toast.success('Vital Signs Recorded', { description: 'Vital signs have been saved to this encounter.' })`

---

### Page 8.5 — Write Prescription Form (Modal)

**Trigger:** "+ Add Prescription" button on Prescriptions tab.
**SRS:** REQ-F-037

**Dialog (max-w-[500px]):**

**Header:** `Pill` icon (or `ClipboardList`) + "Write Prescription"

**Fields:**

**Medication Name (required):**
```
Text input with autocomplete
Placeholder: "e.g. Amoxicillin, Paracetamol, Metformin..."
```

**Dosage (required):**
```
Text input
Placeholder: "e.g. 500mg, 10ml"
```

**Frequency (required):**
```
Select dropdown:
  Once daily / Twice daily / Three times daily / Four times daily / As needed / Other
```

**Route of Administration (required):**
```
Select dropdown:
  Oral / Intravenous (IV) / Intramuscular (IM) / Topical / Inhaled / Other
```

**Duration (required):**
```
Text input
Placeholder: "e.g. 7 days, 2 weeks"
```

**Prescribing Clinician (auto-populated, read-only):**
```
Input value: logged-in clinician's name
Read-only: bg-muted  text-primary
Right slot: Lock icon (size 14)
```

**Footer:**
```
[Cancel]  variant="outline"
[Add Prescription]  variant="default"  bg-primary
```

**Toast:** `toast.success('Prescription Added', { description: 'The prescription has been recorded on this encounter.' })`

---

### Page 8.6 — Request Lab Test Form (Modal)

**Trigger:** "+ Request Lab Test" button on Lab Requests tab.
**SRS:** REQ-F-038

**Dialog (max-w-md):**

**Header:** `FlaskConical` icon + "Request Lab Test"

**Fields:**

**Test Name (required):**
```
Select dropdown — predefined test catalogue:
  Full Blood Count (FBC)
  Malaria RDT
  Malaria Blood Film
  Liver Function Test (LFT)
  Renal Function Test (RFT)
  HbA1c
  Blood Glucose (Fasting)
  Blood Glucose (Random)
  Creatinine
  Urea
  HIV Rapid Test
  Hepatitis B Surface Antigen
  Urinalysis
  Chest X-Ray
  Urine Pregnancy Test
  Stool Microscopy
  Sputum AFB Smear
  Other (free text appears below if selected)
```

**Clinical Urgency:**
```
Label: "Clinical Urgency"  text-sm font-medium
Radio group (horizontal):
  (●) Routine   (○) Urgent
Urgent selection: label text turns amber + AlertTriangle icon inline
```

**Notes to Lab (optional):**
```
Label: "Notes to Lab (optional)"  text-sm font-medium
Textarea  rows=2
Placeholder: "Any special instructions for the lab technician..."
```

**Footer:**
```
[Cancel]  variant="outline"
[Submit Lab Request]  variant="default"  bg-primary  FlaskConical icon left
```

**Toast:** `toast.success('Lab Test Requested', { description: 'The request has been sent to the lab work queue.' })`

---

## PHASE 9 — Laboratory Results Management

**Module:** Laboratory
**SRS Coverage:** REQ-F-039, REQ-F-040, REQ-F-041, REQ-F-042, REQ-F-043
**Shell:** Full Sidebar + Topbar required.
**Active nav item:** Laboratory (`FlaskConical` icon)

---

### Page 9.1 — Lab Work Queue

**Route:** `/laboratory` or `/laboratory/queue`
**SRS:** REQ-F-043

**Layout:** Page title "Lab Work Queue" `text-2xl font-semibold`.

#### Controls Row (flex justify-between items-center mb-4)

**Left — Status Filter Toggle:**
```
Segmented tabs (inline): "All Tests" | "Pending" | "Completed"
Active: bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm
Inactive: bg-muted text-muted-foreground px-3 py-1.5 text-sm
Wrapper: bg-muted rounded-md p-1 inline-flex
```

**Right — Search:**
```
Input with Search icon (left slot, text-muted-foreground)
Placeholder: "Search by patient or test name..."
width: 280px
```

#### Lab Queue Table (white card, rounded-lg border border-border shadow-sm)

```
Header: bg-muted  text-xs font-semibold uppercase tracking-wide text-muted-foreground  px-4 py-3
Columns: Request Time | Patient Name | Patient ID | Test Name | Requested By | Urgency | Status | Action

Sort: ascending by Request Time (oldest at top)

Urgency badges:
  Routine: bg-secondary text-secondary-foreground  text-xs
  Urgent:  bg-[#F59E0B]/10 text-[#78350F]  AlertTriangle icon (size 12) inline  text-xs

Status badges:
  Pending:   bg-[#F59E0B]/10 text-[#78350F]  Clock icon  text-xs
  Completed: bg-[#10B981]/10 text-[#10B981]  CheckCircle icon  text-xs

Action column:
  Pending rows:   "Enter Result" button  variant="outline"  text-primary border-primary  text-xs  size-sm
                  → navigates to /laboratory/results/new/{request_id}
  Completed rows: "View Result" link  text-sm text-primary
```

**Empty state (no pending tests):**
```
FlaskConical icon (muted, 48px) + "No lab tests in the queue." text-sm text-muted-foreground
```

**Pagination:** Previous / Next (text-sm) + "Page 1 of {n}" (text-sm text-muted-foreground), bottom of table card

---

### Page 9.2 — Enter Lab Result Form

**Route:** `/laboratory/results/new/{request_id}`
**SRS:** REQ-F-039, REQ-F-040

**Layout:** Page title "Enter Lab Result" `text-2xl font-semibold`. White card `max-w-[560px] mx-auto`.

#### Request Summary Box (read-only, top of form)
```
bg-muted  rounded-md  p-4  mb-6  space-y-1.5
Label-value pairs (text-xs text-muted-foreground label + text-sm font-medium text-foreground value):
  Patient: {Name} · {Patient ID}
  Test: {Test Name}
  Requested By: {Clinician Name}  ·  {Role}
  Request Time: {timestamp}
```

#### Form Fields (space-y-5)

**Test Name (read-only):**
```
Label: "Test Name"  text-sm font-medium
Value in muted input or plain text: text-sm text-foreground
```

**Result Value (required):**
```
Label: "Result Value"  text-sm font-medium
Number input  full-width
Placeholder: "Enter numeric value"
Right of input: unit label text-sm text-muted-foreground (e.g. "g/dL", "mmol/L") — read-only
Below: text-xs text-muted-foreground — "Normal range: 4.0 – 5.5 g/dL"
```

**Live Status Preview (renders below result value as user types):**
```
Within normal range:
  CheckCircle icon (text-[#10B981], size 16) + "Normal"  text-sm font-medium text-[#10B981]
  Wrapper: bg-[#10B981]/10 border border-[#10B981] rounded-md px-3 py-2 inline-flex items-center gap-2

Outside normal range (abnormal):
  AlertTriangle icon (amber, size 16) + "Abnormal"  text-sm font-medium text-[#78350F]
  Wrapper: bg-[#F59E0B]/10 border border-[#F59E0B] rounded-md px-3 py-2

In critical range:
  AlertOctagon icon (text-destructive, size 16) + "Critical"  text-sm font-medium text-destructive
  Wrapper: bg-destructive/10 border border-destructive rounded-md px-3 py-2
```

**Critical Result Alert Box (shown only when value is in critical range):**
```
bg-destructive/10  border border-destructive  rounded-md  p-3  mt-3
flex items-start gap-3
AlertOctagon icon (text-destructive, size 20, shrink-0)
text-sm text-foreground:
  "This is a critical value. Upon submission, the attending clinician and ward head
   nurse will be immediately notified by in-app notification and email."
```

**Date and Time of Test (required):**
```
Label: "Date and Time of Test"  text-sm font-medium
DateTime input  full-width  defaults to current date/time
```

**Laboratory Technician ID (auto-populated, read-only):**
```
Label: "Laboratory Technician"  text-sm font-medium
Value: logged-in technician's name + staff ID
Input: bg-muted text-primary  Lock icon right slot
```

#### Form Footer
```
border-t border-border  pt-4  flex justify-end gap-2
[Cancel]  variant="outline"
[Submit Result]  variant="default"  bg-primary  CheckCircle icon left
```

**Toast:** `toast.success('Result Submitted', { description: 'Lab result saved. Notifications sent to the requesting clinician.' })`

---

### Page 9.3 — Lab Result Detail View

**Route:** `/laboratory/results/{result_id}`

**Layout:** Page title "Lab Result" `text-2xl font-semibold` with status badge inline (same line, right of title).

Back link: `← Lab Work Queue` or `← Patient Profile` depending on navigation origin.

#### Result Detail Card (white card, p-6)

**Status Badge (large, top right of card):**
```
Normal:   CheckCircle + "Normal"  bg-[#10B981]/10 text-[#10B981]  px-3 py-1.5 text-sm font-medium rounded-md
Abnormal: AlertTriangle + "Abnormal"  bg-[#F59E0B]/10 text-[#78350F]  same sizing
Critical: AlertOctagon + "Critical"  bg-destructive/10 text-destructive  same sizing
```

**Result Details (label-value pairs, 2-column grid on md+):**
```
label: text-xs text-muted-foreground uppercase tracking-wide
value: text-sm font-medium text-foreground

Patient:         {Name} — {Patient ID}   →  "View Patient" link (text-sm text-primary)
Test Name:       {Test}
Result Value:    {value} {unit}   text-lg font-bold text-foreground  (larger than others)
Reference Range: text-sm text-muted-foreground (e.g. "Normal: 4.0 – 5.5 g/dL")
Date & Time:     {datetime}
Lab Technician:  {Name}
```

**Abnormal / Critical Breach Box:**
```
Shown only for Abnormal or Critical results
bg-[#F59E0B]/15 border border-[#F59E0B] rounded-md p-3 mt-4    (amber for abnormal)
bg-destructive/10 border border-destructive rounded-md p-3 mt-4 (red for critical)
AlertTriangle / AlertOctagon icon + text-sm text-foreground:
  "Result is {X} {unit} above the upper limit of normal ({upper limit} {unit})."
```

**Linked Encounter:**
```
Separator
text-sm text-muted-foreground "Linked Encounter:"
→ "View Encounter" link  ArrowRight icon  text-sm text-primary
```

**Amend Result Link (conditional — REQ-F-028):**
```
Shown only if: logged-in user === result.staff_id OR logged-in user is Hospital Admin
Styling: text-sm text-primary  Pencil icon left  underline-offset-4 hover:underline
Text: "Amend this Result"
Navigates to: /patients/{id}/amend/lab_result/{result_id}
```

**Amendment History Section (shown only if result has been amended):**
```
Separator  mt-6
Heading: "Amendment History"  text-lg font-semibold
For each amendment (white inner card with amber left border 3px):
  "Original"  text-xs font-medium bg-muted rounded px-2 py-0.5  label badge
  Original value: text-sm text-muted-foreground line-through
  Amended value: text-sm font-medium text-foreground
  Amended by: text-xs text-muted-foreground + timestamp
  Reason: text-sm text-foreground in muted box
```

---

## PHASE 10 — Bulk Data Ingestion

**Module:** Bulk Upload
**SRS Coverage:** REQ-F-044, REQ-F-045, REQ-F-046, REQ-F-047, REQ-F-048
**Shell:** Full Sidebar + Topbar required.
**Active nav item:** Bulk Upload (`Upload` icon)
**Access:** Data Clerk and Hospital Admin roles only.

---

### Page 10.1 — Bulk Data Upload Page

**Route:** `/bulk-upload`
**SRS:** REQ-F-044, REQ-F-047, REQ-F-048

**Layout:** Page title "Bulk Patient Data Upload" `text-2xl font-semibold`.
Subtitle: `text-sm text-muted-foreground` — "Upload a completed CSV file to register multiple patients at once."

#### Step 1 — Download Template Card (white card, p-6, mb-4)

```
Centered layout (flex flex-col items-center text-center gap-4):

Download icon (text-primary, size-12)
Heading: "Step 1: Download the CSV Template"  text-lg font-semibold
Body: text-sm text-muted-foreground
  "Download the official HIS template and fill in your patient records.
   Do not modify the column headers — the upload will fail if headers are changed."

Button row:
  "Download CSV Template"  variant="outline"  border-primary text-primary  Download icon left
```

#### Step 2 — Upload Card (white card, p-6)

```
Heading: "Step 2: Upload Your Completed CSV"  text-lg font-semibold  mb-4
```

**Drag-and-Drop Zone (default / idle state):**
```
border-2 border-dashed border-border rounded-lg p-12 text-center
bg-muted/40 hover:bg-muted/60 hover:border-primary cursor-pointer
transition-colors

Contents:
  Upload icon (text-muted-foreground opacity-50, size-12)
  "Drag and drop your CSV file here"  text-sm font-medium text-foreground  mt-3
  "or click to browse files"  text-xs text-muted-foreground  mt-1
  "Accepted format: .csv only · Maximum file size: 10 MB"  text-xs text-muted-foreground  mt-3
```

**Drag-Over State:**
```
border-primary bg-primary/5
Upload icon becomes text-primary
```

**File Selected State (replaces drop zone content):**
```
flex items-center justify-between p-4 bg-[#10B981]/5 border border-[#10B981] rounded-lg

Left: FileText icon (text-[#10B981], size 20)
Center:
  File name: text-sm font-medium text-foreground
  File size: text-xs text-muted-foreground
Right: "Remove" link  text-xs text-destructive hover:underline  × icon
```

**Upload Button (below zone):**
```
Full-width  mt-4
"Upload & Process"  variant="default"  bg-primary
Disabled state (no file selected): opacity-50 cursor-not-allowed
Active state (file ready): enabled, full teal
```

---

### Page 10.2 — ETL Processing Status Page

**Route:** `/bulk-upload/status/{job_id}`
**SRS:** REQ-F-045, REQ-F-046

**Layout:** Page title "Upload Status" `text-2xl font-semibold`. White card `max-w-[640px] mx-auto`.

Design **three distinct states**:

---

#### State A: Processing

```
flex flex-col items-center text-center gap-6  py-16

Animated spinner: 
  w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin

"Processing your file..."  text-lg font-semibold text-foreground

Progress bar (teal animated):
  w-full  bg-muted rounded-full h-2.5
  Inner: bg-primary rounded-full  animate-pulse  (width updates with %)
  Below: "1,243 of 2,500 rows processed"  text-sm text-muted-foreground

Info text: text-sm text-muted-foreground
  "Do not close this window. You will receive an email notification when
   processing is complete."
```

---

#### State B: Validation Error (File Rejected)

```
flex flex-col items-center text-center gap-4  py-8

AlertOctagon icon (text-destructive, size-12)
"File Rejected — Validation Errors"  text-xl font-semibold text-foreground
"Your file could not be processed due to the following errors."  text-sm text-muted-foreground

Error Table (white inner card, mt-4, full-width):
  Header: bg-muted  Columns: Row | Column | Error Description
  Body rows: text-sm text-foreground  border-b border-border
  Row number: text-xs font-mono text-muted-foreground
  Error description: text-sm text-destructive

Button row (mt-6, flex justify-center gap-3):
  "Download Error Report"  variant="outline"  border-destructive text-destructive  Download icon left
  "Try Again"  variant="default"  bg-primary  → navigates back to /bulk-upload
```

---

#### State C: Completed

```
flex flex-col items-center text-center gap-4  py-8

CheckCircle icon (text-[#10B981], size-12)
"Upload Complete"  text-xl font-semibold text-foreground

Summary stats grid (grid-cols-2 md:grid-cols-4, gap-4, mt-4, w-full):

  Card 1: Total Processed
    number: text-3xl font-bold text-primary
    label: text-xs text-muted-foreground "Total Processed"

  Card 2: Successfully Inserted
    number: text-3xl font-bold text-[#10B981]  CheckCircle icon (size 16)
    label: text-xs text-muted-foreground "Inserted"

  Card 3: Duplicates Skipped
    number: text-3xl font-bold text-[#F59E0B]  AlertTriangle icon (size 16)
    label: text-xs text-muted-foreground "Skipped (Duplicates)"

  Card 4: Failed Rows
    number: text-3xl font-bold text-destructive  XCircle icon (size 16)
    label: text-xs text-muted-foreground "Failed"

Email note: text-sm text-muted-foreground mt-2
  "A full summary report has been sent to your email address."

Button row (flex justify-center gap-3 mt-6):
  "Download Detailed Report"  variant="outline"  border-primary text-primary  Download icon
  "Upload Another File"  variant="ghost"  text-primary  → navigates to /bulk-upload
```

---

## PHASE 11 — Cross-Hospital Patient Transfer Workflow

**Module:** Transfers
**SRS Coverage:** REQ-F-049, REQ-F-050, REQ-F-051, REQ-F-052, REQ-F-053, REQ-F-054, REQ-F-055, REQ-F-056, REQ-F-057
**Shell:** Full Sidebar + Topbar required.
**Active nav item:** Transfers (`ArrowLeftRight` icon)

---

### Page 11.1 — Cross-Hospital Patient Search

**Route:** `/transfers/search`
**SRS:** REQ-F-049

**Layout:** Page title "Cross-Hospital Patient Transfer" `text-2xl font-semibold`.

#### Privacy Notice Banner (always visible at top)
```
bg-[#0D9488]/10  border border-[#0D9488]  rounded-md  p-3  mb-6
flex items-start gap-3
Info icon (text-primary, size 16, shrink-0 mt-0.5)
text-sm text-foreground:
  "Search for a patient registered at another hospital. Only the patient's name
   and source hospital are visible until access is granted."
```

#### Search Fields Card (white card, p-5)
```
grid grid-cols-1 md:grid-cols-2 gap-4

Field 1: "Patient Full Name"  text-sm font-medium
  Input with Search icon (left slot)
  Placeholder: "Enter patient's full name..."
  Live debounced search — 300ms after last keystroke, no Search button

Field 2: "Date of Birth"  text-sm font-medium
  Date picker input
  Help text: text-xs text-muted-foreground "Helps narrow results for common names."
```

#### Results Area (below search card)

**Loading state (skeleton rows):**
```
3 skeleton rows: h-16 w-full bg-muted rounded-lg animate-pulse  space-y-3
```

**Results state:**
```
space-y-3

Each result card (white card, border border-border rounded-lg p-4, flex justify-between items-center):
  Left:
    "Patient Name"  text-sm font-bold text-foreground
    "Source Hospital: {Hospital Name}"  text-xs text-muted-foreground
    *** NO other clinical or personal data shown here ***

  Right:
    "Request Access"  variant="outline"  border-primary text-primary  text-sm
    → navigates to /transfers/request/new?patient={id}
```

> **Privacy enforcement:** Result cards must NOT display DOB, phone, address, Patient ID, or any clinical information. Only name + source hospital name.

**Empty state:**
```
Search icon (muted, 48px) + "Enter a patient name to search across hospitals."
(shown before any search)
```

**No results state (after search):**
```
UserX icon (muted, 48px) + "No patients found at other hospitals matching your search."
text-xs text-muted-foreground  "Check spelling or try the patient's date of birth."
```

---

### Page 11.2 — Submit Transfer Access Request Form

**Route:** `/transfers/request/new` (also opens as modal from Page 11.1)
**SRS:** REQ-F-050

**Layout:** Page or Dialog, `max-w-[520px]` white card.

**Page title / Dialog header:** "Request Patient Access" `text-lg font-semibold`

#### Patient Summary Box (pre-filled from navigation)
```
bg-muted rounded-md p-3 mb-5
"Patient: {Full Name}"  text-sm font-medium text-foreground
"Source Hospital: {Hospital Name}"  text-xs text-muted-foreground
Read-only — cannot be changed here
```

#### Reason for Transfer (required)
```
Label: "Reason for Transfer"  text-sm font-medium
Textarea  rows=4
Placeholder: "Describe the clinical reason for requesting access to this patient's records..."
Validation: required, min 20 characters
Help text: text-xs text-muted-foreground "This reason will be reviewed by the source hospital."
```

#### Access Type (required)
```
Label: "Access Type"  text-sm font-medium  mb-2
Radio group — card-style options (grid grid-cols-1 gap-3):

  VIEW_ONLY card:
    flex items-start gap-3 p-4 border rounded-lg cursor-pointer
    Selected: border-primary bg-primary/5
    Unselected: border-border hover:border-primary/50
    Left: radio input
    Right:
      Eye icon (text-primary, size 18) + "View Only"  text-sm font-medium text-foreground
      "Read patient records without making any changes."  text-xs text-muted-foreground

  VIEW_AND_EDIT card:
    Same structure
    Pencil icon (text-primary) + "View & Edit"
    "View records and add new clinical data for this patient."  text-xs text-muted-foreground
```

#### Footer
```
flex justify-end gap-2
[Cancel]  variant="outline"
[Submit Access Request]  variant="default"  bg-primary  Send icon left
```

**Toast:** `toast.success('Access Request Submitted', { description: 'The source hospital has been notified of your request.' })`

---

### Page 11.3 — Transfer Requests List

**Route:** `/transfers`
**SRS:** REQ-F-051, REQ-F-054, REQ-F-055, REQ-F-056

**Layout:** Page title "Patient Transfers" `text-2xl font-semibold`.

#### Tab Row
```
"Incoming Requests" | "Outgoing Requests" | "Active Grants" | "Expired Grants"
Active: border-b-2 border-primary text-primary font-medium text-sm
Inactive: text-muted-foreground hover:text-foreground text-sm
```

---

**Incoming Requests Tab:**
```
Table (white card, shadow-sm):
Columns: Requesting Hospital | Patient Name | Access Type | Received | Status | Action

Access Type badge: "View Only" (Eye icon, gray) | "View & Edit" (Pencil icon, teal)
Status badges: Pending (amber+Clock) | Approved (green+CheckCircle) | Denied (red+XCircle)
Action column:
  Pending rows: "Review" button  variant="outline"  border-primary text-primary  size-sm
                → navigates to /transfers/requests/{id}
  Decided rows: no action (view-only row)
```

**Empty state:** `ArrowLeftRight` icon + "No incoming transfer requests."

---

**Outgoing Requests Tab:**
```
Table:
Columns: Patient Name | Source Hospital | Access Type | Submitted | Status
(Same badge patterns — no action column, read-only)
```

---

**Active Grants Tab:**
```
Table:
Columns: Patient Name | Source Hospital | Access Type | Granted | Expires | Action

Expires column:
  Normal (> 24h away): text-sm text-foreground
  Expiring soon (≤ 24h): text-sm text-[#78350F] + Clock icon (amber, size 12) inline + "Expires soon"

Action column:
  For source hospital admin: "Revoke" button  variant="outline"  border-destructive text-destructive  ShieldOff icon  size-sm
  For receiving hospital: "Renew" link  text-sm text-primary
```

---

**Expired Grants Tab:**
```
Table:
Columns: Patient Name | Source Hospital | Access Type | Expired On | Action
All row text: text-muted-foreground  (muted to indicate inactive)
Action: "Request Renewal"  variant="outline"  border-primary text-primary  size-sm
        → opens Page 11.2 with patient pre-populated
```

**Empty state for any tab:** `ArrowLeftRight` icon (muted, 48px) + appropriate "No {tab name}." message

---

### Page 11.4 — Transfer Request Review / Approval

**Route:** `/transfers/requests/{id}`
**SRS:** REQ-F-052, REQ-F-053

**Layout:**
```
Back link: "← Patient Transfers"  text-sm text-primary  ArrowLeft icon
Page title: "Transfer Access Request"  text-2xl font-semibold
```

Two-column layout: `grid grid-cols-1 lg:grid-cols-3 gap-6`

#### Left Column (lg:col-span-2) — Request Details Card (white card, p-6)

```
Section heading: "Request Details"  text-lg font-semibold  mb-4

Label-value pairs (space-y-3):
  Requesting Hospital:  text-sm font-medium text-foreground
                        Sub: text-xs text-muted-foreground (city, region)
  Patient Name:         text-sm font-medium text-foreground (source hospital's patient)
  Access Type:          badge (Eye icon + "View Only" or Pencil + "View & Edit")
  Request Received:     text-sm text-muted-foreground (datetime)

Separator  my-4

"Reason for Transfer" sub-heading  text-sm font-semibold  mb-2
Full reason text: text-sm text-foreground  bg-muted rounded-md p-3
```

#### Right Column (lg:col-span-1) — Decision Panel Card (white card, p-6)

```
"Review Decision"  text-lg font-semibold  mb-4
```

**If Status = Pending:**
```
Current status badge (large, centered, mb-4):
  Pending: Clock icon + "Pending Review"  amber styling  py-2 px-4 text-sm font-medium

Access Duration field:
  Label: "Grant Duration"  text-sm font-medium
  Flex row: number input (w-20) + "days" text-sm text-muted-foreground
  Default value: 7
  Help: text-xs text-muted-foreground "Grant expires after this many days."

Buttons (space-y-3 mt-6):
  [Approve Access]
    variant="default"  bg-primary  full-width
    CheckCircle icon (left)  text-sm font-medium
  [Deny Request]
    variant="destructive"  full-width
    XCircle icon (left)  text-sm font-medium
    → triggers Confirmation Dialog (UI-010)
```

**Deny Confirmation Dialog:**
```
Title: "Deny Transfer Request"
Body: "This will deny access to {Patient Name}'s records for {Requesting Hospital}.
       The requesting hospital will be notified by email."
Footer: [Cancel] outline  |  [Deny Request] destructive
```

**If Status = Approved:**
```
Large green CheckCircle + "Access Approved"  text-lg font-semibold text-[#10B981]
Details: Approved by | Approved on | Expires on
```

**If Status = Denied:**
```
Large red XCircle + "Request Denied"  text-lg font-semibold text-destructive
Details: Denied by | Denied on
```

**Toast on approve:** `toast.success('Access Approved', { description: 'The requesting hospital can now access this patient\'s records.' })`
**Toast on deny:** `toast.info('Request Denied', { description: 'The requesting hospital has been notified.' })`

---

### Page 11.5 — Transferred Patient Record View

**Route:** `/transfers/patients/{patient_id}`
**SRS:** REQ-F-055

**Layout:** Identical structure to Patient Profile Page (Phase 6, Page 6.1): left sticky summary column (280px) + right tab column.

**Additional element — Access Expiry Banner (always visible, top of right column):**
```
bg-[#F59E0B]/15  border border-[#F59E0B]  rounded-md  px-4 py-3
flex items-center justify-between  mb-4

Left: Clock icon (text-[#F59E0B], size 16, shrink-0)
      text-sm font-medium text-[#78350F]:
      "Transfer Access Expires On: {Date, Time}"

Right: "Request Renewal"  variant="outline"  border-primary text-primary  text-sm
       → links to Page 11.2 with patient pre-populated
```

**VIEW_ONLY access restriction:**
```
When access type = VIEW_ONLY:
  Disable all "New Encounter", "Add", "Amend", "Request Lab Test", "Add Prescription" buttons
  Disabled button: opacity-50 cursor-not-allowed
  Below each disabled button: text-xs text-muted-foreground
    "You have view-only access to this patient's records."
```

Left column summary card, tabs, and all content are identical to Page 6.1. The source hospital name is shown as an additional label:
```
Source Hospital: text-xs text-muted-foreground "Transferred from: {Hospital Name}"
```

---

### Page 11.6 — Proactive Transfer Grant

**Route:** `/transfers/grant/new`
**Also accessible from:** "Grant Access to Another Hospital" button on Patient Profile Page 6.1 (left column, visible to Hospital Admin only — `ArrowLeftRight` icon, `variant="outline"`)
**SRS:** REQ-F-057

**Layout:** Page title "Grant Patient Access to Another Hospital" `text-2xl font-semibold`. White card `max-w-[560px] mx-auto`.

#### Form Fields (space-y-5)

**Patient (context-dependent):**
```
If opened from Patient Profile (patient pre-populated):
  bg-muted rounded-md p-3
  "Patient: {Full Name}  ·  {Patient ID}"  text-sm font-medium text-foreground
  Read-only — cannot change

If opened directly (/transfers/grant/new):
  Searchable combobox input
  Placeholder: "Search patient by name or ID..."
  Dropdown: Patient ID | Full Name | DOB rows  text-sm
```

**Receiving Hospital (required):**
```
Label: "Receiving Hospital"  text-sm font-medium
Search input — type to search registered hospitals
Dropdown results: Hospital Name (text-sm font-medium) + Region · Type (text-xs text-muted-foreground)
Selected state: shows chosen hospital in a muted box below
```

**Access Type (required):**
```
Label: "Access Type"  text-sm font-medium  mb-2
Card-style radio group — same design as Page 11.2:
  VIEW_ONLY card:  Eye icon + "View Only" + description
  VIEW_AND_EDIT card: Pencil icon + "View & Edit" + description
```

**Access Duration (required):**
```
Label: "Access Duration"  text-sm font-medium
flex items-center gap-2:
  Number input  w-24  default value: 7
  "days"  text-sm text-muted-foreground
Right of label: Info icon tooltip (UI-011):
  "The grant will automatically expire after this many days.
   The receiving hospital can request a renewal before or after it expires."
```

**Info Note (always visible):**
```
bg-[#0D9488]/10  border border-[#0D9488]  rounded-md  p-3
Info icon (text-primary, size 14) inline
text-sm text-muted-foreground:
  "This grants the selected hospital immediate access to this patient's records
   without requiring them to submit an access request first."
```

#### Footer
```
flex justify-end gap-2
[Cancel]  variant="outline"
[Grant Access]  variant="default"  bg-primary  CheckCircle icon left
```

**Toast:** `toast.success('Access Granted', { description: 'The receiving hospital now has access to this patient\'s records.' })`

---

## PHASE 12 — Role-Specific Dashboards

**Module:** Dashboard
**SRS Coverage:** REQ-F-058, REQ-F-059, REQ-F-060, REQ-F-063, UI-002
**Shell:** Full Sidebar + Topbar. Active nav item: Dashboard (`LayoutDashboard` icon)

All dashboards use the metric card pattern:
```
Stat Card (white card, border, rounded-lg, p-5):
  Top row: label (text-xs font-semibold uppercase tracking-wide text-muted-foreground) + icon in colored circle (right)
  Bottom: value  text-4xl font-bold text-foreground
  Optional: trend indicator text-xs below value
```

Charts use **Recharts** library: teal (`#0D9488`) as primary color for bars and lines.

---

### Page 12.1 — Doctor Dashboard

**Route:** `/dashboard` (role = Doctor)
**SRS:** REQ-F-059

**Page title:** "Good morning, Dr. {Name}" `text-2xl font-semibold`
**Subtitle:** today's date `text-sm text-muted-foreground`

#### Row 1 — Today's Appointments (white card, full-width, p-5)
```
Card header row: flex justify-between items-center mb-4
  "Today's Appointments"  text-lg font-semibold
  Date subtitle: text-sm text-muted-foreground

Appointment list (divide-y divide-border):
  Each row: flex items-center justify-between py-3
    Left:   time  text-sm font-mono text-foreground  |  Patient Name text-sm font-medium
    Center: appointment type badge  |  unit text-xs text-muted-foreground
    Right:  "Open"  text-sm text-primary  ArrowRight icon

Empty state: "No appointments scheduled for today."  text-sm text-muted-foreground  text-center py-8
```

#### Row 2 — Two cards (grid-cols-1 lg:grid-cols-2 gap-4)

**Pending Lab Results (white card, p-5):**
```
"Pending Lab Results"  text-lg font-semibold  mb-4

Table (divide-y divide-border):
  Columns: Patient | Test | Requested
  Urgent rows: bg-destructive/5  (red tint)
  Each row right: "View"  text-sm text-primary

Empty: FlaskConical icon + "No pending lab results."
```

**Recent Diagnoses (white card, p-5):**
```
"Recent Diagnoses"  text-lg font-semibold  mb-4

List (space-y-3):
  Each item: flex justify-between
    Left: patient name (text-sm font-medium) + condition (text-xs text-muted-foreground)
    Right: date (text-xs text-muted-foreground)

Max 10 items shown. "View All" link at bottom right.
```

---

### Page 12.2 — Nurse Dashboard

**Route:** `/dashboard` (role = Nurse)

**Page title:** "Good morning, {Name}" `text-2xl font-semibold`

#### Row 1 — Assigned Patients Today (white card, full-width, p-5)
```
"Assigned Patients Today"  text-lg font-semibold + date subtitle

Table (divide-y):
  Columns: Patient Name | Appointment Time | Unit | Status | Action
  Status badge: Arrived (green), Waiting (amber), Completed (teal)
  Action: "View Patient"  text-sm text-primary

Empty: "No patients assigned for today."
```

#### Row 2 — Two cards (grid-cols-1 lg:grid-cols-2 gap-4)

**Pending Vitals (white card, p-5):**
```
"Pending Vitals"  text-lg font-semibold
Subtext: "Patients with an encounter today but no vitals recorded."  text-xs text-muted-foreground  mb-4

List: Patient name + encounter time + "Record Vitals" teal link per row
Empty: "All patients have vitals recorded today."  text-[#10B981]  CheckCircle icon
```

**Recent Interactions (white card, p-5):**
```
"Recent Nursing Updates"  text-lg font-semibold  mb-4
Last 5 patients interacted with:
  Each: Patient name + last action (text-xs text-muted-foreground) + time
```

---

### Page 12.3 — Lab Technician Dashboard

**Route:** `/dashboard` (role = Lab Technician)

**Page title:** "Lab Dashboard" `text-2xl font-semibold`

#### Row 1 — 3 Stat Cards (grid-cols-1 md:grid-cols-3 gap-4)
```
Pending Tests Today:
  value: text-4xl font-bold text-[#F59E0B]
  icon: Clock (bg-[#F59E0B]/10 rounded-lg p-2)
  label: "Pending Tests Today"

Completed Tests Today:
  value: text-4xl font-bold text-[#10B981]
  icon: CheckCircle (bg-[#10B981]/10)
  label: "Completed Today"

Critical Results Flagged:
  value: text-4xl font-bold text-destructive
  icon: AlertOctagon (bg-destructive/10)
  label: "Critical Results"
```

#### Row 2 — Work Queue Preview (white card, full-width, p-5)
```
Card header: flex justify-between
  "Today's Work Queue"  text-lg font-semibold
  "View Full Queue →"  text-sm text-primary

Shows same table as Page 9.1 (Lab Work Queue) filtered to today's items only
(same columns, badges, "Enter Result" action)
"Showing today's items only."  text-xs text-muted-foreground  below table
```

---

### Page 12.4 — Receptionist / Data Clerk Dashboard

**Route:** `/dashboard` (role = Receptionist or Data Clerk)

**Page title:** "Good morning, {Name}" `text-2xl font-semibold`

#### Row 1 — 3 Stat Cards (grid-cols-1 md:grid-cols-3 gap-4)
```
Appointments Today:
  value: text-4xl font-bold text-primary
  icon: Calendar (bg-primary/10)

Patients Registered This Week:
  value: text-4xl font-bold text-[#10B981]
  icon: UserPlus (bg-[#10B981]/10)

Pending Bulk Upload Jobs:
  value: text-4xl font-bold text-[#F59E0B]
  icon: Upload (bg-[#F59E0B]/10)
```

#### Row 2 — Today's Appointment Schedule (white card, full-width, p-5)
```
Card header: flex justify-between
  "Today's Appointment Schedule"  text-lg font-semibold + date
  "New Appointment"  variant="default"  bg-primary  CalendarPlus icon  text-sm

Appointment list (divide-y divide-border):
  Each row: flex justify-between items-center py-3
    Time: text-sm font-mono text-foreground  (e.g. "09:00")
    Patient name: text-sm font-medium
    Appointment type badge
    Clinician: text-xs text-muted-foreground

Sorted ascending by appointment time.
```

---

### Page 12.5 — Hospital Admin Dashboard

**Route:** `/dashboard` (role = Hospital Admin)
**SRS:** REQ-F-060

**Page title:** "Hospital Dashboard" `text-2xl font-semibold`
**Subtitle:** "{Facility Name}" `text-sm text-muted-foreground`

#### Row 1 — 4 Stat Cards (`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4`)
```
Patient Registrations This Month:
  value: text-4xl font-bold text-foreground
  icon: Users (bg-primary/10 text-primary)

Clinical Encounters This Month:
  value: text-4xl font-bold text-foreground
  icon: Stethoscope (bg-primary/10 text-primary)

Average Lab Turnaround:
  value: text-4xl font-bold text-foreground
  unit label: "hours"  text-sm text-muted-foreground  below value
  icon: FlaskConical (bg-[#10B981]/10 text-[#10B981])
  Info tooltip (UI-011) on label: "Average time between lab test request and result submission,
    for tests completed this month."

Active Staff Members:
  value: text-4xl font-bold text-foreground
  icon: UserCog (bg-primary/10 text-primary)
```

#### Row 2 — Two Recharts Cards (grid-cols-1 lg:grid-cols-2 gap-4)

**Top 5 Diagnoses (white card, p-5):**
```
Card header: flex justify-between items-start
  "Top 5 Diagnoses This Month"  text-lg font-semibold
  "Export PNG"  variant="ghost"  text-xs text-muted-foreground  Download icon

Recharts BarChart (horizontal):
  layout="vertical"
  Y-axis: diagnosis names  text-xs text-muted-foreground
  X-axis: count  text-xs text-muted-foreground
  Bar fill: #0D9488  (primary teal)
  CartesianGrid: stroke #E2E8F0  strokeDasharray="3 3"
  Tooltip: styled bg-card border border-border rounded shadow-sm text-sm
  Legend: text-xs font-medium text-foreground centered below chart
```

**Monthly Encounters Trend (white card, p-5):**
```
Card header: flex justify-between items-start
  "Encounters Trend"  text-lg font-semibold
  "Export PNG"  variant="ghost"  text-xs  Download icon

Recharts LineChart:
  X-axis: month names  text-xs text-muted-foreground
  Y-axis: encounter count  text-xs text-muted-foreground
  Line stroke: #0D9488  strokeWidth=2
  Dot: fill #0D9488  r=4
  CartesianGrid: same as above
  Tooltip: same card style
```

#### Row 3 — Staff Activity Summary (white card, p-5)
```
"Staff Activity This Month"  text-lg font-semibold  mb-4

Table (divide-y):
  Columns: Staff Name | Role badge | Encounters This Month | Last Active
  text-sm  text-foreground in rows
  Role badge: bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded
  Last Active: text-sm text-muted-foreground
```

---

### Page 12.6 — Ministry / Public Health Officer Dashboard

**Route:** `/dashboard` (role = Ministry Officer)
**SRS:** REQ-F-063

**Page title:** "Public Health Overview" `text-2xl font-semibold`

#### Anonymisation Notice (always at top)
```
bg-[#0D9488]/10  border border-[#0D9488]  rounded-md  p-3  mb-6
flex items-start gap-3
Info icon (text-primary, size 16, shrink-0 mt-0.5)
text-sm text-foreground:
  "This dashboard displays anonymised aggregate data only. No individual patient
   identifiers are included. Data shown represents only patients who have
   consented to public health reporting."
```

#### Row 1 — 3 Stat Cards (grid-cols-1 md:grid-cols-3 gap-4)
```
Total Cases by Disease Category (This Month):
  value: text-4xl font-bold text-foreground
  icon: BarChart2 (bg-primary/10 text-primary)

Total Admissions (This Month):
  value: text-4xl font-bold text-foreground
  icon: Activity (bg-[#10B981]/10 text-[#10B981])

Hospitals Reporting:
  value: text-4xl font-bold text-foreground
  icon: Building2 (bg-[#6366F1]/10 text-[#6366F1])
```

#### Row 2 — Disease Category Bar Chart (white card, full-width, p-5)
```
Card header: "Disease Categories This Month"  text-lg font-semibold  +  "Export PNG" ghost button

Recharts BarChart (vertical):
  X-axis: disease categories (ICD groupings)  text-xs text-muted-foreground  angle=-30
  Y-axis: case count  text-xs text-muted-foreground
  Bar fill: #0D9488
  Multi-hospital aggregated values
  Note below chart: text-xs text-muted-foreground "Aggregated across all reporting hospitals."
```

#### Row 3 — Two cards (grid-cols-1 lg:grid-cols-2 gap-4)

**Monthly Admission Trend (white card, p-5):**
```
"Monthly Admissions Trend"  text-lg font-semibold  +  "Export PNG" ghost button

Recharts LineChart:
  X-axis: months  text-xs text-muted-foreground
  Y-axis: admission count  text-xs text-muted-foreground
  Line: stroke #0D9488  strokeWidth=2
```

**Regional Distribution Table (white card, p-5):**
```
"Regional Distribution"  text-lg font-semibold  mb-4

Table:
  Columns: Region / District | Case Count | % of Total
  Sorted: descending by Case Count
  % column: text-sm text-muted-foreground
  Top region row: font-semibold text-foreground (highlighted)
```

---

## PHASE 13 — Analytics & Filter Query Builder

**Module:** Analytics
**SRS Coverage:** REQ-F-061, REQ-F-062, UI-006, UI-007
**Shell:** Full Sidebar + Topbar.
**Active nav item:** Analytics (`BarChart2` icon)

---

### Page 13.1 — Analytics Filter & Query Builder

**Route:** `/analytics`

**Layout:** Page title "Analytics & Reports" `text-2xl font-semibold`.

Two-panel layout: `flex gap-6`

#### Left Panel — Filters (width: 280px, shrink-0, sticky top-22)

White card, p-5:

```
"Filters"  text-lg font-semibold  mb-4

Filter groups (space-y-5):
```

**Date Range:**
```
Label: "Date Range"  text-sm font-semibold text-foreground  mb-2
grid grid-cols-2 gap-2:
  "From" date picker  |  "To" date picker
  Each with text-xs label above: text-xs text-muted-foreground
```

**Clinical Unit:**
```
Label: "Clinical Unit"  text-sm font-semibold  mb-2
Multi-select dropdown
Placeholder: "All units"
Selected: shown as pill tags inside input
```

**Diagnosis Category:**
```
Label: "Diagnosis Category"  text-sm font-semibold  mb-2
Multi-select dropdown
Placeholder: "All categories"
```

**Patient Age Group:**
```
Label: "Patient Age Group"  text-sm font-semibold  mb-2
Checkbox list (space-y-2):
  □ 0–14   □ 15–29   □ 30–44   □ 45–59   □ 60+
Each: text-sm text-foreground + checkbox (accent: teal)
```

**Patient Region/District:**
```
Label: "Region / District"  text-sm font-semibold  mb-2
Multi-select dropdown  Placeholder: "All regions"
```

**Test Type:**
```
Label: "Test Type (Lab)"  text-sm font-semibold  mb-2
Multi-select dropdown  Placeholder: "All tests"
```

**Group Results By:**
```
Label: "Group Results By"  text-sm font-semibold  mb-2
Radio group:  (●) Day  (○) Week  (○) Month
text-sm text-foreground per option
```

**Filter Action Row (bottom of left panel):**
```
Separator  mb-4
[Apply Filters]  variant="default"  bg-primary  full-width  text-sm
[Reset]  variant="ghost"  text-primary  full-width  text-sm  mt-2
```

#### Right Panel — Chart Area (flex-1)

**Chart Type Selector (tabs — UI-006):**
```
Tab row (bg-muted rounded-md p-1 inline-flex mb-4):
  [BarChart2 icon + "Bar Chart"] [TrendingUp icon + "Line Chart"] [PieChart icon + "Pie Chart"]
  Active: bg-primary text-primary-foreground rounded px-3 py-1.5 text-sm font-medium
  Inactive: text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm
  Switching tabs: updates chart type without page reload
```

**Chart Canvas (white card, p-5):**
```
Card header: flex justify-between items-start mb-4
  Dynamic title: text-lg font-semibold text-foreground
    (e.g. "Encounters by Clinical Unit — Jan–Jun 2026")
  "Export as PNG"  variant="ghost"  text-xs text-muted-foreground  Download icon (size 14)

Chart area: min-h-[360px]
  Recharts component matching selected chart type
  Bar chart:  fill #0D9488  CartesianGrid stroke #E2E8F0
  Line chart: stroke #0D9488  strokeWidth=2
  Pie chart:  primary slice #0D9488, secondary colors from design palette
  Threshold breach points: amber (#F59E0B) for abnormal, red (#EF4444) for critical
  Axis labels: text-xs text-muted-foreground  both axes
  Legend: centered below, text-xs font-medium text-foreground
```

**Empty State (no filters applied):**
```
flex flex-col items-center justify-center  min-h-[360px]  gap-3
BarChart2 icon (text-muted-foreground opacity-30, size-16)
"Apply filters to generate a report."  text-sm font-medium text-foreground
"Use the filter panel on the left to select dimensions."  text-xs text-muted-foreground
```

**Data Table (below chart card, white card, p-5):**
```
Card header: flex justify-between items-center mb-4
  "Tabular Data"  text-sm font-semibold text-muted-foreground
  "Download as CSV"  variant="outline"  text-primary border-primary  Download icon  text-xs

Table: same data as chart in tabular form
  Header: bg-muted text-xs uppercase
  Rows: text-sm text-foreground  divide-y divide-border
  Pagination if > 20 rows
```

---

## PHASE 14 — Notifications & Clinical Audit Log

**Module:** Notifications + Audit
**SRS Coverage:** REQ-F-064, REQ-F-065, REQ-F-068, REQ-F-069, REQ-F-070, REQ-F-071
**Shell:** Full Sidebar + Topbar.

---

### Page 14.1 — Notifications Full List Page

**Route:** `/notifications`
**SRS:** REQ-F-064, REQ-F-065
**Active nav item:** (notification bell in topbar, or direct nav link)

**Layout:** Page title "Notifications" `text-2xl font-semibold`.

#### Controls Row (flex justify-between items-center mb-4)
```
Left: Tab row: "All" | "Unread" | "Critical" | "System"
  Active: border-b-2 border-primary text-primary text-sm font-medium
  Inactive: text-muted-foreground hover:text-foreground text-sm

Right: flex gap-3 items-center
  Date range: "From" date picker + "To" date picker (compact, size-sm)
  "Mark All as Read"  variant="outline"  border-primary text-primary  text-sm
    (shown only when unread count > 0)
```

#### Notification List (white card, divide-y divide-border)

**Each notification row:**
```
flex items-start gap-4  p-4

Unread: bg-primary/5  border-l-4 border-l-primary
Read:   bg-card  border-l-4 border-l-transparent

Left: icon in colored circle (size-9, rounded-full, flex-shrink-0):
  Critical lab:       AlertOctagon  bg-destructive/10  text-destructive
  Transfer request:   ArrowLeftRight  bg-primary/10  text-primary
  Appointment change: Calendar  bg-[#6366F1]/10  text-[#6366F1]
  ETL complete:       Upload  bg-[#10B981]/10  text-[#10B981]
  Staff account:      UserPlus  bg-secondary  text-muted-foreground

Center (flex-1):
  Title: text-sm font-medium text-foreground
  Body:  text-xs text-muted-foreground  mt-0.5  (max 2 lines, truncate)
  Link:  text-xs text-primary  mt-1  (if notification links to a specific record)

Right (shrink-0):
  Timestamp: text-xs text-muted-foreground  text-right
  Unread indicator dot: w-2 h-2 rounded-full bg-primary  (if unread)
```

**Clicking a notification row:** marks it as read, updates styling from unread to read instantly.

**Empty State:**
```
flex flex-col items-center justify-center  min-h-64  gap-3
Bell icon (text-muted-foreground opacity-30, size-12)
"No notifications."  text-sm font-medium text-foreground
"You're all caught up."  text-xs text-muted-foreground
```

**Pagination:** "Previous" / "Next" buttons + "Page X of N" — bottom of list card.

---

### Page 14.2 — Clinical Audit Log

**Route:** `/audit`
**SRS:** REQ-F-068, REQ-F-069, REQ-F-070
**Active nav item:** Audit Log (`Shield` icon)
**Access:** Hospital Admin only.

**Layout:**
```
Page title: "Clinical Audit Log"  text-2xl font-semibold
Subtitle: text-sm text-muted-foreground
  "All patient data access and modification events recorded by this facility.
   This log is immutable and cannot be modified."
```

#### Filter Bar (white card, p-4, mb-4)
```
flex flex-wrap gap-3 items-end

Patient search input:
  Search icon left  Placeholder: "Patient name or ID..."  width: 220px

Staff member dropdown:
  Select: "All Staff"  width: 180px

Action Type dropdown:
  Select: "All Actions"
  Options: READ / CREATE / UPDATE / AMEND / DELETE / TRANSFER_GRANT / TRANSFER_REVOKE / CONSENT_CHANGE
  width: 200px

Date From picker:   text-sm  width: 150px
Date To picker:     text-sm  width: 150px

[Search]  variant="default"  bg-primary  text-sm  Search icon left
```

#### Results Table (white card, shadow-sm)

```
Header: bg-muted  text-xs font-semibold uppercase tracking-wide text-muted-foreground  px-4 py-3
Columns: Timestamp (WAT) | Staff Member | Patient | Action Type | Resource | IP Address

Table characteristics:
  All columns: text-sm text-foreground
  Timestamp: text-xs font-mono text-muted-foreground (e.g. "2026-06-16 09:42:13 WAT")
  IP Address: text-xs font-mono text-muted-foreground
  Resource: text-xs text-muted-foreground (e.g. "encounter/enc-0042")
  NO edit, delete, or action buttons anywhere in this table

Action Type badges (text-xs font-medium rounded px-2 py-0.5):
  READ:             bg-secondary   text-secondary-foreground
  CREATE:           bg-[#10B981]/10  text-[#10B981]
  UPDATE:           bg-[#0D9488]/10  text-primary
  AMEND:            bg-[#F59E0B]/10  text-[#78350F]
  DELETE:           bg-destructive/10  text-destructive
  TRANSFER_GRANT:   bg-[#6366F1]/10  text-[#6366F1]
  TRANSFER_REVOKE:  bg-[#6366F1]/10  text-[#6366F1]
  CONSENT_CHANGE:   bg-primary/10  text-primary
```

**Immutability Notice (bottom of page):**
```
flex items-center gap-2  mt-4  text-xs text-muted-foreground
Lock icon (size 12, text-muted-foreground)
"Audit log entries are immutable and append-only in accordance with
 Cameroon Data Protection Law No. 2010/012."
```

**Pagination (bottom of table card):**
```
flex justify-between items-center  px-4 py-3  border-t border-border
Left: "Showing 1–25 of {total} entries"  text-xs text-muted-foreground
Right: [← Previous]  [1]  [2]  [3]  ...  [Next →]  text-sm buttons
  Active page: bg-primary text-primary-foreground rounded px-2 py-1
  Other pages: text-foreground hover:bg-accent px-2 py-1 rounded
```

---

## PHASE 15 — Settings & Account Management

**Module:** Settings
**SRS Coverage:** REQ-F-005, REQ-F-013, UI-001
**Shell:** Full Sidebar + Topbar.
**Active nav item:** Settings (`Settings` icon)

---

### Page 15.1 — Change Password

**Route:** `/settings/password`
**SRS:** REQ-F-005, UI-001

**Layout:** Page title "Change Password" `text-2xl font-semibold`. White card `max-w-[480px] mx-auto`.

#### Form Fields (space-y-5)

**Current Password (required):**
```
Label: "Current Password"  text-sm font-medium
Password input + show/hide toggle (Eye / EyeOff Lucide icon, right slot)
Placeholder: "Enter your current password"
```

**New Password (required):**
```
Label: "New Password"  text-sm font-medium
Password input + show/hide toggle
Placeholder: "Enter new password (min. 10 characters)"
```

**Password Strength Bar (live, below New Password field):**
```
Thin progress bar (h-1.5, w-full, bg-muted, rounded-full):
  Weak (1–3):   bg-destructive  width: 33%
  Fair (4–6):   bg-[#F59E0B]    width: 66%
  Strong (7–9): bg-[#10B981]    width: 100%
Label right: "Weak" / "Fair" / "Strong"  text-xs in matching color  ml-2
```

**Password Policy Checklist (live, below strength bar):**
```
space-y-1  mt-2

Each rule row: flex items-center gap-2  text-xs
  Passing: CheckCircle icon (text-[#10B981], size 13) + text-foreground
  Failing: XCircle icon (text-muted-foreground, size 13) + text-muted-foreground

Rules:
  ✓ At least 10 characters
  ✓ Contains an uppercase letter
  ✓ Contains a number
  ✓ Contains a special character (e.g. !@#$%^&*)
```

**Confirm New Password (required):**
```
Label: "Confirm New Password"  text-sm font-medium
Password input + show/hide toggle
Validation: if passwords do not match →
  border-destructive on input +
  AlertCircle (size 12) + text-xs text-[#DC2626] "Passwords do not match."
```

#### Form Footer
```
border-t border-border  pt-4  flex justify-end
[Update Password]  variant="default"  bg-primary  text-sm
```

**Toast on success:** `toast.success('Password Updated', { description: 'Please use your new password on next login.' })`

---

### Page 15.2 — My Profile / Account Settings

**Route:** `/settings/profile`

**Layout:** Page title "My Profile" `text-2xl font-semibold`. White card `max-w-[560px] mx-auto`.

#### Profile Summary Section (top of card, p-6)

```
flex items-start gap-5

Left: Avatar circle  w-16 h-16 rounded-full bg-primary  flex items-center justify-center
  Initials: text-xl font-bold text-primary-foreground

Right (flex-1 space-y-1):
  Name:    text-xl font-semibold text-foreground
  Email:   text-sm text-muted-foreground  (with Mail icon size 13 inline)
  Role:    badge pill  bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full
  Hospital: text-sm text-muted-foreground  (with Building2 icon size 13 inline)
  Account created: text-xs text-muted-foreground  (e.g. "Member since March 2025")
```

**Separator**

#### Account Status Section (p-6)
```
flex items-center justify-between
  "Account Status"  text-sm font-medium text-foreground
  Status badge:
    Active:      CheckCircle + "Active"   bg-[#10B981]/10 text-[#10B981]  px-3 py-1.5 text-sm rounded-md
    Deactivated: XCircle + "Deactivated" bg-destructive/10 text-destructive  same sizing
```

**Separator**

#### Bottom Section (p-6 space-y-4)
```
Info note (muted):
  text-xs text-muted-foreground with Info icon
  "To update your name, email, or role, contact your Hospital Administrator."

"Change Password" link:
  text-sm text-primary  KeyRound icon (size 14) left  underline-offset-4 hover:underline
  → links to /settings/password
```

---

### Page 15.3 — Super Admin: System Configuration

**Route:** `/super-admin/settings`
**Shell variant:** Super Admin sidebar (Dashboard | Hospital Registrations | All Hospitals | System Settings)
**Active nav item:** Settings (`Settings` icon)

**Layout:** Page title "System Configuration" `text-2xl font-semibold`. White card `max-w-[640px] mx-auto`.

#### Form Sections

**Section heading "Platform Settings"** + Separator:

**Platform Name:**
```
Label: "Platform Name"  text-sm font-medium
Text input  full-width  value: "Healthcare Information System (HIS)"
Note below: text-xs text-muted-foreground "Read-only in the current MVP release."
Input: disabled / bg-muted  cursor-not-allowed
```

**Section heading "Session & Security"** + Separator:

**Default Session Timeout:**
```
Label: "Default Session Timeout"  text-sm font-medium
flex items-center gap-2:
  Number input  w-24  default: 60
  "minutes"  text-sm text-muted-foreground
Help: text-xs text-muted-foreground  "Staff sessions will expire after this many minutes of inactivity."
```

**Section heading "Transfer Defaults"** + Separator:

**Default Transfer Grant Duration:**
```
Label: "Default Transfer Grant Duration"  text-sm font-medium
flex items-center gap-2:
  Number input  w-24  default: 7
  "days"  text-sm text-muted-foreground
Help: text-xs text-muted-foreground  "Default access duration pre-filled when approving transfer requests."
```

**Section heading "Notifications"** + Separator:

**Daily Summary Email Time:**
```
Label: "Daily Summary Email Time"  text-sm font-medium
flex items-center gap-2:
  Time picker input  w-36  default: "08:00"
  "WAT (West Africa Time, UTC+1)"  text-xs text-muted-foreground
Help: text-xs text-muted-foreground  "Time at which daily summary emails are dispatched to hospital administrators."
```

#### Form Footer
```
border-t border-border  pt-4  flex justify-end
[Save Configuration]  variant="default"  bg-primary  Save icon left
```

**Toast on success:** `toast.success('Configuration Saved', { description: 'System settings have been updated.' })`

---

## PHASE SUMMARY TABLE (7–15)

| Phase | Module | Pages | Routes | SRS Coverage |
|---|---|---|---|---|
| 7 | Appointment Scheduling | 4 | `/appointments`, `/appointments?view=week`, `/appointments/new`, dialog | REQ-F-029–REQ-F-033 |
| 8 | Clinical Encounter | 6 | `/patients/{id}/encounters/new`, `/patients/{id}/encounters/{id}`, + 4 modals | REQ-F-034–REQ-F-038 |
| 9 | Laboratory Results | 3 | `/laboratory/queue`, `/laboratory/results/new/{id}`, `/laboratory/results/{id}` | REQ-F-039–REQ-F-043 |
| 10 | Bulk Data Ingestion | 2 | `/bulk-upload`, `/bulk-upload/status/{id}` | REQ-F-044–REQ-F-048 |
| 11 | Patient Transfers | 6 | `/transfers/search`, `/transfers/request/new`, `/transfers`, `/transfers/requests/{id}`, `/transfers/patients/{id}`, `/transfers/grant/new` | REQ-F-049–REQ-F-057 |
| 12 | Role-Specific Dashboards | 6 | `/dashboard` (6 role variants) | REQ-F-058–REQ-F-060, REQ-F-063 |
| 13 | Analytics & Query Builder | 1 | `/analytics` | REQ-F-061, REQ-F-062 |
| 14 | Notifications & Audit Log | 2 | `/notifications`, `/audit` | REQ-F-064–REQ-F-071 |
| 15 | Settings & Account | 3 | `/settings/password`, `/settings/profile`, `/super-admin/settings` | REQ-F-005, UI-001 |

**Total pages in phases 7–15: 33 screens + 7 modals/dialogs**

---

## CRITICAL REMINDERS FOR STITCH

1. **Shell is mandatory.** Every page in Phases 7–15 must have the Sidebar (240px on lg, 64px on md) and Topbar (64px). No exceptions. If Stitch generates a page without them, add them.

2. **Amber is not for appointments.** Appointment type colors: Consultation=Teal, Follow-up=Indigo, Laboratory=Blue, Procedure=Purple. Amber (`#F59E0B`) is reserved for clinical warning states only.

3. **Status badges always use icon + color.** Never use color alone to convey clinical state. Every badge must pair an icon with its color.

4. **Amend links are conditional (REQ-F-028).** The "Amend this Encounter" and "Amend this Result" links must only render if the logged-in user is the original author OR holds Hospital Admin role. Do not show them to other users, even if they hold `patient:amend` permission.

5. **Privacy on transfer search (REQ-F-049).** The transfer patient search results must never display DOB, phone, address, Patient ID, or clinical data. Only patient name + source hospital name.

6. **Consent guard on encounter creation (REQ-F-034).** If patient consent is Refused, show the red banner and disable the submit button. The guard is non-negotiable.

7. **Audit log is read-only (REQ-F-070).** The audit log table must have zero action buttons. No edit, delete, row click-through, or any modification affordance.

8. **Live preview on lab results (REQ-F-040).** The status badge (Normal/Abnormal/Critical) must update in real time as the user types the result value — before submission.

9. **Icons from Lucide React only.** Do not use Material Symbols. All icons referenced in this document are Lucide React icon names.

10. **Font is always Inter.** No other typeface.

---

*HIS Platform — Phases 7–15 Detailed Design Specification*
*Healthcare Information System v2.0 | University of Buea — Department of Computer Engineering*
*Document generated for Google Stitch UI build reference*
