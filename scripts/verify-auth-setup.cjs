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
    'p_known_fingerprints text[] default null',
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
  const stableDeviceSql = read('supabase/migrations/20260611_stable_device_identity.sql');
  assert(stableDeviceSql.includes('p_known_fingerprints text[] default null'), 'stable device migration must accept known fingerprints');
  assert(stableDeviceSql.includes('not (device_fingerprint = any(known_fingerprints))'), 'known fingerprints must not count as another active device');
  assert(stableDeviceSql.includes('set device_fingerprint = p_device_fingerprint'), 'legacy device rows must migrate to the stable fingerprint');
  assert(stableDeviceSql.includes('claim_current_device(text, text, text[])'), 'stable device RPC grant missing');

  const permissionRepairSql = read('supabase/migrations/20260611_auth_permission_repair.sql');
  [
    'grant usage on schema public to anon, authenticated',
    'grant select, update on table public.profiles to authenticated',
    'grant select, update on table public.subscriptions to authenticated',
    'grant select, update on table public.devices to authenticated',
    'grant select, insert on table public.audit_logs to authenticated',
    "to_regprocedure('public.ensure_current_user_profile()')",
    "to_regprocedure('public.claim_current_device(text,text,text[])')",
    "to_regprocedure('public.complete_current_profile(text,text)')"
  ].forEach((needle) => assert(permissionRepairSql.includes(needle), `permission repair migration missing: ${needle}`));
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
  assert(app.includes('20260611_auth_permission_repair.sql'), 'permission denied auth errors must point to the repair migration');
  assert(app.includes('rememberLogin') && app.includes('아이디 및 비밀번호 기억하기'), 'remember login checkbox is missing');
  assert(app.includes('loadRememberedLogin') && app.includes('saveRememberedLoginPreference'), 'remember login persistence is not wired');
  assert(app.includes('passwordConfirm') && app.includes('비밀번호 확인'), 'signup password confirmation input is missing');
  assert(app.includes("authForm.password !== authForm.passwordConfirm") && app.includes('비밀번호와 비밀번호 확인이 일치하지 않습니다.'), 'signup password confirmation validation is missing');
  assert(app.includes("type Screen = 'start'") && app.includes("useState<Screen>('start')"), 'program start screen must be the default ready screen');
  assert(app.includes('function renderStartScreen()') && app.includes("setActiveScreen('basic')") && app.includes("setActiveScreen('output')"), 'program start screen mode buttons are missing');
  assert(app.includes("activeScreen === 'start' && renderStartScreen()"), 'program start screen is not rendered');
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
  assert(main.includes("ipcMain.handle('auth:get-remembered-login'"), 'remembered login read IPC handler missing');
  assert(main.includes("ipcMain.handle('auth:save-remembered-login'"), 'remembered login save IPC handler missing');
  assert(main.includes("ipcMain.handle('auth:clear-remembered-login'"), 'remembered login clear IPC handler missing');
  assert(main.includes('safeStorage.encryptString') && main.includes('safeStorage.decryptString'), 'remembered password must use Electron safeStorage');
  assert(main.includes("createHash('sha256')"), 'device identity must be hashed');
  assert(main.includes('readWindowsMachineGuid'), 'Windows MachineGuid-based device identity is missing');
  assert(main.includes('epyeonhan-board-device-v2'), 'stable device identity version marker is missing');
  assert(main.includes('getLegacyDeviceFingerprints'), 'legacy device fingerprint candidates are missing');
  assert(!main.includes("[hostname, username, app.getPath('userData'), app.getPath('exe')].join('|')"), 'device identity must not depend on app path or userData path');
  assert(preload.includes('getDeviceIdentity'), 'preload device identity API missing');
  assert(preload.includes('openOAuthUrl'), 'preload OAuth URL opener missing');
  assert(preload.includes('getRememberedLogin') && preload.includes('saveRememberedLogin') && preload.includes('clearRememberedLogin'), 'preload remembered login API missing');
  assert(preload.includes('onOAuthCallback'), 'preload OAuth callback listener missing');
  assert(types.includes('AuthDeviceIdentity'), 'renderer device identity type missing');
  assert(types.includes('RememberedLoginPayload') && types.includes('RememberedLoginResult'), 'renderer remembered login types missing');
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
  assert(service.includes('p_known_fingerprints'), 'device claim must send known fingerprint candidates');
  assert(service.includes('matchingKnownDevice'), 'device claim must support legacy fingerprint fallback');
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
