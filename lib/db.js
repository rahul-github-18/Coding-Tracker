import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Parse .env manually if process.env isn't fully loaded
let dbConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let dbUser = 'rahulranjan';
let dbHost = 'localhost';
let dbName = 'coding_tracker';
let dbPort = 5432;
let dbPassword = '';

try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] ? match[2].trim() : '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        if (key === 'DATABASE_URL') dbConnectionString = val;
        if (key === 'POSTGRES_URL') dbConnectionString = val;
        if (key === 'DB_USER') dbUser = val;
        if (key === 'DB_HOST') dbHost = val;
        if (key === 'DB_NAME') dbName = val;
        if (key === 'DB_PASSWORD') dbPassword = val;
        if (key === 'DB_PORT') dbPort = parseInt(val, 10);
      }
    });
  }
} catch (err) {
  console.warn('Could not read .env file:', err.message);
}

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = dbConnectionString
  ? {
      connectionString: dbConnectionString,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    }
  : {
      user: dbUser,
      host: dbHost,
      database: dbName,
      password: dbPassword,
      port: dbPort,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(poolConfig);

let dbInitialized = false;

export async function query(text, params) {
  if (!dbInitialized) {
    try {
      await initDb();
    } catch (err) {
      console.error(
        '\n========================================================================\n' +
        '🔴 DATABASE CONNECTION ERROR:\n' +
        'Could not connect to the PostgreSQL database. Since you are using Supabase, you must:\n' +
        '1. Go to your Supabase Dashboard -> Settings -> Database -> Connection string -> URI\n' +
        '2. Copy the Connection URI (preferably using the pooled port 6543 with PgBouncer:\n' +
        '   postgresql://postgres:[YOUR-PASSWORD]@db.uauqjbndoamjsktkuihd.supabase.co:6543/postgres?pgbouncer=true)\n' +
        '3. Add it as the DATABASE_URL environment variable in your Vercel or host dashboard.\n' +
        '========================================================================\n'
      );
      throw err;
    }
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[Database Query] Execution time: ${duration}ms | Query: ${text.substring(0, 80)}...`);
    return res;
  } catch (error) {
    console.error('[Database Query Error]', error);
    throw error;
  }
}

async function initDb() {
  if (dbInitialized) return;
  dbInitialized = true;

  console.log('Initializing PostgreSQL database schema...');

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      approved BOOLEAN DEFAULT false,
      can_view BOOLEAN DEFAULT true,
      can_edit BOOLEAN DEFAULT false,
      can_delete BOOLEAN DEFAULT false,
      streak INTEGER DEFAULT 0,
      last_activity_date DATE DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(255) DEFAULT 'General',
      difficulty VARCHAR(50) DEFAULT 'Beginner',
      estimated_time VARCHAR(100) DEFAULT '1 hour',
      created_date DATE DEFAULT CURRENT_DATE,
      completed BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      difficulty VARCHAR(50) DEFAULT 'Beginner',
      tags VARCHAR(255) DEFAULT '',
      answer TEXT DEFAULT '',
      code TEXT DEFAULT '',
      explanation TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    );

    ALTER TABLE questions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

    CREATE TABLE IF NOT EXISTS code_examples (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
      title VARCHAR(255) DEFAULT '',
      language VARCHAR(100) DEFAULT 'Java',
      code TEXT NOT NULL,
      explanation TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_type VARCHAR(50) NOT NULL, -- 'topic', 'question', 'code_example', 'note'
      item_id INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed'
      saved_for_later BOOLEAN DEFAULT false,
      completed_at TIMESTAMP DEFAULT NULL,
      added_date DATE DEFAULT CURRENT_DATE,
      CONSTRAINT unique_user_item UNIQUE (user_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS shared_codes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      code TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    // Run schema setup
    await pool.query(schemaSql);
    console.log('Database tables verified/created successfully.');

    // Seed default users
    // Admin
    const adminCheck = await pool.query("SELECT id FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (username, password, role, approved, can_view, can_edit, can_delete) VALUES ('admin', 'admin@123', 'admin', true, true, true, true)"
      );
      console.log('Admin user seeded (admin / admin@123).');
    }

    // Default Learner
    const userCheck = await pool.query("SELECT id FROM users WHERE username = 'user'");
    if (userCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (username, password, role, approved, can_view, can_edit, can_delete) VALUES ('user', '1234', 'user', true, true, false, false)"
      );
      console.log('Learner user seeded (user / 1234).');
    }

    // Seed some initial topics if empty
    const topicCheck = await pool.query("SELECT id FROM topics LIMIT 1");
    if (topicCheck.rows.length === 0) {
      const topicResult = await pool.query(
        "INSERT INTO topics (title, category, difficulty, estimated_time) VALUES ('JavaScript Arrays', 'JavaScript', 'Beginner', '30 mins') RETURNING id"
      );
      const topicId = topicResult.rows[0].id;

      await pool.query(
        `INSERT INTO questions (topic_id, title, description, difficulty, tags, answer, code, explanation) VALUES 
         ($1, 'Reverse an Array', 'Write a function to reverse an array in-place.', 'Beginner', 'arrays,javascript', 'Use two pointers moving inwards.', 
          'function reverseArray(arr) {\n  let left = 0, right = arr.length - 1;\n  while (left < right) {\n    let temp = arr[left];\n    arr[left] = arr[right];\n    arr[right] = temp;\n    left++; right--;\n  }\n  return arr;\n}', 
          'Swapping elements from both ends using left and right pointers reduces the space complexity to O(1).')`,
        [topicId]
      );

      await pool.query(
        `INSERT INTO code_examples (topic_id, title, language, code, explanation, notes) VALUES 
         ($1, 'Array map() Example', 'JavaScript', 'const numbers = [1, 2, 3];\nconst doubled = numbers.map(n => n * 2);\nconsole.log(doubled); // [2, 4, 6]', 
          'Using map to create a new array with elements transformed by the callback.', 'Map does not mutate the original array.')`,
        [topicId]
      );

      await pool.query(
        `INSERT INTO notes (topic_id, title, content) VALUES 
         ($1, 'Introduction to Array Methods', 'JavaScript arrays have powerful built-in methods such as map(), filter(), reduce(), and splice(). These functional methods help clean up loops and make code more readable.')`,
        [topicId]
      );
      
      console.log('Initial sample topic and items seeded.');
    }

  } catch (err) {
    console.error('Error seeding/initializing database:', err);
  }
}

export default pool;
