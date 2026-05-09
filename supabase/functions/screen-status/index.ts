import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bad(msg: string, code = 400) {
  return json({ error: msg }, code);
}

type ScreenStatusBody = {
  screen_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return bad('method_not_allowed', 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = (await req.json().catch(() => ({}))) as Partial<ScreenStatusBody>;

    if (!body.screen_id) {
      return bad('missing_screen_id', 400);
    }

    const screenId = body.screen_id;

    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .select('status')
      .eq('id', screenId)
      .limit(1)
      .maybeSingle();

    if (screenError) {
      return bad('database_error', 500);
    }

    if (!screen) {
      return json({ status: 'not_found' });
    }

    const screenStatus = screen.status ?? 'unknown';

    return json({ status: screenStatus });
  } catch (err: any) {
    return bad(`server_error: ${err?.message ?? String(err)}`, 500);
  }
});
