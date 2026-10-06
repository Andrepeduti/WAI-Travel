// Supabase Edge Function: destination-description
// Devolve a mini descrição de um país para a tela "Destinos em alta".
// Cache em public.destination_descriptions: o Gemini só é chamado na primeira
// vez que o país é aberto; depois todos os usuários leem do banco.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Nome de país em português: letras (com acento), espaços, hífen e apóstrofo.
const COUNTRY_RE = /^[\p{L}][\p{L}\s'-]{1,59}$/u;
const MAX_LENGTH = 220;

/** Garante o tamanho máximo cortando na última frase (ou palavra) completa. */
function fitLength(text: string): string {
  if (text.length <= MAX_LENGTH) return text;
  const cut = text.slice(0, MAX_LENGTH);
  const lastSentence = cut.lastIndexOf('.');
  if (lastSentence > MAX_LENGTH / 2) return cut.slice(0, lastSentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`;
}

/** Extrai o texto da resposta: aceita o JSON pedido, outra chave de texto ou texto puro. */
function extractDescription(content: string): string {
  const clean = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (typeof parsed === 'string') return parsed.trim();
    if (parsed && typeof parsed === 'object') {
      const value = parsed.description ?? Object.values(parsed).find((v) => typeof v === 'string');
      return typeof value === 'string' ? value.trim() : '';
    }
  } catch {
    // Não veio JSON: usa o texto como está.
  }
  return clean.replace(/^["']|["']$/g, '').trim();
}

const SYSTEM_PROMPT = `Você escreve para o WAI, um app brasileiro de roteiros de viagem.
Escreva uma mini descrição inspiradora de um país como destino de viagem.
Regras obrigatórias:
- Português do Brasil, 1 ou 2 frases, no máximo 180 caracteres.
- Destaque o que torna o país especial para o viajante (cultura, paisagens, gastronomia, atmosfera).
- Tom acolhedor e convidativo, sem exageros, sem emojis, sem aspas, sem hashtags.
- Não mencione preços, datas, nem o nome do app.
- Responda APENAS com JSON válido: {"description": "..."}`;

// Modelos em ordem de preferência: o leve primeiro (rápido) e, de reserva, o
// gemini-2.5-flash (já usado em ai-place-recommendations). Se um estiver
// sobrecarregado (503), limitado (429) ou indisponível/aposentado (404),
// tenta o próximo.
const MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash-lite'];
const RETRYABLE_STATUS = new Set([404, 429, 500, 503]);
const RETRY_DELAY_MS = 400;

/** Pede a descrição ao Gemini com fallback de modelo. Retorna o conteúdo bruto ou null. */
async function generateWithFallback(apiKey: string, country: string): Promise<string | null> {
  for (const [attempt, model] of MODELS.entries()) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));

    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `País: ${country}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (upstream.ok) {
      const data = await upstream.json();
      return data?.choices?.[0]?.message?.content ?? '';
    }

    console.error('[destination-description] upstream error', model, upstream.status, await upstream.text().catch(() => ''));
    if (!RETRYABLE_STATUS.has(upstream.status)) return null;
  }
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null) as { country?: string } | null;
    const country = body?.country?.trim() ?? '';
    if (!COUNTRY_RE.test(country)) return json({ error: 'country inválido.' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Cache
    const { data: cached } = await supabase
      .from('destination_descriptions')
      .select('description')
      .eq('country', country)
      .maybeSingle();
    if (cached?.description) return json({ description: cached.description });

    // 2. Gemini
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY não configurada.' }, 500);

    const content = await generateWithFallback(apiKey, country);
    if (content === null) {
      return json({ error: 'Não foi possível gerar a descrição agora.' }, 502);
    }
    const extracted = extractDescription(content);
    if (!extracted) {
      console.error('[destination-description] empty model response', content.slice(0, 300));
      return json({ error: 'Resposta inválida do modelo.' }, 502);
    }
    const description = fitLength(extracted);

    // 3. Salva (ignora corrida: se outro request salvou antes, mantém o primeiro)
    const { error: insertError } = await supabase
      .from('destination_descriptions')
      .upsert({ country, description }, { onConflict: 'country', ignoreDuplicates: true });
    if (insertError) console.error('[destination-description] insert error', insertError);

    return json({ description });
  } catch (err) {
    console.error('[destination-description] unexpected error', err);
    return json({ error: 'Erro inesperado.' }, 500);
  }
});
