export type UserRole = 'user' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'manual_active' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  company: string | null;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  last_seen_at: string | null;
}

export interface SubscriptionState {
  user_id: string;
  plan: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string | null;
}

export interface RegisteredDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string;
  first_seen_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

export interface AdminUserRow {
  profile: UserProfile;
  subscription: SubscriptionState | null;
  devices: RegisteredDevice[];
}

export type AuthGateStatus = 'loading' | 'config_missing' | 'unauthenticated' | 'ready' | 'restricted' | 'device_blocked' | 'error';

export interface AuthGateState {
  status: AuthGateStatus;
  profile?: UserProfile;
  subscription?: SubscriptionState | null;
  devices?: RegisteredDevice[];
  message?: string;
}

export interface AuthDeviceIdentity {
  ok: boolean;
  fingerprint?: string;
  deviceName?: string;
  appVersion?: string;
  error?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
  displayName?: string;
  company?: string;
}
