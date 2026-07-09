const { Pool } = require('pg');
const mysql = require('mysql2/promise');

let pgPool = null;
let mysqlPool = null;

const connectionString = process.env.DATABASE_URL || '';
const isMysql = connectionString.startsWith('mysql:');

let initialized = false;
let initPromise = null;

function getPool() {
  if (isMysql) {
    if (!mysqlPool) {
      mysqlPool = mysql.createPool({
        uri: connectionString,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      console.log("Database pool established with MySQL.");
    }
    return mysqlPool;
  } else {
    if (!pgPool) {
      const poolConfig = {
        connectionString: connectionString,
      };

      // Enable SSL for production cloud DB providers
      if (
        process.env.NODE_ENV === 'production' ||
        connectionString.includes('render.com') ||
        connectionString.includes('neon.tech') ||
        connectionString.includes('supabase') ||
        connectionString.includes('aws')
      ) {
        poolConfig.ssl = {
          rejectUnauthorized: false
        };
      }

      pgPool = new Pool(poolConfig);
      console.log("Database pool established with PostgreSQL.");
    }
    return pgPool;
  }
}

async function ensureInitialized() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const pool = getPool();
        if (isMysql) {
          // Verify/Create tables on MySQL
          await pool.query(`
            CREATE TABLE IF NOT EXISTS todos (
              id INT AUTO_INCREMENT PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              completed BOOLEAN DEFAULT FALSE,
              created_date DATE NOT NULL
            )
          `);
          await pool.query(`
            CREATE TABLE IF NOT EXISTS questions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              todo_id INT NOT NULL,
              title VARCHAR(255) NOT NULL,
              notes TEXT,
              code TEXT,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
            )
          `);
          await pool.query(`
            CREATE TABLE IF NOT EXISTS shared_codes (
              id INT AUTO_INCREMENT PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              code TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log("MySQL Database tables verified/created successfully.");
        } else {
          // Verify/Create tables on PostgreSQL (Supabase)
          await pool.query(`
            CREATE TABLE IF NOT EXISTS todos (
              id SERIAL PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              completed BOOLEAN DEFAULT FALSE,
              created_date DATE NOT NULL
            )
          `);
          await pool.query(`
            CREATE TABLE IF NOT EXISTS questions (
              id SERIAL PRIMARY KEY,
              todo_id INT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
              title VARCHAR(255) NOT NULL,
              notes TEXT,
              code TEXT,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          await pool.query(`
            CREATE TABLE IF NOT EXISTS shared_codes (
              id SERIAL PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              code TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log("PostgreSQL Database tables verified/created successfully.");
        }
        initialized = true;
      } catch (err) {
        console.error("Database table initialization failed:", err.message);
        initPromise = null; // Reset so next query attempts to retry
        throw err;
      }
    })();
  }
  return initPromise;
}

async function query(sql, params = []) {
  await ensureInitialized();
  const pool = getPool();

  if (isMysql) {
    let translatedSql = sql;
    let hasReturning = false;

    // 1. Convert PostgreSQL parameter markers ($1, $2, etc.) to MySQL placeholders (?)
    translatedSql = translatedSql.replace(/\$\d+/g, '?');

    // 2. Translate PostgreSQL date formatting to MySQL format
    // TO_CHAR(col, 'YYYY-MM-DD') -> DATE_FORMAT(col, '%Y-%m-%d')
    translatedSql = translatedSql.replace(/TO_CHAR\(([^,]+),\s*'YYYY-MM-DD'\)/gi, "DATE_FORMAT($1, '%Y-%m-%d')");
    // TO_CHAR(col, 'YYYY-MM-DD HH24:MI:SS') -> DATE_FORMAT(col, '%Y-%m-%d %H:%i:%s')
    translatedSql = translatedSql.replace(/TO_CHAR\(([^,]+),\s*'YYYY-MM-DD HH24:MI:SS'\)/gi, "DATE_FORMAT($1, '%Y-%m-%d %H:%i:%s')");

    // 3. Translate date intervals
    // INTERVAL '15 minutes' -> INTERVAL 15 MINUTE
    translatedSql = translatedSql.replace(/INTERVAL\s+'15 minutes'/gi, "INTERVAL 15 MINUTE");

    // 4. Remove PostgreSQL RETURNING id statement
    if (/RETURNING\s+id/i.test(translatedSql)) {
      translatedSql = translatedSql.replace(/\s+RETURNING\s+id/gi, '');
      hasReturning = true;
    }

    try {
      const [result] = await pool.execute(translatedSql, params);

      if (hasReturning) {
        // Return insertId in pg-compatible format
        return { rows: [{ id: result.insertId }] };
      }

      // If the result is an array (SELECT queries), return it as rows
      // If it's a ResultSetHeader, return it wrapped in rows as well
      return { rows: Array.isArray(result) ? result : [result] };
    } catch (err) {
      console.error("MySQL Execution Error:", err.message, "\nQuery:", translatedSql);
      throw err;
    }
  } else {
    // PostgreSQL execution
    try {
      const res = await pool.query(sql, params);
      return res;
    } catch (err) {
      console.error("PostgreSQL Execution Error:", err.message, "\nQuery:", sql);
      throw err;
    }
  }
}


module.exports = {
  query
};
