import { db } from "./db";
import { sql } from "drizzle-orm";

async function checkEnum() {
    try {
        const result = await db.execute(sql`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname = 'role';
    `);
        console.log("Current enum labels for 'role':", result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkEnum();
