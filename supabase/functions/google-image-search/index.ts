import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { query } = await req.json().catch(() => ({ query: '' }));
    const q = (query ?? '').toString().trim();
    if (!q) {
      return new Response(JSON.stringify({ image: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const apiKey = Deno.env.get('GOOGLE_CSE_API_KEY');
    const cx = Deno.env.get('GOOGLE_CSE_CX');
    if (!apiKey || !cx) {
      return new Response(JSON.stringify({ image: null, error: 'missing_keys' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}`
      + `&searchType=image&num=3&safe=active&q=${encodeURIComponent(q)}`;
    const r = await fetch(url);
    if (!r.ok) {
      return new Response(JSON.stringify({ image: null, status: r.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    const j = await r.json();
    const items = Array.isArray(j?.items) ? j.items : [];
    const first = items.find((it: any) => typeof it?.link === 'string' && /^https?:\/\//.test(it.link));
    return new Response(JSON.stringify({ image: first?.link ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ image: null, error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
