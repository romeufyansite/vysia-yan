import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Cache-Control': 'no-store',
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

type BootstrapBody = {
  device_id?: string;
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

    const body = (await req.json().catch(() => ({}))) as Partial<BootstrapBody>;

    if (!body.device_id) {
      return bad('missing_device_id', 400);
    }

    const deviceId = body.device_id;

    const { data: pairingToken, error: tokenError } = await supabase
      .from('pairing_tokens')
      .select('status, screen_id, created_at')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError) {
      return bad(`database_error: ${tokenError.message}`, 500);
    }

    if (!pairingToken || pairingToken.status !== 'accepted') {
      return json({
        status: 'unpaired',
        screenId: null,
        screenName: null,
      });
    }

    const screenId = pairingToken.screen_id;

    if (!screenId) {
      return json({
        status: 'unpaired',
        screenId: null,
        screenName: null,
      });
    }

    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .select('name, device_jwt')
      .eq('id', screenId)
      .limit(1)
      .maybeSingle();

    if (screenError) {
      return bad(`database_error: ${screenError.message}`, 500);
    }

    const screenName = screen?.name ?? null;
    const deviceToken = screen?.device_jwt ?? null;

    return json({
      status: 'paired',
      screenId,
      screenName,
      deviceToken,
    });
  } catch (err: any) {
    return bad(`server_error: ${err?.message ?? String(err)}`, 500);
  }
});
