import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Render's persistent disk if available, otherwise local directory
const dbPath = path.join(process.env.RENDER_VOLUME || __dirname, 'db.sqlite');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tutors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialties TEXT NOT NULL
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

console.log('Database initialized at:', dbPath);

export default db;
