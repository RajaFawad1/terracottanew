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
  memberId: z.string().min(1),
  contributions: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
});

const systemSettingsSchema = z.object({
  currency: z.string().optional(),
  fiscalStartMonth: z.number().min(1).max(12).optional(),
  fiscalYear: z.number().min(1960).max(2100).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // Neon-compatible session store
  const sessionStore = new pgStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    },
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
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
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
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

      const member = await storage.createMember({
        userId: user.id,
        memberId: data.memberId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
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
      const entry = await storage.createIncomeEntry({
        ...req.body,
        date: new Date(req.body.date),
        totalAmount: req.body.totalAmount.toString(),
        taxPercentage: req.body.taxPercentage.toString(),
        taxAmount: req.body.taxAmount.toString(),
        netAmount: req.body.netAmount.toString(),
        createdBy: req.user!.id,
      });

      await storage.createAuditEvent({
        userId: req.user!.id,
        action: "Create",
        entity: "IncomeEntry",
        entityId: entry.id,
        details: `Created income entry: $${entry.netAmount}`,
      });

      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to create income entry" });
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
      const entry = await storage.createExpenseEntry({
        ...req.body,
        date: new Date(req.body.date),
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

  // Audit Trail
  app.get("/api/audit-events", isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const events = await storage.getAuditEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
