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
      'https://github.com/dusdk0098-tech/epyeonhan-board/releases/download/v1.0.1/e%ED%8E%B8%ED%95%9C%EB%B3%B4%EB%93%9C-1.0.1-setup.exe',
    file_name: 'e편한보드-1.0.1-setup.exe',
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
}

(async () => {
  verifySemver();
  verifyUrls();
  verifyManifestParsing();
  await verifySha256();
  await verifyMainProcessAutoUpdateSource();
  console.log(JSON.stringify({ ok: true, checked: 5 }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
