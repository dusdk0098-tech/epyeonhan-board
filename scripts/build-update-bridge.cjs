const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = (process.argv[2] || packageJson.version || '').trim().replace(/^v/i, '');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findMakensis() {
  if (process.env.NSIS_MAKENSIS && fs.existsSync(process.env.NSIS_MAKENSIS)) {
    return process.env.NSIS_MAKENSIS;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    fail('LOCALAPPDATA is not set; cannot find electron-builder NSIS cache.');
  }

  const cacheDir = path.join(localAppData, 'electron-builder', 'Cache');
  const candidates = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase() === 'makensis.exe') {
        candidates.push(fullPath);
      }
    }
  }

  walk(cacheDir);
  candidates.sort((a, b) => {
    const aScore = a.toLowerCase().includes(`${path.sep}bin${path.sep}makensis.exe`) ? 0 : 1;
    const bScore = b.toLowerCase().includes(`${path.sep}bin${path.sep}makensis.exe`) ? 0 : 1;
    return aScore - bScore || a.localeCompare(b);
  });

  if (!candidates.length) {
    fail(`makensis.exe was not found under ${cacheDir}`);
  }
  return candidates[0];
}

if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`Invalid package version for update bridge: ${version}`);
}

const releaseDir = path.join(rootDir, 'release');
const bridgePath = path.join(releaseDir, `PEDIT-${version}-setup.exe`);
const fullInstallerPath = path.join(releaseDir, `PEDIT-${version}-full-setup.exe`);
const nsiPath = path.join(rootDir, 'build', 'update-bridge.nsi');
const iconPath = path.join(rootDir, 'build', 'icon.ico');

if (!fs.existsSync(bridgePath)) {
  fail(`Expected Electron installer was not created before bridge build: ${bridgePath}`);
}

fs.copyFileSync(bridgePath, fullInstallerPath);

const makensis = findMakensis();
const result = spawnSync(
  makensis,
  [
    '/NOCD',
    `/DFULL_INSTALLER=${fullInstallerPath}`,
    `/DBRIDGE_OUTFILE=${bridgePath}`,
    `/DBRIDGE_ICON=${iconPath}`,
    nsiPath
  ],
  {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false
  }
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const bridgeStat = fs.statSync(bridgePath);
const fullStat = fs.statSync(fullInstallerPath);

console.log(
  JSON.stringify(
    {
      ok: true,
      version,
      bridge: bridgePath,
      bridgeBytes: bridgeStat.size,
      fullInstaller: fullInstallerPath,
      fullInstallerBytes: fullStat.size
    },
    null,
    2
  )
);
