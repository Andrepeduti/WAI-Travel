// Curated place recommendations per city via Lovable AI Gateway (Gemini).
// Returns a structured JSON object with restaurants, experiences, attractions,
// nightlife and recurring events. Designed to enrich Wikipedia/OSM-based
// suggestions inside the itinerary planner.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Você é um curador local de viagens brasileiro.
Sua tarefa é listar lugares e experiências REALMENTE populares e bem avaliados em uma cidade.
Regras obrigatórias:
- Use SOMENTE nomes oficiais reais — se houver qualquer dúvida sobre o nome exato, OMITA o item.
- Não invente lugares. Prefira clássicos amplamente conhecidos por turistas e locais.
- Descrições curtas (máx 90 caracteres), em português do Brasil, explicando por que o lugar é popular.
- "area" deve ser o bairro/região (não a cidade inteira).
- "priceLevel" deve ser "$" (econômico), "$$" (médio), "$$$" (alto) ou "$$$$" (luxo). Para eventos gratuitos use "$".
- "periodicityNote" só em events, descrevendo quando acontece (ex: "Verão", "Dezembro", "Toda sexta à noite").
- "typicalHours" OBRIGATÓRIO: horário típico de funcionamento no formato "HH:MM-HH:MM" (24h). Use "24h" se aberto 24 horas. Para atrações ao ar livre sem horário, use "08:00-20:00". Seja realista: bares e baladas não abrem de manhã, restaurantes de almoço fecham à tarde, museus geralmente 10:00-18:00.
- "suggestedTimeSlot" OBRIGATÓRIO: melhor momento do dia para visitar. Use EXATAMENTE um destes: "morning" (manhã, 09-12), "lunch" (almoço, 12-14), "afternoon" (tarde, 14-18), "dinner" (jantar, 19-22), "night" (noite, 22+). Bares/baladas = "night". Restaurantes = "lunch" ou "dinner" conforme o tipo. Museus e atrações = "morning" ou "afternoon".
- Responda APENAS com JSON válido, sem markdown, sem comentários, sem texto antes ou depois.

Formato exigido (responda EXATAMENTE esta estrutura JSON):
{
  "restaurants": [{"name":"","area":"","description":"","priceLevel":"$$","typicalHours":"12:00-15:00","suggestedTimeSlot":"lunch"}],
  "experiences": [{"name":"","area":"","description":"","priceLevel":"$$","typicalHours":"09:00-18:00","suggestedTimeSlot":"morning"}],
  "attractions": [{"name":"","area":"","description":"","priceLevel":"$","typicalHours":"09:00-18:00","suggestedTimeSlot":"morning"}],
  "nightlife":   [{"name":"","area":"","description":"","priceLevel":"$$","typicalHours":"22:00-04:00","suggestedTimeSlot":"night"}],
  "events":      [{"name":"","area":"","description":"","priceLevel":"$","periodicityNote":"","typicalHours":"20:00-23:00","suggestedTimeSlot":"dinner"}]
}
Quantidade mínima: 12 restaurants, 12 experiences, 12 attractions, 12 nightlife, 12 events.
Garanta variedade suficiente para vários dias de viagem, sem repetir lugares entre categorias.`;

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

    const body = await req.json().catch(() => null) as
      | { city?: string; country?: string }
      | null;

    const city = body?.city?.trim();
    if (!city) {
      return new Response(
        JSON.stringify({ error: 'city é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userPrompt = `Cidade: ${city}${body?.country ? `, ${body.country}` : ''}.\nListe as melhores e mais procuradas opções para um viajante.`;

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
      let userMessage = 'Não foi possível buscar recomendações agora.';
      if (upstream.status === 429) userMessage = 'Muitas requisições. Aguarde alguns instantes.';
      else if (upstream.status === 402) userMessage = 'Créditos de IA esgotados. Recarregue para continuar.';
      console.error('[ai-place-recommendations] upstream error', upstream.status, text);
      return new Response(
        JSON.stringify({ error: userMessage, status: upstream.status }),
        { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await upstream.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

    let parsed: unknown;
    try {
      // Strip possible code fences just in case.
      const clean = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('[ai-place-recommendations] JSON parse error', e, content?.slice(0, 200));
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
    console.error('[ai-place-recommendations] unexpected error', err);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
