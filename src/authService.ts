import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type {
  AccountStatus,
  AdminUserRow,
  AuthCredentials,
  AuthGateState,
  ProfileCompletionInput,
  RegisteredDevice,
  SocialAuthProvider,
  SubscriptionState,
  SubscriptionStatus,
  UserProfile,
  UserRole
} from './shared/authTypes';

export const INITIAL_ADMIN_EMAIL = 'hamori4919@naver.com';

const allowedSubscriptionStatuses = new Set<SubscriptionStatus>(['trial', 'active', 'manual_active']);
const socialProviderMap: Record<SocialAuthProvider, string> = {
  google: 'google',
  kakao: 'kakao',
  naver: 'custom:naver'
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase 설정이 없습니다.');
  }
  return supabase;
}

export async function signInWithPassword(credentials: AuthCredentials) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizeEmail(credentials.email),
    password: credentials.password
  });
  if (error) throw error;
  return data.user;
}

export async function signUpWithPassword(credentials: AuthCredentials) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: normalizeEmail(credentials.email),
    password: credentials.password,
    options: {
      data: {
        display_name: credentials.displayName?.trim() ?? '',
        company: credentials.company?.trim() ?? ''
      }
    }
  });
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function startSocialSignIn(provider: SocialAuthProvider, redirectTo: string) {
  const client = requireSupabase();
  const oauthProvider = socialProviderMap[provider];
  const { data, error } = await client.auth.signInWithOAuth({
    provider: oauthProvider as never,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });
  if (error) throw error;
  if (!data.url) {
    throw new Error('소셜 로그인 주소를 생성하지 못했습니다.');
  }
  return data.url;
}

export async function linkSocialIdentity(provider: SocialAuthProvider, redirectTo: string) {
  const client = requireSupabase();
  const oauthProvider = socialProviderMap[provider];
  const { data, error } = await client.auth.linkIdentity({
    provider: oauthProvider as never,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });
  if (error) throw error;
  if (!data.url) {
    throw new Error('소셜 계정 연결 주소를 생성하지 못했습니다.');
  }
  return data.url;
}

export async function exchangeOAuthSessionFromUrl(callbackUrl: string) {
  const client = requireSupabase();
  const params = readAuthCallbackParams(callbackUrl);
  const callbackError = params.get('error_description') ?? params.get('error');
  if (callbackError) {
    throw new Error(decodeURIComponent(callbackError));
  }

  const code = params.get('code');
  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.user ?? data.session?.user ?? null;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) throw error;
    return data.user ?? data.session?.user ?? null;
  }

  throw new Error('로그인 콜백에서 인증 정보를 찾지 못했습니다.');
}

export async function completeCurrentProfile(input: ProfileCompletionInput) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('complete_current_profile', {
    p_company: input.company,
    p_display_name: input.displayName ?? null
  });
  if (error) throw error;
  return data as UserProfile;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

interface ResolveAuthOptions {
  skipDeviceClaim?: boolean;
}

export async function resolveAuthGateState(
  user: User,
  deviceFingerprint: string,
  deviceName: string,
  options: ResolveAuthOptions = {}
): Promise<AuthGateState> {
  const client = requireSupabase();
  await client.rpc('ensure_current_user_profile');
  await client.rpc('touch_current_profile');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<UserProfile>();
  if (profileError) throw profileError;

  const deviceClaim = options.skipDeviceClaim
    ? { ok: true, reason: 'preview' }
    : await claimCurrentDevice(deviceFingerprint, deviceName);
  const devices = await loadDevicesForUser(user.id);
  const subscription = await loadSubscriptionForUser(user.id);

  if (!deviceClaim?.ok) {
    return {
      status: 'device_blocked',
      profile,
      subscription,
      devices,
      message: '이미 등록된 PC가 있습니다. 관리자에게 기기 해제를 요청하세요.'
    };
  }

  if (profile.status === 'suspended') {
    return {
      status: 'restricted',
      profile,
      subscription,
      devices,
      message: '정지된 계정입니다. 관리자에게 문의하세요.'
    };
  }

  if (!isSubscriptionUsable(subscription)) {
    return {
      status: 'restricted',
      profile,
      subscription,
      devices,
      message: '사용 가능한 구독 상태가 아닙니다. 관리자에게 문의하세요.'
    };
  }

  if (!isProfileComplete(profile)) {
    return {
      status: 'profile_incomplete',
      profile,
      subscription,
      devices,
      message: '프로그램 사용을 시작하려면 회사명을 입력하세요.'
    };
  }

  return { status: 'ready', profile, subscription, devices };
}

async function claimCurrentDevice(deviceFingerprint: string, deviceName: string) {
  const client = requireSupabase();
  const deviceResult = await client.rpc('claim_current_device', {
    p_device_fingerprint: deviceFingerprint,
    p_device_name: deviceName
  });
  if (deviceResult.error) throw deviceResult.error;
  return Array.isArray(deviceResult.data) ? deviceResult.data[0] : deviceResult.data;
}

export async function loadAdminUsers(): Promise<AdminUserRow[]> {
  const client = requireSupabase();
  const [{ data: profiles, error: profilesError }, { data: subscriptions, error: subscriptionsError }, { data: devices, error: devicesError }] =
    await Promise.all([
      client.from('profiles').select('*').order('created_at', { ascending: false }).returns<UserProfile[]>(),
      client.from('subscriptions').select('*').returns<SubscriptionState[]>(),
      client.from('devices').select('*').order('last_seen_at', { ascending: false }).returns<RegisteredDevice[]>()
    ]);

  if (profilesError) throw profilesError;
  if (subscriptionsError) throw subscriptionsError;
  if (devicesError) throw devicesError;

  const subscriptionsByUser = new Map((subscriptions ?? []).map((subscription) => [subscription.user_id, subscription]));
  const devicesByUser = new Map<string, RegisteredDevice[]>();
  (devices ?? []).forEach((device) => {
    const current = devicesByUser.get(device.user_id) ?? [];
    current.push(device);
    devicesByUser.set(device.user_id, current);
  });

  return (profiles ?? []).map((profile) => ({
    profile,
    subscription: subscriptionsByUser.get(profile.id) ?? null,
    devices: devicesByUser.get(profile.id) ?? []
  }));
}

export async function updateUserRole(userId: string, role: UserRole) {
  await updateProfileByAdmin(userId, { role }, 'profile.role.updated', { role });
}

export async function updateAccountStatus(userId: string, status: AccountStatus) {
  await updateProfileByAdmin(userId, { status }, 'profile.status.updated', { status });
}

export async function updateSubscriptionByAdmin(
  userId: string,
  patch: Partial<Pick<SubscriptionState, 'status' | 'current_period_end' | 'plan'>>
) {
  const client = requireSupabase();
  const { error } = await client
    .from('subscriptions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
  await insertAuditLog(userId, 'subscription.updated', patch);
}

export async function revokeDeviceByAdmin(userId: string, deviceId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('devices')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', deviceId)
    .eq('user_id', userId);
  if (error) throw error;
  await insertAuditLog(userId, 'device.revoked', { deviceId });
}

async function updateProfileByAdmin(userId: string, patch: Partial<Pick<UserProfile, 'role' | 'status'>>, action: string, metadata: unknown) {
  const client = requireSupabase();
  const { error } = await client.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
  await insertAuditLog(userId, action, metadata);
}

async function insertAuditLog(targetUserId: string, action: string, metadata: unknown) {
  const client = requireSupabase();
  const { error } = await client.from('audit_logs').insert({
    target_user_id: targetUserId,
    action,
    metadata
  });
  if (error) throw error;
}

async function loadSubscriptionForUser(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<SubscriptionState>();
  if (error) throw error;
  return data;
}

async function loadDevicesForUser(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('devices')
    .select('*')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .returns<RegisteredDevice[]>();
  if (error) throw error;
  return data ?? [];
}

function isSubscriptionUsable(subscription: SubscriptionState | null) {
  if (!subscription || !allowedSubscriptionStatuses.has(subscription.status)) {
    return false;
  }
  if (!subscription.current_period_end) {
    return true;
  }
  return new Date(subscription.current_period_end).getTime() >= Date.now();
}

function isProfileComplete(profile: UserProfile) {
  return Boolean(profile.profile_completed_at || profile.company?.trim());
}

function readAuthCallbackParams(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const params = new URLSearchParams(url.search);
  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    hashParams.forEach((value, key) => params.set(key, value));
  }
  return params;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
