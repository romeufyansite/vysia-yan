import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.58.0';
import { decryptLlmApiKey } from './platformLlmCrypto.ts';

const DEEPSEEK_MODEL_ID = 'deepseek-v4-flash';

export interface DeepSeekFlashRuntime {
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

export async function loadDeepSeekV4FlashRuntime(
  admin: SupabaseClient,
  masterKeyHex: string,
): Promise<DeepSeekFlashRuntime> {
  const normalizedKeyHex = masterKeyHex.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalizedKeyHex)) {
    throw new Error('invalid_master_key_env');
  }

  const { data: row, error: qErr } = await admin
    .from('platform_llm_models')
    .select('id, api_base_url, api_model_id')
    .eq('provider', 'deepseek')
    .eq('api_model_id', DEEPSEEK_MODEL_ID)
    .eq('is_enabled', true)
    .eq('secret_configured', true)
    .maybeSingle();

  if (qErr) throw qErr;
  if (!row?.id || row.api_model_id !== DEEPSEEK_MODEL_ID) {
    throw new Error('deepseek_v4_flash_not_configured');
  }

  const { data: sec, error: sErr } = await admin
    .from('platform_llm_model_secrets')
    .select('nonce_b64, ciphertext_b64')
    .eq('model_id', row.id)
    .maybeSingle();

  if (sErr) throw sErr;
  if (!sec?.nonce_b64 || !sec?.ciphertext_b64) {
    throw new Error('deepseek_secret_missing');
  }

  const apiKey = await decryptLlmApiKey(sec.nonce_b64, sec.ciphertext_b64, normalizedKeyHex);

  const rawBase = (row.api_base_url as string | null)?.trim();
  const baseUrl = (rawBase && rawBase.length > 0 ? rawBase : 'https://api.deepseek.com').replace(/\/$/, '');

  return {
    apiKey,
    baseUrl,
    modelId: DEEPSEEK_MODEL_ID,
  };
}

export async function deepSeekChatCompletion(opts: {
  runtime: DeepSeekFlashRuntime;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const url = `${opts.runtime.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.runtime.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.runtime.modelId,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.max_tokens ?? 3072,
      stream: false,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error('deepseek_http_error', res.status, raw.slice(0, 500));
    throw new Error(`deepseek_http_${res.status}`);
  }

  let parsed: {
    choices?: { message?: { content?: string } }[];
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error('deepseek_invalid_json');
  }

  const content = parsed.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('deepseek_empty_content');
  return content;
}
