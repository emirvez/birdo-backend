const db = require('../config/database');

async function findOrCreateUser({ googleId, email, name }) {
  // Try to find existing user
  const existing = await db.query(
    'SELECT * FROM users WHERE google_id = $1',
    [googleId]
  );

  if (existing.rows.length > 0) {
    // Update name/email if changed
    const user = existing.rows[0];
    if (user.email !== email || user.name !== name) {
      await db.query(
        'UPDATE users SET email = $1, name = $2, updated_at = NOW() WHERE id = $3',
        [email, name, user.id]
      );
    }
    return { ...user, email, name };
  }

  // Create new user
  const result = await db.query(
    `INSERT INTO users (google_id, email, name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [googleId, email, name]
  );

  return result.rows[0];
}

async function getUserById(id) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateUserStripe(userId, { stripeCustomerId, stripeSubscriptionId, tier }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (stripeCustomerId !== undefined) {
    fields.push(`stripe_customer_id = $${idx++}`);
    values.push(stripeCustomerId);
  }
  if (stripeSubscriptionId !== undefined) {
    fields.push(`stripe_subscription_id = $${idx++}`);
    values.push(stripeSubscriptionId);
  }
  if (tier !== undefined) {
    fields.push(`tier = $${idx++}`);
    values.push(tier);
  }

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`,
    values
  );
}

module.exports = { findOrCreateUser, getUserById, updateUserStripe };
