import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

type PairingStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

interface PairingPayload {
  status: PairingStatus;
  screenId?: string;
  screenName?: string;
  deviceJwt?: string;
}

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(origin),
      status: 200
    });
  }

  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get('code') || '').toUpperCase().trim();

    if (!code || code.length < 4) {
      return new Response(
        JSON.stringify({ error: 'invalid_code' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('pairing_tokens')
      .select('code, status, expires_at, accepted_at, screen_id')
      .eq('code', code)
      .limit(1)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ status: 'invalid' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }

    const now = Date.now();
    const exp = new Date(data.expires_at).getTime();
    const status: PairingStatus =
      exp <= now && data.status === 'pending' ? 'expired' : (data.status as PairingStatus);

    const payload: PairingPayload = {
      status,
    };

    if (status === 'accepted' && data.screen_id) {
      const { data: screen } = await supabase
        .from('screens')
        .select('name, device_jwt')
        .eq('id', data.screen_id)
        .maybeSingle();

      payload.screenId = data.screen_id;
      payload.screenName = screen?.name ?? null;
      payload.deviceJwt = screen?.device_jwt ?? null;
    }

    return new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  } catch (e: unknown) {
    const error = e as Error;
    return new Response(
      JSON.stringify({ error: error?.message ?? 'server_error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(null),
        },
      }
    );
  }
});