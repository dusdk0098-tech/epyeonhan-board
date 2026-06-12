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

  const body = await readJsonBody<{ userId?: unknown }>(request);
  if (body instanceof Response) return body;

  const userId = String(body.userId ?? '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return errorResponse('Invalid user id', 400);
  }
  if (userId === context.caller.id) {
    return errorResponse('Current admin account cannot be deleted', 400);
  }

  const { data: targetProfile, error: targetError } = await context.adminClient
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', userId)
    .maybeSingle();

  if (targetError) return errorResponse(targetError.message, 500);
  if (!targetProfile) return errorResponse('User not found', 404);
  if (String(targetProfile.email).toLowerCase() === initialAdminEmail) {
    return errorResponse('Initial admin account cannot be deleted', 400);
  }

  try {
    await insertAdminAuditLog(context.adminClient, context.caller.id, userId, 'user.deleted', {
      targetEmail: targetProfile.email,
      targetRole: targetProfile.role
    });

    const { error } = await context.adminClient.auth.admin.deleteUser(userId);
    if (error) {
      return errorResponse(error.message, 500);
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error), 500);
  }

  return jsonResponse({ ok: true });
});
