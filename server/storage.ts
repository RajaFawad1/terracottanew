import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql, or, ilike } from "drizzle-orm";
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
  ShareTransaction,
  InsertShareTransaction,
  AuditEvent,
  InsertAuditEvent,
  MonthlyValuation,
  InsertMonthlyValuation,
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
  
  // Monthly Valuation Calculations
  getMonthlyValuation(month: number, year: number): Promise<MonthlyValuation | undefined>;
  getAllMonthlyValuations(): Promise<MonthlyValuation[]>;
  calculateAndSaveMonthlyValuation(month: number, year: number): Promise<MonthlyValuation>;
  calculateAllMonthlyValuations(year: number): Promise<MonthlyValuation[]>;
  getEarliestDataMonth(): Promise<{ month: number; year: number } | null>;
  getTotalInflows(month: number, year: number): Promise<number>;
  getTotalOutflows(month: number, year: number): Promise<number>;
  getTotalSharesForPreviousMonth(month: number, year: number): Promise<number>;
  
  // Member Shares
  createSharesSnapshot(snapshot: InsertMemberSharesSnapshot): Promise<MemberSharesSnapshot>;
  getLatestSharesSnapshots(): Promise<MemberSharesSnapshot[]>;
  
  // Share Transactions
  getShareTransactions(memberId?: string, startDate?: Date, endDate?: Date): Promise<ShareTransaction[]>;
  getShareTransaction(id: string): Promise<ShareTransaction | undefined>;
  createShareTransaction(transaction: InsertShareTransaction): Promise<ShareTransaction>;
  updateShareTransaction(id: string, data: Partial<ShareTransaction>): Promise<ShareTransaction | undefined>;
  deleteShareTransaction(id: string): Promise<void>;
  
  // Audit
  createAuditEvent(event: InsertAuditEvent): Promise<AuditEvent>;
  getAuditEvents(options?: {
    limit?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<(AuditEvent & { username?: string | null })[]>;
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
    const cleanId = id.trim();
    const [entry] = await db.select().from(schema.incomeEntries).where(eq(schema.incomeEntries.id, cleanId));
    return entry;
  }

  async createIncomeEntry(insertEntry: InsertIncomeEntry): Promise<IncomeEntry> {
    const [entry] = await db.insert(schema.incomeEntries).values(insertEntry).returning();
    return entry;
  }

  async updateIncomeEntry(id: string, data: Partial<IncomeEntry>): Promise<IncomeEntry | undefined> {
    const cleanId = id.trim();
    const [entry] = await db
      .update(schema.incomeEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.incomeEntries.id, cleanId))
      .returning();
    return entry;
  }

  async deleteIncomeEntry(id: string): Promise<void> {
    const cleanId = id.trim();
    await db.delete(schema.incomeEntries).where(eq(schema.incomeEntries.id, cleanId));
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
    const cleanId = id.trim();
    const [entry] = await db.select().from(schema.expenseEntries).where(eq(schema.expenseEntries.id, cleanId));
    return entry;
  }

  async createExpenseEntry(insertEntry: InsertExpenseEntry): Promise<ExpenseEntry> {
    const [entry] = await db.insert(schema.expenseEntries).values(insertEntry).returning();
    return entry;
  }

  async updateExpenseEntry(id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry | undefined> {
    const cleanId = id.trim();
    const [entry] = await db
      .update(schema.expenseEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.expenseEntries.id, cleanId))
      .returning();
    return entry;
  }

  async deleteExpenseEntry(id: string): Promise<void> {
    const cleanId = id.trim();
    await db.delete(schema.expenseEntries).where(eq(schema.expenseEntries.id, cleanId));
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

  // Monthly Valuation Calculations
  async getTotalInflows(month: number, year: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.shareTransactions.contributions}), 0)` })
      .from(schema.shareTransactions)
      .where(and(
        gte(schema.shareTransactions.date, startDate),
        lte(schema.shareTransactions.date, endDate)
      ));
    
    return parseFloat(result[0]?.total || "0");
  }

  async getTotalOutflows(month: number, year: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Calculate total outflows as the sum of all total_amount from expense_entries table for the same month
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.expenseEntries.totalAmount}), 0)` })
      .from(schema.expenseEntries)
      .where(and(
        gte(schema.expenseEntries.date, startDate),
        lte(schema.expenseEntries.date, endDate)
      ));
    
    return parseFloat(result[0]?.total || "0");
  }

  async getTotalSharesForPreviousMonth(month: number, year: number): Promise<number> {
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const endOfPreviousMonth = new Date(previousYear, previousMonth, 0, 23, 59, 59, 999);
    
    // Sum all shares from share_transactions up to the end of previous month
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.shareTransactions.shares}), 0)` })
      .from(schema.shareTransactions)
      .where(lte(schema.shareTransactions.date, endOfPreviousMonth));
    
    const sharesFromPreviousMonth = parseFloat(result[0]?.total || "0");
    
    // If there are no shares from previous month (first month scenario),
    // sum all shares from the current month instead
    if (sharesFromPreviousMonth === 0) {
      const currentMonthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const currentMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);
      
      const currentMonthResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${schema.shareTransactions.shares}), 0)` })
        .from(schema.shareTransactions)
        .where(and(
          gte(schema.shareTransactions.date, currentMonthStart),
          lte(schema.shareTransactions.date, currentMonthEnd)
        ));
      
      return parseFloat(currentMonthResult[0]?.total || "0");
    }
    
    return sharesFromPreviousMonth;
  }
  
  // Get cumulative total shares at the end of a specific month
  async getCumulativeTotalSharesAtEndOfMonth(month: number, year: number): Promise<number> {
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Sum all shares from share_transactions up to the end of the month
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.shareTransactions.shares}), 0)` })
      .from(schema.shareTransactions)
      .where(lte(schema.shareTransactions.date, endOfMonth));
    
    return parseFloat(result[0]?.total || "0");
  }

  async getMonthlyValuation(month: number, year: number): Promise<MonthlyValuation | undefined> {
    const [valuation] = await db
      .select()
      .from(schema.monthlyValuations)
      .where(and(
        eq(schema.monthlyValuations.month, month),
        eq(schema.monthlyValuations.year, year)
      ));
    return valuation;
  }

  async getAllMonthlyValuations(): Promise<MonthlyValuation[]> {
    return await db
      .select()
      .from(schema.monthlyValuations)
      .orderBy(asc(schema.monthlyValuations.year), asc(schema.monthlyValuations.month));
  }

  async calculateAndSaveMonthlyValuation(month: number, year: number): Promise<MonthlyValuation> {
    console.log(`=== Calculating valuation for ${month}/${year} ===`);
    
    // Step 1: Calculate Total Inflows (from share_transactions.contributions)
    const totalInflows = await this.getTotalInflows(month, year);
    console.log(`Total Inflows: $${totalInflows}`);
    
    // Step 2: Calculate Total Outflows (from expense_entries.total_amount)
    const totalOutflows = await this.getTotalOutflows(month, year);
    console.log(`Total Outflows: $${totalOutflows}`);
    
    // Step 3: Calculate Total Flows
    const totalFlows = totalInflows - totalOutflows;
    console.log(`Total Flows: $${totalFlows}`);
    
    // Step 4: Calculate Terracotta Valuation
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const previousValuation = await this.getMonthlyValuation(previousMonth, previousYear);
    console.log(`Previous Valuation (${previousMonth}/${previousYear}):`, previousValuation);
    
    let terracottaValuation: number;
    if (!previousValuation) {
      // First month: valuation is the sum of all contributions (totalInflows)
      terracottaValuation = totalInflows;
      console.log(`First month - Valuation = Total Inflows: $${terracottaValuation}`);
    } else {
      // Subsequent months: previous_month_valuation + total_flows
      const previousTerracottaValuation = parseFloat(previousValuation.terracottaValuation.toString());
      terracottaValuation = previousTerracottaValuation + totalFlows;
      console.log(`Subsequent month - Valuation = Previous ($${previousTerracottaValuation}) + Flows ($${totalFlows}): $${terracottaValuation}`);
    }
    
    // Step 7: Get Total Shares at the end of Previous Month (cumulative)
    const totalSharesPreviousMonth = await this.getTotalSharesForPreviousMonth(month, year);
    console.log(`Total Shares Previous Month: ${totalSharesPreviousMonth}`);
    
    // Step 8: Calculate Terracotta Share Price
    const terracottaSharePrice = totalSharesPreviousMonth > 0 
      ? terracottaValuation / totalSharesPreviousMonth 
      : 0;
    console.log(`Share Price = Valuation ($${terracottaValuation}) / Previous Shares (${totalSharesPreviousMonth}): $${terracottaSharePrice}`);
    
    // Step 5 & 9: Save Monthly Valuation Data
    const existing = await this.getMonthlyValuation(month, year);
    
    const valuationData: InsertMonthlyValuation = {
      month,
      year,
      totalInflows: totalInflows.toString(),
      totalOutflows: totalOutflows.toString(),
      totalFlows: totalFlows.toString(),
      terracottaValuation: terracottaValuation.toString(),
      totalSharesPreviousMonth: totalSharesPreviousMonth.toString(),
      terracottaSharePrice: terracottaSharePrice.toString(),
    };
    
    if (existing) {
      const [updated] = await db
        .update(schema.monthlyValuations)
        .set({ ...valuationData, updatedAt: new Date() })
        .where(eq(schema.monthlyValuations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(schema.monthlyValuations)
        .values(valuationData)
        .returning();
      return created;
    }
  }

  async getEarliestDataMonth(): Promise<{ month: number; year: number } | null> {
    // Find earliest date from share_transactions
    const earliestShareTransaction = await db
      .select({ date: schema.shareTransactions.date })
      .from(schema.shareTransactions)
      .orderBy(asc(schema.shareTransactions.date))
      .limit(1);

    // Find earliest date from expense_entries
    const earliestExpenseEntry = await db
      .select({ date: schema.expenseEntries.date })
      .from(schema.expenseEntries)
      .orderBy(asc(schema.expenseEntries.date))
      .limit(1);

    let earliestDate: Date | null = null;

    if (earliestShareTransaction.length > 0 && earliestShareTransaction[0].date) {
      earliestDate = earliestShareTransaction[0].date;
    }

    if (earliestExpenseEntry.length > 0 && earliestExpenseEntry[0].date) {
      if (!earliestDate || earliestExpenseEntry[0].date < earliestDate) {
        earliestDate = earliestExpenseEntry[0].date;
      }
    }

    if (!earliestDate) {
      return null;
    }

    return {
      month: earliestDate.getMonth() + 1,
      year: earliestDate.getFullYear(),
    };
  }

  async calculateAllMonthlyValuations(year: number): Promise<MonthlyValuation[]> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get the earliest month with data
    const earliestData = await this.getEarliestDataMonth();
    
    // Determine start year and month
    let startYear: number;
    let startMonth: number;
    
    if (earliestData) {
      startYear = earliestData.year;
      startMonth = earliestData.month;
    } else {
      // If no data found, start from January of the specified year
      startYear = year;
      startMonth = 1;
    }
    
    // Calculate end month (current month if current year, otherwise December of the specified year)
    const endYear = year <= currentYear ? year : currentYear;
    const endMonth = endYear === currentYear ? currentMonth : 12;

    const results: MonthlyValuation[] = [];

    // Calculate for each month from start to end
    for (let y = startYear; y <= endYear; y++) {
      const monthStart = y === startYear ? startMonth : 1;
      const monthEnd = y === endYear ? endMonth : 12;

      for (let m = monthStart; m <= monthEnd; m++) {
        try {
          const valuation = await this.calculateAndSaveMonthlyValuation(m, y);
          results.push(valuation);
        } catch (error) {
          console.error(`Error calculating valuation for ${m}/${y}:`, error);
        }
      }
    }

    return results;
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

  // Share Transactions
  async getShareTransactions(memberId?: string, startDate?: Date, endDate?: Date): Promise<ShareTransaction[]> {
    const conditions = [];
    
    if (memberId) conditions.push(eq(schema.shareTransactions.memberId, memberId));
    if (startDate) conditions.push(gte(schema.shareTransactions.date, startDate));
    if (endDate) conditions.push(lte(schema.shareTransactions.date, endDate));
    
    if (conditions.length === 0) {
      return await db.select().from(schema.shareTransactions).orderBy(desc(schema.shareTransactions.date));
    }
    
    return await db
      .select()
      .from(schema.shareTransactions)
      .where(and(...conditions))
      .orderBy(desc(schema.shareTransactions.date));
  }

  async getShareTransaction(id: string): Promise<ShareTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(schema.shareTransactions)
      .where(eq(schema.shareTransactions.id, id));
    return transaction;
  }

  async createShareTransaction(insertTransaction: InsertShareTransaction): Promise<ShareTransaction> {
    const [transaction] = await db.insert(schema.shareTransactions).values(insertTransaction).returning();
    return transaction;
  }

  async updateShareTransaction(id: string, data: Partial<ShareTransaction>): Promise<ShareTransaction | undefined> {
    const [transaction] = await db
      .update(schema.shareTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.shareTransactions.id, id))
      .returning();
    return transaction;
  }

  async deleteShareTransaction(id: string): Promise<void> {
    await db.delete(schema.shareTransactions).where(eq(schema.shareTransactions.id, id));
  }

  // Audit
  async createAuditEvent(insertEvent: InsertAuditEvent): Promise<AuditEvent> {
    const [event] = await db.insert(schema.auditEvents).values(insertEvent).returning();
    return event;
  }

  async getAuditEvents(
    options?: {
      limit?: number;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      userId?: string;
    }
  ): Promise<(AuditEvent & { username?: string | null })[]> {
    const { limit = 100, action, startDate, endDate, userId } = options || {};
    const conditions = [];

    if (action) {
      conditions.push(ilike(schema.auditEvents.action, `%${action}%`));
    }
    if (userId) {
      conditions.push(eq(schema.auditEvents.userId, userId));
    }
    if (startDate) {
      conditions.push(gte(schema.auditEvents.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.auditEvents.timestamp, endDate));
    }

    return await db
      .select({
        id: schema.auditEvents.id,
        userId: schema.auditEvents.userId,
        action: schema.auditEvents.action,
        entity: schema.auditEvents.entity,
        entityId: schema.auditEvents.entityId,
        oldValue: schema.auditEvents.oldValue,
        newValue: schema.auditEvents.newValue,
        details: schema.auditEvents.details,
        timestamp: schema.auditEvents.timestamp,
        username: schema.users.username,
      })
      .from(schema.auditEvents)
      .leftJoin(schema.users, eq(schema.auditEvents.userId, schema.users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditEvents.timestamp))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
