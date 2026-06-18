# HIS Design System — Color, Typography & Visual Language

**Healthcare Information System (HIS) | University of Buea**
*This file is the authoritative design reference. All UI components, charts, and layouts must conform to the specifications below.*

---

## 1. Theme Tokens (CSS Variables)

```css
@theme inline {
  /* Core Canvas */
  --background: #F8F9FA;          /* Soft cool gray canvas */
  --foreground: #0F172A;          /* Charcoal text - highest contrast */

  --card: #FFFFFF;                /* Crisp White for data cards */
  --card-foreground: #0F172A;     /* Charcoal for text on cards */
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;

  /* Tenant Primary Color (Teal) */
  --primary: #0D9488;             /* Clinical Teal for actions */
  --primary-foreground: #FFFFFF;

  /* Secondary & Neutral Text */
  --secondary: #F1F5F9;
  --secondary-foreground: #1E293B;

  --muted: #F8FAFC;
  --muted-foreground: #64748B;    /* Soft slate gray for labels */
  --accent: #F1F5F9;
  --accent-foreground: #0F172A;

  /* Medical Semantic States */
  --destructive: #EF4444;         /* Emergency Red */
  --destructive-foreground: #FFFFFF;
  --warning: #F59E0B;             /* Alert Amber */
  --warning-foreground: #78350F;
  --success: #10B981;             /* Normal Green */
  --success-foreground: #064E3B;

  /* Form States */
  --input: #E2E8F0;               /* Default input border */
  --input-error: #EF4444;         /* Input border when field is invalid (UI-003) */
  --error-text: #DC2626;          /* Inline validation error message text — slightly darker red for WCAG contrast on white */

  --border: #E2E8F0;              /* Soft dividers */
  --ring: #0D9488;                /* Teal focus ring for accessibility */
  --radius: 0.5rem;
}
```

---

## 2. Color Reference Table

| Token | Hex | Usage |
| --- | --- | --- |
| `--background` | `#F8F9FA` | Page canvas / app shell background |
| `--foreground` | `#0F172A` | Primary body text, vital numbers, headings |
| `--card` | `#FFFFFF` | Data cards, modals, panel surfaces |
| `--card-foreground` | `#0F172A` | Text rendered on card surfaces |
| `--primary` | `#0D9488` | Buttons, active nav, links, focus rings, chart baseline |
| `--primary-foreground` | `#FFFFFF` | Text/icons on teal backgrounds |
| `--secondary` | `#F1F5F9` | Secondary button fills, tag backgrounds |
| `--secondary-foreground` | `#1E293B` | Text on secondary surfaces |
| `--muted` | `#F8FAFC` | Subtle background fills, table row alternates |
| `--muted-foreground` | `#64748B` | Labels, captions, helper text, unit suffixes, disabled state |
| `--accent` | `#F1F5F9` | Hover states, selected row highlights |
| `--accent-foreground` | `#0F172A` | Text on accent backgrounds |
| `--destructive` | `#EF4444` | Critical lab results, error states, delete actions |
| `--destructive-foreground` | `#FFFFFF` | Text/icons on red backgrounds |
| `--warning` | `#F59E0B` | Abnormal (non-critical) results, pending states |
| `--warning-foreground` | `#78350F` | Text on amber backgrounds |
| `--success` | `#10B981` | Normal results, completed actions, active status |
| `--success-foreground` | `#064E3B` | Text on green backgrounds |
| `--border` | `#E2E8F0` | Dividers, card borders, table lines |
| `--input` | `#E2E8F0` | Form input border — default state |
| `--input-error` | `#EF4444` | Form input border — invalid/error state (UI-003) |
| `--error-text` | `#DC2626` | Inline validation error message text (UI-003) |
| `--ring` | `#0D9488` | Keyboard focus ring (accessibility) |
| `--radius` | `0.5rem` | Global border radius for all interactive elements |

---

## 3. Typography

**Font Family:** `Inter` (Google Fonts / system fallback: `sans-serif`)

```css
font-family: 'Inter', sans-serif;
```

### 3.1 Full Type Scale

| Element | Tailwind Classes | Use Cases |
| --- | --- | --- |
| **Page title** | `text-2xl font-semibold text-foreground` | Dashboard section headers, page names |
| **Section heading** | `text-lg font-semibold text-foreground` | Card titles, panel headers |
| **Subsection heading** | `text-base font-semibold text-foreground` | Form section labels, table group headers |
| **Body** | `text-sm font-normal text-foreground` | General content, table cell text, descriptions |
| **Form label** | `text-sm font-medium text-foreground` | Input field labels |
| **Helper / caption** | `text-xs font-normal text-muted-foreground` | Tooltip text, footnotes, field hints |
| **Button label** | `text-sm font-medium` | All button text |
| **Table header** | `text-xs font-semibold text-muted-foreground uppercase tracking-wide` | Column headers |
| **Badge / tag** | `text-xs font-medium` | Status badges, role tags |
| **Link** | `text-sm font-medium text-primary underline-offset-4 hover:underline` | Inline links, "Forgot Password", navigation links |

### 3.2 Clinical Data Display Rule

Vital signs, lab values, and any primary metric displayed on dashboards or clinical records must follow this two-layer typographic pattern:

| Element | Class / Style | Purpose |
| --- | --- | --- |
| **Metric label** (e.g., "Heart Rate", "SpO₂") | `text-sm font-normal text-muted-foreground` | Small, light gray — subordinate context |
| **Metric value** (e.g., "98", "120/80") | `text-4xl font-bold text-foreground` | Huge, bold, Charcoal — the number commands attention |
| **Unit suffix** (e.g., "bpm", "mmHg") | `text-sm font-normal text-muted-foreground` | Small, light gray — same weight as label |

**Example structure (React/JSX):**

```jsx
<div className="flex flex-col items-start gap-1">
  <span className="text-sm font-normal text-muted-foreground">Heart Rate</span>
  <div className="flex items-baseline gap-1">
    <span className="text-4xl font-bold text-foreground">98</span>
    <span className="text-sm font-normal text-muted-foreground">bpm</span>
  </div>
</div>
```

---

## 4. Medical Semantic Color States

These four states are used across the entire application wherever clinical data is displayed. They must be applied consistently to badge backgrounds, chart data points, table row highlights, and notification indicators.

| State | Color Token | Hex | When to Apply |
| --- | --- | --- | --- |
| **Normal** | `--success` | `#10B981` | Result within reference range; completed actions; active accounts |
| **Abnormal** | `--warning` | `#F59E0B` | Result outside normal range but not in critical zone |
| **Critical** | `--destructive` | `#EF4444` | Result in critical range; emergency alerts; irreversible destructive actions |
| **Pending** | `--muted-foreground` | `#64748B` | Awaiting decision or action (consent pending, test pending, approval pending) |

---

## 5. Colorblind Accessibility — Icon + Color Rule

**Rule:** Color alone must never be the sole indicator of clinical state. Every semantic color state must be paired with a Lucide React icon so colorblind staff can identify the state without relying on hue.

| State | Color | Lucide Icon | Icon Import |
| --- | --- | --- | --- |
| **Normal** | `#10B981` (success) | `CheckCircle` | `import { CheckCircle } from 'lucide-react'` |
| **Abnormal** | `#F59E0B` (warning) | `AlertTriangle` | `import { AlertTriangle } from 'lucide-react'` |
| **Critical** | `#EF4444` (destructive) | `AlertOctagon` | `import { AlertOctagon } from 'lucide-react'` |
| **Pending** | `#64748B` (muted-foreground) | `Clock` | `import { Clock } from 'lucide-react'` |
| **Info / Neutral** | `#0D9488` (primary) | `Info` | `import { Info } from 'lucide-react'` |
| **Form Error** | `#DC2626` (error-text) | `AlertCircle` | `import { AlertCircle } from 'lucide-react'` |

**Example badge pattern (React/JSX):**

```jsx
// Critical state badge
<div className="flex items-center gap-1.5 text-destructive">
  <AlertOctagon size={16} />
  <span className="text-sm font-medium">Critical</span>
</div>

// Normal state badge
<div className="flex items-center gap-1.5 text-success">
  <CheckCircle size={16} />
  <span className="text-sm font-medium">Normal</span>
</div>

// Pending state badge
<div className="flex items-center gap-1.5 text-muted-foreground">
  <Clock size={16} />
  <span className="text-sm font-medium">Pending</span>
</div>
```

---

## 6. Chart Color System (3-Tier Rule)

All charts use Teal as the baseline to keep the workspace cohesive. Color shifts dynamically based on whether data is normal, comparative, or breaching a threshold.

| Dataset Type | Role | Hex | Tailwind / Token |
| --- | --- | --- | --- |
| **Primary Metric** | Baseline trendlines, main data series | `#0D9488` | `--primary` |
| **Comparative / Secondary Metric** | Non-critical comparison lines, secondary series | `#64748B` or `#6366F1` | `--muted-foreground` / Indigo |
| **Abnormal / Out-of-Bound Data** | Data points that breach the safe threshold | `#EF4444` or `#F59E0B` | `--destructive` / `--warning` |

### Chart Color Rules

1. **Default state:** All chart lines and bars render in Primary Teal (`#0D9488`).
2. **Threshold breach:** Individual data points or segments that fall outside the clinical reference range must dynamically switch to `--warning` (`#F59E0B`) for abnormal or `--destructive` (`#EF4444`) for critical. The rest of the line stays Teal.
3. **Secondary datasets:** Comparison series (e.g., last month vs. this month, or Patient A vs. Patient B) use Slate Gray (`#64748B`) or Indigo (`#6366F1`) to visually separate them from the primary series without introducing clinical meaning.
4. **Chart backgrounds:** Always use `--card` (`#FFFFFF`) as the chart surface with `--border` (`#E2E8F0`) for gridlines.
5. **Chart tooltips:** White popover (`--popover`) with Charcoal text (`--foreground`) and `--border` outline.
6. **Export button (UI-007):** Every chart must include a PNG export button. Use a secondary ghost button (`variant="ghost"`) with the `Download` Lucide icon, positioned at the top-right corner of the chart card.
7. **Axis labels (UI-007):** All chart axes must be labelled. Use `text-xs font-normal text-muted-foreground` (`#64748B`). The X-axis label sits centred below the axis; the Y-axis label sits rotated 90° to the left of the axis.
8. **Legend (UI-007):** All multi-series charts must include a legend. Legend text uses `text-xs font-medium text-foreground`. Each legend entry pairs a colour swatch (12×12 px rounded square matching the series colour) with the series label. Position the legend horizontally below the chart area, centred.

### Recommended Chart Palette (multi-series order)

```text
Series 1:  #0D9488  (Primary Teal)
Series 2:  #64748B  (Slate Gray)
Series 3:  #6366F1  (Indigo)
Series 4:  #F59E0B  (Amber — only if representing abnormal data)
Series 5:  #EF4444  (Red — only if representing critical data)
```

**Do not use Red or Amber for non-clinical comparative series.** These colors carry clinical meaning in the HIS context and must not be used decoratively.

---

## 7. UI Color Semantics Quick Reference

| Context | Color to Use | Token |
| --- | --- | --- |
| Primary action button (Save, Submit, Confirm) | Teal | `--primary` |
| Destructive action button (Delete, Revoke) | Red | `--destructive` |
| Warning / pending badge | Amber | `--warning` |
| Success / normal badge | Green | `--success` |
| Disabled state (button, input, link) | Muted gray | `--muted-foreground` |
| Active navigation item | Teal background + white text | `--primary` / `--primary-foreground` |
| Inactive navigation item | Transparent background + charcoal text | `--foreground` |
| Nav item hover | Light slate background | `--accent` |
| Form focus ring | Teal (2px, 2px offset) | `--ring` |
| Form input — default border | Soft border | `--input` |
| Form input — error border | Red | `--input-error` |
| Form error message text | Dark red | `--error-text` |
| Inline link | Teal, underline on hover | `--primary` |
| Table row hover | Light slate | `--accent` |
| Table header background | Muted | `--muted` |
| Page background | Cool gray | `--background` |
| Card / panel surface | White | `--card` |
| Modal / popover surface | White | `--popover` |
| Modal overlay / backdrop | `bg-black/50` | — |
| Section dividers | Soft border | `--border` |
| Sidebar background | White | `--card` |
| Sidebar border (right edge) | Soft border | `--border` |
| Topbar background | White | `--card` |
| Topbar border (bottom edge) | Soft border | `--border` |
| Notification badge dot | Red | `--destructive` |

---

## 8. Consent Status Color Mapping

Per UI-009, every patient profile must display a visible consent status indicator. The required color mapping is:

| Consent Status | Color Token | Hex | Icon (Lucide) |
| --- | --- | --- | --- |
| **Consent Granted** | `--success` | `#10B981` | `CheckCircle` |
| **Consent Pending** | `--warning` | `#F59E0B` | `Clock` |
| **Consent Refused** | `--destructive` | `#EF4444` | `XCircle` |

---

## 9. Form Validation Error Pattern (UI-003)

Per UI-003, all forms must perform inline validation and display human-readable error messages adjacent to the offending field. The following pattern is mandatory for all form inputs across the application.

**Rules:**
- The error message appears immediately below the input field, not in a toast or modal.
- The input border changes from `--input` to `--input-error` when the field is invalid.
- The error message uses `--error-text` color paired with the `AlertCircle` Lucide icon.
- The error message text is `text-xs font-normal`.
- Error state clears as soon as the field value becomes valid (real-time validation).

**Example (React/JSX):**
```jsx
{/* Valid state */}
<input className="border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring" />

{/* Error state */}
<input className="border border-[--input-error] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-destructive" />
<div className="flex items-center gap-1 mt-1 text-[--error-text]">
  <AlertCircle size={12} />
  <span className="text-xs">Date of birth is required.</span>
</div>
```

---

## 10. Tooltip Pattern (UI-011)

Per UI-011, all non-obvious form fields must display a contextual help tooltip (maximum two sentences) on hover. Use the ShadCN `Tooltip` component with the following visual spec:

| Property | Value |
| --- | --- |
| Background | `--popover` (`#FFFFFF`) |
| Text color | `--popover-foreground` (`#0F172A`) |
| Border | `1px solid --border` (`#E2E8F0`) |
| Font size | `text-xs` |
| Max width | `240px` |
| Shadow | `shadow-md` |
| Trigger icon | `Info` (Lucide, size 14, `text-muted-foreground`) |

**Example (React/JSX):**
```jsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

<div className="flex items-center gap-1.5">
  <label className="text-sm font-medium text-foreground">ICD-10 Code</label>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Info size={14} className="text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-xs">
        The International Classification of Diseases code for this diagnosis. Leave blank if unknown.
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>
```

---

## 11. Destructive Action Confirmation Dialog Pattern (UI-010)

Per UI-010, all destructive actions (deletion, deactivation, access revocation) must require a two-step confirmation dialog before execution. This prevents accidental permanent data loss.

**Rules:**
- Triggered by clicking any destructive action button (delete, deactivate, revoke).
- The first step is the initial destructive button click (red button with warning icon).
- The second step is the confirmation dialog — the user must explicitly click "Confirm" to proceed.
- The Cancel button is always on the left; the destructive Confirm button is always on the right.
- The dialog title clearly states what is being destroyed (not a generic "Are you sure?").
- The dialog body states the consequence and confirms it is irreversible where applicable.

| Property | Value |
| --- | --- |
| Dialog surface | `--popover` (`#FFFFFF`) |
| Overlay | `bg-black/50` |
| Title | `text-base font-semibold text-foreground` |
| Body | `text-sm font-normal text-muted-foreground` |
| Cancel button | `variant="outline"` — left side |
| Confirm button | `variant="destructive"` (red) — right side |
| Confirm button icon | `Trash2` / `UserX` / `ShieldOff` depending on action type |

**Example (React/JSX):**
```jsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Deactivate Staff Account</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">
        This will immediately revoke all access for <strong>John Doe</strong> and invalidate their active sessions. Their historical records will be preserved.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex justify-end gap-2 mt-4">
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">
        <UserX size={16} className="mr-2" />
        Deactivate Account
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 12. Notification Badge Pattern (REQ-F-064 / REQ-F-065)

The application polls `GET /notifications` every 15 seconds. Unread notifications are surfaced through a badge on the notification bell icon in the topbar.

| Property | Value |
| --- | --- |
| Bell icon | `Bell` (Lucide, size 20, `text-foreground`) |
| Badge background | `--destructive` (`#EF4444`) |
| Badge text | `--destructive-foreground` (`#FFFFFF`), `text-[10px] font-bold` |
| Badge position | Absolute, top-right corner of the bell icon (`-top-1 -right-1`) |
| Badge shape | Circle, min-width `16px`, height `16px` |
| Max display count | `99+` (cap at 99, show `+` suffix beyond that) |
| No unread state | Bell icon only, no badge rendered |

**Example (React/JSX):**
```jsx
import { Bell } from 'lucide-react';

<button className="relative p-2 rounded-md hover:bg-accent">
  <Bell size={20} className="text-foreground" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</button>
```

---

## 13. Layout Shell Specification (UI-002)

The application uses a fixed sidebar + topbar shell. All authenticated pages render within this shell. The role-specific dashboard is loaded automatically into the main content area on login, with no manual navigation required (UI-002).

### Shell Structure

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR (height: 64px, bg: --card, border-bottom)   │
│  [HIS Logo]        [Role Badge]  [Bell]  [Avatar]   │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   SIDEBAR    │         MAIN CONTENT AREA            │
│  (width:     │   (flex-1, bg: --background,         │
│   240px,     │    overflow-y-auto, p-6)             │
│   bg: --card,│                                      │
│   border-    │                                      │
│   right)     │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Sidebar Navigation Item States

| State | Classes |
| --- | --- |
| Default | `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent` |
| Active | `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground` |
| Disabled / locked | `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50` |

### Login Page — Session Duration Display (UI-001)

Per UI-001, the login page must show a read-only display of the session timeout duration (e.g., "Sessions expire after 60 minutes of inactivity"). This is static informational text — not a warning, not interactive.

| Property | Value |
| --- | --- |
| Style | `text-xs font-normal text-muted-foreground` |
| Position | Centred below the Login button, above the page footer |
| Icon | `Clock` (Lucide, size 12, inline, `text-muted-foreground`) |

**Example (React/JSX):**

```jsx
<p className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-3">
  <Clock size={12} />
  Sessions expire after 60 minutes of inactivity.
</p>
```

---

### Session Timeout Warning Banner (UI-008)

Per UI-008, the system must display a session timeout warning 2 minutes before the JWT expires. This renders as a dismissible banner at the top of the main content area (not a modal, so the user can continue reading).

| Property | Value |
| --- | --- |
| Background | `--warning` (`#F59E0B`) at 15% opacity (`bg-warning/15`) |
| Border | `1px solid --warning` |
| Text | `text-sm font-medium text-warning-foreground` |
| Icon | `Clock` (Lucide, size 16) |
| Action button | "Stay Logged In" — `variant="outline"` teal button, triggers silent refresh |
| Position | Top of `<main>` content area, full width, `z-50` |

---

## 14. Responsive Breakpoints (UI-005)

Per UI-005, the interface must render correctly on screen widths from 768px (tablet) to 1920px (desktop). The following Tailwind breakpoints apply:

| Breakpoint | Width | Tailwind Prefix | Target Device |
| --- | --- | --- | --- |
| **md** | 768px | `md:` | Tablet (minimum supported width) |
| **lg** | 1024px | `lg:` | Small desktop / laptop |
| **xl** | 1280px | `xl:` | Standard desktop |
| **2xl** | 1536px | `2xl:` | Large / wide monitors |

**Sidebar behaviour by breakpoint:**

| Breakpoint | Sidebar Behaviour |
| --- | --- |
| `md` (768px) | Sidebar collapses to icon-only mode (width: 64px); labels hidden |
| `lg` (1024px+) | Sidebar shows full labels (width: 240px) |

**Grid columns by breakpoint (dashboard cards):**

| Breakpoint | Columns |
| --- | --- |
| `md` | 1 column |
| `lg` | 2 columns |
| `xl` | 3 columns |
| `2xl` | 4 columns |

---

## 15. Toast / Form Feedback Notification Pattern

Every form submission across the application must provide immediate feedback via a transient toast notification. This is distinct from the bell-icon in-app notification system (§12) — toasts are ephemeral, action-scoped feedback messages that auto-dismiss.

**Rules:**

- Toasts appear in the bottom-right corner of the viewport, stacked vertically if multiple fire at once.
- Auto-dismiss after 4 seconds. A manual close button (`X`) is always present.
- Use ShadCN `Sonner` (or `useToast`) for toast delivery.
- Never use a toast for critical lab alerts or cross-hospital transfer events — those use the bell notification system (§12) and SES email (REQ-F-066).

| Toast Type | When to Use | Background | Icon |
| --- | --- | --- | --- |
| **Success** | Record saved, patient registered, appointment created | `--success` at 10% opacity, `border-success` | `CheckCircle` (green) |
| **Error** | Server error, validation failed on submit, network failure | `--destructive` at 10% opacity, `border-destructive` | `AlertOctagon` (red) |
| **Warning** | Action completed with caveats (e.g., duplicate detected but proceeded) | `--warning` at 10% opacity, `border-warning` | `AlertTriangle` (amber) |
| **Info** | Neutral system message (e.g., "ETL job queued — you will be emailed on completion") | `--primary` at 10% opacity, `border-primary` | `Info` (teal) |

| Property | Value |
| --- | --- |
| Position | Fixed, bottom-right, `z-[100]` |
| Width | `360px` |
| Background | Coloured at 10% opacity over `--card` white |
| Border | `1px solid` matching the semantic state color |
| Title | `text-sm font-semibold text-foreground` |
| Message | `text-xs font-normal text-muted-foreground` |
| Auto-dismiss | 4 seconds |
| Border radius | `--radius` (`0.5rem`) |
| Shadow | `shadow-lg` |

**Example (React/JSX):**

```jsx
import { toast } from 'sonner';

// Success
toast.success('Patient Registered', {
  description: 'John Doe has been added to the system.',
});

// Error
toast.error('Registration Failed', {
  description: 'A server error occurred. Please try again.',
});

// Warning
toast.warning('Possible Duplicate Detected', {
  description: 'A similar record was found. Review before proceeding.',
});

// Info
toast.info('ETL Job Queued', {
  description: 'You will receive an email when processing is complete.',
});
```

---

*End of HIS Design System Reference*
*Healthcare Information System v2.0 | University of Buea — Department of Computer Engineering*
