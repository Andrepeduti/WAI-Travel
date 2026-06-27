// AI chat streaming proxy to Lovable AI Gateway (Gemini).
// Receives { messages: [{role, content}, ...] } and streams text/event-stream
// chunks back to the client in the OpenAI-compatible delta format.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Você é o assistente de viagens da Wai, um app brasileiro de planejamento de roteiros.
Responda sempre em português do Brasil, com tom amigável, prático e direto.
- Sugira destinos, monte roteiros dia a dia, dê dicas de hospedagem, transporte, gastronomia, custos médios em BRL quando útil.
- Use markdown leve (negrito, listas, títulos curtos) para organizar respostas longas.
- Quando faltar informação, pergunte de volta de forma objetiva (datas, orçamento, estilo de viagem).
- Evite respostas genéricas; seja específico com nomes de bairros, restaurantes, atrações.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => null) as
      | { messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>; context?: string }
      | null;

    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cleanedMessages = body.messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-20) // keep last 20 turns for context window safety
      .map((m) => ({ role: m.role, content: m.content }));

    const systemContent = body.context
      ? `${SYSTEM_PROMPT}\n\nContexto atual do usuário: ${body.context}`
      : SYSTEM_PROMPT;

    const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        stream: true,
        messages: [
          { role: 'system', content: systemContent },
          ...cleanedMessages,
        ],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      let userMessage = 'Não foi possível responder agora. Tente novamente.';
      if (upstream.status === 429) userMessage = 'Muitas requisições. Aguarde alguns instantes e tente novamente.';
      else if (upstream.status === 402) userMessage = 'Créditos de IA esgotados. Recarregue para continuar usando o assistente.';
      console.error('[ai-chat] upstream error', upstream.status, text);
      return new Response(
        JSON.stringify({ error: userMessage, status: upstream.status }),
        { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Pass through the SSE stream from the gateway untouched.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('[ai-chat] unexpected error', err);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado no assistente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
