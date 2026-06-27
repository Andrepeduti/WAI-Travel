// Extract structured flight info from a PDF using Lovable AI (Gemini)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  properties: {
    flights: {
      type: "array",
      description: "List of flight segments found in the document, in order of departure.",
      items: {
        type: "object",
        properties: {
          airline: { type: "string", description: "Airline name, e.g. 'TAP Air Portugal'" },
          flight_number: { type: "string", description: "Flight number/code, e.g. 'TP088'" },
          origin_airport: { type: "string", description: "IATA code of origin, e.g. 'GRU'" },
          origin_city: { type: "string", description: "Origin city name" },
          destination_airport: { type: "string", description: "IATA code of destination" },
          destination_city: { type: "string", description: "Destination city name" },
          departure_date: { type: "string", description: "YYYY-MM-DD" },
          departure_time: { type: "string", description: "HH:MM 24h" },
          arrival_date: { type: "string", description: "YYYY-MM-DD" },
          arrival_time: { type: "string", description: "HH:MM 24h" },
          booking_code: { type: "string", description: "PNR / reservation code, or empty string" },
          price: { type: "string", description: "Total price as printed, or empty string" },
        },
        required: [
          "airline", "flight_number", "origin_airport", "origin_city",
          "destination_airport", "destination_city",
          "departure_date", "departure_time", "arrival_date", "arrival_time",
          "booking_code", "price",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["flights"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdf } = await req.json();
    if (!pdf || typeof pdf !== "string") {
      return new Response(JSON.stringify({ error: "Missing pdf (base64)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You extract flight segments from airline e-tickets / booking PDFs. Return every flight segment in chronological order, including connections. If a value is unknown, use an empty string. Use 24h times. Never invent flights — only what's printed.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all flight segments from this booking PDF." },
              {
                type: "file",
                file: {
                  filename: "ticket.pdf",
                  file_data: `data:application/pdf;base64,${pdf}`,
                },
              },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_flights",
            description: "Report extracted flight segments",
            parameters: SCHEMA,
          },
        }],
        tool_choice: { type: "function", function: { name: "report_flights" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Gateway error", resp.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error", detail: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      return new Response(JSON.stringify({ flights: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(argsStr);
    return new Response(JSON.stringify({ flights: parsed.flights || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-flight-pdf error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
