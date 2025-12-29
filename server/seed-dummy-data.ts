import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seedDummyData() {
  console.log("Seeding database with dummy data...\n");

  try {
    // Create admin user (username: admin, password: admin123)
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await storage.createUser({
      username: "admin",
      password: adminPassword,
      role: "admin",
      status: "active",
    });
    console.log("✓ Created admin user (username: admin, password: admin123)");

    // Create 4 additional users (5 total including admin)
    const userPasswords = await Promise.all([
      bcrypt.hash("password123", 10),
      bcrypt.hash("password123", 10),
      bcrypt.hash("password123", 10),
      bcrypt.hash("password123", 10),
    ]);

    const users = [admin];
    const userData = [
      { username: "john.doe", firstName: "John", lastName: "Doe", email: "john.doe@terracotta.com", phone: "+1 (555) 111-1111" },
      { username: "jane.smith", firstName: "Jane", lastName: "Smith", email: "jane.smith@terracotta.com", phone: "+1 (555) 222-2222" },
      { username: "bob.wilson", firstName: "Bob", lastName: "Wilson", email: "bob.wilson@terracotta.com", phone: "+1 (555) 333-3333" },
      { username: "alice.brown", firstName: "Alice", lastName: "Brown", email: "alice.brown@terracotta.com", phone: "+1 (555) 444-4444" },
    ];

    for (let i = 0; i < 4; i++) {
      const user = await storage.createUser({
        username: userData[i].username,
        password: userPasswords[i],
        role: "member",
        status: "active",
      });
      users.push(user);
      console.log(`✓ Created user: ${userData[i].username}`);
    }

    // Create 5 members (one for each user)
    const members = [];
    const memberData = [
      { memberId: "M001", firstName: "Admin", lastName: "User", email: "admin@terracotta.com", phone: "+1 (555) 000-0001", contributions: "250000", shares: "1000" },
      { memberId: "M002", firstName: "John", lastName: "Doe", email: "john.doe@terracotta.com", phone: "+1 (555) 111-1111", contributions: "150000", shares: "600" },
      { memberId: "M003", firstName: "Jane", lastName: "Smith", email: "jane.smith@terracotta.com", phone: "+1 (555) 222-2222", contributions: "200000", shares: "800" },
      { memberId: "M004", firstName: "Bob", lastName: "Wilson", email: "bob.wilson@terracotta.com", phone: "+1 (555) 333-3333", contributions: "180000", shares: "720" },
      { memberId: "M005", firstName: "Alice", lastName: "Brown", email: "alice.brown@terracotta.com", phone: "+1 (555) 444-4444", contributions: "220000", shares: "880" },
    ];

    for (let i = 0; i < 5; i++) {
      const member = await storage.createMember({
        userId: users[i].id,
        memberId: memberData[i].memberId,
        firstName: memberData[i].firstName,
        lastName: memberData[i].lastName,
        email: memberData[i].email,
        phone: memberData[i].phone,
        contributions: memberData[i].contributions,
        shares: memberData[i].shares,
      });
      members.push(member);
      console.log(`✓ Created member: ${memberData[i].firstName} ${memberData[i].lastName}`);
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

    // Create 5 payment methods
    const paymentMethodNames = ["Bank Transfer", "Credit Card", "Check", "Cash", "PayPal"];
    const paymentMethods = [];
    for (const name of paymentMethodNames) {
      const pm = await storage.createPaymentMethod({
        name,
        createdBy: admin.id,
      });
      paymentMethods.push(pm);
      console.log(`✓ Created payment method: ${name}`);
    }

    // Create 5 income categories
    const incomeCategoryNames = ["Rent", "Dividends", "Interest", "Capital Gains", "Other Income"];
    const incomeCategories = [];
    for (const name of incomeCategoryNames) {
      const cat = await storage.createIncomeCategory({
        name,
        createdBy: admin.id,
      });
      incomeCategories.push(cat);
      console.log(`✓ Created income category: ${name}`);
    }

    // Create 5 expense categories
    const expenseCategoryNames = ["Maintenance", "Professional Services", "Taxes", "Insurance", "Utilities"];
    const expenseCategories = [];
    for (const name of expenseCategoryNames) {
      const cat = await storage.createExpenseCategory({
        name,
        createdBy: admin.id,
      });
      expenseCategories.push(cat);
      console.log(`✓ Created expense category: ${name}`);
    }

    // Create 5 monthly profit goals
    const currentYear = 2024;
    for (let i = 1; i <= 5; i++) {
      await storage.createMonthlyProfitGoal({
        month: i,
        year: currentYear,
        goalAmount: (50000 + i * 5000).toString(),
        currency: "USD",
        createdBy: admin.id,
      });
      console.log(`✓ Created monthly profit goal: Month ${i}/${currentYear}`);
    }

    // Create 5 income entries
    const incomeEntryDates = [
      new Date(2024, 0, 15), // Jan 15
      new Date(2024, 1, 20), // Feb 20
      new Date(2024, 2, 10), // Mar 10
      new Date(2024, 3, 5),  // Apr 5
      new Date(2024, 4, 25), // May 25
    ];

    for (let i = 0; i < 5; i++) {
      const totalAmount = 5000 + i * 1000;
      const taxPercentage = 10;
      const taxAmount = (totalAmount * taxPercentage) / 100;
      const netAmount = totalAmount - taxAmount;

      await storage.createIncomeEntry({
        date: incomeEntryDates[i],
        memberId: members[i % members.length].id,
        categoryId: incomeCategories[i % incomeCategories.length].id,
        paymentMethodId: paymentMethods[i % paymentMethods.length].id,
        totalAmount: totalAmount.toString(),
        taxPercentage: taxPercentage.toString(),
        taxAmount: taxAmount.toString(),
        netAmount: netAmount.toString(),
        description: `Income entry ${i + 1} - ${incomeCategoryNames[i % incomeCategoryNames.length]}`,
        createdBy: admin.id,
        updatedBy: admin.id,
      });
      console.log(`✓ Created income entry ${i + 1}`);
    }

    // Create 5 expense entries
    const expenseEntryDates = [
      new Date(2024, 0, 10), // Jan 10
      new Date(2024, 1, 15), // Feb 15
      new Date(2024, 2, 5),  // Mar 5
      new Date(2024, 3, 20), // Apr 20
      new Date(2024, 4, 10), // May 10
    ];

    for (let i = 0; i < 5; i++) {
      const totalAmount = 2000 + i * 500;
      const taxPercentage = 8;
      const taxAmount = (totalAmount * taxPercentage) / 100;
      const netAmount = totalAmount - taxAmount;

      await storage.createExpenseEntry({
        date: expenseEntryDates[i],
        memberId: members[i % members.length].id,
        categoryId: expenseCategories[i % expenseCategories.length].id,
        paymentMethodId: paymentMethods[i % paymentMethods.length].id,
        totalAmount: totalAmount.toString(),
        taxPercentage: taxPercentage.toString(),
        taxAmount: taxAmount.toString(),
        netAmount: netAmount.toString(),
        description: `Expense entry ${i + 1} - ${expenseCategoryNames[i % expenseCategoryNames.length]}`,
        createdBy: admin.id,
        updatedBy: admin.id,
      });
      console.log(`✓ Created expense entry ${i + 1}`);
    }

    // Create 5 share transactions
    const shareTransactionDates = [
      new Date(2024, 0, 5),  // Jan 5
      new Date(2024, 1, 10), // Feb 10
      new Date(2024, 2, 15), // Mar 15
      new Date(2024, 3, 1),  // Apr 1
      new Date(2024, 4, 15), // May 15
    ];

    for (let i = 0; i < 5; i++) {
      await storage.createShareTransaction({
        date: shareTransactionDates[i],
        memberId: members[i % members.length].id,
        contributions: (10000 + i * 2000).toString(),
        shares: (50 + i * 10).toString(),
        createdBy: admin.id,
        updatedBy: admin.id,
      });
      console.log(`✓ Created share transaction ${i + 1}`);
    }

    // Create 5 member shares snapshots
    const snapshotDates = [
      new Date(2024, 0, 31), // Jan 31
      new Date(2024, 1, 29), // Feb 29
      new Date(2024, 2, 31), // Mar 31
      new Date(2024, 3, 30), // Apr 30
      new Date(2024, 4, 31), // May 31
    ];

    // Calculate total shares for snapshots
    const totalShares = members.reduce((sum, m) => sum + parseFloat(m.shares.toString()), 0);

    for (let i = 0; i < 5; i++) {
      const member = members[i];
      const memberShares = parseFloat(member.shares.toString());
      const sharePercentage = totalShares > 0 ? (memberShares / totalShares) * 100 : 0;

      await storage.createSharesSnapshot({
        memberId: member.id,
        snapshotDate: snapshotDates[i],
        shares: memberShares.toString(),
        totalShares: totalShares.toString(),
        sharePercentage: sharePercentage.toFixed(2).toString(),
      });
      console.log(`✓ Created member shares snapshot ${i + 1}`);
    }

    // Create 5 audit events
    const auditActions = ["Create", "Update", "Delete", "View", "Login"];
    const auditEntities = ["User", "Member", "IncomeEntry", "ExpenseEntry", "ShareTransaction"];

    for (let i = 0; i < 5; i++) {
      await storage.createAuditEvent({
        userId: users[i % users.length].id,
        action: auditActions[i % auditActions.length],
        entity: auditEntities[i % auditEntities.length],
        entityId: members[i % members.length].id,
        oldValue: i % 2 === 0 ? `Old value ${i + 1}` : null,
        newValue: `New value ${i + 1}`,
        details: `Audit event ${i + 1} - ${auditActions[i % auditActions.length]} ${auditEntities[i % auditEntities.length]}`,
      });
      console.log(`✓ Created audit event ${i + 1}`);
    }

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\nLogin credentials:");
    console.log("Admin - username: admin, password: admin123");
    console.log("Members - username: [username], password: password123");
    console.log("\nSummary:");
    console.log(`- ${users.length} users created`);
    console.log(`- ${members.length} members created`);
    console.log(`- ${paymentMethods.length} payment methods created`);
    console.log(`- ${incomeCategories.length} income categories created`);
    console.log(`- ${expenseCategories.length} expense categories created`);
    console.log("- 5 monthly profit goals created");
    console.log("- 5 income entries created");
    console.log("- 5 expense entries created");
    console.log("- 5 share transactions created");
    console.log("- 5 member shares snapshots created");
    console.log("- 5 audit events created");
    console.log("- 1 system settings record created");
  } catch (error) {
    console.error("\n❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function
seedDummyData()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nFailed to seed database:", error);
    process.exit(1);
  });

