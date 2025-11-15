import { db } from "./db";
import { eq, and, gte, lte, desc, sql, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User,
  InsertUser,
  Member,
  InsertMember,
  SystemSettings,
  InsertSystemSettings,
  PaymentMethod,
  InsertPaymentMethod,
  IncomeCategory,
  InsertIncomeCategory,
  ExpenseCategory,
  InsertExpenseCategory,
  MonthlyProfitGoal,
  InsertMonthlyProfitGoal,
  IncomeEntry,
  InsertIncomeEntry,
  ExpenseEntry,
  InsertExpenseEntry,
  MemberSharesSnapshot,
  InsertMemberSharesSnapshot,
  AuditEvent,
  InsertAuditEvent,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;
  
  // Member operations
  getMember(id: string): Promise<Member | undefined>;
  getMemberByUserId(userId: string): Promise<Member | undefined>;
  getAllMembers(): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, data: Partial<Member>): Promise<Member | undefined>;
  getFilteredMembers(month?: number, year?: number): Promise<Member[]>;
  
  // System Settings operations
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(data: Partial<SystemSettings>, updatedBy: string): Promise<SystemSettings>;
  
  // Payment Methods
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;
  
  // Income Categories
  getIncomeCategories(): Promise<IncomeCategory[]>;
  getIncomeCategory(id: string): Promise<IncomeCategory | undefined>;
  createIncomeCategory(category: InsertIncomeCategory): Promise<IncomeCategory>;
  updateIncomeCategory(id: string, data: Partial<IncomeCategory>): Promise<IncomeCategory | undefined>;
  deleteIncomeCategory(id: string): Promise<void>;
  
  // Expense Categories
  getExpenseCategories(): Promise<ExpenseCategory[]>;
  getExpenseCategory(id: string): Promise<ExpenseCategory | undefined>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: string): Promise<void>;
  
  // Monthly Profit Goals
  getMonthlyProfitGoals(): Promise<MonthlyProfitGoal[]>;
  getMonthlyProfitGoal(month: number, year: number): Promise<MonthlyProfitGoal | undefined>;
  createMonthlyProfitGoal(goal: InsertMonthlyProfitGoal): Promise<MonthlyProfitGoal>;
  updateMonthlyProfitGoal(id: string, data: Partial<MonthlyProfitGoal>): Promise<MonthlyProfitGoal | undefined>;
  deleteMonthlyProfitGoal(id: string): Promise<void>;
  
  // Income Entries
  getIncomeEntries(memberId?: string): Promise<IncomeEntry[]>;
  getIncomeEntry(id: string): Promise<IncomeEntry | undefined>;
  createIncomeEntry(entry: InsertIncomeEntry): Promise<IncomeEntry>;
  updateIncomeEntry(id: string, data: Partial<IncomeEntry>): Promise<IncomeEntry | undefined>;
  deleteIncomeEntry(id: string): Promise<void>;
  getIncomeEntriesFiltered(memberId?: string, startDate?: Date, endDate?: Date, categoryId?: string): Promise<IncomeEntry[]>;
  getTotalIncome(memberId?: string, startDate?: Date, endDate?: Date): Promise<number>;
  
  // Expense Entries
  getExpenseEntries(memberId?: string): Promise<ExpenseEntry[]>;
  getExpenseEntry(id: string): Promise<ExpenseEntry | undefined>;
  createExpenseEntry(entry: InsertExpenseEntry): Promise<ExpenseEntry>;
  updateExpenseEntry(id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry | undefined>;
  deleteExpenseEntry(id: string): Promise<void>;
  getExpenseEntriesFiltered(memberId?: string, startDate?: Date, endDate?: Date, categoryId?: string): Promise<ExpenseEntry[]>;
  getTotalExpenses(memberId?: string, startDate?: Date, endDate?: Date): Promise<number>;
  
  // Member Shares
  createSharesSnapshot(snapshot: InsertMemberSharesSnapshot): Promise<MemberSharesSnapshot>;
  getLatestSharesSnapshots(): Promise<MemberSharesSnapshot[]>;
  
  // Audit
  createAuditEvent(event: InsertAuditEvent): Promise<AuditEvent>;
  getAuditEvents(limit?: number): Promise<AuditEvent[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(schema.users).set({ lastLogin: new Date() }).where(eq(schema.users.id, id));
  }

  // Member operations
  async getMember(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(schema.members).where(eq(schema.members.id, id));
    return member;
  }

  async getMemberByUserId(userId: string): Promise<Member | undefined> {
    const [member] = await db.select().from(schema.members).where(eq(schema.members.userId, userId));
    return member;
  }

  async getAllMembers(): Promise<Member[]> {
    return await db.select().from(schema.members).orderBy(desc(schema.members.joinDate));
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const [member] = await db.insert(schema.members).values(insertMember).returning();
    return member;
  }

  async updateMember(id: string, data: Partial<Member>): Promise<Member | undefined> {
    const [member] = await db
      .update(schema.members)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.members.id, id))
      .returning();
    return member;
  }

  async getFilteredMembers(month?: number, year?: number): Promise<Member[]> {
    if (!month || !year) {
      return this.getAllMembers();
    }
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    return await db
      .select()
      .from(schema.members)
      .where(
        and(
          gte(schema.members.joinDate, startDate),
          lte(schema.members.joinDate, endDate)
        )
      )
      .orderBy(desc(schema.members.joinDate));
  }

  // System Settings
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const [settings] = await db.select().from(schema.systemSettings).limit(1);
    return settings;
  }

  async updateSystemSettings(data: Partial<SystemSettings>, updatedBy: string): Promise<SystemSettings> {
    const existing = await this.getSystemSettings();
    
    if (existing) {
      const [updated] = await db
        .update(schema.systemSettings)
        .set({ ...data, updatedAt: new Date(), updatedBy })
        .where(eq(schema.systemSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(schema.systemSettings)
        .values({ ...data, updatedBy } as any)
        .returning();
      return created;
    }
  }

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await db.select().from(schema.paymentMethods).where(eq(schema.paymentMethods.isActive, 1));
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [method] = await db.select().from(schema.paymentMethods).where(eq(schema.paymentMethods.id, id));
    return method;
  }

  async createPaymentMethod(insertMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const [method] = await db.insert(schema.paymentMethods).values(insertMethod).returning();
    return method;
  }

  async updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const [method] = await db.update(schema.paymentMethods).set(data).where(eq(schema.paymentMethods.id, id)).returning();
    return method;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await db.update(schema.paymentMethods).set({ isActive: 0 }).where(eq(schema.paymentMethods.id, id));
  }

  // Income Categories
  async getIncomeCategories(): Promise<IncomeCategory[]> {
    return await db.select().from(schema.incomeCategories).where(eq(schema.incomeCategories.isActive, 1));
  }

  async getIncomeCategory(id: string): Promise<IncomeCategory | undefined> {
    const [category] = await db.select().from(schema.incomeCategories).where(eq(schema.incomeCategories.id, id));
    return category;
  }

  async createIncomeCategory(insertCategory: InsertIncomeCategory): Promise<IncomeCategory> {
    const [category] = await db.insert(schema.incomeCategories).values(insertCategory).returning();
    return category;
  }

  async updateIncomeCategory(id: string, data: Partial<IncomeCategory>): Promise<IncomeCategory | undefined> {
    const [category] = await db.update(schema.incomeCategories).set(data).where(eq(schema.incomeCategories.id, id)).returning();
    return category;
  }

  async deleteIncomeCategory(id: string): Promise<void> {
    await db.update(schema.incomeCategories).set({ isActive: 0 }).where(eq(schema.incomeCategories.id, id));
  }

  // Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.select().from(schema.expenseCategories).where(eq(schema.expenseCategories.isActive, 1));
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | undefined> {
    const [category] = await db.select().from(schema.expenseCategories).where(eq(schema.expenseCategories.id, id));
    return category;
  }

  async createExpenseCategory(insertCategory: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [category] = await db.insert(schema.expenseCategories).values(insertCategory).returning();
    return category;
  }

  async updateExpenseCategory(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const [category] = await db.update(schema.expenseCategories).set(data).where(eq(schema.expenseCategories.id, id)).returning();
    return category;
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    await db.update(schema.expenseCategories).set({ isActive: 0 }).where(eq(schema.expenseCategories.id, id));
  }

  // Monthly Profit Goals
  async getMonthlyProfitGoals(): Promise<MonthlyProfitGoal[]> {
    return await db.select().from(schema.monthlyProfitGoals).orderBy(desc(schema.monthlyProfitGoals.year), desc(schema.monthlyProfitGoals.month));
  }

  async getMonthlyProfitGoal(month: number, year: number): Promise<MonthlyProfitGoal | undefined> {
    const [goal] = await db
      .select()
      .from(schema.monthlyProfitGoals)
      .where(and(eq(schema.monthlyProfitGoals.month, month), eq(schema.monthlyProfitGoals.year, year)));
    return goal;
  }

  async createMonthlyProfitGoal(insertGoal: InsertMonthlyProfitGoal): Promise<MonthlyProfitGoal> {
    const [goal] = await db.insert(schema.monthlyProfitGoals).values(insertGoal).returning();
    return goal;
  }

  async updateMonthlyProfitGoal(id: string, data: Partial<MonthlyProfitGoal>): Promise<MonthlyProfitGoal | undefined> {
    const [goal] = await db.update(schema.monthlyProfitGoals).set(data).where(eq(schema.monthlyProfitGoals.id, id)).returning();
    return goal;
  }

  async deleteMonthlyProfitGoal(id: string): Promise<void> {
    await db.delete(schema.monthlyProfitGoals).where(eq(schema.monthlyProfitGoals.id, id));
  }

  // Income Entries
  async getIncomeEntries(memberId?: string): Promise<IncomeEntry[]> {
    if (memberId) {
      return await db.select().from(schema.incomeEntries).where(eq(schema.incomeEntries.memberId, memberId)).orderBy(desc(schema.incomeEntries.date));
    }
    return await db.select().from(schema.incomeEntries).orderBy(desc(schema.incomeEntries.date));
  }

  async getIncomeEntry(id: string): Promise<IncomeEntry | undefined> {
    const [entry] = await db.select().from(schema.incomeEntries).where(eq(schema.incomeEntries.id, id));
    return entry;
  }

  async createIncomeEntry(insertEntry: InsertIncomeEntry): Promise<IncomeEntry> {
    const [entry] = await db.insert(schema.incomeEntries).values(insertEntry).returning();
    return entry;
  }

  async updateIncomeEntry(id: string, data: Partial<IncomeEntry>): Promise<IncomeEntry | undefined> {
    const [entry] = await db
      .update(schema.incomeEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.incomeEntries.id, id))
      .returning();
    return entry;
  }

  async deleteIncomeEntry(id: string): Promise<void> {
    await db.delete(schema.incomeEntries).where(eq(schema.incomeEntries.id, id));
  }

  async getIncomeEntriesFiltered(memberId?: string, startDate?: Date, endDate?: Date, categoryId?: string): Promise<IncomeEntry[]> {
    const conditions = [];
    
    if (memberId) conditions.push(eq(schema.incomeEntries.memberId, memberId));
    if (startDate) conditions.push(gte(schema.incomeEntries.date, startDate));
    if (endDate) conditions.push(lte(schema.incomeEntries.date, endDate));
    if (categoryId) conditions.push(eq(schema.incomeEntries.categoryId, categoryId));
    
    if (conditions.length === 0) {
      return this.getIncomeEntries(memberId);
    }
    
    return await db.select().from(schema.incomeEntries).where(and(...conditions)).orderBy(desc(schema.incomeEntries.date));
  }

  async getTotalIncome(memberId?: string, startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [];
    
    if (memberId) conditions.push(eq(schema.incomeEntries.memberId, memberId));
    if (startDate) conditions.push(gte(schema.incomeEntries.date, startDate));
    if (endDate) conditions.push(lte(schema.incomeEntries.date, endDate));
    
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.incomeEntries.netAmount}), 0)` })
      .from(schema.incomeEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return parseFloat(result[0]?.total || "0");
  }

  // Expense Entries
  async getExpenseEntries(memberId?: string): Promise<ExpenseEntry[]> {
    if (memberId) {
      return await db.select().from(schema.expenseEntries).where(eq(schema.expenseEntries.memberId, memberId)).orderBy(desc(schema.expenseEntries.date));
    }
    return await db.select().from(schema.expenseEntries).orderBy(desc(schema.expenseEntries.date));
  }

  async getExpenseEntry(id: string): Promise<ExpenseEntry | undefined> {
    const [entry] = await db.select().from(schema.expenseEntries).where(eq(schema.expenseEntries.id, id));
    return entry;
  }

  async createExpenseEntry(insertEntry: InsertExpenseEntry): Promise<ExpenseEntry> {
    const [entry] = await db.insert(schema.expenseEntries).values(insertEntry).returning();
    return entry;
  }

  async updateExpenseEntry(id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry | undefined> {
    const [entry] = await db
      .update(schema.expenseEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.expenseEntries.id, id))
      .returning();
    return entry;
  }

  async deleteExpenseEntry(id: string): Promise<void> {
    await db.delete(schema.expenseEntries).where(eq(schema.expenseEntries.id, id));
  }

  async getExpenseEntriesFiltered(memberId?: string, startDate?: Date, endDate?: Date, categoryId?: string): Promise<ExpenseEntry[]> {
    const conditions = [];
    
    if (memberId) conditions.push(eq(schema.expenseEntries.memberId, memberId));
    if (startDate) conditions.push(gte(schema.expenseEntries.date, startDate));
    if (endDate) conditions.push(lte(schema.expenseEntries.date, endDate));
    if (categoryId) conditions.push(eq(schema.expenseEntries.categoryId, categoryId));
    
    if (conditions.length === 0) {
      return this.getExpenseEntries(memberId);
    }
    
    return await db.select().from(schema.expenseEntries).where(and(...conditions)).orderBy(desc(schema.expenseEntries.date));
  }

  async getTotalExpenses(memberId?: string, startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [];
    
    if (memberId) conditions.push(eq(schema.expenseEntries.memberId, memberId));
    if (startDate) conditions.push(gte(schema.expenseEntries.date, startDate));
    if (endDate) conditions.push(lte(schema.expenseEntries.date, endDate));
    
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.expenseEntries.netAmount}), 0)` })
      .from(schema.expenseEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return parseFloat(result[0]?.total || "0");
  }

  // Member Shares
  async createSharesSnapshot(insertSnapshot: InsertMemberSharesSnapshot): Promise<MemberSharesSnapshot> {
    const [snapshot] = await db.insert(schema.memberSharesSnapshots).values(insertSnapshot).returning();
    return snapshot;
  }

  async getLatestSharesSnapshots(): Promise<MemberSharesSnapshot[]> {
    return await db
      .select()
      .from(schema.memberSharesSnapshots)
      .orderBy(desc(schema.memberSharesSnapshots.snapshotDate))
      .limit(100);
  }

  // Audit
  async createAuditEvent(insertEvent: InsertAuditEvent): Promise<AuditEvent> {
    const [event] = await db.insert(schema.auditEvents).values(insertEvent).returning();
    return event;
  }

  async getAuditEvents(limit: number = 100): Promise<AuditEvent[]> {
    return await db.select().from(schema.auditEvents).orderBy(desc(schema.auditEvents.timestamp)).limit(limit);
  }
}

export const storage = new DatabaseStorage();
