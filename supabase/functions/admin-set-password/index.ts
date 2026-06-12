import {
  corsHeaders,
  errorResponse,
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

  const { data: targetProfile, error: targetError } = await context.adminClient
    .from('profiles')
    .select('id,email,role')
    .eq('id', userId)
    .maybeSingle();

  if (targetError) return errorResponse(targetError.message, 500);
  if (!targetProfile) return errorResponse('User not found', 404);

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
