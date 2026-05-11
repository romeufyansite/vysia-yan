import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import * as jose from 'npm:jose@5.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function generateDeviceJWT(deviceId: string, screenId: string, orgId: string): Promise<string> {
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!jwtSecret && !serviceRoleKey) {
    throw new Error('Neither SUPABASE_JWT_SECRET nor SUPABASE_SERVICE_ROLE_KEY is configured');
  }

  const secret = new TextEncoder().encode(jwtSecret || serviceRoleKey!);
  console.log('[generateDeviceJWT] Using', jwtSecret ? 'SUPABASE_JWT_SECRET' : 'SUPABASE_SERVICE_ROLE_KEY fallback');

  const jwt = await new jose.SignJWT({
    device_id: deviceId,
    screen_id: screenId,
    org_id: orgId,
    type: 'device',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1y')
    .sign(secret);

  return jwt;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, screenName, playlistId, groupId, orgId: requestedOrgId, orientation } =
      await req.json();

    if (!code || !screenName) {
      return new Response(
        JSON.stringify({ error: 'Code et nom d\'écran requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: pairingToken, error: tokenError } = await supabase
      .from('pairing_tokens')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (tokenError || !pairingToken) {
      return new Response(
        JSON.stringify({ error: 'Code invalide ou expiré' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const now = new Date();
    const expiresAt = new Date(pairingToken.expires_at);

    if (now > expiresAt || pairingToken.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Code expiré ou déjà utilisé' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const orgId: string | null = requestedOrgId || pairingToken.org_id || null;

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "Aucune entreprise active. Sélectionnez une entreprise avant de connecter un écran." }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const deviceJwt = await generateDeviceJWT(pairingToken.device_id, '', orgId);

    const screenOrientation =
      orientation === 'portrait' ? 'portrait' : 'landscape';

    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .insert({
        org_id: orgId,
        name: screenName,
        playlist_id: playlistId || null,
        group_id: groupId || null,
        orientation: screenOrientation,
        status: 'online',
        device_jwt: deviceJwt,
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (screenError) {
      throw screenError;
    }

    const finalDeviceJwt = await generateDeviceJWT(pairingToken.device_id, screen.id, orgId);

    await supabase
      .from('screens')
      .update({ device_jwt: finalDeviceJwt })
      .eq('id', screen.id);

    await supabase
      .from('devices')
      .update({
        screen_id: screen.id,
        paired_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', pairingToken.device_id);

    const acceptedAt = new Date().toISOString();

    await supabase
      .from('pairing_tokens')
      .update({
        status: 'accepted',
        screen_id: screen.id,
        org_id: orgId,
        accepted_at: acceptedAt,
        updated_at: acceptedAt,
      })
      .eq('code', code.toUpperCase());

    return new Response(
      JSON.stringify({
        ok: true,
        screenId: screen.id,
        deviceJwt: finalDeviceJwt,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
