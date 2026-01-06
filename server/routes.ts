import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, isAdmin, isOwnerOrAdmin } from "./auth";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";

const pgStore = connectPg(session);

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  role: z.enum(["admin", "member"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  memberId: z.string().optional(),
  joinDate: z.union([z.string(), z.date()]).optional(),
  contributions: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
});

// Also update the validation schema to make phone truly optional
const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().nullable(),
});;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const systemSettingsSchema = z.object({
  currency: z.string().optional(),
  fiscalStartMonth: z.number().min(1).max(12).optional(),
  fiscalYear: z.number().min(1960).max(2100).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // Neon-compatible session store with better error handling
  const sessionStore = new pgStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000, // Reduced to 10 seconds
      idleTimeoutMillis: 30000,
      statement_timeout: 5000, // 5 second statement timeout
    },
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (err: Error) => {
      // Only log errors, don't throw - allows server to continue
      console.error("Session store error (non-fatal):", err.message);
    },
  });

  // Try to initialize session store asynchronously, but don't block
  sessionStore.on("connect", () => {
    console.log("Session store connected successfully");
  });

  sessionStore.on("error", (err: Error) => {
    console.error("Session store error (non-fatal):", err.message);
  });

  app.set("trust proxy", 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
        sameSite: "lax",
      },
    })
  );

  // Passport configuration
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        if (user.status !== "active") {
          return done(null, false, { message: "Account is inactive" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        await storage.updateUserLastLogin(user.id);

        return done(null, {
          id: user.id,
          username: user.username,
          role: user.role,
        });
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, {
          id: user.id,
          username: user.username,
          role: user.role,
        });
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });

  // Auth Routes
  app.post("/api/auth/login", (req, res, next) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Invalid request", errors: validation.error.errors });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      req.logIn(user, async (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        try {
          await storage.createAuditEvent({
            userId: user.id,
            action: "Login",
            entity: "Auth",
            entityId: user.id,
            details: `User ${user.username} logged in`,
          });
        } catch (e) {
          // do not block login if audit logging fails
        }
        return res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout error" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      const member = await storage.getMemberByUserId(req.user!.id);
      res.json({ user, member });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  app.put("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        console.error("Validation error:", validation.error);
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validation.error.errors 
        });
      }
  
      const member = await storage.getMemberByUserId(req.user!.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
  
      const updateData: any = {
        firstName: validation.data.firstName,
        lastName: validation.data.lastName,
        email: validation.data.email,
      };
      
      // Only add phone if it's provided and not empty
      if (validation.data.phone && validation.data.phone.trim() !== "") {
        updateData.phone = validation.data.phone;
      }
  
      const updatedMember = await storage.updateMember(member.id, updateData);
  
      try {
        await storage.createAuditEvent({
          userId: req.user!.id,
          action: "Update",
          entity: "Profile",
          entityId: member.id,
          details: "Updated profile information",
        });
      } catch (auditError) {
        console.error("Audit log error:", auditError);
        // Don't fail the request if audit logging fails
      }
  
      res.json(updatedMember);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ 
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/profile/photo", isAuthenticated, async (req, res) => {
    try {
      const { photoUrl } = req.body;
      
      if (!photoUrl || typeof photoUrl !== "string") {
        return res.status(400).json({ message: "Photo data is required" });
      }

      // Validate that it's a base64 data URL
      if (!photoUrl.startsWith("data:image/")) {
        return res.status(400).json({ message: "Invalid image format" });
      }

      const member = await storage.getMemberByUserId(req.user!.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      const updatedMember = await storage.updateMember(member.id, { photoUrl });

      try {
        await storage.createAuditEvent({
          userId: req.user!.id,
          action: "Update",
          entity: "Profile",
          entityId: member.id,
          details: "Updated profile photo",
        });
      } catch (auditError) {
        console.error("Audit log error:", auditError);
        // Don't fail the request if audit logging fails
      }

      res.json(updatedMember);
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({ 
        message: "Failed to upload photo",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return res.status(400).json({ 
        message: "Invalid request", 
        errors: validation.error.errors 
      });
    }

    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const matches = await bcrypt.compare(
      validation.data.currentPassword, 
      user.password
    );
    
    if (!matches) {
      return res.status(400).json({ 
        message: "Current password is incorrect" 
      });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(validation.data.newPassword, 10);
    await storage.updateUser(user.id, { password: hashedPassword });

    try {
      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Update",
        entity: "Auth",
        entityId: user.id,
        details: "Changed password",
      });
    } catch (auditError) {
      console.error("Audit log error:", auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ 
      message: "Failed to change password",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});



  app.get("/api/auth/login-history", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getAuditEvents({
        userId: req.user!.id,
        action: "Login",
        limit: 50,
      });
      
      // Transform audit events to match the expected LoginEvent interface
      const loginHistory = events.map(event => ({
        id: event.id,
        timestamp: event.timestamp,
        details: event.details || "Login"
      }));
      
      res.json(loginHistory);
    } catch (error) {
      console.error("Login history error:", error);
      res.status(500).json({ message: "Failed to fetch login history" });
    }
  });
  
  // User Management Routes (Admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const members = await storage.getAllMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request", errors: validation.error.errors });
      }

      const data = validation.data;

      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword,
        role: data.role,
        status: "active",
      });

      // Auto-generate member ID if not provided
      let memberId = data.memberId;
      if (!memberId) {
        const allMembers = await storage.getAllMembers();
        const maxId = allMembers.reduce((max, m) => {
          const num = parseInt(m.memberId.replace(/[^0-9]/g, "")) || 0;
          return Math.max(max, num);
        }, 0);
        memberId = `M${String(maxId + 1).padStart(3, "0")}`;
      }

      const joinDate = data.joinDate ? new Date(data.joinDate) : new Date();
      
      const member = await storage.createMember({
        userId: user.id,
        memberId: memberId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        joinDate: joinDate,
        contributions: data.contributions?.toString() || "0",
        shares: data.shares?.toString() || "0",
      });

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Create",
        entity: "User",
        entityId: user.id,
        details: `Created user ${data.username} with role ${data.role}`,
      });

      res.json({ user, member });
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Members
  app.get("/api/members", isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.query;
      let members;

      if (month && year) {
        members = await storage.getFilteredMembers(Number(month), Number(year));
      } else {
        members = await storage.getAllMembers();
      }

      const totalShares = members.reduce((sum, m) => sum + parseFloat(m.shares || "0"), 0);
      const membersWithPercentages = members.map(m => ({
        ...m,
        totalShares,
        sharePercentage: totalShares > 0 ? ((parseFloat(m.shares || "0") / totalShares) * 100).toFixed(2) : "0",
      }));

      res.json(membersWithPercentages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.put("/api/members/:id", isAdmin, async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      const updateData: any = {};
      if (req.body.firstName) updateData.firstName = req.body.firstName;
      if (req.body.lastName) updateData.lastName = req.body.lastName;
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      if (req.body.contributions !== undefined) updateData.contributions = req.body.contributions.toString();
      if (req.body.shares !== undefined) updateData.shares = req.body.shares.toString();

      const updatedMember = await storage.updateMember(req.params.id, updateData);

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Update",
        entity: "Member",
        entityId: req.params.id,
        details: `Updated member: ${updatedMember?.firstName} ${updatedMember?.lastName}`,
      });

      res.json(updatedMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  app.delete("/api/members/:id", isAdmin, async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Delete the associated user
      await storage.updateUser(member.userId, { status: "inactive" });

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Delete",
        entity: "Member",
        entityId: req.params.id,
        details: `Deleted member: ${member.firstName} ${member.lastName}`,
      });

      res.json({ message: "Member deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete member" });
    }
  });

  app.put("/api/users/:id/status", isAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await storage.updateUser(req.params.id, { status });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: status === "active" ? "Activate" : "Deactivate",
        entity: "User",
        entityId: req.params.id,
        details: `${status === "active" ? "Activated" : "Deactivated"} user`,
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // System Settings
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || { currency: "USD", fiscalStartMonth: 1, fiscalYear: 2024 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", isAdmin, async (req, res) => {
    try {
      const validation = systemSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request", errors: validation.error.errors });
      }

      const settings = await storage.updateSystemSettings(validation.data, req.user!.id);

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Update",
        entity: "Settings",
        entityId: settings.id,
        details: "Updated system settings",
      });

      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Payment Methods
  app.get("/api/payment-methods", isAuthenticated, async (req, res) => {
    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/payment-methods", isAdmin, async (req, res) => {
    try {
      const method = await storage.createPaymentMethod({
        name: req.body.name,
        createdBy: req.user!.id,
      });

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Create",
        entity: "PaymentMethod",
        entityId: method.id,
        details: `Created payment method: ${method.name}`,
      });

      res.json(method);
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment method" });
    }
  });

  app.put("/api/payment-methods/:id", isAdmin, async (req, res) => {
    try {
      const method = await storage.updatePaymentMethod(req.params.id, {
        name: req.body.name,
      });

      if (!method) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Update",
        entity: "PaymentMethod",
        entityId: req.params.id,
        details: `Updated payment method: ${method.name}`,
      });

      res.json(method);
    } catch (error) {
      res.status(500).json({ message: "Failed to update payment method" });
    }
  });

  app.delete("/api/payment-methods/:id", isAdmin, async (req, res) => {
    try {
      await storage.deletePaymentMethod(req.params.id);

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Delete",
        entity: "PaymentMethod",
        entityId: req.params.id,
        details: "Deleted payment method",
      });

      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Income Categories
  app.get("/api/income-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getIncomeCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch income categories" });
    }
  });

  app.post("/api/income-categories", isAdmin, async (req, res) => {
    try {
      const category = await storage.createIncomeCategory({
        name: req.body.name,
        createdBy: req.user!.id,
      });

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Create",
        entity: "IncomeCategory",
        entityId: category.id,
        details: `Created income category: ${category.name}`,
      });

      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create income category" });
    }
  });

  app.put("/api/income-categories/:id", isAdmin, async (req, res) => {
    try {
      const category = await storage.updateIncomeCategory(req.params.id, {
        name: req.body.name,
      });

      if (!category) {
        return res.status(404).json({ message: "Income category not found" });
      }

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Update",
        entity: "IncomeCategory",
        entityId: req.params.id,
        details: `Updated income category: ${category.name}`,
      });

      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to update income category" });
    }
  });

  app.delete("/api/income-categories/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteIncomeCategory(req.params.id);

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Delete",
        entity: "IncomeCategory",
        entityId: req.params.id,
        details: "Deleted income category",
      });

      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete income category" });
    }
  });

  // Expense Categories
  app.get("/api/expense-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getExpenseCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense categories" });
    }
  });

  app.post("/api/expense-categories", isAdmin, async (req, res) => {
    try {
      const category = await storage.createExpenseCategory({
        name: req.body.name,
        createdBy: req.user!.id,
      });

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Create",
        entity: "ExpenseCategory",
        entityId: category.id,
        details: `Created expense category: ${category.name}`,
      });

      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create expense category" });
    }
  });

  app.put("/api/expense-categories/:id", isAdmin, async (req, res) => {
    try {
      const category = await storage.updateExpenseCategory(req.params.id, {
        name: req.body.name,
      });

      if (!category) {
        return res.status(404).json({ message: "Expense category not found" });
      }

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Update",
        entity: "ExpenseCategory",
        entityId: req.params.id,
        details: `Updated expense category: ${category.name}`,
      });

      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to update expense category" });
    }
  });

  app.delete("/api/expense-categories/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteExpenseCategory(req.params.id);

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Delete",
        entity: "ExpenseCategory",
        entityId: req.params.id,
        details: "Deleted expense category",
      });

      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense category" });
    }
  });

  // Monthly Profit Goals
  app.get("/api/profit-goals", isAuthenticated, async (req, res) => {
    try {
      const goals = await storage.getMonthlyProfitGoals();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profit goals" });
    }
  });

  app.post("/api/profit-goals", isAdmin, async (req, res) => {
    try {
      const goal = await storage.createMonthlyProfitGoal({
        month: req.body.month,
        year: req.body.year,
        goalAmount: req.body.goalAmount.toString(),
        currency: req.body.currency,
        createdBy: req.user!.id,
      });

      res.json(goal);
    } catch (error) {
      res.status(500).json({ message: "Failed to create profit goal" });
    }
  });

  app.put("/api/profit-goals/:id", isAdmin, async (req, res) => {
    try {
      const goal = await storage.updateMonthlyProfitGoal(req.params.id, {
        month: req.body.month,
        year: req.body.year,
        goalAmount: req.body.goalAmount?.toString(),
        currency: req.body.currency,
      });

      if (!goal) {
        return res.status(404).json({ message: "Profit goal not found" });
      }

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Update",
        entity: "MonthlyProfitGoal",
        entityId: req.params.id,
        details: `Updated profit goal for ${goal.month}/${goal.year}`,
      });

      res.json(goal);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profit goal" });
    }
  });

  app.delete("/api/profit-goals/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteMonthlyProfitGoal(req.params.id);

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Delete",
        entity: "MonthlyProfitGoal",
        entityId: req.params.id,
        details: "Deleted profit goal",
      });

      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete profit goal" });
    }
  });

  // Income Entries
  app.get("/api/income-entries", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, categoryId } = req.query;

      const memberId =
        req.user!.role === "member"
          ? (await storage.getMemberByUserId(req.user!.id))?.id
          : undefined;

      const entries = await storage.getIncomeEntriesFiltered(
        memberId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        categoryId as string
      );

      const total = await storage.getTotalIncome(
        memberId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ entries, total });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch income entries" });
    }
  });

  app.post("/api/income-entries", isAdmin, async (req, res) => {
    try {
      const entryData: any = {
        date: new Date(req.body.date),
        memberId: req.body.memberId,
        totalAmount: req.body.totalAmount.toString(),
        taxPercentage: req.body.taxPercentage.toString(),
        taxAmount: req.body.taxAmount.toString(),
        netAmount: req.body.netAmount.toString(),
        paymentMethodId: req.body.paymentMethodId,
        createdBy: req.user!.id,
      };

      // Only include categoryId if it's explicitly provided, otherwise omit it (will be null in DB)
      if (req.body.categoryId !== undefined) {
        entryData.categoryId = req.body.categoryId || null;
      }

      // Only include description if provided
      if (req.body.description !== undefined) {
        entryData.description = req.body.description || null;
      }

      const entry = await storage.createIncomeEntry(entryData);

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Create",
        entity: "IncomeEntry",
        entityId: entry.id,
        details: `Created income entry: $${entry.netAmount}`,
      });

      res.json(entry);
    } catch (error: any) {
      console.error("Error creating income entry:", error);
      res.status(500).json({ 
        message: "Failed to create income entry",
        error: error.message || "Unknown error"
      });
    }
  });

  app.put("/api/income-entries/:id", isAdmin, async (req, res) => {
    try {
      const existing = await storage.getIncomeEntry(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Income entry not found" });
      }

      const updateData: any = {
        date: req.body.date ? new Date(req.body.date) : existing.date,
        memberId: req.body.memberId ?? existing.memberId,
        categoryId: req.body.categoryId !== undefined ? (req.body.categoryId || null) : existing.categoryId,
        paymentMethodId: req.body.paymentMethodId ?? existing.paymentMethodId,
        totalAmount: (req.body.totalAmount ?? existing.totalAmount).toString(),
        taxPercentage: (req.body.taxPercentage ?? existing.taxPercentage).toString(),
        taxAmount: (req.body.taxAmount ?? existing.taxAmount).toString(),
        netAmount: (req.body.netAmount ?? existing.netAmount).toString(),
        description: req.body.description !== undefined ? (req.body.description || null) : existing.description,
      };

      const updated = await storage.updateIncomeEntry(req.params.id, updateData);

      try {
        await storage.createAuditEvent({
          userId: req.user!.id,
          action: "Update",
          entity: "IncomeEntry",
          entityId: req.params.id,
          details: `Updated income entry: $${updated?.netAmount}`,
        });
      } catch {
        // ignore audit errors
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update income entry" });
    }
  });

  app.delete("/api/income-entries/:id", isAdmin, async (req, res) => {
    try {
      const existing = await storage.getIncomeEntry(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Income entry not found" });
      }

      await storage.deleteIncomeEntry(req.params.id);

      try {
        await storage.createAuditEvent({
          userId: req.user!.id,
          action: "Delete",
          entity: "IncomeEntry",
          entityId: req.params.id,
          details: `Deleted income entry: $${existing.netAmount}`,
        });
      } catch {
        // ignore audit errors
      }

      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete income entry" });
    }
  });

  // Upload Income Entries from Excel
  app.post("/api/income-entries/upload", isAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (jsonData.length < 2) {
        return res.status(400).json({ message: "Excel file must have at least a header row and one data row" });
      }

      // Validate headers
      const headers = jsonData[0] as string[];
      const requiredHeaders = ["Date", "First Name", "Last Name", "Payment Method", "Total Amount"];
      const headerMap: { [key: string]: number } = {};
      
      // Normalize and map headers
      headers.forEach((header, index) => {
        if (header !== null && header !== undefined && header !== '') {
          // Normalize header: trim, lowercase, replace multiple spaces with single space
          const headerStr = String(header).trim();
          const headerLower = headerStr.toLowerCase().replace(/\s+/g, ' ');
          if (headerLower) {
            headerMap[headerLower] = index;
          }
        }
      });

      // Check for required headers (normalized)
      const missingHeaders: string[] = [];
      const normalizedRequiredHeaders = requiredHeaders.map(h => h.toLowerCase().replace(/\s+/g, ' '));
      
      for (let i = 0; i < normalizedRequiredHeaders.length; i++) {
        const reqHeader = normalizedRequiredHeaders[i];
        if (!(reqHeader in headerMap)) {
          // Find the original case version for error message
          missingHeaders.push(requiredHeaders[i]);
        }
      }

      if (missingHeaders.length > 0) {
        const foundHeaders = headers.filter(h => h && h.toString().trim()).map(h => h.toString().trim());
        return res.status(400).json({ 
          message: `Missing required columns: ${missingHeaders.join(", ")}. Found columns in your file: ${foundHeaders.join(", ")}` 
        });
      }

      // Get all members and payment methods for mapping
      const members = await storage.getAllMembers();
      const paymentMethods = await storage.getPaymentMethods();
      
      // Create map using first name + last name (case-insensitive)
      const memberMap = new Map(
        members.map(m => [`${m.firstName.toLowerCase()}_${m.lastName.toLowerCase()}`, m.id])
      );
      const paymentMethodMap = new Map(paymentMethods.map(pm => [pm.name.toLowerCase(), pm.id]));

      const result = {
        success: 0,
        failed: 0,
        duplicates: 0,
        errors: [] as string[],
        entries: [] as any[]
      };

      // Get all existing income entries to check for duplicates
      const existingEntries = await storage.getIncomeEntries();
      const duplicateCheck = new Set(
        existingEntries.map(e => 
          `${e.date.toISOString().split('T')[0]}_${e.memberId}_${e.totalAmount}_${e.paymentMethodId}`
        )
      );

      // Process each row
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;

        try {
          const dateStr = row[headerMap["date"]]?.toString().trim();
          const firstNameStr = row[headerMap["first name"]]?.toString().trim();
          const lastNameStr = row[headerMap["last name"]]?.toString().trim();
          const paymentMethodStr = row[headerMap["payment method"]]?.toString().trim();
          const totalAmountStr = row[headerMap["total amount"]]?.toString().trim();
          const taxPercentageStr = row[headerMap["tax percentage"]]?.toString().trim() || "0";
          const description = row[headerMap["description"]]?.toString().trim() || null;

          // Validate required fields
          if (!dateStr || !firstNameStr || !lastNameStr || !paymentMethodStr || !totalAmountStr) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          // Validate and parse date
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Invalid date format: ${dateStr}`);
            continue;
          }

          // Find member by first name + last name
          const memberKey = `${firstNameStr.toLowerCase()}_${lastNameStr.toLowerCase()}`;
          const memberId = memberMap.get(memberKey);
          if (!memberId) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Member not found: ${firstNameStr} ${lastNameStr}`);
            continue;
          }

          // Find payment method
          const paymentMethodId = paymentMethodMap.get(paymentMethodStr.toLowerCase());
          if (!paymentMethodId) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Payment method not found: ${paymentMethodStr}`);
            continue;
          }

          // Parse amounts
          const totalAmount = parseFloat(totalAmountStr);
          if (isNaN(totalAmount) || totalAmount <= 0) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Invalid total amount: ${totalAmountStr}`);
            continue;
          }

          const taxPercentage = parseFloat(taxPercentageStr) || 0;
          const taxAmount = (totalAmount * taxPercentage) / 100;
          const netAmount = totalAmount - taxAmount;

          // Check for duplicates
          const duplicateKey = `${date.toISOString().split('T')[0]}_${memberId}_${totalAmount}_${paymentMethodId}`;
          if (duplicateCheck.has(duplicateKey)) {
            result.duplicates++;
            continue;
          }

          // Create entry
          const entry = await storage.createIncomeEntry({
            date,
            memberId,
            paymentMethodId,
            totalAmount: totalAmount.toString(),
            taxPercentage: taxPercentage.toString(),
            taxAmount: taxAmount.toString(),
            netAmount: netAmount.toString(),
            description,
            createdBy: req.user!.id,
          });

          duplicateCheck.add(duplicateKey);
          result.success++;
          result.entries.push(entry);

          // Create audit event
          try {
            await storage.createAuditEvent({
              userId: req.user!.id,
              action: "Create",
              entity: "IncomeEntry",
              entityId: entry.id,
              details: `Created income entry from Excel upload: $${entry.netAmount}`,
            });
          } catch {
            // ignore audit errors
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Row ${i + 1}: ${error.message || "Unknown error"}`);
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error uploading income entries:", error);
      res.status(500).json({ 
        message: "Failed to upload income entries",
        error: error.message || "Unknown error"
      });
    }
  });

  // Expense Entries
  app.get("/api/expense-entries", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, categoryId } = req.query;

      const memberId =
        req.user!.role === "member"
          ? (await storage.getMemberByUserId(req.user!.id))?.id
          : undefined;

      const entries = await storage.getExpenseEntriesFiltered(
        memberId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        categoryId as string
      );

      const total = await storage.getTotalExpenses(
        memberId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ entries, total });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense entries" });
    }
  });

  app.post("/api/expense-entries", isAdmin, async (req, res) => {
    try {
      const member = await storage.getMemberByUserId(req.user!.id);
      if (!member) {
        return res.status(400).json({ message: "Member profile not found for current user" });
      }

      const entry = await storage.createExpenseEntry({
        ...req.body,
        date: new Date(req.body.date),
        memberId: member.id,
        totalAmount: req.body.totalAmount.toString(),
        taxPercentage: req.body.taxPercentage.toString(),
        taxAmount: req.body.taxAmount.toString(),
        netAmount: req.body.netAmount.toString(),
        createdBy: req.user!.id,
      });

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Create",
        entity: "ExpenseEntry",
        entityId: entry.id,
        details: `Created expense entry: $${entry.netAmount}`,
      });

      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to create expense entry" });
    }
  });

  app.put("/api/expense-entries/:id", isAdmin, async (req, res) => {
    try {
      const existing = await storage.getExpenseEntry(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Expense entry not found" });
      }

      const updateData: any = {
        date: req.body.date ? new Date(req.body.date) : existing.date,
        memberId: req.body.memberId ?? existing.memberId,
        categoryId: req.body.categoryId ?? existing.categoryId,
        paymentMethodId: req.body.paymentMethodId ?? existing.paymentMethodId,
        totalAmount: (req.body.totalAmount ?? existing.totalAmount).toString(),
        taxPercentage: (req.body.taxPercentage ?? existing.taxPercentage).toString(),
        taxAmount: (req.body.taxAmount ?? existing.taxAmount).toString(),
        netAmount: (req.body.netAmount ?? existing.netAmount).toString(),
        description: req.body.description ?? existing.description,
      };

      const updated = await storage.updateExpenseEntry(req.params.id, updateData);

      try {
        await storage.createAuditEvent({
          userId: req.user!.id,
          action: "Update",
          entity: "ExpenseEntry",
          entityId: req.params.id,
          details: `Updated expense entry: $${updated?.netAmount}`,
        });
      } catch {
        // ignore audit errors
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update expense entry" });
    }
  });

  app.delete("/api/expense-entries/:id", isAdmin, async (req, res) => {
    try {
      const existing = await storage.getExpenseEntry(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Expense entry not found" });
      }

      await storage.deleteExpenseEntry(req.params.id);

      try {
        await storage.createAuditEvent({
          userId: req.user!.id,
          action: "Delete",
          entity: "ExpenseEntry",
          entityId: req.params.id,
          details: `Deleted expense entry: $${existing.netAmount}`,
        });
      } catch {
        // ignore audit errors
      }

      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense entry" });
    }
  });

  // Upload Expense Entries from Excel
  app.post("/api/expense-entries/upload", isAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (jsonData.length < 2) {
        return res.status(400).json({ message: "Excel file must have at least a header row and one data row" });
      }

      // Validate headers
      const headers = jsonData[0] as string[];
      const requiredHeaders = ["Date", "First Name", "Last Name", "Category", "Payment Method", "Total Amount"];
      const headerMap: { [key: string]: number } = {};
      
      // Normalize and map headers
      headers.forEach((header, index) => {
        if (header !== null && header !== undefined && header !== '') {
          // Normalize header: trim, lowercase, replace multiple spaces with single space
          const headerStr = String(header).trim();
          const headerLower = headerStr.toLowerCase().replace(/\s+/g, ' ');
          if (headerLower) {
            headerMap[headerLower] = index;
          }
        }
      });

      // Check for required headers (normalized)
      const missingHeaders: string[] = [];
      const normalizedRequiredHeaders = requiredHeaders.map(h => h.toLowerCase().replace(/\s+/g, ' '));
      
      for (let i = 0; i < normalizedRequiredHeaders.length; i++) {
        const reqHeader = normalizedRequiredHeaders[i];
        // Use 'in' operator to check if key exists (important: index 0 is falsy but valid!)
        if (!(reqHeader in headerMap)) {
          // Find the original case version for error message
          missingHeaders.push(requiredHeaders[i]);
        }
      }

      if (missingHeaders.length > 0) {
        const foundHeaders = headers.filter(h => h && h.toString().trim()).map(h => h.toString().trim());
        return res.status(400).json({ 
          message: `Missing required columns: ${missingHeaders.join(", ")}. Found columns in your file: ${foundHeaders.join(", ")}` 
        });
      }

      // Get all members, payment methods, and expense categories for mapping
      const members = await storage.getAllMembers();
      const paymentMethods = await storage.getPaymentMethods();
      const expenseCategories = await storage.getExpenseCategories();
      
      // Create map using first name + last name (case-insensitive)
      const memberMap = new Map(
        members.map(m => [`${m.firstName.toLowerCase()}_${m.lastName.toLowerCase()}`, m.id])
      );
      const paymentMethodMap = new Map(paymentMethods.map(pm => [pm.name.toLowerCase(), pm.id]));
      const categoryMap = new Map(expenseCategories.map(ec => [ec.name.toLowerCase(), ec.id]));

      const result = {
        success: 0,
        failed: 0,
        duplicates: 0,
        errors: [] as string[],
        entries: [] as any[]
      };

      // Get all existing expense entries to check for duplicates
      const existingEntries = await storage.getExpenseEntries();
      const duplicateCheck = new Set(
        existingEntries.map(e => 
          `${e.date.toISOString().split('T')[0]}_${e.memberId}_${e.totalAmount}_${e.categoryId}_${e.paymentMethodId}`
        )
      );

      // Process each row
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;

        try {
          const dateStr = row[headerMap["date"]]?.toString()?.trim();
          const firstNameStr = row[headerMap["first name"]]?.toString()?.trim();
          const lastNameStr = row[headerMap["last name"]]?.toString()?.trim();
          const categoryStr = row[headerMap["category"]]?.toString()?.trim();
          const paymentMethodStr = row[headerMap["payment method"]]?.toString()?.trim();
          const totalAmountStr = row[headerMap["total amount"]]?.toString()?.trim();
          const taxPercentageStr = row[headerMap["tax percentage"]]?.toString()?.trim() || "0";
          const description = row[headerMap["description"]]?.toString()?.trim() || null;

          // Validate required fields
          if (!dateStr || !firstNameStr || !lastNameStr || !categoryStr || !paymentMethodStr || !totalAmountStr) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          // Validate and parse date
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Invalid date format: ${dateStr}`);
            continue;
          }

          // Find member by first name + last name
          const memberKey = `${firstNameStr.toLowerCase()}_${lastNameStr.toLowerCase()}`;
          const memberId = memberMap.get(memberKey);
          if (!memberId) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Member not found: ${firstNameStr} ${lastNameStr}`);
            continue;
          }

          // Find category
          const categoryId = categoryMap.get(categoryStr.toLowerCase());
          if (!categoryId) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Category not found: ${categoryStr}`);
            continue;
          }

          // Find payment method
          const paymentMethodId = paymentMethodMap.get(paymentMethodStr.toLowerCase());
          if (!paymentMethodId) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Payment method not found: ${paymentMethodStr}`);
            continue;
          }

          // Parse amounts
          const totalAmount = parseFloat(totalAmountStr);
          if (isNaN(totalAmount) || totalAmount <= 0) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Invalid total amount: ${totalAmountStr}`);
            continue;
          }

          const taxPercentage = parseFloat(taxPercentageStr) || 0;
          const taxAmount = (totalAmount * taxPercentage) / 100;
          const netAmount = totalAmount - taxAmount;

          // Check for duplicates
          const duplicateKey = `${date.toISOString().split('T')[0]}_${memberId}_${totalAmount}_${categoryId}_${paymentMethodId}`;
          if (duplicateCheck.has(duplicateKey)) {
            result.duplicates++;
            continue;
          }

          // Create entry
          const entry = await storage.createExpenseEntry({
            date,
            memberId,
            categoryId,
            paymentMethodId,
            totalAmount: totalAmount.toString(),
            taxPercentage: taxPercentage.toString(),
            taxAmount: taxAmount.toString(),
            netAmount: netAmount.toString(),
            description,
            createdBy: req.user!.id,
          });

          duplicateCheck.add(duplicateKey);
          result.success++;
          result.entries.push(entry);

          // Create audit event
          try {
            await storage.createAuditEvent({
              userId: req.user!.id,
              action: "Create",
              entity: "ExpenseEntry",
              entityId: entry.id,
              details: `Created expense entry from Excel upload: $${entry.netAmount}`,
            });
          } catch {
            // ignore audit errors
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Row ${i + 1}: ${error.message || "Unknown error"}`);
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error uploading expense entries:", error);
      res.status(500).json({ 
        message: "Failed to upload expense entries",
        error: error.message || "Unknown error"
      });
    }
  });

  // Monthly Report
  app.get("/api/monthly-report", isAuthenticated, async (req, res) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      // Validate month and year
      if (isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid month. Must be between 1 and 12." });
      }
      if (isNaN(year) || year < 1900 || year > 2100) {
        return res.status(400).json({ message: "Invalid year." });
      }

      // Calculate start and end dates for the month
      // month is 1-indexed (1 = January, 12 = December)
      // JavaScript Date months are 0-indexed (0 = January, 11 = December)
      const startDate = new Date(year, month - 1, 1);
      // Get last day of the month: new Date(year, month, 0) gives last day of (month-1)
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const memberId =
        req.user!.role === "member"
          ? (await storage.getMemberByUserId(req.user!.id))?.id
          : undefined;

      // Get income entries for the month
      const incomeEntries = await storage.getIncomeEntriesFiltered(
        memberId,
        startDate,
        endDate
      );

      // Get expense entries for the month
      const expenseEntries = await storage.getExpenseEntriesFiltered(
        memberId,
        startDate,
        endDate
      );

      // Get income categories
      const incomeCategories = await storage.getIncomeCategories();
      const incomeCategoryMap = new Map(incomeCategories.map(c => [c.id, c.name]));

      // Get expense categories
      const expenseCategories = await storage.getExpenseCategories();
      const expenseCategoryMap = new Map(expenseCategories.map(c => [c.id, c.name]));

      // Calculate totals
      const totalIncome = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.totalAmount?.toString() || "0"), 0);
      const totalIncomeTax = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.taxAmount?.toString() || "0"), 0);
      const incomeAfterTax = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.netAmount?.toString() || "0"), 0);
      const totalExpenses = expenseEntries.reduce((sum, entry) => sum + parseFloat(entry.netAmount?.toString() || "0"), 0);
      const monthsProfit = incomeAfterTax - totalExpenses;

      // Get profit goal for the month
      const profitGoal = await storage.getMonthlyProfitGoal(month, year);
      const monthsProfitGoal = profitGoal ? parseFloat(profitGoal.goalAmount?.toString() || "0") : 0;

      // Calculate income breakdown by category
      const incomeBreakdown = new Map<string, number>();
      incomeEntries.forEach(entry => {
        const categoryId = entry.categoryId || "uncategorized";
        const categoryName = incomeCategoryMap.get(categoryId) || "Uncategorized";
        const amount = parseFloat(entry.netAmount?.toString() || "0");
        incomeBreakdown.set(categoryName, (incomeBreakdown.get(categoryName) || 0) + amount);
      });

      // Calculate expense breakdown by category
      const expenseBreakdown = new Map<string, number>();
      expenseEntries.forEach(entry => {
        const categoryName = expenseCategoryMap.get(entry.categoryId) || "Uncategorized";
        const amount = parseFloat(entry.netAmount?.toString() || "0");
        expenseBreakdown.set(categoryName, (expenseBreakdown.get(categoryName) || 0) + amount);
      });

      // Format breakdowns for response
      const incomeBreakdownArray = Array.from(incomeBreakdown.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));

      const expenseBreakdownArray = Array.from(expenseBreakdown.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));

      res.json({
        month,
        year,
        totalIncome,
        totalExpenses,
        incomeAfterTax,
        monthsProfit,
        monthsProfitGoal,
        incomeBreakdown: incomeBreakdownArray,
        expenseBreakdown: expenseBreakdownArray,
      });
    } catch (error: any) {
      console.error("Error fetching monthly report:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to fetch monthly report", 
        error: error.message || "Unknown error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  });

  // Annual Report
  app.get("/api/annual-report", isAuthenticated, async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      // Validate year
      if (isNaN(year) || year < 1900 || year > 2100) {
        return res.status(400).json({ message: "Invalid year." });
      }

      // Calculate start and end dates for the year
      const startDate = new Date(year, 0, 1); // January 1st
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st

      const memberId =
        req.user!.role === "member"
          ? (await storage.getMemberByUserId(req.user!.id))?.id
          : undefined;

      // Get income entries for the year
      const incomeEntries = await storage.getIncomeEntriesFiltered(
        memberId,
        startDate,
        endDate
      );

      // Get expense entries for the year
      const expenseEntries = await storage.getExpenseEntriesFiltered(
        memberId,
        startDate,
        endDate
      );

      // Get income categories
      const incomeCategories = await storage.getIncomeCategories();
      const incomeCategoryMap = new Map(incomeCategories.map(c => [c.id, c.name]));

      // Get expense categories
      const expenseCategories = await storage.getExpenseCategories();
      const expenseCategoryMap = new Map(expenseCategories.map(c => [c.id, c.name]));

      // Calculate totals
      const totalIncome = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.totalAmount?.toString() || "0"), 0);
      const totalIncomeTax = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.taxAmount?.toString() || "0"), 0);
      const incomeAfterTax = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.netAmount?.toString() || "0"), 0);
      const totalExpenses = expenseEntries.reduce((sum, entry) => sum + parseFloat(entry.netAmount?.toString() || "0"), 0);
      const yearsProfit = incomeAfterTax - totalExpenses;

      // Get all monthly profit goals for the year and sum them
      const monthlyProfitGoals = await storage.getMonthlyProfitGoals();
      const yearsProfitGoal = monthlyProfitGoals
        .filter(goal => goal.year === year)
        .reduce((sum, goal) => sum + parseFloat(goal.goalAmount?.toString() || "0"), 0);

      // Calculate income breakdown by category
      const incomeBreakdown = new Map<string, number>();
      incomeEntries.forEach(entry => {
        const categoryId = entry.categoryId || "uncategorized";
        const categoryName = incomeCategoryMap.get(categoryId) || "Uncategorized";
        const amount = parseFloat(entry.netAmount?.toString() || "0");
        incomeBreakdown.set(categoryName, (incomeBreakdown.get(categoryName) || 0) + amount);
      });

      // Calculate expense breakdown by category
      const expenseBreakdown = new Map<string, number>();
      expenseEntries.forEach(entry => {
        const categoryName = expenseCategoryMap.get(entry.categoryId) || "Uncategorized";
        const amount = parseFloat(entry.netAmount?.toString() || "0");
        expenseBreakdown.set(categoryName, (expenseBreakdown.get(categoryName) || 0) + amount);
      });

      // Calculate monthly breakdown for the year
      const monthlyBreakdown = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let month = 1; month <= 12; month++) {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
        
        const monthIncomeEntries = incomeEntries.filter(entry => {
          if (!entry.date) return false;
          try {
            const entryDate: Date = entry.date instanceof Date ? entry.date : new Date(entry.date);
            if (isNaN(entryDate.getTime())) return false;
            const entryYear = entryDate.getFullYear();
            const entryMonth = entryDate.getMonth() + 1; // getMonth() returns 0-11
            return entryYear === year && entryMonth === month;
          } catch {
            return false;
          }
        });
        
        const monthExpenseEntries = expenseEntries.filter(entry => {
          if (!entry.date) return false;
          try {
            const entryDate: Date = entry.date instanceof Date ? entry.date : new Date(entry.date);
            if (isNaN(entryDate.getTime())) return false;
            const entryYear = entryDate.getFullYear();
            const entryMonth = entryDate.getMonth() + 1; // getMonth() returns 0-11
            return entryYear === year && entryMonth === month;
          } catch {
            return false;
          }
        });

        const monthIncome = monthIncomeEntries.reduce((sum, entry) => sum + parseFloat(entry.netAmount?.toString() || "0"), 0);
        const monthExpenses = monthExpenseEntries.reduce((sum, entry) => sum + parseFloat(entry.netAmount?.toString() || "0"), 0);

        monthlyBreakdown.push({
          month: monthNames[month - 1],
          monthNumber: month,
          income: monthIncome,
          expenses: monthExpenses,
          profit: monthIncome - monthExpenses,
        });
      }

      // Format breakdowns for response
      const incomeBreakdownArray = Array.from(incomeBreakdown.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));

      const expenseBreakdownArray = Array.from(expenseBreakdown.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));

      res.json({
        year,
        totalIncome,
        totalExpenses,
        incomeAfterTax,
        yearsProfit,
        yearsProfitGoal,
        incomeBreakdown: incomeBreakdownArray,
        expenseBreakdown: expenseBreakdownArray,
        monthlyBreakdown,
      });
    } catch (error: any) {
      console.error("Error fetching annual report:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to fetch annual report", 
        error: error.message || "Unknown error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  });

  // Custom Report
  app.get("/api/custom-report", isAuthenticated, async (req, res) => {
    try {
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;

      if (!startDateStr || !endDateStr) {
        return res.status(400).json({ message: "Start date and end date are required." });
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999); // Set to end of day

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format." });
      }

      if (startDate > endDate) {
        return res.status(400).json({ message: "Start date must be before or equal to end date." });
      }

      const memberId =
        req.user!.role === "member"
          ? (await storage.getMemberByUserId(req.user!.id))?.id
          : undefined;

      // Get income entries for the date range
      const incomeEntries = await storage.getIncomeEntriesFiltered(
        memberId,
        startDate,
        endDate
      );

      // Get expense entries for the date range
      const expenseEntries = await storage.getExpenseEntriesFiltered(
        memberId,
        startDate,
        endDate
      );

      // Get income categories
      const incomeCategories = await storage.getIncomeCategories();
      const incomeCategoryMap = new Map(incomeCategories.map(c => [c.id, c.name]));

      // Get expense categories
      const expenseCategories = await storage.getExpenseCategories();
      const expenseCategoryMap = new Map(expenseCategories.map(c => [c.id, c.name]));

      // Calculate totals
      const grossRevenue = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.totalAmount?.toString() || "0"), 0);
      const totalIncomeTax = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.taxAmount?.toString() || "0"), 0);
      const netRevenue = incomeEntries.reduce((sum, entry) => sum + parseFloat(entry.netAmount?.toString() || "0"), 0);
      
      const grossExpenses = expenseEntries.reduce((sum, entry) => sum + parseFloat(entry.totalAmount?.toString() || "0"), 0);
      const totalExpenseTax = expenseEntries.reduce((sum, entry) => sum + parseFloat(entry.taxAmount?.toString() || "0"), 0);
      const netExpenses = expenseEntries.reduce((sum, entry) => sum + parseFloat(entry.netAmount?.toString() || "0"), 0);
      
      const grossProfit = grossRevenue - grossExpenses;
      const netIncome = netRevenue - netExpenses;

      // Calculate income breakdown by category
      const incomeBreakdown = new Map<string, { total: number; net: number; tax: number }>();
      incomeEntries.forEach(entry => {
        const categoryId = entry.categoryId || "uncategorized";
        const categoryName = incomeCategoryMap.get(categoryId) || "Uncategorized";
        const total = parseFloat(entry.totalAmount?.toString() || "0");
        const net = parseFloat(entry.netAmount?.toString() || "0");
        const tax = parseFloat(entry.taxAmount?.toString() || "0");
        
        const existing = incomeBreakdown.get(categoryName) || { total: 0, net: 0, tax: 0 };
        incomeBreakdown.set(categoryName, {
          total: existing.total + total,
          net: existing.net + net,
          tax: existing.tax + tax,
        });
      });

      // Calculate expense breakdown by category
      const expenseBreakdown = new Map<string, { total: number; net: number; tax: number }>();
      expenseEntries.forEach(entry => {
        const categoryName = expenseCategoryMap.get(entry.categoryId) || "Uncategorized";
        const total = parseFloat(entry.totalAmount?.toString() || "0");
        const net = parseFloat(entry.netAmount?.toString() || "0");
        const tax = parseFloat(entry.taxAmount?.toString() || "0");
        
        const existing = expenseBreakdown.get(categoryName) || { total: 0, net: 0, tax: 0 };
        expenseBreakdown.set(categoryName, {
          total: existing.total + total,
          net: existing.net + net,
          tax: existing.tax + tax,
        });
      });

      // Format breakdowns for response
      const incomeBreakdownArray = Array.from(incomeBreakdown.entries()).map(([category, amounts]) => ({
        category,
        total: amounts.total,
        net: amounts.net,
        tax: amounts.tax,
      }));

      const expenseBreakdownArray = Array.from(expenseBreakdown.entries()).map(([category, amounts]) => ({
        category,
        type: "Expense", // You can customize this based on your needs
        total: amounts.total,
        net: amounts.net,
        tax: amounts.tax,
      }));

      // Calculate daily breakdown for graphs
      const dailyBreakdown = new Map<string, { netIncome: number; netExpenses: number }>();
      
      incomeEntries.forEach(entry => {
        if (!entry.date) return;
        try {
          const entryDate: Date = entry.date instanceof Date ? entry.date : new Date(entry.date);
          if (isNaN(entryDate.getTime())) return;
          const dateKey = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD
          const net = parseFloat(entry.netAmount?.toString() || "0");
          const existing = dailyBreakdown.get(dateKey) || { netIncome: 0, netExpenses: 0 };
          dailyBreakdown.set(dateKey, {
            netIncome: existing.netIncome + net,
            netExpenses: existing.netExpenses,
          });
        } catch {
          // Skip invalid dates
        }
      });

      expenseEntries.forEach(entry => {
        if (!entry.date) return;
        try {
          const entryDate: Date = entry.date instanceof Date ? entry.date : new Date(entry.date);
          if (isNaN(entryDate.getTime())) return;
          const dateKey = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD
          const net = parseFloat(entry.netAmount?.toString() || "0");
          const existing = dailyBreakdown.get(dateKey) || { netIncome: 0, netExpenses: 0 };
          dailyBreakdown.set(dateKey, {
            netIncome: existing.netIncome,
            netExpenses: existing.netExpenses + net,
          });
        } catch {
          // Skip invalid dates
        }
      });

      // Convert to array and sort by date
      const dailyBreakdownArray = Array.from(dailyBreakdown.entries())
        .map(([date, values]) => ({
          date,
          netIncome: values.netIncome,
          netExpenses: values.netExpenses,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        startDate: startDateStr,
        endDate: endDateStr,
        netRevenue,
        netIncome,
        grossRevenue,
        grossProfit,
        totalNetExpenses: netExpenses,
        totalGrossExpenses: grossExpenses,
        incomeBreakdown: incomeBreakdownArray,
        expenseBreakdown: expenseBreakdownArray,
        dailyBreakdown: dailyBreakdownArray,
      });
    } catch (error: any) {
      console.error("Error fetching custom report:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to fetch custom report", 
        error: error.message || "Unknown error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  });

  // Share Price
  console.log("Share price route registered: /api/share-price");
  app.get("/api/share-price", isAuthenticated, async (req, res) => {
    try {
      console.log("=== /api/share-price endpoint called ===");
      
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      console.log(`Current date: ${now}, Month: ${currentMonth}, Year: ${currentYear}`);
      
      // Calculate valuations for all months from earliest data month to current month
      console.log("Calculating all monthly valuations...");
      await storage.calculateAllMonthlyValuations(currentYear);
      
      // Get all historical valuations
      console.log("Getting all monthly valuations...");
      const allValuations = await storage.getAllMonthlyValuations();
      console.log(`Found ${allValuations.length} historical valuations`);
      
      // Get current month's valuation
      const currentValuation = await storage.getMonthlyValuation(currentMonth, currentYear);
      if (!currentValuation) {
        throw new Error(`Failed to calculate valuation for current month ${currentMonth}/${currentYear}`);
      }
      console.log("Current valuation object:", currentValuation);
      
      // Format history for response
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const history = allValuations.map(v => ({
        month: v.month,
        year: v.year,
        valuation: parseFloat(v.terracottaValuation.toString()),
        sharePrice: parseFloat(v.terracottaSharePrice.toString()),
        monthLabel: `${monthNames[v.month - 1]} ${v.year}`,
        totalInflows: parseFloat(v.totalInflows.toString()),
        totalOutflows: parseFloat(v.totalOutflows.toString()),
        totalFlows: parseFloat(v.totalFlows.toString()),
        totalSharesPreviousMonth: parseFloat(v.totalSharesPreviousMonth.toString()),
      }));
  
      const response = {
        current: {
          valuation: parseFloat(currentValuation.terracottaValuation.toString()),
          sharePrice: parseFloat(currentValuation.terracottaSharePrice.toString()),
          totalInflows: parseFloat(currentValuation.totalInflows.toString()),
          totalOutflows: parseFloat(currentValuation.totalOutflows.toString()),
          totalFlows: parseFloat(currentValuation.totalFlows.toString()),
          totalSharesPreviousMonth: parseFloat(currentValuation.totalSharesPreviousMonth.toString()),
        },
        history: history
      };
      
      console.log("Final API response:", JSON.stringify(response, null, 2));
      console.log("=== /api/share-price endpoint completed ===\n");
      
      return res.json(response);
  
    } catch (error) {
      console.error("Error in /api/share-price:", error);
      return res.status(500).json({ error: "Failed to calculate share price" });
    }
  });
  // Share Transactions
  app.get("/api/share-transactions", isAuthenticated, async (req, res) => {
    try {
      const memberId = req.query.memberId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const transactions = await storage.getShareTransactions(memberId, startDate, endDate);
      
      // Join with members to get member names
      const transactionsWithMembers = await Promise.all(
        transactions.map(async (transaction) => {
          const member = await storage.getMember(transaction.memberId);
          return {
            ...transaction,
            memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
          };
        })
      );
      
      res.json(transactionsWithMembers);
    } catch (error: any) {
      console.error("Error fetching share transactions:", error);
      res.status(500).json({ message: "Failed to fetch share transactions", error: error.message });
    }
  });

  app.post("/api/share-transactions", isAdmin, async (req, res) => {
    try {
      const transactionData: any = {
        date: new Date(req.body.date),
        memberId: req.body.memberId,
        contributions: req.body.contributions.toString(),
        shares: req.body.shares.toString(),
        createdBy: req.user!.id,
      };

      const transaction = await storage.createShareTransaction(transactionData);

      // Update member's total contributions and shares
      const member = await storage.getMember(req.body.memberId);
      if (member) {
        const currentContributions = parseFloat(member.contributions || "0");
        const currentShares = parseFloat(member.shares || "0");
        const newContributions = currentContributions + parseFloat(req.body.contributions || "0");
        const newShares = currentShares + parseFloat(req.body.shares || "0");
        
        await storage.updateMember(req.body.memberId, {
          contributions: newContributions.toString(),
          shares: newShares.toString(),
        });
      }

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Create",
        entity: "ShareTransaction",
        entityId: transaction.id,
        details: `Created share transaction: ${req.body.shares} shares, $${req.body.contributions} contributions`,
      });

      res.json(transaction);
    } catch (error: any) {
      console.error("Error creating share transaction:", error);
      res.status(500).json({ 
        message: "Failed to create share transaction",
        error: error.message || "Unknown error"
      });
    }
  });

  app.put("/api/share-transactions/:id", isAdmin, async (req, res) => {
    try {
      const transaction = await storage.getShareTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Share transaction not found" });
      }

      const oldContributions = parseFloat(transaction.contributions || "0");
      const oldShares = parseFloat(transaction.shares || "0");
      const newContributions = parseFloat(req.body.contributions || "0");
      const newShares = parseFloat(req.body.shares || "0");

      const updateData: any = {
        date: req.body.date ? new Date(req.body.date) : undefined,
        contributions: req.body.contributions ? req.body.contributions.toString() : undefined,
        shares: req.body.shares ? req.body.shares.toString() : undefined,
        updatedBy: req.user!.id,
      };

      const updatedTransaction = await storage.updateShareTransaction(req.params.id, updateData);

      // Update member's total contributions and shares
      if (updatedTransaction) {
        const member = await storage.getMember(transaction.memberId);
        if (member) {
          const currentContributions = parseFloat(member.contributions || "0");
          const currentShares = parseFloat(member.shares || "0");
          const adjustedContributions = currentContributions - oldContributions + newContributions;
          const adjustedShares = currentShares - oldShares + newShares;
          
          await storage.updateMember(transaction.memberId, {
            contributions: adjustedContributions.toString(),
            shares: adjustedShares.toString(),
          });
        }
      }

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Update",
        entity: "ShareTransaction",
        entityId: req.params.id,
        details: `Updated share transaction`,
      });

      res.json(updatedTransaction);
    } catch (error: any) {
      console.error("Error updating share transaction:", error);
      res.status(500).json({ 
        message: "Failed to update share transaction",
        error: error.message || "Unknown error"
      });
    }
  });

  app.delete("/api/share-transactions/:id", isAdmin, async (req, res) => {
    try {
      const transaction = await storage.getShareTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Share transaction not found" });
      }

      // Update member's total contributions and shares (subtract the transaction)
      const member = await storage.getMember(transaction.memberId);
      if (member) {
        const currentContributions = parseFloat(member.contributions || "0");
        const currentShares = parseFloat(member.shares || "0");
        const transactionContributions = parseFloat(transaction.contributions || "0");
        const transactionShares = parseFloat(transaction.shares || "0");
        const adjustedContributions = Math.max(0, currentContributions - transactionContributions);
        const adjustedShares = Math.max(0, currentShares - transactionShares);
        
        await storage.updateMember(transaction.memberId, {
          contributions: adjustedContributions.toString(),
          shares: adjustedShares.toString(),
        });
      }

      await storage.deleteShareTransaction(req.params.id);

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Delete",
        entity: "ShareTransaction",
        entityId: req.params.id,
        details: `Deleted share transaction`,
      });

      res.json({ message: "Share transaction deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting share transaction:", error);
      res.status(500).json({ 
        message: "Failed to delete share transaction",
        error: error.message || "Unknown error"
      });
    }
  });

  // Audit Trail
  app.get("/api/audit-events", isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const action = (req.query.action as string) || undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const events = await storage.getAuditEvents({
        limit,
        action,
        startDate,
        endDate,
      });
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
