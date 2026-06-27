// Extract real places from videos using Lovable AI (Gemini multimodal).
// Two modes:
//   1) { mode: "link", url, title?, description? }  → analyzes metadata (title/desc/url) for places
//   2) { mode: "frames", frames: [base64...], hint? } → analyzes video frames visually
//
// Returns: { places: [{ name, location, country, category, description }] }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Extract place schema
const placeTool = {
  type: "function",
  function: {
    name: "report_places",
    description:
      "Report the real, named places (landmarks, restaurants, viewpoints, museums, neighborhoods, cities, beaches, parks, hotels) that appear or are mentioned in the video. Only include places you can identify with high confidence — do NOT invent generic descriptions.",
    parameters: {
      type: "object",
      properties: {
        places: {
          type: "array",
          description:
            "List of real-world named places identified. If you cannot identify any specific named place, return an empty array.",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description:
                  "Specific real-world place name (e.g. 'Cristo Redentor', 'Pão de Açúcar', 'Restaurante Aprazível'). NOT generic terms like 'praia bonita' or 'restaurante'.",
              },
              location: {
                type: "string",
                description:
                  "City and country, e.g. 'Rio de Janeiro, Brasil' or 'Paris, França'.",
              },
              country: { type: "string", description: "Country name in Portuguese." },
              category: {
                type: "string",
                description:
                  "One of: Monumento, Museu, Restaurante, Bar, Café, Hotel, Praia, Parque, Mirante, Igreja, Bairro, Cidade, Ponto turístico, Trilha, Loja, Mercado.",
              },
              confidence: {
                type: "string",
                enum: ["alta", "média"],
                description: "Identification confidence — only include alta/média confidence places.",
              },
            },
            required: ["name", "location", "category", "confidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["places"],
      additionalProperties: false,
    },
  },
};

interface ReqBody {
  mode: "link" | "frames";
  url?: string;
  title?: string;
  description?: string;
  frames?: string[]; // data URLs or raw base64 (jpeg)
  hint?: string;
}

async function fetchYouTubeMeta(
  url: string,
): Promise<{ title?: string; author?: string; description?: string }> {
  let title: string | undefined;
  let author: string | undefined;
  let description: string | undefined;

  // 1) oEmbed → titulo + canal (rápido e confiável)
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembed);
    if (res.ok) {
      const data = await res.json();
      title = data.title;
      author = data.author_name;
    }
  } catch {
    // ignore
  }

  // 2) Scrape da página do YouTube → descrição completa (onde estão os nomes dos restaurantes/locais)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
      },
    });
    if (res.ok) {
      const html = await res.text();

      // og:description tem a descrição (truncada mas costuma listar os locais)
      const ogDesc = html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      );
      // shortDescription dentro do ytInitialPlayerResponse (descrição completa)
      const shortDesc = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
      // keywords
      const keywords = html.match(
        /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i,
      );

      const decoded = shortDesc?.[1]
        ? shortDesc[1]
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\")
            .replace(/\\u0026/g, "&")
        : undefined;

      const parts = [decoded || ogDesc?.[1], keywords?.[1] ? `Tags: ${keywords[1]}` : null]
        .filter(Boolean)
        .join("\n\n");

      if (parts) description = parts.slice(0, 6000); // limite p/ não estourar contexto
      if (!title) {
        const ogTitle = html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
        );
        title = ogTitle?.[1];
      }
    }
  } catch {
    // ignore
  }

  return { title, author, description };
}

// User-Agent realista — Instagram/TikTok bloqueiam bots óbvios
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchInstagramMeta(
  url: string,
): Promise<{ title?: string; author?: string; description?: string }> {
  let title: string | undefined;
  let author: string | undefined;
  let description: string | undefined;

  // 1) Scrape com UA de browser para pegar og:title/og:description (que contém a legenda completa)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (res.ok) {
      const html = await res.text();
      const ogTitle = html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      );
      const ogDesc = html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      );
      // Instagram costuma colocar a legenda inteira em "caption" do JSON-LD
      const jsonLd = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
      let caption: string | undefined;
      if (jsonLd?.[1]) {
        try {
          const data = JSON.parse(jsonLd[1]);
          caption = data?.caption || data?.articleBody || data?.description;
        } catch {
          // ignore
        }
      }
      title = ogTitle?.[1];
      description = [caption, ogDesc?.[1]].filter(Boolean).join("\n\n").slice(0, 6000);
    }
  } catch {
    // ignore
  }

  // 2) Fallback: oEmbed público do Instagram (não precisa de token para alguns posts)
  if (!description) {
    try {
      const oembed = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`;
      const r = await fetch(oembed, {
        headers: { "User-Agent": BROWSER_UA, "X-IG-App-ID": "936619743392459" },
      });
      if (r.ok) {
        const j = await r.json();
        if (!title) title = j.title;
        if (!author) author = j.author_name;
      }
    } catch {
      // ignore
    }
  }

  return { title, author, description };
}

async function fetchTikTokMeta(
  url: string,
): Promise<{ title?: string; author?: string; description?: string }> {
  let title: string | undefined;
  let author: string | undefined;
  let description: string | undefined;

  // 1) oEmbed oficial do TikTok — funciona sem token e dá título + autor
  try {
    const oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const r = await fetch(oembed, { headers: { "User-Agent": BROWSER_UA } });
    if (r.ok) {
      const j = await r.json();
      title = j.title;
      author = j.author_name;
    }
  } catch {
    // ignore
  }

  // 2) Scrape da página com UA realista para pegar a descrição completa do vídeo
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (res.ok) {
      const html = await res.text();
      const ogDesc = html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      );
      const ogTitle = html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      );
      // TikTok injeta um JSON gigante com toda a info do vídeo
      const universal = html.match(
        /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
      );
      let descFull: string | undefined;
      if (universal?.[1]) {
        try {
          const data = JSON.parse(universal[1]);
          const item =
            data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
          descFull = item?.desc;
          if (!author) author = item?.author?.uniqueId || item?.author?.nickname;
          // Hashtags ajudam muito a IA identificar locais
          const challenges = item?.challenges?.map((c: any) => `#${c.title}`).join(" ");
          if (challenges) descFull = `${descFull || ""}\n\nTags: ${challenges}`;
        } catch {
          // ignore
        }
      }
      if (!title) title = ogTitle?.[1];
      description = [descFull, ogDesc?.[1]]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 6000);
    }
  } catch {
    // ignore
  }

  return { title, author, description };
}

async function fetchGenericMeta(url: string): Promise<{ title?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LovableBot/1.0; +https://lovable.dev)",
      },
    });
    if (!res.ok) return {};
    const html = await res.text();
    const og = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return { title: og?.[1] || title?.[1] };
  } catch {
    return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = (await req.json()) as ReqBody;

    let userMessage: any;

    if (body.mode === "link") {
      if (!body.url) throw new Error("url is required for link mode");

      // Enrich with metadata when possible
      let meta: { title?: string; author?: string; description?: string } = {};
      const url = body.url.trim();
      if (/youtube\.com|youtu\.be/.test(url)) meta = await fetchYouTubeMeta(url);
      else if (/tiktok\.com/.test(url)) meta = await fetchTikTokMeta(url);
      else if (/instagram\.com/.test(url)) meta = await fetchInstagramMeta(url);
      else meta = await fetchGenericMeta(url);

      const ctxLines = [
        `URL: ${url}`,
        meta.title ? `Título do vídeo: ${meta.title}` : null,
        meta.author ? `Canal/Autor: ${meta.author}` : null,
        meta.description ? `Descrição completa do vídeo:\n${meta.description}` : null,
        body.title ? `Título informado: ${body.title}` : null,
        body.description ? `Descrição extra: ${body.description}` : null,
      ].filter(Boolean);

      userMessage = {
        role: "user",
        content: `Analise este vídeo de viagem e extraia uma LISTA DETALHADA dos estabelecimentos e atrações ESPECÍFICOS apresentados nele — não apenas a cidade.

${ctxLines.join("\n")}

REGRAS OBRIGATÓRIAS:
1. Leia cuidadosamente o TÍTULO, a DESCRIÇÃO e o nome do canal. Eles geralmente listam os locais visitados (ex: "Top 10 restaurantes em Paris: Le Comptoir, Septime, Frenchie...").
2. Extraia TODOS os nomes próprios de estabelecimentos mencionados: restaurantes, bares, cafés, hotéis, lojas, museus, mirantes, atrações específicas.
3. NÃO retorne apenas "Paris, França" ou "Cidade de Paris" — isso é genérico e inútil. Retorne os ESTABELECIMENTOS individuais (ex: "Le Comptoir du Relais", "Septime", "Du Pain et des Idées").
4. Se o vídeo for sobre "restaurantes em Paris", retorne CADA restaurante citado como um item separado, com category="Restaurante".
5. Se a descrição/título lista locais com timestamps (ex: "01:23 - Café de Flore"), extraia todos.
6. Use confidence="alta" para nomes explicitamente citados no texto, "média" para inferidos do contexto.
7. Só retorne lista vazia se REALMENTE não houver nenhuma pista textual.

Retorne via a função report_places.`,
      };
    } else if (body.mode === "frames") {
      if (!body.frames || body.frames.length === 0)
        throw new Error("frames array is required for frames mode");

      const imageContent = body.frames.slice(0, 12).map((f) => {
        const dataUrl = f.startsWith("data:") ? f : `data:image/jpeg;base64,${f}`;
        return { type: "image_url", image_url: { url: dataUrl } };
      });

      userMessage = {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analise estes frames de um vídeo de viagem e extraia uma LISTA DETALHADA dos ESTABELECIMENTOS e ATRAÇÕES ESPECÍFICOS que aparecem — não apenas a cidade.

${body.hint ? `Contexto fornecido pelo usuário: ${body.hint}\n` : ""}

REGRAS OBRIGATÓRIAS:
1. LEIA com atenção qualquer texto visível: placas de fachada, letreiros, menus, cardápios, cartões de visita, legendas/títulos sobrepostos no vídeo, marcas, logos. É a fonte mais confiável de nomes próprios.
2. Se vir um restaurante, café, bar, hotel ou loja, identifique pelo NOME do estabelecimento (ex: "Café de Flore", "Septime", "Hotel Costes"), não apenas pela categoria.
3. Use reconhecimento visual de marcos famosos (Torre Eiffel, Louvre, Sacré-Cœur, etc).
4. Se o vídeo é claramente sobre "restaurantes em Paris" mas você só consegue ler 3 nomes, retorne esses 3 nomes específicos — NÃO retorne "Paris" como item.
5. NUNCA retorne entradas genéricas como "Cidade de Paris", "Restaurante em Paris", "Café parisiense". Sempre nome próprio do estabelecimento.
6. Use confidence="alta" quando ler o nome em uma placa/legenda; "média" quando inferir por arquitetura/contexto.
7. Liste cada estabelecimento como item SEPARADO (um vídeo de 5 restaurantes deve retornar 5 itens).

Retorne via a função report_places.`,
          },
          ...imageContent,
        ],
      };
    } else {
      throw new Error("Invalid mode. Use 'link' or 'frames'.");
    }

    const aiResp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em identificar ESTABELECIMENTOS e ATRAÇÕES específicas (restaurantes, bares, hotéis, lojas, museus) a partir de vídeos de viagem, lendo placas/letreiros/legendas e usando reconhecimento visual de marcos. Sempre responda em português brasileiro. NUNCA retorne apenas a cidade ou país como resultado — sempre o NOME PRÓPRIO de cada local específico mostrado/citado. Use APENAS a função report_places.",
          },
          userMessage,
        ],
        tools: [placeTool],
        tool_choice: { type: "function", function: { name: "report_places" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "Falha ao analisar vídeo." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    let places: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        places = Array.isArray(parsed.places) ? parsed.places : [];
      } catch (e) {
        console.error("Failed to parse tool args:", e);
      }
    }

    // Attach a real image per place. Strategy (in order):
    //  1) Wikipedia REST summary by title (PT then EN)
    //  2) Wikipedia search w/ pageimages (PT then EN)
    //  3) Nominatim (OpenStreetMap) -> Wikidata QID -> P18 (Commons image)
    // Wikipedia/Nominatim REQUIRE a User-Agent header.
    const UA_HEADERS = {
      "User-Agent": "WaiTravel/1.0 (https://waitravel.lovable.app; contact@waitravel.app)",
      Accept: "application/json",
    };

    const fetchWikiSummary = async (title: string, lang: "pt" | "en"): Promise<string | null> => {
      try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const r = await fetch(url, { headers: UA_HEADERS });
        if (!r.ok) return null;
        const j = await r.json();
        return j?.originalimage?.source || j?.thumbnail?.source || null;
      } catch {
        return null;
      }
    };

    const fetchWikiSearchImage = async (query: string, lang: "pt" | "en"): Promise<string | null> => {
      try {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=original%7Cthumbnail&pithumbsize=800&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(query)}`;
        const r = await fetch(url, { headers: UA_HEADERS });
        if (!r.ok) return null;
        const j = await r.json();
        const pages = j?.query?.pages;
        if (!pages) return null;
        const first: any = Object.values(pages)[0];
        return first?.original?.source || first?.thumbnail?.source || null;
      } catch {
        return null;
      }
    };

    // Build a Commons file URL from a P18 filename (e.g. "Eiffel Tower.jpg")
    const commonsFileUrl = (filename: string): string => {
      const clean = filename.replace(/ /g, "_");
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=800`;
    };

    const fetchOsmWikidataImage = async (query: string): Promise<string | null> => {
      try {
        // Ask Nominatim for the place with extratags (which include wikidata QID)
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&extratags=1`;
        const r = await fetch(nomUrl, { headers: UA_HEADERS });
        if (!r.ok) return null;
        const arr = await r.json();
        const qid = arr?.[0]?.extratags?.wikidata;
        if (!qid) return null;
        // Query Wikidata for property P18 (image)
        const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`;
        const w = await fetch(wdUrl, { headers: UA_HEADERS });
        if (!w.ok) return null;
        const wj = await w.json();
        const filename = wj?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (!filename) return null;
        return commonsFileUrl(filename);
      } catch {
        return null;
      }
    };

    const FALLBACK_IMG =
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop&q=70";

    const findImage = async (p: any): Promise<string> => {
      const name = (p.name || "").trim();
      const location = (p.location || "").trim();
      const fullQuery = [name, location].filter(Boolean).join(" ");
      const candidates: Array<() => Promise<string | null>> = [
        () => fetchWikiSummary(name, "pt"),
        () => fetchWikiSummary(name, "en"),
        () => fetchWikiSearchImage(fullQuery, "pt"),
        () => fetchWikiSearchImage(fullQuery, "en"),
        () => fetchWikiSearchImage(name, "pt"),
        () => fetchWikiSearchImage(name, "en"),
        () => fetchOsmWikidataImage(fullQuery),
        () => fetchOsmWikidataImage(name),
      ];
      for (const fn of candidates) {
        const img = await fn();
        if (img) {
          console.log(`[place-image] hit for "${name}" -> ${img}`);
          return img;
        }
      }
      console.log(`[place-image] MISS for "${name}" — using fallback`);
      return FALLBACK_IMG;
    };

    const enriched = await Promise.all(
      places.map(async (p, i) => {
        const img = await findImage(p);
        return {
          id: i + 1,
          name: p.name,
          location: p.location || "",
          country: p.country || "",
          category: p.category || "Ponto turístico",
          rating: 4.5,
          image: img,
        };
      })
    );

    return new Response(JSON.stringify({ places: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-video-places error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
