-- Supabase SQL Database Migration Schema
-- Use this file to manually run migration queries in your Supabase SQL Editor if needed.
-- Note: The application will also automatically attempt to initialize this schema upon the first database query.

-- 1. Create users table
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

-- Seed default users
INSERT INTO users (username, password, role, approved, can_view, can_edit, can_delete)
VALUES ('admin', 'admin@123', 'admin', true, true, true, true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, role, approved, can_view, can_edit, can_delete)
VALUES ('user', '1234', 'user', true, true, false, false)
ON CONFLICT (username) DO NOTHING;

-- 2. Create topics (curriculum topics) table
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(255) DEFAULT 'General',
  difficulty VARCHAR(50) DEFAULT 'Beginner',
  estimated_time VARCHAR(100) DEFAULT '1 hour',
  created_date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false
);

-- 3. Create questions table
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

-- Safe alter statement in case table already exists
ALTER TABLE questions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 4. Create code examples table
CREATE TABLE IF NOT EXISTS code_examples (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT '',
  language VARCHAR(100) DEFAULT 'Java',
  code TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- 5. Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL
);

-- 6. Create user tasks table for student workspace tracking
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

-- 7. Create shared codes table
CREATE TABLE IF NOT EXISTS shared_codes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
