import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum("role", ["admin", "member"]);
export const statusEnum = pgEnum("status", ["active", "inactive"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);

// Sessions table (for session storage)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: timestamp("expire").notNull(),
  }
);

// Users table (for authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("member"),
  status: statusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Members table (profile and ownership data)
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  memberId: text("member_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  contributions: numeric("contributions", { precision: 14, scale: 2 }).notNull().default("0"),
  shares: numeric("shares", { precision: 14, scale: 2 }).notNull().default("0"),
  joinDate: timestamp("join_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

// System Settings table (singleton for global configuration)
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  currency: text("currency").notNull().default("USD"),
  fiscalStartMonth: integer("fiscal_start_month").notNull().default(1), // 1-12
  fiscalYear: integer("fiscal_year").notNull().default(2024),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;

// Payment Methods table
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// Income Categories table
export const incomeCategories = pgTable("income_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const insertIncomeCategorySchema = createInsertSchema(incomeCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertIncomeCategory = z.infer<typeof insertIncomeCategorySchema>;
export type IncomeCategory = typeof incomeCategories.$inferSelect;

// Expense Categories table
export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

// Monthly Profit Goals table
export const monthlyProfitGoals = pgTable("monthly_profit_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  goalAmount: numeric("goal_amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const insertMonthlyProfitGoalSchema = createInsertSchema(monthlyProfitGoals).omit({
  id: true,
  createdAt: true,
});

export type InsertMonthlyProfitGoal = z.infer<typeof insertMonthlyProfitGoalSchema>;
export type MonthlyProfitGoal = typeof monthlyProfitGoals.$inferSelect;

// Income Entries table
export const incomeEntries = pgTable("income_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  memberId: varchar("member_id").notNull().references(() => members.id),
  categoryId: varchar("category_id").references(() => incomeCategories.id),
  paymentMethodId: varchar("payment_method_id").notNull().references(() => paymentMethods.id),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  taxPercentage: numeric("tax_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const insertIncomeEntrySchema = createInsertSchema(incomeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIncomeEntry = z.infer<typeof insertIncomeEntrySchema>;
export type IncomeEntry = typeof incomeEntries.$inferSelect;

// Expense Entries table
export const expenseEntries = pgTable("expense_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  memberId: varchar("member_id").notNull().references(() => members.id),
  categoryId: varchar("category_id").notNull().references(() => expenseCategories.id),
  paymentMethodId: varchar("payment_method_id").notNull().references(() => paymentMethods.id),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  taxPercentage: numeric("tax_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const insertExpenseEntrySchema = createInsertSchema(expenseEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExpenseEntry = z.infer<typeof insertExpenseEntrySchema>;
export type ExpenseEntry = typeof expenseEntries.$inferSelect;

// Member Shares Snapshots table (for tracking ownership over time)
export const memberSharesSnapshots = pgTable("member_shares_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  snapshotDate: timestamp("snapshot_date").notNull(),
  shares: numeric("shares", { precision: 14, scale: 2 }).notNull(),
  totalShares: numeric("total_shares", { precision: 14, scale: 2 }).notNull(),
  sharePercentage: numeric("share_percentage", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemberSharesSnapshotSchema = createInsertSchema(memberSharesSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertMemberSharesSnapshot = z.infer<typeof insertMemberSharesSnapshotSchema>;
export type MemberSharesSnapshot = typeof memberSharesSnapshots.$inferSelect;

// Share Transactions table (for tracking share allocations and contributions)
export const shareTransactions = pgTable("share_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  memberId: varchar("member_id").notNull().references(() => members.id),
  contributions: numeric("contributions", { precision: 14, scale: 2 }).notNull().default("0"),
  shares: numeric("shares", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const insertShareTransactionSchema = createInsertSchema(shareTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShareTransaction = z.infer<typeof insertShareTransactionSchema>;
export type ShareTransaction = typeof shareTransactions.$inferSelect;

// Audit Events table
export const auditEvents = pgTable("audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: varchar("entity_id").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAuditEventSchema = createInsertSchema(auditEvents).omit({
  id: true,
  timestamp: true,
});

export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEvents.$inferSelect;

// Monthly Valuations table (for tracking monthly valuation and share price calculations)
export const monthlyValuations = pgTable("monthly_valuations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  totalInflows: numeric("total_inflows", { precision: 14, scale: 2 }).notNull().default("0"),
  totalOutflows: numeric("total_outflows", { precision: 14, scale: 2 }).notNull().default("0"),
  totalFlows: numeric("total_flows", { precision: 14, scale: 2 }).notNull().default("0"),
  terracottaValuation: numeric("terracotta_valuation", { precision: 14, scale: 2 }).notNull().default("0"),
  totalSharesPreviousMonth: numeric("total_shares_previous_month", { precision: 14, scale: 2 }).notNull().default("0"),
  terracottaSharePrice: numeric("terracotta_share_price", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMonthlyValuationSchema = createInsertSchema(monthlyValuations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMonthlyValuation = z.infer<typeof insertMonthlyValuationSchema>;
export type MonthlyValuation = typeof monthlyValuations.$inferSelect;
