import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InviteBody {
  email: string;
  firstName?: string;
  lastName?: string;
  // Per-org permissions map: { [orgId]: permissions }
  orgPermissions: Record<string, Record<string, unknown>>;
  appBaseUrl?: string;
}

function randomToken(length = 48): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userResult } = await userClient.auth.getUser();
    const user = userResult?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as InviteBody;
    const email = (body.email ?? '').trim().toLowerCase();
    const firstName = (body.firstName ?? '').trim() || null;
    const lastName = (body.lastName ?? '').trim() || null;
    const orgPermissions = body.orgPermissions ?? {};
    const orgIds = Object.keys(orgPermissions);
    const appBaseUrl = (body.appBaseUrl ?? '').replace(/\/+$/, '');

    if (!email || orgIds.length === 0) {
      return new Response(JSON.stringify({ error: 'email_and_at_least_one_org_required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (email === (user.email ?? '').toLowerCase()) {
      return new Response(JSON.stringify({ error: 'cannot_invite_self' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is manager of every requested org
    const { data: mgrRows, error: mgrErr } = await admin
      .from('org_memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('role', 'manager')
      .in('org_id', orgIds);
    if (mgrErr) throw mgrErr;
    const managerOrgs = new Set((mgrRows ?? []).map((r: { org_id: string }) => r.org_id));
    for (const oid of orgIds) {
      if (!managerOrgs.has(oid)) {
        return new Response(JSON.stringify({ error: 'not_manager_of_org', orgId: oid }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // We use one shared token per invite batch, so the invitee accepts once and
    // all memberships are created together.
    const token = randomToken(24);

    // Revoke any prior pending invites for this email across those orgs
    await admin
      .from('team_invitations')
      .update({ status: 'revoked' })
      .in('org_id', orgIds)
      .eq('email', email)
      .eq('status', 'pending');

    // Insert one invitation row per org, sharing the token
    const rows = orgIds.map((orgId) => ({
      org_id: orgId,
      invited_by: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      permissions: orgPermissions[orgId] ?? {},
      token,
    }));

    const { error: insertErr } = await admin.from('team_invitations').insert(rows);
    if (insertErr) throw insertErr;

    // Supabase will append its own auth params to the redirectTo URL.
    // We pass the invitation token as a plain query param so it survives
    // the redirect regardless of hash routing.
    const baseOrigin = appBaseUrl || '';
    const inviteUrl = `${baseOrigin}?invitation_token=${token}`;

    try {
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { invitation_token: token, first_name: firstName, last_name: lastName },
        redirectTo: inviteUrl,
      });
    } catch (mailErr) {
      console.warn('inviteUserByEmail failed (user may already exist):', mailErr);
      try {
        await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: inviteUrl },
        });
      } catch (magicErr) {
        console.warn('generateLink magiclink failed:', magicErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, token, inviteUrl, orgCount: orgIds.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('team-invite error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
