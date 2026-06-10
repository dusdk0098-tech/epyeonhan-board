const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { buildBoardSvg } = require('../dist-electron/src/shared/boardRenderer.js');
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
  position: 'bottom-right',
  widthRatio: 0.675,
  margin: 0,
  boardSize: 135,
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

function verifyInputTableLayout() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  assert(css.includes('grid-template-columns: 128px 1fr;'), 'board content input label cell width must stay at 128px');
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
  verifyInputTableLayout();
  verifyHighlightGeometry();
  await verifyOutsideGrayscaleMask();
  await verifyResizeBeforeBoardSize();
  console.log(JSON.stringify({ ok: true, checked: 6 }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
