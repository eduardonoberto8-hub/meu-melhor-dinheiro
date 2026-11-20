export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada na Vercel." });
  }

  try {
    const { summary, question } = req.body || {};
    if (!summary) {
      return res.status(400).json({ error: "Resumo financeiro não enviado." });
    }

    const cleanQuestion = typeof question === "string" ? question.trim() : "";

    const prompt = cleanQuestion
      ? `
Você é um consultor de educação financeira e comportamento econômico prático, objetivo e empático.
Responda à pergunta do usuário usando APENAS os dados financeiros fornecidos abaixo como contexto, com foco educativo e prático (não é aconselhamento financeiro formal/regulamentado).
Se a pergunta não tiver relação com finanças, orçamento ou comportamento financeiro, redirecione gentilmente para esse tema.

Pergunta do usuário:
"${cleanQuestion}"

Dados financeiros do usuário:
${JSON.stringify(summary, null, 2)}

Responda em português, de forma clara, direta e útil.
      `.trim()
      : `
Você é um consultor de educação financeira e comportamento econômico prático, objetivo e empático.
Analise o resumo abaixo e entregue:
1. Um diagnóstico rápido do comportamento financeiro atual (sem julgamentos).
2. 3 ações práticas e realistas para os próximos 30 dias.
3. Um alerta de atenção caso haja contas pendentes/vencidas ou saldo negativo.

Responda em português, com linguagem clara, direta e bem estruturada.

Dados do usuário:
${JSON.stringify(summary, null, 2)}
      `.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Erro ao consultar a API do Gemini."
      });
    }

    const advice =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join("\n") || "Não foi possível gerar uma resposta no momento.";

    return res.status(200).json({ advice });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno ao processar a análise: " + err.message });
  }
}
