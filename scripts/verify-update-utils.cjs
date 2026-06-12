const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const {
  buildLatestManifestUrl,
  buildUpdateBaseUrl,
  compareSemver,
  isAllowedDownloadUrl,
  isHttpsUrl,
  isNewerVersion,
  parseUpdateManifest
} = require('../dist-electron/src/shared/updateUtils.js');
const { UPDATE_BASE_URL } = require('../dist-electron/src/shared/updateConfig.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validManifest(overrides = {}) {
  return {
    version: '1.0.1',
    pub_date: '2026-06-10T00:00:00.000Z',
    platform: 'windows',
    download_url:
      'https://github.com/dusdk0098-tech/epyeonhan-board/releases/download/v1.0.1/PEDIT-1.0.1-setup.exe',
    file_name: 'PEDIT-1.0.1-setup.exe',
    sha256: 'a'.repeat(64),
    size_bytes: 12345,
    mandatory: false,
    min_supported_version: '1.0.0',
    notes: '자동 업데이트 검증',
    ...overrides
  };
}

function verifySemver() {
  assert(compareSemver('1.0.1', '1.0.0') > 0, '1.0.1 should be newer than 1.0.0');
  assert(compareSemver('1.0.0', '1.0.0') === 0, 'same versions should be equal');
  assert(compareSemver('0.9.9', '1.0.0') < 0, '0.9.9 should be lower than 1.0.0');
  assert(isNewerVersion('1.0.1', '1.0.0'), 'isNewerVersion should accept newer versions');
  assert(!isNewerVersion('1.0.0', '1.0.0'), 'isNewerVersion should ignore same versions');
}

function verifyUrls() {
  const expectedBaseUrl = 'https://dusdk0098-tech.github.io/epyeonhan-board/updates/win/';
  assert(buildUpdateBaseUrl('dusdk0098-tech', 'epyeonhan-board') === expectedBaseUrl, 'base URL mismatch');
  assert(UPDATE_BASE_URL === expectedBaseUrl, 'configured UPDATE_BASE_URL mismatch');
  assert(
    buildLatestManifestUrl(expectedBaseUrl, 123) === `${expectedBaseUrl}latest.json?t=123`,
    'latest manifest URL mismatch'
  );
  assert(isHttpsUrl(expectedBaseUrl), 'configured update base URL must be HTTPS');
  assert(isAllowedDownloadUrl(validManifest().download_url), 'GitHub release URL should be allowed');
  assert(!isAllowedDownloadUrl('https://example.com/file.exe'), 'non-GitHub release URL should be blocked');
}

function verifyManifestParsing() {
  assert(parseUpdateManifest(validManifest()).ok, 'valid manifest should parse');
  assert(!parseUpdateManifest(validManifest({ download_url: 'http://github.com/file.exe' })).ok, 'HTTP URL should fail');
  assert(!parseUpdateManifest(validManifest({ sha256: 'bad' })).ok, 'invalid SHA256 should fail');
  assert(!parseUpdateManifest(validManifest({ size_bytes: '12345' })).ok, 'string size should fail');
  assert(!parseUpdateManifest(validManifest({ mandatory: 'false' })).ok, 'string mandatory should fail');
  assert(
    !parseUpdateManifest(
      validManifest({
        file_name: 'PEDIT-1.0.1-full-setup.exe',
        download_url:
          'https://github.com/dusdk0098-tech/epyeonhan-board/releases/download/v1.0.1/PEDIT-1.0.1-full-setup.exe'
      })
    ).ok,
    'manifest must reject full installer assets'
  );
  assert(
    !parseUpdateManifest(
      validManifest({
        file_name: 'PEDIT-1.0.1-setup.exe',
        download_url:
          'https://github.com/dusdk0098-tech/epyeonhan-board/releases/download/v1.0.1/PEDIT-1.0.1-full-setup.exe'
      })
    ).ok,
    'manifest download URL must match file_name'
  );
  assert(!parseUpdateManifest({}).ok, 'missing fields should fail');
}

async function verifySha256() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'epyeonhan-update-'));
  const samplePath = path.join(tempDir, 'sample.bin');
  const sample = Buffer.from('update hash sample', 'utf8');
  await fs.writeFile(samplePath, sample);

  const fileHash = crypto.createHash('sha256').update(await fs.readFile(samplePath)).digest('hex');
  const expectedHash = crypto.createHash('sha256').update(sample).digest('hex');
  assert(fileHash === expectedHash, 'SHA256 file hash mismatch');

  await fs.rm(tempDir, { recursive: true, force: true });
}

async function verifyMainProcessAutoUpdateSource() {
  const mainSource = await fs.readFile(path.join(__dirname, '..', 'electron', 'main.ts'), 'utf8');
  const preloadSource = await fs.readFile(path.join(__dirname, '..', 'electron', 'preload.ts'), 'utf8');
  const apiTypes = await fs.readFile(path.join(__dirname, '..', 'src', 'electron-api.d.ts'), 'utf8');
  const appSource = await fs.readFile(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');
  const installerInclude = await fs.readFile(path.join(__dirname, '..', 'build', 'installer.nsh'), 'utf8');
  const bridgeNsi = await fs.readFile(path.join(__dirname, '..', 'build', 'update-bridge.nsi'), 'utf8');
  const bridgeScript = await fs.readFile(path.join(__dirname, 'build-update-bridge.cjs'), 'utf8');
  assert(!mainSource.includes('업데이트 알림'), 'update confirmation alert must not be shown');
  assert(!mainSource.includes('다운로드 및 설치'), 'update confirmation button must not remain');
  assert(!mainSource.includes('나중에'), 'defer update button must not remain');
  assert(!mainSource.includes('responseResult'), 'update flow must not branch on user confirmation');
  assert(mainSource.includes('let updateInstallInProgress = false;'), 'update install progress guard is missing');
  assert(mainSource.includes('if (updateInstallInProgress)'), 'duplicate update check guard is missing');
  assert(
    mainSource.includes('await downloadAndInstallUpdate(win, validation.manifest);'),
    'newer manifest must directly start download and install'
  );
  assert(mainSource.includes("webContents.send('update:status'"), 'renderer update status event is missing');
  assert(mainSource.includes('response.body.getReader()'), 'download progress stream reader is missing');
  assert(!mainSource.includes("['/S', '--updated']"), 'legacy silent installer arguments must not remain');
  assert(mainSource.includes('buildSilentUpdateInstallArgs()'), 'silent update installer argument builder is missing');
  assert(mainSource.includes("return ['/S', installModeArg, '/updated', `/D=${installDir}`];"), 'silent update args must include mode, update flag, and /D path');
  assert(!mainSource.includes("'/force-run'"), 'silent update args must not suppress installer relaunch');
  assert(mainSource.includes('isPerMachineInstallDirectory'), 'install mode detection is missing');
  assert(mainSource.includes('process.env.ProgramFiles'), 'Program Files install detection is missing');
  assert(mainSource.includes('NSIS requires /D=... to be the last argument'), '/D last-argument guard comment is missing');
  assert(mainSource.includes('launchSilentUpdateInstaller'), 'update installer launcher is missing');
  assert(mainSource.includes('Wait-Process -Id'), 'update launcher must wait for the current app to exit');
  assert(mainSource.includes('update-launcher.log'), 'update launcher log is missing');
  assert(mainSource.includes('app.exit(0)'), 'update flow must force app exit after launcher starts');
  assert(mainSource.includes("phase: 'restarting'"), 'restart preparation update status is missing');
  assert(mainSource.includes('type UpdateAttemptRecord'), 'update attempt record type is missing');
  assert(mainSource.includes('recordUpdateAttempt(manifest, installerPath)'), 'update attempts must be recorded before app exit');
  assert(mainSource.includes('showRepeatedUpdateFailureGuide'), 'repeated update failure guide is missing');
  assert(mainSource.includes('update-attempt.json'), 'update attempt persistence path is missing');
  assert(mainSource.includes('다운로드 페이지 열기'), 'repeated failure guide must offer manual download');
  assert(preloadSource.includes('onUpdateStatus'), 'preload update status listener is missing');
  assert(apiTypes.includes('UpdateStatusPayload') && apiTypes.includes("'restarting'") && apiTypes.includes('onUpdateStatus'), 'renderer update status types are missing');
  assert(appSource.includes('UpdateOverlay') && appSource.includes('PEDIT (페딧) 업데이트 중'), 'update progress overlay is missing');
  assert(appSource.includes('updatePhaseDescriptions') && appSource.includes('설치 화면을 띄우지 않고 업데이트를 적용합니다.'), 'dedicated update UI copy is missing');
  assert(mainSource.includes('업데이트 설치 준비') && mainSource.includes('업데이트 설치 시작'), 'update install/restart copy is missing');
  assert(installerInclude.includes('!macro customInit'), 'NSIS custom init macro is missing');
  assert(installerInclude.includes('${isUpdated}') && installerInclude.includes('SetSilent silent'), 'NSIS update mode must force silent install');
  assert(installerInclude.includes('PeditWaitForUpdatedAppToExit'), 'NSIS update mode must wait for old app process before file replacement');
  assert(installerInclude.includes('Get-CimInstance -ClassName Win32_Process'), 'NSIS update wait must inspect running app processes');
  assert(installerInclude.includes('Stop-Process -Id'), 'NSIS update wait must be able to close stale old app processes');
  assert(installerInclude.includes('!macro customInstall'), 'NSIS custom install macro is missing');
  assert(installerInclude.includes('$newDesktopLink') && installerInclude.includes('$newStartMenuLink'), 'NSIS update mode must ensure shortcuts');
  assert(installerInclude.includes('${ifNot} ${isForceRun}'), 'NSIS custom restart must avoid duplicating the legacy /force-run restart path');
  assert(installerInclude.includes('StdUtils.ExecShellAsUser'), 'NSIS update mode must restart the app after silent updates');
  assert(bridgeNsi.includes('RequestExecutionLevel user'), 'update bridge must be runnable by legacy non-elevated updaters');
  assert(bridgeNsi.includes('File "/oname=$PLUGINSDIR\\PEDIT-full-setup.exe" "${FULL_INSTALLER}"'), 'update bridge must embed the full installer');
  assert(bridgeNsi.includes('ExecShellWait "runas"'), 'update bridge must elevate the full installer through UAC');
  assert(bridgeNsi.includes('${GetParameters} $R0'), 'update bridge must forward legacy updater arguments');
  assert(bridgeScript.includes('PEDIT-${version}-full-setup.exe'), 'bridge builder must preserve the full installer');
  assert(bridgeScript.includes('makensis.exe'), 'bridge builder must compile the NSIS bridge');
}

async function verifyVersionedPackagingConfig() {
  const packageJson = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const workflow = await fs.readFile(path.join(__dirname, '..', '.github', 'workflows', 'release-windows.yml'), 'utf8');
  const packageScript = await fs.readFile(path.join(__dirname, 'package-win-version.cjs'), 'utf8');

  assert(
    packageJson.build.nsis.artifactName === 'PEDIT-${version}-setup.${ext}',
    'local installer artifact name must include package version'
  );
  assert(packageJson.build.nsis.oneClick === false, 'installer should remain assisted for predictable NSIS update behavior');
  assert(packageJson.build.nsis.perMachine === true, 'installer mode page should be removed by requiring per-machine install');
  assert(
    packageJson.build.nsis.allowToChangeInstallationDirectory === false,
    'installer directory page should be removed to prevent clipped install path text'
  );
  assert(packageJson.build.nsis.include === 'build/installer.nsh', 'NSIS installer include must be wired');
  assert(
    packageJson.scripts['package:win:installer'].includes('node scripts/build-update-bridge.cjs'),
    'local installer packaging must build the update bridge'
  );
  assert(
    packageJson.scripts['package:win:versioned'] === 'node scripts/package-win-version.cjs',
    'versioned local packaging script is missing'
  );
  assert(
    workflow.includes("Where-Object { $_.Name -notlike '*-full-setup.exe' }"),
    'GitHub release workflow must upload the bridge installer, not the full installer'
  );
  assert(
    workflow.includes('$uploadName = "PEDIT-$env:VERSION-setup.exe"'),
    'GitHub release asset name must include release version'
  );
  assert(
    workflow.includes('npm version ${{ steps.meta.outputs.version }} --no-git-tag-version --allow-same-version'),
    'workflow must set package version before building installer'
  );
  assert(
    packageScript.includes('npm run package:win:versioned -- 1.0.2') &&
      packageScript.includes('PEDIT-${version}-setup.exe') &&
      packageScript.includes('PEDIT-${version}-full-setup.exe'),
    'versioned local packaging script must create versioned installer names'
  );
}

(async () => {
  verifySemver();
  verifyUrls();
  verifyManifestParsing();
  await verifySha256();
  await verifyMainProcessAutoUpdateSource();
  await verifyVersionedPackagingConfig();
  console.log(JSON.stringify({ ok: true, checked: 6 }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
