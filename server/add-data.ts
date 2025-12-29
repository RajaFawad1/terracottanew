import { storage } from "./storage";
import bcrypt from "bcrypt";

async function addData() {
  console.log("Adding members, income entries, and expense entries...");

  try {
    // Get or create admin user
    let admin = await storage.getUserByUsername("admin");
    if (!admin) {
      const adminPassword = await bcrypt.hash("admin123", 10);
      admin = await storage.createUser({
        username: "admin",
        password: adminPassword,
        role: "admin",
        status: "active",
      });
      console.log("✓ Created admin user");
    }

    // Get all existing payment methods
    const existingPaymentMethods = await storage.getPaymentMethods();
    const paymentMethodMap = new Map<string, string>();
    
    for (const pm of existingPaymentMethods) {
      paymentMethodMap.set(pm.name.toLowerCase(), pm.id);
    }

    // Create Zelle payment method if it doesn't exist
    if (!paymentMethodMap.has("zelle")) {
      const zelle = await storage.createPaymentMethod({
        name: "Zelle",
        createdBy: admin.id,
      });
      paymentMethodMap.set("zelle", zelle.id);
      console.log("✓ Created Zelle payment method");
    }

    // Create Bank Account payment method if it doesn't exist
    if (!paymentMethodMap.has("bank account")) {
      const bankAccount = await storage.createPaymentMethod({
        name: "Bank Account",
        createdBy: admin.id,
      });
      paymentMethodMap.set("bank account", bankAccount.id);
      console.log("✓ Created Bank Account payment method");
    }

    // Get all existing expense categories
    const existingExpenseCategories = await storage.getExpenseCategories();
    const expenseCategoryMap = new Map<string, string>();
    
    for (const cat of existingExpenseCategories) {
      expenseCategoryMap.set(cat.name.toLowerCase(), cat.id);
    }

    // Create expense categories if they don't exist
    const expenseCategoriesToCreate = ["Registration", "Monthly Fees", "Fee", "Bank Fee", "Christmas Gift", "Christmas Party"];
    for (const catName of expenseCategoriesToCreate) {
      const key = catName.toLowerCase();
      if (!expenseCategoryMap.has(key)) {
        const category = await storage.createExpenseCategory({
          name: catName,
          createdBy: admin.id,
        });
        expenseCategoryMap.set(key, category.id);
        console.log(`✓ Created expense category: ${catName}`);
      }
    }

    // Get all existing members to check for duplicates
    const existingMembers = await storage.getAllMembers();
    const memberMap = new Map<string, any>();
    for (const m of existingMembers) {
      const key = `${m.firstName.toLowerCase()}_${m.lastName.toLowerCase()}`;
      memberMap.set(key, m);
    }

    // Members to add
    const membersData = [
      { firstName: "Oladapo", lastName: "Ajala", contributions: 400, shares: 10000 },
      { firstName: "Temitope", lastName: "Ajibola", contributions: 400, shares: 10000 },
      { firstName: "Abiodun", lastName: "Akindele", contributions: 400, shares: 10000 },
      { firstName: "Olurotimi", lastName: "Dosumu", contributions: 400, shares: 10000 },
      { firstName: "Oluwafemi", lastName: "Durojaiye", contributions: 400, shares: 10000 },
      { firstName: "Olatunji", lastName: "Ilori", contributions: 400, shares: 10000 },
      { firstName: "Oluremi", lastName: "Makinde", contributions: 400, shares: 10000 },
      { firstName: "Jamiu", lastName: "Momodu", contributions: 400, shares: 10000 },
      { firstName: "Opeyemi", lastName: "Olomola", contributions: 400, shares: 10000 },
      { firstName: "Temitope", lastName: "Olutola", contributions: 400, shares: 10000 },
      { firstName: "Olumuyiwa", lastName: "Shoneye", contributions: 400, shares: 10000 },
      { firstName: "Dimeji", lastName: "Sule", contributions: 400, shares: 10000 },
    ];

    const memberIdMap = new Map<string, string>(); // Map firstName_lastName to memberId

    for (const memberData of membersData) {
      const key = `${memberData.firstName.toLowerCase()}_${memberData.lastName.toLowerCase()}`;
      
      if (!memberMap.has(key)) {
        // Create user for member
        const username = `${memberData.firstName.toLowerCase()}.${memberData.lastName.toLowerCase()}`;
        let user = await storage.getUserByUsername(username);
        
        if (!user) {
          const password = await bcrypt.hash("password123", 10);
          user = await storage.createUser({
            username: username,
            password: password,
            role: "member",
            status: "active",
          });
        }

        // Generate member ID
        const allMembers = await storage.getAllMembers();
        const maxId = allMembers.reduce((max, m) => {
          const num = parseInt(m.memberId.replace(/[^0-9]/g, "")) || 0;
          return Math.max(max, num);
        }, 0);
        const memberId = `M${String(maxId + 1).padStart(3, "0")}`;

        // Create member
        const member = await storage.createMember({
          userId: user.id,
          memberId: memberId,
          firstName: memberData.firstName,
          lastName: memberData.lastName,
          email: `${username}@terracotta.com`,
          phone: "",
          contributions: memberData.contributions.toString(),
          shares: memberData.shares.toString(),
        });
        
        memberIdMap.set(key, member.id);
        console.log(`✓ Created member: ${memberData.firstName} ${memberData.lastName}`);
      } else {
        // Member exists, get their ID
        const existingMember = memberMap.get(key);
        memberIdMap.set(key, existingMember.id);
        console.log(`✓ Member already exists: ${memberData.firstName} ${memberData.lastName}`);
      }
    }

    // Income entries to add
    const incomeEntries = [
      { date: "2023-04-25", firstName: "Oladapo", lastName: "Ajala", totalAmount: 400.00, paymentMethod: "Zelle" },
      { date: "2023-04-17", firstName: "Temitope", lastName: "Ajibola", totalAmount: 200.00, paymentMethod: "Zelle" },
      { date: "2023-03-26", firstName: "Abiodun", lastName: "Akindele", totalAmount: 200.00, paymentMethod: "Zelle" },
      { date: "2023-03-20", firstName: "Olurotimi", lastName: "Dosumu", totalAmount: 200.00, paymentMethod: "Zelle" },
      { date: "2023-03-08", firstName: "Oluwafemi", lastName: "Durojaiye", totalAmount: 200.00, paymentMethod: "Zelle" },
    ];

    // Get a default income category (or create one)
    const incomeCategories = await storage.getIncomeCategories();
    let defaultIncomeCategoryId = incomeCategories[0]?.id;
    if (!defaultIncomeCategoryId) {
      const category = await storage.createIncomeCategory({
        name: "Contribution",
        createdBy: admin.id,
      });
      defaultIncomeCategoryId = category.id;
    }

    for (const entry of incomeEntries) {
      const key = `${entry.firstName.toLowerCase()}_${entry.lastName.toLowerCase()}`;
      const memberId = memberIdMap.get(key);
      
      if (memberId) {
        const taxPercentage = 0;
        const taxAmount = 0;
        const netAmount = entry.totalAmount;
        const paymentMethodId = paymentMethodMap.get(entry.paymentMethod.toLowerCase());

        if (paymentMethodId) {
          await storage.createIncomeEntry({
            date: new Date(entry.date),
            memberId: memberId,
            totalAmount: entry.totalAmount.toString(),
            taxPercentage: taxPercentage.toString(),
            taxAmount: taxAmount.toString(),
            netAmount: netAmount.toString(),
            categoryId: defaultIncomeCategoryId,
            paymentMethodId: paymentMethodId,
            description: null,
            createdBy: admin.id,
          });
          console.log(`✓ Created income entry: ${entry.date} - ${entry.firstName} ${entry.lastName} - $${entry.totalAmount}`);
        }
      }
    }

    // Expense entries to add
    const expenseEntries = [
      { date: "2023-05-31", category: "Registration", description: "Legal Zoom", totalAmount: 842.10, taxAmount: 76.55, netAmount: 765.55, paymentMethod: "Bank Account" },
      { date: "2023-07-03", category: "Monthly Fees", description: "Google GSuite", totalAmount: 12.96, taxAmount: 1.18, netAmount: 11.78, paymentMethod: "Bank Account" },
      { date: "2023-08-02", category: "Monthly Fees", description: "Google GSuite", totalAmount: 14.40, taxAmount: 1.31, netAmount: 13.09, paymentMethod: "Bank Account" },
      { date: "2023-09-05", category: "Monthly Fees", description: "Google GSuite", totalAmount: 20.00, taxAmount: 1.82, netAmount: 18.18, paymentMethod: "Bank Account" },
      { date: "2023-10-02", category: "Monthly Fees", description: "Google GSuite", totalAmount: 28.80, taxAmount: 2.62, netAmount: 26.18, paymentMethod: "Bank Account" },
      { date: "2023-11-02", category: "Monthly Fees", description: "Google GSuite", totalAmount: 28.80, taxAmount: 2.62, netAmount: 26.18, paymentMethod: "Bank Account" },
      { date: "2023-11-30", category: "Fee", description: "", totalAmount: 1.00, taxAmount: 0.09, netAmount: 0.91, paymentMethod: "Bank Account" },
      { date: "2023-12-01", category: "Monthly Fees", description: "Google GSuite", totalAmount: 28.80, taxAmount: 2.62, netAmount: 26.18, paymentMethod: "Bank Account" },
      { date: "2023-12-01", category: "Bank Fee", description: "", totalAmount: 1.00, taxAmount: 0.09, netAmount: 0.91, paymentMethod: "Bank Account" },
      { date: "2023-12-12", category: "Christmas Gift", description: "", totalAmount: 502.69, taxAmount: 45.70, netAmount: 456.99, paymentMethod: "Bank Account" },
      { date: "2023-12-18", category: "Christmas Party", description: "", totalAmount: 2150.00, taxAmount: 195.45, netAmount: 1954.55, paymentMethod: "Bank Account" },
      { date: "2024-01-02", category: "Monthly Fees", description: "Google GSuite", totalAmount: 28.80, taxAmount: 2.62, netAmount: 26.18, paymentMethod: "Bank Account" },
    ];

    // Get admin member for expense entries (expenses are associated with the member who created them)
    const adminMember = await storage.getMemberByUserId(admin.id);
    if (!adminMember) {
      throw new Error("Admin member not found");
    }

    for (const entry of expenseEntries) {
      const categoryId = expenseCategoryMap.get(entry.category.toLowerCase());
      const paymentMethodId = paymentMethodMap.get(entry.paymentMethod.toLowerCase());

      if (categoryId && paymentMethodId) {
        const taxPercentage = entry.totalAmount > 0 ? ((entry.taxAmount / entry.totalAmount) * 100).toFixed(2) : "0";

        await storage.createExpenseEntry({
          date: new Date(entry.date),
          memberId: adminMember.id,
          totalAmount: entry.totalAmount.toString(),
          taxPercentage: taxPercentage,
          taxAmount: entry.taxAmount.toString(),
          netAmount: entry.netAmount.toString(),
          categoryId: categoryId,
          paymentMethodId: paymentMethodId,
          description: entry.description || null,
          createdBy: admin.id,
        });
        console.log(`✓ Created expense entry: ${entry.date} - ${entry.category} - $${entry.totalAmount}`);
      }
    }

    console.log("\n✅ All data added successfully!");
  } catch (error) {
    console.error("Error adding data:", error);
    process.exit(1);
  }
}

addData();

