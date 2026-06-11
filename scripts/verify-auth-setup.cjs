const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyPackage() {
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.dependencies?.['@supabase/supabase-js'], '@supabase/supabase-js dependency is missing');
}

function verifyMigration() {
  const sql = read('supabase/migrations/20260610_auth_subscriptions.sql');
  [
    'create table if not exists public.profiles',
    'create table if not exists public.subscriptions',
    'create table if not exists public.devices',
    'create table if not exists public.audit_logs',
    'create table if not exists public.app_admin_emails',
    "values ('hamori4919@naver.com')",
    'create trigger on_auth_user_created',
    'create or replace function public.claim_current_device',
    'auth_provider',
    'profile_completed_at',
    'create or replace function public.complete_current_profile',
    "current_user_role <> 'admin'",
    'if active_other_count >= 1 then',
    'alter table public.profiles enable row level security',
    'public.is_admin()'
  ].forEach((needle) => assert(sql.includes(needle), `migration missing: ${needle}`));

  const unlimitedDeviceSql = read('supabase/migrations/20260610_admin_unlimited_devices.sql');
  assert(unlimitedDeviceSql.includes("current_user_role <> 'admin'"), 'admin users must bypass device count checks');
  assert(!unlimitedDeviceSql.includes('device_limit integer'), 'admin device migration must not use a fixed admin limit');
}

function verifyRenderer() {
  const app = read('src/App.tsx');
  assert(app.includes("'admin'") && app.includes("type Screen =") && app.includes("'commonSettings'"), 'admin/common settings screen type is missing');
  assert(app.includes("navItems.push({ id: 'admin', label: '관리자' })"), 'admin nav must be conditional');
  assert(app.includes("activeScreen === 'admin' && !isAdmin"), 'non-admin admin route guard is missing');
  assert(app.includes("authState.status !== 'ready'"), 'auth gate must block app until ready');
  assert(app.includes('resolveAuthGateState'), 'auth gate state resolver is not wired');
  assert(app.includes('socialAuthProviders'), 'social auth provider buttons are missing');
  assert(app.includes('handleSocialAuth'), 'social auth handler is missing');
  assert(app.includes('handleOAuthCallback'), 'OAuth callback handler is missing');
  assert(app.includes('toSocialAuthUiError'), 'social auth provider setup error guidance is missing');
  assert(app.includes('Supabase Dashboard > Authentication > Sign In / Providers'), 'provider disabled error must tell the operator where to fix it');
  assert(app.includes("status: 'profile_incomplete'"), 'profile completion gate is missing');
  assert(app.includes('visibleSocialAuthProviders'), 'visible social auth provider list is missing');
  assert(app.includes("provider.id === 'google'"), 'Kakao/Naver must stay hidden until their provider setup is complete');
  assert(app.includes('<form className="auth-form compact" onSubmit={handleAuthSubmit}>'), 'email/password form must be visible by default');
  assert(!app.includes('showAdminPasswordLogin'), 'email/password login must not be hidden behind the old toggle');
}

function verifyElectronBridge() {
  const main = read('electron/main.ts');
  const preload = read('electron/preload.ts');
  const types = read('src/electron-api.d.ts');
  assert(main.includes("const oauthProtocol = 'epyeonhan-board'"), 'OAuth custom protocol constant missing');
  assert(main.includes('setAsDefaultProtocolClient'), 'OAuth protocol registration missing');
  assert(main.includes("ipcMain.handle('auth:open-oauth-url'"), 'OAuth external browser IPC handler missing');
  assert(main.includes("webContents.send('auth:oauth-callback'"), 'OAuth callback event bridge missing');
  assert(main.includes("ipcMain.handle('auth:get-device-fingerprint'"), 'device identity IPC handler missing');
  assert(main.includes("ipcMain.handle('auth:get-app-version'"), 'app version IPC handler missing');
  assert(main.includes("createHash('sha256')"), 'device identity must be hashed');
  assert(preload.includes('getDeviceIdentity'), 'preload device identity API missing');
  assert(preload.includes('openOAuthUrl'), 'preload OAuth URL opener missing');
  assert(preload.includes('onOAuthCallback'), 'preload OAuth callback listener missing');
  assert(types.includes('AuthDeviceIdentity'), 'renderer device identity type missing');
  assert(types.includes('openOAuthUrl'), 'renderer OAuth URL type missing');
  assert(types.includes('onOAuthCallback'), 'renderer OAuth callback type missing');
}

function verifySocialAuthAssets() {
  const service = read('src/authService.ts');
  const client = read('src/supabaseClient.ts');
  const incrementalSql = read('supabase/migrations/20260610_social_auth_profile.sql');
  const edgeFunction = read('supabase/functions/naver-userinfo/index.ts');
  const supabaseConfig = read('supabase/config.toml');
  assert(service.includes("naver: 'custom:naver'"), 'Naver custom OAuth provider mapping missing');
  assert(service.includes("profile.role !== 'admin'"), 'admin users must bypass renderer-side device claim');
  assert(service.includes('admin_unlimited'), 'admin unlimited device claim reason is missing');
  assert(service.includes('startSocialSignIn'), 'social OAuth start function missing');
  assert(service.includes('linkSocialIdentity'), 'social identity linking function missing');
  assert(service.includes('exchangeOAuthSessionFromUrl'), 'OAuth session exchange function missing');
  assert(service.includes('completeCurrentProfile'), 'profile completion RPC function missing');
  assert(client.includes("flowType: 'pkce'"), 'Supabase PKCE auth flow is required for native OAuth');
  assert(incrementalSql.includes('complete_current_profile'), 'incremental social auth migration missing profile completion RPC');
  assert(edgeFunction.includes('openapi.naver.com/v1/nid/me'), 'Naver userinfo Edge Function missing');
  assert(supabaseConfig.includes('[functions.naver-userinfo]'), 'Naver userinfo function config missing');
  assert(supabaseConfig.includes('verify_jwt = false'), 'Naver userinfo function must disable JWT verification');
}

function verifyEnvExample() {
  const env = read('.env.example');
  assert(env.includes('VITE_SUPABASE_URL='), 'VITE_SUPABASE_URL example missing');
  assert(env.includes('VITE_SUPABASE_ANON_KEY='), 'VITE_SUPABASE_ANON_KEY example missing');
}

try {
  verifyPackage();
  verifyMigration();
  verifyRenderer();
  verifyElectronBridge();
  verifySocialAuthAssets();
  verifyEnvExample();
  console.log(JSON.stringify({ ok: true, checked: 6 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
