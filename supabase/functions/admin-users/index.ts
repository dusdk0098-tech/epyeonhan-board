import {
  corsHeaders,
  errorResponse,
  initialAdminEmail,
  jsonResponse,
  normalizeProviders,
  requireAdminContext
} from '../_shared/admin.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const context = await requireAdminContext(request);
  if (context instanceof Response) return context;

  const { adminClient } = context;
  let usersById: Map<string, AdminAuthUser>;
  let backfillWarning: string | null = null;
  try {
    usersById = await loadAuthUsersById(adminClient);
    const backfillError = await backfillMissingRows(adminClient, Array.from(usersById.values()));
    if (backfillError) {
      backfillWarning = backfillError.message;
      console.warn(`admin-users legacy backfill warning: ${backfillWarning}`);
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error), 500);
  }

  const [{ data: profiles, error: profilesError }, { data: subscriptions, error: subscriptionsError }, { data: devices, error: devicesError }] =
    await Promise.all([
      adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
      adminClient.from('subscriptions').select('*'),
      adminClient.from('devices').select('*').order('last_seen_at', { ascending: false })
    ]);

  if (profilesError) return errorResponse(profilesError.message, 500);
  if (subscriptionsError) return errorResponse(subscriptionsError.message, 500);
  if (devicesError) return errorResponse(devicesError.message, 500);

  const subscriptionsByUser = new Map((subscriptions ?? []).map((subscription) => [subscription.user_id, subscription]));
  const profilesByUser = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const devicesByUser = new Map<string, unknown[]>();
  for (const device of devices ?? []) {
    const current = devicesByUser.get(device.user_id) ?? [];
    current.push(device);
    devicesByUser.set(device.user_id, current);
  }

  const rows = Array.from(usersById.values()).map((authUser) => {
    const profile = profilesByUser.get(authUser.id) ?? buildProfileBackfillRow(authUser) ?? buildSyntheticProfile(authUser);
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
      subscription: subscriptionsByUser.get(authUser.id) ?? null,
      devices: devicesByUser.get(authUser.id) ?? [],
      linkedProviders
    };
  });

  return jsonResponse({ rows, warning: backfillWarning });
});

type AdminAuthUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }>;
};

async function loadAuthUsersById(adminClient: any) {
  const usersById = new Map<string, AdminAuthUser>();
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

async function backfillMissingRows(adminClient: any, authUsers: AdminAuthUser[]) {
  if (authUsers.length === 0) return null;

  const authUserIds = authUsers.map((user) => user.id);
  const { data: existingProfiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id')
    .in('id', authUserIds);
  if (profilesError) return profilesError;

  const existingProfileIds = new Set((existingProfiles ?? []).map((profile: { id: string }) => profile.id));
  const missingProfiles: Record<string, unknown>[] = [];
  for (const user of authUsers) {
    if (existingProfileIds.has(user.id)) continue;
    const row = buildProfileBackfillRow(user);
    if (row) missingProfiles.push(row);
  }

  if (missingProfiles.length > 0) {
    const { error } = await adminClient.from('profiles').insert(missingProfiles);
    if (error) return error;
  }

  const { data: refreshedProfiles, error: refreshedProfilesError } = await adminClient
    .from('profiles')
    .select('id')
    .in('id', authUserIds);
  if (refreshedProfilesError) return refreshedProfilesError;

  const profileIds = new Set((refreshedProfiles ?? []).map((profile: { id: string }) => profile.id));
  const { data: existingSubscriptions, error: subscriptionsError } = await adminClient
    .from('subscriptions')
    .select('user_id')
    .in('user_id', authUserIds);
  if (subscriptionsError) return subscriptionsError;

  const existingSubscriptionIds = new Set((existingSubscriptions ?? []).map((subscription: { user_id: string }) => subscription.user_id));
  const missingSubscriptions = authUsers
    .filter((user) => profileIds.has(user.id) && !existingSubscriptionIds.has(user.id))
    .map((user) => ({
      user_id: user.id,
      plan: 'trial',
      status: 'trial',
      current_period_end: addDays(user.created_at ?? new Date().toISOString(), 14)
    }));

  if (missingSubscriptions.length > 0) {
    const { error } = await adminClient.from('subscriptions').insert(missingSubscriptions);
    if (error) return error;
  }

  return null;
}

function buildProfileBackfillRow(user: AdminAuthUser) {
  const email = extractAuthEmail(user);
  if (!email) return null;
  const displayName = firstText(
    user.user_metadata?.display_name,
    user.user_metadata?.name,
    user.user_metadata?.full_name,
    user.identities?.find((identity) => identity.identity_data)?.identity_data?.name,
    user.identities?.find((identity) => identity.identity_data)?.identity_data?.full_name
  );
  const company = firstText(user.user_metadata?.company);
  const authProvider = normalizeProviders([
    ...(user.identities?.map((identity) => identity.provider) ?? []),
    ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []),
    user.app_metadata?.provider
  ])[0] ?? null;

  return {
    id: user.id,
    email,
    display_name: displayName,
    company,
    role: email.toLowerCase() === initialAdminEmail ? 'admin' : 'user',
    status: 'active',
    auth_provider: authProvider,
    profile_completed_at: company ? user.updated_at ?? user.created_at ?? null : null,
    created_at: user.created_at ?? new Date().toISOString(),
    last_seen_at: user.last_sign_in_at ?? user.updated_at ?? user.created_at ?? null
  };
}

function buildSyntheticProfile(user: AdminAuthUser) {
  const email = extractAuthEmail(user) ?? `unknown-${user.id}@missing.local`;
  return {
    id: user.id,
    email,
    display_name: firstText(user.user_metadata?.display_name, user.user_metadata?.name, user.user_metadata?.full_name),
    company: firstText(user.user_metadata?.company),
    role: email.toLowerCase() === initialAdminEmail ? 'admin' : 'user',
    status: 'active',
    auth_provider: normalizeProviders([
      ...(user.identities?.map((identity) => identity.provider) ?? []),
      ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []),
      user.app_metadata?.provider
    ])[0] ?? null,
    profile_completed_at: null,
    created_at: user.created_at ?? new Date().toISOString(),
    last_seen_at: user.last_sign_in_at ?? user.updated_at ?? user.created_at ?? null
  };
}

function extractAuthEmail(user: AdminAuthUser) {
  return firstText(
    user.email,
    user.user_metadata?.email,
    user.identities?.find((identity) => identity.identity_data?.email)?.identity_data?.email
  );
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
  if (Number.isNaN(date.getTime())) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
