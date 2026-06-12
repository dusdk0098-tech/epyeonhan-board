import { UPDATE_ALLOWED_DOWNLOAD_HOSTS } from './updateConfig';
import type { UpdateManifest, UpdateManifestValidation } from './updateTypes';

const SEMVER_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;
const UPDATE_BRIDGE_FILE_PATTERN = /^PEDIT-\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?-setup\.exe$/i;

export function buildUpdateBaseUrl(owner: string, repo: string) {
  const safeOwner = encodeURIComponent(owner.trim());
  const safeRepo = encodeURIComponent(repo.trim());
  return `https://${safeOwner}.github.io/${safeRepo}/updates/win/`;
}

export function buildLatestManifestUrl(baseUrl: string, timestamp = Date.now()) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  assertHttpsUrl(normalizedBaseUrl);
  return `${normalizedBaseUrl}latest.json?t=${timestamp}`;
}

export function compareSemver(left: string, right: string) {
  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }

  return 0;
}

export function isNewerVersion(latestVersion: string, currentVersion: string) {
  return compareSemver(latestVersion, currentVersion) > 0;
}

export function parseUpdateManifest(value: unknown): UpdateManifestValidation {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'manifest must be an object' };
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.version !== 'string' ||
    typeof candidate.pub_date !== 'string' ||
    typeof candidate.platform !== 'string' ||
    typeof candidate.download_url !== 'string' ||
    typeof candidate.file_name !== 'string' ||
    typeof candidate.sha256 !== 'string' ||
    typeof candidate.size_bytes !== 'number' ||
    typeof candidate.mandatory !== 'boolean' ||
    typeof candidate.notes !== 'string' ||
    (candidate.min_supported_version !== undefined && typeof candidate.min_supported_version !== 'string')
  ) {
    return { ok: false, error: 'manifest has invalid field types' };
  }

  const manifest: UpdateManifest = {
    version: candidate.version,
    pub_date: candidate.pub_date,
    platform: candidate.platform === 'windows' ? 'windows' : (candidate.platform as 'windows'),
    download_url: candidate.download_url,
    file_name: candidate.file_name,
    sha256: candidate.sha256,
    size_bytes: candidate.size_bytes,
    mandatory: candidate.mandatory,
    min_supported_version: candidate.min_supported_version ?? '0.0.0',
    notes: candidate.notes
  };

  const error = validateUpdateManifest(manifest);
  return error ? { ok: false, error } : { ok: true, manifest };
}

export function validateUpdateManifest(manifest: UpdateManifest) {
  if (!SEMVER_PATTERN.test(manifest.version)) return 'invalid version';
  if (!manifest.pub_date) return 'missing pub_date';
  if (manifest.platform !== 'windows') return 'unsupported platform';
  if (!manifest.file_name) return 'missing file_name';
  if (/-full-setup\.exe$/i.test(manifest.file_name)) return 'full installer assets are not valid update targets';
  if (!UPDATE_BRIDGE_FILE_PATTERN.test(manifest.file_name)) return 'update must use the PEDIT setup bridge file';
  if (!Number.isFinite(manifest.size_bytes) || manifest.size_bytes <= 0) return 'invalid size_bytes';
  if (!SHA256_PATTERN.test(manifest.sha256)) return 'invalid sha256';
  if (!SEMVER_PATTERN.test(manifest.min_supported_version)) return 'invalid min_supported_version';

  try {
    assertHttpsUrl(manifest.download_url);
  } catch {
    return 'download_url must be https';
  }

  if (!isAllowedDownloadUrl(manifest.download_url)) {
    return 'download_url host is not allowed';
  }

  const urlFileName = decodeURIComponent(new URL(manifest.download_url).pathname.split('/').pop() ?? '');
  if (urlFileName !== manifest.file_name) return 'download_url file name mismatch';

  return undefined;
}

export function isAllowedDownloadUrl(rawUrl: string, allowedHosts = UPDATE_ALLOWED_DOWNLOAD_HOSTS) {
  const url = new URL(rawUrl);
  return url.protocol === 'https:' && allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

export function isHttpsUrl(rawUrl: string) {
  try {
    assertHttpsUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}

function parseSemver(version: string) {
  const match = version.match(SEMVER_PATTERN);
  if (!match) {
    throw new Error(`Invalid SemVer: ${version}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function assertHttpsUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS update URLs are allowed.');
  }
}
