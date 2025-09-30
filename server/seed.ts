import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("Seeding database...");
    
    // Create test users with different roles
    const passwordHash = await bcrypt.hash("password123", 10);
    
    const owner = await storage.createUser({
      username: "owner",
      passwordHash,
      email: "owner@outreachops.com",
      fullName: "System Owner",
      role: "Owner",
      groups: [],
      customFields: {},
      status: "active",
      requireMfa: false,
    } as any);
    
    const admin = await storage.createUser({
      username: "admin",
      passwordHash,
      email: "admin@outreachops.com",
      fullName: "Admin User",
      role: "Admin",
      groups: ["Central Florida"],
      customFields: {},
      status: "active",
      requireMfa: false,
    } as any);
    
    const nurse = await storage.createUser({
      username: "jsmith",
      passwordHash,
      email: "jane.smith@outreachops.com",
      fullName: "Jane Smith",
      role: "Staff",
      groups: ["Central Florida", "RNs"],
      customFields: { license: "RN123456", region: "Central" },
      status: "active",
      requireMfa: false,
    } as any);
    
    console.log("✓ Created users");
    
    // Create a schedule
    const schedule = await storage.createSchedule({
      title: "January 2025 Schedule",
      description: "Monthly schedule for January",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
      status: "active",
      createdBy: admin.id,
    });
    
    console.log("✓ Created schedule");
    
    // Create some shifts
    const shift1 = await storage.createShift({
      scheduleId: schedule.id,
      templateId: null,
      title: "Morning Shift",
      startTime: new Date("2025-01-02T07:00:00"),
      endTime: new Date("2025-01-02T15:00:00"),
      location: "Central Florida Office",
      notes: null,
      status: "assigned",
      color: "#0072B5",
      maxAssignees: 1,
    });
    
    const shift2 = await storage.createShift({
      scheduleId: schedule.id,
      templateId: null,
      title: "Afternoon Shift",
      startTime: new Date("2025-01-02T15:00:00"),
      endTime: new Date("2025-01-02T23:00:00"),
      location: "Central Florida Office",
      notes: null,
      status: "open",
      color: "#D91E47",
      maxAssignees: 2,
    });
    
    console.log("✓ Created shifts");
    
    // Assign shift to nurse
    await storage.createShiftAssignment({
      shiftId: shift1.id,
      userId: nurse.id,
      status: "accepted",
      acceptedAt: new Date(),
      notes: null,
    });
    
    console.log("✓ Created shift assignment");
    
    // Create a timesheet
    await storage.createTimesheet({
      userId: nurse.id,
      periodStart: new Date("2024-12-16"),
      periodEnd: new Date("2024-12-29"),
      totalHours: "80.00",
      regularHours: "80.00",
      overtimeHours: "0.00",
      status: "approved",
      approvedBy: admin.id,
      approvedAt: new Date(),
      notes: null,
    });
    
    console.log("✓ Created timesheet");
    
    // Create some documents
    await storage.createDocument({
      userId: nurse.id,
      title: "RN License",
      description: "Florida Registered Nurse License",
      fileUrl: null,
      fileType: "pdf",
      category: "license",
      encryptedMetadata: {},
      status: "approved",
      uploadedDate: new Date("2024-11-01"),
      expiryDate: new Date("2025-12-31"),
      approvedBy: admin.id,
      approvedAt: new Date("2024-11-02"),
      notes: null,
    });
    
    await storage.createDocument({
      userId: nurse.id,
      title: "CPR Certification",
      description: "American Heart Association BLS",
      fileUrl: null,
      fileType: "pdf",
      category: "certification",
      encryptedMetadata: {},
      status: "expiring",
      uploadedDate: new Date("2024-01-15"),
      expiryDate: new Date("2025-01-15"),
      approvedBy: admin.id,
      approvedAt: new Date("2024-01-16"),
      notes: "Expires soon - needs renewal",
    });
    
    console.log("✓ Created documents");
    
    // Create knowledge articles
    await storage.createKnowledgeArticle({
      title: "Employee Handbook",
      description: "Complete guide for all employees",
      content: "# Employee Handbook\n\nWelcome to OutreachOps...",
      type: "page",
      category: "HR",
      publishStatus: "published",
      authorId: admin.id,
      lastUpdated: new Date(),
    });
    
    await storage.createKnowledgeArticle({
      title: "HIPAA Compliance Training",
      description: "Required annual training materials",
      content: "# HIPAA Compliance\n\nThis training covers...",
      type: "page",
      category: "Compliance",
      publishStatus: "published",
      authorId: admin.id,
      lastUpdated: new Date(),
    });
    
    console.log("✓ Created knowledge articles");
    
    // Create settings
    await storage.setSetting({
      key: "hipaa_mode",
      value: { enabled: true },
      encryptedValue: null,
    });
    
    await storage.setSetting({
      key: "org_name",
      value: { name: "Outreach Medical Staffing" },
      encryptedValue: null,
    });
    
    await storage.setSetting({
      key: "auto_clockout_hours",
      value: { hours: 14 },
      encryptedValue: null,
    });
    
    console.log("✓ Created settings");
    
    console.log("\n✅ Database seeded successfully!");
    console.log("\nTest login credentials:");
    console.log("  Owner:  username: owner,  password: password123");
    console.log("  Admin:  username: admin,  password: password123");
    console.log("  Staff:  username: jsmith, password: password123");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
  process.exit(0);
}

seed();
