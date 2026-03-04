const { getUserById } = require('../services/user');
const { getDailyUsage } = require('../services/usage');

async function getMe(req, res) {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier,
    createdAt: user.created_at,
  });
}

async function getUsage(req, res) {
  const used = await getDailyUsage(req.user.id);
  const limit = req.user.tier === 'pro' ? 10000 : 25;

  res.json({ used, limit, tier: req.user.tier });
}

module.exports = { getMe, getUsage };
