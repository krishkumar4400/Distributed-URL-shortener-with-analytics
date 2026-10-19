import pool from "../db/pool.js";

const userColumns = 'id, email, name, created_at AS "createdAt"';

const userModel = {
  async create({ name, email, passwordHash }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
			 VALUES ($1, $2, $3)
			 RETURNING ${userColumns}`,
      [name, email, passwordHash],
    );
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT ${userColumns}, password_hash AS \"passwordHash\"
			 FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    if (!rows[0]) return null;

    const { passwordHash, ...user } = rows[0];
    return { id: user.id, passwordHash, user };
  },

  async findById(userId) {
    const { rows } = await pool.query(
      `SELECT ${userColumns} FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  },

  async createSession({ userId, tokenHash, expiresAt }) {
    await pool.query(
      `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
			 VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  },

  async findSession(tokenHash) {
    const { rows } = await pool.query(
      `SELECT u.${userColumns.split(", ").join(", u.")}
			 FROM auth_sessions s
			 JOIN users u ON u.id = s.user_id
			 WHERE s.token_hash = $1 AND s.expires_at > NOW()
			 LIMIT 1`,
      [tokenHash],
    );
    return rows[0] ? { user: rows[0] } : null;
  },

  async deleteSession(tokenHash) {
    await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [
      tokenHash,
    ]);
  },
};

export default userModel;
