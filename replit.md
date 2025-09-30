# OutreachOps - HIPAA-Aware Workforce Management Platform

## Overview

OutreachOps is a healthcare workforce management platform designed specifically for hospice staffing companies. It replaces Connecteam with a HIPAA-compliant solution that handles employee scheduling, time tracking, document management, and knowledge base features. The platform is built with security and compliance as core requirements, featuring role-based access control, PHI (Protected Health Information) tagging, and comprehensive audit logging.

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