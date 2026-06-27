// Extract structured doc info (flight/hotel/ticket) from a PDF via Lovable AI.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DocType = "transporte" | "hospedagem" | "ingresso";

const FLIGHT_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Flight segments in chronological order, including connections.",
      items: {
        type: "object",
        properties: {
          airline: { type: "string" },
          flight_number: { type: "string" },
          origin_airport: { type: "string", description: "IATA code, e.g. GRU" },
          origin_city: { type: "string" },
          destination_airport: { type: "string" },
          destination_city: { type: "string" },
          departure_date: { type: "string", description: "YYYY-MM-DD" },
          departure_time: { type: "string", description: "HH:MM 24h" },
          arrival_date: { type: "string" },
          arrival_time: { type: "string" },
          booking_code: { type: "string" },
          price: { type: "string" },
        },
        required: [
          "airline","flight_number","origin_airport","origin_city",
          "destination_airport","destination_city",
          "departure_date","departure_time","arrival_date","arrival_time",
          "booking_code","price",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const HOTEL_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Lodging reservations found in the document (usually 1).",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Hotel / property name" },
          address: { type: "string", description: "Full address or city" },
          check_in_date: { type: "string", description: "YYYY-MM-DD" },
          check_in_time: { type: "string", description: "HH:MM 24h, empty if unknown" },
          check_out_date: { type: "string" },
          check_out_time: { type: "string" },
          booking_code: { type: "string" },
          price: { type: "string" },
        },
        required: [
          "name","address","check_in_date","check_in_time",
          "check_out_date","check_out_time","booking_code","price",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const TICKET_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Activity / attraction tickets found in the document.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Activity / attraction / event name" },
          location: { type: "string", description: "Venue, address or city" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM 24h, empty if unknown" },
          booking_code: { type: "string" },
          price: { type: "string" },
        },
        required: ["name","location","date","time","booking_code","price"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const CONFIG: Record<DocType, { schema: object; toolName: string; system: string; userText: string }> = {
  transporte: {
    schema: FLIGHT_SCHEMA,
    toolName: "report_flights",
    system: "You extract flight segments from airline e-tickets / booking PDFs. Return every flight segment in chronological order, including connections. If a value is unknown, use an empty string. Use 24h times. Never invent flights — only what's printed.",
    userText: "Extract all flight segments from this booking PDF.",
  },
  hospedagem: {
    schema: HOTEL_SCHEMA,
    toolName: "report_hotels",
    system: "You extract lodging reservations from hotel / Airbnb / hostel / pousada booking PDFs. Return one item per reservation. If a value is unknown, use an empty string. Use 24h times. Never invent data — only what's printed.",
    userText: "Extract all lodging reservations from this booking PDF.",
  },
  ingresso: {
    schema: TICKET_SCHEMA,
    toolName: "report_tickets",
    system: "You extract activity / attraction / event tickets from booking PDFs (museum, theme park, show, tour, etc). Return one item per ticket / activity. If a value is unknown, use an empty string. Use 24h times. Never invent data — only what's printed.",
    userText: "Extract all activity / ticket bookings from this PDF.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const pdf = body?.pdf;
    const docType = (body?.docType || "transporte") as DocType;
    if (!pdf || typeof pdf !== "string") {
      return new Response(JSON.stringify({ error: "Missing pdf (base64)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!CONFIG[docType]) {
      return new Response(JSON.stringify({ error: "Invalid docType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = CONFIG[docType];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: cfg.system },
          {
            role: "user",
            content: [
              { type: "text", text: cfg.userText },
              {
                type: "file",
                file: {
                  filename: "document.pdf",
                  file_data: `data:application/pdf;base64,${pdf}`,
                },
              },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: cfg.toolName,
            description: "Report extracted items",
            parameters: cfg.schema,
          },
        }],
        tool_choice: { type: "function", function: { name: cfg.toolName } },
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
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(argsStr);
    return new Response(JSON.stringify({ items: parsed.items || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-document-pdf error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
