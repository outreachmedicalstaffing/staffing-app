import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access control
export const users = pgTable(
  "users",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(), // bcrypt hashed password
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    phoneNumber: text("phone_number"), // For SMS notifications
    role: text("role").notNull(), // Owner, Admin, Scheduler, Payroll, HR, Manager, Staff, CNA, LPN, RN
    defaultHourlyRate: decimal("default_hourly_rate", {
      precision: 8,
      scale: 2,
    }).default("25.00"), // Default pay rate
    jobRates: jsonb("job_rates").default(sql`'{}'::jsonb`), // Job-specific rates like {"Vitas Central Florida": "30.00"}
    groups: text("groups")
      .array()
      .default(sql`ARRAY[]::text[]`),
    customFields: jsonb("custom_fields").default(sql`'{}'::jsonb`), // Encrypted PHI: license, SSN, emergency contact, shift preferences, work setting, allergies, address
    status: text("status").notNull().default("active"), // active, archived, pending-onboarding
    requireMfa: boolean("require_mfa").default(false),
    onboardingToken: text("onboarding_token"), // Unique token for onboarding link
    onboardingTokenExpiry: timestamp("onboarding_token_expiry"), // Token expiration
    onboardingCompleted: boolean("onboarding_completed").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    usernameIdx: index("users_username_idx").on(table.username),
    roleIdx: index("users_role_idx").on(table.role),
    statusIdx: index("users_status_idx").on(table.status),
    onboardingTokenIdx: index("users_onboarding_token_idx").on(table.onboardingToken),
  }),
);

export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    password: z.string().min(8), // Will be hashed before storage
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Time entries for clock in/out
export const timeEntries = pgTable(
  "time_entries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    shiftId: varchar("shift_id").references(() => shifts.id), // Link to the assigned shift
    clockIn: timestamp("clock_in").notNull(),
    clockOut: timestamp("clock_out"),
    breakMinutes: integer("break_minutes").default(0),
    jobName: text("job_name"), // Which job/location this shift was for
    hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }), // Rate used for THIS shift
    location: text("location"), // GPS or manual location
    notes: text("notes"),
    status: text("status").notNull().default("active"), // active, completed, auto-clocked-out
    locked: boolean("locked").default(false), // locked days prevent editing
    relievingNurseSignature: text("relieving_nurse_signature"), // Signature obtained at clock out
    shiftNoteAttachments: text("shift_note_attachments").array(), // Photos/files uploaded at clock out
    employeeNotes: text("employee_notes"), // Notes from employee
    managerNotes: text("manager_notes"), // Notes from manager/admin
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("time_entries_user_id_idx").on(table.userId),
    clockInIdx: index("time_entries_clock_in_idx").on(table.clockIn),
    statusIdx: index("time_entries_status_idx").on(table.status),
  }),
);

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

// Schedules - the master schedule container
export const schedules = pgTable("schedules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"), // active, archived, draft
  createdBy: varchar("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

// Shift templates - reusable shift definitions
export const shiftTemplates = pgTable("shift_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // e.g., "Day shift - facility"
  startTime: text("start_time").notNull(), // e.g., "8:00a"
  endTime: text("end_time").notNull(), // e.g., "8:00p"
  color: text("color").notNull().default("#64748B"), // hex color for left border indicator
  description: text("description"), // optional additional notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShiftTemplateSchema = createInsertSchema(
  shiftTemplates,
).omit({
  id: true,
  createdAt: true,
});

export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;

// Shifts - specific shift instances in a schedule
export const shifts = pgTable(
  "shifts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scheduleId: varchar("schedule_id").references(() => schedules.id),
    templateId: varchar("template_id").references(() => shiftTemplates.id),
    title: text("title").notNull(),
    jobName: text("job_name"), // The job/location this shift is for
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    location: text("location"),
    notes: text("notes"),
    status: text("status").notNull().default("open"), // open, assigned, in-progress, completed, cancelled
    color: text("color"),
    maxAssignees: integer("max_assignees").default(1), // Support multiple workers per shift
    attachments: text("attachments").array(), // Array of attachment filenames/URLs
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    scheduleIdIdx: index("shifts_schedule_id_idx").on(table.scheduleId),
    startTimeIdx: index("shifts_start_time_idx").on(table.startTime),
    statusIdx: index("shifts_status_idx").on(table.status),
  }),
);

export const insertShiftSchema = createInsertSchema(shifts)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    startTime: z.preprocess((val) => {
      if (typeof val === "string") return new Date(val);
      if (val instanceof Date) return val;
      return val;
    }, z.date()),
    endTime: z.preprocess((val) => {
      if (typeof val === "string") return new Date(val);
      if (val instanceof Date) return val;
      return val;
    }, z.date()),
  });

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

// Shift assignments - many-to-many relationship between users and shifts
export const shiftAssignments = pgTable("shift_assignments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id")
    .notNull()
    .references(() => shifts.id),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("assigned"), // assigned, accepted, rejected, completed
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  notes: text("notes"),
});

export const insertShiftAssignmentSchema = createInsertSchema(
  shiftAssignments,
).omit({
  id: true,
  assignedAt: true,
});

export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;

// User availability - for tracking unavailability and work preferences
export const userAvailability = pgTable("user_availability", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  date: timestamp("date").notNull(), // The date this availability applies to
  type: text("type").notNull(), // 'unavailable' or 'preferred'
  allDay: boolean("all_day").notNull().default(true),
  startTime: text("start_time"), // Optional specific time like "8:00am"
  endTime: text("end_time"), // Optional specific time like "5:00pm"
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserAvailabilitySchema = createInsertSchema(userAvailability)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    date: z.preprocess((val) => {
      if (typeof val === "string") return new Date(val);
      if (val instanceof Date) return val;
      return val;
    }, z.date()),
  });

export type InsertUserAvailability = z.infer<
  typeof insertUserAvailabilitySchema
>;
export type UserAvailability = typeof userAvailability.$inferSelect;

// Timesheets for payroll - using decimal for precise hour tracking
export const timesheets = pgTable(
  "timesheets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    totalHours: decimal("total_hours", { precision: 8, scale: 2 }).notNull(), // e.g., 123.45 hours
    regularHours: decimal("regular_hours", {
      precision: 8,
      scale: 2,
    }).notNull(),
    overtimeHours: decimal("overtime_hours", { precision: 8, scale: 2 })
      .notNull()
      .default("0"),
    status: text("status").notNull().default("pending"), // pending, submitted, approved, rejected, exported
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("timesheets_user_id_idx").on(table.userId),
    statusIdx: index("timesheets_status_idx").on(table.status),
    periodStartIdx: index("timesheets_period_start_idx").on(table.periodStart),
  }),
);

export const insertTimesheetSchema = createInsertSchema(timesheets)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    periodStart: z.preprocess((val) => {
      if (typeof val === "string") return new Date(val);
      if (val instanceof Date) return val;
      return val;
    }, z.date()),
    periodEnd: z.preprocess((val) => {
      if (typeof val === "string") return new Date(val);
      if (val instanceof Date) return val;
      return val;
    }, z.date()),
  });

export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;

// Documents for credential management - with encrypted PHI support
export const documents = pgTable("documents", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"), // path to encrypted file
  fileType: text("file_type"), // pdf, jpg, etc.
  category: text("category"), // license, certification, background-check, etc.
  encryptedMetadata: jsonb("encrypted_metadata").default(sql`'{}'::jsonb`), // Encrypted PHI like SSN, license numbers
  status: text("status").notNull().default("submitted"), // submitted, approved, rejected, expired, expiring
  uploadedDate: timestamp("uploaded_date").notNull().defaultNow(),
  expiryDate: timestamp("expiry_date"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Knowledge base articles
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // markdown content
  type: text("type").notNull(), // page, pdf, folder
  category: text("category").notNull(), // HR, Compliance, Operations
  publishStatus: text("publish_status").notNull().default("draft"), // draft, published
  authorId: varchar("author_id")
    .notNull()
    .references(() => users.id),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKnowledgeArticleSchema = createInsertSchema(
  knowledgeArticles,
).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeArticle = z.infer<
  typeof insertKnowledgeArticleSchema
>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

// Audit logs for HIPAA compliance - comprehensive tracking
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // login, view, edit, delete, export, clock_in, clock_out, etc.
  resourceType: text("resource_type").notNull(), // user, timesheet, document, shift, etc.
  resourceId: varchar("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  phiAccessed: boolean("phi_accessed").default(false), // Flag if PHI was accessed
  phiFields: text("phi_fields")
    .array()
    .default(sql`ARRAY[]::text[]`), // Which PHI fields were accessed (masked in logs)
  details: jsonb("details").default(sql`'{}'::jsonb`), // Additional context (sanitized)
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Organization settings with HIPAA configuration
export const settings = pgTable("settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  encryptedValue: text("encrypted_value"), // For sensitive settings
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
