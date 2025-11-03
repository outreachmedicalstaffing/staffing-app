import { db } from "./db";
import { eq, and, gte, lte, desc, or, like } from "drizzle-orm";
import {
  users,
  timeEntries,
  schedules,
  shiftTemplates,
  shifts,
  shiftAssignments,
  userAvailability,
  timesheets,
  documents,
  knowledgeArticles,
  auditLogs,
  settings,
  smartGroups,
  type User,
  type InsertUser,
  type TimeEntry,
  type InsertTimeEntry,
  type Schedule,
  type InsertSchedule,
  type ShiftTemplate,
  type InsertShiftTemplate,
  type Shift,
  type InsertShift,
  type ShiftAssignment,
  type InsertShiftAssignment,
  type UserAvailability,
  type InsertUserAvailability,
  type Timesheet,
  type InsertTimesheet,
  type Document,
  type InsertDocument,
  type KnowledgeArticle,
  type InsertKnowledgeArticle,
  type AuditLog,
  type InsertAuditLog,
  type Setting,
  type InsertSetting,
  type SmartGroup,
  type InsertSmartGroup,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByOnboardingToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: string,
    user: Partial<Omit<InsertUser, "password">> & { passwordHash?: string },
  ): Promise<User | undefined>;
  listUsers(status?: string): Promise<User[]>;

  // Time Entries
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(
    id: string,
    entry: Partial<InsertTimeEntry>,
  ): Promise<TimeEntry | undefined>;
  listTimeEntries(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TimeEntry[]>;

  // Schedules
  getSchedule(id: string): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(
    id: string,
    schedule: Partial<InsertSchedule>,
  ): Promise<Schedule | undefined>;
  listSchedules(status?: string): Promise<Schedule[]>;

  // Shift Templates
  getShiftTemplate(id: string): Promise<ShiftTemplate | undefined>;
  createShiftTemplate(template: InsertShiftTemplate): Promise<ShiftTemplate>;
  updateShiftTemplate(
    id: string,
    template: Partial<InsertShiftTemplate>,
  ): Promise<ShiftTemplate | undefined>;
  deleteShiftTemplate(id: string): Promise<boolean>;
  listShiftTemplates(): Promise<ShiftTemplate[]>;

  // Shifts
  getShift(id: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(
    id: string,
    shift: Partial<InsertShift>,
  ): Promise<Shift | undefined>;
  deleteShift(id: string): Promise<boolean>;
  listShifts(
    scheduleId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Shift[]>;

  // Shift Assignments
  getShiftAssignment(id: string): Promise<ShiftAssignment | undefined>;
  createShiftAssignment(
    assignment: InsertShiftAssignment,
  ): Promise<ShiftAssignment>;
  updateShiftAssignment(
    id: string,
    assignment: Partial<InsertShiftAssignment>,
  ): Promise<ShiftAssignment | undefined>;
  deleteShiftAssignment(id: string): Promise<boolean>;
  listShiftAssignments(
    shiftId?: string,
    userId?: string,
  ): Promise<ShiftAssignment[]>;

  // User Availability
  getUserAvailability(id: string): Promise<UserAvailability | undefined>;
  createUserAvailability(
    availability: InsertUserAvailability,
  ): Promise<UserAvailability>;
  updateUserAvailability(
    id: string,
    availability: Partial<InsertUserAvailability>,
  ): Promise<UserAvailability | undefined>;
  deleteUserAvailability(id: string): Promise<boolean>;
  listUserAvailability(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserAvailability[]>;

  // Timesheets
  getTimesheet(id: string): Promise<Timesheet | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(
    id: string,
    timesheet: Partial<InsertTimesheet>,
  ): Promise<Timesheet | undefined>;
  listTimesheets(userId?: string, status?: string): Promise<Timesheet[]>;

  // Documents
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(
    id: string,
    document: Partial<InsertDocument>,
  ): Promise<Document | undefined>;
  listDocuments(userId?: string, status?: string): Promise<Document[]>;

  // Knowledge Articles
  getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined>;
  createKnowledgeArticle(
    article: InsertKnowledgeArticle,
  ): Promise<KnowledgeArticle>;
  updateKnowledgeArticle(
    id: string,
    article: Partial<InsertKnowledgeArticle>,
  ): Promise<KnowledgeArticle | undefined>;
  deleteKnowledgeArticle(id: string): Promise<boolean>;
  listKnowledgeArticles(
    category?: string,
    publishStatus?: string,
  ): Promise<KnowledgeArticle[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  listAuditLogs(
    userId?: string,
    resourceType?: string,
    limit?: number,
  ): Promise<AuditLog[]>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  listSettings(): Promise<Setting[]>;

  // Smart Groups
  getSmartGroup(id: string): Promise<SmartGroup | undefined>;
  createSmartGroup(group: InsertSmartGroup): Promise<SmartGroup>;
  updateSmartGroup(
    id: string,
    group: Partial<InsertSmartGroup>,
  ): Promise<SmartGroup | undefined>;
  deleteSmartGroup(id: string): Promise<boolean>;
  listSmartGroups(categoryId?: string): Promise<SmartGroup[]>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByOnboardingToken(token: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.onboardingToken, token));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(user as any)
      .returning();
    return result[0];
  }

  async updateUser(
    id: string,
    user: Partial<Omit<InsertUser, "password">> & { passwordHash?: string },
  ): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async listUsers(status?: string): Promise<User[]> {
    if (status) {
      return await db.select().from(users).where(eq(users.status, status));
    }
    return await db.select().from(users);
  }

  // Time Entries
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const result = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id));
    return result[0];
  }

  async getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined> {
    const result = await db
      .select()
      .from(timeEntries)
      .where(
        and(eq(timeEntries.userId, userId), eq(timeEntries.status, "active")),
      )
      .orderBy(desc(timeEntries.clockIn))
      .limit(1);
    return result[0];
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const result = await db.insert(timeEntries).values(entry).returning();
    return result[0];
  }

  async updateTimeEntry(
    id: string,
    entry: Partial<InsertTimeEntry>,
  ): Promise<TimeEntry | undefined> {
    const result = await db
      .update(timeEntries)
      .set(entry)
      .where(eq(timeEntries.id, id))
      .returning();
    return result[0];
  }

  async listTimeEntries(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TimeEntry[]> {
    let query = db.select().from(timeEntries);
    const conditions = [];

    if (userId) conditions.push(eq(timeEntries.userId, userId));
    if (startDate) conditions.push(gte(timeEntries.clockIn, startDate));
    if (endDate) conditions.push(lte(timeEntries.clockIn, endDate));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(timeEntries.clockIn));
  }

  // Schedules
  async getSchedule(id: string): Promise<Schedule | undefined> {
    const result = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id));
    return result[0];
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const result = await db.insert(schedules).values(schedule).returning();
    return result[0];
  }

  async updateSchedule(
    id: string,
    schedule: Partial<InsertSchedule>,
  ): Promise<Schedule | undefined> {
    const result = await db
      .update(schedules)
      .set(schedule)
      .where(eq(schedules.id, id))
      .returning();
    return result[0];
  }

  async listSchedules(status?: string): Promise<Schedule[]> {
    if (status) {
      return await db
        .select()
        .from(schedules)
        .where(eq(schedules.status, status))
        .orderBy(desc(schedules.startDate));
    }
    return await db.select().from(schedules).orderBy(desc(schedules.startDate));
  }

  // Shift Templates
  async getShiftTemplate(id: string): Promise<ShiftTemplate | undefined> {
    const result = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.id, id));
    return result[0];
  }

  async createShiftTemplate(
    template: InsertShiftTemplate,
  ): Promise<ShiftTemplate> {
    const result = await db.insert(shiftTemplates).values(template).returning();
    return result[0];
  }

  async updateShiftTemplate(
    id: string,
    template: Partial<InsertShiftTemplate>,
  ): Promise<ShiftTemplate | undefined> {
    const result = await db
      .update(shiftTemplates)
      .set(template)
      .where(eq(shiftTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteShiftTemplate(id: string): Promise<boolean> {
    const result = await db
      .delete(shiftTemplates)
      .where(eq(shiftTemplates.id, id))
      .returning();
    return result.length > 0;
  }

  async listShiftTemplates(): Promise<ShiftTemplate[]> {
    return await db.select().from(shiftTemplates).orderBy(shiftTemplates.title);
  }

  // Shifts
  async getShift(id: string): Promise<Shift | undefined> {
    const result = await db.select().from(shifts).where(eq(shifts.id, id));
    return result[0];
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const result = await db.insert(shifts).values(shift).returning();
    return result[0];
  }

  async updateShift(
    id: string,
    shift: Partial<InsertShift>,
  ): Promise<Shift | undefined> {
    const result = await db
      .update(shifts)
      .set(shift)
      .where(eq(shifts.id, id))
      .returning();
    return result[0];
  }

  async deleteShift(id: string): Promise<boolean> {
    // First delete all shift assignments for this shift
    await db.delete(shiftAssignments).where(eq(shiftAssignments.shiftId, id));

    // Then delete the shift itself
    const result = await db.delete(shifts).where(eq(shifts.id, id)).returning();
    return result.length > 0;
  }

  async listShifts(
    scheduleId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Shift[]> {
    let query = db.select().from(shifts);
    const conditions = [];

    if (scheduleId) conditions.push(eq(shifts.scheduleId, scheduleId));
    if (startDate) conditions.push(gte(shifts.startTime, startDate));
    if (endDate) conditions.push(lte(shifts.startTime, endDate));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(shifts.startTime);
  }

  // Shift Assignments
  async getShiftAssignment(id: string): Promise<ShiftAssignment | undefined> {
    const result = await db
      .select()
      .from(shiftAssignments)
      .where(eq(shiftAssignments.id, id));
    return result[0];
  }

  async createShiftAssignment(
    assignment: InsertShiftAssignment,
  ): Promise<ShiftAssignment> {
    const result = await db
      .insert(shiftAssignments)
      .values(assignment)
      .returning();
    return result[0];
  }

  async updateShiftAssignment(
    id: string,
    assignment: Partial<InsertShiftAssignment>,
  ): Promise<ShiftAssignment | undefined> {
    const result = await db
      .update(shiftAssignments)
      .set(assignment)
      .where(eq(shiftAssignments.id, id))
      .returning();
    return result[0];
  }

  async deleteShiftAssignment(id: string): Promise<boolean> {
    const result = await db
      .delete(shiftAssignments)
      .where(eq(shiftAssignments.id, id))
      .returning();
    return result.length > 0;
  }

  async listShiftAssignments(
    shiftId?: string,
    userId?: string,
  ): Promise<ShiftAssignment[]> {
    let query = db.select().from(shiftAssignments);
    const conditions = [];

    if (shiftId) conditions.push(eq(shiftAssignments.shiftId, shiftId));
    if (userId) conditions.push(eq(shiftAssignments.userId, userId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(shiftAssignments.assignedAt));
  }

  // User Availability
  async getUserAvailability(id: string): Promise<UserAvailability | undefined> {
    const result = await db
      .select()
      .from(userAvailability)
      .where(eq(userAvailability.id, id));
    return result[0];
  }

  async createUserAvailability(
    availability: InsertUserAvailability,
  ): Promise<UserAvailability> {
    const result = await db
      .insert(userAvailability)
      .values(availability)
      .returning();
    return result[0];
  }

  async updateUserAvailability(
    id: string,
    availability: Partial<InsertUserAvailability>,
  ): Promise<UserAvailability | undefined> {
    const result = await db
      .update(userAvailability)
      .set(availability)
      .where(eq(userAvailability.id, id))
      .returning();
    return result[0];
  }

  async deleteUserAvailability(id: string): Promise<boolean> {
    const result = await db
      .delete(userAvailability)
      .where(eq(userAvailability.id, id))
      .returning();
    return result.length > 0;
  }

  async listUserAvailability(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserAvailability[]> {
    let query = db.select().from(userAvailability);
    const conditions = [];

    if (userId) conditions.push(eq(userAvailability.userId, userId));
    if (startDate) conditions.push(gte(userAvailability.date, startDate));
    if (endDate) conditions.push(lte(userAvailability.date, endDate));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(userAvailability.date);
  }

  // Timesheets
  async getTimesheet(id: string): Promise<Timesheet | undefined> {
    const result = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, id));
    return result[0];
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const result = await db.insert(timesheets).values(timesheet).returning();
    return result[0];
  }

  async updateTimesheet(
    id: string,
    timesheet: Partial<InsertTimesheet>,
  ): Promise<Timesheet | undefined> {
    const result = await db
      .update(timesheets)
      .set(timesheet)
      .where(eq(timesheets.id, id))
      .returning();
    return result[0];
  }

  async listTimesheets(userId?: string, status?: string): Promise<Timesheet[]> {
    let query = db.select().from(timesheets);
    const conditions = [];

    if (userId) conditions.push(eq(timesheets.userId, userId));
    if (status) conditions.push(eq(timesheets.status, status));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(timesheets.periodStart));
  }

  // Documents
  async getDocument(id: string): Promise<Document | undefined> {
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return result[0];
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(document).returning();
    return result[0];
  }

  async updateDocument(
    id: string,
    document: Partial<InsertDocument>,
  ): Promise<Document | undefined> {
    const result = await db
      .update(documents)
      .set(document)
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }

  async listDocuments(userId?: string, status?: string): Promise<Document[]> {
    let query = db.select().from(documents);
    const conditions = [];

    if (userId) conditions.push(eq(documents.userId, userId));
    if (status) conditions.push(eq(documents.status, status));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(documents.uploadedDate));
  }

  // Knowledge Articles
  async getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined> {
    const result = await db
      .select()
      .from(knowledgeArticles)
      .where(eq(knowledgeArticles.id, id));
    return result[0];
  }

  async createKnowledgeArticle(
    article: InsertKnowledgeArticle,
  ): Promise<KnowledgeArticle> {
    const result = await db
      .insert(knowledgeArticles)
      .values(article)
      .returning();
    return result[0];
  }

  async updateKnowledgeArticle(
    id: string,
    article: Partial<InsertKnowledgeArticle>,
  ): Promise<KnowledgeArticle | undefined> {
    const result = await db
      .update(knowledgeArticles)
      .set(article)
      .where(eq(knowledgeArticles.id, id))
      .returning();
    return result[0];
  }

  async deleteKnowledgeArticle(id: string): Promise<boolean> {
    const result = await db
      .delete(knowledgeArticles)
      .where(eq(knowledgeArticles.id, id))
      .returning();
    return result.length > 0;
  }

  async listKnowledgeArticles(
    category?: string,
    publishStatus?: string,
  ): Promise<KnowledgeArticle[]> {
    let query = db.select().from(knowledgeArticles);
    const conditions = [];

    if (category) conditions.push(eq(knowledgeArticles.category, category));
    if (publishStatus)
      conditions.push(eq(knowledgeArticles.publishStatus, publishStatus));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(knowledgeArticles.lastUpdated));
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async listAuditLogs(
    userId?: string,
    resourceType?: string,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    const conditions = [];

    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(auditLogs.timestamp)).limit(limit);
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key));
    return result[0];
  }

  async setSetting(setting: InsertSetting): Promise<Setting> {
    const existing = await this.getSetting(setting.key);

    if (existing) {
      const updateData: Partial<InsertSetting> & { updatedAt: Date } = {
        value: setting.value,
        updatedAt: new Date(),
      };

      // Persist encryptedValue if provided
      if ("encryptedValue" in setting) {
        updateData.encryptedValue = setting.encryptedValue;
      }

      const result = await db
        .update(settings)
        .set(updateData)
        .where(eq(settings.key, setting.key))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(settings).values(setting).returning();
      return result[0];
    }
  }

  async listSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  // Smart Groups
  async getSmartGroup(id: string): Promise<SmartGroup | undefined> {
    const result = await db
      .select()
      .from(smartGroups)
      .where(eq(smartGroups.id, id));
    return result[0];
  }

  async createSmartGroup(group: InsertSmartGroup): Promise<SmartGroup> {
    const result = await db.insert(smartGroups).values(group).returning();
    return result[0];
  }

  async updateSmartGroup(
    id: string,
    group: Partial<InsertSmartGroup>,
  ): Promise<SmartGroup | undefined> {
    const updateData = {
      ...group,
      updatedAt: new Date(),
    };

    const result = await db
      .update(smartGroups)
      .set(updateData)
      .where(eq(smartGroups.id, id))
      .returning();
    return result[0];
  }

  async deleteSmartGroup(id: string): Promise<boolean> {
    const result = await db
      .delete(smartGroups)
      .where(eq(smartGroups.id, id))
      .returning();
    return result.length > 0;
  }

  async listSmartGroups(categoryId?: string): Promise<SmartGroup[]> {
    let query = db.select().from(smartGroups);

    if (categoryId) {
      query = query.where(eq(smartGroups.categoryId, categoryId)) as any;
    }

    return await query.orderBy(smartGroups.categoryId, smartGroups.name);
  }
}

export const storage = new DbStorage();
