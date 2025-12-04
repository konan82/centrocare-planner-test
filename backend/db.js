import pkg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pkg;

// PostgreSQL connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL environment variable is missing!");
  process.exit(1);
}

console.log(`🔌 Connecting to database: ${connectionString.split('@')[1] || 'unknown host'}...`);

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL
  }
});

// Initialize tables
const initDB = async () => {
  const client = await pool.connect();
  try {
    console.log("Starting database initialization...");

    // Tutors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tutors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        specialties JSONB NOT NULL,
        "maxHoursPerWeek" INTEGER DEFAULT 20,
        "unavailableDays" JSONB DEFAULT '[]',
        notes TEXT
      );
    `);
    // Migrate existing columns to quoted names
    try { await client.query(`ALTER TABLE tutors RENAME COLUMN maxhoursperweek TO "maxHoursPerWeek";`); } catch (e) { console.log("Migrate tutors case:", e.message); }
    try { await client.query(`ALTER TABLE tutors RENAME COLUMN unavailabledays TO "unavailableDays";`); } catch (e) { console.log("Migrate tutors case:", e.message); }
    // Add missing columns if they don't exist
    try { await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS "maxHoursPerWeek" INTEGER DEFAULT 20;`); } catch (e) { console.log("Add maxHoursPerWeek failed:", e.message); }
    try { await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS "unavailableDays" JSONB DEFAULT '[]';`); } catch (e) { console.log("Add unavailableDays failed:", e.message); }
    try { await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS notes TEXT;`); } catch (e) { console.log("Add notes failed:", e.message); }

    // Youths table
    await client.query(`
      CREATE TABLE IF NOT EXISTS youths (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        needs JSONB DEFAULT '[]',
        "requiredHoursPerWeek" INTEGER DEFAULT 4,
        notes TEXT
      );
    `);
    // Migrate existing column to quoted name
    try { await client.query(`ALTER TABLE youths RENAME COLUMN requiredhoursperweek TO "requiredHoursPerWeek";`); } catch (e) { console.log("Migrate youths case:", e.message); }
    // Add missing columns if they don't exist
    try { await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS needs JSONB DEFAULT '[]';`); } catch (e) { console.log("Add needs failed:", e.message); }
    try { await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS "requiredHoursPerWeek" INTEGER DEFAULT 4;`); } catch (e) { console.log("Add requiredHoursPerWeek failed:", e.message); }
    try { await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS notes TEXT;`); } catch (e) { console.log("Add notes failed:", e.message); }

    // Remove legacy 'age' column
    try {
      await client.query(`ALTER TABLE youths DROP COLUMN IF EXISTS age;`);
      console.log("Dropped age column");
    } catch (e) {
      console.log("Could not drop age column:", e.message);
      try {
        await client.query(`ALTER TABLE youths ALTER COLUMN age DROP NOT NULL;`);
        console.log("Made age column nullable");
      } catch (e2) {
        console.error("Failed to make age nullable:", e2.message);
      }
    }

    // Shifts table with quoted column names for case sensitivity
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        "tutorId" TEXT NOT NULL,
        "youthId" TEXT NOT NULL,
        date TEXT NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        activity TEXT,
        FOREIGN KEY ("tutorId") REFERENCES tutors(id),
        FOREIGN KEY ("youthId") REFERENCES youths(id)
      );
    `);

    // Migrate shifts columns - rename lowercase to camelCase
    try { await client.query(`ALTER TABLE shifts RENAME COLUMN day TO date;`); } catch (e) { /* ignore */ }
    try { await client.query(`ALTER TABLE shifts RENAME COLUMN start TO "startTime";`); } catch (e) { /* ignore */ }
    try { await client.query(`ALTER TABLE shifts RENAME COLUMN "end" TO "endTime";`); } catch (e) { /* ignore */ }
    try { await client.query(`ALTER TABLE shifts RENAME COLUMN tutorid TO "tutorId";`); } catch (e) { /* ignore */ }
    try { await client.query(`ALTER TABLE shifts RENAME COLUMN youthid TO "youthId";`); } catch (e) { /* ignore */ }
    try { await client.query(`ALTER TABLE shifts RENAME COLUMN starttime TO "startTime";`); } catch (e) { /* ignore */ }
    try { await client.query(`ALTER TABLE shifts RENAME COLUMN endtime TO "endTime";`); } catch (e) { /* ignore */ }
    try { await client.query(`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS activity TEXT;`); } catch (e) { console.log("Migrate shifts failed:", e.message); }

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        permissions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Admin User if not exists
    const adminCheck = await client.query("SELECT * FROM users WHERE username = 'Admin'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('abcde', 10);
      await client.query(
        "INSERT INTO users (username, password_hash, permissions) VALUES ($1, $2, $3)",
        ['Admin', hashedPassword, JSON.stringify(['ALL'])]
      );
      console.log("Created default Admin user");
    }

    console.log('Database schema initialized and migrated');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    client.release();
  }
};

// Run initialization
initDB();

export default pool;
