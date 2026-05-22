export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { messages, system } = req.body;
    
    // Search OHADA jurisprudence
    const lastQuestion = messages[messages.length-1]?.content || '';
    let ohadaContext = '';
    try {
      const ohadaRes = await fetch(`https://www.ohada.com/search?q=${encodeURIComponent(lastQuestion)}&format=json`);
      if (ohadaRes.ok) {
        const ohadaData = await ohadaRes.json();
        ohadaContext = '\n\nJURISPRUDENCE OHADA PERTINENTE:\n' + JSON.stringify(ohadaData).slice(0, 2000);
      }
    } catch(e) {}

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: (system || '').slice(0, 8000) + ohadaContext },
          ...messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }))
        ]
      }),
    });
    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
