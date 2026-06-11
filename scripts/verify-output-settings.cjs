const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { buildBoardSvg, calculateBoardPosition } = require('../dist-electron/src/shared/boardRenderer.js');
const {
  buildHighlightMaskSvg,
  buildHighlightSvg,
  resolveHighlightCircle
} = require('../dist-electron/src/shared/highlightRenderer.js');

const fields = [
  { id: 'a', label: '공사명', value: '154kV 북평택변전소 토건공사' },
  { id: 'b', label: '내용', value: '원형 강조 및 출력 설정 검증' }
];

const baseSettings = {
  boardLayoutMode: 'table',
  position: 'bottom-right',
  widthRatio: 0.675,
  margin: 0,
  boardSize: 135,
  labelColumnWidthRatio: 0.176,
  valueColumnWidthRatio: 0.499,
  fontFamily: 'Malgun Gothic Semilight',
  fontSize: 16,
  itemAlign: 'center',
  contentAlign: 'left',
  fontWeight: 'bold',
  rowHeight: 70,
  borderWeight: 'bold',
  jpgQuality: 92,
  boardBackgroundOpacity: 100,
  labelTextColor: 'black',
  valueTextColor: 'black',
  outputMaxLongEdge: 0,
  outputGrayscale: false,
  openFolderAfterProcessing: false,
  createPdf: false,
  pdfTitle: '사진대지'
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyBoardOptions() {
  const transparent = buildBoardSvg(1200, 800, fields, {
    ...baseSettings,
    boardBackgroundOpacity: 50,
    labelTextColor: 'blue',
    valueTextColor: 'red'
  }).svg;

  assert(transparent.includes('fill-opacity="0.5"'), 'board background opacity 50% was not reflected');
  assert(transparent.includes('fill="#0052b8"'), 'label text blue color was not reflected');
  assert(transparent.includes('fill="#d00000"'), 'value text red color was not reflected');

  const opaque = buildBoardSvg(1200, 800, fields, baseSettings).svg;
  assert(opaque.includes('fill-opacity="1"'), 'default board background opacity must stay opaque');
  assert(opaque.includes('fill="#111827"'), 'default board text color must stay black');
}

function verifyBoardTypography() {
  const typographyFields = [
    { id: '1', label: '공사명', value: '154kV 북평택변전소 토건공사' },
    { id: '2', label: '공종', value: '직영 화기감시자' },
    { id: '3', label: '위치', value: '변전소 내' },
    { id: '4', label: '내용', value: '금속, 석공사 용접 및 그라인딩 작업 화기감시' },
    { id: '5', label: '날짜', value: '2026.04.07' },
    { id: '6', label: '촬영시간', value: '10:30' }
  ];
  const small = buildBoardSvg(900, 520, typographyFields, { ...baseSettings, fontSize: 12 });
  const large = buildBoardSvg(900, 520, typographyFields, { ...baseSettings, fontSize: 28 });
  const smallFont = Math.max(...extractFontSizes(small.svg));
  const largeFont = Math.max(...extractFontSizes(large.svg));
  assert(largeFont >= smallFont + 10, `font size control is not reflected enough: ${smallFont} -> ${largeFont}`);

  const labelWidth = extractLabelWidth(large.svg);
  const labelRatio = labelWidth / large.width;
  assert(labelRatio >= 0.255 && labelRatio <= 0.265, `label cell width ratio drifted: ${labelRatio}`);
}

function verifyBoardColumnControls() {
  const narrowLabel = buildBoardSvg(1200, 800, fields, {
    ...baseSettings,
    labelColumnWidthRatio: 0.12,
    valueColumnWidthRatio: 0.50
  });
  const wideLabel = buildBoardSvg(1200, 800, fields, {
    ...baseSettings,
    labelColumnWidthRatio: 0.26,
    valueColumnWidthRatio: 0.50
  });
  const narrowLabelWidth = extractLabelWidth(narrowLabel.svg);
  const wideLabelWidth = extractLabelWidth(wideLabel.svg);

  assert(wideLabelWidth > narrowLabelWidth, 'label column width control must affect rendered SVG');
  assert(wideLabel.width > narrowLabel.width, 'label/value column ratios must affect total board width');
}

function verifyBottomStripLayout() {
  const stripFields = [
    ...fields,
    { id: 'c', label: '긴항목', value: '아주 긴 설명 텍스트가 들어와도 옆 셀로 번지지 않고 한 줄 영역 안에서 처리되어야 합니다' }
  ];
  const strip = buildBoardSvg(1200, 800, stripFields, {
    ...baseSettings,
    boardLayoutMode: 'bottom-strip',
    position: 'top-left'
  });
  const position = calculateBoardPosition(1200, 800, strip.width, strip.height, {
    ...baseSettings,
    boardLayoutMode: 'bottom-strip',
    position: 'top-left'
  });

  assert(strip.width === 1200, `bottom strip must use full image width: ${strip.width}`);
  assert(position.left === 0, `bottom strip left must be 0: ${position.left}`);
  assert(position.top === 800 - strip.height, `bottom strip must sit on bottom edge: ${position.top}`);
  assert(strip.svg.includes('공사명') && strip.svg.includes('154kV'), 'bottom strip must render label and value cells');
  assert(/<line x1="31[0-9]" y1="0" x2="31[0-9]" y2="/.test(strip.svg), 'bottom strip must draw a separator between label and value cells');
  assert((strip.svg.match(/x1="0" y1="/g) || []).length >= stripFields.length, 'bottom strip must stack one horizontal row per field');
}

function verifyInputTableLayout() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  assert(css.includes('grid-template-columns: 128px 1fr;'), 'board content input label cell width must stay at 128px');
}

function verifyWorkspaceAndBridgeStatic() {
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');
  const preload = fs.readFileSync(path.join(__dirname, '..', 'electron', 'preload.ts'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.ts'), 'utf8');
  const api = fs.readFileSync(path.join(__dirname, '..', 'src', 'electron-api.d.ts'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

  assert(app.includes('Record<WorkspaceScreen, BoardWorkspaceState>'), 'work tab state must be isolated per workspace');
  assert(app.includes("label: '보드판 [간편]'"), 'basic tab label must be renamed');
  assert(app.includes('const workspaceKey = activeWorkspaceKey;') && app.includes('handleDroppedPhotoPaths(paths, workspaceKey)'), 'drop target workspace must be captured before async photo resolution');
  assert(app.includes('handleDrop') && styles.includes('.app.drag-active::after'), 'drag-and-drop UI must be wired');
  assert(preload.includes('webUtils') && preload.includes('getPathForFile'), 'dragged browser File objects must be resolved through Electron webUtils');
  assert(api.includes('getPathForFile') && api.includes('file: File'), 'getPathForFile must be exposed in renderer API types');
  assert(preload.includes('resolveDroppedPhotos') && main.includes("photos:resolve-dropped") && api.includes('resolveDroppedPhotos'), 'dropped photo IPC bridge is incomplete');
  assert(preload.includes('copyPreviewImage') && main.includes("images:copy-preview") && api.includes('copyPreviewImage'), 'preview copy IPC bridge is incomplete');
  assert(app.includes('결과 이미지 복사'), 'preview copy button label should clearly indicate output image copy');
  assert(app.includes("boardLayoutMode: 'table'") && app.includes("value=\"bottom-strip\"") && app.includes('하부 띠'), 'board layout mode controls are missing');
  assert(app.includes('항목 정렬') && app.includes('내용 정렬'), 'advanced board alignment controls are missing');
  assert(app.includes('글자 굵기') && app.includes('테두리 굵기') && app.includes('글꼴'), 'advanced board typography controls are missing');
  assert(
    /\{settings\.boardLayoutMode === 'table' && \([\s\S]*?<label>보드크기<\/label>[\s\S]*?<\/>\s*\)}\s*<label>항목명 칸<\/label>/.test(app),
    'label/value column width controls must be available outside the table-only board size block'
  );
  assert(app.includes("id: 'commonSettings', label: '통합 설정'"), 'common output settings must be exposed as a top-level navigation tab');
  assert(app.includes("'datetime' | 'board'") && !app.includes("'datetime' | 'board' | 'output'"), 'advanced settings must only contain datetime and board tabs');
  assert(app.includes('sub-settings-tabs') && app.includes('크기/배치') && app.includes('글자/테두리'), 'advanced board settings must be split into size and typography tabs');
  assert(app.includes('renderCommonSettingsScreen') && app.includes('output-common-form'), 'common settings screen must render output settings');
  assert(app.includes('commonOutputSettings') && app.includes('updateCommonOutputSettings'), 'common output settings must use shared state');
  assert(app.includes('결과물 흑백 저장') && app.includes('작업 완료 후 결과 폴더 열기'), 'common output settings are missing');
  assert(app.includes('activeOutputSettingsTab') && app.includes('renderPremiumSettingsCard'), 'premium tab must use a tabbed settings card');
  assert(app.includes('보드 내용') && app.includes('renderBoardFieldEditor') && app.includes('premium-field-editor'), 'premium tab must allow editing board labels and values');
  assert(app.includes('크기/배치') && app.includes('renderBoardLayoutSettings()'), 'premium tab must expose detailed board size/layout settings');
  assert(app.includes('글자/테두리') && app.includes('renderPremiumTypographySettings'), 'premium tab must expose detailed typography settings');
  assert(styles.includes('.premium-settings-tabs') && styles.includes('.premium-field-list'), 'premium settings layout styling is missing');
  assert(app.includes('const processSettings = mergeCommonOutputSettings(settings);'), 'processing must merge common output settings for every work tab');
  assert(app.includes('settings: processSettings'), 'process payload must use common output settings without per-tab overrides');
  assert(!app.includes("activeScreen === 'basic' ? { ...processSettings, createPdf: false }"), 'basic tab must not bypass common PDF settings');
  [
    'JPG 품질',
    '최대 긴 변',
    '결과물 흑백 저장',
    '작업 완료 후 결과 폴더 열기',
    'PDF 생성 (사진대지)',
    'PDF 제목'
  ].forEach((label) => {
    const count = app.split(label).length - 1;
    assert(count === 1, `${label} control must only be rendered in the top-level common settings tab, found ${count}`);
  });
  assert(styles.includes('.common-settings-shell') && styles.includes('.common-settings-card'), 'common settings screen styling is missing');
  assert(styles.includes('.sub-settings-tabs'), 'advanced board sub-tab styling is missing');
  assert(styles.includes('grid-template-rows: 366px minmax(0, 1fr);'), 'advanced preview/settings rows must be fixed so settings tabs cannot resize preview');
  assert(styles.includes('height: 366px;'), 'advanced preview card must keep a fixed height across settings tab changes');
}

function verifyHighlightGeometry() {
  const highlight = {
    enabled: true,
    xRatio: 0.25,
    yRatio: 0.5,
    radiusRatio: 0.2,
    outsideGrayscale: true
  };
  const circle = resolveHighlightCircle(400, 300, highlight);
  assert(circle.x === 100, `highlight x mismatch: ${circle.x}`);
  assert(circle.y === 150, `highlight y mismatch: ${circle.y}`);
  assert(circle.radius === 60, `highlight radius mismatch: ${circle.radius}`);

  const svg = buildHighlightSvg(400, 300, highlight);
  assert(svg.includes('stroke="#ff0000"'), 'highlight circle must be red');
  assert(svg.includes('stroke-dasharray='), 'highlight circle must be dashed');
}

async function verifyOutsideGrayscaleMask() {
  const width = 120;
  const height = 80;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      raw[offset] = 220;
      raw[offset + 1] = x < width / 2 ? 20 : 180;
      raw[offset + 2] = 30;
    }
  }

  const input = await sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
  const gray = await sharp(input).grayscale().toBuffer();
  const highlight = { enabled: true, xRatio: 0.5, yRatio: 0.5, radiusRatio: 0.25, outsideGrayscale: true };
  const maskedColor = await sharp(input)
    .ensureAlpha()
    .composite([{ input: Buffer.from(buildHighlightMaskSvg(width, height, highlight), 'utf8'), blend: 'dest-in' }])
    .png()
    .toBuffer();
  const output = await sharp(gray)
    .composite([{ input: maskedColor }])
    .raw()
    .toBuffer({ resolveWithObject: true });

  const center = readRgb(output.data, width, output.info.channels, 60, 40);
  const corner = readRgb(output.data, width, output.info.channels, 5, 5);
  assert(center.r > center.g + 30, 'highlight center should preserve color');
  assert(Math.abs(corner.r - corner.g) <= 1 && Math.abs(corner.g - corner.b) <= 1, 'outside highlight should be grayscale');
}

async function verifyResizeBeforeBoardSize() {
  const input = await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: '#2f80ed'
    }
  })
    .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
    .jpeg()
    .toBuffer({ resolveWithObject: true });

  assert(input.info.width === 600, `resized width mismatch: ${input.info.width}`);
  assert(input.info.height === 400, `resized height mismatch: ${input.info.height}`);

  const board = buildBoardSvg(input.info.width, input.info.height, fields, baseSettings);
  assert(board.width <= input.info.width, 'board width must be calculated after resize');
  assert(board.height <= input.info.height, 'board height must fit resized image');
}

function readRgb(buffer, width, channels, x, y) {
  const offset = (y * width + x) * channels;
  return {
    r: buffer[offset],
    g: buffer[offset + 1],
    b: buffer[offset + 2]
  };
}

function extractFontSizes(svg) {
  return [...svg.matchAll(/font-size="(\d+)"/g)].map((match) => Number(match[1]));
}

function extractLabelWidth(svg) {
  const match = svg.match(/<line x1="(\d+(?:\.\d+)?)" y1="0" x2="\1" y2="\d+(?:\.\d+)?"/);
  assert(match, 'label separator line was not found');
  return Number(match[1]);
}

(async () => {
  verifyBoardOptions();
  verifyBoardTypography();
  verifyBoardColumnControls();
  verifyBottomStripLayout();
  verifyInputTableLayout();
  verifyWorkspaceAndBridgeStatic();
  verifyHighlightGeometry();
  await verifyOutsideGrayscaleMask();
  await verifyResizeBeforeBoardSize();
  console.log(JSON.stringify({ ok: true, checked: 9 }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
