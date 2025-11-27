import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL
  }
});

// Initialize tables
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tutors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        specialties JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS youths (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        tutorId TEXT NOT NULL,
        youthId TEXT NOT NULL,
        day TEXT NOT NULL,
        start TEXT NOT NULL,
        "end" TEXT NOT NULL,
        FOREIGN KEY (tutorId) REFERENCES tutors(id),
        FOREIGN KEY (youthId) REFERENCES youths(id)
      );
    `);
    console.log('Database connected and tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Run initialization
initDB();

export default pool;
