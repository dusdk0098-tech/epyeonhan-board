import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.108.1';

export const initialAdminEmail = 'hamori4919@naver.com';

export type AdminContext = {
  adminClient: SupabaseClient;
  caller: User;
};

export function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export async function requireAdminContext(request: Request): Promise<AdminContext | Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('PEDIT_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authorization = request.headers.get('authorization') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Supabase admin function environment is not configured', 500);
  }
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return errorResponse('Missing authorization token', 401);
  }
  const accessToken = authorization.slice('bearer '.length).trim();
  if (!accessToken) {
    return errorResponse('Missing authorization token', 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return errorResponse('Invalid authorization token', 401);
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    return errorResponse(profileError.message, 500);
  }
  if (!profile || profile.role !== 'admin' || profile.status !== 'active') {
    return errorResponse('Admin permission required', 403);
  }

  return { adminClient, caller: userData.user };
}

export async function readJsonBody<T extends Record<string, unknown>>(request: Request): Promise<T | Response> {
  try {
    return await request.json() as T;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
}

export function normalizeProviders(providers: unknown[] | undefined) {
  const normalized = new Set<string>();
  for (const provider of providers ?? []) {
    const raw = String(provider ?? '').trim().toLowerCase();
    if (!raw) continue;
    if (raw === 'email') {
      normalized.add('password');
      continue;
    }
    if (raw === 'custom:naver') {
      normalized.add('naver');
      continue;
    }
    normalized.add(raw);
  }
  return Array.from(normalized).sort();
}

export async function insertAdminAuditLog(
  adminClient: SupabaseClient,
  actorUserId: string,
  targetUserId: string,
  action: string,
  metadata: Record<string, unknown>
) {
  const { error } = await adminClient.from('audit_logs').insert({
    actor_user_id: actorUserId,
    target_user_id: targetUserId,
    action,
    metadata
  });
  if (error) {
    throw error;
  }
}
