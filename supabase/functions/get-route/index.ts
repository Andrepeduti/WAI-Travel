import "https://deno.land/std@0.168.0/dotenv/load.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Haversine fallback */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fallbackTransport(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dist = haversineKm(lat1, lng1, lat2, lng2);
  const roadKm = dist * 1.3;
  let type: string;
  let durationMin: number;
  if (roadKm <= 1.2) {
    type = 'walk';
    durationMin = Math.max(5, Math.round((roadKm / 5) * 60));
  } else if (roadKm <= 5) {
    type = 'bus';
    durationMin = Math.max(8, Math.round((roadKm / 18) * 60));
  } else if (roadKm <= 15) {
    type = 'metro';
    durationMin = Math.max(10, Math.round((roadKm / 30) * 60));
  } else {
    type = 'car';
    durationMin = Math.max(10, Math.round((roadKm / 40) * 60));
  }
  return { distance_km: Math.round(roadKm * 10) / 10, duration_min: durationMin, transport_type: type, source: 'fallback' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination } = await req.json();
    // origin/destination: [lng, lat]
    if (!origin || !destination || origin.length < 2 || destination.length < 2) {
      return new Response(JSON.stringify({ error: 'origin and destination required as [lng, lat]' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ORS_API_KEY');
    if (!apiKey) {
      // No API key, use fallback
      const result = fallbackTransport(origin[1], origin[0], destination[1], destination[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine profile based on straight-line distance
    const dist = haversineKm(origin[1], origin[0], destination[1], destination[0]);
    let profile: string;
    let transportType: string;
    if (dist <= 1.5) {
      profile = 'foot-walking';
      transportType = 'walk';
    } else {
      profile = 'driving-car';
      transportType = dist <= 5 ? 'bus' : dist <= 15 ? 'metro' : 'car';
    }

    const url = `https://api.openrouteservice.org/v2/directions/${profile}?api_key=${apiKey}&start=${origin[0]},${origin[1]}&end=${destination[0]},${destination[1]}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('ORS API error:', resp.status, errText);
      // Fallback on API error
      const result = fallbackTransport(origin[1], origin[0], destination[1], destination[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const segment = data.features?.[0]?.properties?.segments?.[0];
    if (!segment) {
      const result = fallbackTransport(origin[1], origin[0], destination[1], destination[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const distanceKm = Math.round((segment.distance / 1000) * 10) / 10;
    const durationMin = Math.round(segment.duration / 60);

    // Re-evaluate transport type based on real distance
    if (distanceKm <= 1.2) {
      transportType = 'walk';
    } else if (distanceKm <= 5) {
      transportType = 'bus';
    } else if (distanceKm <= 15) {
      transportType = 'metro';
    } else {
      transportType = 'car';
    }

    return new Response(JSON.stringify({
      distance_km: distanceKm,
      duration_min: durationMin,
      transport_type: transportType,
      source: 'ors',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('get-route error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
