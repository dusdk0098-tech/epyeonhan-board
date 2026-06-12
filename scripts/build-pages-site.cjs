const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');

const root = path.resolve(__dirname, '..');
const siteRoot = path.join(root, 'site');
const staticRoot = path.join(root, 'site-static');
const preserveLiveUpdates = process.argv.includes('--preserve-live-updates');
const liveLatestUrl = process.env.UPDATE_LATEST_URL || 'https://dusdk0098-tech.github.io/epyeonhan-board/updates/win/latest.json';

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('http://') ? http : https;
    client
      .get(url, (response) => {
        const location = response.headers.location;
        if (response.statusCode >= 300 && response.statusCode < 400 && location) {
          response.resume();
          if (redirects >= 5) {
            reject(new Error(`Too many redirects for ${url}`));
            return;
          }

          const redirectUrl = new URL(location, url).toString();
          fetchText(redirectUrl, redirects + 1).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        response.setEncoding('utf8');
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
}

async function preserveLatestManifest() {
  try {
    const latestJson = await fetchText(liveLatestUrl);
    const parsed = JSON.parse(latestJson);
    const updateRoot = path.join(siteRoot, 'updates', 'win');
    fs.mkdirSync(updateRoot, { recursive: true });
    fs.writeFileSync(path.join(updateRoot, 'latest.json'), `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
    if (typeof parsed.version === 'string' && parsed.version) {
      fs.writeFileSync(path.join(updateRoot, `v${parsed.version}.json`), `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
    }
  } catch (error) {
    console.warn(`Skipping live update manifest preservation: ${error.message}`);
  }
}

async function main() {
  fs.rmSync(siteRoot, { recursive: true, force: true });
  copyDirectory(staticRoot, siteRoot);

  const logoSource = path.join(root, 'public', 'pedit-logo-horizontal-blue.png');
  const logoTarget = path.join(siteRoot, 'assets', 'pedit-logo-horizontal-blue.png');
  fs.mkdirSync(path.dirname(logoTarget), { recursive: true });
  fs.copyFileSync(logoSource, logoTarget);
  fs.writeFileSync(path.join(siteRoot, '.nojekyll'), '', 'utf8');

  if (preserveLiveUpdates) {
    await preserveLatestManifest();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
