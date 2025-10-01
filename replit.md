# OutreachOps - HIPAA-Aware Workforce Management Platform

## Overview

OutreachOps is a healthcare workforce management platform designed specifically for hospice staffing companies. It replaces Connecteam with a HIPAA-compliant solution that handles employee scheduling, time tracking, document management, and knowledge base features. The platform is built with security and compliance as core requirements, featuring role-based access control, PHI (Protected Health Information) tagging, and comprehensive audit logging.

## Recent Updates (January 2025)

### File Attachment System
- Implemented complete file upload system using Multer for shift attachments
- Users can upload files (images, PDFs, documents) up to 10MB
- Files stored securely in `./uploads/` directory with unique timestamped names
- File download/viewing via authenticated endpoints
- Security: file type validation, size limits, authentication required

### User Availability Display
- Visual indicators for user availability in schedule calendar view
- Unavailable days: red background with "Unavailable" and "All day" text in red
- Preferred work days: green background with "Prefer to work" and time range in green
- Support for all-day or specific time ranges
- Quick access controls for marking days as unavailable or preferred

### Timesheet Week Navigation
- Added previous/next week navigation controls in Timesheets view
- Week range display shows current week in MM/DD - MM/DD format
- Click date range button to return to current week
- Timezone-safe filtering: extracts date directly from ISO strings without timezone conversion
- Week starts on Monday (payroll week), properly filters timesheets by selected week period

### Timesheet Detail View with Clock-Out Integration (✅ Complete)
- Complete weekly breakdown showing all 7 days with Monday at bottom (reversed order: Sun to Mon)
- Week navigation controls for browsing different pay periods
- Editable job selection (dropdown) and start/end times (time inputs) for Owner/Admin roles
- Day locking functionality to prevent editing after approval
  - Lock/unlock buttons with visual indicators (red locked, grey unlocked)
  - Confirmation dialog explaining locking rules and permissions
  - Backend enforcement prevents editing locked entries
  - Audit logging for all lock/unlock and edit actions
- **Four New Columns for Clock-Out Data:**
  - **Relieving Nurse Signature**: Displays signature image captured during clock-out
  - **Attach ALL shift notes**: Shows count and link to photos uploaded during shift
  - **Employee notes**: Text notes field (future implementation)
  - **Manager notes**: Text notes field for admin/manager use
- Role-based access: only Owner and Admin can edit timesheets and lock/unlock days
- Timezone-safe date handling throughout
- **Critical Fixes Applied:**
  - Fixed time entries query to use correct query parameter format (`?userId=` instead of path segment)
  - Fixed current user endpoint from `/api/user` to `/api/auth/me` for proper role detection
  - All editable fields and lock buttons now render correctly for Owner/Admin roles
  - Approve timesheet button creates/updates timesheet records and marks as approved

### Clock-Out with Photo and Signature Capture (✅ Complete)
- **Photo Upload**: Employees can upload multiple photos during their shift
  - Files uploaded to `/api/upload` endpoint using Multer
  - Stored in `./uploads/` directory with unique filenames
  - Photo count displayed on button (e.g., "2 Photos")
  - All photos saved to `shiftNoteAttachments` array in time entry
- **Signature Capture**: Canvas-based signature pad for relieving nurse
  - Opens modal dialog for signature drawing
  - Touch and mouse support for drawing
  - Clear and save functionality
  - Signature saved as base64 data URL in `relievingNurseSignature` field
  - Button shows "✓ Signed" when signature captured
- Both photos and signature automatically sent to backend on clock-out
- Data appears in timesheet detail view for review

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom healthcare-optimized design system
- **Design System**: Adapted Fluent Design System with healthcare-specific patterns for clinical clarity and operational efficiency
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers

**Design Principles**:
- Clinical clarity optimized for rapid decision-making
- Trust and compliance visual indicators (HIPAA mode, audit trails)
- Operational efficiency with minimized clicks
- Role-based UI adaptation
- Dark mode support for night shift readability

### Backend Architecture

**Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints with Zod schema validation
- **Session Management**: Express-session with PostgreSQL session store (connect-pg-simple)
- **Authentication**: Bcrypt password hashing with session-based auth
- **Authorization**: Role-based access control (Owner, Admin, Scheduler, Payroll, HR, Manager, Staff)

**Data Layer**:
- **ORM**: Drizzle ORM for type-safe database queries
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Strategy**: Comprehensive entity modeling including users, time entries, shifts, schedules, documents, knowledge base, audit logs, and settings

**Security Architecture**:
- Session-based authentication with secure cookies
- Role-based middleware (`requireAuth`, `requireRole`)
- Comprehensive audit logging for all actions (PHI access tracking)
- HIPAA compliance features including PHI field tagging and encryption support
- IP address and user agent tracking for security events

### Key Architectural Decisions

**Monorepo Structure**:
- `client/`: React frontend application
- `server/`: Express backend services
- `shared/`: Shared TypeScript types and schemas (Drizzle schemas, Zod validators)
- Centralized type safety across frontend and backend

**Data Modeling Approach**:
- Comprehensive entity modeling covering all workforce management needs
- PHI fields stored in JSONB columns with encryption support
- Flexible custom fields system for extensibility
- Audit trail as append-only log for compliance

**Time Tracking System**:
- Real-time clock in/out with status tracking
- Auto clock-out rules support
- Timesheet rollup with period locking
- Edit tracking with diff preservation
- Payroll integration placeholders (QuickBooks/ADP)

**Document Management**:
- Document packs for organized credential requirements
- Expiry tracking with automated notifications
- Review workflow with approval states
- Attachment support for file uploads

**Smart Groups & Permissions**:
- Dynamic user grouping with rule-based logic
- Fine-grained permission matrix (resource × action)
- Custom field definitions for organization-specific data

## External Dependencies

### Core Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket support
- **Database ORM**: Drizzle ORM with drizzle-kit for migrations
- **Session Store**: connect-pg-simple for PostgreSQL-backed sessions

### Frontend Libraries
- **UI Components**: Extensive Radix UI component collection (@radix-ui/react-*)
- **State Management**: @tanstack/react-query for data fetching and caching
- **Form Management**: React Hook Form with @hookform/resolvers for Zod integration
- **Styling**: Tailwind CSS with class-variance-authority for component variants
- **Utilities**: clsx, tailwind-merge, date-fns for date handling

### Development Tools
- **Build Tool**: Vite with React plugin
- **Type Checking**: TypeScript with strict mode enabled
- **Runtime**: Node.js 20 with ESNext module format
- **Process Manager**: tsx for development server with hot reload
- **Replit Integration**: Custom Vite plugins for Replit environment (@replit/vite-plugin-*)

### Security & Validation
- **Password Hashing**: bcrypt
- **Schema Validation**: Zod (integrated with Drizzle via drizzle-zod)
- **Session Security**: express-session with secure cookie configuration

### Future Integrations (Placeholders)
- QuickBooks/ADP for payroll export
- Push notification service for reminders
- Geofencing for location-based clock-in
- SSO providers for enterprise authentication