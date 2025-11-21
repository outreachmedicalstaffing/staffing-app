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
import { upload, knowledgeUpload, knowledgeImageUpload, updatesUpload } from "./upload";
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

  // Debug endpoint to check user's group memberships
  app.get("/api/auth/me/groups", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const customFields = user.customFields as any;
      const programs = customFields?.programs || [];

      res.json({
        userId: user.id,
        fullName: user.fullName,
        groups: user.groups || [],
        programs: programs,
        groupsArray: user.groups,
        debug: {
          hasGroupsField: !!user.groups,
          isGroupsArray: Array.isArray(user.groups),
          groupsLength: user.groups?.length || 0,
          programsLength: programs.length,
        }
      });
    } catch (error) {
      console.error("[Get User Groups] Error:", error);
      res.status(500).json({ error: "Failed to get user groups" });
    }
  });

  // ===== User Profile Routes =====

  // Update user profile
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { fullName, email, username, phoneNumber, customFields } = req.body;

      // Validate required fields
      if (!fullName || !email || !username) {
        return res.status(400).json({
          error: "Full name, email, and username are required"
        });
      }

      // Check if username or email already taken by another user
      const existingByUsername = await storage.getUserByUsername(username);
      if (existingByUsername && existingByUsername.id !== userId) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingByEmail = await storage.getUserByEmail(email);
      if (existingByEmail && existingByEmail.id !== userId) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Get current user
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Merge customFields with existing data
      const updatedCustomFields = {
        ...(currentUser.customFields as any || {}),
        ...customFields,
      };

      // Update user
      const updatedUser = await storage.updateUser(userId, {
        fullName,
        email,
        username,
        phoneNumber: phoneNumber || null,
        customFields: updatedCustomFields,
      });

      await logAudit(
        userId,
        "update_profile",
        "user",
        userId,
        true,
        ["customFields"],
        {},
        req.ip,
      );

      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update profile" });
      }

      const { passwordHash: _, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Change password
  app.post("/api/user/change-password", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: "Current password and new password are required"
        });
      }

      // Validate new password length
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: "New password must be at least 8 characters long"
        });
      }

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      const updatedUser = await storage.updateUser(userId, {
        passwordHash: newPasswordHash,
      });

      await logAudit(
        userId,
        "change_password",
        "user",
        userId,
        false,
        [],
        {},
        req.ip,
      );

      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to change password" });
      }

      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      console.error("Failed to change password:", error);
      res.status(500).json({ error: "Failed to change password" });
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

      console.log("[Clock-In Request] User attempting to clock in:", {
        userId,
        sessionUserId: req.session.userId,
        hasSession: !!req.session,
        requestBody: req.body,
      });

      // Check if user is already clocked in
      // CRITICAL: This query filters by userId AND clockOut = NULL
      // Only blocks clock-in if THIS user has an active entry
      const activeEntry = await storage.getActiveTimeEntry(userId);

      console.log("[Clock-In Check]", {
        userId,
        hasActiveEntry: !!activeEntry,
        activeEntryId: activeEntry?.id,
        activeEntryUserId: activeEntry?.userId,
        activeEntryClockIn: activeEntry?.clockIn,
        activeEntryClockOut: activeEntry?.clockOut,
        userIdMatch: activeEntry?.userId === userId,
      });

      if (activeEntry) {
        console.error("[Clock-In Blocked] User already has active time entry:", {
          userId,
          activeEntryId: activeEntry.id,
          activeEntryUserId: activeEntry.userId,
          mismatch: activeEntry.userId !== userId,
          clockInTime: activeEntry.clockIn,
        });

        // Provide detailed error message showing when they clocked in
        const clockInTime = new Date(activeEntry.clockIn).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        return res.status(400).json({
          error: "Already clocked in",
          message: `You are already clocked in since ${clockInTime}. Please clock out before clocking in again.`,
          activeEntry: {
            id: activeEntry.id,
            clockIn: activeEntry.clockIn,
            location: activeEntry.location
          }
        });
      }

      console.log("[Clock-In Allowed] No active entry found, proceeding with clock-in:", {
        userId,
      });

      // Get user to determine pay rate
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get shiftId from request if provided
      const shiftId = req.body.shiftId || null;
      let jobName = req.body.jobName || null;
      let program: string | null = null;
      let hourlyRate = user.defaultHourlyRate || null;

      console.log("Initial clock-in data:", {
        userId,
        shiftId,
        jobName,
        defaultHourlyRate: user.defaultHourlyRate,
        userJobRates: user.jobRates
      });

      // If shiftId provided, get shift details
      if (shiftId) {
        const shift = await storage.getShift(shiftId);
        if (shift) {
          jobName = shift.jobName || jobName;
          program = (shift as any).program || null;
          console.log("Found shift details:", { jobName, program });
        } else {
          console.warn("Shift not found for shiftId:", shiftId);
          // Don't fail if shift not found, just continue without shift data
        }
      } else if (!jobName) {
        // Auto-detect which shift the user is clocking in for
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          console.log("Auto-detecting shift for date range:", { today, tomorrow });

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

          console.log("Auto-detect results:", {
            todayShiftsCount: todayShifts.length,
            userAssignmentsCount: userAssignments.length,
            assignedShiftIds: Array.from(assignedShiftIds)
          });

          // Find assigned shift for today
          const assignedShift = todayShifts.find(
            (shift) => assignedShiftIds.has(shift.id) && shift.jobName,
          );

          if (assignedShift) {
            jobName = assignedShift.jobName;
            program = (assignedShift as any).program || null;
            console.log("Auto-detected shift:", { jobName, program });
          } else {
            console.log("No assigned shift found for today");
          }
        } catch (autoDetectError) {
          console.error("Error auto-detecting shift:", autoDetectError);
          // Continue without auto-detected shift data
        }
      }

      // Determine hourly rate based on job
      if (jobName && user.jobRates) {
        const jobRates = user.jobRates as Record<string, string>;
        if (jobRates[jobName]) {
          hourlyRate = jobRates[jobName];
        }
      }

      // Prepare time entry data with all required and optional fields
      const timeEntryData: Record<string, any> = {
        userId,
        clockIn: new Date(),
        status: "active",
        approvalStatus: "approved",
        breakMinutes: 0,
        locked: false,
      };

      // Add optional fields only if they have values
      if (shiftId) timeEntryData.shiftId = shiftId;
      if (jobName) timeEntryData.jobName = jobName;
      if (program) timeEntryData.program = program;
      if (hourlyRate) timeEntryData.hourlyRate = hourlyRate;
      if (req.body.location) timeEntryData.location = req.body.location;
      if (req.body.notes) timeEntryData.notes = req.body.notes;

      console.log("Creating time entry with data:", {
        ...timeEntryData,
        clockIn: timeEntryData.clockIn.toISOString(),
        hourlyRateType: typeof hourlyRate,
        hourlyRateValue: hourlyRate,
      });

      // Create time entry directly without Zod validation
      // The database schema and Drizzle will handle validation
      const entry = await storage.createTimeEntry(timeEntryData as any);

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
      console.error("Clock in error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.session.userId,
        body: req.body
      });
      res.status(500).json({
        error: "Failed to clock in",
        details: error instanceof Error ? error.message : String(error)
      });
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

  // Update time entry (users can edit their own, admins can edit any)
  app.patch(
    "/api/time/entries/:id",
    requireAuth,
    async (req, res) => {
      try {
        const entryId = req.params.id;

        console.log("Time entry update request:", {
          entryId,
          sessionUserId: req.session.userId,
          hasSession: !!req.session,
          bodyKeys: Object.keys(req.body)
        });

        // Get current user
        const currentUser = await storage.getUser(req.session.userId!);
        if (!currentUser) {
          console.log("User not found for session userId:", req.session.userId);
          return res.status(401).json({ error: "User not found" });
        }

        const isAdmin = currentUser.role.toLowerCase() === "owner" ||
                        currentUser.role.toLowerCase() === "admin";

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

        // Check if user owns this entry (or is admin)
        // Convert both IDs to strings for comparison to handle any type mismatches
        const entryUserId = String(existing.userId || '');
        const currentUserId = String(req.session.userId || '');

        console.log("Authorization check:", {
          isAdmin,
          entryUserId,
          currentUserId,
          entryUserIdType: typeof existing.userId,
          currentUserIdType: typeof req.session.userId,
          match: entryUserId === currentUserId,
          willAllow: isAdmin || entryUserId === currentUserId,
          entryLocked: existing.locked
        });

        // Allow admins to edit any entry, or users to edit their own entries
        if (!isAdmin && entryUserId !== currentUserId) {
          console.log("Authorization DENIED: User trying to edit another user's time entry");
          console.log("Entry belongs to userId:", entryUserId, "but request from userId:", currentUserId);
          return res.status(403).json({
            error: "You can only edit your own time entries"
          });
        }

        console.log("Authorization GRANTED: User", currentUserId, "can edit time entry for user", entryUserId);

        // Check if entry is locked - prevent edits to locked entries (except admin unlock)
        if (existing.locked) {
          // Only allow unlocking if that's the ONLY change (and user is admin)
          if (req.body.locked === false && Object.keys(req.body).length === 1 && isAdmin) {
            console.log("Admin unlocking time entry", entryId);
            // Allow unlock-only request for admins - continue to update
          } else {
            console.log("Locked entry edit DENIED - 403 response:", {
              isAdmin,
              locked: existing.locked,
              unlockRequest: req.body.locked === false,
              bodyKeys: Object.keys(req.body),
              entryId,
              userId: currentUserId
            });
            return res.status(403).json({
              error: "This time entry is locked and cannot be edited. Please contact an administrator."
            });
          }
        } else {
          console.log("Entry is not locked, proceeding with update");
        }

        // If user (not admin) is editing clock times, store original times and set to pending approval
        const isEditingTimes = (data.clockIn || data.clockOut) && !isAdmin;
        if (isEditingTimes) {
          // Store original times if not already stored (or if re-editing after rejection)
          if (!existing.originalClockIn || existing.approvalStatus === "rejected") {
            data.originalClockIn = existing.clockIn;
          }
          if ((!existing.originalClockOut && existing.clockOut) || existing.approvalStatus === "rejected") {
            data.originalClockOut = existing.clockOut;
          }
          // Set to pending approval and clear any rejection reason
          data.approvalStatus = "pending";
          data.rejectionReason = null;
          console.log("User editing times - setting to pending approval", {
            entryId,
            originalClockIn: existing.clockIn,
            originalClockOut: existing.clockOut,
            previousStatus: existing.approvalStatus
          });
        }

        const entry = await storage.updateTimeEntry(entryId, data);
        if (!entry) {
          return res.status(404).json({ error: "Time entry not found" });
        }

        // Create notification for owners/admins when a regular user edits their time
        if (!isAdmin) {
          try {
            // Get all owners and admins
            const allUsers = await storage.listUsers();
            const adminUsers = allUsers.filter(u =>
              u.role.toLowerCase() === "owner" || u.role.toLowerCase() === "admin"
            );
            const adminUserIds = adminUsers.map(u => u.id);

            // Format old and new times
            const formatTime = (date: Date | string) => {
              const d = new Date(date);
              return d.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            };

            const oldClockIn = formatTime(existing.clockIn);
            const newClockIn = data.clockIn ? formatTime(data.clockIn) : oldClockIn;
            const oldClockOut = existing.clockOut ? formatTime(existing.clockOut) : "Not clocked out";
            const newClockOut = data.clockOut ? formatTime(data.clockOut) : oldClockOut;

            // Build change description
            let changes = [];
            if (data.clockIn && existing.clockIn.getTime() !== new Date(data.clockIn).getTime()) {
              changes.push(`Clock In: ${oldClockIn} → ${newClockIn}`);
            }
            if (data.clockOut && (!existing.clockOut || existing.clockOut.getTime() !== new Date(data.clockOut).getTime())) {
              changes.push(`Clock Out: ${oldClockOut} → ${newClockOut}`);
            }

            if (changes.length > 0 && adminUserIds.length > 0) {
              // Create notification update
              const entryDate = new Date(entry.clockIn).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              // Include entry ID in metadata for approval actions
              const metadata = {
                type: 'time_entry_edit',
                entryId: entry.id,
                userId: entry.userId,
                userName: currentUser.fullName,
                needsApproval: isEditingTimes
              };

              await storage.db.insert(schema.updates).values({
                title: isEditingTimes
                  ? `${currentUser.fullName} edited their time entry for ${entryDate} - Pending Approval`
                  : `Time Entry Edited: ${currentUser.fullName}`,
                content: `${currentUser.fullName} edited their time entry for ${entryDate}:\n\n${changes.join('\n')}\n\n${isEditingTimes ? '⏳ This edit requires approval from an owner or admin.' : ''}`,
                publishDate: new Date(),
                createdBy: req.session.userId!,
                visibility: "specific_users",
                targetUserIds: adminUserIds,
                status: "published",
                metadata: JSON.stringify(metadata),
              });
            }
          } catch (notifError) {
            // Don't fail the request if notification creation fails
            console.error("Failed to create notification for time entry edit:", notifError);
          }
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

        console.log("Time entry update SUCCESSFUL:", {
          entryId: entry.id,
          userId: entry.userId,
          updatedFields: Object.keys(data)
        });

        res.json(entry);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to update time entry" });
      }
    },
  );

  // Approve time entry edit
  app.post(
    "/api/time/entries/:id/approve",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const entryId = req.params.id;
        const entry = await storage.getTimeEntry(entryId);

        if (!entry) {
          return res.status(404).json({ error: "Time entry not found" });
        }

        // Update approval status to approved
        const updatedEntry = await storage.updateTimeEntry(entryId, {
          approvalStatus: "approved",
        });

        // Find and delete the notification for this approval
        const allUpdates = await storage.db
          .select()
          .from(schema.updates)
          .orderBy(desc(schema.updates.publishDate));

        const relatedUpdate = allUpdates.find((update) => {
          if (!update.metadata) return false;
          try {
            const metadata = JSON.parse(update.metadata);
            return metadata.type === 'time_entry_edit' && metadata.entryId === entryId;
          } catch {
            return false;
          }
        });

        if (relatedUpdate) {
          await storage.db
            .delete(schema.updates)
            .where(eq(schema.updates.id, relatedUpdate.id));
        }

        // Notify the user that their edit was approved
        const user = await storage.getUser(entry.userId);
        if (user) {
          const entryDate = new Date(entry.clockIn).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          await storage.db.insert(schema.updates).values({
            title: `Time Entry Edit Approved`,
            content: `Your time entry edit for ${entryDate} has been approved by an administrator.`,
            publishDate: new Date(),
            createdBy: req.session.userId!,
            visibility: "specific_users",
            targetUserIds: [entry.userId],
            status: "published",
            metadata: JSON.stringify({ type: 'time_entry_approval' }),
          });
        }

        await logAudit(
          req.session.userId,
          "approve",
          "time_entry",
          entryId,
          false,
          [],
          {},
          req.ip,
        );

        res.json(updatedEntry);
      } catch (error) {
        console.error("Approve time entry error:", error);
        res.status(500).json({ error: "Failed to approve time entry" });
      }
    },
  );

  // Reject time entry edit
  app.post(
    "/api/time/entries/:id/reject",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const entryId = req.params.id;
        const { reason } = req.body;
        const entry = await storage.getTimeEntry(entryId);

        if (!entry) {
          return res.status(404).json({ error: "Time entry not found" });
        }

        // Revert to original times and mark as rejected
        const updateData: any = {
          approvalStatus: "rejected",
          rejectionReason: reason || "Edit rejected by administrator",
        };

        // Revert to original times if they exist
        if (entry.originalClockIn) {
          updateData.clockIn = entry.originalClockIn;
        }
        if (entry.originalClockOut) {
          updateData.clockOut = entry.originalClockOut;
        }

        const updatedEntry = await storage.updateTimeEntry(entryId, updateData);

        // Find and delete the notification for this approval
        const allUpdates = await storage.db
          .select()
          .from(schema.updates)
          .orderBy(desc(schema.updates.publishDate));

        const relatedUpdate = allUpdates.find((update) => {
          if (!update.metadata) return false;
          try {
            const metadata = JSON.parse(update.metadata);
            return metadata.type === 'time_entry_edit' && metadata.entryId === entryId;
          } catch {
            return false;
          }
        });

        if (relatedUpdate) {
          await storage.db
            .delete(schema.updates)
            .where(eq(schema.updates.id, relatedUpdate.id));
        }

        // Notify the user that their edit was rejected
        const user = await storage.getUser(entry.userId);
        if (user) {
          const entryDate = new Date(entry.clockIn).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          await storage.db.insert(schema.updates).values({
            title: `Time Entry Edit Rejected`,
            content: `Your time entry edit for ${entryDate} was rejected.\n\nReason: ${reason || 'No reason provided'}\n\nYour time entry has been reverted to the original times.`,
            publishDate: new Date(),
            createdBy: req.session.userId!,
            visibility: "specific_users",
            targetUserIds: [entry.userId],
            status: "published",
            metadata: JSON.stringify({ type: 'time_entry_approval' }),
          });
        }

        await logAudit(
          req.session.userId,
          "reject",
          "time_entry",
          entryId,
          false,
          [],
          { reason },
          req.ip,
        );

        res.json(updatedEntry);
      } catch (error) {
        console.error("Reject time entry error:", error);
        res.status(500).json({ error: "Failed to reject time entry" });
      }
    },
  );

  // Delete time entry
  app.delete(
    "/api/time/entries/:id",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const entryId = req.params.id;
        const entry = await storage.getTimeEntry(entryId);

        if (!entry) {
          return res.status(404).json({ error: "Time entry not found" });
        }

        // Get entry details for audit log before deletion
        const entryDetails = {
          userId: entry.userId,
          clockIn: entry.clockIn,
          clockOut: entry.clockOut,
          location: entry.location,
          hourlyRate: entry.hourlyRate,
        };

        // Delete the time entry from the database
        await storage.db
          .delete(schema.timeEntries)
          .where(eq(schema.timeEntries.id, entryId));

        // Log the deletion in audit logs
        await logAudit(
          req.session.userId,
          "delete",
          "time_entry",
          entryId,
          false,
          [],
          entryDetails,
          req.ip,
        );

        res.json({ success: true, message: "Time entry deleted successfully" });
      } catch (error) {
        console.error("Delete time entry error:", error);
        res.status(500).json({ error: "Failed to delete time entry" });
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

  // Confirm shift assignment
  app.post("/api/shift-assignments/:id/confirm", requireAuth, async (req, res) => {
    try {
      const assignmentId = req.params.id;
      console.log("Confirming shift assignment:", assignmentId);

      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        console.error("User not found:", req.session.userId);
        return res.status(404).json({ error: "User not found" });
      }

      // Get the shift assignment
      const assignment = await storage.getShiftAssignment(assignmentId);
      if (!assignment) {
        console.error("Shift assignment not found:", assignmentId);
        return res.status(404).json({ error: "Shift assignment not found" });
      }

      console.log("Found assignment:", {
        id: assignment.id,
        shiftId: assignment.shiftId,
        userId: assignment.userId,
        currentUserId: req.session.userId,
      });

      // Only the assigned user can confirm their own shift
      if (assignment.userId !== req.session.userId) {
        console.error("Permission denied: User", req.session.userId, "trying to confirm assignment for user", assignment.userId);
        return res.status(403).json({ error: "You can only confirm your own shifts" });
      }

      // Update the assignment with confirmedAt timestamp
      const now = new Date();
      console.log("Updating assignment with confirmedAt:", now.toISOString());

      const updatedAssignment = await storage.updateShiftAssignment(assignmentId, {
        confirmedAt: now,
      } as any);

      if (!updatedAssignment) {
        console.error("Failed to update assignment - no result returned");
        return res.status(500).json({ error: "Failed to update shift assignment" });
      }

      console.log("Successfully updated assignment:", updatedAssignment);

      await logAudit(
        req.session.userId,
        "update",
        "shift_assignment",
        assignmentId,
        false,
        [],
        {},
        req.ip,
      );

      res.json(updatedAssignment);
    } catch (error) {
      console.error("Error confirming shift:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({
        error: "Failed to confirm shift",
        details: error instanceof Error ? error.message : String(error)
      });
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
      console.log("[POST /api/documents] Request received");
      console.log("[POST /api/documents] Session userId:", req.session.userId);
      console.log("[POST /api/documents] Request body:", JSON.stringify(req.body, null, 2));

      // Add userId to request body before validation (required for document creation)
      const requestData = {
        ...req.body,
        userId: req.body.userId || req.session.userId!,
      };

      console.log("[POST /api/documents] Request data with userId:", JSON.stringify(requestData, null, 2));

      const data = insertDocumentSchema.parse(requestData);
      console.log("[POST /api/documents] Validation passed");

      const document = await storage.createDocument(data);
      console.log("[POST /api/documents] Document created successfully:", document.id);

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
      console.error("[POST /api/documents] Error occurred:", error);
      if (error instanceof z.ZodError) {
        console.error("[POST /api/documents] Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: error.errors });
      }
      console.error("[POST /api/documents] Non-validation error:", error);
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

  // List knowledge articles (filtered based on user role and visibility)
  app.get("/api/knowledge", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get all articles
      let allArticles = await storage.db
        .select()
        .from(schema.knowledgeArticles)
        .orderBy(desc(schema.knowledgeArticles.createdAt));

      // DEBUG: Log what we received from database
      console.log("=== KNOWLEDGE ARTICLES DEBUG ===");
      console.log("Current user role:", currentUser.role);
      console.log("Total articles from DB:", allArticles.length);
      console.log("Article publishStatus values:", allArticles.map(a => ({
        title: a.title,
        publishStatus: a.publishStatus,
        publish_status: (a as any).publish_status
      })));

      // STEP 1: Filter by publish status
      // Owner and Admin see ALL articles (including drafts)
      // Regular users only see published articles (drafts are hidden)
      const isOwnerOrAdmin = currentUser.role === "Owner" || currentUser.role === "Admin";
      console.log("Is Owner or Admin?", isOwnerOrAdmin);

      if (!isOwnerOrAdmin) {
        console.log("Filtering drafts for regular user...");
        const beforeCount = allArticles.length;
        allArticles = allArticles.filter(article => {
          const status = article.publishStatus || (article as any).publish_status;
          console.log(`Article "${article.title}": publishStatus="${article.publishStatus}", publish_status="${(article as any).publish_status}", status="${status}"`);
          return status === "published";
        });
        console.log(`Filtered from ${beforeCount} to ${allArticles.length} articles`);
      }

      // STEP 2: Apply visibility filtering (existing logic)
      // This applies to whatever articles made it through the publishStatus filter
      const filteredArticles = allArticles.filter(article => {
        // Handle null/undefined visibility - treat as "all"
        if (!article.visibility || article.visibility === "all") {
          return true;
        }

        // Check specific_programs visibility
        if (article.visibility === "specific_programs") {
          // If no target programs specified, don't show
          if (!article.targetGroupIds || article.targetGroupIds.length === 0) {
            return false;
          }

          // Get user's programs from customFields
          const userCustomFields = currentUser.customFields as any;
          const userPrograms = userCustomFields?.programs || [];

          // Check if user is in any of the target programs
          // targetGroupIds are like "auto-program-Vitas Nature Coast"
          // userPrograms are like "Vitas Nature Coast"
          for (const targetGroupId of article.targetGroupIds) {
            if (targetGroupId.startsWith('auto-program-')) {
              const programName = targetGroupId.replace('auto-program-', '');
              if (userPrograms.includes(programName)) {
                return true;
              }
            }
          }

          return false;
        }

        return false;
      });

      res.json(filteredArticles);
    } catch (error) {
      console.error("Error fetching knowledge articles:", error);
      res.status(500).json({ error: "Failed to list knowledge articles" });
    }
  });

  // Create knowledge article
  app.post(
    "/api/knowledge",
    requireRole("Owner", "Admin", "HR"),
    async (req, res) => {
      try {
        console.log("[Create Knowledge] Request body:", JSON.stringify(req.body, null, 2));

        const data = insertKnowledgeArticleSchema.parse({
          ...req.body,
          authorId: req.session.userId!,
        });

        console.log("[Create Knowledge] Validated data:", JSON.stringify(data, null, 2));

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

        console.log("[Create Knowledge] Article created successfully:", article.id);
        res.json(article);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.log("[Create Knowledge] Validation errors:", JSON.stringify(error.errors, null, 2));
          return res.status(400).json({ error: error.errors });
        }
        console.error("[Create Knowledge] Error:", error);
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
        console.log("[Update Knowledge] Article ID:", req.params.id);
        console.log("[Update Knowledge] Request body:", JSON.stringify(req.body, null, 2));

        // Validate update data
        const updateSchema = insertKnowledgeArticleSchema.partial();
        const data = updateSchema.parse(req.body);

        console.log("[Update Knowledge] Validated data:", JSON.stringify(data, null, 2));

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

        console.log("[Update Knowledge] Article updated successfully:", article.id);
        res.json(article);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.log("[Update Knowledge] Validation errors:", JSON.stringify(error.errors, null, 2));
          return res.status(400).json({ error: error.errors });
        }
        console.error("[Update Knowledge] Error:", error);
        res.status(500).json({ error: "Failed to update knowledge article" });
      }
    },
  );

  // Delete knowledge article
  app.delete(
    "/api/knowledge/:id",
    requireRole("Owner", "Admin", "HR"),
    async (req, res) => {
      try {
        console.log("[Delete Knowledge] Article ID:", req.params.id);

        const article = await storage.getKnowledgeArticle(req.params.id);
        if (!article) {
          console.log("[Delete Knowledge] Article not found:", req.params.id);
          return res.status(404).json({ error: "Knowledge article not found" });
        }

        await storage.deleteKnowledgeArticle(req.params.id);

        await logAudit(
          req.session.userId,
          "delete",
          "knowledge_article",
          req.params.id,
          false,
          [],
          {},
          req.ip,
        );

        console.log("[Delete Knowledge] Article deleted successfully:", req.params.id);
        res.status(204).send();
      } catch (error) {
        console.error("[Delete Knowledge] Error:", error);
        res.status(500).json({ error: "Failed to delete knowledge article" });
      }
    },
  );

  // Upload attachment for knowledge article
  app.post(
    "/api/knowledge/upload",
    requireAuth,
    requireRole("Owner", "Admin", "HR"),
    knowledgeUpload.single('file'),
    async (req, res) => {
      try {
        console.log("[Upload Knowledge Attachment] Request received");

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;
        const fileUrl = `/uploads/knowledge/${file.filename}`;
        const fileSize = (file.size / 1024 / 1024).toFixed(2); // Size in MB

        await logAudit(
          req.session.userId,
          "upload",
          "knowledge_attachment",
          file.filename,
          false,
          [],
          {
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype
          },
          req.ip,
        );

        console.log("[Upload Knowledge Attachment] File uploaded:", {
          originalName: file.originalname,
          savedAs: file.filename,
          size: fileSize + ' MB',
          url: fileUrl
        });

        res.json({
          url: fileUrl,
          filename: file.originalname,
          size: fileSize,
          type: file.mimetype
        });
      } catch (error) {
        console.error("[Upload Knowledge Attachment] Error:", error);
        res.status(500).json({
          error: "Failed to upload attachment",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    },
  );

  // Upload image for knowledge article content (Admin/Owner/HR only)
  app.post(
    "/api/knowledge/upload-image",
    requireAuth,
    requireRole("Owner", "Admin", "HR"),
    knowledgeImageUpload.single('file'),
    async (req, res) => {
      try {
        console.log("[Upload Knowledge Image] Request received");

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;
        const fileUrl = `/uploads/knowledge-images/${file.filename}`;
        const fileSize = (file.size / 1024 / 1024).toFixed(2); // Size in MB

        await logAudit(
          req.session.userId,
          "upload",
          "knowledge_image",
          file.filename,
          false,
          [],
          {
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype
          },
          req.ip,
        );

        console.log("[Upload Knowledge Image] File uploaded:", {
          originalName: file.originalname,
          savedAs: file.filename,
          size: fileSize + ' MB',
          url: fileUrl
        });

        res.json({
          url: fileUrl,
          filename: file.originalname,
          size: fileSize,
          type: file.mimetype
        });
      } catch (error) {
        console.error("[Upload Knowledge Image] Error:", error);
        res.status(500).json({
          error: "Failed to upload image",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    },
  );

  // ===== Updates/Announcements Routes =====

  // List updates (filtered based on user role and visibility)
  app.get("/api/updates", requireAuth, async (req, res) => {
    console.log("\n\n========== GET UPDATES REQUEST ==========");
    console.log("[Get Updates] Timestamp:", new Date().toISOString());
    console.log("[Get Updates] Session User ID:", req.session.userId);

    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        console.log("[Get Updates] ERROR: User not found for session:", req.session.userId);
        return res.status(404).json({ error: "User not found" });
      }

      console.log("[Get Updates] User ID:", currentUser.id);
      console.log("[Get Updates] User Name:", currentUser.fullName);
      console.log("[Get Updates] User Role:", currentUser.role);
      console.log("[Get Updates] User.groups array:", currentUser.groups);
      console.log("[Get Updates] User.customFields.programs:", (currentUser.customFields as any)?.programs);

      const allUpdates = await storage.db
        .select()
        .from(schema.updates)
        .orderBy(desc(schema.updates.createdAt));

      console.log("[Get Updates] Total updates in DB:", allUpdates.length);
      if (allUpdates.length > 0) {
        console.log("[Get Updates] First update:", {
          id: allUpdates[0].id,
          title: allUpdates[0].title,
          status: allUpdates[0].status,
          visibility: allUpdates[0].visibility,
          createdBy: allUpdates[0].createdBy,
        });
      }

      // CRITICAL: Owner and Admin see ALL updates - check this FIRST
      if (["Owner", "Admin"].includes(currentUser.role)) {
        console.log("[Get Updates] ⭐⭐⭐ USER IS OWNER/ADMIN ⭐⭐⭐");
        console.log("[Get Updates] Returning ALL", allUpdates.length, "updates (no filtering applied)");
        console.log("[Get Updates] Update titles:", allUpdates.map(u => u.title));

        // Get metrics for each update
        const updatesWithMetrics = await Promise.all(
          allUpdates.map(async (update) => {
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

            const [userLike, userAck] = await Promise.all([
              storage.db
                .select()
                .from(schema.updateLikes)
                .where(
                  and(
                    eq(schema.updateLikes.updateId, update.id),
                    eq(schema.updateLikes.userId, currentUser.id)
                  )
                )
                .limit(1),
              storage.db
                .select()
                .from(schema.updateAcknowledgments)
                .where(
                  and(
                    eq(schema.updateAcknowledgments.updateId, update.id),
                    eq(schema.updateAcknowledgments.userId, currentUser.id)
                  )
                )
                .limit(1),
            ]);

            return {
              ...update,
              viewCount: Number(views[0]?.count || 0),
              likeCount: Number(likes[0]?.count || 0),
              commentCount: Number(comments[0]?.count || 0),
              isLikedByUser: userLike.length > 0,
              isAcknowledgedByUser: userAck.length > 0,
            };
          })
        );

        console.log("[Get Updates] Returning", updatesWithMetrics.length, "updates to Owner/Admin");
        return res.json(updatesWithMetrics);
      }

      console.log("[Get Updates] Regular user - applying visibility filtering");

      // Helper function to check if user is in a group
      const isUserInGroup = (groupId: string): boolean => {
        console.log("[Get Updates] ===== Checking group:", groupId);

        // Check if it's an auto-program group
        if (groupId.startsWith('auto-program-')) {
          const programName = groupId.replace('auto-program-', '');
          const userCustomFields = currentUser.customFields as any;
          const userPrograms = userCustomFields?.programs || [];
          const inProgram = userPrograms.includes(programName);

          console.log("[Get Updates]   Type: Program Group");
          console.log("[Get Updates]   Program name:", programName);
          console.log("[Get Updates]   User programs:", userPrograms);
          console.log("[Get Updates]   Result:", inProgram ? "✓ IN GROUP" : "✗ NOT IN GROUP");

          return inProgram;
        }

        // For discipline and general groups, check user's groups array
        console.log("[Get Updates]   Type: Discipline/General Group");
        console.log("[Get Updates]   User.groups array:", currentUser.groups);

        if (currentUser.groups && Array.isArray(currentUser.groups)) {
          const inGroup = currentUser.groups.includes(groupId);
          console.log("[Get Updates]   Result:", inGroup ? "✓ IN GROUP" : "✗ NOT IN GROUP");
          return inGroup;
        }

        console.log("[Get Updates]   Result: ✗ User has no groups array");
        return false;
      };

      // Filter updates based on visibility (only for regular users)
      const filteredUpdates = allUpdates.filter(update => {
        console.log("[Get Updates] Evaluating update:", update.id, "Title:", update.title, "Visibility:", update.visibility);

        // Only show published updates to non-admins
        if (update.status !== "published") {
          console.log("[Get Updates] ✗ Filtering out non-published update:", update.id, "Status:", update.status);
          return false;
        }

        // Check visibility
        if (update.visibility === "all") {
          console.log("[Get Updates] ✓ Visibility 'all' - showing update:", update.id);
          return true;
        }

        if (update.visibility === "specific_users") {
          console.log("[Get Updates] Checking specific_users targeting for update:", update.id);
          console.log("[Get Updates]   - targetUserIds:", update.targetUserIds);
          console.log("[Get Updates]   - targetGroupIds:", update.targetGroupIds);

          // Check if user is in targetUserIds
          if (update.targetUserIds && update.targetUserIds.includes(currentUser.id)) {
            console.log("[Get Updates] ✓ User in targetUserIds - showing update:", update.id);
            return true;
          }

          // Check if user is in any of the target groups
          if (update.targetGroupIds && update.targetGroupIds.length > 0) {
            console.log("[Get Updates] Checking group membership for", update.targetGroupIds.length, "groups");
            for (const groupId of update.targetGroupIds) {
              if (isUserInGroup(groupId)) {
                console.log("[Get Updates] ✓ User in group", groupId, "- showing update:", update.id);
                return true;
              }
            }
            console.log("[Get Updates] ✗ User not in any target groups - filtering out update:", update.id);
            return false;
          }

          console.log("[Get Updates] ✗ No targeting match - filtering out update:", update.id);
          return false;
        }

        console.log("[Get Updates] ✗ Unknown visibility type - filtering out update:", update.id, "Visibility:", update.visibility);
        return false;
      });

      console.log("[Get Updates] ========================================");
      console.log("[Get Updates] FILTERING COMPLETE");
      console.log("[Get Updates] Total updates:", allUpdates.length);
      console.log("[Get Updates] Filtered updates:", filteredUpdates.length);
      console.log("[Get Updates] User will see:", filteredUpdates.map(u => ({ id: u.id, title: u.title })));
      console.log("[Get Updates] ========================================");

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

          // Check if current user has liked and acknowledged
          const [userLike, userAck] = await Promise.all([
            storage.db
              .select()
              .from(schema.updateLikes)
              .where(
                and(
                  eq(schema.updateLikes.updateId, update.id),
                  eq(schema.updateLikes.userId, currentUser.id)
                )
              )
              .limit(1),
            storage.db
              .select()
              .from(schema.updateAcknowledgments)
              .where(
                and(
                  eq(schema.updateAcknowledgments.updateId, update.id),
                  eq(schema.updateAcknowledgments.userId, currentUser.id)
                )
              )
              .limit(1),
          ]);

          return {
            ...update,
            viewCount: views[0].count,
            likeCount: likes[0].count,
            commentCount: comments[0].count,
            isLikedByUser: userLike.length > 0,
            isAcknowledgedByUser: userAck.length > 0,
          };
        })
      );

      console.log("\n[Get Updates] ==========================================");
      console.log("[Get Updates] SENDING RESPONSE TO CLIENT");
      console.log("[Get Updates] Returning", updatesWithMetrics.length, "updates with metrics");
      console.log("[Get Updates] Update IDs:", updatesWithMetrics.map(u => u.id));
      console.log("[Get Updates] ==========================================\n");
      res.json(updatesWithMetrics);
    } catch (error: any) {
      console.error("\n========== GET UPDATES ERROR ==========");
      console.error("[Get Updates] ERROR:", error);
      console.error("[Get Updates] Error message:", error.message);
      console.error("[Get Updates] Error stack:", error.stack);
      console.error("========================================\n");
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
        console.error("========== CREATE UPDATE ERROR ==========");
        console.error("Failed to create update:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        console.error("========================================");
        if (error.errors) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to create update" });
      }
    }
  );

  // Upload attachment for update (Admin/Owner only)
  app.post(
    "/api/updates/attachment",
    requireAuth,
    requireRole("Owner", "Admin"),
    upload.single('file'),
    async (req, res) => {
      console.log("========== ATTACHMENT UPLOAD ==========");
      console.log("User ID:", req.session.userId);
      console.log("File received:", req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : "No file");

      try {
        if (!req.file) {
          console.log("ERROR: No file in request");
          return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;
        const fileUrl = `/uploads/${file.filename}`;

        const attachment = {
          id: file.filename,
          name: file.originalname,
          url: fileUrl,
          type: file.mimetype,
          size: file.size,
        };

        console.log("Returning attachment:", attachment);
        console.log("========================================");
        res.json(attachment);
      } catch (error: any) {
        console.error("========== ATTACHMENT UPLOAD ERROR ==========");
        console.error("Error:", error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("============================================");
        res.status(500).json({
          error: "Failed to upload attachment",
          message: error.message
        });
      }
    }
  );

  // Upload image for update (Admin/Owner only)
  app.post(
    "/api/updates/upload",
    requireAuth,
    requireRole("Owner", "Admin"),
    updatesUpload.single('file'),
    async (req, res) => {
      try {
        console.log("[Upload Updates Image] Request received");

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;
        const fileUrl = `/uploads/updates/${file.filename}`;
        const fileSize = (file.size / 1024 / 1024).toFixed(2); // Size in MB

        await logAudit(
          req.session.userId,
          "upload",
          "updates_image",
          file.filename,
          false,
          [],
          {
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype
          },
          req.ip,
        );

        console.log("[Upload Updates Image] File uploaded:", {
          originalName: file.originalname,
          savedAs: file.filename,
          size: fileSize + ' MB',
          url: fileUrl
        });

        res.json({
          url: fileUrl,
          filename: file.originalname,
          size: fileSize,
          type: file.mimetype
        });
      } catch (error) {
        console.error("[Upload Updates Image] Error:", error);
        res.status(500).json({
          error: "Failed to upload image",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // Update update (Admin/Owner only)
  app.patch(
    "/api/updates/:id",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      console.log("========== UPDATE EDIT REQUEST ==========");
      console.log("Update ID:", req.params.id);
      console.log("User ID:", req.session.userId);
      console.log("Request Body:", JSON.stringify(req.body, null, 2));

      try {
        const updateId = req.params.id;
        const userId = req.session.userId!;

        console.log("Step 1: Validating request body...");
        console.log("Raw body before validation:", req.body);

        // Validate the update data using the schema
        const validatedData = schema.updateUpdateSchema.parse(req.body);
        console.log("Step 2: Validation successful!");
        console.log("Validated data:", JSON.stringify(validatedData, null, 2));

        console.log("Step 3: Preparing data for database update...");
        console.log("========== PUBLISHDATE DEBUG ==========");
        console.log("publishDate from validatedData:", validatedData.publishDate);
        console.log("publishDate type:", typeof validatedData.publishDate);
        console.log("publishDate JSON:", JSON.stringify(validatedData.publishDate));
        console.log("publishDate is Date object?:", validatedData.publishDate instanceof Date);

        // Ensure publishDate is a Date object if present
        const updateData: any = { ...validatedData };
        if (updateData.publishDate) {
          console.log("Converting publishDate to Date object...");
          console.log("publishDate before conversion:", updateData.publishDate);
          console.log("Type before conversion:", typeof updateData.publishDate);
          console.log("Constructor before:", updateData.publishDate.constructor.name);

          // Create Date object
          const dateObj = new Date(updateData.publishDate);
          console.log("Date object created:", dateObj);
          console.log("Date is valid?:", !isNaN(dateObj.getTime()));
          console.log("Date.getTime():", dateObj.getTime());

          if (!isNaN(dateObj.getTime())) {
            console.log("Date toISOString():", dateObj.toISOString());
            updateData.publishDate = dateObj;
            console.log("publishDate after conversion:", updateData.publishDate);
            console.log("Type after conversion:", typeof updateData.publishDate);
            console.log("Constructor after:", updateData.publishDate.constructor.name);
          } else {
            console.error("INVALID DATE:", updateData.publishDate);
            throw new Error(`Invalid date format: ${updateData.publishDate}`);
          }
        }
        console.log("======================================");

        updateData.updatedAt = new Date();

        console.log("Step 4: Attempting database update...");
        console.log("Update ID:", updateId);
        console.log("Data to set:", updateData);

        const [updated] = await storage.db
          .update(schema.updates)
          .set(updateData)
          .where(eq(schema.updates.id, updateId))
          .returning();

        console.log("Step 5: Database update completed!");
        console.log("Database result:", JSON.stringify(updated, null, 2));

        if (!updated) {
          console.log("ERROR: Update not found in database");
          return res.status(404).json({ error: "Update not found" });
        }

        console.log("Step 6: Logging audit...");
        await logAudit(
          userId,
          "update",
          "update",
          updateId,
          false,
          Object.keys(updateData),
          {},
          req.ip
        );

        console.log("Step 7: Sending response...");
        console.log("========== UPDATE EDIT SUCCESS ==========");
        res.json(updated);
      } catch (error: any) {
        console.error("========== UPDATE EDIT ERROR ==========");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error constructor:", error.constructor.name);
        console.error("Full error object:", error);
        console.error("Error keys:", Object.keys(error));
        console.error("Stack trace:", error.stack);

        if (error.errors) {
          console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
        }

        if (error.issues) {
          console.error("Zod issues:", JSON.stringify(error.issues, null, 2));
        }

        console.error("========================================");

        if (error.errors || error.issues) {
          return res.status(400).json({
            error: "Validation failed",
            details: error.message,
            validationErrors: error.errors || error.issues
          });
        }

        res.status(500).json({
          error: "Failed to update update",
          message: error.message,
          code: error.code,
          name: error.name
        });
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

  // Acknowledge/confirm update (mark as read)
  app.post("/api/updates/:id/acknowledge", requireAuth, async (req, res) => {
    console.log("========== UPDATE ACKNOWLEDGE REQUEST ==========");
    console.log("[Update Acknowledge] Request received:", {
      updateId: req.params.id,
      userId: req.session.userId,
      url: req.url,
      method: req.method,
    });

    try {
      const updateId = req.params.id;
      const userId = req.session.userId!;

      console.log("[Update Acknowledge] Checking for existing acknowledgment...");

      // Check if already acknowledged
      const existingAck = await storage.db
        .select()
        .from(schema.updateAcknowledgments)
        .where(
          and(
            eq(schema.updateAcknowledgments.updateId, updateId),
            eq(schema.updateAcknowledgments.userId, userId)
          )
        )
        .limit(1);

      console.log("[Update Acknowledge] Existing acknowledgment:", existingAck.length > 0 ? "Found" : "Not found");

      if (existingAck.length === 0) {
        console.log("[Update Acknowledge] Creating new acknowledgment...");
        // Acknowledge for the first time
        await storage.db.insert(schema.updateAcknowledgments).values({
          updateId,
          userId,
        });

        console.log("[Update Acknowledge] Logging audit...");
        await logAudit(
          userId,
          "acknowledge",
          "update",
          updateId,
          false,
          [],
          {},
          req.ip
        );

        console.log("[Update Acknowledge] Success - new acknowledgment");
        res.json({ acknowledged: true });
      } else {
        console.log("[Update Acknowledge] Success - already acknowledged");
        // Already acknowledged
        res.json({ acknowledged: true });
      }
    } catch (error: any) {
      console.error("========== UPDATE ACKNOWLEDGE ERROR ==========");
      console.error("[Update Acknowledge] Error:", error);
      console.error("[Update Acknowledge] Error message:", error.message);
      console.error("[Update Acknowledge] Error stack:", error.stack);
      console.error("[Update Acknowledge] Error name:", error.name);
      console.error("[Update Acknowledge] Error code:", error.code);
      console.error("=============================================");
      res.status(500).json({
        error: "Failed to acknowledge update",
        message: error.message,
        code: error.code,
      });
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

      console.log("[Get Users] Request from:", currentUser.fullName, "Role:", currentUser.role);
      console.log("[Get Users] Query params:", req.query);

      // Only Owner and Admin can see all users
      const canSeeAllUsers = ["Owner", "Admin"].includes(currentUser.role);

      let users;
      if (canSeeAllUsers) {
        const status = req.query.status as string | undefined;
        console.log("[Get Users] Fetching all users, status filter:", status);
        users = await storage.listUsers(status);
        console.log("[Get Users] Found", users.length, "users");
      } else {
        // Regular users can only see themselves
        users = [currentUser];
        console.log("[Get Users] Regular user - returning only self");
      }

      // Remove password hashes from response
      const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);
      console.log("[Get Users] Returning", sanitizedUsers.length, "sanitized users");

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
        passwordHash, // Add the hashed password for database storage
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
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack,
      });
      res.status(500).json({
        error: "Failed to create user",
        details: error.message || "Unknown error"
      });
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

  // Sync group membership to user.groups field
  app.post(
    "/api/groups/sync",
    requireRole("Owner", "Admin"),
    async (req, res) => {
      try {
        const { groups } = req.body;

        if (!Array.isArray(groups)) {
          return res.status(400).json({ error: "Groups must be an array" });
        }

        console.log("[Sync Groups] Syncing", groups.length, "groups to user database");

        // Build a map of userId -> array of groupIds they belong to
        const userGroupsMap: Record<string, string[]> = {};

        // For each group, add its ID to all member users' groups arrays
        for (const group of groups) {
          if (group.category !== 'program' && Array.isArray(group.memberIds)) {
            for (const userId of group.memberIds) {
              if (!userGroupsMap[userId]) {
                userGroupsMap[userId] = [];
              }
              userGroupsMap[userId].push(group.id);
            }
          }
        }

        console.log("[Sync Groups] Updating", Object.keys(userGroupsMap).length, "users");

        // Update each user's groups field
        let updatedCount = 0;
        for (const [userId, groupIds] of Object.entries(userGroupsMap)) {
          try {
            await storage.db
              .update(schema.users)
              .set({ groups: groupIds })
              .where(eq(schema.users.id, userId));
            updatedCount++;
            console.log("[Sync Groups] Updated user", userId, "with groups:", groupIds);
          } catch (error) {
            console.error("[Sync Groups] Failed to update user", userId, error);
          }
        }

        // Also clear groups for users not in any group
        const allUsers = await storage.db.select({ id: schema.users.id }).from(schema.users);
        for (const user of allUsers) {
          if (!userGroupsMap[user.id]) {
            try {
              await storage.db
                .update(schema.users)
                .set({ groups: [] })
                .where(eq(schema.users.id, user.id));
              console.log("[Sync Groups] Cleared groups for user", user.id);
            } catch (error) {
              console.error("[Sync Groups] Failed to clear groups for user", user.id, error);
            }
          }
        }

        res.json({
          success: true,
          message: `Synced ${updatedCount} users with group membership`
        });
      } catch (error: any) {
        console.error("[Sync Groups] Error:", error);
        res.status(500).json({ error: "Failed to sync groups" });
      }
    }
  );

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

  // Upload multiple shift note photos
  app.post(
    "/api/upload/shift-notes",
    requireAuth,
    upload.array("photos", 10), // Allow up to 10 photos
    async (req, res) => {
      try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          return res.status(400).json({ error: "No photos uploaded" });
        }

        // Log each uploaded file
        for (const file of req.files) {
          await logAudit(
            req.session.userId,
            "upload",
            "shift_note_photo",
            file.filename,
            false,
            [],
            {
              originalName: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
            },
            req.ip,
          );
        }

        // Return array of uploaded files
        const uploadedFiles = req.files.map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        }));

        res.json({
          success: true,
          files: uploadedFiles,
        });
      } catch (error) {
        console.error("Shift note photos upload error:", error);
        res.status(500).json({ error: "Failed to upload shift note photos" });
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

  // DIAGNOSTIC ENDPOINT - Check if updates exist in database
  app.get(
    "/api/diagnostic/updates",
    requireAuth,
    requireRole("Owner", "Admin"),
    async (req, res) => {
      console.log("========================================");
      console.log("DIAGNOSTIC: Checking updates in database");
      console.log("========================================");

      try {
        // Get all updates
        const updates = await storage.db
          .select()
          .from(schema.updates)
          .orderBy(desc(schema.updates.createdAt));

        console.log(`Total updates found: ${updates.length}`);

        if (updates.length > 0) {
          console.log("First 5 updates:");
          updates.slice(0, 5).forEach((u, i) => {
            console.log(`${i + 1}. ${u.title} (Status: ${u.status}, Visibility: ${u.visibility})`);
          });
        }

        // Search for specific known titles
        const knownTitles = [
          'Vitas Patient Expiration Update - Midstate',
          'Vitas Patient Expiration Update - Citrus',
          'AdventHealth Hospice Training',
          'Vitas After-Hours Phone Number'
        ];

        const foundTitles = updates.filter(u =>
          knownTitles.some(known => u.title.includes(known.split(' -')[0]))
        );

        res.json({
          success: true,
          totalCount: updates.length,
          updates: updates.map(u => ({
            id: u.id,
            title: u.title,
            status: u.status,
            visibility: u.visibility,
            targetUserIds: u.targetUserIds,
            targetGroupIds: u.targetGroupIds,
            createdAt: u.createdAt,
            publishDate: u.publishDate,
          })),
          knownUpdatesFound: foundTitles.map(u => u.title),
          diagnosis: updates.length === 0
            ? "⚠️ WARNING: No updates found in database! Data may have been lost."
            : `✅ Found ${updates.length} updates in database.`
        });
      } catch (error: any) {
        console.error("DIAGNOSTIC ERROR:", error);
        res.status(500).json({
          success: false,
          error: error.message,
          stack: error.stack,
          diagnosis: "❌ Error querying database"
        });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
