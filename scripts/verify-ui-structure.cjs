const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const app = read('src/App.tsx');
const styles = read('src/styles.css');
const authService = read('src/authService.ts');
const authTypes = read('src/shared/authTypes.ts');
const packageJson = read('package.json');
const config = read('supabase/config.toml');
const deployScript = read('scripts/deploy-admin-functions.ps1');
const adminShared = read('supabase/functions/_shared/admin.ts');
const adminUsers = read('supabase/functions/admin-users/index.ts');
const adminDelete = read('supabase/functions/admin-delete-user/index.ts');
const adminPassword = read('supabase/functions/admin-set-password/index.ts');

assert(app.includes('function renderStartScreen()'), 'start screen renderer is missing');
assert(app.includes('className="start-mode-card lite"') && app.includes("setActiveScreen('basic')"), 'LITE card must navigate to LITE screen');
assert(app.includes('className="start-mode-card pro"') && app.includes("setActiveScreen('output')"), 'PRO card must navigate to PRO screen');
assert(styles.includes('PEDIT Stitch start screen final cascade guard'), 'final Stitch start-screen cascade guard is missing');
assert(styles.includes('grid-template-columns: repeat(2, 400px)'), 'start screen must use fixed two-card desktop grid');
assert(styles.includes('background: #1e1e1e'), 'start nav must match Stitch dark top bar');

assert(authTypes.includes('linkedProviders: string[]'), 'admin rows must include linked providers');
assert(authService.includes("invokeAdminFunction<{ rows: AdminUserRow[] }>('admin-users'"), 'admin list must come from Edge Function');
assert(authService.includes("invokeAdminFunction('admin-delete-user'"), 'admin delete function client wrapper is missing');
assert(authService.includes("invokeAdminFunction('admin-set-password'"), 'admin set password function client wrapper is missing');
assert(authService.includes("authorization: `Bearer ${accessToken}`"), 'admin Edge Function calls must include the active session token explicitly');
assert(authService.includes('readResponseMessage(payload)'), 'admin Edge Function errors must surface the server response body');
assert(app.includes("type AdminView = 'all' | 'new' | 'social' | 'devices'"), 'admin view filters are missing');
assert(app.includes('adminProviderBadges'), 'social provider badges are missing');
assert(app.includes('visibleAdminViewOptions') && app.includes("value !== 'social'"), 'social admin filter must be hidden while social OAuth is disabled');
assert(app.includes('adminTableColumnCount') && app.includes('socialOAuthFeatureEnabled && <th>소셜</th>'), 'admin social column must be feature-gated');
assert(app.includes('{visibleSocialAuthProviders.length > 0 && (') && app.includes('className="admin-oauth-link"'), 'admin social linking card must be feature-gated');
assert(
  app.includes('openAdminPasswordDialog') &&
    app.includes('handleAdminPasswordSubmit') &&
    app.includes('adminPasswordTarget') &&
    app.includes('handleAdminDeleteUser'),
  'admin password modal/delete handlers are missing'
);
assert(styles.includes('.admin-password-form') && styles.includes('.admin-password-input'), 'admin password modal styles are missing');
assert(app.includes('adminVisibleRows.map'), 'admin table must render filtered rows');
assert(styles.includes('.admin-view-bar') && styles.includes('.admin-provider-list span.linked'), 'admin filter/provider badge styles are missing');

for (const functionName of ['admin-users', 'admin-delete-user', 'admin-set-password']) {
  assert(config.includes(`[functions.${functionName}]`), `${functionName} must be registered in Supabase config`);
}
assert(adminShared.includes("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')"), 'admin Edge Functions must use service role only server-side');
assert(adminShared.includes("profile.role !== 'admin'"), 'admin Edge Functions must verify admin profile role');
assert(adminUsers.includes('auth.admin.listUsers'), 'admin-users must read Auth identities through admin API');
assert(
  adminUsers.includes("request.method !== 'GET' && request.method !== 'POST'"),
  'admin-users must accept both GET and POST Edge Function invocations'
);
assert(adminUsers.includes('backfillMissingRows'), 'admin-users must backfill legacy Auth users missing profiles');
assert(adminUsers.includes("adminClient.from('profiles').insert(missingProfiles)"), 'admin-users must create missing profile rows');
assert(adminUsers.includes("adminClient.from('subscriptions').insert(missingSubscriptions)"), 'admin-users must create missing subscription rows');
assert(adminDelete.includes('auth.admin.deleteUser'), 'admin-delete-user must delete Auth user through admin API');
assert(adminDelete.includes('backfillTargetProfile'), 'admin-delete-user must support legacy users missing profiles');
assert(adminDelete.includes('Current admin account cannot be deleted'), 'admin-delete-user must block self deletion');
assert(adminDelete.includes('Initial admin account cannot be deleted'), 'admin-delete-user must block initial admin deletion');
assert(adminPassword.includes('auth.admin.updateUserById'), 'admin-set-password must update password through admin API');
assert(adminPassword.includes('backfillTargetProfile'), 'admin-set-password must support legacy users missing profiles');
assert(adminPassword.includes('password.length < 8'), 'admin-set-password must enforce minimum password length');
assert(packageJson.includes('"deploy:admin-functions"'), 'admin Edge Function deployment npm script is missing');
assert(deployScript.includes('SUPABASE_ACCESS_TOKEN'), 'admin deploy script must require Supabase access token');
assert(deployScript.includes('Resolve-SupabaseCommand'), 'admin deploy script must resolve global supabase or npx fallback');
assert(deployScript.includes('"--yes", "supabase"'), 'admin deploy script must support npx supabase fallback');
assert(deployScript.includes('Invoke-Supabase functions deploy $functionName'), 'admin deploy script must deploy functions through the resolved CLI command');
assert(deployScript.includes('--use-api'), 'admin deploy script must use Supabase API bundling to avoid requiring local Docker');
assert(deployScript.includes('"admin-users"'), 'admin deploy script must include admin-users');
assert(deployScript.includes('"admin-delete-user"'), 'admin deploy script must include admin-delete-user');
assert(deployScript.includes('"admin-set-password"'), 'admin deploy script must include admin-set-password');

const clientSecretsSearch = ['src/', 'electron/'].flatMap((dir) => {
  const results = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          results.push(path.relative(root, full));
        }
      }
    }
  }
  walk(path.join(root, dir));
  return results;
});
assert(clientSecretsSearch.length === 0, `service role key must not be referenced by client code: ${clientSecretsSearch.join(', ')}`);

console.log(JSON.stringify({ ok: true, checked: 10 }, null, 2));
