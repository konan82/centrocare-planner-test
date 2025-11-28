import pkg from 'pg';
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
        maxHoursPerWeek INTEGER DEFAULT 20,
        unavailableDays JSONB DEFAULT '[]',
        notes TEXT
      );
    `);
    // Add missing columns to tutors (run independently)
    try { await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS maxHoursPerWeek INTEGER DEFAULT 20;`); } catch (e) { console.log("Migrate tutors failed:", e.message); }
    try { await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS unavailableDays JSONB DEFAULT '[]';`); } catch (e) { console.log("Migrate tutors failed:", e.message); }
    try { await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS notes TEXT;`); } catch (e) { console.log("Migrate tutors failed:", e.message); }

    // Youths table
    await client.query(`
      CREATE TABLE IF NOT EXISTS youths (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        needs JSONB DEFAULT '[]',
        requiredHoursPerWeek INTEGER DEFAULT 4,
        notes TEXT
      );
    `);
    // Add missing columns to youths
    try { await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS needs JSONB DEFAULT '[]';`); } catch (e) { console.log("Migrate youths failed:", e.message); }
    try { await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS requiredHoursPerWeek INTEGER DEFAULT 4;`); } catch (e) { console.log("Migrate youths failed:", e.message); }
    try { await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS notes TEXT;`); } catch (e) { console.log("Migrate youths failed:", e.message); }

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
      client.release();
    }
  };

  // Run initialization
  initDB();

  export default pool;
