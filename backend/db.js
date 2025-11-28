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
    export default pool;
