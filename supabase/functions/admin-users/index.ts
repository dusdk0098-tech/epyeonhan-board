import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  normalizeProviders,
  requireAdminContext
} from '../_shared/admin.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const context = await requireAdminContext(request);
  if (context instanceof Response) return context;

  const { adminClient } = context;
  const [{ data: profiles, error: profilesError }, { data: subscriptions, error: subscriptionsError }, { data: devices, error: devicesError }] =
    await Promise.all([
      adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
      adminClient.from('subscriptions').select('*'),
      adminClient.from('devices').select('*').order('last_seen_at', { ascending: false })
    ]);

  if (profilesError) return errorResponse(profilesError.message, 500);
  if (subscriptionsError) return errorResponse(subscriptionsError.message, 500);
  if (devicesError) return errorResponse(devicesError.message, 500);

  let usersById: Map<string, { id: string; app_metadata?: Record<string, unknown>; identities?: Array<{ provider?: string }> }>;
  try {
    usersById = await loadAuthUsersById(adminClient);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error), 500);
  }
  const subscriptionsByUser = new Map((subscriptions ?? []).map((subscription) => [subscription.user_id, subscription]));
  const devicesByUser = new Map<string, unknown[]>();
  for (const device of devices ?? []) {
    const current = devicesByUser.get(device.user_id) ?? [];
    current.push(device);
    devicesByUser.set(device.user_id, current);
  }

  const rows = (profiles ?? []).map((profile) => {
    const authUser = usersById.get(profile.id);
    const identityProviders = normalizeProviders(authUser?.identities?.map((identity) => identity.provider));
    const appProviders = normalizeProviders(
      Array.isArray(authUser?.app_metadata?.providers)
        ? authUser?.app_metadata?.providers
        : [authUser?.app_metadata?.provider, profile.auth_provider]
    );
    const linkedProviders = Array.from(new Set([...identityProviders, ...appProviders])).sort();
    if (linkedProviders.length === 0 && profile.auth_provider) {
      linkedProviders.push(String(profile.auth_provider).toLowerCase());
    }

    return {
      profile,
      subscription: subscriptionsByUser.get(profile.id) ?? null,
      devices: devicesByUser.get(profile.id) ?? [],
      linkedProviders
    };
  });

  return jsonResponse({ rows });
});

async function loadAuthUsersById(adminClient: any) {
  const usersById = new Map<string, { id: string; app_metadata?: Record<string, unknown>; identities?: Array<{ provider?: string }> }>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users ?? []) {
      usersById.set(user.id, user);
    }
    if ((data.users ?? []).length < perPage) {
      break;
    }
    page += 1;
  }

  return usersById;
}
