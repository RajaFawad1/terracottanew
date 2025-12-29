import { pool } from "./db";

async function emptyAllTables() {
  console.log("Starting to empty all tables...");
  console.log("⚠️  WARNING: This will delete ALL data from ALL tables!\n");

  try {
    // Get a direct connection for raw SQL
    const client = await pool.connect();

    try {
      // List of all tables in the database
      // Using TRUNCATE CASCADE to handle foreign key constraints automatically
      const tables = [
        "audit_events",
        "share_transactions",
        "member_shares_snapshots",
        "income_entries",
        "expense_entries",
        "monthly_profit_goals",
        "income_categories",
        "expense_categories",
        "payment_methods",
        "monthly_valuations",
        "members",
        "system_settings",
        "users",
        "sessions",
      ];

      // Disable foreign key checks temporarily (PostgreSQL)
      await client.query("SET session_replication_role = 'replica';");

      for (const table of tables) {
        try {
          await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
          console.log(`✓ Emptied table: ${table}`);
        } catch (error: any) {
          // If table doesn't exist, skip it
          if (error.code === "42P01") {
            console.log(`⚠ Table ${table} does not exist, skipping...`);
          } else {
            console.error(`✗ Error emptying table ${table}:`, error.message);
            throw error;
          }
        }
      }

      // Re-enable foreign key checks
      await client.query("SET session_replication_role = 'origin';");

      console.log("\n✅ All tables emptied successfully!");
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("\n❌ Error emptying tables:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the function
emptyAllTables()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nFailed to empty tables:", error);
    process.exit(1);
  });

