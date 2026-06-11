const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const rawVersion = process.argv[2];
const version = rawVersion ? rawVersion.trim().replace(/^v/i, '') : '';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (!version) {
  fail('Usage: npm run package:win:versioned -- 1.0.2');
}

if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`Invalid version: ${rawVersion}`);
}

run('npm', ['version', version, '--no-git-tag-version', '--allow-same-version']);
run('npm', ['run', 'package:win:installer']);

const releaseDir = path.join(rootDir, 'release');
const localInstallerName = `PEDIT-${version}-setup.exe`;
const localInstallerPath = path.join(releaseDir, localInstallerName);

if (!fs.existsSync(localInstallerPath)) {
  fail(`Expected installer was not created: ${localInstallerPath}`);
}

const updaterAssetName = `PEDIT-${version}-setup.exe`;
const updaterAssetPath = path.join(releaseDir, updaterAssetName);
if (path.resolve(localInstallerPath) !== path.resolve(updaterAssetPath)) {
  fs.copyFileSync(localInstallerPath, updaterAssetPath);
}

console.log(JSON.stringify({
  ok: true,
  version,
  installer: localInstallerPath,
  updaterAsset: updaterAssetPath
}, null, 2));
