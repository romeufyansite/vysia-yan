import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { encryptLlmApiKey } from '../_shared/platformLlmCrypto.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, accept',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Provider = 'openai' | 'anthropic' | 'google' | 'azure_openai' | 'custom' | 'deepseek';

async function assertPlatformAdmin(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const { data, error } = await admin
    .from('profiles')
    .select('platform_role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data?.platform_role !== 'admin') {
    throw new Error('forbidden');
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const rawMaster = Deno.env.get('PLATFORM_LLM_MASTER_KEY_HEX')?.trim() ?? '';
  const normalizedKeyHex = rawMaster.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalizedKeyHex)) {
    console.error('platform-llm-admin: PLATFORM_LLM_MASTER_KEY_HEX missing or invalid length');
    return json(503, { error: 'server_misconfigured' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) {
      return json(401, { error: 'missing_authorization' });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userResult } = await userClient.auth.getUser();
    const user = userResult?.user;
    if (!user) {
      return json(401, { error: 'unauthorized' });
    }

    await assertPlatformAdmin(admin, user.id);

    if (req.method === 'POST') {
      const body = (await req.json()) as Record<string, unknown>;
      const display_name = String(body.display_name ?? '').trim();
      const provider = String(body.provider ?? '').trim() as Provider;
      const api_model_id = String(body.api_model_id ?? '').trim();
      const api_base_urlRaw = body.api_base_url;
      const api_base_url =
        api_base_urlRaw === null || api_base_urlRaw === undefined
          ? null
          : String(api_base_urlRaw).trim() || null;
      const notesRaw = body.notes;
      const notes =
        notesRaw === null || notesRaw === undefined ? null : String(notesRaw).trim() || null;
      const sort_order = Number(body.sort_order ?? 0) || 0;
      const is_enabled = body.is_enabled !== false;
      const api_key = String(body.api_key ?? '').trim();

      if (!display_name || !api_model_id || !api_key) {
        return json(400, { error: 'display_name_api_model_id_api_key_required' });
      }
      const allowed: Provider[] = ['openai', 'anthropic', 'google', 'azure_openai', 'custom', 'deepseek'];
      if (!allowed.includes(provider)) {
        return json(400, { error: 'invalid_provider' });
      }

      const { nonceB64, ciphertextB64 } = await encryptLlmApiKey(api_key, normalizedKeyHex);

      const { data: row, error: insErr } = await admin
        .from('platform_llm_models')
        .insert({
          display_name,
          provider,
          api_model_id,
          api_base_url,
          notes,
          sort_order,
          is_enabled,
          secret_configured: false,
        })
        .select('id')
        .single();

      if (insErr || !row?.id) {
        console.error('platform-llm-admin insert model', insErr);
        return json(500, { error: 'create_failed' });
      }

      const modelId = row.id as string;

      const { error: secErr } = await admin.from('platform_llm_model_secrets').insert({
        model_id: modelId,
        nonce_b64: nonceB64,
        ciphertext_b64: ciphertextB64,
      });

      if (secErr) {
        console.error('platform-llm-admin insert secret', secErr);
        await admin.from('platform_llm_models').delete().eq('id', modelId);
        return json(500, { error: 'secret_store_failed' });
      }

      const { error: flagErr } = await admin
        .from('platform_llm_models')
        .update({
          secret_configured: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', modelId);

      if (flagErr) {
        console.error('platform-llm-admin flag secret_configured', flagErr);
        return json(500, { error: 'finalize_failed' });
      }

      return json(200, { ok: true, id: modelId });
    }

    if (req.method === 'PATCH') {
      const body = (await req.json()) as Record<string, unknown>;
      const id = String(body.id ?? '').trim();
      if (!id) {
        return json(400, { error: 'id_required' });
      }

      const api_key = String(body.api_key ?? '').trim();

      const meta: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (body.display_name !== undefined) {
        meta.display_name = String(body.display_name).trim();
      }
      if (body.provider !== undefined) {
        const p = String(body.provider).trim() as Provider;
        const allowed: Provider[] = ['openai', 'anthropic', 'google', 'azure_openai', 'custom', 'deepseek'];
        if (!allowed.includes(p)) return json(400, { error: 'invalid_provider' });
        meta.provider = p;
      }
      if (body.api_model_id !== undefined) {
        meta.api_model_id = String(body.api_model_id).trim();
      }
      if (body.api_base_url !== undefined) {
        const v = body.api_base_url;
        meta.api_base_url = v === null ? null : String(v).trim() || null;
      }
      if (body.notes !== undefined) {
        const v = body.notes;
        meta.notes = v === null ? null : String(v).trim() || null;
      }
      if (body.sort_order !== undefined) {
        meta.sort_order = Number(body.sort_order) || 0;
      }
      if (body.is_enabled !== undefined) {
        meta.is_enabled = Boolean(body.is_enabled);
      }

      const metaKeys = Object.keys(meta).filter((k) => k !== 'updated_at');
      if (metaKeys.length > 0) {
        const { error: upErr } = await admin.from('platform_llm_models').update(meta).eq('id', id);
        if (upErr) {
          console.error('platform-llm-admin patch meta', upErr);
          return json(500, { error: 'update_failed' });
        }
      }

      if (api_key.length > 0) {
        const { nonceB64, ciphertextB64 } = await encryptLlmApiKey(api_key, normalizedKeyHex);
        const { error: upSec } = await admin.from('platform_llm_model_secrets').upsert(
          {
            model_id: id,
            nonce_b64: nonceB64,
            ciphertext_b64: ciphertextB64,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'model_id' },
        );
        if (upSec) {
          console.error('platform-llm-admin upsert secret', upSec);
          return json(500, { error: 'secret_rotate_failed' });
        }
        const { error: flagErr } = await admin
          .from('platform_llm_models')
          .update({
            secret_configured: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (flagErr) {
          console.error('platform-llm-admin flag after rotate', flagErr);
          return json(500, { error: 'finalize_failed' });
        }
      }

      return json(200, { ok: true });
    }

    return json(405, { error: 'method_not_allowed' });
  } catch (e) {
    if (e instanceof Error && e.message === 'forbidden') {
      return json(403, { error: 'forbidden' });
    }
    console.error('platform-llm-admin', e);
    return json(500, { error: 'internal_error' });
  }
});
