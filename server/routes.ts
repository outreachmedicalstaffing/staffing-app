import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { z } from "zod";
import { insertUserSchema, insertTimeEntrySchema, insertShiftSchema, insertShiftAssignmentSchema, insertUserAvailabilitySchema, insertTimesheetSchema, insertDocumentSchema, insertKnowledgeArticleSchema, insertAuditLogSchema, insertSettingSchema, insertScheduleSchema, insertShiftTemplateSchema } from "@shared/schema";
import "./types"; // Import session and request type augmentations
import { upload } from "./upload";
import path from "path";
import fs from "fs";

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
        shiftNoteAttachments: req.body.shiftNoteAttachments || null,
        relievingNurseSignature: req.body.relievingNurseSignature || null,
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
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const requestedUserId = req.query.userId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Only Owner and Admin can see all users' time entries
      const canSeeAllUsers = ['Owner', 'Admin'].includes(currentUser.role);
      
      let userId: string | undefined;
      if (canSeeAllUsers) {
        userId = requestedUserId; // Can query any user or all users (undefined)
      } else {
        userId = req.session.userId!; // Can only see own time entries
      }
      
      const entries = await storage.listTimeEntries(userId, startDate, endDate);
      await logAudit(req.session.userId, "view", "time_entries", undefined, false, [], { userId }, req.ip);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to list time entries" });
    }
  });

  // Update time entry (for Owner/Admin to edit timesheets)
  app.patch("/api/time/entries/:id", requireRole('Owner', 'Admin'), async (req, res) => {
    try {
      const entryId = req.params.id;
      const updateSchema = insertTimeEntrySchema.partial();
      const data = updateSchema.parse(req.body);
      
      // Get existing entry
      const existing = await storage.getTimeEntry(entryId);
      if (!existing) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      
      // Check if entry is locked - prevent ANY edits to locked entries
      if (existing.locked) {
        // Only allow unlocking if that's the ONLY change
        if (req.body.locked === false && Object.keys(req.body).length === 1) {
          // Allow unlock-only request
        } else {
          return res.status(403).json({ error: "Cannot edit locked time entry. Unlock it first." });
        }
      }
      
      const entry = await storage.updateTimeEntry(entryId, data);
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      
      await logAudit(req.session.userId, "update", "time_entry", entry.id, false, [], { changes: data }, req.ip);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update time entry" });
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
  
  // ===== Shift Templates Routes =====
  
  // List shift templates
  app.get("/api/shift-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.listShiftTemplates();
      await logAudit(req.session.userId, "view", "shift_templates", undefined, false, [], {}, req.ip);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to list shift templates" });
    }
  });
  
  // Create shift template
  app.post("/api/shift-templates", requireRole('Owner', 'Admin', 'Scheduler'), async (req, res) => {
    try {
      const data = insertShiftTemplateSchema.parse(req.body);
      const template = await storage.createShiftTemplate(data);
      
      await logAudit(req.session.userId, "create", "shift_template", template.id, false, [], {}, req.ip);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create shift template" });
    }
  });
  
  // Update shift template
  app.patch("/api/shift-templates/:id", requireRole('Owner', 'Admin', 'Scheduler'), async (req, res) => {
    try {
      const updateSchema = insertShiftTemplateSchema.partial();
      const data = updateSchema.parse(req.body);
      
      const template = await storage.updateShiftTemplate(req.params.id, data);
      if (!template) {
        return res.status(404).json({ error: "Shift template not found" });
      }
      
      await logAudit(req.session.userId, "update", "shift_template", template.id, false, [], {}, req.ip);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update shift template" });
    }
  });
  
  // Delete shift template
  app.delete("/api/shift-templates/:id", requireRole('Owner', 'Admin', 'Scheduler'), async (req, res) => {
    try {
      const success = await storage.deleteShiftTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Shift template not found" });
      }
      
      await logAudit(req.session.userId, "delete", "shift_template", req.params.id, false, [], {}, req.ip);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shift template" });
    }
  });
  
  // ===== Shift Routes =====
  
  // List shifts
  app.get("/api/shifts", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const scheduleId = req.query.scheduleId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Only Owner and Admin can see all shifts
      const canSeeAllShifts = ['Owner', 'Admin'].includes(currentUser.role);
      
      if (canSeeAllShifts) {
        // Return all shifts
        const shifts = await storage.listShifts(scheduleId, startDate, endDate);
        await logAudit(req.session.userId, "view", "shifts", undefined, false, [], {}, req.ip);
        res.json(shifts);
      } else {
        // Return only shifts assigned to this user
        const allShifts = await storage.listShifts(scheduleId, startDate, endDate);
        const userAssignments = await storage.listShiftAssignments(undefined, req.session.userId);
        const assignedShiftIds = new Set(userAssignments.map(a => a.shiftId));
        const userShifts = allShifts.filter(shift => assignedShiftIds.has(shift.id));
        
        await logAudit(req.session.userId, "view", "shifts", undefined, false, [], {}, req.ip);
        res.json(userShifts);
      }
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
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const shiftId = req.query.shiftId as string | undefined;
      const requestedUserId = req.query.userId as string | undefined;
      
      // Only Owner and Admin can see all assignments
      const canSeeAll = ['Owner', 'Admin'].includes(currentUser.role);
      
      let userId: string | undefined;
      if (canSeeAll) {
        userId = requestedUserId; // Can query any user
      } else {
        userId = req.session.userId; // Can only see own assignments
      }
      
      const assignments = await storage.listShiftAssignments(shiftId, userId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to list shift assignments" });
    }
  });
  
  // ===== User Availability Routes =====
  
  // Create user availability
  app.post("/api/user-availability", requireAuth, async (req, res) => {
    try {
      const data = insertUserAvailabilitySchema.parse(req.body);
      const availability = await storage.createUserAvailability(data);
      await logAudit(req.session.userId, "create", "user_availability", availability.id, false, [], {}, req.ip);
      res.json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create availability" });
    }
  });
  
  // List user availability
  app.get("/api/user-availability", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const requestedUserId = req.query.userId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Only Owner and Admin can see all users' availability
      const canSeeAll = ['Owner', 'Admin'].includes(currentUser.role);
      
      let userId: string | undefined;
      if (canSeeAll) {
        userId = requestedUserId; // Can query any user
      } else {
        userId = req.session.userId; // Can only see own availability
      }
      
      const availability = await storage.listUserAvailability(userId, startDate, endDate);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ error: "Failed to list availability" });
    }
  });
  
  // Update user availability
  app.patch("/api/user-availability/:id", requireAuth, async (req, res) => {
    try {
      const data = insertUserAvailabilitySchema.partial().parse(req.body);
      const availability = await storage.updateUserAvailability(req.params.id, data);
      
      if (!availability) {
        return res.status(404).json({ error: "Availability not found" });
      }
      
      await logAudit(req.session.userId, "update", "user_availability", availability.id, false, [], {}, req.ip);
      res.json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update availability" });
    }
  });
  
  // Delete user availability
  app.delete("/api/user-availability/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteUserAvailability(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Availability not found" });
      }
      
      await logAudit(req.session.userId, "delete", "user_availability", req.params.id, false, [], {}, req.ip);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete availability" });
    }
  });
  
  // ===== Timesheet Routes =====
  
  // List timesheets
  app.get("/api/timesheets", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const requestedUserId = req.query.userId as string | undefined;
      const status = req.query.status as string | undefined;
      
      // Only Owner and Admin can see all users' timesheets
      const canSeeAllUsers = ['Owner', 'Admin'].includes(currentUser.role);
      
      let userId: string | undefined;
      if (canSeeAllUsers) {
        userId = requestedUserId; // Can query any user
      } else {
        userId = req.session.userId; // Can only see own timesheets
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
  
  // Update timesheet
  app.patch("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      // Check ownership or admin role
      const existing = await storage.getTimesheet(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Timesheet not found" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Define allowed fields based on role
      const isPrivileged = ['Owner', 'Admin', 'Payroll', 'Manager'].includes(user.role);
      const isOwner = existing.userId === req.session.userId;
      
      if (!isOwner && !isPrivileged) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Parse and validate data
      const updateSchema = insertTimesheetSchema.partial();
      const data = updateSchema.parse(req.body);
      
      // Filter allowed fields based on role
      const allowedSelfFields = ['notes']; // Staff can only update notes on their own timesheet
      const privilegedFields = ['status', 'approvedBy', 'approvedAt', 'totalHours', 'regularHours', 'overtimeHours', 'periodStart', 'periodEnd'];
      
      // Remove protected fields if user is not privileged
      if (!isPrivileged) {
        for (const field of privilegedFields) {
          if (field in data) {
            delete (data as any)[field];
          }
        }
        
        // Additionally, only allow self-editable fields for owners
        const dataKeys = Object.keys(data);
        for (const key of dataKeys) {
          if (!allowedSelfFields.includes(key)) {
            delete (data as any)[key];
          }
        }
      }
      
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      const timesheet = await storage.updateTimesheet(req.params.id, data);
      await logAudit(req.session.userId, "update", "timesheet", timesheet!.id, false, [], {}, req.ip);
      res.json(timesheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update timesheet" });
    }
  });
  
  // Submit timesheet for approval
  app.post("/api/timesheets/:id/submit", requireAuth, async (req, res) => {
    try {
      // Check ownership
      const existing = await storage.getTimesheet(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Timesheet not found" });
      }
      
      // Only owner can submit their own timesheet
      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden - can only submit your own timesheet" });
      }
      
      const timesheet = await storage.updateTimesheet(req.params.id, {
        status: 'submitted',
      });
      
      await logAudit(req.session.userId, "submit", "timesheet", timesheet!.id, false, [], {}, req.ip);
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit timesheet" });
    }
  });
  
  // Approve timesheet
  app.post("/api/timesheets/:id/approve", requireRole('Owner', 'Admin', 'Payroll', 'Manager'), async (req, res) => {
    try {
      const timesheet = await storage.updateTimesheet(req.params.id, {
        status: 'approved',
        approvedBy: req.session.userId!,
        approvedAt: new Date(),
        notes: req.body.notes || null,
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
  
  // Reject timesheet
  app.post("/api/timesheets/:id/reject", requireRole('Owner', 'Admin', 'Payroll', 'Manager'), async (req, res) => {
    try {
      const timesheet = await storage.updateTimesheet(req.params.id, {
        status: 'rejected',
        notes: req.body.notes || 'Rejected by manager',
      });
      
      if (!timesheet) {
        return res.status(404).json({ error: "Timesheet not found" });
      }
      
      await logAudit(req.session.userId, "reject", "timesheet", timesheet.id, false, [], {}, req.ip);
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject timesheet" });
    }
  });
  
  // Export timesheet for payroll
  app.post("/api/timesheets/:id/export", requireRole('Owner', 'Admin', 'Payroll'), async (req, res) => {
    try {
      const timesheet = await storage.updateTimesheet(req.params.id, {
        status: 'exported',
      });
      
      if (!timesheet) {
        return res.status(404).json({ error: "Timesheet not found" });
      }
      
      await logAudit(req.session.userId, "export", "timesheet", timesheet.id, true, ['totalHours', 'regularHours', 'overtimeHours'], {}, req.ip);
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ error: "Failed to export timesheet" });
    }
  });
  
  // ===== Document Routes =====
  
  // List documents
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const requestedUserId = req.query.userId as string | undefined;
      const status = req.query.status as string | undefined;
      
      // Only Owner and Admin can see all users' documents
      const canSeeAllUsers = ['Owner', 'Admin'].includes(currentUser.role);
      
      let userId: string | undefined;
      if (canSeeAllUsers) {
        userId = requestedUserId; // Can query any user or all users (undefined)
      } else {
        userId = req.session.userId!; // Can only see own documents
      }
      
      const documents = await storage.listDocuments(userId, status);
      
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
  
  // Update document
  app.patch("/api/documents/:id", requireRole('Owner', 'Admin', 'HR'), async (req, res) => {
    try {
      const updateSchema = insertDocumentSchema.partial();
      const data = updateSchema.parse(req.body);
      
      const document = await storage.updateDocument(req.params.id, data);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      await logAudit(req.session.userId, "update", "document", document.id, true, ['encryptedMetadata'], {}, req.ip);
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update document" });
    }
  });
  
  // Submit document for review
  app.post("/api/documents/:id/submit", requireAuth, async (req, res) => {
    try {
      // Check ownership or HR role
      const existing = await storage.getDocument(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Only owner or HR roles can submit documents
      if (existing.userId !== req.session.userId && !['Owner', 'Admin', 'HR'].includes(user.role)) {
        return res.status(403).json({ error: "Forbidden - can only submit your own documents" });
      }
      
      const document = await storage.updateDocument(req.params.id, {
        status: 'submitted',
      });
      
      await logAudit(req.session.userId, "submit", "document", document!.id, true, ['encryptedMetadata'], {}, req.ip);
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit document" });
    }
  });
  
  // Approve document
  app.post("/api/documents/:id/approve", requireRole('Owner', 'Admin', 'HR'), async (req, res) => {
    try {
      const document = await storage.updateDocument(req.params.id, {
        status: 'approved',
        approvedBy: req.session.userId!,
        approvedAt: new Date(),
        notes: req.body.notes || null,
      });
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      await logAudit(req.session.userId, "approve", "document", document.id, true, ['encryptedMetadata'], {}, req.ip);
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve document" });
    }
  });
  
  // Reject document
  app.post("/api/documents/:id/reject", requireRole('Owner', 'Admin', 'HR'), async (req, res) => {
    try {
      const document = await storage.updateDocument(req.params.id, {
        status: 'rejected',
        notes: req.body.notes || 'Document rejected',
      });
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      await logAudit(req.session.userId, "reject", "document", document.id, false, [], {}, req.ip);
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject document" });
    }
  });
  
  // Check for expiring documents (for system/admin use)
  app.get("/api/documents/check-expiry", requireRole('Owner', 'Admin', 'HR'), async (req, res) => {
    try {
      const daysThreshold = parseInt(req.query.days as string) || 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysThreshold);
      
      // Get all documents and filter for expiring ones
      const allDocs = await storage.listDocuments();
      const expiringDocs = allDocs.filter(doc => 
        doc.expiryDate && 
        doc.expiryDate <= expiryDate && 
        doc.expiryDate > new Date() &&
        doc.status === 'approved'
      );
      
      // Update status to expiring
      for (const doc of expiringDocs) {
        await storage.updateDocument(doc.id, { status: 'expiring' });
      }
      
      await logAudit(req.session.userId, "check_expiry", "documents", undefined, false, [], { count: expiringDocs.length }, req.ip);
      res.json({ count: expiringDocs.length, documents: expiringDocs });
    } catch (error) {
      res.status(500).json({ error: "Failed to check document expiry" });
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
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Only Owner and Admin can see all users
      const canSeeAllUsers = ['Owner', 'Admin'].includes(currentUser.role);
      
      let users;
      if (canSeeAllUsers) {
        const status = req.query.status as string | undefined;
        users = await storage.listUsers(status);
      } else {
        // Regular users can only see themselves
        users = [currentUser];
      }
      
      // Remove password hashes from response
      const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);
      
      await logAudit(req.session.userId, "view", "users", undefined, canSeeAllUsers, canSeeAllUsers ? ['customFields'] : [], {}, req.ip);
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
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const requestingUser = await storage.getUser(req.session.userId!);
      if (!requestingUser) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const isOwnProfile = req.params.id === req.session.userId;
      const canEditAnyUser = ['Owner', 'Admin', 'HR'].includes(requestingUser.role);
      
      // Users can edit their own profile, or Owner/Admin/HR can edit any profile
      if (!isOwnProfile && !canEditAnyUser) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const { password, ...updateData } = req.body;
      
      // Only Owner/Admin/HR can change roles
      if (updateData.role && !canEditAnyUser) {
        return res.status(403).json({ error: "You cannot change user roles" });
      }
      
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
  
  // ===== File Upload/Download Routes =====
  
  // Upload file
  app.post("/api/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      await logAudit(req.session.userId, "upload", "file", req.file.filename, false, [], { 
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }, req.ip);
      
      res.json({
        success: true,
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        }
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
  
  // Download/view file
  app.get("/api/files/:filename", requireAuth, async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      await logAudit(req.session.userId, "download", "file", filename, false, [], {}, req.ip);
      
      // Send file with appropriate headers for viewing in browser
      res.sendFile(filePath);
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });
  
  // Delete file
  app.delete("/api/files/:filename", requireRole('Owner', 'Admin', 'Scheduler'), async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      fs.unlinkSync(filePath);
      
      await logAudit(req.session.userId, "delete", "file", filename, false, [], {}, req.ip);
      
      res.json({ success: true, message: "File deleted successfully" });
    } catch (error) {
      console.error("File deletion error:", error);
      res.status(500).json({ error: "Failed to delete file" });
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
