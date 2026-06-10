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
    "case when role = 'admin' then 2 else 1 end",
    'if active_other_count >= device_limit then',
    'alter table public.profiles enable row level security',
    'public.is_admin()'
  ].forEach((needle) => assert(sql.includes(needle), `migration missing: ${needle}`));
}

function verifyRenderer() {
  const app = read('src/App.tsx');
  assert(app.includes("type Screen = 'help' | 'basic' | 'advanced' | 'output' | 'contact' | 'admin'"), 'admin screen type is missing');
  assert(app.includes("navItems.push({ id: 'admin', label: '관리자' })"), 'admin nav must be conditional');
  assert(app.includes("activeScreen === 'admin' && !isAdmin"), 'non-admin admin route guard is missing');
  assert(app.includes("authState.status !== 'ready'"), 'auth gate must block app until ready');
  assert(app.includes('resolveAuthGateState'), 'auth gate state resolver is not wired');
}

function verifyElectronBridge() {
  const main = read('electron/main.ts');
  const preload = read('electron/preload.ts');
  const types = read('src/electron-api.d.ts');
  assert(main.includes("ipcMain.handle('auth:get-device-fingerprint'"), 'device identity IPC handler missing');
  assert(main.includes("ipcMain.handle('auth:get-app-version'"), 'app version IPC handler missing');
  assert(main.includes("createHash('sha256')"), 'device identity must be hashed');
  assert(preload.includes('getDeviceIdentity'), 'preload device identity API missing');
  assert(types.includes('AuthDeviceIdentity'), 'renderer device identity type missing');
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
  verifyEnvExample();
  console.log(JSON.stringify({ ok: true, checked: 5 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
