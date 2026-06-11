const { calculateContainedSize } = require('../dist-electron/src/shared/previewFit.js');
const fs = require('node:fs');
const path = require('node:path');

const cases = [
  { name: 'basic-stage portrait', source: { width: 1080, height: 1920 }, container: { width: 461, height: 255 } },
  { name: 'large-stage portrait', source: { width: 1080, height: 1920 }, container: { width: 900, height: 640 } },
  { name: 'extreme portrait', source: { width: 1080, height: 2400 }, container: { width: 461, height: 255 } },
  { name: 'phone portrait high-res', source: { width: 3024, height: 4032 }, container: { width: 606, height: 294 } },
  { name: 'basic-stage landscape', source: { width: 1920, height: 1080 }, container: { width: 461, height: 255 } },
  { name: 'square image', source: { width: 1200, height: 1200 }, container: { width: 461, height: 255 } }
];

function expectedContainedSize(source, container) {
  const scale = Math.min(container.width / source.width, container.height / source.height);
  return {
    width: Math.max(1, Math.floor(source.width * scale)),
    height: Math.max(1, Math.floor(source.height * scale))
  };
}

const results = [];

for (const testCase of cases) {
  const actual = calculateContainedSize(testCase.source, testCase.container);
  const expected = expectedContainedSize(testCase.source, testCase.container);
  const failures = [];

  if (!actual) {
    failures.push('contained size was not calculated');
  } else {
    if (actual.width !== expected.width || actual.height !== expected.height) {
      failures.push(`expected ${expected.width}x${expected.height}, got ${actual.width}x${actual.height}`);
    }
    if (actual.width > testCase.container.width || actual.height > testCase.container.height) {
      failures.push('preview image exceeds container and would be cropped');
    }
    if (testCase.source.width < testCase.source.height && actual.width > actual.height) {
      failures.push('portrait image orientation was not preserved');
    }
    if (testCase.source.width > testCase.source.height && actual.width < actual.height) {
      failures.push('landscape image orientation was not preserved');
    }

    const widthGap = testCase.container.width - actual.width;
    const heightGap = testCase.container.height - actual.height;
    if (widthGap > 1 && heightGap > 1) {
      failures.push('contained image does not fill either preview axis');
    }
  }

  results.push({
    case: testCase.name,
    source: testCase.source,
    container: testCase.container,
    actual,
    failures
  });
}

const failed = results.filter((result) => result.failures.length > 0);
if (failed.length > 0) {
  console.error(JSON.stringify({ ok: false, checked: results.length, failed }, null, 2));
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(rootDir, 'src', 'styles.css'), 'utf8');
const staticFailures = [];

if (!appSource.includes('const [loadedImage, setLoadedImage]')) {
  staticFailures.push('PreviewStage must track loaded image dimensions with the matching data URL.');
}

if (!appSource.includes('if (src !== imageDataUrl) return;')) {
  staticFailures.push('PreviewStage must ignore stale image load events from previously selected photos.');
}

if (!/\.preview-image-shell\[style\]\s*>\s*img[\s\S]*object-fit:\s*contain/.test(cssSource)) {
  staticFailures.push('Styled preview images must use object-fit: contain to prevent cropping.');
}

if (!/\.advanced-right\s+\.advanced-preview-card\s+\.preview-stage[\s\S]*min-height:\s*0/.test(cssSource)) {
  staticFailures.push('Advanced preview stage must be allowed to shrink instead of clipping behind the settings card.');
}

if (staticFailures.length > 0) {
  console.error(JSON.stringify({ ok: false, checked: results.length, staticFailures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked: results.length + 4, cases: results }, null, 2));
