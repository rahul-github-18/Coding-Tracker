-- Supabase SQL Database Migration Schema
-- Use this file to manually run migration queries in your Supabase SQL Editor.

-- NOTE: If your Supabase tables are rejecting updates/deletions silently,
-- run these statements in your Supabase SQL Editor to disable Row Level Security (RLS):
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE todos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE code_examples DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_codes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_queries DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_submissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE login_history DISABLE ROW LEVEL SECURITY;

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
VALUES ('rahul', 'admin@123', 'admin', true, true, true, true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, role, approved, can_view, can_edit, can_delete)
VALUES ('user', '1234', 'user', true, true, false, false)
ON CONFLICT (username) DO NOTHING;

-- 2. Ensure todos (curriculum topics) table exists and has necessary columns
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(255) DEFAULT 'General',
  difficulty VARCHAR(50) DEFAULT 'Beginner',
  estimated_time VARCHAR(100) DEFAULT '1 hour',
  created_date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false
);

ALTER TABLE todos ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'General';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Beginner';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(100) DEFAULT '1 hour';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS created_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- 3. Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  todo_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  difficulty VARCHAR(50) DEFAULT 'Beginner',
  tags VARCHAR(255) DEFAULT '',
  answer TEXT DEFAULT '',
  code TEXT DEFAULT '',
  explanation TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- Ensure correct columns exist on questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Beginner';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags VARCHAR(255) DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 4. Create code examples table
CREATE TABLE IF NOT EXISTS code_examples (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT '',
  language VARCHAR(100) DEFAULT 'Java',
  code TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- 5. Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
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

-- 8. Create Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_questions_todo_id ON questions(todo_id);
CREATE INDEX IF NOT EXISTS idx_code_examples_topic_id ON code_examples(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_added_date ON user_tasks(added_date);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_status ON user_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_item ON user_tasks(user_id, item_type, item_id);

-- 9. Create user queries table with ticketing support
CREATE TABLE IF NOT EXISTS user_queries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  reply_text TEXT DEFAULT NULL,
  is_read_by_user BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  replied_at TIMESTAMP DEFAULT NULL
);

-- 10. Create user submissions table
CREATE TABLE IF NOT EXISTS user_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
  question_title VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  admin_reply TEXT DEFAULT NULL,
  is_read_by_user BOOLEAN DEFAULT true,
  replied_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration: add reply columns if table already exists (run in Supabase SQL editor)
-- ALTER TABLE user_submissions ADD COLUMN IF NOT EXISTS admin_reply TEXT DEFAULT NULL;
-- ALTER TABLE user_submissions ADD COLUMN IF NOT EXISTS is_read_by_user BOOLEAN DEFAULT true;
-- ALTER TABLE user_submissions ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP DEFAULT NULL;

-- 11. Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);

-- Migration: Add sort_order columns for custom ordering (Run in Supabase SQL editor)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

