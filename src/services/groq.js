const env = require('../config/env');

const ALLOWED_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

async function chatCompletion({ model, messages, temperature, max_tokens }) {
  if (!ALLOWED_MODELS.includes(model)) {
    model = ALLOWED_MODELS[0]; // default to llama-3.3-70b
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.groqApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 1024,
    }),
  });

  if (!res.ok) {
    console.error('Groq API error:', res.status);
    throw Object.assign(new Error('AI service error'), { status: 502 });
  }

  return res.json();
}

module.exports = { chatCompletion, ALLOWED_MODELS };
