import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import * as jose from 'npm:jose@5.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function expectedZoneSlots(template: string | undefined): number {
  const t = template || 'fullscreen';
  if (t === '70-30' || t === '30-70' || t === 'banner') return 2;
  return 1;
}

async function verifyDeviceJWT(token: string): Promise<any> {
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log('[verifyDeviceJWT] JWT Secret available:', !!jwtSecret);
  console.log('[verifyDeviceJWT] Service Role Key available:', !!serviceRoleKey);

  if (!jwtSecret && !serviceRoleKey) {
    throw new Error('Neither SUPABASE_JWT_SECRET nor SUPABASE_SERVICE_ROLE_KEY is configured');
  }

  const secret = new TextEncoder().encode(jwtSecret || serviceRoleKey!);
  console.log('[verifyDeviceJWT] Using', jwtSecret ? 'SUPABASE_JWT_SECRET' : 'SUPABASE_SERVICE_ROLE_KEY fallback');

  try {
    const { payload } = await jose.jwtVerify(token, secret);
    console.log('[verifyDeviceJWT] JWT verified successfully. Payload:', JSON.stringify(payload));
    return payload;
  } catch (error) {
    console.error('[verifyDeviceJWT] JWT verification failed:', error.message);
    console.error('[verifyDeviceJWT] Token (first 20 chars):', token.substring(0, 20));
    throw new Error(`Invalid or expired device token: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[scene-get] Request received');
    const authHeader = req.headers.get('Authorization');
    console.log('[scene-get] Auth header present:', !!authHeader);

    if (!authHeader) {
      console.log('[scene-get] No auth header, returning 401');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[scene-get] Token extracted, attempting verification');
    const payload = await verifyDeviceJWT(token);
    console.log('[scene-get] Token verified, payload received');

    if (!payload.device_id || !payload.screen_id) {
      console.log('[scene-get] Invalid payload: missing device_id or screen_id');
      return new Response(
        JSON.stringify({ error: 'Invalid device token - missing device_id or screen_id' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('[scene-get] Payload valid, screen_id:', payload.screen_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[scene-get] Fetching screen from database, id:', payload.screen_id);
    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .select('id, name, playlist_id, status, orientation, template, zones, overlays')
      .eq('id', payload.screen_id)
      .maybeSingle();

    console.log('[scene-get] Screen query result:', screen ? 'found' : 'not found');
    if (screenError) console.error('[scene-get] Screen query error:', screenError);

    if (!screen) {
      console.log('[scene-get] Screen not found, returning 404');
      return new Response(
        JSON.stringify({ error: 'Screen not found or deleted' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('[scene-get] Screen found:', screen.name, 'Status:', screen.status);

    await supabase
      .from('screens')
      .update({
        last_seen_at: new Date().toISOString()
      })
      .eq('id', payload.screen_id);

    if (screen.status === 'offline') {
      console.log('[scene-get] Screen is offline, returning no content');
      return new Response(
        JSON.stringify({
          message: 'Écran mis hors ligne par l\'administrateur',
          version: 1,
          screen: screen,
          playlist: null,
          items: [],
          zoneFeeds: [],
          hasContent: false,
          isOffline: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const zonesRaw = Array.isArray(screen.zones) ? screen.zones : [];
    const n = expectedZoneSlots(screen.template);

    /** playlist_id à afficher pour chaque « slot » de zone (index 0 = legacy screen.playlist_id si vide) */
    const slotPlaylistIds: (string | null)[] = [];
    for (let i = 0; i < n; i++) {
      const z = zonesRaw[i] as { playlist_id?: string | null } | undefined;
      let pid = z?.playlist_id ?? null;
      if (!pid && i === 0) pid = screen.playlist_id ?? null;
      slotPlaylistIds.push(pid);
    }

    const uniqueIds = [...new Set(slotPlaylistIds.filter((id): id is string => !!id))];
    const bundleById = new Map<
      string,
      { playlist: Record<string, unknown> | null; items: unknown[] }
    >();

    for (const pid of uniqueIds) {
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('id, name, color, transition_speed')
        .eq('id', pid)
        .maybeSingle();

      if (playlistError) console.error('[scene-get] Playlist error:', playlistError, pid);

      if (!playlistData) {
        bundleById.set(pid, { playlist: null, items: [] });
        continue;
      }

      const { data: items, error: itemsError } = await supabase
        .from('playlist_items')
        .select('*')
        .eq('playlist_id', pid)
        .order('order_index');

      if (itemsError) console.error('[scene-get] Items error:', itemsError, pid);

      bundleById.set(pid, { playlist: playlistData, items: items || [] });
    }

    const zoneFeeds = slotPlaylistIds.map((pid) => {
      if (!pid) {
        return { playlist: null, items: [], hasContent: false };
      }
      const b = bundleById.get(pid);
      const items = (b?.items ?? []) as unknown[];
      return {
        playlist: b?.playlist ?? null,
        items,
        hasContent: items.length > 0,
      };
    });

    const playlist = zoneFeeds[0]?.playlist ?? null;
    const playlistItems = (zoneFeeds[0]?.items ?? []) as unknown[];
    const hasContent = zoneFeeds.some((z) => z.hasContent);

    console.log('[scene-get] zoneFeeds slots:', n, 'hasContent:', hasContent);

    return new Response(
      JSON.stringify({
        message: hasContent ? 'Lecture en cours' : 'Écran connecté - en attente de contenu',
        version: 1,
        screen: screen || null,
        playlist: playlist,
        items: playlistItems,
        zoneFeeds,
        hasContent,
        isOffline: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[scene-get] Error occurred:', error.message);
    console.error('[scene-get] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});