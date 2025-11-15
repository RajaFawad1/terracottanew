import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await storage.createUser({
      username: "admin",
      password: adminPassword,
      role: "admin",
      status: "active",
    });
    console.log("✓ Created admin user (username: admin, password: admin123)");

    // Create admin member profile
    await storage.createMember({
      userId: admin.id,
      memberId: "M001",
      firstName: "Admin",
      lastName: "User",
      email: "admin@terracotta.com",
      phone: "+1 (555) 000-0001",
      contributions: "250000",
      shares: "1000",
    });
    console.log("✓ Created admin member profile");

    // Create sample member user
    const memberPassword = await bcrypt.hash("member123", 10);
    const member = await storage.createUser({
      username: "member",
      password: memberPassword,
      role: "member",
      status: "active",
    });
    console.log("✓ Created member user (username: member, password: member123)");

    // Create member profile
    await storage.createMember({
      userId: member.id,
      memberId: "M002",
      firstName: "John",
      lastName: "Doe",
      email: "john@terracotta.com",
      phone: "+1 (555) 123-4567",
      contributions: "150000",
      shares: "600",
    });
    console.log("✓ Created member profile");

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

    // Create payment methods
    const paymentMethods = ["Bank Transfer", "Credit Card", "Check", "Cash"];
    for (const name of paymentMethods) {
      await storage.createPaymentMethod({
        name,
        createdBy: admin.id,
      });
    }
    console.log("✓ Created payment methods");

    // Create income categories
    const incomeCategories = ["Rent", "Dividends", "Interest", "Capital Gains"];
    for (const name of incomeCategories) {
      await storage.createIncomeCategory({
        name,
        createdBy: admin.id,
      });
    }
    console.log("✓ Created income categories");

    // Create expense categories
    const expenseCategories = ["Maintenance", "Professional Services", "Taxes", "Insurance", "Utilities"];
    for (const name of expenseCategories) {
      await storage.createExpenseCategory({
        name,
        createdBy: admin.id,
      });
    }
    console.log("✓ Created expense categories");

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\nLogin credentials:");
    console.log("Admin - username: admin, password: admin123");
    console.log("Member - username: member, password: member123");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
