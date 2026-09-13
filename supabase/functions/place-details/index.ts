// Supabase Edge Function: place-details
// Uses Gemini to generate rich creative details (summary, profile tags, average expense, tips)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Você é um curador e especialista em viagens internacionais e destinos turísticos.
Sua tarefa é gerar informações detalhadas, precisas e envolventes sobre um lugar, atração, restaurante ou ponto de interesse específico.

Regras obrigatórias:
- Responda SEMPRE em português do Brasil (pt-BR).
- "shortDescription": Um texto fluido, acolhedor e informativo de 1 a 2 parágrafos sobre o local, sua importância, história ou atmosfera (máximo 450 caracteres).
- "averageExpense": Estimativa realista de gasto médio por pessoa em Reais (formato "R$ XX,00" ou "Gratuito" para praças, parques abertos e monumentos públicos sem cobrança).
- "tags": Array com 3 a 5 tags curtas que definem o perfil/vibe do lugar (exemplos: "Encontrar amigos", "Romance", "Vida Noturna", "Família", "Fotografia", "História e Arte", "Gastronomia", "Pôr do sol", "Vistas Panorâmicas").
- "tips": Array com 3 a 4 dicas essenciais e práticas ("O que você precisa saber"), como melhor horário para evitar filas, como economizar, melhor ângulo para fotos, ou cuidados especiais.
- Responda ESTRITAMENTE com um objeto JSON válido, sem markdown, sem blocos de código adicionais, sem texto antes ou depois.

Formato exigido:
{
  "shortDescription": "string",
  "averageExpense": "string",
  "tags": ["string", "string", "string"],
  "tips": ["string", "string", "string"]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => null) as {
      name?: string;
      city?: string;
      country?: string;
      category?: string;
    } | null;

    const name = body?.name?.trim();
    if (!name) {
      return new Response(
        JSON.stringify({ error: 'name é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const locationContext = [body?.city, body?.country].filter(Boolean).join(', ');
    const userPrompt = `Lugar: "${name}"${locationContext ? ` localizado em ${locationContext}` : ''}${body?.category ? ` (Categoria: ${body.category})` : ''}.`;

    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error('[place-details] Upstream error:', upstream.status, text);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar o Gemini AI', status: upstream.status }),
        { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await upstream.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

    let parsed: any;
    try {
      const clean = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('[place-details] JSON parse error:', e, content);
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do modelo.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[place-details] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado ao buscar detalhes.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
