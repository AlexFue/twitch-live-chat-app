import { Pool } from "pg";
import { config } from "../config";

export const pool = new Pool({
  connectionString: config.database.url,
});

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Unable to connect to the database:', err);
    process.exit(-1);
  } else {
    console.log('Database connection established successfully:', res.rows[0]);
  }
});