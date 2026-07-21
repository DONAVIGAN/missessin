// Proxy IA — bascule sur OpenRouter (clé Anthropic directe indisponible).
// OpenRouter expose une API OpenAI-style (/chat/completions), on convertit donc
// le format Anthropic (system séparé) vers OpenAI, puis on ré-emballe la réponse
// au format content[] attendu par le front. Le front n'a rien à changer.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { messages, system } = req.body;

    // Format OpenAI : le system devient un message de rôle "system" en tête.
    const openaiMessages = [
      { role: 'system', content: (system || '').slice(0, 20000) },
      ...messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        max_tokens: 2000,
        messages: openaiMessages,
      }),
    });

    const data = await response.json();
    // Réponse OpenAI : choices[0].message.content. Ré-emballée en content[].
    const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
