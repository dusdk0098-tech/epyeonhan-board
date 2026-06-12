import {
  corsHeaders,
  errorResponse,
  initialAdminEmail,
  insertAdminAuditLog,
  jsonResponse,
  readJsonBody,
  requireAdminContext
} from '../_shared/admin.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const context = await requireAdminContext(request);
  if (context instanceof Response) return context;

  const body = await readJsonBody<{ userId?: unknown; password?: unknown }>(request);
  if (body instanceof Response) return body;

  const userId = String(body.userId ?? '').trim();
  const password = String(body.password ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return errorResponse('Invalid user id', 400);
  }
  if (password.length < 8) {
    return errorResponse('Password must be at least 8 characters', 400);
  }

  let { data: targetProfile, error: targetError } = await context.adminClient
    .from('profiles')
    .select('id,email,role')
    .eq('id', userId)
    .maybeSingle();

  if (targetError) return errorResponse(targetError.message, 500);
  if (!targetProfile) {
    const backfilled = await backfillTargetProfile(context.adminClient, userId);
    if (backfilled instanceof Response) return backfilled;
    targetProfile = backfilled;
  }

  const { error } = await context.adminClient.auth.admin.updateUserById(userId, { password });
  if (error) {
    return errorResponse(error.message, 500);
  }

  try {
    await insertAdminAuditLog(context.adminClient, context.caller.id, userId, 'user.password.updated', {
      targetEmail: targetProfile.email,
      targetRole: targetProfile.role
    });
  } catch (auditError) {
    return errorResponse(auditError instanceof Error ? auditError.message : String(auditError), 500);
  }

  return jsonResponse({ ok: true });
});

async function backfillTargetProfile(adminClient: any, userId: string) {
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !data?.user) {
    return errorResponse(error?.message ?? 'User not found', 404);
  }

  const email = String(data.user.email ?? '').trim();
  if (!email) return errorResponse('User email is missing', 400);

  const profile = {
    id: data.user.id,
    email,
    role: email.toLowerCase() === initialAdminEmail ? 'admin' : 'user'
  };

  const { error: insertError } = await adminClient.from('profiles').insert({
    ...profile,
    status: 'active',
    display_name: firstText(data.user.user_metadata?.display_name, data.user.user_metadata?.name, data.user.user_metadata?.full_name),
    company: firstText(data.user.user_metadata?.company),
    created_at: data.user.created_at ?? new Date().toISOString(),
    last_seen_at: data.user.last_sign_in_at ?? data.user.updated_at ?? data.user.created_at ?? null
  });
  if (insertError) return errorResponse(insertError.message, 500);

  await adminClient.from('subscriptions').insert({
    user_id: data.user.id,
    plan: 'trial',
    status: 'trial',
    current_period_end: addDays(data.user.created_at ?? new Date().toISOString(), 14)
  }).then(() => undefined);

  return profile;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return null;
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
