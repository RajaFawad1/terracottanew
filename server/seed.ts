import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  try {
    // Create or get admin user
    let admin = await storage.getUserByUsername("fawad");
    if (!admin) {
      const adminPassword = await bcrypt.hash("admin123", 10);
      admin = await storage.createUser({
        username: "fawad",
        password: adminPassword,
        role: "admin",
        status: "active",
      });
      console.log("✓ Created admin user (username: fawad, password: admin123)");
    } else {
      console.log("✓ Admin user already exists (username: fawad)");
    }

    // Create or get admin member profile
    let adminMember = await storage.getMemberByUserId(admin.id);
    if (!adminMember) {
      adminMember = await storage.createMember({
        userId: admin.id,
        memberId: "M00100",
        firstName: "Admin",
        lastName: "User",
        email: "admin@terracotta.com",
        phone: "+1 (555) 000-0001",
        contributions: "250000",
        shares: "1000",
      });
      console.log("✓ Created admin member profile");
    } else {
      console.log("✓ Admin member profile already exists");
    }

    // Create or get sample member user
    let member = await storage.getUserByUsername("member12");
    if (!member) {
      const memberPassword = await bcrypt.hash("member123", 10);
      member = await storage.createUser({
        username: "member12",
        password: memberPassword,
        role: "member",
        status: "active",
      });
      console.log("✓ Created member user (username: member12, password: member123)");
    } else {
      console.log("✓ Member user already exists (username: member12)");
    }

    // Create or get member profile
    let memberProfile = await storage.getMemberByUserId(member.id);
    if (!memberProfile) {
      memberProfile = await storage.createMember({
        userId: member.id,
        memberId: "M0090",
        firstName: "John",
        lastName: "Doe",
        email: "john@terracotta.com",
        phone: "+1 (555) 123-4567",
        contributions: "150000",
        shares: "600",
      });
      console.log("✓ Created member profile");
    } else {
      console.log("✓ Member profile already exists");
    }

    // Initialize system settings
    await storage.updateSystemSettings(
      {
        currency: "USD",
        fiscalStartMonth: 1,
        fiscalYear: 2024,
      },
      admin.id
    );
    console.log("✓ Initialized system settings");

    // Create payment methods (skip if already exist)
    const paymentMethods = ["Bank Transfer", "Credit Card", "Check", "Cash"];
    const existingPaymentMethods = await storage.getPaymentMethods();
    const existingPaymentMethodNames = existingPaymentMethods.map(pm => pm.name);
    
    for (const name of paymentMethods) {
      if (!existingPaymentMethodNames.includes(name)) {
        await storage.createPaymentMethod({
          name,
          createdBy: admin.id,
        });
      }
    }
    console.log("✓ Ensured payment methods exist");

    // Create income categories (skip if already exist)
    const incomeCategories = ["Rent", "Dividends", "Interest", "Capital Gains"];
    const existingIncomeCategories = await storage.getIncomeCategories();
    const existingIncomeCategoryNames = existingIncomeCategories.map(ic => ic.name);
    
    for (const name of incomeCategories) {
      if (!existingIncomeCategoryNames.includes(name)) {
        await storage.createIncomeCategory({
          name,
          createdBy: admin.id,
        });
      }
    }
    console.log("✓ Ensured income categories exist");

    // Create expense categories (skip if already exist)
    const expenseCategories = ["Maintenance", "Professional Services", "Taxes", "Insurance", "Utilities"];
    const existingExpenseCategories = await storage.getExpenseCategories();
    const existingExpenseCategoryNames = existingExpenseCategories.map(ec => ec.name);
    
    for (const name of expenseCategories) {
      if (!existingExpenseCategoryNames.includes(name)) {
        await storage.createExpenseCategory({
          name,
          createdBy: admin.id,
        });
      }
    }
    console.log("✓ Ensured expense categories exist");

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\nLogin credentials:");
    console.log("Admin - username: fawad, password: admin123");
    console.log("Member - username: member12, password: member123");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
