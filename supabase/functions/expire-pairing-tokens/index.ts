import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CleanupResult {
  ok: boolean;
  expired_count?: number;
  deleted_count?: number;
  update_error?: string;
  delete_error?: string;
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

    const now = new Date().toISOString();
    const result: CleanupResult = { ok: true };

    const { data: expiredTokens, error: updErr } = await supabase
      .from('pairing_tokens')
      .update({ status: 'expired' })
      .lt('expires_at', now)
      .eq('status', 'pending')
      .select('code');

    if (updErr) {
      result.update_error = updErr.message;
    } else {
      result.expired_count = expiredTokens?.length ?? 0;
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: deletedTokens, error: delErr } = await supabase
      .from('pairing_tokens')
      .delete()
      .lt('expires_at', cutoff)
      .in('status', ['expired', 'cancelled'])
      .select('code');

    if (delErr) {
      result.delete_error = delErr.message;
    } else {
      result.deleted_count = deletedTokens?.length ?? 0;
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'server_error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
