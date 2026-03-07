const { chatCompletion } = require('../services/groq');

async function proxyChat(req, res) {
  const { model, messages, temperature, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Limit number of messages to prevent abuse
  if (messages.length > 50) {
    return res.status(400).json({ error: 'Too many messages (max 50)' });
  }

  // Validate message structure
  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== 'string') {
      return res.status(400).json({ error: 'Each message must have a role and content string' });
    }
    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      return res.status(400).json({ error: 'Invalid message role' });
    }
    // Limit individual message content length (10KB)
    if (msg.content.length > 10240) {
      return res.status(400).json({ error: 'Message content too long (max 10KB per message)' });
    }
  }

  // Validate numeric params
  const safeTemp = typeof temperature === 'number'
    ? Math.max(0, Math.min(2, temperature)) : 0.7;
  const safeMaxTokens = typeof max_tokens === 'number'
    ? Math.max(1, Math.min(4096, Math.floor(max_tokens))) : 1024;

  try {
    const result = await chatCompletion({
      model,
      messages,
      temperature: safeTemp,
      max_tokens: safeMaxTokens,
    });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
  }
}

module.exports = { proxyChat };
