# OutreachOps Design Guidelines

## Design Approach: Healthcare-Optimized Enterprise System

**Selected Framework**: Adapted Fluent Design System with healthcare-specific patterns
**Rationale**: Healthcare workforce platforms demand clarity, reliability, and efficient information processing. Fluent's enterprise focus, combined with healthcare UI patterns, provides the necessary foundation for dense data displays, complex workflows, and compliance-critical interfaces.

---

## Core Design Principles

1. **Clinical Clarity**: Information hierarchy optimized for rapid decision-making during shifts
2. **Trust & Compliance**: Visual indicators for HIPAA mode, audit trails, and data sensitivity
3. **Operational Efficiency**: Minimize clicks, maximize context visibility
4. **Role-Based UI**: Interface adapts to user permissions and responsibilities

---

## Color System

### Brand Colors (Primary)
- **Medical Red**: 350 85% 49% (Primary actions, alerts, critical status)
- **Healthcare Blue**: 202 100% 35% (Secondary actions, info states, trust signals)
- **Clinical White**: 0 0% 100% (Primary backgrounds)
- **Soft Gray**: 0 0% 97% (Secondary backgrounds, cards)

### Semantic Colors
- **Success/Approved**: 142 71% 45% (approvals, completed shifts)
- **Warning/Pending**: 38 92% 50% (pending reviews, expiring documents)
- **Error/Overdue**: 0 84% 60% (missed clock-ins, expired credentials)
- **Info/Scheduled**: 210 100% 56% (upcoming shifts, notifications)

### Dark Mode (Healthcare Night Shift Theme)
- **Background**: 220 13% 11%
- **Surface**: 220 13% 16%
- **Text Primary**: 0 0% 95%
- **Borders**: 220 13% 25%
- **Adapt brand colors**: Reduce saturation by 15%, increase lightness by 10% for night readability

---

## Typography

**Font Families**:
- **Primary (UI)**: Inter (via Google Fonts) - exceptional readability for data-dense interfaces
- **Monospace (Data)**: 'JetBrains Mono' - for time codes, IDs, technical data

**Scale & Usage**:
- **Display (2.5rem/700)**: Dashboard headers, page titles
- **Heading 1 (2rem/600)**: Section headers, modal titles
- **Heading 2 (1.5rem/600)**: Card headers, subsections
- **Heading 3 (1.25rem/600)**: List headers, group labels
- **Body (1rem/400)**: Primary content, form labels
- **Body Small (0.875rem/400)**: Secondary info, metadata
- **Caption (0.75rem/500)**: Timestamps, status badges, helper text

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **1, 2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Compact density: p-2, gap-3, space-y-4
- Standard density: p-4, gap-4, space-y-6  
- Comfortable density: p-6, gap-6, space-y-8
- Section separation: py-12, py-16

**Grid Strategy**:
- **Dashboard**: 12-column responsive grid
- **Forms**: 2-column on desktop (md:grid-cols-2), single on mobile
- **Data Tables**: Full-width with horizontal scroll on mobile
- **Calendar Views**: 7-column for week view, adaptive for month

**Container Widths**:
- **Full app**: max-w-[1600px] (accommodate data-rich views)
- **Forms/Detail**: max-w-4xl
- **Modal dialogs**: max-w-2xl

---

## Component Library

### Navigation
- **Top Bar**: Fixed header with org logo, global search, notifications (bell icon with badge), user menu
- **Sidebar**: Collapsible navigation with icons + labels, role-based menu items, active state with red indicator
- **Breadcrumbs**: For deep navigation (Scheduling > Open Shifts > Details)

### Time & Scheduling
- **Clock In/Out Button**: Large (min-h-16), red when clocked out, blue when clocked in, with live timer
- **Shift Cards**: Compact info density - time range, job/subjob, location, task count, attachment indicators
- **Calendar**: Week/month toggles, color-coded by shift status, click-to-detail, drag-to-reschedule (admin only)
- **Timesheet Table**: Striped rows, edit indicators (orange flag icon), approval checkboxes, expandable details

### Data Display
- **Tables**: Sticky headers, row hover states, inline actions (kebab menu), bulk select with floating action bar
- **Status Badges**: Pill-shaped, semantic colors, with icons (checkmark, clock, alert)
- **Stat Cards**: Large numbers with trend indicators, icon on left, mini sparkline optional
- **Empty States**: Centered icon (96px), heading, description, primary action button

### Forms & Inputs
- **All form fields**: Consistent h-11, rounded-md borders, focus ring using brand blue
- **Required indicators**: Red asterisk, not just color-dependent
- **File uploads**: Drag-drop zone with border-dashed, accepted formats listed
- **Signature pad**: Canvas with clear/save buttons, preview thumbnail after capture
- **Date/Time pickers**: Calendar dropdown, 12/24hr toggle, timezone display

### Modals & Overlays
- **Modal**: Centered, max-w-2xl, backdrop blur-sm, slide-in animation
- **Drawer**: Right-side slide for detail views (shift details, user profile)
- **Toast notifications**: Top-right stack, auto-dismiss, action buttons for undo/view
- **Confirmation dialogs**: Red button for destructive, escape to cancel

### Role & Permission Indicators
- **HIPAA Mode Badge**: Lock icon + "HIPAA Mode Active" in header when enabled
- **PHI Tags**: Yellow shield icon next to sensitive fields
- **Audit Trail Icon**: Clock-rotate icon, shows edit history on hover/click
- **Permission-Gated Actions**: Disabled with tooltip explaining required role

---

## Visual Patterns

### Shift Status Workflow
- **Draft**: Gray outline, italic text
- **Published**: Blue filled background
- **Open/Claimable**: Green outline with pulse animation
- **Claimed**: Yellow/pending state
- **Approved**: Green checkmark badge
- **Completed**: Green with strikethrough
- **Cancelled**: Red with X icon

### Document Lifecycle
- **Required**: Red badge, upload CTA prominent
- **Submitted**: Blue badge, awaiting review
- **Approved**: Green checkmark, expiry date shown
- **Expiring Soon**: Orange warning triangle, days remaining
- **Expired**: Red alert icon, re-upload required

### Attachment Handling
- **Image previews**: Thumbnail grid, lightbox on click
- **Signatures**: Black ink on white, timestamp below
- **PDFs**: Icon + filename, inline preview if possible

---

## Interaction Guidelines

**Minimal Animations**:
- Page transitions: 150ms fade
- Dropdown menus: 200ms slide-down
- Loading states: Skeleton screens, no spinners except for actions
- Hover states: Subtle scale (1.02) for cards, underline for links

**Real-time Updates**:
- Clock timer: Updates every second when active
- Shift changes: Toast notification + smooth card update
- New messages: Badge count increment with subtle bounce

---

## Mobile-First Adaptations

- **Bottom Navigation**: Fixed tab bar for primary actions (Dashboard, Clock, Schedule, More)
- **Floating Action Button**: Primary action per page (red circle, + icon)
- **Swipe Gestures**: Swipe shift card to approve/reject (admin), swipe timesheet row to edit
- **Touch Targets**: Minimum 44px height, generous padding
- **Simplified Tables**: Card-based view on mobile, table on desktop

---

## Accessibility Requirements

- **WCAG AA compliance**: 4.5:1 contrast minimum for text
- **Keyboard navigation**: Logical tab order, visible focus indicators
- **Screen reader**: ARIA labels for icons, status announcements for real-time updates
- **Dark mode**: Maintained across all inputs, modals, and form fields (no white flash)
- **Error states**: Icon + color + text explanation (not color alone)

---

## Images

**No hero images** - This is a utility application, not a marketing site. Use:
- **Dashboard illustrations**: Subtle background patterns (medical cross, schedule grid) at 5% opacity
- **Empty state graphics**: Simple line illustrations for "No shifts scheduled", "No documents uploaded"
- **User avatars**: Initials in colored circles, uploaded photos optional
- **Icon library**: Heroicons (outline for nav, solid for status indicators)