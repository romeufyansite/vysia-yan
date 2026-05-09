import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Cache-Control': 'no-store',
};

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}
function bad(msg: string, code = 400) { return json({ error: msg }, code); }
function nowIso() { return new Date().toISOString(); }

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(length: number) {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < length; i++) out += CHARSET[buf[i] % CHARSET.length];
  return out;
}

const ISSUED_BY_WHITELIST = new Set(['web', 'tv', 'android', 'ios']);

type StartBody = {
  device_id?: string;
  org_id?: string | null;
  length?: number;
  ttl_seconds?: number;
  issued_by?: string;
  player_type?: string | null;
  player_version?: string | null;
  meta?: Record<string, unknown> | null;
};

function sanitizeBody(b: Partial<StartBody>): Required<StartBody> {
  const length = Math.max(4, Math.min(8, Number(b.length ?? 4)));
  const ttl_seconds = Math.max(60, Math.min(3600, Number(b.ttl_seconds ?? 600)));
  const issued_by = (b.issued_by ?? 'web').toLowerCase();
  if (!ISSUED_BY_WHITELIST.has(issued_by)) throw new Error('issued_by_not_allowed');

  return {
    device_id: b.device_id,
    org_id: b.org_id ?? null,
    length,
    ttl_seconds,
    issued_by,
    player_type: (b.player_type ?? null),
    player_version: (b.player_version ?? null),
    meta: (b.meta ?? null),
  };
}

async function assertRateLimit(
  supabase: ReturnType<typeof createClient>,
  key: { ip: string | null; deviceId: string; issued_by: string },
  windowSec = 10,
  maxRequests = 4
) {
  const ip = key.ip ?? 'unknown';
  const { data, error } = await supabase.rpc('pairing_rate_limit_count', {
    p_device_id: key.deviceId,
    p_issued_by: key.issued_by,
    p_ip: ip,
    p_window_seconds: windowSec,
  });
  if (error) {
    console.warn('rate-limit rpc error', error);
    return;
  }
  const count = Number(data ?? 0);
  if (count >= maxRequests) throw new Error('rate_limited');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST')   return bad('method_not_allowed', 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = (await req.json().catch(() => ({}))) as Partial<StartBody>;
    const b = sanitizeBody(body);

    const deviceId = b.device_id || crypto.randomUUID();

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip');

    {
      const { error } = await supabase.from('devices').upsert(
        {
          id: deviceId,
          platform: b.issued_by === 'web' ? 'web' : b.issued_by,
          player_type: b.player_type,
          player_version: b.player_version,
          last_seen_at: nowIso(),
        },
        { onConflict: 'id' }
      );
      if (error) return bad(`device_upsert_failed: ${error.message}`, 500);
    }

    await assertRateLimit(supabase, { ip, deviceId, issued_by: b.issued_by });

    const expiresAt = new Date(Date.now() + b.ttl_seconds * 1000).toISOString();
    const maxAttempts = 12;
    let attempt = 0;
    let inserted: any = null;

    while (attempt < maxAttempts && !inserted) {
      const code = generateCode(b.length);
      const { data, error } = await supabase
        .from('pairing_tokens')
        .insert({
          code,
          device_id: deviceId,
          org_id: b.org_id,
          status: 'pending',
          expires_at: expiresAt,
          issued_by: b.issued_by,
          player_type: b.player_type,
          player_version: b.player_version,
          meta: b.meta,
          created_ip: ip ?? null,
        })
        .select()
        .single();

      if (!error && data) {
        inserted = data;
        break;
      }
      attempt++;
      if (attempt >= maxAttempts) {
        return bad(`code_generation_failed: ${error?.message ?? 'conflict'}`, 503);
      }
    }

    return json(
      {
        code: inserted.code,
        deviceId: inserted.device_id,
        expiresAt: new Date(inserted.expires_at).getTime(),
      },
      201
    );
  } catch (err: any) {
    if (err?.message === 'issued_by_not_allowed') return bad('issued_by_not_allowed', 400);
    if (err?.message === 'rate_limited')          return bad('too_many_requests', 429);
    return bad(`server_error: ${err?.message ?? String(err)}`, 500);
  }
});
