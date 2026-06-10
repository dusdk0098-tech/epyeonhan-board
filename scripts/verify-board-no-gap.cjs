const sharp = require('sharp');
const { buildBoardSvg, calculateBoardPosition } = require('../dist-electron/src/shared/boardRenderer.js');

const sentinel = { r: 0x13, g: 0x57, b: 0x9b };
const fields = [
  { id: '1', label: '공사명', value: '154kV 북평택변전소 토건공사' },
  { id: '2', label: '공종', value: '직영 화기감시자' },
  { id: '3', label: '위치', value: '변전소 내' },
  { id: '4', label: '내용', value: '금속, 석공사 용접 및 그라인딩 작업 화기감시' },
  { id: '5', label: '날짜', value: '2026.04.07' },
  { id: '6', label: '촬영시간', value: '10:30' }
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
  createPdf: false,
  pdfTitle: '사진대지'
};

const cases = [
  { width: 900, height: 520, widthRatio: 0.675 },
  { width: 1600, height: 900, widthRatio: 0.675 },
  { width: 1920, height: 1080, widthRatio: 0.55 },
  { width: 3024, height: 1701, widthRatio: 0.675 },
  { width: 1080, height: 1920, widthRatio: 0.675 },
  { width: 3024, height: 4032, widthRatio: 0.675 },
  { width: 720, height: 1280, widthRatio: 0.12 },
  { width: 720, height: 1280, widthRatio: 0.85 },
  { width: 1080, height: 2400, widthRatio: 0.85 },
  { width: 3024, height: 4032, widthRatio: 0.85 }
];

const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

function isSentinel(raw, imageWidth, channels, x, y) {
  const index = (y * imageWidth + x) * channels;
  return raw[index] === sentinel.r && raw[index + 1] === sentinel.g && raw[index + 2] === sentinel.b;
}

function countSentinelInBoard(raw, imageWidth, channels, boardRect) {
  let count = 0;
  for (let y = boardRect.top; y < boardRect.top + boardRect.height; y += 1) {
    for (let x = boardRect.left; x < boardRect.left + boardRect.width; x += 1) {
      if (isSentinel(raw, imageWidth, channels, x, y)) count += 1;
    }
  }
  return count;
}

async function verifyCase(testCase, position) {
  const settings = {
    ...baseSettings,
    position,
    widthRatio: testCase.widthRatio,
    boardSize: Math.round(testCase.widthRatio * 200)
  };
  const board = buildBoardSvg(testCase.width, testCase.height, fields, settings);
  const boardPosition = calculateBoardPosition(testCase.width, testCase.height, board.width, board.height, settings);
  const failures = [];

  if (!board.svg.includes('preserveAspectRatio="none"')) {
    failures.push('SVG must use preserveAspectRatio="none" so renderers cannot introduce internal edge gaps.');
  }

  const expectedViewBox = `viewBox="0 0 ${board.width} ${board.height}"`;
  if (!board.svg.includes(expectedViewBox)) {
    failures.push(`SVG viewBox must match final board pixels: ${expectedViewBox}`);
  }

  if (position.endsWith('right') && boardPosition.left + board.width !== testCase.width) {
    failures.push(`right edge mismatch: ${boardPosition.left + board.width} !== ${testCase.width}`);
  }

  if (position.endsWith('left') && boardPosition.left !== 0) {
    failures.push(`left edge mismatch: ${boardPosition.left} !== 0`);
  }

  if (position.startsWith('bottom') && boardPosition.top + board.height !== testCase.height) {
    failures.push(`bottom edge mismatch: ${boardPosition.top + board.height} !== ${testCase.height}`);
  }

  if (position.startsWith('top') && boardPosition.top !== 0) {
    failures.push(`top edge mismatch: ${boardPosition.top} !== 0`);
  }

  const rendered = await sharp({
    create: {
      width: testCase.width,
      height: testCase.height,
      channels: 3,
      background: sentinel
    }
  })
    .composite([{ input: Buffer.from(board.svg, 'utf8'), left: boardPosition.left, top: boardPosition.top }])
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sentinelPixels = countSentinelInBoard(rendered.data, rendered.info.width, rendered.info.channels, {
    left: boardPosition.left,
    top: boardPosition.top,
    width: board.width,
    height: board.height
  });

  if (sentinelPixels > 0) {
    failures.push(`transparent gap leaked original photo pixels inside board area: ${sentinelPixels}`);
  }

  return {
    case: `${testCase.width}x${testCase.height}@${testCase.widthRatio}:${position}`,
    board: { width: board.width, height: board.height },
    position: boardPosition,
    failures
  };
}

async function main() {
  const results = [];
  for (const testCase of cases) {
    for (const position of positions) {
      results.push(await verifyCase(testCase, position));
    }
  }

  const failures = results.filter((result) => result.failures.length > 0);
  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ ok: true, checked: results.length, cases: results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
