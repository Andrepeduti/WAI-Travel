// Supabase Edge Function: delete-account
// Exclui permanentemente o usuário que fez a chamada (identificado pelo JWT).
// A remoção em auth.users dispara o CASCADE das tabelas que referenciam o usuário.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado' }, 401);

  // Cliente com o JWT do usuário: só serve para descobrir quem está chamando.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error: userError } = await userClient.auth.getUser();
  if (userError || !data.user) return json({ error: 'Não autenticado' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    console.error('[delete-account]', deleteError);
    return json({ error: 'Falha ao excluir conta' }, 500);
  }

  return json({ ok: true });
});
