import { pool } from "../database/db";

export async function addStreamer(username: string, displayName?: string) {
  const query = `
    INSERT INTO streamers (username, display_name)
    VALUES ($1, $2)
    ON CONFLICT (username) DO UPDATE
    SET last_visited = CURRENT_TIMESTAMP
    RETURNING id, username, display_name, added_at, last_visited;
  `;
  const result = await pool.query(query, [username.toLowerCase(), displayName]);
  return result.rows[0];
}

export async function getStreamerHistory() {
  const query = `
    SELECT id, username, display_name, added_at, last_visited
    FROM streamers
    ORDER BY last_visited DESC
    LIMIT 100;
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getStreamer(username: string) {
  const query = `
    SELECT id, username, display_name, added_at, last_visited
    FROM streamers
    WHERE username = $1;
  `;
  const result = await pool.query(query, [username.toLowerCase()]);
  return result.rows[0];
}