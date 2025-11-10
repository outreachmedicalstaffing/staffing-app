import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { z } from "zod";
import { eq, and, count, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  insertUserSchema,
  insertTimeEntrySchema,
  insertShiftSchema,
  insertShiftAssignmentSchema,
  insertUserAvailabilitySchema,
  insertTimesheetSchema,
  insertDocumentSchema,
  insertKnowledgeArticleSchema,
  insertAuditLogSchema,
  insertSettingSchema,
  insertScheduleSchema,
  insertShiftTemplateSchema,
} from "@shared/schema";
import "./types"; // Import session and request type augmentations
import { upload } from "./upload";
import path from "path";
import fs from "fs";
import { pool } from "./db";

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

    // Debug logging
    console.log("[requireRole] User role:", user?.role);
    console.log("[requireRole] Allowed roles:", allowedRoles);
    console.log("[requireRole] Role check passed:", user && allowedRoles.includes(user.role));

    if (!user || !allowedRoles.includes(user.role)) {
      console.log("[requireRole] Access denied - returning 403");
      return res.status(403).json({ error: "Forbidden" });
    }

    req.user = user;
    next();
  };
}

// Helper to create audit log
async function logAudit(
  userId: string | undefined,
  action: string,
  resourceType: string,
  resourceId?: string,
  phiAccessed: boolean = false,
  phiFields: string[] = [],
  details: any = {},
  ipAddress?: string,
) {
  try {
    storage.createAuditLog({
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
      await logAudit(
        user.id,
        "register",
        "user",
        user.id,
        false,
        [],
        {},
        req.ip,
      );

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
        return res
          .status(400)
          .json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        await logAudit(
          user.id,
          "failed_login",
          "user",
          user.id,
          false,
          [],
          {},
          req.ip,
        );
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

  // ===== Onboarding Routes =====

  // Get user info by onboarding token (no auth required)
  app.get("/api/onboarding/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const user = await storage.getUserByOnboardingToken(token);

      if (!user) {
        return res.status(404).json({ error: "Invalid or expired onboarding link" });
      }

      // Check if token is expired
      if (user.onboardingTokenExpiry && new Date(user.onboardingTokenExpiry) < new Date()) {
        return res.status(400).json({ error: "Onboarding link has expired" });
      }

      // Check if already completed
      if (user.onboardingCompleted) {
        return res.status(400).json({ error: "Onboarding already completed" });
      }

      // Return basic user info (no sensitive data)
      res.json({
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get onboarding info" });
    }
  });

  // Complete onboarding (no auth required, uses token)
  app.post("/api/onboarding/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const {
        username,
        password,
        email,
        emergencyContact,
        shiftPreference,
        workSetting,
        allergies,
        address,
      } = req.body;

      // Validate required fields
      if (!username || !password || !email) {
        return res.status(400).json({
          error: "Username, password, and email are required"
        });
      }

      const user = await storage.getUserByOnboardingToken(token);
      if (!user) {
        return res.status(404).json({ error: "Invalid onboarding link" });
      }

      // Check if token is expired
      if (user.onboardingTokenExpiry && new Date(user.onboardingTokenExpiry) < new Date()) {
        return res.status(400).json({ error: "Onboarding link has expired" });
      }

      // Check if already completed
      if (user.onboardingCompleted) {
        return res.status(400).json({ error: "Onboarding already completed" });
      }

      // Check if username or email already taken by another user
      const existingByUsername = await storage.getUserByUsername(username);
      if (existingByUsername && existingByUsername.id !== user.id) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingByEmail = await storage.getUserByEmail(email);
      if (existingByEmail && existingByEmail.id !== user.id) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user with onboarding data
      const customFields = {
        ...(user.customFields as any || {}),
        emergencyContact,
        shiftPreference,
        workSetting,
        allergies,
        address,
      };

      const updatedUser = await storage.updateUser(user.id, {
        username,
        passwordHash,
        email,
        customFields,
        onboardingCompleted: true,
        onboardingToken: null,
        onboardingTokenExpiry: null,
        status: "active",
      });

      await logAudit(
        user.id,
        "complete_onboarding",
        "user",
        user.id,
        true,
        ["emergencyContact", "shiftPreference", "workSetting", "allergies", "address"],
        {},
        req.ip,
      );

      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user" });
      }

      // Auto-login the user after onboarding
      req.session.userId = user.id;

      const { passwordHash: _, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error: any) {
      console.error("Failed to complete onboarding:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
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

      // Get user to determine pay rate
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get shiftId from request if provided
      const shiftId = req.body.shiftId || null;
      let jobName = req.body.jobName || null;
      let program: string | null = null;
      let hourlyRate = user.defaultHourlyRate;

      // If shiftId provided, get shift details
      if (shiftId) {
        const shift = await storage.getShift(shiftId);
        if (shift) {
          jobName = shift.jobName || jobName;
          program = (shift as any).program || null;
        }
      } else if (!jobName) {
        // Auto-detect which shift the user is clocking in for
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get user's shifts for today
        const todayShifts = await storage.listShifts(
          undefined,
          today,
          tomorrow,
        );
        const userAssignments = await storage.listShiftAssignments(
          undefined,
          userId,
        );
        const assignedShiftIds = new Set(userAssignments.map((a) => a.shiftId));

        // Find assigned shift for today
        const assignedShift = todayShifts.find(
          (shift) => assignedShiftIds.has(shift.id) && shift.jobName,
        );

        if (assignedShift) {
          jobName = assignedShift.jobName;
          program = (assignedShift as any).program || null;
        }
      }

      // Determine hourly rate based on job
      if (jobName && user.jobRates) {
        const jobRates = user.jobRates as Record<string, string>;
        if (jobRates[jobName]) {
          hourlyRate = jobRates[jobName];
        }
      }

      const entry = await storage.createTimeEntry({
        userId,
        shiftId,
        clockIn: new Date(),
        clockOut: null,
        jobName,
        program,
        hourlyRate,
        location: req.body.location || null,
        notes: req.body.notes || null,
        status: "active",
        breakMinutes: 0,
      });

      await logAudit(
        userId,
        "clock_in",
        "time_entry",
        entry.id,
        false,
        [],
        {},
        req.ip,
      );
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

      // Check if shift requires photos
      let photosRequired = true;
      if (activeEntry.shiftId) {
        const shift = await storage.getShift(activeEntry.shiftId);
        if (shift?.program) {
          // Photos are optional for AdventHealth IPU
          const isAdventHealthIPU =
            (shift.program.toLowerCase().includes('advent') || shift.program.toLowerCase().includes('adventhealth')) &&
            shift.program.toLowerCase().includes('ipu');
          photosRequired = !isAdventHealthIPU;
        }
      }

      // Validate photo requirement
      const photos = req.body.shiftNoteAttachments;
      if (photosRequired && (!photos || photos.length === 0)) {
        return res.status(400).json({
          error: "At least one photo is required to clock out for this shift"
        });
      }

      const entry = await storage.updateTimeEntry(activeEntry.id, {
        clockOut: new Date(),
        status: "completed",
        breakMinutes: req.body.breakMinutes || 0,
        notes: req.body.notes || activeEntry.notes,
        shiftNoteAttachments: photos || null,
        relievingNurseSignature: req.body.relievingNurseSignature || null,
      });

      await logAudit(
        userId,
        "clock_out",
        "time_entry",
        activeEntry.id,
        false,
        [],
        {},
        req.ip,
      );
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

      if (!entry) {
        return res.json(null);
      }

      // Include shift data if entry is linked to a shift
      let shift = null;
      if (entry.shiftId) {
        shift = await storage.getShift(entry.shiftId);
      }

      res.json({ ...entry, shift });
    } catch (error) {
      res.status(500).json({ error: "Failed to get active time entry" });
    }
  });

  // Auto clock-out (for admin/system use)
  app.post(
    "/api/time/auto-clock-out",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        // Auto-clockout entries older than specified hours (default 14)
        const maxHours = req.body.maxHours || 14;
        const cutoffTime = new Date(Date.now() - maxHours * 60 * 60 * 1000);

        // Get all active entries older than cutoff
        const allEntries = await storage.listTimeEntries(
          undefined,
          undefined,
          cutoffTime,
        );
        const activeEntries = allEntries.filter(
          (e) => e.status === "active" && e.clockIn < cutoffTime,
        );

        const updated = [];
        for (const entry of activeEntries) {
          const autoClockOut = new Date(
            entry.clockIn.getTime() + maxHours * 60 * 60 * 1000,
          );
          const updatedEntry = await storage.updateTimeEntry(entry.id, {
            clockOut: autoClockOut,
            status: "auto-clocked-out",
          });
          if (updatedEntry) {
            updated.push(updatedEntry);
            await logAudit(
              req.session.userId,
              "auto_clock_out",
              "time_entry",
              updatedEntry.id,
              false,
              [],
              { userId: updatedEntry.userId },
              req.ip,
            );
          }
        }

        res.json({ count: updated.length, entries: updated });
      } catch (error) {
        res.status(500).json({ error: "Failed to auto clock-out" });
      }
    },
  );

  // List time entries
  app.get("/api/time/entries", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const requestedUserId = req.query.userId as string | undefined;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      // Only Owner and Admin can see all users' time entries
      const canSeeAllUsers = ["Owner", "Admin"].includes(currentUser.role);

      let userId: string | undefined;
      if (canSeeAllUsers) {
        userId = requestedUserId; // Can query any user or all users (undefined)
      } else {
        userId = req.session.userId!; // Can only see own time entries
      }

      const entries = await storage.listTimeEntries(userId, startDate, endDate);
      await logAudit(
        req.session.userId,
        "view",
        "time_entries",
        undefined,
        false,
        [],
        { userId },
        req.ip,
      );
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to list time entries" });
    }
  });

  // Update time entry (for Owner/Admin to edit timesheets)
  app.patch(
    "/api/time/entries/:id",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const entryId = req.params.id;

        // Convert ISO string dates to Date objects
        if (req.body.clockIn && typeof req.body.clockIn === "string") {
          req.body.clockIn = new Date(req.body.clockIn);
        }
        if (req.body.clockOut && typeof req.body.clockOut === "string") {
          req.body.clockOut = new Date(req.body.clockOut);
        }

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
            return res.status(403).json({
              error: "Cannot edit locked time entry. Unlock it first.",
            });
          }
        }

        const entry = await storage.updateTimeEntry(entryId, data);
        if (!entry) {
          return res.status(404).json({ error: "Time entry not found" });
        }

        await logAudit(
          req.session.userId,
          "update",
          "time_entry",
          entry.id,
          false,
          [],
          { changes: data },
          req.ip,
        );
        res.json(entry);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to update time entry" });
      }
    },
  );

  // ===== Schedule Routes =====

  // List schedules
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const schedules = await storage.listSchedules(status);
      await logAudit(
        req.session.userId,
        "view",
        "schedules",
        undefined,
        false,
        [],
        {},
        req.ip,
      );
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to list schedules" });
    }
  });

  // Create schedule
  app.post(
    "/api/schedules",
    requireRole("Owner", "Admin", "Scheduler"),
    async (req, res) => {
      try {
        const data = insertScheduleSchema.parse(req.body);
        const schedule = await storage.createSchedule({
          ...data,
          createdBy: req.session.userId!,
        });

        await logAudit(
          req.session.userId,
          "create",
          "schedule",
          schedule.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(schedule);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to create schedule" });
      }
    },
  );

  // ===== Shift Templates Routes =====

  // List shift templates
  app.get("/api/shift-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.listShiftTemplates();
      await logAudit(
        req.session.userId,
        "view",
        "shift_templates",
        undefined,
        false,
        [],
        {},
        req.ip,
      );
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to list shift templates" });
    }
  });

  // Create shift template
  app.post(
    "/api/shift-templates",
    requireRole("Owner", "Admin", "Scheduler"),
    async (req, res) => {
      try {
        const data = insertShiftTemplateSchema.parse(req.body);
        const template = await storage.createShiftTemplate(data);

        await logAudit(
          req.session.userId,
          "create",
          "shift_template",
          template.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(template);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to create shift template" });
      }
    },
  );

  // Update shift template
  app.patch(
    "/api/shift-templates/:id",
    requireRole("Owner", "Admin", "Scheduler"),
    async (req, res) => {
      try {
        const updateSchema = insertShiftTemplateSchema.partial();
        const data = updateSchema.parse(req.body);

        const template = await storage.updateShiftTemplate(req.params.id, data);
        if (!template) {
          return res.status(404).json({ error: "Shift template not found" });
        }

        await logAudit(
          req.session.userId,
          "update",
          "shift_template",
          template.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(template);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to update shift template" });
      }
    },
  );

  // Delete shift template
  app.delete(
    "/api/shift-templates/:id",
    requireRole("Owner", "Admin", "Scheduler"),
    async (req, res) => {
      try {
        const success = await storage.deleteShiftTemplate(req.params.id);
        if (!success) {
          return res.status(404).json({ error: "Shift template not found" });
        }

        await logAudit(
          req.session.userId,
          "delete",
          "shift_template",
          req.params.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete shift template" });
      }
    },
  );

  // ===== Shift Routes =====

  // List shifts
  app.get("/api/shifts", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const scheduleId = req.query.scheduleId as string | undefined;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      // Only Owner and Admin can see all shifts
      const canSeeAllShifts = ["Owner", "Admin"].includes(currentUser.role);

      if (canSeeAllShifts) {
        // Return all shifts
        const shifts = await storage.listShifts(scheduleId, startDate, endDate);
        await logAudit(
          req.session.userId,
          "view",
          "shifts",
          undefined,
          false,
          [],
          {},
          req.ip,
        );
        res.json(shifts);
      } else {
        // Return only shifts assigned to this user
        const allShifts = await storage.listShifts(
          scheduleId,
          startDate,
          endDate,
        );
        const userAssignments = await storage.listShiftAssignments(
          undefined,
          req.session.userId,
        );
        const assignedShiftIds = new Set(userAssignments.map((a) => a.shiftId));
        const userShifts = allShifts.filter((shift) =>
          assignedShiftIds.has(shift.id),
        );

        await logAudit(
          req.session.userId,
          "view",
          "shifts",
          undefined,
          false,
          [],
          {},
          req.ip,
        );
        res.json(userShifts);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to list shifts" });
    }
  });

  // Create shift
  app.post(
    "/api/shifts",
    requireRole("Owner", "Admin", "Scheduler"),
    async (req, res) => {
      try {
        const data = insertShiftSchema.parse(req.body);
        const shift = await storage.createShift(data);

        await logAudit(
          req.session.userId,
          "create",
          "shift",
          shift.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(shift);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to create shift" });
      }
    },
  );

  // Update shift
  app.patch(
    "/api/shifts/:id",
    requireRole("Owner", "Admin", "Scheduler"),
    async (req, res) => {
      try {
        // Validate update data
        const updateSchema = insertShiftSchema.partial();
        const data = updateSchema.parse(req.body);

        const shift = await storage.updateShift(req.params.id, data);
        if (!shift) {
          return res.status(404).json({ error: "Shift not found" });
        }

        await logAudit(
          req.session.userId,
          "update",
          "shift",
          shift.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(shift);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to update shift" });
      }
    },
  );

  // Delete shift
  app.delete(
    "/api/shifts/:id",
    requireRole("Owner", "Admin", "Scheduler"),
    async (req, res) => {
      try {
        const success = await storage.deleteShift(req.params.id);
        if (!success) {
          return res.status(404).json({ error: "Shift not found" });
        }

        await logAudit(
          req.session.userId,
          "delete",
          "shift",
          req.params.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete shift" });
      }
    },
  );

  // Assign user to shift
  app.post(
    "/api/shifts/:id/assign",
    requireRole("Owner", "Admin", "Scheduler", "Manager"),
    async (req, res) => {
      try {
        const data = insertShiftAssignmentSchema.parse({
          ...req.body,
          shiftId: req.params.id,
        });

        const assignment = await storage.createShiftAssignment(data);
        await logAudit(
          req.session.userId,
          "assign",
          "shift_assignment",
          assignment.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(assignment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to assign shift" });
      }
    },
  );

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
      const canSeeAll = ["Owner", "Admin"].includes(currentUser.role);

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
  // ✅ Duplicate a shift and copy its attachments
  app.post("/api/shifts/:id/duplicate", requireAuth, async (req, res) => {
    const { id: oldId } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1️⃣ Duplicate the shift record
      const { rows } = await client.query(
        `
        INSERT INTO shifts
          (title, job_id, date, start_time, end_time, address, notes, created_by, updated_by)
        SELECT 
          title, job_id, date, start_time, end_time, address, notes, $1, $1
        FROM shifts
        WHERE id = $2
        RETURNING id
        `,
        [req.user?.id ?? null, oldId],
      );
      const newId = rows[0].id;

      // 2️⃣ Copy attachments linked to the old shift
      await client.query(
        `
        INSERT INTO shift_attachments
          (shift_id, file_url, file_name, mime_type, size_bytes, uploaded_by, created_at)
        SELECT 
          $1, file_url, file_name, mime_type, size_bytes, uploaded_by, NOW()
        FROM shift_attachments
        WHERE shift_id = $2
        `,
        [newId, oldId],
      );

      await client.query("COMMIT");
      res.json({ id: newId });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error duplicating shift:", err);
      res.status(500).json({ error: "Failed to duplicate shift" });
    } finally {
      client.release();
    }
  });
  // ✅ Add a single attachment to a shift (used during duplication)
  app.post("/api/shifts/:id/attachments", requireAuth, async (req, res) => {
    const shiftId = req.params.id;
    const { fileUrl, fileName, mimeType, sizeBytes, uploadedBy } = req.body;

    if (!fileUrl || !fileName) {
      return res
        .status(400)
        .json({ error: "fileUrl and fileName are required" });
    }

    try {
      const { rows } = await pool.query(
        `
        INSERT INTO shift_attachments
          (shift_id, file_url, file_name, mime_type, size_bytes, uploaded_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
        `,
        [
          shiftId,
          fileUrl,
          fileName,
          mimeType ?? null,
          sizeBytes ?? null,
          uploadedBy ?? null,
        ],
      );
      res.json({ id: rows[0].id });
    } catch (err) {
      console.error("Error adding attachment:", err);
      res.status(500).json({ error: "Failed to add attachment" });
    }
  });
  // === Add: GET single shift WITH optional attachments ===
  app.get("/api/shifts/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const include = (req.query.include as string) ?? "";

    try {
      // fetch the shift (adjust table/column names if different)
      const shiftResult = await pool.query(
        `SELECT * FROM shifts WHERE id = $1`,
        [id],
      );
      const shift = shiftResult.rows[0];
      if (!shift) return res.status(404).json({ error: "Not found" });

      if (include.split(",").includes("attachments")) {
        const attsResult = await pool.query(
          `SELECT id, file_url, file_name, mime_type, size_bytes, uploaded_by
           FROM shift_attachments
           WHERE shift_id = $1
           ORDER BY id ASC`,
          [id],
        );
        (shift as any).attachments = attsResult.rows;

        // TEMP debug: prints a NUMBER so you can see it worked
        console.log(
          "[GET /api/shifts/:id] attachments count =",
          attsResult.rows.length,
          "for",
          id,
        );
      }

      res.json(shift);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch shift" });
    }
  });

  // === Add: POST one attachment to a shift (used during duplication) ===
  app.post("/api/shifts/:id/attachments", requireAuth, async (req, res) => {
    const shiftId = req.params.id as string;
    const { fileUrl, fileName, mimeType, sizeBytes, uploadedBy } = req.body;

    if (!fileUrl || !fileName) {
      return res
        .status(400)
        .json({ error: "fileUrl and fileName are required" });
    }

    try {
      // TEMP debug: shows a NUMBER only in sizeBytes if present
      console.log(
        "[POST /api/shifts/:id/attachments] shiftId=",
        shiftId,
        "fileName=",
        fileName,
      );

      const insert = await pool.query(
        `
        INSERT INTO shift_attachments
          (shift_id, file_url, file_name, mime_type, size_bytes, uploaded_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
        `,
        [
          shiftId,
          fileUrl,
          fileName,
          mimeType ?? null,
          sizeBytes ?? null,
          uploadedBy ?? null,
        ],
      );
      res.json({ id: insert.rows[0].id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to add attachment" });
    }
  });
  // ===== User Availability Routes =====

  // Create user availability
  app.post("/api/user-availability", requireAuth, async (req, res) => {
    try {
      const data = insertUserAvailabilitySchema.parse(req.body);
      const availability = await storage.createUserAvailability(data);
      await logAudit(
        req.session.userId,
        "create",
        "user_availability",
        availability.id,
        false,
        [],
        {},
        req.ip,
      );
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
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      // Only Owner and Admin can see all users' availability
      const canSeeAll = ["Owner", "Admin"].includes(currentUser.role);

      let userId: string | undefined;
      if (canSeeAll) {
        userId = requestedUserId; // Can query any user
      } else {
        userId = req.session.userId; // Can only see own availability
      }

      const availability = await storage.listUserAvailability(
        userId,
        startDate,
        endDate,
      );
      res.json(availability);
    } catch (error) {
      res.status(500).json({ error: "Failed to list availability" });
    }
  });

  // Update user availability
  app.patch("/api/user-availability/:id", requireAuth, async (req, res) => {
    try {
      const data = insertUserAvailabilitySchema.partial().parse(req.body);
      const availability = await storage.updateUserAvailability(
        req.params.id,
        data,
      );

      if (!availability) {
        return res.status(404).json({ error: "Availability not found" });
      }

      await logAudit(
        req.session.userId,
        "update",
        "user_availability",
        availability.id,
        false,
        [],
        {},
        req.ip,
      );
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

      await logAudit(
        req.session.userId,
        "delete",
        "user_availability",
        req.params.id,
        false,
        [],
        {},
        req.ip,
      );
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
      const canSeeAllUsers = ["Owner", "Admin"].includes(currentUser.role);

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

      await logAudit(
        req.session.userId,
        "create",
        "timesheet",
        timesheet.id,
        false,
        [],
        {},
        req.ip,
      );
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
      const isPrivileged = ["Owner", "Admin", "Payroll", "Manager"].includes(
        user.role,
      );
      const isOwner = existing.userId === req.session.userId;

      if (!isOwner && !isPrivileged) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Parse and validate data
      const updateSchema = insertTimesheetSchema.partial();
      const data = updateSchema.parse(req.body);

      // Filter allowed fields based on role
      const allowedSelfFields = ["notes"]; // Staff can only update notes on their own timesheet
      const privilegedFields = [
        "status",
        "approvedBy",
        "approvedAt",
        "totalHours",
        "regularHours",
        "overtimeHours",
        "periodStart",
        "periodEnd",
      ];

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
      await logAudit(
        req.session.userId,
        "update",
        "timesheet",
        timesheet!.id,
        false,
        [],
        {},
        req.ip,
      );
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
        return res
          .status(403)
          .json({ error: "Forbidden - can only submit your own timesheet" });
      }

      const timesheet = await storage.updateTimesheet(req.params.id, {
        status: "submitted",
      });

      await logAudit(
        req.session.userId,
        "submit",
        "timesheet",
        timesheet!.id,
        false,
        [],
        {},
        req.ip,
      );
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit timesheet" });
    }
  });

  // Approve timesheet
  app.post(
    "/api/timesheets/:id/approve",
    requireRole("Owner", "Admin", "Payroll", "Manager"),
    async (req, res) => {
      try {
        const timesheet = await storage.updateTimesheet(req.params.id, {
          status: "approved",
          approvedBy: req.session.userId!,
          approvedAt: new Date(),
          notes: req.body.notes || null,
        });

        if (!timesheet) {
          return res.status(404).json({ error: "Timesheet not found" });
        }

        await logAudit(
          req.session.userId,
          "approve",
          "timesheet",
          timesheet.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(timesheet);
      } catch (error) {
        res.status(500).json({ error: "Failed to approve timesheet" });
      }
    },
  );

  // Reject timesheet
  app.post(
    "/api/timesheets/:id/reject",
    requireRole("Owner", "Admin", "Payroll", "Manager"),
    async (req, res) => {
      try {
        const timesheet = await storage.updateTimesheet(req.params.id, {
          status: "rejected",
          notes: req.body.notes || "Rejected by manager",
        });

        if (!timesheet) {
          return res.status(404).json({ error: "Timesheet not found" });
        }

        await logAudit(
          req.session.userId,
          "reject",
          "timesheet",
          timesheet.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(timesheet);
      } catch (error) {
        res.status(500).json({ error: "Failed to reject timesheet" });
      }
    },
  );

  // Export timesheet for payroll
  app.post(
    "/api/timesheets/:id/export",
    requireRole("Owner", "Admin", "Payroll"),
    async (req, res) => {
      try {
        const timesheet = await storage.updateTimesheet(req.params.id, {
          status: "exported",
        });

        if (!timesheet) {
          return res.status(404).json({ error: "Timesheet not found" });
        }

        await logAudit(
          req.session.userId,
          "export",
          "timesheet",
          timesheet.id,
          true,
          ["totalHours", "regularHours", "overtimeHours"],
          {},
          req.ip,
        );
        res.json(timesheet);
      } catch (error) {
        res.status(500).json({ error: "Failed to export timesheet" });
      }
    },
  );

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
      const canSeeAllUsers = ["Owner", "Admin"].includes(currentUser.role);

      let userId: string | undefined;
      if (canSeeAllUsers) {
        userId = requestedUserId; // Can query any user or all users (undefined)
      } else {
        userId = req.session.userId!; // Can only see own documents
      }

      const documents = await storage.listDocuments(userId, status);

      await logAudit(
        req.session.userId,
        "view",
        "documents",
        undefined,
        true,
        ["encryptedMetadata"],
        {},
        req.ip,
      );
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

      await logAudit(
        req.session.userId,
        "create",
        "document",
        document.id,
        true,
        ["encryptedMetadata"],
        {},
        req.ip,
      );
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // Update document
  app.patch(
    "/api/documents/:id",
    requireRole("Owner", "Admin", "HR"),
    async (req, res) => {
      try {
        const updateSchema = insertDocumentSchema.partial();
        const data = updateSchema.parse(req.body);

        const document = await storage.updateDocument(req.params.id, data);
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        await logAudit(
          req.session.userId,
          "update",
          "document",
          document.id,
          true,
          ["encryptedMetadata"],
          {},
          req.ip,
        );
        res.json(document);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to update document" });
      }
    },
  );

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
      if (
        existing.userId !== req.session.userId &&
        !["Owner", "Admin", "HR"].includes(user.role)
      ) {
        return res
          .status(403)
          .json({ error: "Forbidden - can only submit your own documents" });
      }

      const document = await storage.updateDocument(req.params.id, {
        status: "submitted",
      });

      await logAudit(
        req.session.userId,
        "submit",
        "document",
        document!.id,
        true,
        ["encryptedMetadata"],
        {},
        req.ip,
      );
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit document" });
    }
  });

  // Approve document
  app.post(
    "/api/documents/:id/approve",
    requireRole("Owner", "Admin", "HR"),
    async (req, res) => {
      try {
        const document = await storage.updateDocument(req.params.id, {
          status: "approved",
          approvedBy: req.session.userId!,
          approvedAt: new Date(),
          notes: req.body.notes || null,
        });

        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        await logAudit(
          req.session.userId,
          "approve",
          "document",
          document.id,
          true,
          ["encryptedMetadata"],
          {},
          req.ip,
        );
        res.json(document);
      } catch (error) {
        res.status(500).json({ error: "Failed to approve document" });
      }
    },
  );

  // Reject document
  app.post(
    "/api/documents/:id/reject",
    requireRole("Owner", "Admin", "HR"),
    async (req, res) => {
      try {
        const document = await storage.updateDocument(req.params.id, {
          status: "rejected",
          notes: req.body.notes || "Document rejected",
        });

        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        await logAudit(
          req.session.userId,
          "reject",
          "document",
          document.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(document);
      } catch (error) {
        res.status(500).json({ error: "Failed to reject document" });
      }
    },
  );

  // Check for expiring documents (for system/admin use)
  app.get(
    "/api/documents/check-expiry",
    requireRole("Owner", "Admin", "HR"),
    async (req, res) => {
      try {
        const daysThreshold = parseInt(req.query.days as string) || 30;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysThreshold);

        // Get all documents and filter for expiring ones
        const allDocs = await storage.listDocuments();
        const expiringDocs = allDocs.filter(
          (doc) =>
            doc.expiryDate &&
            doc.expiryDate <= expiryDate &&
            doc.expiryDate > new Date() &&
            doc.status === "approved",
        );

        // Update status to expiring
        for (const doc of expiringDocs) {
          await storage.updateDocument(doc.id, { status: "expiring" });
        }

        await logAudit(
          req.session.userId,
          "check_expiry",
          "documents",
          undefined,
          false,
          [],
          { count: expiringDocs.length },
          req.ip,
        );
        res.json({ count: expiringDocs.length, documents: expiringDocs });
      } catch (error) {
        res.status(500).json({ error: "Failed to check document expiry" });
      }
    },
  );

  // ===== Knowledge Base Routes =====

  // List knowledge articles
  app.get("/api/knowledge", requireAuth, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const publishStatus = req.query.publishStatus as string | undefined;

      const articles = await storage.listKnowledgeArticles(
        category,
        publishStatus,
      );
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to list knowledge articles" });
    }
  });

  // Create knowledge article
  app.post(
    "/api/knowledge",
    requireRole("Owner", "Admin", "HR"),
    async (req, res) => {
      try {
        const data = insertKnowledgeArticleSchema.parse({
          ...req.body,
          authorId: req.session.userId!,
        });

        const article = await storage.createKnowledgeArticle(data);
        await logAudit(
          req.session.userId,
          "create",
          "knowledge_article",
          article.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(article);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to create knowledge article" });
      }
    },
  );

  // Update knowledge article
  app.patch(
    "/api/knowledge/:id",
    requireRole("Owner", "Admin", "HR"),
    async (req, res) => {
      try {
        // Validate update data
        const updateSchema = insertKnowledgeArticleSchema.partial();
        const data = updateSchema.parse(req.body);

        const article = await storage.updateKnowledgeArticle(
          req.params.id,
          data,
        );
        if (!article) {
          return res.status(404).json({ error: "Knowledge article not found" });
        }

        await logAudit(
          req.session.userId,
          "update",
          "knowledge_article",
          article.id,
          false,
          [],
          {},
          req.ip,
        );
        res.json(article);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to update knowledge article" });
      }
    },
  );

  // ===== Updates/Announcements Routes =====

  // List updates (filtered based on user role and visibility)
  app.get("/api/updates", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const allUpdates = await storage.db
        .select()
        .from(schema.updates)
        .orderBy(desc(schema.updates.publishDate));

      // Helper function to check if user is in a group
      const isUserInGroup = (groupId: string): boolean => {
        // Check if it's an auto-program group
        if (groupId.startsWith('auto-program-')) {
          const programName = groupId.replace('auto-program-', '');
          const userCustomFields = currentUser.customFields as any;
          const userPrograms = userCustomFields?.programs || [];
          return userPrograms.includes(programName);
        }

        // For discipline and general groups stored in localStorage,
        // we can't check membership server-side without storing groups in DB.
        // As a workaround, we'll return false here, which means only program groups
        // and direct user targeting will work for now.
        // To fully support discipline/general groups, we'd need to store group
        // membership in the database or send group metadata with the update.
        return false;
      };

      // Filter updates based on user role and visibility
      const filteredUpdates = allUpdates.filter(update => {
        // Admins/Owners can see all updates
        if (["Admin", "Owner"].includes(currentUser.role)) {
          return true;
        }

        // Only show published updates to non-admins
        if (update.status !== "published") {
          return false;
        }

        // Check visibility
        if (update.visibility === "all") {
          return true;
        }

        if (update.visibility === "specific_users") {
          // Check if user is in targetUserIds
          if (update.targetUserIds && update.targetUserIds.includes(currentUser.id)) {
            return true;
          }

          // Check if user is in any of the target groups
          if (update.targetGroupIds && update.targetGroupIds.length > 0) {
            for (const groupId of update.targetGroupIds) {
              if (isUserInGroup(groupId)) {
                return true;
              }
            }
          }
        }

        return false;
      });

      // Get metrics for each update
      const updatesWithMetrics = await Promise.all(
        filteredUpdates.map(async (update) => {
          const [views, likes, comments] = await Promise.all([
            storage.db
              .select({ count: count() })
              .from(schema.updateViews)
              .where(eq(schema.updateViews.updateId, update.id)),
            storage.db
              .select({ count: count() })
              .from(schema.updateLikes)
              .where(eq(schema.updateLikes.updateId, update.id)),
            storage.db
              .select({ count: count() })
              .from(schema.updateComments)
              .where(eq(schema.updateComments.updateId, update.id)),
          ]);

          // Check if current user has liked
          const userLike = await storage.db
            .select()
            .from(schema.updateLikes)
            .where(
              and(
                eq(schema.updateLikes.updateId, update.id),
                eq(schema.updateLikes.userId, currentUser.id)
              )
            )
            .limit(1);

          return {
            ...update,
            viewCount: views[0].count,
            likeCount: likes[0].count,
            commentCount: comments[0].count,
            isLikedByUser: userLike.length > 0,
          };
        })
      );

      res.json(updatesWithMetrics);
    } catch (error) {
      console.error("Failed to list updates:", error);
      res.status(500).json({ error: "Failed to list updates" });
    }
  });

  // Get single update with details
  app.get("/api/updates/:id", requireAuth, async (req, res) => {
    try {
      const updateId = req.params.id;
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const [update] = await storage.db
        .select()
        .from(schema.updates)
        .where(eq(schema.updates.id, updateId));

      if (!update) {
        return res.status(404).json({ error: "Update not found" });
      }

      // Track view
      const existingView = await storage.db
        .select()
        .from(schema.updateViews)
        .where(
          and(
            eq(schema.updateViews.updateId, updateId),
            eq(schema.updateViews.userId, currentUser.id)
          )
        )
        .limit(1);

      if (existingView.length === 0) {
        await storage.db.insert(schema.updateViews).values({
          updateId,
          userId: currentUser.id,
        });
      }

      res.json(update);
    } catch (error) {
      console.error("Failed to get update:", error);
      res.status(500).json({ error: "Failed to get update" });
    }
  });

  // Create update (Admin/Owner only)
  app.post(
    "/api/updates",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const userId = req.session.userId!;

        const newUpdate = schema.insertUpdateSchema.parse({
          ...req.body,
          createdBy: userId,
        });

        const [created] = await storage.db
          .insert(schema.updates)
          .values(newUpdate)
          .returning();

        await logAudit(
          userId,
          "create",
          "update",
          created.id,
          false,
          ["title", "content", "visibility"],
          {},
          req.ip
        );

        res.json(created);
      } catch (error: any) {
        console.error("Failed to create update:", error);
        if (error.errors) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to create update" });
      }
    }
  );

  // Update update (Admin/Owner only)
  app.patch(
    "/api/updates/:id",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const updateId = req.params.id;
        const userId = req.session.userId!;

        const [updated] = await storage.db
          .update(schema.updates)
          .set({
            ...req.body,
            updatedAt: new Date(),
          })
          .where(eq(schema.updates.id, updateId))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: "Update not found" });
        }

        await logAudit(
          userId,
          "update",
          "update",
          updateId,
          false,
          Object.keys(req.body),
          {},
          req.ip
        );

        res.json(updated);
      } catch (error: any) {
        console.error("Failed to update update:", error);
        if (error.errors) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to update update" });
      }
    }
  );

  // Delete update (Admin/Owner only)
  app.delete(
    "/api/updates/:id",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const updateId = req.params.id;
        const userId = req.session.userId!;

        await storage.db
          .delete(schema.updates)
          .where(eq(schema.updates.id, updateId));

        await logAudit(
          userId,
          "delete",
          "update",
          updateId,
          false,
          [],
          {},
          req.ip
        );

        res.json({ success: true });
      } catch (error) {
        console.error("Failed to delete update:", error);
        res.status(500).json({ error: "Failed to delete update" });
      }
    }
  );

  // Like/unlike update
  app.post("/api/updates/:id/like", requireAuth, async (req, res) => {
    try {
      const updateId = req.params.id;
      const userId = req.session.userId!;

      // Check if already liked
      const existingLike = await storage.db
        .select()
        .from(schema.updateLikes)
        .where(
          and(
            eq(schema.updateLikes.updateId, updateId),
            eq(schema.updateLikes.userId, userId)
          )
        )
        .limit(1);

      if (existingLike.length > 0) {
        // Unlike
        await storage.db
          .delete(schema.updateLikes)
          .where(eq(schema.updateLikes.id, existingLike[0].id));

        res.json({ liked: false });
      } else {
        // Like
        await storage.db.insert(schema.updateLikes).values({
          updateId,
          userId,
        });

        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Failed to like/unlike update:", error);
      res.status(500).json({ error: "Failed to like/unlike update" });
    }
  });

  // Get comments for update
  app.get("/api/updates/:id/comments", requireAuth, async (req, res) => {
    try {
      const updateId = req.params.id;

      const comments = await storage.db
        .select({
          id: schema.updateComments.id,
          content: schema.updateComments.content,
          createdAt: schema.updateComments.createdAt,
          userId: schema.updateComments.userId,
          userName: schema.users.fullName,
        })
        .from(schema.updateComments)
        .leftJoin(schema.users, eq(schema.updateComments.userId, schema.users.id))
        .where(eq(schema.updateComments.updateId, updateId))
        .orderBy(desc(schema.updateComments.createdAt));

      res.json(comments);
    } catch (error) {
      console.error("Failed to get comments:", error);
      res.status(500).json({ error: "Failed to get comments" });
    }
  });

  // Add comment to update
  app.post("/api/updates/:id/comments", requireAuth, async (req, res) => {
    try {
      const updateId = req.params.id;
      const userId = req.session.userId!;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const [comment] = await storage.db
        .insert(schema.updateComments)
        .values({
          updateId,
          userId,
          content: content.trim(),
        })
        .returning();

      const user = await storage.getUser(userId);

      res.json({
        ...comment,
        userName: user?.fullName,
      });
    } catch (error) {
      console.error("Failed to add comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Delete comment (own comments or admin)
  app.delete("/api/updates/:id/comments/:commentId", requireAuth, async (req, res) => {
    try {
      const commentId = req.params.commentId;
      const userId = req.session.userId!;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const [comment] = await storage.db
        .select()
        .from(schema.updateComments)
        .where(eq(schema.updateComments.id, commentId));

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      // Only allow deletion if user owns comment or is admin
      if (comment.userId !== userId && !["Admin", "Owner"].includes(currentUser.role)) {
        return res.status(403).json({ error: "Not authorized to delete this comment" });
      }

      await storage.db
        .delete(schema.updateComments)
        .where(eq(schema.updateComments.id, commentId));

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
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
      const canSeeAllUsers = ["Owner", "Admin"].includes(currentUser.role);

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

      await logAudit(
        req.session.userId,
        "view",
        "users",
        undefined,
        canSeeAllUsers,
        canSeeAllUsers ? ["customFields"] : [],
        {},
        req.ip,
      );
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to list users" });
    }
  });

  // Create new user (Admin/Owner only)
  app.post("/api/users", requireRole("Admin", "Owner"), async (req, res) => {
    try {
      const { fullName, phoneNumber, role } = req.body;

      // Validate required fields
      if (!fullName || !phoneNumber || !role) {
        return res.status(400).json({
          error: "Name, phone number, and role are required"
        });
      }

      // Generate a temporary username and email from the name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0].toLowerCase();
      const lastName = nameParts[nameParts.length - 1]?.toLowerCase() || '';
      const baseUsername = `${firstName}${lastName}${Math.floor(Math.random() * 1000)}`;
      const tempEmail = `${baseUsername}@temp.outreachops.com`;

      // Generate onboarding token (valid for 7 days)
      const onboardingToken = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const onboardingTokenExpiry = new Date();
      onboardingTokenExpiry.setDate(onboardingTokenExpiry.getDate() + 7);

      // Create user with temporary password
      const tempPassword = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 36).toString(36)
      ).join('');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const userData = {
        username: baseUsername,
        password: tempPassword, // Required by InsertUser schema
        email: tempEmail,
        fullName,
        phoneNumber,
        role,
        status: "pending-onboarding" as const,
        onboardingToken,
        onboardingTokenExpiry,
        onboardingCompleted: false,
      };

      const user = await storage.createUser(userData as any);

      await logAudit(
        req.session.userId,
        "create",
        "user",
        user.id,
        false,
        [],
        { role, phoneNumber },
        req.ip,
      );

      // Return sanitized user with onboarding link
      const { passwordHash: _, ...userResponse } = user;
      res.json({
        ...userResponse,
        onboardingLink: `${req.protocol}://${req.get('host')}/onboarding/${onboardingToken}`,
      });
    } catch (error: any) {
      console.error("Failed to create user:", error);
      res.status(500).json({ error: "Failed to create user" });
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
      if (
        req.params.id !== req.session.userId &&
        !["Owner", "Admin", "HR", "Manager"].includes(requestingUser.role)
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { passwordHash, ...userResponse } = user;
      await logAudit(
        req.session.userId,
        "view",
        "user",
        user.id,
        true,
        ["customFields"],
        {},
        req.ip,
      );
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
      const canEditAnyUser = ["Owner", "Admin", "HR"].includes(
        requestingUser.role,
      );
      // Users can edit their own profile, or Owner/Admin/HR can edit any profile
      if (!isOwnProfile && !canEditAnyUser) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { password, ...updateData } = req.body;
      // Only Owner/Admin/HR can change roles and pay rates
      if (updateData.role && !canEditAnyUser) {
        return res.status(403).json({ error: "You cannot change user roles" });
      }
      if (
        (updateData.defaultHourlyRate || updateData.jobRates) &&
        !canEditAnyUser
      ) {
        return res.status(403).json({ error: "You cannot change pay rates" });
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
      await logAudit(
        req.session.userId,
        "update",
        "user",
        user.id,
        true,
        ["customFields"],
        {},
        req.ip,
      );
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // ===== Settings Routes =====

  // Get all settings
  app.get("/api/settings", requireRole("Owner", "Admin"), async (req, res) => {
    try {
      const settings = await storage.listSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to list settings" });
    }
  });

  // Get setting by key
  app.get(
    "/api/settings/:key",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        console.log(`[GET /api/settings/${req.params.key}] Request received`);
        const setting = await storage.getSetting(req.params.key);
        console.log(`[GET /api/settings/${req.params.key}] Setting from DB:`, setting);
        if (!setting) {
          console.log(`[GET /api/settings/${req.params.key}] Setting not found, returning 404`);
          return res.status(404).json({ error: "Setting not found" });
        }
        console.log(`[GET /api/settings/${req.params.key}] Returning setting:`, setting);
        res.json(setting);
      } catch (error) {
        console.error(`[GET /api/settings/${req.params.key}] Error:`, error);
        res.status(500).json({ error: "Failed to get setting" });
      }
    },
  );

  // Set setting
  app.put(
    "/api/settings/:key",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        console.log(`[PUT /api/settings/${req.params.key}] Request received`);
        console.log(`[PUT /api/settings/${req.params.key}] Request body:`, req.body);

        const data = insertSettingSchema.parse({
          key: req.params.key,
          ...req.body,
        });
        console.log(`[PUT /api/settings/${req.params.key}] Parsed data:`, data);

        const setting = await storage.setSetting(data);
        console.log(`[PUT /api/settings/${req.params.key}] Setting saved to DB:`, setting);

        await logAudit(
          req.session.userId,
          "update",
          "setting",
          setting.id,
          false,
          [],
          { key: setting.key },
          req.ip,
        );
        console.log(`[PUT /api/settings/${req.params.key}] Returning setting:`, setting);
        res.json(setting);
      } catch (error) {
        console.error(`[PUT /api/settings/${req.params.key}] Error:`, error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to set setting" });
      }
    },
  );

  // ===== File Upload/Download Routes =====

  // Upload file
  app.post(
    "/api/upload",
    requireAuth,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        await logAudit(
          req.session.userId,
          "upload",
          "file",
          req.file.filename,
          false,
          [],
          {
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
          },
          req.ip,
        );

        res.json({
          success: true,
          file: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
          },
        });
      } catch (error) {
        console.error("File upload error:", error);
        res.status(500).json({ error: "Failed to upload file" });
      }
    },
  );

  // Download/view file
  app.get("/api/files/:filename", requireAuth, async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), "uploads", filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      await logAudit(
        req.session.userId,
        "download",
        "file",
        filename,
        false,
        [],
        {},
        req.ip,
      );

      // Send file with appropriate headers for viewing in browser
      res.sendFile(filePath);
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Delete file
  app.delete(
    "/api/files/:filename",
    requireRole("Owner", "Admin", "Scheduler"),
    async (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = path.join(process.cwd(), "uploads", filename);

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "File not found" });
        }

        fs.unlinkSync(filePath);

        await logAudit(
          req.session.userId,
          "delete",
          "file",
          filename,
          false,
          [],
          {},
          req.ip,
        );

        res.json({ success: true, message: "File deleted successfully" });
      } catch (error) {
        console.error("File deletion error:", error);
        res.status(500).json({ error: "Failed to delete file" });
      }
    },
  );

  // ===== Audit Log Routes =====

  // List audit logs
  app.get(
    "/api/audit-logs",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const userId = req.query.userId as string | undefined;
        const resourceType = req.query.resourceType as string | undefined;
        const limit = req.query.limit
          ? parseInt(req.query.limit as string)
          : 100;

        const logs = await storage.listAuditLogs(userId, resourceType, limit);
        res.json(logs);
      } catch (error) {
        res.status(500).json({ error: "Failed to list audit logs" });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
