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
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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
      // Add missing columns to tutors if they don't exist
      await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS maxHoursPerWeek INTEGER DEFAULT 20;`);
      await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS unavailableDays JSONB DEFAULT '[]';`);
      await client.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS notes TEXT;`);

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
      await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS needs JSONB DEFAULT '[]';`);
      await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS requiredHoursPerWeek INTEGER DEFAULT 4;`);
      await client.query(`ALTER TABLE youths ADD COLUMN IF NOT EXISTS notes TEXT;`);
      // We ignore 'age' column if it exists from previous schema

      // Shifts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS shifts (
          id TEXT PRIMARY KEY,
          tutorId TEXT NOT NULL,
          youthId TEXT NOT NULL,
          date TEXT NOT NULL,
          startTime TEXT NOT NULL,
          endTime TEXT NOT NULL,
          activity TEXT,
          FOREIGN KEY (tutorId) REFERENCES tutors(id),
          FOREIGN KEY (youthId) REFERENCES youths(id)
        );
      `);

      // Migrate shifts columns if they exist with old names
      try {
        await client.query(`ALTER TABLE shifts RENAME COLUMN day TO date;`);
      } catch (e) { /* ignore if already renamed or doesn't exist */ }
      try {
        await client.query(`ALTER TABLE shifts RENAME COLUMN start TO startTime;`);
      } catch (e) { /* ignore */ }
      try {
        await client.query(`ALTER TABLE shifts RENAME COLUMN "end" TO endTime;`);
      } catch (e) { /* ignore */ }

      await client.query(`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS activity TEXT;`);

      await client.query('COMMIT');
      console.log('Database schema initialized and migrated');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Run initialization
initDB();

export default pool;
