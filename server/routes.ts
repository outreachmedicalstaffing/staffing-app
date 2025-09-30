import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { z } from "zod";
import { insertUserSchema, insertTimeEntrySchema, insertShiftSchema, insertShiftAssignmentSchema, insertTimesheetSchema, insertDocumentSchema, insertKnowledgeArticleSchema, insertAuditLogSchema, insertSettingSchema, insertScheduleSchema, insertShiftTemplateSchema } from "@shared/schema";
import "./types"; // Import session and request type augmentations

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Middleware to check role authorization
function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    req.user = user;
    next();
  };
}

// Helper to create audit log
async function logAudit(userId: string | undefined, action: string, resourceType: string, resourceId?: string, phiAccessed: boolean = false, phiFields: string[] = [], details: any = {}, ipAddress?: string) {
  try {
    await storage.createAuditLog({
      userId: userId || null,
      action,
      resourceType,
      resourceId,
      ipAddress,
      userAgent: undefined,
      phiAccessed,
      phiFields,
      details,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== Authentication Routes =====
  
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingByUsername = await storage.getUserByUsername(data.username);
      if (existingByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const existingByEmail = await storage.getUserByEmail(data.email);
      if (existingByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);
      
      // Create user
      const { password, ...userData } = data;
      const user = await storage.createUser({
        ...userData,
        passwordHash,
      } as any);
      
      // Log audit
      await logAudit(user.id, "register", "user", user.id, false, [], {}, req.ip);
      
      // Auto-login after registration
      req.session.userId = user.id;
      
      const { passwordHash: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to register user" });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        await logAudit(user.id, "failed_login", "user", user.id, false, [], {}, req.ip);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      req.session.userId = user.id;
      await logAudit(user.id, "login", "user", user.id, false, [], {}, req.ip);
      
      const { passwordHash: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ error: "Failed to login" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const userId = req.session.userId;
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      logAudit(userId, "logout", "user", userId, false, [], {}, req.ip);
      res.json({ success: true });
    });
  });
  
  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { passwordHash: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  // ===== Time Entry Routes =====
  
  // Clock in
  app.post("/api/time/clock-in", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user is already clocked in
      const activeEntry = await storage.getActiveTimeEntry(userId);
      if (activeEntry) {
        return res.status(400).json({ error: "Already clocked in" });
      }
      
      const entry = await storage.createTimeEntry({
        userId,
        clockIn: new Date(),
        clockOut: null,
        location: req.body.location || null,
        notes: req.body.notes || null,
        status: 'active',
        breakMinutes: 0,
      });
      
      await logAudit(userId, "clock_in", "time_entry", entry.id, false, [], {}, req.ip);
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to clock in" });
    }
  });
  
  // Clock out
  app.post("/api/time/clock-out", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const activeEntry = await storage.getActiveTimeEntry(userId);
      if (!activeEntry) {
        return res.status(400).json({ error: "Not clocked in" });
      }
      
      const entry = await storage.updateTimeEntry(activeEntry.id, {
        clockOut: new Date(),
        status: 'completed',
        breakMinutes: req.body.breakMinutes || 0,
        notes: req.body.notes || activeEntry.notes,
      });
      
      await logAudit(userId, "clock_out", "time_entry", activeEntry.id, false, [], {}, req.ip);
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to clock out" });
    }
  });
  
  // Get active time entry
  app.get("/api/time/active", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const entry = await storage.getActiveTimeEntry(userId);
      res.json(entry || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to get active time entry" });
    }
  });
  
  // Auto clock-out (for admin/system use)
  app.post("/api/time/auto-clock-out", requireRole('Owner', 'Admin'), async (req, res) => {
    try {
      // Auto-clockout entries older than specified hours (default 14)
      const maxHours = req.body.maxHours || 14;
      const cutoffTime = new Date(Date.now() - maxHours * 60 * 60 * 1000);
      
      // Get all active entries older than cutoff
      const allEntries = await storage.listTimeEntries(undefined, undefined, cutoffTime);
      const activeEntries = allEntries.filter(e => e.status === 'active' && e.clockIn < cutoffTime);
      
      const updated = [];
      for (const entry of activeEntries) {
        const autoClockOut = new Date(entry.clockIn.getTime() + maxHours * 60 * 60 * 1000);
        const updatedEntry = await storage.updateTimeEntry(entry.id, {
          clockOut: autoClockOut,
          status: 'auto-clocked-out',
        });
        if (updatedEntry) {
          updated.push(updatedEntry);
          await logAudit(req.session.userId, "auto_clock_out", "time_entry", updatedEntry.id, false, [], { userId: updatedEntry.userId }, req.ip);
        }
      }
      
      res.json({ count: updated.length, entries: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to auto clock-out" });
    }
  });
  
  // List time entries
  app.get("/api/time/entries", requireAuth, async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Check permissions
      if (userId && userId !== req.session.userId) {
        const user = await storage.getUser(req.session.userId!);
        if (!user || !['Owner', 'Admin', 'Payroll', 'Manager'].includes(user.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      
      const entries = await storage.listTimeEntries(userId || req.session.userId!, startDate, endDate);
      await logAudit(req.session.userId, "view", "time_entries", undefined, false, [], { userId }, req.ip);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to list time entries" });
    }
  });
  
  // ===== Schedule Routes =====
  
  // List schedules
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const schedules = await storage.listSchedules(status);
      await logAudit(req.session.userId, "view", "schedules", undefined, false, [], {}, req.ip);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to list schedules" });
    }
  });
  
  // Create schedule
  app.post("/api/schedules", requireRole('Owner', 'Admin', 'Scheduler'), async (req, res) => {
    try {
      const data = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule({
        ...data,
        createdBy: req.session.userId!,
      });
      
      await logAudit(req.session.userId, "create", "schedule", schedule.id, false, [], {}, req.ip);
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });
  
  // List shifts
  app.get("/api/shifts", requireAuth, async (req, res) => {
    try {
      const scheduleId = req.query.scheduleId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const shifts = await storage.listShifts(scheduleId, startDate, endDate);
      await logAudit(req.session.userId, "view", "shifts", undefined, false, [], {}, req.ip);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ error: "Failed to list shifts" });
    }
  });
  
  // Create shift
  app.post("/api/shifts", requireRole('Owner', 'Admin', 'Scheduler'), async (req, res) => {
    try {
      const data = insertShiftSchema.parse(req.body);
      const shift = await storage.createShift(data);
      
      await logAudit(req.session.userId, "create", "shift", shift.id, false, [], {}, req.ip);
      res.json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create shift" });
    }
  });
  
  // Update shift
  app.patch("/api/shifts/:id", requireRole('Owner', 'Admin', 'Scheduler'), async (req, res) => {
    try {
      // Validate update data
      const updateSchema = insertShiftSchema.partial();
      const data = updateSchema.parse(req.body);
      
      const shift = await storage.updateShift(req.params.id, data);
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      
      await logAudit(req.session.userId, "update", "shift", shift.id, false, [], {}, req.ip);
      res.json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update shift" });
    }
  });
  
  // Delete shift
  app.delete("/api/shifts/:id", requireRole('Owner', 'Admin', 'Scheduler'), async (req, res) => {
    try {
      const success = await storage.deleteShift(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Shift not found" });
      }
      
      await logAudit(req.session.userId, "delete", "shift", req.params.id, false, [], {}, req.ip);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shift" });
    }
  });
  
  // Assign user to shift
  app.post("/api/shifts/:id/assign", requireRole('Owner', 'Admin', 'Scheduler', 'Manager'), async (req, res) => {
    try {
      const data = insertShiftAssignmentSchema.parse({
        ...req.body,
        shiftId: req.params.id,
      });
      
      const assignment = await storage.createShiftAssignment(data);
      await logAudit(req.session.userId, "assign", "shift_assignment", assignment.id, false, [], {}, req.ip);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to assign shift" });
    }
  });
  
  // List shift assignments
  app.get("/api/shift-assignments", requireAuth, async (req, res) => {
    try {
      const shiftId = req.query.shiftId as string | undefined;
      const userId = req.query.userId as string | undefined;
      
      const assignments = await storage.listShiftAssignments(shiftId, userId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to list shift assignments" });
    }
  });
  
  // ===== Timesheet Routes =====
  
  // List timesheets
  app.get("/api/timesheets", requireAuth, async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const status = req.query.status as string | undefined;
      
      // Check permissions
      if (userId && userId !== req.session.userId) {
        const user = await storage.getUser(req.session.userId!);
        if (!user || !['Owner', 'Admin', 'Payroll', 'Manager'].includes(user.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      
      const timesheets = await storage.listTimesheets(userId, status);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ error: "Failed to list timesheets" });
    }
  });
  
  // Create timesheet
  app.post("/api/timesheets", requireAuth, async (req, res) => {
    try {
      const data = insertTimesheetSchema.parse(req.body);
      const timesheet = await storage.createTimesheet(data);
      
      await logAudit(req.session.userId, "create", "timesheet", timesheet.id, false, [], {}, req.ip);
      res.json(timesheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create timesheet" });
    }
  });
  
  // Approve timesheet
  app.post("/api/timesheets/:id/approve", requireRole('Owner', 'Admin', 'Payroll', 'Manager'), async (req, res) => {
    try {
      const timesheet = await storage.updateTimesheet(req.params.id, {
        status: 'approved',
        approvedBy: req.session.userId!,
        approvedAt: new Date(),
      });
      
      if (!timesheet) {
        return res.status(404).json({ error: "Timesheet not found" });
      }
      
      await logAudit(req.session.userId, "approve", "timesheet", timesheet.id, false, [], {}, req.ip);
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve timesheet" });
    }
  });
  
  // ===== Document Routes =====
  
  // List documents
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const status = req.query.status as string | undefined;
      
      // Check permissions
      if (userId && userId !== req.session.userId) {
        const user = await storage.getUser(req.session.userId!);
        if (!user || !['Owner', 'Admin', 'HR', 'Manager'].includes(user.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      
      const documents = await storage.listDocuments(userId || req.session.userId!, status);
      
      await logAudit(req.session.userId, "view", "documents", undefined, true, ['encryptedMetadata'], {}, req.ip);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to list documents" });
    }
  });
  
  // Create document
  app.post("/api/documents", requireAuth, async (req, res) => {
    try {
      const data = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument({
        ...data,
        userId: data.userId || req.session.userId!,
      });
      
      await logAudit(req.session.userId, "create", "document", document.id, true, ['encryptedMetadata'], {}, req.ip);
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create document" });
    }
  });
  
  // Approve document
  app.post("/api/documents/:id/approve", requireRole('Owner', 'Admin', 'HR'), async (req, res) => {
    try {
      const document = await storage.updateDocument(req.params.id, {
        status: 'approved',
        approvedBy: req.session.userId!,
        approvedAt: new Date(),
      });
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      await logAudit(req.session.userId, "approve", "document", document.id, false, [], {}, req.ip);
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve document" });
    }
  });
  
  // ===== Knowledge Base Routes =====
  
  // List knowledge articles
  app.get("/api/knowledge", requireAuth, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const publishStatus = req.query.publishStatus as string | undefined;
      
      const articles = await storage.listKnowledgeArticles(category, publishStatus);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to list knowledge articles" });
    }
  });
  
  // Create knowledge article
  app.post("/api/knowledge", requireRole('Owner', 'Admin', 'HR'), async (req, res) => {
    try {
      const data = insertKnowledgeArticleSchema.parse({
        ...req.body,
        authorId: req.session.userId!,
      });
      
      const article = await storage.createKnowledgeArticle(data);
      await logAudit(req.session.userId, "create", "knowledge_article", article.id, false, [], {}, req.ip);
      res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create knowledge article" });
    }
  });
  
  // Update knowledge article
  app.patch("/api/knowledge/:id", requireRole('Owner', 'Admin', 'HR'), async (req, res) => {
    try {
      // Validate update data
      const updateSchema = insertKnowledgeArticleSchema.partial();
      const data = updateSchema.parse(req.body);
      
      const article = await storage.updateKnowledgeArticle(req.params.id, data);
      if (!article) {
        return res.status(404).json({ error: "Knowledge article not found" });
      }
      
      await logAudit(req.session.userId, "update", "knowledge_article", article.id, false, [], {}, req.ip);
      res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update knowledge article" });
    }
  });
  
  // ===== User Management Routes =====
  
  // List users
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['Owner', 'Admin', 'HR', 'Manager', 'Scheduler'].includes(user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const status = req.query.status as string | undefined;
      const users = await storage.listUsers(status);
      
      // Remove password hashes from response
      const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);
      
      await logAudit(req.session.userId, "view", "users", undefined, true, ['customFields'], {}, req.ip);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to list users" });
    }
  });
  
  // Get user by ID
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const requestingUser = await storage.getUser(req.session.userId!);
      if (!requestingUser) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Users can view their own profile, or admins can view any profile
      if (req.params.id !== req.session.userId && !['Owner', 'Admin', 'HR', 'Manager'].includes(requestingUser.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { passwordHash, ...userResponse } = user;
      await logAudit(req.session.userId, "view", "user", user.id, true, ['customFields'], {}, req.ip);
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  // Update user
  app.patch("/api/users/:id", requireRole('Owner', 'Admin', 'HR'), async (req, res) => {
    try {
      const { password, ...updateData } = req.body;
      
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        updateData.passwordHash = passwordHash;
      }
      
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { passwordHash: _, ...userResponse } = user;
      await logAudit(req.session.userId, "update", "user", user.id, true, ['customFields'], {}, req.ip);
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  
  // ===== Settings Routes =====
  
  // Get all settings
  app.get("/api/settings", requireRole('Owner', 'Admin'), async (req, res) => {
    try {
      const settings = await storage.listSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to list settings" });
    }
  });
  
  // Get setting by key
  app.get("/api/settings/:key", requireRole('Owner', 'Admin'), async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to get setting" });
    }
  });
  
  // Set setting
  app.put("/api/settings/:key", requireRole('Owner', 'Admin'), async (req, res) => {
    try {
      const data = insertSettingSchema.parse({
        key: req.params.key,
        ...req.body,
      });
      
      const setting = await storage.setSetting(data);
      await logAudit(req.session.userId, "update", "setting", setting.id, false, [], { key: setting.key }, req.ip);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to set setting" });
    }
  });
  
  // ===== Audit Log Routes =====
  
  // List audit logs
  app.get("/api/audit-logs", requireRole('Owner', 'Admin'), async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const resourceType = req.query.resourceType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const logs = await storage.listAuditLogs(userId, resourceType, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to list audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
